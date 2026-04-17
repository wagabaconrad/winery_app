import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET() {
  try {
    const data = await getAuthenticatedUser();
    if (!data) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const businessId = data.business?.id;
    if (!businessId) return NextResponse.json({ error: "No business found" }, { status: 404 });

    const businessType = data.business?.businessType || "WINE";

    // Core queries — same for every business type
    const [capitalEntries, sales, expensesData, stockItems, recentSales, activeBatches] =
      await Promise.all([
        prisma.capitalEntry.findMany({ where: { businessId } }),
        prisma.sale.findMany({ where: { businessId }, include: { items: true } }),
        prisma.expense.findMany({ where: { businessId } }),
        prisma.stockItem.findMany({ where: { businessId } }),
        prisma.sale.findMany({
          where: { businessId },
          include: { customer: true, items: true },
          orderBy: { date: "desc" },
          take: 5,
        }),
        prisma.productionBatch.findMany({
          where: { businessId, status: "active" },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);

    // Calculate total capital
    let totalCapital = 0;
    for (const e of capitalEntries) {
      totalCapital += e.type === "WITHDRAWN" ? -e.amount : e.amount;
    }

    // Calculate sales revenue + COGS
    let totalRevenue = 0;
    let totalCOGS = 0;
    for (const s of sales) {
      totalRevenue += s.totalAmount;
      totalCOGS += s.costOfGoods;
    }

    // Calculate total expenses
    let totalExpenses = 0;
    for (const e of expensesData) {
      totalExpenses += e.amount;
    }

    // Stock summary
    let totalStockValue = 0;
    const lowStockItems: typeof stockItems = [];
    for (const s of stockItems) {
      totalStockValue += s.totalValue;
      if (s.quantity <= 5) lowStockItems.push(s);
    }

    // Food-specific data — run a second await block so a failure here doesn't block wine dashboards
    let draftEvents = 0;
    let confirmedEvents = 0;
    let completedEvents = 0;
    let recentEvents: unknown[] = [];
    let eventRevenue = 0;

    if (businessType === "FOOD") {
      try {
        const [draft, confirmed, completed, recent, aggregate] = await Promise.all([
          prisma.event.count({ where: { businessId, status: "DRAFT" } }),
          prisma.event.count({ where: { businessId, status: "CONFIRMED" } }),
          prisma.event.count({ where: { businessId, status: "COMPLETED" } }),
          prisma.event.findMany({
            where: { businessId, status: { in: ["DRAFT", "CONFIRMED"] } },
            include: { customer: true },
            orderBy: { createdAt: "desc" },
            take: 5,
          }),
          prisma.event.aggregate({
            where: { businessId, status: { in: ["CONFIRMED", "COMPLETED"] } },
            _sum: { customerBudget: true },
          }),
        ]);
        draftEvents = draft;
        confirmedEvents = confirmed;
        completedEvents = completed;
        recentEvents = recent;
        eventRevenue = aggregate._sum.customerBudget || 0;
      } catch (e) {
        console.error("Food event queries failed:", e);
      }
    }

    // Net profit: sales revenue + event revenue (customer budgets) - COGS - expenses
    const netProfit = totalRevenue + eventRevenue - totalCOGS - totalExpenses;

    const response: Record<string, unknown> = {
      totalCapital,
      totalRevenue: totalRevenue + eventRevenue,
      totalExpenses,
      totalCOGS,
      netProfit,
      totalStockValue,
      stockItemCount: stockItems.length,
      lowStockItems,
      recentSales,
      activeBatches,
      salesCount: sales.length,
      businessType,
    };

    if (businessType === "FOOD") {
      response.draftEvents = draftEvents;
      response.confirmedEvents = confirmedEvents;
      response.completedEvents = completedEvents;
      response.recentEvents = recentEvents;
      response.eventRevenue = eventRevenue;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/dashboard:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
