import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { generateInvoiceNumber } from "@/lib/calculations";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const data = await getAuthenticatedUser();
    if (!data) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const businessId = data.business?.id;
    if (!businessId) return NextResponse.json({ error: "No business found" }, { status: 404 });

    const { id } = await params;

    const event = await prisma.event.findFirst({
      where: { id, businessId },
      include: {
        customer: true,
        items: true,
        invoices: { orderBy: { createdAt: "desc" } },
        expenses: true,
      },
    });

    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    return NextResponse.json(event);
  } catch (error) {
    console.error("GET /api/events/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const data = await getAuthenticatedUser();
    if (!data) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const businessId = data.business?.id;
    if (!businessId) return NextResponse.json({ error: "No business found" }, { status: 404 });

    const { id } = await params;

    const event = await prisma.event.findFirst({
      where: { id, businessId },
    });

    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    if (event.status === "COMPLETED" || event.status === "CANCELLED") {
      return NextResponse.json({ error: "Cannot edit a completed or cancelled event" }, { status: 400 });
    }

    const body = await request.json();
    const { eventType, name, customerId, eventDate, customerBudget, plateCost, plateCount, items, notes } = body;

    const parsedBudget = parseFloat(customerBudget) ?? event.customerBudget;
    const parsedPlateCount = parseInt(plateCount) ?? event.plateCount;

    // If CONFIRMED and budget changed, generate a new invoice revision
    const budgetChanged = event.status === "CONFIRMED" && parsedBudget !== event.customerBudget;

    // Recalculate total cost if items provided
    let totalCost = event.totalCost;
    if (items) {
      totalCost = 0;
      // Delete existing items and recreate
      await prisma.eventItem.deleteMany({ where: { eventId: id } });
      for (const item of items) {
        const qty = parseFloat(String(item.quantity)) || 0;
        const cost = parseFloat(String(item.unitCost)) || 0;
        const itemTotal = qty * cost;
        totalCost += itemTotal;
        await prisma.eventItem.create({
          data: { eventId: id, name: item.name, quantity: qty, unit: item.unit || "units", unitCost: cost, totalCost: itemTotal },
        });
      }
    }

    const calculatedPlateCost = parsedPlateCount > 0 ? Math.round((totalCost / parsedPlateCount) * 100) / 100 : parseFloat(plateCost) || event.plateCost;

    const updated = await prisma.event.update({
      where: { id },
      data: {
        ...(event.status === "DRAFT" && eventType ? { eventType } : {}),
        ...(name ? { name } : {}),
        customerId: customerId !== undefined ? (customerId || null) : undefined,
        eventDate: eventDate ? new Date(eventDate) : event.eventDate,
        customerBudget: parsedBudget,
        plateCost: calculatedPlateCost,
        plateCount: parsedPlateCount,
        totalCost,
        notes: notes !== undefined ? (notes || null) : event.notes,
      },
      include: {
        customer: true,
        items: true,
        invoices: { orderBy: { createdAt: "desc" } },
      },
    });

    // Generate revision invoice if budget changed on confirmed event
    if (budgetChanged) {
      const lastInvoice = await prisma.eventInvoice.findFirst({
        where: { invoiceNumber: { startsWith: "EVT-" } },
        orderBy: { invoiceNumber: "desc" },
      });
      const invoiceNumber = generateInvoiceNumber(lastInvoice?.invoiceNumber || null, "EVT");

      await prisma.eventInvoice.create({
        data: {
          eventId: id,
          invoiceNumber,
          budgetAmount: parsedBudget,
          totalCost,
        },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/events/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const data = await getAuthenticatedUser();
    if (!data) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const businessId = data.business?.id;
    if (!businessId) return NextResponse.json({ error: "No business found" }, { status: 404 });

    const { id } = await params;

    const event = await prisma.event.findFirst({
      where: { id, businessId },
    });

    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    if (event.status !== "DRAFT") {
      return NextResponse.json({ error: "Only draft events can be deleted" }, { status: 400 });
    }

    // Delete linked expenses before deleting the event
    await prisma.expense.deleteMany({ where: { linkedEventId: id, businessId } });
    await prisma.event.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/events/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
