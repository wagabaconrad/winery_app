import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBusinessId } from "@/lib/auth";
import { startOfDay, startOfWeek, startOfMonth, startOfYear, format } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const businessId = await getBusinessId();
    if (!businessId) return NextResponse.json({ error: "No business found" }, { status: 404 });

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

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("GET /api/reports:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
