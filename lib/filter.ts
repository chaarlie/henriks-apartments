import type { Unit } from "@/lib/content";
import { fromIso } from "@/lib/dates";

/** First available day for a unit, as a UTC timestamp. */
export const availableFrom = (u: Unit) => fromIso(u.availableFrom);

// availableForDates now lives in lib/availability.ts — it needs SiteContent to
// check real per-unit bookings, not just the unit's opening date.

/** Landing search: layout + max rent + keyword blob. */
export function matchesFilters(
  u: Unit,
  kw: string,
  layout: string,
  maxRent: string,
): boolean {
  if (layout && u.slug !== layout) return false;
  if (maxRent && u.priceUsd > Number(maxRent)) return false;
  if (kw) {
    const hay = `${u.name} ${u.tagline} ${u.spec.area} ${u.keywords}`.toLowerCase();
    if (!hay.includes(kw.toLowerCase())) return false;
  }
  return true;
}
