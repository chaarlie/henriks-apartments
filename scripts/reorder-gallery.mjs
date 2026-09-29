/*
  Reorder one apartment's gallery.

  Reordering is safe to do as data: every array item keeps its `_key`, and
  translated alt text is matched to a photo by that key (never by position), so a
  photo carries its Spanish caption with it. Unit 201 has 14 filled Spanish
  captions, which is exactly why this reorders the existing items rather than
  rebuilding the array.

  The order below groups the apartment first and the building second, leading with
  the bedroom — it is a one-bedroom, the bed is the product, and it is the order
  the unit's own "The space" section already uses (Habitación, Sala, Cocina,
  Baño). The photos were grouped before but wrongly sequenced: living and dining
  interleaved, and the bedroom sat at 9-11, after the kitchen.

  Derived by looking at the photographs, NOT from the Booking listing: that page
  answers non-browser clients with a bot challenge (HTTP 202, ~4 KB, empty title,
  no room markup), so its actual order cannot be read from here.

      npm run units:reorder-gallery -- apartment-1
      npm run units:reorder-gallery -- apartment-1 --commit
*/
import { createHash } from "node:crypto";
import { sanity, die } from "./i18n/sanity.mjs";

/**
 * The gallery order each ORDERS entry below was written against.
 *
 * ORDERS maps CURRENT index → new position, which makes it a one-shot: run it
 * twice and the second run permutes the already-permuted gallery, scrambling it
 * into an order nobody chose. That is not hypothetical — a dry run of
 * apartment-4 after it had been applied still reported "29 of 31 photos change
 * position", and applying it would have destroyed the result.
 *
 * So each order is pinned to the arrangement it describes. If the gallery no
 * longer hashes to this, the order has either been applied already or the photos
 * have changed, and either way the indices no longer mean what they meant.
 */
const APPLIED = "already applied";
const EXPECTED = {
  "apartment-1": "25b43d7ce05c",
  "apartment-2": "319159203eb9",
  "apartment-3": "2c7379674d60",
  /*
    Applied on 2026-09-29, so its indices no longer describe the gallery.

    Marked rather than given a hash on purpose: the first attempt at this guard
    recorded apartment-4's hash AFTER the write, which made the fingerprint match
    and let the very re-run it exists to prevent go through. A state is safer than
    a hash nobody can re-derive.
  */
  "apartment-4": APPLIED,
};

const fingerprint = (refs) => createHash("sha256").update(refs.join(",")).digest("hex").slice(0, 12);

/*
  Current index → new position, per apartment. Comments say what each photo shows.

  Shape is the same everywhere: the apartment as you would walk it, bedroom
  first — it is a one-bedroom, the bed is the product, and it is the order the
  units' own "The space" section uses — then the building, then the aerials last.

  Roughly half of every gallery is building rather than apartment, and the same
  shared photos recur across units: 11 of 101's, 14 of 301's and 13 of 302's are
  the very assets 201 carries. Worth deciding separately whether they belong on a
  unit page at all, given the landing page has a shared-areas band of its own.
*/
const ORDERS = {
  // Unit 201 — 90 m², second floor.
  "apartment-4": [
    10, 9, 11, // bedroom: bed + balcony, bed + TV, bed + barn door
    2, 1, 3, // living room
    0, 4, 5, // dining
    6, 7, // kitchen and breakfast bar
    8, // hallway through to the dining room
    13, 12, 15, 14, // two bathrooms, walk-in shower, powder room
    22, 24, 23, // pool
    18, 21, 19, 20, // lobby, planted corridors
    16, 17, // street frontage, covered parking
    25, // bar
    26, 28, 27, // gym
    30, 29, // aerials
  ],

  // Unit 101 — 90 m², ground floor, patio. The red accent wall is this one.
  "apartment-1": [
    5, 7, 6, // bedroom: red wall + doors to the pool, bed + TV, bed + barn door
    0, 1, 2, 3, // living room, widening to the dining end
    4, // kitchen
    10, 9, 8, 11, // vanity, second vanity, walk-in shower, WC
    15, 12, 13, 20, // pool — 20 is the deck this apartment opens onto
    23, 22, 24, 30, // poolside terrace and bar
    21, // lobby
    17, 14, 16, // planted corridors
    18, 19, // frontage, covered parking
    25, 27, 26, // gym
    28, 29, // aerials
  ],

  // Unit 301 — 90 m², top floor. Blue furniture throughout.
  "apartment-2": [
    11, 12, // bedroom: bed + balcony, bed + barn door
    0, 2, 1, 3, // living room
    4, // dining
    5, 6, 7, // kitchen
    8, 9, // hallway
    16, 15, 13, 14, 17, 10, // vanities, dressing, two showers, WC
    25, 21, 22, // pool
    18, // lobby
    24, 23, 26, // planted corridors
    19, 20, // frontage, covered parking
    27, // bar
    28, 29, // gym
    30, 31, // aerials
  ],

  /*
    Unit 302 — 48 m², top floor. The balcony leads, because it is the only one of
    the four that has one and the tagline sells it: "The only one with a balcony
    and terrace". Only six of its twenty photos are the apartment itself.
  */
  "apartment-3": [
    3, // balcony over the pool
    2, 0, // kitchen with the dining table, kitchen
    1, 18, 17, // bathroom, vanity, shower
    9, 4, 5, // pool
    12, // lobby
    6, 7, 8, // planted corridors
    11, 10, // frontage, covered parking
    13, // bar
    14, 16, // gym
    15, 19, // aerials
  ],
};

const SLUG = process.argv.find((a) => ORDERS[a]);
if (!SLUG) die("Name an apartment.", `One of: ${Object.keys(ORDERS).join(", ")}`);
const ORDER = ORDERS[SLUG];

const commit = process.argv.includes("--commit");
const client = sanity({ write: commit });

const unit = await client.fetch(
  `*[_type == "unit" && slug.current == $slug][0]{_id, code, gallery}`,
  { slug: SLUG },
);
if (!unit?._id) die(`No apartment with slug "${SLUG}".`);

const gallery = unit.gallery ?? [];

/*
  Refuse unless the order is a genuine permutation of what is there.

  A duplicated or missing index would silently drop photos or repeat one, and the
  result looks plausible enough in a grid that nobody would notice which of 31
  went missing.
*/
if (ORDER.length !== gallery.length) {
  die(
    `The order lists ${ORDER.length} photos and the gallery has ${gallery.length}.`,
    "Someone added or removed photos since this was written — re-check it against the gallery.",
  );
}
if (EXPECTED[SLUG] === APPLIED) {
  die(
    `${unit.code}'s order has already been applied.`,
    "Re-running would permute an already-permuted gallery. Re-derive the order against the gallery as it stands.",
  );
}
const actual = fingerprint(gallery.map((p) => p.asset?._ref ?? ""));
if (actual !== EXPECTED[SLUG]) {
  die(
    `${unit.code}'s gallery is not the arrangement this order was written for.`,
    `Expected ${EXPECTED[SLUG]}, found ${actual} — already applied, or the photos changed. Re-derive the order against the gallery as it stands.`,
  );
}

const seen = new Set(ORDER);
if (seen.size !== ORDER.length) die("The order repeats an index.");
const missing = gallery.map((_, i) => i).filter((i) => !seen.has(i));
if (missing.length) die(`The order never mentions ${missing.join(", ")}.`);

const next = ORDER.map((i) => gallery[i]);

console.log(`\n${commit ? "Writing" : "Dry run — would write"}: ${unit.code}\n`);
next.forEach((p, i) => {
  const from = ORDER[i];
  console.log(`  ${String(i).padStart(2)} ← was ${String(from).padStart(2)}  ${p.asset?._ref?.slice(6, 18) ?? "?"}`);
});
const moved = ORDER.filter((from, i) => from !== i).length;
console.log(`\n  ${moved} of ${gallery.length} photos change position.`);
console.log("  Every _key is carried over, so translated captions follow their photo.\n");

if (!commit) {
  console.log("Nothing was written. Re-run with --commit to apply.\n");
  process.exit(0);
}

await client.patch(unit._id).set({ gallery: next }).commit();
console.log("Done — the apartment page shows them in this order within the minute.\n");
