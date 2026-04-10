import { Webhook } from "svix";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

export async function POST(req: Request) {
  if (!WEBHOOK_SECRET) {
    console.error("CLERK_WEBHOOK_SECRET is not set");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  // Read raw body for signature verification
  const body = await req.text();

  // Extract svix signature headers
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  // Verify signature — rejects forged or replayed webhooks
  let payload: { type: string; data: Record<string, unknown> };
  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    payload = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof payload;
  } catch {
    return new Response("Invalid webhook signature", { status: 401 });
  }

  const eventType = payload.type;

  if (eventType === "user.created") {
    const data = payload.data as {
      id: string;
      email_addresses: { email_address: string }[];
      first_name?: string;
      last_name?: string;
    };
    await prisma.user.create({
      data: {
        clerkId: data.id,
        email: data.email_addresses[0].email_address,
        fullName: `${data.first_name || ""} ${data.last_name || ""}`.trim() || null,
      },
    });
  }

  if (eventType === "user.deleted") {
    const data = payload.data as { id: string };
    await prisma.user.delete({ where: { clerkId: data.id } });
  }

  return new Response("Webhook received", { status: 200 });
}
