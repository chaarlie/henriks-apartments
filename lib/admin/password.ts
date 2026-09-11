import "server-only";
import { scrypt, timingSafeEqual } from "node:crypto";

/**
 * Checks a password against ADMIN_PASSWORD_HASH, stored as
 * `scrypt:<N>:<r>:<p>:<salt>:<hash>` (salt and hash base64url). The separator is
 * ":" rather than "$" because Next.js expands `$VARS` inside .env files.
 * Hashes are produced by `npm run admin:password` (scripts/admin-password.mjs).
 */

const MAX_MEM = 64 * 1024 * 1024;

function derive(password: string, salt: Buffer, keylen: number, N: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, keylen, { N, r, p, maxmem: MAX_MEM }, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, salt, hash] = parts;
  const N = Number(n);
  const R = Number(r);
  const P = Number(p);
  if (![N, R, P].every(Number.isInteger)) return false;

  const expected = Buffer.from(hash, "base64url");
  if (expected.length < 32) return false;
  try {
    const actual = await derive(password, Buffer.from(salt, "base64url"), expected.length, N, R, P);
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
