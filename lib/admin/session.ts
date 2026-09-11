import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/admin/session-token";

export interface AdminIdentity {
  username: string;
}

/** The signed-in admin, or null. For pages and layouts. */
export async function getAdminSession(): Promise<AdminIdentity | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

/** For server actions and route handlers: the admin identity, or throws. */
export async function requireAdmin(): Promise<AdminIdentity> {
  const session = await getAdminSession();
  if (!session) throw new Error("Not authorised");
  return session;
}
