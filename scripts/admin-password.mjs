#!/usr/bin/env node
/**
 * Generates the admin login hash (salted scrypt) for .env.local / Vercel.
 *
 *   npm run admin:password                 asks for the password (hidden input)
 *   npm run admin:password -- --secret     also prints a new ADMIN_SESSION_SECRET
 *   printf '%s' 'pw' | npm run admin:password   reads the password from stdin
 *
 * Only the hash is printed — never the password. The format uses ":" instead
 * of "$" because Next.js expands $VARS inside .env files.
 * Changing the hash or the secret signs every admin session out.
 */
import { randomBytes, scrypt } from "node:crypto";

const N = 2 ** 15;
const R = 8;
const P = 1;
const KEYLEN = 64;
const MAX_MEM = 64 * 1024 * 1024;

function readHidden(prompt) {
  return new Promise((resolve) => {
    const { stdin, stdout } = process;
    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          stdout.write("\n");
          resolve(value);
          return;
        }
        if (ch === "") {
          stdout.write("\n");
          process.exit(130);
        }
        if (ch === "" || ch === "\b") value = value.slice(0, -1);
        else value += ch;
      }
    };
    stdin.on("data", onData);
  });
}

function readPiped() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data.replace(/\r?\n$/, "")));
    process.stdin.on("error", reject);
  });
}

let password;
if (process.stdin.isTTY) {
  password = await readHidden("New admin password: ");
  const again = await readHidden("Repeat password: ");
  if (again !== password) {
    console.error("Passwords don't match — nothing generated.");
    process.exit(1);
  }
} else {
  password = await readPiped();
}

if (password.length < 12) {
  console.error("Use at least 12 characters — a few random words works well.");
  process.exit(1);
}

const salt = randomBytes(16);
const hash = await new Promise((resolve, reject) =>
  scrypt(password, salt, KEYLEN, { N, r: R, p: P, maxmem: MAX_MEM }, (err, key) => (err ? reject(err) : resolve(key))),
);

console.log("\nAdd to .env.local and to Vercel → Settings → Environment Variables:\n");
console.log(`ADMIN_PASSWORD_HASH=scrypt:${N}:${R}:${P}:${salt.toString("base64url")}:${hash.toString("base64url")}`);
if (process.argv.includes("--secret")) {
  console.log(`ADMIN_SESSION_SECRET=${randomBytes(48).toString("base64url")}`);
}
