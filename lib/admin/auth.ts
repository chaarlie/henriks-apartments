import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";

/** Gmail(s) allowed into /admin, from ADMIN_ALLOWED_EMAILS (comma-separated). */
function allowedEmails(): string[] {
  return (process.env.ADMIN_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export interface AdminIdentity {
  userId: string;
  email: string;
  name: string;
}

/**
 * Result of an access check:
 *  - "unauthenticated" → not signed in (send to sign-in)
 *  - "forbidden"       → signed in but not on the allowlist
 *  - { identity }      → authorised admin
 */
export type AdminAccess =
  | { status: "unauthenticated" }
  | { status: "forbidden"; email: string }
  | { status: "ok"; identity: AdminIdentity };

export async function checkAdmin(): Promise<AdminAccess> {
  const { userId } = await auth();
  if (!userId) return { status: "unauthenticated" };

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress?.toLowerCase() ?? "";
  const list = allowedEmails();
  // If no allowlist is configured, any signed-in user is allowed (dev default).
  if (list.length > 0 && !list.includes(email)) {
    return { status: "forbidden", email };
  }
  return {
    status: "ok",
    identity: {
      userId,
      email,
      name: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || email,
    },
  };
}

/** For server actions: returns the admin identity or throws. */
export async function requireAdmin(): Promise<AdminIdentity> {
  const access = await checkAdmin();
  if (access.status !== "ok") throw new Error("Not authorised");
  return access.identity;
}
