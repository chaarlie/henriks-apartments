/**
 * The facts shown on an apartment — and the JSON-LD Google reads from them.
 *
 * These two modules are joined at the hip, and every case below is a bug that
 * actually shipped:
 *
 *   - `unitFacts` used to read `u.spec.area` straight. Sanity returns `spec` as
 *     null for an apartment saved before it was filled in, so one such unit
 *     crashed its own page AND the landing page listing it.
 *   - `unitJsonLd` used to DESTRUCTURE those facts positionally. Once blank
 *     facts are dropped, a unit with no size shifts `baths` into the size slot —
 *     publishing a bathroom count to Google as floor area. It reads by key now,
 *     which is what `unitFact` exists for.
 *
 * Neither failure is visible in the UI until it is far too late, which is
 * exactly why they are pinned here.
 */
import { unitFacts, unitFact, unitHighlights } from "@/lib/unit";
import { unitJsonLd } from "@/lib/structured-data";
import type { SiteContent, Unit } from "@/lib/content";

/** A unit carrying only what these functions read. */
const unit = (over: Partial<Unit> = {}): Unit =>
  ({
    slug: "apartment-1",
    name: "101",
    spec: { area: "90 m²", bath: "2 baths", sleeps: "Sleeps 2", beds: "1 king bed" },
    chips: [],
    about: [],
    gallery: [],
    image: { url: "", alt: "" },
    amenities: { inside: [], building: [] },
    priceUsd: 1000,
    availableFrom: "2027-01-01",
    ...over,
  }) as unknown as Unit;

const site = () =>
  ({
    property: { name: "Henrik Sosúa", city: "Sosúa", region: "Puerto Plata", addressLine: "" },
    location: { addressLine: "Calle Dr. Rosen" },
    stay: { checkIn: "3:00 PM", checkOut: "12:00 PM" },
    units: [],
  }) as unknown as SiteContent;

describe("the facts under an apartment's name", () => {
  it("strips the unit off the value so the label can supply it", () => {
    // "2 baths" is stored, but the page renders "Baths: 2" — the word would be
    // doubled otherwise, and it has to be the LABEL that translates.
    expect(unitFacts(unit())).toEqual([
      ["size", "90 m²"],
      ["baths", "2"],
      ["sleeps", "2"],
    ]);
  });

  it("handles the Spanish spelling of the stored value too", () => {
    expect(unitFact(unit({ spec: { bath: "2 baños" } } as Partial<Unit>), "baths")).toBe("2");
  });

  it("drops a fact the apartment has no value for", () => {
    const facts = unitFacts(unit({ spec: { area: "", bath: "2 baths", sleeps: "Sleeps 2" } } as Partial<Unit>));

    // Two facts, not three with a blank one. The page would otherwise render
    // "Size:" trailing into nothing.
    expect(facts).toEqual([
      ["baths", "2"],
      ["sleeps", "2"],
    ]);
  });

  it("survives an apartment with no spec at all", () => {
    // The crash: Sanity returns spec as null when it was never filled in.
    const broken = unit({ spec: undefined } as Partial<Unit>);

    expect(() => unitFacts(broken)).not.toThrow();
    expect(unitFacts(broken)).toEqual([]);
    expect(unitFact(broken, "size")).toBeUndefined();
  });

  it("looks a fact up by name, because positions move", () => {
    const noSize = unit({ spec: { area: "", bath: "2 baths", sleeps: "Sleeps 4" } } as Partial<Unit>);

    // The trap: facts[0] is now BATHS. Reading by key is the only safe way.
    expect(unitFacts(noSize)[0]).toEqual(["baths", "2"]);
    expect(unitFact(noSize, "size")).toBeUndefined();
    expect(unitFact(noSize, "baths")).toBe("2");
    expect(unitFact(noSize, "sleeps")).toBe("4");
  });

  it("keeps card highlights free of facts already shown", () => {
    const u = unit({ chips: ["90 m²", "Sleeps 2", "Ground floor", "Patio"] });
    // Size and occupancy already have their own cells; repeating them as chips
    // is noise.
    expect(unitHighlights(u)).toEqual(["Ground floor", "Patio"]);
  });

  /*
    This shipped. A locale's chips replace the English wholesale, and the
    translation editor seeds the array to the English length with "" for every
    chip nobody filled in — so one unit's Spanish chips were
    ["Balcón y terraza","Último piso","Vista a la piscina","","","","","","","",""].
    The Spanish homepage rendered eight ticks with no text, and because both
    callers use `key={chip}`, React had eight children keyed "" and warned that it
    may duplicate or omit them.
  */
  it("drops blank chips, so a half-translated list cannot render empty rows", () => {
    const u = unit({ chips: ["Balcón y terraza", "", "  ", "Vista a la piscina", ""] });
    expect(unitHighlights(u)).toEqual(["Balcón y terraza", "Vista a la piscina"]);
  });

  it("drops duplicate chips, because the render keys on the chip itself", () => {
    const u = unit({ chips: ["Pool view", "Pool view", " Pool view ", "Top floor"] });
    const out = unitHighlights(u);
    expect(out).toEqual(["Pool view", "Top floor"]);
    expect(new Set(out).size).toBe(out.length);
  });
});

describe("what Google is told about the apartment", () => {
  const apartmentNode = (u: Unit) =>
    unitJsonLd(site(), u)["@graph"].find((n) => n["@type"] === "Apartment") as Record<
      string,
      unknown
    >;

  it("publishes size, bathrooms and occupancy as numbers", () => {
    const node = apartmentNode(unit());

    expect(node.floorSize).toEqual({
      "@type": "QuantitativeValue",
      value: 90,
      unitCode: "MTK",
    });
    expect(node.numberOfBathroomsTotal).toBe(2);
    expect(node.occupancy).toEqual({ "@type": "QuantitativeValue", maxValue: 2 });
  });

  it("does NOT publish the bathroom count as floor area when size is missing", () => {
    // The regression this guards: with facts dropped, a positional read put
    // "2" (baths) into floorSize and told Google the apartment was 2 m².
    const node = apartmentNode(
      unit({ spec: { area: "", bath: "2 baths", sleeps: "Sleeps 4" } } as Partial<Unit>),
    );

    expect(node.floorSize).toBeUndefined();
    expect(node.numberOfBathroomsTotal).toBe(2);
    expect(node.occupancy).toEqual({ "@type": "QuantitativeValue", maxValue: 4 });
  });

  it("omits a fractional bathroom count rather than rounding it", () => {
    // schema.org wants an integer; 1.5 baths is better left unsaid than
    // reported as 1 or 2.
    const node = apartmentNode(unit({ spec: { area: "90 m²", bath: "1.5 baths", sleeps: "Sleeps 2" } } as Partial<Unit>));

    expect(node.numberOfBathroomsTotal).toBeUndefined();
    expect(node.floorSize).toMatchObject({ value: 90 });
  });

  it("emits nothing at all for an apartment with no spec", () => {
    const node = apartmentNode(unit({ spec: undefined } as Partial<Unit>));

    // Absent, never null or zero — JSON.stringify drops undefined, so these
    // properties simply do not appear in the published markup.
    expect(node.floorSize).toBeUndefined();
    expect(node.numberOfBathroomsTotal).toBeUndefined();
    expect(node.occupancy).toBeUndefined();
  });
});
