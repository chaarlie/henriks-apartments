/*
  Put the 24/7 gym on the homepage.

  It was the property's least visible real advantage: the gym appeared in NO
  shared amenity list, only inside each apartment's own prose, so the homepage —
  the page that has to win the click — never mentioned it. Meanwhile the Booking
  listing leads with it, right there in the URL
  ("sosua-king-size-bed-pool-24-7-gym-waterfall-shower").

  It lands as an ordinary `propertyAmenities` tile, which means Henrik edits it in
  /admin → Amenities like any other, icon included. Amenities.tsx promotes it to a
  feature card by KEYWORD ("gym" / "gimnasio"), not by position, so reordering the
  tiles there cannot silently demote it.

  APPENDED, never inserted. Translated tiles pair with English ones POSITIONALLY —
  index i of the Spanish array is index i of the English (see AmenitiesView) — so
  inserting mid-array would shift every Spanish tile after it onto the wrong
  English tile, silently. Appending to both arrays at the same index is the only
  safe edit, and it is why this writes the Spanish in the same transaction rather
  than leaving it to the translation pipeline: a lone English append would leave
  the arrays different lengths, which is the same misalignment one save later.

  Idempotent.

      npm run units:add-gym
      npm run units:add-gym -- --commit
*/
import { randomUUID } from "node:crypto";
import { sanity, die } from "./i18n/sanity.mjs";

const key = () => randomUUID().replace(/-/g, "").slice(0, 12);

// Matches ICON.gym in lib/content.ts and "Gym" in the /admin icon picker.
const GYM_ICON = "M4 9v6M8 7v10M16 7v10M20 9v6M8 12h8";

const EN = {
  title: "24/7 gym",
  desc: "A gym in the building, open at any hour — no membership, no bus ride.",
};
const ES = {
  title: "Gimnasio 24/7",
  desc: "Un gimnasio en el edificio, abierto a cualquier hora — sin membresía y sin viaje.",
};

const isGym = (a) => /gym|gimnasio/i.test(`${a?.title ?? ""} ${a?.desc ?? ""}`);

const commit = process.argv.includes("--commit");
const client = sanity({ write: commit });

const doc = await client.fetch(`*[_type == "siteSettings"][0]{_id,
  "en": propertyAmenities[]{_key, icon, title},
  "es": i18n[_key == "es"][0].propertyAmenities[]{_key, title}
}`);
if (!doc?._id) die("No siteSettings document found.", "Check the token in .env.local.");

const en = doc.en ?? [];
const es = doc.es ?? [];

/*
  Decided per language, not once for both.

  The first run of this script appended ONLY the Spanish, because a Sanity patch
  holds a single `insert` operation and calling .append() twice on one patch
  replaces the first spec instead of adding to it. That left 9 Spanish tiles
  against 8 English ones — exactly the misalignment the length check below exists
  to prevent — so each language is now appended by its own patch inside one
  transaction, and each is skipped independently if it already has the tile.
*/
const needEn = !en.some(isGym);
const needEs = es.length > 0 && !es.some(isGym);

/*
  Compare the arrays IGNORING the gym, so a half-applied run self-heals instead
  of being refused. Anything else out of step means the pairing was already
  broken before this script ran, and appending would bake that in.
*/
const base = (rows) => rows.filter((a) => !isGym(a)).length;
if (es.length && base(en) !== base(es)) {
  die(
    `English has ${base(en)} non-gym tiles and Spanish has ${base(es)}.`,
    "They pair by position, so fix that in /admin → Amenities before appending.",
  );
}

if (!needEn && !needEs) {
  console.log("\nNothing to do — the gym tile is in every language.\n");
  process.exit(0);
}

console.log(`\n${commit ? "Writing" : "Dry run — would write"}:\n`);
if (needEn) console.log(`  en[${en.length}]  "${EN.title}" — ${EN.desc}`);
else console.log("  en       already has it");
if (needEs) console.log(`  es[${es.length}]  "${ES.title}" — ${ES.desc}`);
else if (es.length) console.log("  es       already has it");
else console.log("  es       no Spanish tiles yet; English will show until translated");
console.log(`\n  icon: dumbbell (${GYM_ICON})\n`);

if (!commit) {
  console.log("Nothing was written. Re-run with --commit to apply.\n");
  process.exit(0);
}

// One patch per array — see the note above on Sanity's single `insert` slot.
let tx = client.transaction();
if (needEn) {
  tx = tx.patch(doc._id, (p) =>
    p.append("propertyAmenities", [{ _key: key(), icon: GYM_ICON, ...EN }]),
  );
}
if (needEs) {
  tx = tx.patch(doc._id, (p) =>
    p.append(`i18n[_key=="es"].propertyAmenities`, [{ _key: key(), ...ES }]),
  );
}
await tx.commit();

console.log("Done — the gym is on the homepage, and editable in /admin → Amenities.");
console.log("Next: npm run i18n:extract, so the new pair is reviewed.\n");
