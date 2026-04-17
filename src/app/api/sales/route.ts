import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBusinessId } from "@/lib/auth";
import { generateInvoiceNumber } from "@/lib/calculations";

export async function GET() {
  try {
    const businessId = await getBusinessId();
    if (!businessId) return NextResponse.json({ error: "No business found" }, { status: 404 });

    const sales = await prisma.sale.findMany({
      where: { businessId },
      include: {
        items: true,
        customer: true,
        invoice: true,
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(sales);
  } catch (error) {
    console.error("GET /api/sales:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const businessId = await getBusinessId();
    if (!businessId) return NextResponse.json({ error: "No business found" }, { status: 404 });

    const body = await request.json();
    const { customerId, items } = body;

    if (!items?.length) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
    }

    // Verify customerId belongs to this business (prevent cross-tenant linkage)
    let verifiedCustomerId: string | null = null;
    if (customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, businessId },
        select: { id: true },
      });
      verifiedCustomerId = customer?.id || null;
    }

    // Calculate totals
    let totalAmount = 0;
    let totalCOGS = 0;

    // processedItems holds DB fields only (no stockItemId — not a SaleItem column)
    // stockItemIds is a parallel array used only for inventory deduction
    const processedItems: { productName: string; quantity: number; unitPrice: number; unitCost: number; total: number }[] = [];
    const stockItemIds: (string | null)[] = [];

    for (const item of items as { productName: string; quantity: number; unitPrice: number; unitCost?: number; stockItemId?: string }[]) {
      if (!item.productName || typeof item.productName !== "string" || !item.productName.trim()) {
        throw Object.assign(new Error("Each item must have a product name"), { status: 400 });
      }
      const qty = parseFloat(String(item.quantity));
      const price = parseFloat(String(item.unitPrice));
      const cost = parseFloat(String(item.unitCost ?? 0));
      if (isNaN(qty) || qty <= 0) throw Object.assign(new Error("Item quantity must be a positive number"), { status: 400 });
      if (isNaN(price) || price < 0) throw Object.assign(new Error("Item unit price must be a non-negative number"), { status: 400 });
      if (isNaN(cost) || cost < 0) throw Object.assign(new Error("Item unit cost must be a non-negative number"), { status: 400 });
      const lineTotal = qty * price;
      totalAmount += lineTotal;
      totalCOGS += qty * cost;

      processedItems.push({ productName: item.productName.trim(), quantity: qty, unitPrice: price, unitCost: cost, total: lineTotal });
      stockItemIds.push(item.stockItemId || null);
    }

    const profit = totalAmount - totalCOGS;

    // Get last invoice number
    const lastInvoice = await prisma.invoice.findFirst({
      orderBy: { createdAt: "desc" },
    });
    const invoiceNumber = generateInvoiceNumber(lastInvoice?.invoiceNumber || null);

    // Create sale with items and invoice in a transaction
    const sale = await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
      const newSale = await tx.sale.create({
        data: {
          businessId,
          customerId: verifiedCustomerId,
          totalAmount,
          costOfGoods: totalCOGS,
          profit,
          items: { create: processedItems },
        },
        include: { items: true },
      });

      // Deduct sold quantities from FINISHED goods inventory
      const affectedBatchIds = new Set<string>();

      for (let i = 0; i < processedItems.length; i++) {
        const item = processedItems[i];
        const stockItemId = stockItemIds[i];

        // Prefer direct ID lookup (set when user selects from inventory picker)
        // Fall back to name match for manually typed products
        let stockItem: { id: string; businessId: string; quantity: number; unitCost: number; sourceBatchId: string | null } | null = null;
        if (stockItemId) {
          stockItem = await tx.stockItem.findUnique({ where: { id: stockItemId } });
        } else {
          stockItem = await tx.stockItem.findFirst({
            where: { businessId, name: item.productName, category: "FINISHED" },
          });
        }

        if (stockItem && stockItem.businessId === businessId) {
          const newQty = Math.max(0, stockItem.quantity - item.quantity);
          await tx.stockItem.update({
            where: { id: stockItem.id },
            data: { quantity: newQty, totalValue: newQty * stockItem.unitCost },
          });
          if (stockItem.sourceBatchId) {
            affectedBatchIds.add(stockItem.sourceBatchId);
          }
        }
      }

      // Check each affected batch — if all its finished goods are now 0, mark it completed
      for (const batchId of affectedBatchIds) {
        const batchGoods = await tx.stockItem.findMany({
          where: { sourceBatchId: batchId, category: "FINISHED" },
        });
        const allSoldOut = batchGoods.length > 0 && batchGoods.every((g) => g.quantity <= 0);
        if (allSoldOut) {
          await tx.productionBatch.update({
            where: { id: batchId },
            data: { status: "completed" },
          });
        }
      }

      // Create invoice
      await tx.invoice.create({
        data: {
          saleId: newSale.id,
          invoiceNumber,
        },
      });

      return newSale;
    }, { timeout: 30000 });

    // Fetch full sale
    const fullSale = await prisma.sale.findUnique({
      where: { id: sale.id },
      include: { items: true, customer: true, invoice: true },
    });

    return NextResponse.json(fullSale, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && "status" in error && (error as { status: number }).status === 400) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("POST /api/sales:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
