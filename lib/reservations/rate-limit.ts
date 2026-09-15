import { createHmac } from "node:crypto";
import type { SanityClient } from "@sanity/client";
import { BookingError } from "./rules.ts";

export function privateKey(value: string) {
  const secret = process.env.BOOKING_RATE_LIMIT_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new BookingError("Booking setup is incomplete. Please contact Henrik directly.");
  return createHmac("sha256", secret).update(value).digest("hex");
}

/** Durable across server instances; one fixed-window counter per hashed identity.
 * Use trusted hosting-provided IP headers, not an address from the form.
 */
export async function rateLimit(client: SanityClient, identity: string, limit: number, windowMs: number) {
  const id = `bookingRate.${privateKey(identity)}`;
  await client.createIfNotExists({ _id: id, _type: "bookingRate", count: 0, until: 0 });
  for (let attempt = 0; attempt < 8; attempt++) {
    const row = await client.getDocument<{ _rev: string; count: number; until: number }>(id);
    if (!row) continue;
    const now = Date.now();
    const count = row.until > now ? row.count : 0;
    if (count >= limit) throw new BookingError("Too many requests. Please wait before trying again, or contact Henrik directly.");
    try {
      await client.patch(id).ifRevisionId(row._rev).set({ count: count + 1, until: row.until > now ? row.until : now + windowMs }).commit();
      return;
    } catch (error) { if ((error as { statusCode?: number })?.statusCode !== 409) throw error; }
  }
  throw new BookingError("Please wait a moment before trying again.");
}
