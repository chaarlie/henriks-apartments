/*
  The fibre is 50 Mbps. Henrik confirmed it on 2026-09-25.

  The site advertised three different figures at once, which is the reason this
  is a script and not a one-line edit:

    siteSettings.propertyAmenities   "200 Mbps fibre"           (homepage tile)
    stayDefaults.amenities.building  "200 Mbps fibre + Wi-Fi"   (+ Spanish)
    Unit 201, Unit 301               "200 Mbps fibre + Wi-Fi"   (+ Spanish)
    Unit 101, Unit 302               "100 Mbps fibre + Wi-Fi"   (+ Spanish)

  So two apartments promised half the speed of the other two, and none of them
  matched the truth. Overselling a long-stay rental's internet is a complaint at
  check-in from exactly the remote workers the copy is aimed at.

  `internetMbps` on siteSettings now owns the number for everything printed in
  prose — the rent-includes lines and the cost breakdown, both languages — so
  that half can never drift again. These amenity LABELS are free text a person
  typed, which is why they still need correcting once here.

  Every unit defines `amenitiesOverride`, so the shared list alone reaches no
  unit page (see scripts/fix-elevator.mjs for the same trap). Spanish rows are
  matched by label, not by key: a locale override wholly replaces the English and
  carries its own _keys, so a key selector from the English side silently patches
  nothing.

  Idempotent.

      npm run units:fix-internet
      npm run units:fix-internet -- --commit
*/
import { sanity, die } from "./i18n/sanity.mjs";

const MBPS = 50;
/** Rewrites whatever figure a label carries, in either language, and leaves the rest of the wording alone. */
const retitle = (label) => label.replace(/\b\d{2,4}\s*Mbps\b/i, `${MBPS} Mbps`);
const isNet = (row) => /mbps|fibra|fibre|wi-?fi/i.test(row?.label ?? "") || /mbps/i.test(row?.title ?? "");

const commit = process.argv.includes("--commit");
const client = sanity({ write: commit });

const [settings, stay, units] = await Promise.all([
  client.fetch(`*[_type == "siteSettings"][0]{_id, internetMbps,
    "tiles": propertyAmenities[]{_key, title, desc},
    "esTiles": i18n[_key == "es"][0].propertyAmenities[]{_key, title, desc}
  }`),
  client.fetch(`*[_type == "stayDefaults"][0]{_id,
    "rows": amenities.building[]{_key, label},
    "esRows": i18n[_key == "es"][0].amenities.building[]{_key, label}
  }`),
  client.fetch(`*[_type == "unit"] | order(_id asc){_id, code,
    "rows": amenitiesOverride.building[]{_key, label},
    "esRows": i18n[_key == "es"][0].amenitiesOverride.building[]{_key, label}
  }`),
]);
if (!settings?._id) die("No siteSettings document found.", "Check the token in .env.local.");

const patches = [];
const lines = [];

/** Queue a label fix for one array item, if its figure is not already right. */
function label(ops, path, row) {
  if (!row) return;
  const next = retitle(row.label);
  if (next === row.label) return;
  ops[`${path}[_key=="${row._key}"].label`] = next;
  lines.push(`    "${row.label}" → "${next}"`);
}

// ── siteSettings: the homepage tile, plus the number the prose now reads ──
const sOps = {};
if (settings.internetMbps !== MBPS) {
  sOps.internetMbps = MBPS;
  lines.push(`  siteSettings`);
  lines.push(`    internetMbps ${settings.internetMbps ?? "(unset)"} → ${MBPS}`);
} else {
  lines.push(`  siteSettings`);
}
for (const [arr, path] of [
  [settings.tiles, "propertyAmenities"],
  [settings.esTiles, 'i18n[_key=="es"].propertyAmenities'],
]) {
  const tile = (arr ?? []).find(isNet);
  if (tile && retitle(tile.title) !== tile.title) {
    sOps[`${path}[_key=="${tile._key}"].title`] = retitle(tile.title);
    lines.push(`    tile "${tile.title}" → "${retitle(tile.title)}"`);
  }
}
if (Object.keys(sOps).length) patches.push([settings._id, sOps]);

// ── stayDefaults: the shared list no unit actually reads, kept honest anyway ──
if (stay?._id) {
  const ops = {};
  lines.push(`  stayDefaults`);
  label(ops, "amenities.building", (stay.rows ?? []).find(isNet));
  label(ops, 'i18n[_key=="es"].amenities.building', (stay.esRows ?? []).find(isNet));
  if (Object.keys(ops).length) patches.push([stay._id, ops]);
}

// ── the four units, which are what a guest actually sees ──
for (const u of units) {
  const ops = {};
  lines.push(`  ${u._id} (${u.code})`);
  label(ops, "amenitiesOverride.building", (u.rows ?? []).find(isNet));
  label(ops, 'i18n[_key=="es"].amenitiesOverride.building', (u.esRows ?? []).find(isNet));
  if (Object.keys(ops).length) patches.push([u._id, ops]);
}

console.log(`\n${commit ? "Writing" : "Dry run — would write"}:\n`);
console.log(lines.join("\n"));
console.log(`\n  ${patches.length} document(s) to patch\n`);

if (!commit) {
  console.log("Nothing was written. Re-run with --commit to apply.\n");
  process.exit(0);
}
if (!patches.length) {
  console.log("Nothing to do — every figure already reads 50 Mbps.\n");
  process.exit(0);
}

// One transaction: a half-applied fix leaves the homepage and an apartment page
// advertising different speeds, which is the state being fixed.
await patches
  .reduce((t, [id, ops]) => t.patch(id, (p) => p.set(ops)), client.transaction())
  .commit();

console.log(`Done — ${patches.length} document(s) patched.`);
console.log("Next: npm run i18n:extract, so the corrected Spanish rows are reviewed.\n");
