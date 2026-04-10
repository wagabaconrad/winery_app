import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBusinessId } from "@/lib/auth";

export async function GET() {
  try {
    const businessId = await getBusinessId();
    if (!businessId) return NextResponse.json({ error: "No business found" }, { status: 404 });

    const invoices = await prisma.invoice.findMany({
      where: { sale: { businessId } },
      include: {
        sale: {
          include: {
            customer: true,
            items: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error("GET /api/invoices:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
