import type { Unit } from "@/lib/content";

/** The three facts, in display order. */
export type UnitFactKey = "size" | "baths" | "sleeps";

/**
 * Size / baths / sleeps as key–value pairs ("1.5 baths" → "1.5", "Sleeps 2" → "2").
 *
 * The first element is a STABLE key, not a label: the label depends on the
 * language, and looking it up as `t[key]` keeps this module free of locale
 * plumbing. lib/structured-data.ts destructures these positionally and ignores
 * the key entirely, so it is unaffected.
 */
export function unitFacts(u: Unit): [UnitFactKey, string][] {
  return [
    ["size", u.spec.area],
    ["baths", u.spec.bath.replace(/\s*(?:bath(?:room)?s?|baños?)$/i, "")],
    ["sleeps", u.spec.sleeps.replace(/^sleeps\s*/i, "")],
  ];
}

/** Card highlights: the unit's chips, minus any that repeat the size or sleeps facts. */
export function unitHighlights(u: Unit): string[] {
  return u.chips.filter((c) => !/sleeps|m²/i.test(c));
}
