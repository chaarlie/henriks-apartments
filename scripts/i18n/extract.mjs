/*
  Pull the translatable strings out of every apartment that still needs them.

  Writes one file per apartment per language to scripts/i18n/pending/<locale>/.
  Each is a flat map of plain strings — fill in the right-hand side (or let
  translate.mjs do it), then run apply.mjs.

  Usage:
    npm run i18n:extract              every language, every apartment
    npm run i18n:extract es           Spanish only
    npm run i18n:extract es apartment-1

  Two things get extracted: apartments with no translation at all, and
  apartments whose English has changed since the last one was made. The second
  is the case that matters over time — a translation made from an older revision
  looks finished and is quietly wrong, and comparing sourceRev against the
  current _rev is what turns that into something visible.
*/
import fs from "node:fs";
import path from "node:path";
import { extractUnit, sourceHash } from "./lib.mjs";
import { sanity, die, UNIT_PROJECTION } from "./sanity.mjs";
import { LOCALES, DEFAULT_LOCALE, isLocale } from "../../lib/locales.ts";

const TARGETS = LOCALES.filter((l) => l !== DEFAULT_LOCALE);

const [localeArg, slugArg] = process.argv.slice(2);
if (localeArg && !isLocale(localeArg)) {
  die(`"${localeArg}" is not a configured locale.`, `Known: ${LOCALES.join(", ")} (lib/locales.ts)`);
}
const locales = localeArg ? [localeArg] : TARGETS;
if (!locales.length) die("No target languages.", "Add one to LOCALES in lib/locales.ts.");

const OUT = path.join(import.meta.dirname, "pending");

/* Published only. A draft is work in progress; translating it would bake an
   unpublished edit into the Spanish and ship it the moment someone publishes. */
const units = await sanity().fetch(
  `*[_type == "unit" && !(_id in path("drafts.**"))${slugArg ? " && slug.current == $slug" : ""}]{${UNIT_PROJECTION}}`,
  slugArg ? { slug: slugArg } : {},
);

if (!units.length) {
  die(
    slugArg ? `No published apartment with slug "${slugArg}".` : "No published apartments found.",
    "Check the token in .env.local can read the dataset.",
  );
}

let written = 0;

for (const locale of locales) {
  for (const unit of units) {
    if (!unit.slug) {
      console.log(`  ! ${unit.name ?? unit._id} — no slug, skipped`);
      continue;
    }

    const strings = extractUnit(unit);
    if (!Object.keys(strings).length) {
      console.log(`  · ${locale}/${unit.slug} — nothing translatable`);
      continue;
    }
    const hash = sourceHash(strings);

    // A draft translation awaiting review counts as done; it is the review gate
    // working, not a missing translation.
    const rows = unit.draftI18n ?? unit.i18n ?? [];
    const existing = rows.find((r) => r?.locale === locale);

    // Compare the English against itself, never against the document revision:
    // writing the translation onto the unit bumps its _rev, so a rev check would
    // call every translated apartment stale the moment it is published.
    const stale = existing && existing.sourceHash !== hash;

    if (existing && !stale) {
      console.log(`  ✓ ${locale}/${unit.slug} — translated, English unchanged`);
      continue;
    }

    const dir = path.join(OUT, locale);
    fs.mkdirSync(dir, { recursive: true });
    /*
      `translated: false` until translate.mjs says otherwise.

      apply.mjs refuses a file that still says false, because nothing else can
      tell English from Spanish: the strings are non-empty either way, so
      applying a freshly extracted file would write the English into the Spanish
      row and i18n:status would report it as a finished translation.
    */
    fs.writeFileSync(
      path.join(dir, `${unit.slug}.json`),
      JSON.stringify(
        {
          _id: unit._id,
          _rev: unit._rev,
          sourceHash: hash,
          locale,
          slug: unit.slug,
          translated: false,
          strings,
        },
        null,
        2,
      ) + "\n",
    );
    written++;
    console.log(
      `  ${stale ? "↻" : "+"} ${locale}/${unit.slug} — ${Object.keys(strings).length} strings` +
        (stale ? " (English changed since last translation)" : ""),
    );
  }
}

console.log(`\n${written} file(s) in scripts/i18n/pending/`);
if (written) console.log(`Next:  npm run i18n:translate${localeArg ? ` ${localeArg}` : ""}`);
