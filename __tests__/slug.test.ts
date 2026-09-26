/**
 * Page addresses, and the bookkeeping that lets one change safely.
 *
 * The reason this file exists: the last apartment rename shipped without any of
 * it, and /apartments/one-bed, /studio, /two-bed and /loft have returned 404
 * ever since. A slug is the one field where a routine copy edit can silently
 * destroy a link someone already shared, so the invariants are pinned here
 * rather than left to the shape of saveUnit.
 */
import { formerSlugs, toSlug } from "@/lib/slug";

describe("toSlug", () => {
  it("survives being a URL", () => {
    expect(toSlug("Apartment 302 — top floor, balcony")).toBe(
      "apartment-302-top-floor-balcony",
    );
    // Accents are stripped rather than escaped: "Sosúa" must not become "sos%C3%BAa".
    expect(toSlug("Sosúa Studios")).toBe("sosua-studios");
  });

  it("collapses Booking.com's punctuation instead of leaving it in the path", () => {
    // The name four units actually carried on the live site.
    expect(toSlug("Rizz Suites/3rdfloor/Rainfall shower/Pool&GYM24/7")).toBe(
      "rizz-suites-3rdfloor-rainfall-shower-pool-gym24-7",
    );
  });

  it("never ends on a hyphen, including when the 64-char cut lands on one", () => {
    const cut = toSlug(`${"a".repeat(63)} tail`);
    expect(cut).toHaveLength(63);
    expect(cut.endsWith("-")).toBe(false);
  });
});

describe("formerSlugs", () => {
  it("records the address being left behind", () => {
    expect(formerSlugs("apartment-3", [], "apartment-302-top-floor")).toEqual(["apartment-3"]);
  });

  it("keeps every earlier address, oldest first", () => {
    expect(formerSlugs("one-bed", ["loft"], "apartment-3")).toEqual(["loft", "one-bed"]);
  });

  it("does not list the new address as its own former address", () => {
    // a → b → a. Without this, /a redirects to /a forever.
    expect(formerSlugs("b", ["a"], "a")).toEqual(["b"]);
  });

  it("does not grow when the address has not changed", () => {
    expect(formerSlugs("apartment-3", ["one-bed"], "apartment-3")).toEqual(["one-bed"]);
    // And saving twice more is still stable.
    expect(formerSlugs("apartment-3", ["one-bed", "one-bed"], "apartment-3")).toEqual(["one-bed"]);
  });

  it("copes with a unit that has no slug or no list yet", () => {
    expect(formerSlugs(null, null, "apartment-101")).toEqual([]);
    expect(formerSlugs(undefined, undefined, "apartment-101")).toEqual([]);
  });
});
