/*
  Backfill `previousSlugs` for the rename that shipped before the field existed.

  The apartments were once at /apartments/studio, /one-bed, /two-bed and /loft.
  They were renamed to /apartments/apartment-1…4 with no redirects, so all four
  old addresses have returned 404 ever since — any link shared over WhatsApp or
  Facebook before the rename is dead, and so is whatever standing those URLs had.

  From here on saveUnit maintains this list on every slug change (see
  formerSlugs() in lib/slug.ts) and the apartment page redirects anything on it.
  This script only fills in the history that predates that machinery.

  The mapping is not guesswork: the document ids still encode the original slugs,
  because Sanity ids are fixed at creation and the rename only touched the slug
  field. `unit-two-bed` is the document that used to live at /two-bed.

  Dry run by default — prints what it would write and touches nothing:

      npm run units:backfill-slugs
      npm run units:backfill-slugs -- --commit
*/
import { sanity, die } from "./i18n/sanity.mjs";

/** Document id → the address it used to live at, before the apartment-N rename. */
const FORMER = {
  "unit-studio": "studio",
  "unit-one-bed": "one-bed",
  "unit-two-bed": "two-bed",
  "unit-loft": "loft",
};

const commit = process.argv.includes("--commit");
const client = sanity({ write: commit });

const units = await client.fetch(
  `*[_type == "unit"]{_id, "slug": slug.current, previousSlugs}`,
);
if (!units.length) {
  die("No apartments found.", "Check the token in .env.local can read the dataset.");
}

const planned = [];
const skipped = [];

for (const [id, former] of Object.entries(FORMER)) {
  const unit = units.find((u) => u._id === id);
  if (!unit) {
    skipped.push(`${id} — no such document, nothing to back-fill`);
    continue;
  }
  const existing = unit.previousSlugs ?? [];
  if (existing.includes(former)) {
    skipped.push(`${id} — already lists "${former}"`);
    continue;
  }
  /*
    Guard against the case that makes a redirect loop: an apartment that has
    somehow moved BACK to its old address owns it outright, and listing it as a
    former address would point the page at itself.
  */
  if (unit.slug === former) {
    skipped.push(`${id} — currently lives at "${former}", so it is not a former address`);
    continue;
  }
  const owner = units.find((u) => u._id !== id && u.slug === former);
  if (owner) {
    skipped.push(`${id} — "${former}" is ${owner._id}'s current address; refusing to shadow it`);
    continue;
  }
  planned.push({ id, former, slug: unit.slug, previousSlugs: [...existing, former] });
}

console.log(`\n${commit ? "Writing" : "Dry run — would write"}:\n`);
for (const p of planned) {
  console.log(`  ${p.id.padEnd(15)}  /apartments/${p.former}  →  /apartments/${p.slug}`);
}
if (!planned.length) console.log("  (nothing to do)");
if (skipped.length) {
  console.log("\nSkipped:\n");
  for (const s of skipped) console.log(`  ${s}`);
}

if (!commit) {
  console.log("\nNothing was written. Re-run with --commit to apply.\n");
  process.exit(0);
}

// One transaction: either every old address redirects or none does, so a failure
// halfway cannot leave two of the four still dead with no sign of which.
const tx = planned.reduce(
  (t, p) => t.patch(p.id, (patch) => patch.set({ previousSlugs: p.previousSlugs })),
  client.transaction(),
);
if (planned.length) await tx.commit();

console.log(`\nDone — ${planned.length} address${planned.length === 1 ? "" : "es"} now redirect.`);
console.log("Redeploy is not needed; the lookup reads Sanity per request.\n");
