/*
  Pull the translatable strings out of everything that still needs them.

  Writes one file per document per language to
  scripts/i18n/pending/<locale>/<type>/<name>.json. Each is a flat map of plain
  strings — fill in the right-hand side (or let translate.mjs do it), then run
  apply.mjs.

  Usage:
    npm run i18n:extract              every language, every document
    npm run i18n:extract es           Spanish only
    npm run i18n:extract es apartment-1
    npm run i18n:extract es hero

  Two things get extracted: documents with no translation at all, and documents
  whose English has changed since the last one was made. The second is the case
  that matters over time — a translation made from older copy looks finished and
  is quietly wrong, which is what the fingerprint comparison catches.
*/
import fs from "node:fs";
import path from "node:path";
import { TYPES, extractDoc, sourceHash } from "./lib.mjs";
import { sanity, die } from "./sanity.mjs";
import { LOCALES, DEFAULT_LOCALE, isLocale } from "../../lib/locales.ts";

const TARGETS = LOCALES.filter((l) => l !== DEFAULT_LOCALE);

const [localeArg, nameArg] = process.argv.slice(2);
if (localeArg && !isLocale(localeArg)) {
  die(`"${localeArg}" is not a configured locale.`, `Known: ${LOCALES.join(", ")} (lib/locales.ts)`);
}
const locales = localeArg ? [localeArg] : TARGETS;
if (!locales.length) die("No target languages.", "Add one to LOCALES in lib/locales.ts.");

const OUT = path.join(import.meta.dirname, "pending");
const client = sanity();

/*
  Everything translatable, as {type, name, doc}.

  Units are many and identified by slug; the other four are singletons pinned to
  a fixed document id, so the type name is also the name. Published only — a
  draft is work in progress, and translating it would bake an unpublished edit
  into the Spanish and ship it the moment someone publishes.
*/
async function documents() {
  const out = [];

  const units = await client.fetch(
    `*[_type == "unit" && !(_id in path("drafts.**"))]{
      ..., "slug": slug.current,
      "draftI18n": *[_id == "drafts." + ^._id][0].i18n
    }`,
  );
  for (const doc of units) {
    if (!doc.slug) {
      console.log(`  ! ${doc.name ?? doc._id} — no slug, skipped`);
      continue;
    }
    out.push({ type: "unit", name: doc.slug, doc });
  }

  for (const type of Object.keys(TYPES)) {
    if (type === "unit") continue;
    const doc = await client.fetch(
      `*[_id == $id][0]{..., "draftI18n": *[_id == "drafts." + ^._id][0].i18n}`,
      { id: type },
    );
    if (doc) out.push({ type, name: type, doc });
  }

  return out;
}

const all = await documents();
if (!all.length) {
  die("Nothing found to translate.", "Check the token in .env.local can read the dataset.");
}

const wanted = nameArg ? all.filter((d) => d.name === nameArg) : all;
if (!wanted.length) die(`Nothing called "${nameArg}".`, `Known: ${all.map((d) => d.name).join(", ")}`);

let written = 0;

for (const locale of locales) {
  for (const { type, name, doc } of wanted) {
    const strings = extractDoc(type, doc);
    if (!Object.keys(strings).length) {
      console.log(`  · ${locale}/${type}/${name} — nothing translatable`);
      continue;
    }
    const hash = sourceHash(strings);

    // A draft translation awaiting review counts as done; it is the review gate
    // working, not a missing translation.
    const rows = doc.draftI18n ?? doc.i18n ?? [];
    const existing = rows.find((r) => r?.locale === locale);

    // Compare the English against itself, never against the document revision:
    // writing the translation onto the document bumps its _rev, so a rev check
    // would call everything stale the moment it is published.
    const stale = existing && existing.sourceHash !== hash;

    if (existing && !stale) {
      console.log(`  ✓ ${locale}/${type}/${name} — translated, English unchanged`);
      continue;
    }

    const dir = path.join(OUT, locale, type);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, `${name}.json`),
      JSON.stringify(
        {
          _id: doc._id,
          _rev: doc._rev,
          _type: type,
          sourceHash: hash,
          locale,
          name,
          // translated:false until translate.mjs says otherwise — apply.mjs
          // refuses anything still false, because nothing else can tell English
          // from Spanish when both are non-empty strings.
          translated: false,
          strings,
        },
        null,
        2,
      ) + "\n",
    );
    written++;
    console.log(
      `  ${stale ? "↻" : "+"} ${locale}/${type}/${name} — ${Object.keys(strings).length} strings` +
        (stale ? " (English changed since last translation)" : ""),
    );
  }
}

console.log(`\n${written} file(s) in scripts/i18n/pending/`);
if (written) console.log(`Next:  npm run i18n:translate${localeArg ? ` ${localeArg}` : ""}`);
