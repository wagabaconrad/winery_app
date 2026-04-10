import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { generateInvoiceNumber } from "@/lib/calculations";

export async function POST(
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
      include: { items: true, customer: true },
    });

    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    if (event.status !== "DRAFT") {
      return NextResponse.json({ error: "Only draft events can be confirmed" }, { status: 400 });
    }

    // Generate invoice number
    const lastInvoice = await prisma.eventInvoice.findFirst({
      where: { invoiceNumber: { startsWith: "EVT-" } },
      orderBy: { invoiceNumber: "desc" },
    });
    const invoiceNumber = generateInvoiceNumber(lastInvoice?.invoiceNumber || null, "EVT");

    // Transaction: update status + create invoice + create expense
    await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
      // Update event status
      await tx.event.update({
        where: { id },
        data: { status: "CONFIRMED" },
      });

      // Create event invoice
      await tx.eventInvoice.create({
        data: {
          eventId: id,
          invoiceNumber,
          budgetAmount: event.customerBudget,
          totalCost: event.totalCost,
        },
      });

      // Create expense entry for the event cost
      if (event.totalCost > 0) {
        await tx.expense.create({
          data: {
            businessId,
            category: "EVENT",
            description: `Event: ${event.name}`,
            amount: event.totalCost,
            linkedEventId: id,
          },
        });
      }
    });

    // Fetch updated event
    const updated = await prisma.event.findFirst({
      where: { id, businessId },
      include: {
        customer: true,
        items: true,
        invoices: { orderBy: { createdAt: "desc" } },
        expenses: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("POST /api/events/[id]/confirm:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
