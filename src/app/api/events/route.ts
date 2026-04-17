import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const data = await getAuthenticatedUser();
    if (!data) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const businessId = data.business?.id;
    if (!businessId) return NextResponse.json({ error: "No business found" }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = { businessId };
    if (status) where.status = status;

    const events = await prisma.event.findMany({
      where,
      include: {
        customer: true,
        items: true,
        invoices: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("GET /api/events:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await getAuthenticatedUser();
    if (!data) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const businessId = data.business?.id;
    if (!businessId) return NextResponse.json({ error: "No business found" }, { status: 404 });

    if (data.business?.businessType !== "FOOD") {
      return NextResponse.json({ error: "Events are only available for food businesses" }, { status: 400 });
    }

    const body = await request.json();
    const { eventType, name, customerId, eventDate, customerBudget, plateCost, plateCount, items, notes } = body;

    if (!eventType || !name) {
      return NextResponse.json({ error: "Event type and name are required" }, { status: 400 });
    }

    if (!["WEDDING", "BIRTHDAY", "CORPORATE", "PARTY", "FUNERAL", "OTHER"].includes(eventType)) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }

    const parsedBudget = parseFloat(customerBudget) || 0;
    const parsedPlateCount = parseInt(plateCount) || 0;

    // Validate customerId belongs to this business (tenant isolation + protect against stale/bogus IDs)
    let verifiedCustomerId: string | null = null;
    if (customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, businessId },
        select: { id: true },
      });
      verifiedCustomerId = customer?.id || null;
    }

    // Calculate total cost from items
    let totalCost = 0;
    const validItems = (items || []).map((item: { name: string; quantity: number; unit: string; unitCost: number }) => {
      const qty = parseFloat(String(item.quantity)) || 0;
      const cost = parseFloat(String(item.unitCost)) || 0;
      const itemTotal = qty * cost;
      totalCost += itemTotal;
      return { name: item.name, quantity: qty, unit: item.unit || "units", unitCost: cost, totalCost: itemTotal };
    });

    const calculatedPlateCost = parsedPlateCount > 0 ? Math.round((totalCost / parsedPlateCount) * 100) / 100 : parseFloat(plateCost) || 0;

    const event = await prisma.event.create({
      data: {
        businessId,
        customerId: verifiedCustomerId,
        eventType,
        name,
        eventDate: eventDate ? new Date(eventDate) : null,
        customerBudget: parsedBudget,
        plateCost: calculatedPlateCost,
        plateCount: parsedPlateCount,
        totalCost,
        notes: notes || null,
        status: "DRAFT",
        items: {
          create: validItems,
        },
      },
      include: {
        customer: true,
        items: true,
        invoices: true,
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("POST /api/events:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
