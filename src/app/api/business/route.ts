import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET() {
  try {
    const data = await getAuthenticatedUser();
    if (!data) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    return NextResponse.json({ user: data.user, business: data.business });
  } catch (error) {
    console.error("GET /api/business:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await getAuthenticatedUser();
    if (!data) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (data.business) {
      return NextResponse.json({ error: "Business already exists" }, { status: 400 });
    }

    const body = await request.json();
    const { name, currency = "UGX", openingCapital = 0, businessType = "WINE" } = body;

    if (!name) {
      return NextResponse.json({ error: "Business name is required" }, { status: 400 });
    }

    if (businessType !== "WINE" && businessType !== "FOOD") {
      return NextResponse.json({ error: "Business type must be WINE or FOOD" }, { status: 400 });
    }

    const business = await prisma.business.create({
      data: {
        userId: data.user.id,
        name,
        businessType,
        currency,
        openingCapital: parseFloat(openingCapital),
      },
    });

    // Create initial capital entry if opening capital > 0
    if (parseFloat(openingCapital) > 0) {
      await prisma.capitalEntry.create({
        data: {
          businessId: business.id,
          amount: parseFloat(openingCapital),
          type: "INITIAL",
          note: "Opening capital",
        },
      });
    }

    return NextResponse.json(business, { status: 201 });
  } catch (error) {
    console.error("POST /api/business:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
