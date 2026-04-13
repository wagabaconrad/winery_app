import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public health-check used by Vercel, Railway, and load balancers.
// Returns 200 when the DB is reachable, 503 otherwise.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch {
    return NextResponse.json({ status: "error", message: "Database unreachable" }, { status: 503 });
  }
}
