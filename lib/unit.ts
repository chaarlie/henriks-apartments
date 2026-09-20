import type { Unit } from "@/lib/content";

/** The three facts, in display order. */
export type UnitFactKey = "size" | "baths" | "sleeps";

/**
 * Size / baths / sleeps as key–value pairs ("1.5 baths" → "1.5", "Sleeps 2" → "2").
 *
 * The first element is a STABLE key, not a label: the label depends on the
 * language, and looking it up as `t[key]` keeps this module free of locale
 * plumbing.
 *
 * A fact with no value is DROPPED rather than rendered blank — an apartment
 * whose size was never filled in should show two facts, not "Size:" trailing
 * off into nothing.
 *
 * That makes positions unstable, so read a single fact with `unitFact()` and
 * never by destructuring. lib/structured-data.ts used to take these
 * positionally, which would have mislabelled a unit's occupancy as its bathroom
 * count the moment any earlier fact went missing.
 */
export function unitFacts(u: Unit): [UnitFactKey, string][] {
  /*
    `u.spec?.` even though the type says it is always there.

    That type is a promise about Sanity data, and Sanity breaks it: `spec` is an
    object field with no required subfields, so an apartment saved before it was
    filled in comes back null. mapSpec() now fixes that at the boundary, but
    this is the function that crashed a live page, and one `?.` is cheaper than
    trusting every future caller to have gone through that boundary.
  */
  const rows: [UnitFactKey, string][] = [
    ["size", u.spec?.area ?? ""],
    ["baths", (u.spec?.bath ?? "").replace(/\s*(?:bath(?:room)?s?|baños?)$/i, "")],
    ["sleeps", (u.spec?.sleeps ?? "").replace(/^sleeps\s*/i, "")],
  ];
  return rows.filter(([, value]) => value.trim() !== "");
}

/** One fact by key, or undefined when this unit has no value for it. */
export function unitFact(u: Unit, key: UnitFactKey): string | undefined {
  return unitFacts(u).find(([k]) => k === key)?.[1];
}

/** Card highlights: the unit's chips, minus any that repeat the size or sleeps facts. */
export function unitHighlights(u: Unit): string[] {
  return u.chips.filter((c) => !/sleeps|m²/i.test(c));
}
