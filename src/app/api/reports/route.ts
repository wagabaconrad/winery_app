import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { startOfDay, startOfWeek, startOfMonth, startOfYear, format } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const authData = await getAuthenticatedUser();
    if (!authData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const businessId = authData.business?.id;
    if (!businessId) return NextResponse.json({ error: "No business found" }, { status: 404 });
    const businessType = authData.business?.businessType || "WINE";

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "monthly";

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "daily": startDate = startOfDay(now); break;
      case "weekly": startDate = startOfWeek(now, { weekStartsOn: 1 }); break;
      case "yearly": startDate = startOfYear(now); break;
      default: startDate = startOfMonth(now);
    }

    const sales = await prisma.sale.findMany({
      where: { businessId, date: { gte: startDate } },
      include: { items: true },
      orderBy: { date: "asc" },
    });
    const expenses = await prisma.expense.findMany({
      where: { businessId, date: { gte: startDate } },
      orderBy: { date: "asc" },
    });
    const batches = await prisma.productionBatch.findMany({
      where: { businessId, createdAt: { gte: startDate } },
    });

    let totalRevenue = 0;
    let totalCOGS = 0;
    let totalExpenses = 0;

    const revenueByDate = new Map<string, number>();
    const expensesByDate = new Map<string, number>();
    const productSales = new Map<string, { quantity: number; revenue: number }>();
    const expenseByCategory = new Map<string, number>();

    for (const sale of sales) {
      totalRevenue += sale.totalAmount;
      totalCOGS += sale.costOfGoods;
      const key = format(sale.date, "MMM dd");
      revenueByDate.set(key, (revenueByDate.get(key) || 0) + sale.totalAmount);
      for (const item of sale.items) {
        const existing = productSales.get(item.productName) || { quantity: 0, revenue: 0 };
        productSales.set(item.productName, {
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + item.total,
        });
      }
    }

    for (const exp of expenses) {
      totalExpenses += exp.amount;
      const key = format(exp.date, "MMM dd");
      expensesByDate.set(key, (expensesByDate.get(key) || 0) + exp.amount);
      expenseByCategory.set(exp.category, (expenseByCategory.get(exp.category) || 0) + exp.amount);
    }

    const netProfit = totalRevenue - totalCOGS - totalExpenses;

    const allDates = [...new Set([...revenueByDate.keys(), ...expensesByDate.keys()])].sort();
    const chartData = allDates.map((date) => ({
      date,
      revenue: revenueByDate.get(date) || 0,
      expenses: expensesByDate.get(date) || 0,
      profit: (revenueByDate.get(date) || 0) - (expensesByDate.get(date) || 0),
    }));

    const bestSellers = [...productSales.entries()]
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const expenseBreakdown = [...expenseByCategory.entries()].map(([category, amount]) => ({
      category,
      amount,
    }));

    const response: Record<string, unknown> = {
      period,
      startDate: startDate.toISOString(),
      totalRevenue,
      totalCOGS,
      totalExpenses,
      netProfit,
      salesCount: sales.length,
      batchCount: batches.length,
      chartData,
      bestSellers,
      expenseBreakdown,
      businessType,
    };

    // Add event metrics for food businesses
    if (businessType === "FOOD") {
      const events = await prisma.event.findMany({
        where: { businessId, createdAt: { gte: startDate } },
      });
      const eventsByStatus: Record<string, number> = {};
      let totalEventRevenue = 0;
      let totalPlates = 0;
      for (const event of events) {
        eventsByStatus[event.status] = (eventsByStatus[event.status] || 0) + 1;
        if (event.status === "CONFIRMED" || event.status === "COMPLETED") {
          totalEventRevenue += event.customerBudget;
          totalPlates += event.plateCount;
        }
      }
      response.eventCount = events.length;
      response.eventsByStatus = eventsByStatus;
      response.totalEventRevenue = totalEventRevenue;
      response.totalPlates = totalPlates;
      response.avgPlateCost = totalPlates > 0
        ? Math.round(events.reduce((s, e) => s + e.totalCost, 0) / totalPlates)
        : 0;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/reports:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
