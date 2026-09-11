"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifyPassword } from "@/lib/admin/password";
import { SESSION_COOKIE, SESSION_MAX_AGE_S, createSessionToken } from "@/lib/admin/session-token";

/** `username` is echoed back so the form keeps it after a failed attempt (React resets form fields). */
export type LoginState = { error: string | null; username: string };

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

// Failed attempts per client IP. Best effort: this lives in one server
// instance's memory, so in production pair it with a Vercel Firewall
// rate-limit rule on /admin/login.
const failures = new Map<string, { count: number; first: number }>();

/** Compares two strings without leaking their length or where they differ. */
function sameText(a: string, b: string): boolean {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const expectedUser = process.env.ADMIN_USERNAME ?? "";
  const expectedHash = process.env.ADMIN_PASSWORD_HASH ?? "";

  if (!expectedUser || !expectedHash || (process.env.ADMIN_SESSION_SECRET ?? "").length < 32) {
    return { error: "Admin login isn’t set up yet. Add the ADMIN_* variables — see .env.example.", username };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const now = Date.now();
  const record = failures.get(ip);
  if (record && now - record.first < WINDOW_MS && record.count >= MAX_FAILURES) {
    const minutes = Math.ceil((WINDOW_MS - (now - record.first)) / 60_000);
    return { error: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`, username };
  }

  // Always hash the password, so a wrong username takes as long as a wrong password.
  const passwordOk = await verifyPassword(password, expectedHash);
  if (!(sameText(username, expectedUser) && passwordOk)) {
    if (!record || now - record.first >= WINDOW_MS) failures.set(ip, { count: 1, first: now });
    else record.count += 1;
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { error: "Wrong username or password.", username };
  }

  failures.delete(ip);
  (await cookies()).set(SESSION_COOKIE, createSessionToken(expectedUser), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: SESSION_MAX_AGE_S,
  });

  const next = String(formData.get("next") ?? "");
  redirect(next.startsWith("/admin") && !next.startsWith("/admin/login") ? next : "/admin");
}

export async function signOut(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, "", { path: "/admin", maxAge: 0 });
  redirect("/admin/login");
}
