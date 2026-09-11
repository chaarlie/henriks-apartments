"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getWriteClient } from "@/sanity/lib/writeClient";
import { requireAdmin } from "@/lib/admin/session";
import type {
  AdminUnitInput,
  AdminBookingInput,
  AdminPropertyInput,
  PropertyAmenityRow,
} from "@/lib/admin/types";

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

// ── Shared settings (the siteSettings singleton) ─────────────────────────────
const SETTINGS_ID = "siteSettings";

/**
 * The site prints "rate as of <date>" next to peso prices. Keep that date on the
 * document so saving the WhatsApp number or an amenity tile doesn't make an old
 * rate look freshly checked. A new rate gets today's date.
 */
async function rateAsOf(nextRate?: number): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const cur = await getWriteClient().fetch<{
    fxRate?: number;
    fxRateAsOf?: string;
    _updatedAt?: string;
  } | null>(`*[_id == $id][0]{fxRate, fxRateAsOf, _updatedAt}`, { id: SETTINGS_ID });
  if (nextRate !== undefined && nextRate !== cur?.fxRate) return today;
  return cur?.fxRateAsOf ?? cur?._updatedAt?.slice(0, 10) ?? today;
}

export async function saveAmenities(rows: PropertyAmenityRow[]): Promise<ActionResult> {
  try {
    await requireAdmin();
    const clean = rows.map((r) => ({
      icon: r.icon.trim(),
      title: r.title.trim(),
      desc: r.desc.trim(),
    }));
    if (clean.length === 0)
      return { ok: false, error: "Keep at least one amenity — the homepage section needs it." };
    const untitled = clean.findIndex((r) => !r.title);
    if (untitled >= 0) return { ok: false, error: `Amenity ${untitled + 1} needs a title.` };
    const noIcon = clean.find((r) => !r.icon);
    if (noIcon) return { ok: false, error: `Pick an icon for “${noIcon.title}”.` };

    await getWriteClient()
      .patch(SETTINGS_ID)
      .set({
        fxRateAsOf: await rateAsOf(),
        propertyAmenities: clean.map((r) => ({ _key: key(), ...r })),
      })
      .commit();
    revalidateSite();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Save failed" };
  }
}

export type SavePropertyResult =
  | { ok: true; fxRateAsOf: string }
  | { ok: false; error: string };

export async function saveProperty(input: AdminPropertyInput): Promise<SavePropertyResult> {
  try {
    await requireAdmin();
    const whatsapp = input.whatsappNumber.replace(/\D/g, "");
    if (!input.propertyName.trim()) return { ok: false, error: "Add the property name." };
    if (whatsapp.length < 8 || whatsapp.length > 15)
      return {
        ok: false,
        error: "Enter the WhatsApp number with its country code — for example 1 809 555 0142.",
      };
    if (!(input.fxRate > 0 && input.fxRate < 1000))
      return { ok: false, error: "Enter the exchange rate as pesos per US dollar — for example 61." };
    if (!(input.powerBaseUsd >= 0))
      return { ok: false, error: "The power estimate can’t be negative." };
    const badDiscount = input.discounts.some(
      (d) => !Number.isInteger(d.months) || d.months < 1 || !(d.percent > 0 && d.percent <= 50),
    );
    if (badDiscount)
      return {
        ok: false,
        error: "Each discount needs whole months (1 or more) and a percent between 1 and 50.",
      };

    const fxRateAsOf = await rateAsOf(input.fxRate);
    await getWriteClient()
      .patch(SETTINGS_ID)
      .set({
        propertyName: input.propertyName.trim(),
        city: input.city.trim(),
        region: input.region.trim(),
        whatsappNumber: whatsapp,
        fxRate: input.fxRate,
        fxRateAsOf,
        powerBaseUsd: input.powerBaseUsd,
        discounts: [...input.discounts]
          .sort((a, b) => a.months - b.months)
          .map((d) => ({ _key: key(), months: d.months, pct: d.percent / 100 })),
      })
      .commit();
    revalidateSite();
    return { ok: true, fxRateAsOf };
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
