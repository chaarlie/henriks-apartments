import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed admin session token: `<base64url payload>.<base64url HMAC-SHA256>`.
 *
 * No "server-only" import on purpose — proxy.ts uses this too (Proxy runs on the
 * Node.js runtime). The signing key combines ADMIN_SESSION_SECRET with the
 * current ADMIN_PASSWORD_HASH, so changing either one signs every session out.
 */

export const SESSION_COOKIE = "hs_admin_session";
export const SESSION_MAX_AGE_S = 7 * 24 * 60 * 60;

interface SessionPayload {
  /** username */
  u: string;
  /** expiry, unix seconds */
  exp: number;
}

function signingKey(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET ?? "";
  const hash = process.env.ADMIN_PASSWORD_HASH ?? "";
  if (secret.length < 32 || !hash) return null;
  return `${secret}.${hash}`;
}

const sign = (data: string, key: string) => createHmac("sha256", key).update(data).digest("base64url");

export function createSessionToken(username: string): string {
  const key = signingKey();
  if (!key) throw new Error("Admin login is not configured");
  const payload: SessionPayload = { u: username, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_S };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, key)}`;
}

/** The session's username when the token is authentic, unexpired and for the configured admin; otherwise null. */
export function verifySessionToken(token: string | undefined): { username: string } | null {
  const key = signingKey();
  if (!key || !token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = Buffer.from(sign(body, key));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (typeof data.u !== "string" || typeof data.exp !== "number") return null;
    if (data.exp * 1000 <= Date.now()) return null;
    if (data.u !== process.env.ADMIN_USERNAME) return null;
    return { username: data.u };
  } catch {
    return null;
  }
}
