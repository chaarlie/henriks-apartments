/*
  Rewrite the four apartments' name, tagline, about[], chips and one wrong spec.

  Why this exists — every item is a defect that is live right now:

  1. DUPLICATE TITLE. 301 and 302 both carry the name
     "Rizz Suites/3rdfloor/Rainfall shower/Pool&GYM24/7", so /apartments/apartment-2
     and /apartments/apartment-3 ship byte-identical <title>s. Google picks one and
     suppresses the other. The name is also the <h1>, so one string is doing both
     jobs badly.
  2. DUPLICATE DESCRIPTION. The English about[0] is Booking.com's own boilerplate
     ("Experience Sosúa from this spacious 90 m² luxury 1BR…"), near-identical on
     all four pages and word-for-word from the listing this site exists to
     undercut. about[0] becomes the meta description (see the apartment page).
  3. REPEATED BOILERPLATE. Paragraphs 4-9 are identical on all four units —
     property-level pitch duplicated across four pages.
  4. WRONG BATH COUNT. 302's spec says "1.5 bath"; the listing says 1, and 302's
     own prose says "1BA". Commit f8c2fa7 fixed the other three and missed it.
  5. IDENTICAL TAGLINES. All four are "El Batey - LAP swimming Pool - Gym 24/7 -
     waterfall shower". The tagline is the description fallback and the card
     subtitle, so four units read as one.
  6. KEYWORD-STUFFED CHIPS. "rizz suites", "sosua", "lap pool" AND "lap-pool" AND
     "pool" render as fact pills on the page.

  What this deliberately does NOT assert, because the site contradicts itself and
  only Henrik can settle it (see docs/booking-listing.md):

  - THE ELEVATOR. stayDefaults says "No elevator — walk-up"; every unit's chips say
    "elevator"; Henrik's prose says "stairs … or elevator, you choose". All three
    are live. The new copy mentions no lift and no walk-up, and "elevator" is
    dropped from the chips rather than repeated.
  - Fridge, induction hob and the 200 Mbps figure. None are on the listing. They
    live in shared content, not here, so this script leaves them alone — but they
    need confirming.

  The gym IS kept in the prose on purpose: it appears nowhere in the shared
  amenities, so per-unit copy is currently its only mention on the whole site.

  Dry run by default:

      npm run units:rewrite-copy
      npm run units:rewrite-copy -- --commit
*/
import { randomUUID } from "node:crypto";
import { sanity, die } from "./i18n/sanity.mjs";

const key = () => randomUUID().replace(/-/g, "").slice(0, 12);

/** Paragraphs → Portable Text, matching textToBlocks() in lib/admin/actions.ts. */
const blocks = (paras) =>
  paras.map((text) => ({
    _type: "block",
    _key: key(),
    style: "normal",
    markDefs: [],
    children: [{ _type: "span", _key: key(), text, marks: [] }],
  }));

/*
  Keyed by document id, which is the only stable handle — the ids still spell the
  fictional lineup they were created with ("unit-studio" is the 90 m² Unit 301),
  and `code` on each document confirms the pairing independently.

  Names carry the unit number and the one fact that separates it from the others.
  Each stays under ~44 characters so that `${name} · Sosúa studios` lands inside
  the ~60 Google will show.
*/
const COPY = {
  // Unit 101 — 90 m², 2 baths, ground floor, patio, wheelchair accessible.
  "unit-two-bed": {
    name: "Apartment 101 — 90 m², ground floor, patio",
    tagline: "Ground floor, step-free, with a private patio",
    chips: ["Ground floor", "Step-free access", "Private patio", "Pool view", "Two bathrooms", "Soundproofed"],
    about: [
      "Ninety square metres on the ground floor, with its own patio facing the pool. No stairs at any point, and step-free throughout.",
      "One bedroom with a king bed, a separate living and dining area, two full bathrooms with walk-in showers, and a private kitchen with a stovetop, microwave, kettle and coffee maker.",
      "Floor-to-ceiling one-way glass keeps the light without the audience. Air conditioning, soundproofed walls, a safe, and a flat-screen TV with streaming. The pool, the 24/7 gym and parking are a few steps from the door.",
    ],
  },
  // Unit 201 — 90 m², 2 baths, second floor, no outdoor space.
  "unit-loft": {
    name: "Apartment 201 — 90 m², second floor",
    tagline: "Second floor, pool in view from both rooms",
    chips: ["Second floor", "Pool view", "Two bathrooms", "Soundproofed", "One-way glass"],
    about: [
      "Ninety square metres on the second floor, with the pool in view from both the living room and the bedroom.",
      "One bedroom with a king bed, a separate living and dining area, and two full bathrooms with walk-in showers. The kitchen is private — stovetop, microwave, kettle and coffee maker.",
      "Soundproofed walls and air conditioning throughout, a safe, and a flat-screen TV with streaming. The 24/7 gym and parking are in the building, and Playa Sosúa is a four-minute walk.",
    ],
  },
  // Unit 301 — 90 m², 2 baths, top floor, no outdoor space.
  "unit-studio": {
    name: "Apartment 301 — 90 m², top floor",
    tagline: "Top floor, nobody overhead, pool views",
    chips: ["Top floor", "Pool view", "Two bathrooms", "Soundproofed", "Floor-to-ceiling windows"],
    about: [
      "Ninety square metres on the top floor — the same layout as 101 and 201, with nobody overhead and the pool in view from both rooms.",
      "A separate bedroom with a king bed, a living and dining area, and two full bathrooms with walk-in showers. The private kitchen has a stovetop, microwave, kettle and coffee maker.",
      "Air conditioning, soundproofing, a safe, and a flat-screen TV with streaming. Parking, gated security and the 24/7 gym are part of the building, and the beach is four minutes on foot.",
    ],
  },
  // Unit 302 — 48 m², 1 bath, top floor, balcony + terrace. The odd one out.
  "unit-one-bed": {
    name: "Apartment 302 — 48 m², top floor, balcony",
    tagline: "The only one with a balcony and terrace",
    chips: ["Top floor", "Balcony & terrace", "Pool view", "Soundproofed"],
    about: [
      "Forty-eight square metres on the top floor, and the only one of the four with a balcony and a terrace — both looking over the pool.",
      "A separate bedroom with a king bed, a living and dining area, and one full bathroom with a walk-in shower. The kitchen is private, with a stovetop, microwave, kettle and coffee maker.",
      "Outdoor furniture on the terrace, air conditioning and soundproofing inside, plus a safe and a flat-screen TV with streaming. The smallest of the four, and the only one with outdoor space of its own upstairs.",
    ],
    // The listing says one bathroom, and this unit's own prose said "1BA".
    spec: { bath: "1 bath" },
  },
};

const commit = process.argv.includes("--commit");
const client = sanity({ write: commit });

const units = await client.fetch(
  `*[_type == "unit"]{_id, code, name, tagline, spec, "slug": slug.current}`,
);
if (!units.length) die("No apartments found.", "Check the token in .env.local.");

const planned = [];
for (const [id, copy] of Object.entries(COPY)) {
  const unit = units.find((u) => u._id === id);
  if (!unit) die(`${id} not found.`, "The document ids are the only stable handle — re-check them.");
  planned.push({ id, unit, copy });
}

// Two units sharing a title is the defect being fixed; ship it again and nothing
// has changed. Cheap to assert, and it covers a typo in the table above.
const titles = planned.map((p) => p.copy.name);
if (new Set(titles).size !== titles.length) die("Two apartments would still share a name.");
const long = planned.filter((p) => `${p.copy.name} · Sosúa studios`.length > 60);

console.log(`\n${commit ? "Writing" : "Dry run — would write"}:\n`);
for (const { id, unit, copy } of planned) {
  const title = `${copy.name} · Sosúa studios`;
  console.log(`  ${id}  (${unit.code}, /apartments/${unit.slug})`);
  console.log(`    name     ${unit.name}`);
  console.log(`          →  ${copy.name}`);
  console.log(`    title    ${title}  [${title.length} chars]`);
  console.log(`    tagline  → ${copy.tagline}`);
  console.log(`    about    ${unit.code ? "" : ""}9 paragraphs → ${copy.about.length}`);
  console.log(`    desc     ${copy.about[0].length} chars`);
  console.log(`    chips    → ${copy.chips.length} (was keyword-stuffed)`);
  if (copy.spec) console.log(`    spec     bath "${unit.spec?.bath}" → "${copy.spec.bath}"`);
  console.log("");
}
if (long.length) {
  console.log("Titles over 60 characters (will truncate in results):");
  for (const p of long) console.log(`  ${p.copy.name}`);
  console.log("");
}

if (!commit) {
  console.log("Nothing was written. Re-run with --commit to apply.\n");
  process.exit(0);
}

/*
  One transaction. A half-applied rewrite would leave two units sharing a title,
  which is the exact condition being fixed — better to fail whole.

  `spec` is merged rather than replaced: it also holds area, beds and sleeps, and
  a bare set would drop them.
*/
const tx = planned.reduce(
  (t, { id, unit, copy }) =>
    t.patch(id, (patch) =>
      patch.set({
        name: copy.name,
        tagline: copy.tagline,
        chips: copy.chips,
        about: blocks(copy.about),
        ...(copy.spec ? { spec: { ...(unit.spec ?? {}), ...copy.spec } } : {}),
      }),
    ),
  client.transaction(),
);
await tx.commit();

console.log(`Done — ${planned.length} apartments rewritten.`);
console.log("Next: npm run i18n:extract, so the Spanish is re-checked against the new English.\n");
