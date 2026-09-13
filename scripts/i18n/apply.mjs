/*
  Turn filled-in pending files into translation rows on a Sanity DRAFT.

  Usage:
    npm run i18n:apply es               every pending Spanish apartment
    npm run i18n:apply es apartment-1

  A draft, not a published document, and that is the point: the translation is a
  first pass. Open the apartment in the Studio (npm run studio), read the
  Spanish, fix what reads stiff, publish. Machine-assisted copy going live unread
  on pages quoting prices is the failure this whole flow exists to prevent.

  Both of the app's Sanity clients pin perspective "published", so nothing here
  can reach the public site or the /admin list until someone hits Publish.
*/
import fs from "node:fs";
import path from "node:path";
import { rebuildUnit, draftId } from "./lib.mjs";
import { sanity, die } from "./sanity.mjs";
import { LOCALES, DEFAULT_LOCALE, isLocale } from "../../lib/locales.ts";

const args = process.argv.slice(2);
const force = args.includes("--force");
const [localeArg, slugArg] = args.filter((a) => a !== "--force");
if (!localeArg || !isLocale(localeArg) || localeArg === DEFAULT_LOCALE) {
  die(
    `usage: npm run i18n:apply <locale> [slug]`,
    `Target languages: ${LOCALES.filter((l) => l !== DEFAULT_LOCALE).join(", ") || "(none configured)"}`,
  );
}

const dir = path.join(import.meta.dirname, "pending", localeArg);
if (!fs.existsSync(dir)) die(`Nothing pending for "${localeArg}".`, "Run: npm run i18n:extract");

const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .filter((f) => !slugArg || f === `${slugArg}.json`);
if (!files.length) die(`Nothing pending for "${localeArg}"${slugArg ? ` / ${slugArg}` : ""}.`);

const client = sanity({ write: true });
let applied = 0;

for (const file of files) {
  const { _id, _rev, strings, slug, translated } = JSON.parse(
    fs.readFileSync(path.join(dir, file), "utf8"),
  );

  /*
    Refuse a file that has not been through translate.mjs.

    The empty-string check below cannot tell English from Spanish — the strings
    are non-empty either way — so applying a freshly extracted file would write
    the English straight into the Spanish row, and i18n:status would then report
    it as a finished translation. Only translate.mjs sets this flag.

    Files extracted before this flag existed have no `translated` key and are
    refused for the same reason: re-extract them.
  */
  if (translated !== true && !force) {
    console.log(
      `  ✗ ${slug} — not translated yet\n` +
        `      run:  npm run i18n:translate ${localeArg} ${slug}`,
    );
    continue;
  }

  /*
    Refuse rather than half-translate. A page where two paragraphs are still
    English reads as broken, and it is much harder to notice in the Studio than
    an error here.
  */
  const empty = Object.entries(strings).filter(([, v]) => !v || !String(v).trim());
  if (empty.length) {
    console.log(`  ✗ ${slug} — ${empty.length} string(s) still empty (${empty.slice(0, 3).map(([k]) => k).join(", ")}…)`);
    continue;
  }

  /*
    Fetch the English fresh rather than trusting the pending file: it may be
    hours old, and rebuildUnit() copies structure straight off this document.

    The WHOLE document, not a projection. It is also the seed for the draft
    below, and a draft created from a partial document would drop price,
    deposits, spec and tour — then overwrite the real apartment with those gaps
    the moment someone hit Publish.
  */
  const source = await client.getDocument(_id);
  if (!source) {
    console.log(`  ✗ ${slug} — apartment ${_id} not found`);
    continue;
  }
  /*
    Refuse when the English moved under us, rather than warn and continue.

    rebuildUnit() matches translations onto the CURRENT document by _key, so a
    paragraph added or split since extract keeps its English and rides into the
    Spanish row unnoticed — the same half-translated page the checks in
    translate.mjs exist to prevent, arriving by a different door.

    --force is the escape for a change you know was cosmetic.
  */
  if (source._rev !== _rev && !force) {
    console.log(
      `  ✗ ${slug} — English changed since extract (${_rev} → ${source._rev})\n` +
        `      re-run:  npm run i18n:extract ${localeArg} ${slug}   (or apply with --force)`,
    );
    continue;
  }

  /*
    The revision the Spanish was actually translated FROM — never the freshly
    fetched one. Recording the new rev would stamp a stale translation as
    current, which is precisely the failure sourceRev exists to catch. Under
    --force this is what keeps i18n:status honest about the row being behind.
  */
  const row = rebuildUnit(source, strings, localeArg, _rev);
  const draft = draftId(_id);

  /*
    createIfNotExists then patch, rather than createOrReplace: a draft may
    already hold edits made in the Studio, and replacing it wholesale would
    throw those away. This adds one language's row and leaves everything else
    alone.
  */
  const existing = await client.getDocument(draft);
  const base = existing ?? source;
  const i18n = [...(base.i18n ?? []).filter((r) => r?.locale !== localeArg), row];

  // Strip the system fields — a stale _rev on a create is a conflict waiting
  // to happen, and the timestamps belong to the published document.
  const seed = { ...source };
  delete seed._rev;
  delete seed._createdAt;
  delete seed._updatedAt;

  await client
    .transaction()
    .createIfNotExists({ ...seed, _id: draft })
    .patch(draft, (p) => p.set({ i18n }))
    .commit();

  applied++;
  console.log(`  ✓ ${slug} — ${localeArg} row written to ${draft} (from rev ${source._rev})`);
}

if (applied) {
  console.log(`\n${applied} draft(s) updated. Review and publish:`);
  console.log(`  npm run studio   →  http://localhost:3333`);
  console.log(`\nThe public site shows nothing until you publish (both clients pin perspective "published").`);
}
