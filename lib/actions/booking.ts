"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { ui } from "@/lib/i18n/ui";
import { isLocale, type Locale } from "@/lib/locales";
import { getWriteClient } from "@/sanity/lib/writeClient";
import { BookingError, holdExpiry, textField, validateDates, validateGuest } from "@/lib/reservations/rules";
import { ConflictError, writeReservation, type BookingDocument } from "@/lib/reservations/store";
import { rateLimit } from "@/lib/reservations/rate-limit";
import { notifyOwner } from "@/lib/reservations/notify";

export type HoldInput = {
  locale?: Locale; requestId: string; website?: string;
  unitSlug: string; start: string; end: string;
  guest: { name: string; phone?: string; email?: string }; note?: string;
};
export type HoldResult = { ok: true; id: string } | { ok: false; error: string };

export async function requestHold(input: HoldInput): Promise<HoldResult> {
  const t = ui(input?.locale && isLocale(input.locale) ? input.locale : "en");
  try {
    if (!input || typeof input !== "object") throw new BookingError("Invalid request.");
    if (input.website) throw new BookingError("Unable to accept this request. Please contact Henrik directly.");
    if (typeof input.requestId !== "string" || !/^[a-f0-9-]{36}$/i.test(input.requestId)) throw new BookingError("Refresh the page and try again.");
    const client = getWriteClient();
    const h = await headers();
    // Vercel overwrites this header. On other hosts configure the reverse proxy
    // to replace x-real-ip; never trust a client-supplied x-forwarded-for chain.
    const ip = process.env.VERCEL ? h.get("x-forwarded-for")?.split(",")[0]?.trim() : h.get("x-real-ip");
    await rateLimit(client, `ip:${ip || "unknown"}`, 10, 15 * 60_000);
    const guest = validateGuest(input.guest, true);
    const note = textField(input.note, "Note", 2000);
    const slug = textField(input.unitSlug, "Apartment", 200);
    const hash = createHash("sha256").update(JSON.stringify({ slug, start: input.start, end: input.end, guest, note })).digest("hex");
    const id = `booking.web-${input.requestId.toLowerCase()}`;
    const previous = await client.getDocument<BookingDocument>(id);
    if (previous) {
      if (previous.requestHash !== hash) throw new BookingError("This request was already used for different details. Refresh and try again.");
      await notifyOwner(client, previous);
      return { ok: true, id };
    }
    validateDates(input.start, input.end);
    const unit = await client.fetch<{ _id: string; availableFrom?: string } | null>(
      `*[_type == "unit" && slug.current == $slug && hidden != true][0]{_id, availableFrom}`, { slug }, { cache: "no-store" },
    );
    if (!unit) return { ok: false, error: t.unavailableUnit };
    validateDates(input.start, input.end, { opening: unit.availableFrom });
    // Limit each supplied contact, so switching between phone/email cannot bypass it.
    for (const contact of [guest.email, guest.phone.replace(/\D/g, "")].filter(Boolean)) {
      await rateLimit(client, `contact:${contact}`, 3, 60 * 60_000);
    }
    const booking = await writeReservation(client, {
      _id: id, _type: "booking", unit: { _type: "reference", _ref: unit._id },
      startDate: input.start, endDate: input.end, status: "held", source: "web",
      guest, note, holdExpiresAt: holdExpiry("held"), requestHash: hash, notificationStatus: "pending",
    });
    revalidatePath("/", "layout");
    await notifyOwner(client, booking);
    return { ok: true, id };
  } catch (error) {
    if (error instanceof ConflictError) return { ok: false, error: t.datesTaken };
    return { ok: false, error: error instanceof BookingError ? error.message : t.holdFailed };
  }
}
