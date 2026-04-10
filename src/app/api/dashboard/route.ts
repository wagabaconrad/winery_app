import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET() {
  try {
    const data = await getAuthenticatedUser();
    if (!data) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const businessId = data.business?.id;
    if (!businessId) return NextResponse.json({ error: "No business found" }, { status: 404 });

    // Run all queries in parallel
    const capitalEntries = await prisma.capitalEntry.findMany({ where: { businessId } });
    const sales = await prisma.sale.findMany({
      where: { businessId },
      include: { items: true },
    });
    const expensesData = await prisma.expense.findMany({ where: { businessId } });
    const stockItems = await prisma.stockItem.findMany({ where: { businessId } });
    const recentSales = await prisma.sale.findMany({
      where: { businessId },
      include: { customer: true, items: true },
      orderBy: { date: "desc" },
      take: 5,
    });
    const activeBatches = await prisma.productionBatch.findMany({
      where: { businessId, status: "active" },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // Calculate total capital
    let totalCapital = 0;
    for (const e of capitalEntries) {
      totalCapital += e.type === "WITHDRAWN" ? -e.amount : e.amount;
    }

    // Calculate total revenue
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

    // Net profit = revenue - COGS - general expenses
    const netProfit = totalRevenue - totalCOGS - totalExpenses;

    // Stock summary
    let totalStockValue = 0;
    for (const s of stockItems) {
      totalStockValue += s.totalValue;
    }
    const lowStockItems: typeof stockItems = [];
    for (const s of stockItems) {
      if (s.quantity <= 5) lowStockItems.push(s);
    }

    return NextResponse.json({
      totalCapital,
      totalRevenue,
      totalExpenses,
      totalCOGS,
      netProfit,
      totalStockValue,
      stockItemCount: stockItems.length,
      lowStockItems,
      recentSales,
      activeBatches,
      salesCount: sales.length,
    });
  } catch (error) {
    console.error("GET /api/dashboard:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
