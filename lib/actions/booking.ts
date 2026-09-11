"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getWriteClient } from "@/sanity/lib/writeClient";

export type HoldInput = {
  unitSlug: string;
  start: string; // ISO yyyy-mm-dd (check-in)
  end: string; // ISO yyyy-mm-dd (check-out)
  guest: { name: string; phone?: string; email?: string };
  note?: string;
};

export type HoldResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Public booking: creates a tentative "held" booking for a unit and blocks those
 * dates immediately. Henrik confirms out-of-band (WhatsApp). Availability is
 * re-checked server-side against live data so two people can't hold the same
 * dates — the client calendar guard is not trusted.
 */
export async function requestHold(input: HoldInput): Promise<HoldResult> {
  try {
    const name = input.guest?.name?.trim();
    const phone = input.guest?.phone?.trim();
    const email = input.guest?.email?.trim();

    if (!name) return { ok: false, error: "Please add your name." };
    if (!phone && !email)
      return { ok: false, error: "Add a WhatsApp number or email so Henrik can reach you." };
    if (!input.start || !input.end) return { ok: false, error: "Pick your dates." };
    if (input.end <= input.start)
      return { ok: false, error: "Check-out must be after check-in." };
    const todayIso = new Date().toISOString().slice(0, 10);
    if (input.start < todayIso)
      return { ok: false, error: "That check-in date is in the past." };

    const client = getWriteClient();

    const unit = await client.fetch<{ _id: string } | null>(
      `*[_type == "unit" && slug.current == $slug && hidden != true][0]{ _id }`,
      { slug: input.unitSlug },
    );
    if (!unit) return { ok: false, error: "That apartment isn't available." };

    // Live overlap check: this unit's holds/confirmations + any whole-property
    // closure. Inclusive ranges overlap when start <= otherEnd && end >= otherStart.
    const clashes = await client.fetch<number>(
      `count(*[_type == "booking"
        && status in ["held", "confirmed"]
        && (unit._ref == $uid || !defined(unit))
        && startDate <= $end && endDate >= $start])`,
      { uid: unit._id, start: input.start, end: input.end },
    );
    if (clashes > 0)
      return { ok: false, error: "Sorry — those dates were just taken. Try a different range." };

    const id = `booking.${randomUUID()}`;
    await client.create({
      _id: id,
      _type: "booking",
      unit: { _type: "reference", _ref: unit._id },
      startDate: input.start,
      endDate: input.end,
      status: "held",
      source: "web",
      note: input.note?.trim() || undefined,
      guest: { name, phone: phone || undefined, email: email || undefined },
    });

    // Public pages are ISR — surface the new hold as blocked on the calendar.
    revalidatePath("/", "layout");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not hold those dates." };
  }
}
