import type { Unit } from "@/lib/content";

/** Size / baths / sleeps as short label–value pairs ("1.5 baths" → "1.5", "Sleeps 2" → "2"). */
export function unitFacts(u: Unit): [string, string][] {
  return [
    ["Size", u.spec.area],
    ["Baths", u.spec.bath.replace(/\s*baths?$/i, "")],
    ["Sleeps", u.spec.sleeps.replace(/^sleeps\s*/i, "")],
  ];
}

/** Card highlights: the unit's chips, minus any that repeat the size or sleeps facts. */
export function unitHighlights(u: Unit): string[] {
  return u.chips.filter((c) => !/sleeps|m²/i.test(c));
}
