import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";

// Emergency session reset — wipes all Clerk cookies so the browser starts fresh.
// POST-only: GET would be exploitable as a logout-CSRF via <img src="..."> on third-party sites.
export async function POST(request: Request) {
  // Sec-Fetch-Site is a browser-enforced header; cross-site requests are rejected.
  const reqHeaders = await headers();
  const fetchSite = reqHeaders.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "same-site" && fetchSite !== "none") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const store = await cookies();
  const all = store.getAll();

  const isClerkCookie = (name: string) =>
    name.startsWith("__clerk") ||
    name.startsWith("__session") ||
    name.startsWith("__client") ||
    name === "__refresh";

  for (const c of all) {
    if (isClerkCookie(c.name)) store.delete(c.name);
  }

  const origin = new URL(request.url).origin;
  const res = NextResponse.redirect(new URL("/sign-in", origin));
  for (const c of all) {
    if (isClerkCookie(c.name)) res.cookies.set(c.name, "", { maxAge: 0, path: "/" });
  }
  return res;
}
