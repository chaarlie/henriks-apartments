/*
  Strip blank and duplicate chips from every unit, in every language.

  unit-one-bed's Spanish chips were:

    ["Balcón y terraza","Último piso","Vista a la piscina","","","","","","","",""]

  Eight empty strings. A locale's `chips` array replaces the English wholesale
  rather than merging, and the translation editor seeds it to the ENGLISH length
  with "" for every chip nobody has filled in — so translating three of eleven
  and saving stored the other eight as blanks. On the Spanish homepage that
  rendered eight ticks with no text beside them, and because both callers key the
  list by the chip string, React saw eight children keyed "" and warned that it
  could duplicate or omit them.

  The save now drops blanks (cleanChips in lib/admin/actions.ts) and
  unitHighlights guards the render, but neither rewrites data already stored.
  This does.

  Idempotent.

      npm run units:clean-chips
      npm run units:clean-chips -- --commit
*/
import { sanity, die } from "./i18n/sanity.mjs";

const clean = (chips) => [...new Set((chips ?? []).map((c) => (c ?? "").trim()).filter(Boolean))];
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

const commit = process.argv.includes("--commit");
const client = sanity({ write: commit });

const units = await client.fetch(
  `*[_type == "unit"] | order(_id asc){_id, code, chips, "i18n": i18n[]{_key, locale, chips}}`,
);
if (!units.length) die("No apartments found.", "Check the token in .env.local.");

const patches = [];
const lines = [];

for (const u of units) {
  const ops = {};
  const en = clean(u.chips);
  if (!same(en, u.chips ?? [])) {
    ops.chips = en;
    lines.push(`  ${u._id} (${u.code}) en  ${(u.chips ?? []).length} → ${en.length}`);
  }
  for (const row of u.i18n ?? []) {
    // Rows are addressed by _key; locale is carried separately and is what the
    // site reads, so report the locale and patch by the key.
    if (!row?._key) continue;
    const next = clean(row.chips);
    if (row.chips && !same(next, row.chips)) {
      ops[`i18n[_key=="${row._key}"].chips`] = next;
      lines.push(
        `  ${u._id} (${u.code}) ${row.locale ?? row._key}  ${row.chips.length} → ${next.length}` +
          `   dropped: ${row.chips.length - next.length}`,
      );
    }
  }
  if (Object.keys(ops).length) patches.push([u._id, ops]);
}

console.log(`\n${commit ? "Writing" : "Dry run — would write"}:\n`);
console.log(lines.length ? lines.join("\n") : "  (nothing to do)");
console.log(`\n  ${patches.length} document(s) to patch\n`);

if (!commit) {
  console.log("Nothing was written. Re-run with --commit to apply.\n");
  process.exit(0);
}
if (!patches.length) {
  console.log("Nothing to do — every chip list is already clean.\n");
  process.exit(0);
}

await patches
  .reduce((t, [id, ops]) => t.patch(id, (p) => p.set(ops)), client.transaction())
  .commit();

console.log(`Done — ${patches.length} document(s) patched.\n`);
