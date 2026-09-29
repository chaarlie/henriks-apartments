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

      npm run units:reorder-gallery
      npm run units:reorder-gallery -- --commit
*/
import { sanity, die } from "./i18n/sanity.mjs";

const SLUG = "apartment-4";

/** Current index → new position, as groups. Comments are what each photo shows. */
const ORDER = [
  // The apartment, as you would walk it — bedroom first.
  10, 9, 11, // bedroom: bed + balcony, bed + TV, bed + barn door
  2, 1, 3, // living room
  0, 4, 5, // dining
  6, 7, // kitchen and breakfast bar
  8, // hallway through to the dining room
  13, 12, 15, 14, // two bathrooms, the walk-in shower, the powder room
  // The building.
  22, 24, 23, // pool
  18, 21, 19, 20, // lobby, planted corridors
  16, 17, // street frontage, covered parking
  25, // bar
  26, 28, 27, // gym
  30, 29, // aerials last: the setting, once the apartment has been seen
];

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
