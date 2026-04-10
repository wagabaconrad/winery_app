import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * Gets the authenticated user and their business natively via Clerk + Prisma.
 * Creates user and business records synthetically if webhooks misfired.
 */
export async function getAuthenticatedUser() {
  const { userId } = await auth();

  if (!userId) return null;

  // Find or create user mapped explicitly by Clerk UUID
  let user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { businesses: true },
  });

  if (!user) {
    const clerkUser = await currentUser();
    if (!clerkUser) return null;

    const email = clerkUser.emailAddresses[0]?.emailAddress || `unknown-${userId}@clerk.dev`;

    // Attempt to link legacy users directly by matching email securely
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      user = await prisma.user.update({
        where: { email },
        data: { clerkId: userId },
        include: { businesses: true },
      });
    } else {
      user = await prisma.user.create({
        data: {
          clerkId: userId,
          email: email,
          fullName: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || null,
        },
        include: { businesses: true },
      });
    }
  }

  const business = user.businesses[0] || null;

  return { user, business, authUser: { id: userId } };
}

/**
 * Gets just the business ID for the authenticated user.
 * Returns null if no business exists.
 */
export async function getBusinessId(): Promise<string | null> {
  const data = await getAuthenticatedUser();
  return data?.business?.id || null;
}
