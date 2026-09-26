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

/**
 * The short name a SENTENCE can carry — "302", not the full title.
 *
 * `name` does two jobs and cannot do both. As the <h1> and the <title> it wants
 * to be descriptive, which is what earns the search result: "Apartment 302 —
 * 48 m², top floor, balcony". Inside a sentence it wants to be a label, because
 * every one of these templates wraps it in an article:
 *
 *     See the {name}          Hold the {name} — free, nothing to pay
 *     Inside the {name}       The {name} is booked during these dates.
 *     Switch to the {name}    Ask about the {name} on WhatsApp
 *
 * They were written when `name` WAS the code — ui.ts still says «"See the 201" is
 * "Ver el 201"» — so making the name descriptive turned the landing page's CTA
 * into "See the Apartment 302 — 48 m², top floor, balcony", which wrapped onto
 * three lines and stopped looking like a button at all.
 *
 * Spanish is the reason this must stay short rather than be reworded per string:
 * those templates carry a gendered article ("el 302"), and a phrase beginning
 * with "Apartment" does not fit behind it either.
 *
 * Taken from `code` ("Unit 302"), which is where the number already lives. Falls
 * back to the whole code, then to the name, so a unit Henrik has not given a code
 * still reads as something rather than nothing.
 */
export function unitLabel(u: Unit): string {
  const code = (u.code ?? "").trim();
  return code.match(/\d{2,4}/)?.[0] || code || u.name;
}

/** One fact by key, or undefined when this unit has no value for it. */
export function unitFact(u: Unit, key: UnitFactKey): string | undefined {
  return unitFacts(u).find(([k]) => k === key)?.[1];
}

/**
 * Card highlights: the unit's chips, minus any that repeat the size or sleeps
 * facts, and minus blanks and duplicates.
 *
 * Blank and repeated chips are dropped for the same reason unitFacts drops an
 * empty fact — but here it is not only cosmetic. Both callers render these with
 * `key={chip}`, so two blanks are two children with the same key `""`, which
 * React refuses to guarantee the behaviour of.
 *
 * They are not hypothetical. A locale's `chips` array REPLACES the English
 * wholesale rather than merging, and the translation editor seeds it to the
 * English length with empty strings for the entries nobody has filled in — so
 * translating three of eleven chips and saving stored eight "" entries, and the
 * Spanish page rendered eight ticks with no text beside them.
 *
 * Fixed at the save as well (saveUnitTranslation drops blanks now). This stays
 * because it is the guard that makes every caller safe, including whatever reads
 * chips next, and because data already in the dataset predates that fix.
 */
export function unitHighlights(u: Unit): string[] {
  const seen = new Set<string>();
  return u.chips.filter((c) => {
    const chip = c?.trim();
    if (!chip || /sleeps|m²/i.test(chip) || seen.has(chip)) return false;
    seen.add(chip);
    return true;
  });
}
