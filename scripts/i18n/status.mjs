/*
  What is not translated yet, and what has gone stale.

  Two different problems, and only the first is obvious. An apartment with no
  Spanish is visibly missing. An apartment translated from an older revision of
  the English looks finished and is quietly wrong — that is what sourceRev
  exists to catch, and it needs something to actually compare it against.

  Reports; never writes. Safe to run before a deploy or in CI.

  Usage:  npm run i18n:status [locale]
*/
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

/*
  Reads drafts as well as published documents. Without that, a translation that
  exists but is waiting for review reports as "not translated" — two very
  different states, and conflating them would send someone to redo work already
  done.
*/
const units = await sanity().fetch(`
  *[_type == "unit" && !(_id in path("drafts.**"))] | order(name asc){
    _id, _rev, name, "slug": slug.current,
    "published": i18n[]{locale, sourceRev},
    "draft": *[_id == "drafts." + ^._id][0].i18n[]{locale, sourceRev}
  }
`);

if (!units.length) {
  die(
    "No published apartments found.",
    "Nothing to translate and unable to look are different outcomes — check the token in .env.local.",
  );
}

const counts = { ok: 0, review: 0, stale: 0, missing: 0 };
const label = { ok: "✓ published", review: "◐ in draft", stale: "↻ stale", missing: "· missing" };

for (const locale of locales) {
  console.log(`\n${locale.toUpperCase()}`);
  for (const unit of units) {
    const published = (unit.published ?? []).find((r) => r?.locale === locale);
    const draft = (unit.draft ?? []).find((r) => r?.locale === locale);
    const row = draft ?? published;

    let state;
    if (!row) state = "missing";
    else if (row.sourceRev !== unit._rev) state = "stale";
    else if (!published) state = "review";
    else state = "ok";

    counts[state]++;
    const name = `${unit.slug ?? unit._id}`.padEnd(26);
    console.log(`  ${label[state].padEnd(12)} ${name}${state === "stale" ? "English edited since translation" : ""}`);
  }
}

const total = Object.values(counts).reduce((a, b) => a + b, 0);
console.log(
  `\n${total} apartment-language pair(s): ${counts.ok} published, ${counts.review} awaiting review, ${counts.stale} stale, ${counts.missing} missing`,
);
if (counts.missing || counts.stale) console.log(`\nNext:  npm run i18n:extract`);
else if (counts.review) console.log(`\nReview and publish the drafts:  npm run studio`);
