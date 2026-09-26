/*
  The building has a working elevator. Henrik confirmed it on 2026-09-25.

  Until now the site said the opposite in NINE places, which is the whole story of
  this script. The shared amenity list is not enough on its own:

    stayDefaults.amenities.building                      "No elevator — walk-up"
    stayDefaults.i18n[es].amenities.building             "Sin ascensor — …"
    every unit's amenitiesOverride.building              "No elevator — walk-up"   ×4
    3 units' i18n[es].amenitiesOverride.building         "Sin ascensor — …"         ×3

  ALL FOUR units define `amenitiesOverride`, so the unit pages never read the
  shared list at all (see `hasOwnAmenities` in sanity/lib/queries.ts — the coalesce
  picks the override whenever it is defined). Fixing stayDefaults alone changes
  nothing a guest sees, which is exactly what happened on the first attempt: the
  write succeeded and the rendered page still said "No elevator — walk-up".

  The Spanish is corrected in the same pass rather than left to the translation
  pipeline. Authoring Spanish by hand normally fights that pipeline (see
  CLAUDE.md), but a live false accessibility claim is worse than a stale hash, and
  i18n:extract afterwards flags every touched row for review. The three Spanish
  labels were also inconsistent with each other — "se sube por escalera",
  "se sube a pie" and "se sube por escaleras" — so there is nothing worth keeping.

  It matters more than one checkbox suggests: a lift is the difference between
  "top floor, 90 m²" reading as a feature and reading as a problem, to exactly the
  long-stay guests who ask before booking.

  Idempotent — re-running sets the same values.

      npm run units:fix-elevator
      npm run units:fix-elevator -- --commit
*/
import { sanity, die } from "./i18n/sanity.mjs";

const KEY = "6d63c4b771f8"; // the elevator row, same _key in every list and language
const EN = "Elevator to all floors";
const ES = "Ascensor a todos los pisos";

const commit = process.argv.includes("--commit");
const client = sanity({ write: commit });

/*
  The Spanish row is found by LABEL, not by $KEY.

  A locale's `amenitiesOverride` wholly replaces the English one rather than
  merging into it (`t.amenitiesOverride ?? …` in lib/sanity.server.ts), so the
  Spanish array is authored independently and its _keys need not match the
  English at all — unit-one-bed's are entirely different. Addressing the Spanish
  by the English key silently patches nothing, because a key selector that matches
  no item is a no-op in Sanity. That is how the first run reported success and
  left one page still denying the lift.
*/
const esElevator = (rows) =>
  (rows ?? []).find((a) => /ascensor|elevator/i.test(a?.label ?? ""));

const [stay, units] = await Promise.all([
  client.fetch(`*[_type == "stayDefaults"][0]{_id,
    "en": amenities.building[_key == $k][0]{label, included},
    "esRows": i18n[_key == "es"][0].amenities.building[]{_key, label, included}
  }`, { k: KEY }),
  client.fetch(`*[_type == "unit"] | order(_id asc){_id, code,
    "en": amenitiesOverride.building[_key == $k][0]{label, included},
    "esRows": i18n[_key == "es"][0].amenitiesOverride.building[]{_key, label, included}
  }`, { k: KEY }),
]);
if (stay) stay.es = esElevator(stay.esRows);
for (const u of units) u.es = esElevator(u.esRows);
if (!stay?._id) die("No stayDefaults document found.", "Check the token in .env.local.");
if (!units.length) die("No apartments found.");

const done = (row) => row && row.label === EN && row.included === true;
const doneEs = (row) => row && row.label === ES && row.included === true;

/*
  A field-scoped patch per document. `amenities.building[_key=="…"]` addresses one
  array item, so nothing else in the list is touched — and a selector that matches
  nothing is a silent no-op in Sanity, which is why the missing-row case below is
  reported rather than relied upon.
*/
const patches = [];
const report = [];

const stayOps = {};
if (!done(stay.en)) {
  stayOps[`amenities.building[_key=="${KEY}"].label`] = EN;
  stayOps[`amenities.building[_key=="${KEY}"].included`] = true;
}
if (stay.es && !doneEs(stay.es)) {
  stayOps[`i18n[_key=="es"].amenities.building[_key=="${stay.es._key}"].label`] = ES;
  stayOps[`i18n[_key=="es"].amenities.building[_key=="${stay.es._key}"].included`] = true;
}
report.push({
  id: "stayDefaults",
  label: "shared list",
  en: stay.en,
  es: stay.es,
  ops: Object.keys(stayOps).length,
});
if (Object.keys(stayOps).length) patches.push([stay._id, stayOps]);

for (const u of units) {
  const ops = {};
  if (!u.en) {
    // No override row at all — this unit inherits the shared list, so there is
    // nothing here to correct.
  } else if (!done(u.en)) {
    ops[`amenitiesOverride.building[_key=="${KEY}"].label`] = EN;
    ops[`amenitiesOverride.building[_key=="${KEY}"].included`] = true;
  }
  if (u.es && !doneEs(u.es)) {
    ops[`i18n[_key=="es"].amenitiesOverride.building[_key=="${u.es._key}"].label`] = ES;
    ops[`i18n[_key=="es"].amenitiesOverride.building[_key=="${u.es._key}"].included`] = true;
  }
  report.push({ id: u._id, label: u.code, en: u.en, es: u.es, ops: Object.keys(ops).length });
  if (Object.keys(ops).length) patches.push([u._id, ops]);
}

console.log(`\n${commit ? "Writing" : "Dry run — would write"}:\n`);
for (const r of report) {
  console.log(`  ${r.id.padEnd(14)} ${(r.label ?? "").padEnd(9)} ${r.ops ? "" : "(already correct)"}`);
  console.log(`    en  ${r.en ? `"${r.en.label}" (included: ${r.en.included})` : "— inherits the shared list"}`);
  console.log(`    es  ${r.es ? `"${r.es.label}" (included: ${r.es.included})` : "— no Spanish row; falls back to English"}`);
}
console.log(`\n  → en "${EN}" / es "${ES}", both included: true`);
console.log(`  ${patches.length} document(s) to patch\n`);

if (!commit) {
  console.log("Nothing was written. Re-run with --commit to apply.\n");
  process.exit(0);
}
if (!patches.length) {
  console.log("Nothing to do — every list already reads correctly.\n");
  process.exit(0);
}

// One transaction: a half-applied fix leaves some pages claiming a lift and
// others denying it, which is worse than the state we started from.
const tx = patches.reduce(
  (t, [id, ops]) => t.patch(id, (p) => p.set(ops)),
  client.transaction(),
);
await tx.commit();

console.log(`Done — ${patches.length} document(s) patched.`);
console.log("Next: npm run i18n:extract, so every corrected Spanish row is reviewed.\n");
