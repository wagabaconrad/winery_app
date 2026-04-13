import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Emergency session reset — wipes all Clerk cookies so the browser starts
// fresh. Useful when a stale __client_uat / __session cookie is making
// every request trigger a slow handshake in dev.
export async function GET(request: Request) {
  const store = await cookies();
  const all = store.getAll();

  // Remove any cookie Clerk manages (prefixed with __clerk, __session, __client)
  for (const c of all) {
    if (
      c.name.startsWith("__clerk") ||
      c.name.startsWith("__session") ||
      c.name.startsWith("__client") ||
      c.name === "__refresh"
    ) {
      store.delete(c.name);
    }
  }

  // Derive origin from the actual request so this works on any domain
  const origin = new URL(request.url).origin;
  const res = NextResponse.redirect(new URL("/sign-in", origin));
  // Belt-and-braces: also set them to empty with maxAge 0 on the response
  for (const c of all) {
    if (
      c.name.startsWith("__clerk") ||
      c.name.startsWith("__session") ||
      c.name.startsWith("__client") ||
      c.name === "__refresh"
    ) {
      res.cookies.set(c.name, "", { maxAge: 0, path: "/" });
    }
  }
  return res;
}
