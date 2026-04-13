import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// Short-lived in-memory cache: avoids a Supabase round-trip on every API request.
// Safe to cache for 60 s — business data rarely changes mid-session.
// Each server process has its own cache; it is automatically discarded on restart.
type CacheEntry = {
  data: Awaited<ReturnType<typeof _lookupUser>>;
  expiresAt: number;
};
const _authCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000; // 60 seconds

async function _lookupUser(userId: string) {
  let user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { businesses: true },
  });

  if (!user) {
    const clerkUser = await currentUser();
    if (!clerkUser) return null;

    const email = clerkUser.emailAddresses[0]?.emailAddress || `unknown-${userId}@clerk.dev`;
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
          email,
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
 * Gets the authenticated user and their business.
 * Result is cached for 60 s per userId to avoid a DB round-trip on every request.
 * Call invalidateAuthCache(userId) when business data changes.
 */
export async function getAuthenticatedUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const cached = _authCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const result = await _lookupUser(userId);
  _authCache.set(userId, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}

/** Call this after creating or modifying a business so the next request re-reads from DB. */
export function invalidateAuthCache(userId: string) {
  _authCache.delete(userId);
}

/**
 * Gets just the business ID for the authenticated user.
 * Returns null if no business exists.
 */
export async function getBusinessId(): Promise<string | null> {
  const data = await getAuthenticatedUser();
  return data?.business?.id || null;
}
