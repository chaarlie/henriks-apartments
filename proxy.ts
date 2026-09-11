import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Everything under /admin needs a signed-in user — except the sign-in route
// itself. The public marketing site is not matched at all (see config below),
// so it never touches Clerk.
const isProtected = createRouteMatcher(["/admin(.*)"]);
const isSignIn = createRouteMatcher(["/admin/sign-in(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req) && !isSignIn(req)) {
    // Redirects unauthenticated users to NEXT_PUBLIC_CLERK_SIGN_IN_URL (/admin/sign-in).
    await auth.protect();
  }
});

export const config = {
  matcher: ["/admin/:path*"],
};
