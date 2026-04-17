import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBusinessId } from "@/lib/auth";

export async function GET() {
  try {
    const businessId = await getBusinessId();
    if (!businessId) return NextResponse.json({ error: "No business found" }, { status: 404 });

    const expenses = await prisma.expense.findMany({
      where: { businessId },
      include: { linkedBatch: true },
      orderBy: { date: "desc" },
    });

    let totalExpenses = 0;
    for (const e of expenses) {
      totalExpenses += e.amount;
    }

    return NextResponse.json({ expenses, totalExpenses });
  } catch (error) {
    console.error("GET /api/expenses:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const businessId = await getBusinessId();
    if (!businessId) return NextResponse.json({ error: "No business found" }, { status: 404 });

    const body = await request.json();
    const { category, description, amount, linkedBatchId } = body;

    const VALID_CATEGORIES = ["TRANSPORT", "RENT", "LABOR", "PACKAGING", "UTILITIES", "MARKETING", "EVENT", "OTHER"];
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "Invalid or missing category" }, { status: 400 });
    }

    if (!amount) {
      return NextResponse.json({ error: "Amount is required" }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
    }

    // Verify linkedBatchId belongs to this business (prevent cross-tenant linkage)
    let verifiedBatchId: string | null = null;
    if (linkedBatchId) {
      const batch = await prisma.productionBatch.findFirst({
        where: { id: linkedBatchId, businessId },
        select: { id: true },
      });
      verifiedBatchId = batch?.id || null;
    }

    const expense = await prisma.expense.create({
      data: {
        businessId,
        category,
        description: description || null,
        amount: parsedAmount,
        linkedBatchId: verifiedBatchId,
      },
      include: { linkedBatch: true },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("POST /api/expenses:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const businessId = await getBusinessId();
    if (!businessId) return NextResponse.json({ error: "No business found" }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.expense.delete({ where: { id, businessId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/expenses:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
