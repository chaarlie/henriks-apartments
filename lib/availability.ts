import type { SiteContent, Unit } from "@/lib/content";
import { DAY, fromIso, today } from "@/lib/dates";
import { availableFrom } from "@/lib/filter";

/**
 * Per-unit availability, derived from Sanity bookings (see SiteContent.availability).
 * A day is unavailable for a unit when it's in the past, inside a whole-property
 * closure, or inside one of that unit's own booked ranges. Ranges are treated as
 * [start, end] inclusive — the checkout day is held too, which is the safe choice
 * for monthly stays (no same-day turnover) and avoids overlap edge cases.
 */
export function unitRanges(content: SiteContent, slug: string): [number, number][] {
  const closures = content.availability.closures;
  const own = content.availability.byUnit[slug] ?? [];
  return [...closures, ...own].map(([a, b]) => [fromIso(a), fromIso(b)]);
}

/** A predicate for the calendar: is this day unavailable for the given unit? */
export function blockedFor(content: SiteContent, slug: string): (t: number) => boolean {
  const ranges = unitRanges(content, slug);
  return (t: number) => t < today || ranges.some(([a, b]) => t >= a && t <= b);
}

/** True when every day of [startTs, endTs] (inclusive) is free for the unit. */
export function rangeFree(
  content: SiteContent,
  slug: string,
  startTs: number,
  endTs: number,
): boolean {
  if (startTs === null || endTs === null || endTs <= startTs) return false;
  const blocked = blockedFor(content, slug);
  for (let t = startTs; t <= endTs; t += DAY) {
    if (blocked(t)) return false;
  }
  return true;
}

/**
 * Whether a unit is bookable for the current selection. With no dates it's just
 * "has it opened yet"; with a move-in it must be free from then, and if a
 * checkout is set the whole range must be free.
 */
export function availableForDates(
  content: SiteContent,
  u: Unit,
  start: number | null,
  end: number | null,
): boolean {
  if (start === null) return true;
  if (start < availableFrom(u)) return false;
  const blocked = blockedFor(content, u.slug);
  const last = end ?? start;
  for (let t = start; t <= last; t += DAY) {
    if (blocked(t)) return false;
  }
  return true;
}
