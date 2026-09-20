/*
  What is translatable, per document type.

  This table used to live in scripts/i18n/lib.mjs, which was the only thing that
  needed it. /admin editing in Spanish makes it the second: the editor has to
  know exactly which fields a translator may touch, and which are the same fact
  in every language and must stay locked. Two copies of that list would drift the
  first time someone added a field.

  Deliberately free of imports. The admin UI is a client component, and the
  fingerprinting that reads this table needs node:crypto — so that half lives in
  ./fingerprint.ts and this half stays safe to import from anywhere, browser
  bundle included.

  Imported by BOTH the Next app and `scripts/i18n/*.mjs`. Node strips the type
  annotations when a script imports it, so keep this file to erasable syntax
  only — no enums, no parameter properties, nothing that needs a compiler to
  emit real code. Same rule, and the same reason, as lib/locales.ts.

  What is deliberately NOT here: unit names, codes, slugs, prices, deposits, dates,
  panorama assets, icons and image assets. Those are the same fact in every
  language, and the moment a second copy exists one of them starts being wrong.
  The admin reads this table to decide what to grey out.

  `spec` is the one partial exception, and only `spec.beds`. Area, baths and
  sleeps are a number and a unit — "90 m²" reads the same in every language, and
  translating them is how a 2 becomes a 3. `beds` is prose: Booking states it as
  "1 king bed", which rendered on the Spanish page as "Cama: 1 king bed". So that
  single subfield translates and the rest of the object stays locked.
*/

/**
 * One document type's translatable surface.
 *
 *   scalars      plain string/text fields
 *   stringArrays arrays of bare strings
 *   blocks       Portable Text fields
 *   rows         [arrayField, [translatable keys]] — objects carrying a _key
 *   nested       [objectField, arrayField, [keys]] — rows one level down
 *   objects      [objectField, [keys]] — a plain object of strings
 *   imageAlt     { <storedAs>: <sourceField> } for a single image's alt text
 *   galleryAlt   an image ARRAY whose alts translate, matched by _key
 */
export interface TranslatableSpec {
  scalars?: string[];
  stringArrays?: string[];
  blocks?: string[];
  rows?: [string, string[]][];
  nested?: [string, string, string[]][];
  objects?: [string, string[]][];
  imageAlt?: Record<string, string>;
  galleryAlt?: string;
}

export const TYPES: Record<string, TranslatableSpec> = {
  unit: {
    scalars: ["tagline", "keywords", "saleNote"],
    stringArrays: ["chips"],
    blocks: ["about"],
    rows: [
      ["space", ["key", "title", "desc"]],
      ["tour", ["name"]],
      ["termsOverride", ["title", "desc"]],
    ],
    nested: [
      ["amenitiesOverride", "inside", ["label"]],
      ["amenitiesOverride", "building", ["label"]],
    ],
    // Only `beds` — see the note at the top of this file on why the rest of
    // `spec` must not be translated.
    objects: [["spec", ["beds"]]],
    imageAlt: { coverAlt: "coverImage" },
    galleryAlt: "gallery",
  },
  hero: {
    scalars: ["eyebrow", "headline", "sub"],
    // Values translate too: "Any length" is copy, and "4 min" survives the
    // instruction to leave numbers alone.
    rows: [["stats", ["value", "label"]]],
    imageAlt: { backgroundAlt: "background" },
  },
  location: {
    scalars: ["heading", "addressLine"],
    rows: [["distances", ["label", "value"]]],
  },
  siteSettings: {
    scalars: ["hostNote", "stayNote"],
    /*
      commonAreas is an image array, but its translatable surface is the same
      shape as any other row — a caption, an area name and the alt text, each
      carrying a _key. The photo itself is the same in every language, so only
      the words are listed here.
    */
    rows: [
      ["propertyAmenities", ["title", "desc"]],
      ["commonAreas", ["label", "title", "alt"]],
    ],
    objects: [["seo", ["title", "description"]]],
  },
  stayDefaults: {
    rows: [["houseRules", ["title", "desc"]]],
    nested: [
      ["amenities", "inside", ["label"]],
      ["amenities", "building", ["label"]],
    ],
  },
};
