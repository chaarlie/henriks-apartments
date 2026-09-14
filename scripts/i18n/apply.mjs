/*
  Turn filled-in pending files into translation rows on Sanity DRAFTS.

  Usage:
    npm run i18n:apply es               every pending Spanish document
    npm run i18n:apply es apartment-1
    npm run i18n:apply es hero

  A draft, not a published document, and that is the point: the translation is a
  first pass. Open it in the Studio (npm run studio), read the Spanish, fix what
  reads stiff, publish. Machine-assisted copy going live unread on pages quoting
  prices is the failure this whole flow exists to prevent.

  Both of the app's Sanity clients pin perspective "published", so nothing here
  can reach the public site or the /admin list until someone hits Publish.
*/
import fs from "node:fs";
import path from "node:path";
import { rebuildDoc, draftId, extractDoc, sourceHash } from "./lib.mjs";
import { sanity, die } from "./sanity.mjs";
import { LOCALES, DEFAULT_LOCALE, isLocale } from "../../lib/locales.ts";

const args = process.argv.slice(2);
const force = args.includes("--force");
const [localeArg, nameArg] = args.filter((a) => a !== "--force");

if (!localeArg || !isLocale(localeArg) || localeArg === DEFAULT_LOCALE) {
  die(
    `usage: npm run i18n:apply <locale> [name]`,
    `Target languages: ${LOCALES.filter((l) => l !== DEFAULT_LOCALE).join(", ") || "(none configured)"}`,
  );
}

const root = path.join(import.meta.dirname, "pending", localeArg);
if (!fs.existsSync(root)) die(`Nothing pending for "${localeArg}".`, "Run: npm run i18n:extract");

/** Every pending file for this locale, across the per-type folders. */
const files = fs
  .readdirSync(root, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .flatMap((e) =>
    fs
      .readdirSync(path.join(root, e.name))
      .filter((f) => f.endsWith(".json"))
      .filter((f) => !nameArg || f === `${nameArg}.json`)
      .map((f) => path.join(root, e.name, f)),
  );

if (!files.length) die(`Nothing pending for "${localeArg}"${nameArg ? ` / ${nameArg}` : ""}.`);

const client = sanity({ write: true });
let applied = 0;

for (const file of files) {
  const {
    _id,
    _rev,
    _type: type,
    sourceHash: pendingHash,
    strings,
    name,
    translated,
  } = JSON.parse(fs.readFileSync(file, "utf8"));

  /*
    Refuse a file that has not been through translate.mjs. The empty-string
    check below cannot tell English from Spanish — the strings are non-empty
    either way — so applying a freshly extracted file would write the English
    straight into the Spanish row, and i18n:status would then report it as a
    finished translation. Only translate.mjs sets this flag.
  */
  if (translated !== true && !force) {
    console.log(`  ✗ ${type}/${name} — not translated yet\n      run:  npm run i18n:translate ${localeArg} ${name}`);
    continue;
  }

  const empty = Object.entries(strings).filter(([, v]) => !v || !String(v).trim());
  if (empty.length) {
    console.log(
      `  ✗ ${type}/${name} — ${empty.length} string(s) still empty (${empty.slice(0, 3).map(([k]) => k).join(", ")}…)`,
    );
    continue;
  }

  /*
    Fetch the English fresh rather than trusting the pending file: it may be
    hours old, and rebuildDoc() copies structure straight off this document.

    The WHOLE document, not a projection. It is also the seed for the draft
    below, and a draft created from a partial document would drop fields — then
    overwrite the real document with those gaps the moment someone published.
  */
  const source = await client.getDocument(_id);
  if (!source) {
    console.log(`  ✗ ${type}/${name} — document ${_id} not found`);
    continue;
  }

  /*
    Compare the ENGLISH, not the document revision. A _rev check false-positives
    here: publishing a translation rewrites the document, so its _rev moves for
    reasons that have nothing to do with the English text.
  */
  const currentHash = sourceHash(extractDoc(type, source));
  if (currentHash !== pendingHash && !force) {
    console.log(
      `  ✗ ${type}/${name} — English changed since extract\n` +
        `      re-run:  npm run i18n:extract ${localeArg} ${name}   (or apply with --force)`,
    );
    continue;
  }

  /*
    Record the fingerprint of the English this was translated from — under
    --force that is deliberately the OLD one, so i18n:status keeps reporting the
    row as behind until someone re-translates it.
  */
  const row = rebuildDoc(type, source, strings, localeArg, {
    sourceHash: pendingHash,
    sourceRev: _rev,
  });
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
  console.log(`  ✓ ${type}/${name} — ${localeArg} row written to ${draft}`);
}

if (applied) {
  console.log(`\n${applied} draft(s) updated. Review and publish:`);
  console.log(`  npm run studio   →  http://localhost:3334`);
  console.log(`\nThe public site shows nothing until you publish (both clients pin perspective "published").`);
}
