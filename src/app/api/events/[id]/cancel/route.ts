import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

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
    });

    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    if (event.status === "COMPLETED" || event.status === "CANCELLED") {
      return NextResponse.json({ error: "Cannot cancel a completed or already cancelled event" }, { status: 400 });
    }

    // Delete linked expenses so cancelled event costs don't skew profit reports
    await prisma.expense.deleteMany({
      where: { linkedEventId: id, businessId },
    });

    const updated = await prisma.event.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: {
        customer: true,
        items: true,
        invoices: { orderBy: { createdAt: "desc" } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("POST /api/events/[id]/cancel:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
