import type { SiteContent, Unit } from "@/lib/content";
import { DAY, fromIso, today } from "@/lib/dates";
import { availableFrom } from "@/lib/filter";

/**
 * Per-unit availability, derived from Sanity bookings (see SiteContent.availability).
 * A day is unavailable for a unit when it's in the past, before the unit opens,
 * inside a whole-property closure, or inside one of that unit's own booked ranges.
 * Ranges are treated as [start, end] inclusive — the checkout day is held too,
 * which is the safe choice for monthly stays (no same-day turnover) and avoids
 * overlap edge cases.
 */
export function unitRanges(content: SiteContent, slug: string): [number, number][] {
  const closures = content.availability.closures;
  const own = content.availability.byUnit[slug] ?? [];
  return [...closures, ...own].map(([a, b]) => [fromIso(a), fromIso(b)]);
}

/** A predicate for the calendar: is this day unavailable for the given unit? */
export function blockedFor(content: SiteContent, slug: string): (t: number) => boolean {
  const unit = content.units.find((u) => u.slug === slug);
  const opens = unit ? Math.max(today, availableFrom(unit)) : today;
  const ranges = unitRanges(content, slug);
  return (t: number) => t < opens || ranges.some(([a, b]) => t >= a && t <= b);
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
 * Whether a unit is bookable for the current selection. With no dates it's
 * always true; with a move-in it must be free that day, and if a checkout is
 * set the whole range must be free.
 */
export function availableForDates(
  content: SiteContent,
  u: Unit,
  start: number | null,
  end: number | null,
): boolean {
  if (start === null) return true;
  const blocked = blockedFor(content, u.slug);
  const last = end ?? start;
  for (let t = start; t <= last; t += DAY) {
    if (blocked(t)) return false;
  }
  return true;
}

// ── Date-picker scope ────────────────────────────────────────────────────────
// The picker asks about one unit (a slug) or "any" apartment. With "any", a day
// is only blocked when every unit is unavailable, and a stay is possible when
// at least one unit is free for all of it.

export function scopeUnits(content: SiteContent, scope: string): Unit[] {
  return scope === "any" ? content.units : content.units.filter((u) => u.slug === scope);
}

/** Calendar predicate for a scope: blocked when no apartment in scope is free that day. */
export function blockedForScope(content: SiteContent, scope: string): (t: number) => boolean {
  const checks = scopeUnits(content, scope).map((u) => blockedFor(content, u.slug));
  return (t: number) => checks.every((blocked) => blocked(t));
}

/** Apartments in scope that are free for every day of [start, end]. */
export function freeUnits(content: SiteContent, scope: string, start: number, end: number): Unit[] {
  return scopeUnits(content, scope).filter((u) => availableForDates(content, u, start, end));
}

/** How far ahead lastLeaveDay looks for the next booking. */
const HORIZON = 400 * DAY;

/**
 * The latest leaving day reachable from `arrival` — some apartment in scope is
 * free for every day in between. Returns `arrival` itself when no apartment can
 * stay even one night.
 */
export function lastLeaveDay(content: SiteContent, scope: string, arrival: number): number {
  let latest = arrival;
  for (const u of scopeUnits(content, scope)) {
    const blocked = blockedFor(content, u.slug);
    if (blocked(arrival)) continue;
    let t = arrival;
    while (t - arrival < HORIZON && !blocked(t + DAY)) t += DAY;
    latest = Math.max(latest, t);
  }
  return latest;
}

/**
 * For a unit that isn't free for [start, end]: the first day it's free again
 * after the booking that gets in the way.
 */
export function freeAgainFrom(content: SiteContent, u: Unit, start: number, end: number): number {
  const blocked = blockedFor(content, u.slug);
  let t = start;
  while (t <= end && !blocked(t)) t += DAY;
  const limit = t + HORIZON;
  while (blocked(t) && t < limit) t += DAY;
  return t;
}
