import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/admin/session-token";

// Gate for /admin. The public site is not matched at all (see config below).
// Signed-out visitors are sent to the login screen; the admin API answers 401.
// This is a first line only — every server action and API route checks the
// session again via lib/admin/session.ts.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();

  if (verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();

  if (pathname.startsWith("/admin/api/")) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  const login = new URL("/admin/login", request.url);
  if (pathname !== "/admin") login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin/:path*"],
};
