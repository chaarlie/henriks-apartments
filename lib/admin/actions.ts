"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getWriteClient } from "@/sanity/lib/writeClient";
import { requireAdmin } from "@/lib/admin/auth";
import type { AdminUnitInput, AdminBookingInput } from "@/lib/admin/types";

const key = () => randomUUID().replace(/-/g, "").slice(0, 12);

function textToBlocks(text: string) {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((para) => ({
      _type: "block",
      _key: key(),
      style: "normal",
      markDefs: [],
      children: [{ _type: "span", _key: key(), text: para, marks: [] }],
    }));
}

// The public pages are ISR — nudge them to rebuild after an edit.
function revalidateSite() {
  revalidatePath("/", "layout");
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function saveUnit(input: AdminUnitInput): Promise<ActionResult> {
  try {
    await requireAdmin();
    await getWriteClient()
      .patch(input._id)
      .set({
        name: input.name,
        code: input.code,
        tagline: input.tagline,
        slug: { _type: "slug", current: input.slug },
        hidden: input.hidden,
        priceUsd: input.priceUsd,
        priceNightlyUsd: input.priceNightlyUsd,
        availableFrom: input.availableFrom || undefined,
        spec: input.spec,
        chips: input.chips,
        keywords: input.keywords,
        about: textToBlocks(input.about),
        space: input.space.map((s) => ({ _key: key(), ...s })),
        amenitiesOverride: {
          inside: input.amenities.inside.map((a) => ({
            _key: key(),
            _type: "amenityItem",
            ...a,
          })),
          building: input.amenities.building.map((a) => ({
            _key: key(),
            _type: "amenityItem",
            ...a,
          })),
        },
        termsOverride: input.terms.map((t) => ({ _key: key(), ...t })),
        coverImage: input.cover
          ? {
              _type: "image",
              asset: { _type: "reference", _ref: input.cover.ref },
              alt: input.cover.alt || undefined,
            }
          : undefined,
        gallery: input.gallery.map((g) => ({
          _type: "image",
          _key: key(),
          asset: { _type: "reference", _ref: g.ref },
          alt: g.alt || undefined,
        })),
        tour: input.tour.map((s) => ({
          _key: key(),
          stopId: s.stopId,
          name: s.name,
          panorama: s.panorama,
          links: s.links.map((l) => ({ _key: key(), to: l.to, yaw: l.yaw })),
        })),
      })
      .commit();
    revalidateSite();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Save failed" };
  }
}

export async function setUnitHidden(
  id: string,
  hidden: boolean,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    await getWriteClient().patch(id).set({ hidden }).commit();
    revalidateSite();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Update failed" };
  }
}

export type SaveBookingResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function saveBooking(
  input: AdminBookingInput,
): Promise<SaveBookingResult> {
  try {
    await requireAdmin();
    if (!input.start || !input.end) return { ok: false, error: "Pick both dates." };
    if (input.end <= input.start)
      return { ok: false, error: "Check-out must be after check-in." };

    const id = input._id ?? `booking.${randomUUID()}`;
    await getWriteClient().createOrReplace({
      _id: id,
      _type: "booking",
      ...(input.unitId
        ? { unit: { _type: "reference", _ref: input.unitId } }
        : {}),
      startDate: input.start,
      endDate: input.end,
      status: input.status,
      source: "manual",
      note: input.note || undefined,
      guest: {
        name: input.guest.name || undefined,
        phone: input.guest.phone || undefined,
        email: input.guest.email || undefined,
      },
    });
    revalidateSite();
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Save failed" };
  }
}

export async function deleteBooking(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await getWriteClient().delete(id);
    revalidateSite();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Delete failed" };
  }
}
