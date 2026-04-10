import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET() {
  try {
    const authData = await getAuthenticatedUser();
    if (!authData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const businessId = authData.business?.id;
    if (!businessId) return NextResponse.json({ error: "No business found" }, { status: 404 });

    const entries = await prisma.capitalEntry.findMany({
      where: { businessId },
      orderBy: { date: "desc" },
    });

    // Calculate total capital
    let totalCapital = 0;
    for (const e of entries) {
      totalCapital += e.type === "WITHDRAWN" ? -e.amount : e.amount;
    }

    return NextResponse.json({ entries, totalCapital });
  } catch (error) {
    console.error("GET /api/capital:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authData = await getAuthenticatedUser();
    if (!authData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const businessId = authData.business?.id;
    if (!businessId) return NextResponse.json({ error: "No business found" }, { status: 404 });

    const body = await request.json();
    const { amount, type, note } = body;

    if (!amount || !type) {
      return NextResponse.json({ error: "Amount and type are required" }, { status: 400 });
    }

    if (!["INITIAL", "ADDED", "WITHDRAWN"].includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // Wine businesses cannot withdraw capital
    if (authData.business?.businessType === "WINE" && type === "WITHDRAWN") {
      return NextResponse.json(
        { error: "Wine businesses cannot withdraw capital. Capital can only be topped up." },
        { status: 400 }
      );
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
    }

    const entry = await prisma.capitalEntry.create({
      data: {
        businessId,
        amount: parsedAmount,
        type,
        note: note || null,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("POST /api/capital:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
