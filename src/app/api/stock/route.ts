import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBusinessId } from "@/lib/auth";

export async function GET() {
  try {
    const businessId = await getBusinessId();
    if (!businessId) return NextResponse.json({ error: "No business found" }, { status: 404 });

    const items = await prisma.stockItem.findMany({
      where: { businessId },
      include: { sourceBatch: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("GET /api/stock:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const businessId = await getBusinessId();
    if (!businessId) return NextResponse.json({ error: "No business found" }, { status: 404 });

    const body = await request.json();
    const { name, category, quantity, unit, unitCost } = body;

    if (!name || !category) {
      return NextResponse.json({ error: "Name and category are required" }, { status: 400 });
    }

    // Finished goods can only be created by the production batch system
    if (category === "FINISHED") {
      return NextResponse.json(
        { error: "Finished goods are created automatically when you create a production batch. They cannot be added manually." },
        { status: 400 }
      );
    }

    const qty = parseFloat(quantity);
    const cost = parseFloat(unitCost);

    if (isNaN(qty) || qty < 0) {
      return NextResponse.json({ error: "Quantity must be a non-negative number" }, { status: 400 });
    }
    if (isNaN(cost) || cost < 0) {
      return NextResponse.json({ error: "Unit cost must be a non-negative number" }, { status: 400 });
    }

    const item = await prisma.stockItem.create({
      data: {
        businessId,
        name,
        category,
        quantity: qty,
        unit: unit || "units",
        unitCost: cost,
        totalValue: qty * cost,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("POST /api/stock:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const businessId = await getBusinessId();
    if (!businessId) return NextResponse.json({ error: "No business found" }, { status: 404 });

    const body = await request.json();
    const { id, name, category, quantity, unit, unitCost } = body;

    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    // Protect finished goods from manual edits — they're managed by batch production & sales
    const existing = await prisma.stockItem.findFirst({ where: { id, businessId } });
    if (!existing) return NextResponse.json({ error: "Stock item not found" }, { status: 404 });
    if (existing.category === "FINISHED") {
      return NextResponse.json(
        { error: "Finished goods cannot be edited. They are managed automatically by production batches and sales." },
        { status: 403 }
      );
    }

    const qty = parseFloat(quantity);
    const cost = parseFloat(unitCost);

    if (isNaN(qty) || qty < 0) {
      return NextResponse.json({ error: "Quantity must be a non-negative number" }, { status: 400 });
    }
    if (isNaN(cost) || cost < 0) {
      return NextResponse.json({ error: "Unit cost must be a non-negative number" }, { status: 400 });
    }

    const item = await prisma.stockItem.update({
      where: { id, businessId },
      data: {
        name,
        category,
        quantity: qty,
        unit: unit || "units",
        unitCost: cost,
        totalValue: qty * cost,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("PUT /api/stock:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const businessId = await getBusinessId();
    if (!businessId) return NextResponse.json({ error: "No business found" }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const cleanupLegacy = searchParams.get("cleanupLegacy") === "true";

    // Special: clean up legacy finished goods that have no batch link (pre-migration orphans)
    if (cleanupLegacy) {
      const result = await prisma.stockItem.deleteMany({
        where: { businessId, category: "FINISHED", sourceBatchId: null },
      });
      return NextResponse.json({ success: true, deleted: result.count });
    }

    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    // Protect finished goods from manual deletion
    const existing = await prisma.stockItem.findFirst({ where: { id, businessId } });
    if (!existing) return NextResponse.json({ error: "Stock item not found" }, { status: 404 });
    if (existing.category === "FINISHED") {
      return NextResponse.json(
        { error: "Finished goods cannot be deleted. They are managed automatically by production batches and sales." },
        { status: 403 }
      );
    }

    await prisma.stockItem.delete({
      where: { id, businessId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/stock:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
