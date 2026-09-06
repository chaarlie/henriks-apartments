import type { Unit } from "@/lib/content";
import { fromIso } from "@/lib/dates";

/** First available day for a unit, as a UTC timestamp. */
export const availableFrom = (u: Unit) => fromIso(u.availableFrom);

/** A unit is bookable for the chosen move-in if it's free by then (or no date yet). */
export const availableForDates = (u: Unit, start: number | null) =>
  start === null || start >= availableFrom(u);

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
