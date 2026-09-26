import type { SiteContent, Unit } from "@/lib/content";

/**
 * A believable `SiteContent` for component tests.
 *
 * The real one is large and comes from Sanity; rebuilding all of it in every
 * test would bury the two or three fields a test actually cares about. So this
 * fills in sensible defaults and each test overrides only what it is about —
 * the availability ranges, a price, a discount.
 *
 * The cast is deliberate and contained here: widening the fixture to satisfy
 * every field of `SiteContent` would make the file longer than the component
 * under test and no more truthful.
 */

export function makeUnit(over: Partial<Unit> = {}): Unit {
  const name = over.name ?? "101";
  return {
    _id: "unit-101",
    _type: "unit",
    slug: "apartment-1",
    /*
      Derived from `name`, because production keeps the two in step — "Apartment
      302 — 48 m², top floor, balcony" alongside code "Unit 302" — and
      unitLabel() reads the number off `code` to put inside a sentence.

      A flat "Unit 101" here meant a test overriding only `name: "102"` got two
      apartments that both labelled as "101", so "Switch to the 102" never
      appeared and the failure looked like a bug in the component.
    */
    code: `Unit ${name}`,
    name,
    tagline: "El Batey · ground floor & patio",
    priceUsd: 1000,
    priceNightlyUsd: 100,
    availableFrom: "2020-01-01",
    spec: { area: "90 m²", bath: "2 baths", sleeps: "Sleeps 2", beds: "1 king bed" },
    chips: [],
    keywords: "",
    image: { url: "/cover.jpg", alt: "", width: 1600, height: 1067 },
    about: [],
    space: [],
    amenities: { inside: [], building: [] },
    terms: [],
    gallery: [],
    tour: [],
    deposits: [],
    ...over,
  } as unknown as Unit;
}

export function makeContent(over: Partial<SiteContent> = {}): SiteContent {
  return {
    property: {
      name: "Henrik Sosúa",
      addressLine: "Calle Dr. Rosen",
      city: "Sosúa",
      region: "Puerto Plata, DR",
      whatsappNumber: "18095550142",
      whatsappMessage: "Hi Henrik",
      email: "stay@example.com",
    },
    commonAreas: [],
    hero: { eyebrow: "", headline: "", sub: "", videoId: "", stats: [], background: { url: "", alt: "", width: 0, height: 0 } },
    host: { languages: [], ownerSince: "2026", replyTime: "< 1 h", note: "" },
    stay: { checkIn: "3:00 PM", checkOut: "12:00 PM", note: "" },
    fxRate: 60,
    fxRateAsOf: "",
    seo: { title: "", description: "" },
    units: [makeUnit()],
    amenities: [],
    power: { baseUsd: 50 },
    discounts: [],
    availability: { closures: [], byUnit: {} },
    location: { heading: "", addressLine: "", distances: [] },
    ...over,
  } as unknown as SiteContent;
}

/** A day safely in the future, so a fixture never rots into "the past". */
export const futureTs = (offsetDays: number) => {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};
