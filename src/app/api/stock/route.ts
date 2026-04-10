import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBusinessId } from "@/lib/auth";

export async function GET() {
  try {
    const businessId = await getBusinessId();
    if (!businessId) return NextResponse.json({ error: "No business found" }, { status: 404 });

    const items = await prisma.stockItem.findMany({
      where: { businessId },
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

    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    await prisma.stockItem.delete({
      where: { id, businessId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/stock:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
