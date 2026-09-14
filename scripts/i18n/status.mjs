/*
  What is not translated yet, and what has gone stale.

  Two different problems, and only the first is obvious. A document with no
  Spanish is visibly missing. One translated from older English looks finished
  and is quietly wrong — that is what the fingerprint catches, and it needs
  something to compare against.

  Reports; never writes. Safe to run before a deploy or in CI.

  Usage:  npm run i18n:status [locale]
*/
import { TYPES, extractDoc, sourceHash } from "./lib.mjs";
import { sanity, die } from "./sanity.mjs";
import { LOCALES, DEFAULT_LOCALE, isLocale } from "../../lib/locales.ts";

const [localeArg] = process.argv.slice(2);
if (localeArg && !isLocale(localeArg)) {
  die(`"${localeArg}" is not a configured locale.`, `Known: ${LOCALES.join(", ")} (lib/locales.ts)`);
}
const locales = (localeArg ? [localeArg] : LOCALES).filter((l) => l !== DEFAULT_LOCALE);
if (!locales.length) {
  console.log(`Only ${DEFAULT_LOCALE} is configured — nothing to translate.`);
  console.log("Add a language to LOCALES in lib/locales.ts.");
  process.exit(0);
}

const client = sanity();

/*
  Reads drafts as well as published documents. Without that, a translation that
  exists but is waiting for review reports as "not translated" — two very
  different states, and conflating them would send someone to redo work already
  done.
*/
const units = await client.fetch(
  `*[_type == "unit" && !(_id in path("drafts.**"))] | order(name asc){
    ..., "slug": slug.current,
    "draftI18n": *[_id == "drafts." + ^._id][0].i18n
  }`,
);
if (!units.length) {
  die(
    "No published apartments found.",
    "Nothing to translate and unable to look are different outcomes — check the token in .env.local.",
  );
}

const docs = units.map((doc) => ({ type: "unit", name: doc.slug ?? doc._id, doc }));
for (const type of Object.keys(TYPES)) {
  if (type === "unit") continue;
  const doc = await client.fetch(
    `*[_id == $id][0]{..., "draftI18n": *[_id == "drafts." + ^._id][0].i18n}`,
    { id: type },
  );
  if (doc) docs.push({ type, name: type, doc });
}

const counts = { ok: 0, review: 0, stale: 0, nohash: 0, missing: 0, empty: 0 };
const label = {
  ok: "✓ published",
  review: "◐ in draft",
  stale: "↻ stale",
  nohash: "? no baseline",
  missing: "· missing",
  empty: "– nothing to translate",
};
const note = {
  stale: "English edited since translation",
  nohash: "translated before fingerprints existed — re-extract to baseline",
};

for (const locale of locales) {
  console.log(`\n${locale.toUpperCase()}`);
  for (const { type, name, doc } of docs) {
    const strings = extractDoc(type, doc);
    if (!Object.keys(strings).length) {
      counts.empty++;
      console.log(`  ${label.empty.padEnd(24)} ${type}/${name}`);
      continue;
    }
    // Recomputed from the published English every run and compared against the
    // fingerprint on the row — never against _rev, which the translation itself
    // moves.
    const hash = sourceHash(strings);
    const published = (doc.i18n ?? []).find((r) => r?.locale === locale);
    const draft = (doc.draftI18n ?? []).find((r) => r?.locale === locale);
    const row = draft ?? published;

    let state;
    if (!row) state = "missing";
    else if (!row.sourceHash) state = "nohash";
    else if (row.sourceHash !== hash) state = "stale";
    else if (!published) state = "review";
    else state = "ok";

    counts[state]++;
    console.log(`  ${label[state].padEnd(24)} ${`${type}/${name}`.padEnd(26)}${note[state] ?? ""}`);
  }
}

const total = Object.values(counts).reduce((a, b) => a + b, 0);
console.log(
  `\n${total} document-language pair(s): ${counts.ok} published, ${counts.review} awaiting review, ` +
    `${counts.stale} stale, ${counts.nohash} without a baseline, ${counts.missing} missing`,
);
if (counts.missing || counts.stale) console.log(`\nNext:  npm run i18n:extract`);
else if (counts.review) console.log(`\nReview and publish the drafts:  npm run studio`);
