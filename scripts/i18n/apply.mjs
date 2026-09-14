/*
  Turn filled-in pending files into translation rows on the published document.

  Usage:
    npm run i18n:apply es               every pending Spanish document
    npm run i18n:apply es apartment-1
    npm run i18n:apply es hero

  This used to write a DRAFT, so that someone would open the Studio, read the
  Spanish and publish. That gate has moved: /admin now edits translations
  directly, in the language being translated, with the English beside each
  field. A draft would be worse than useless there — both of the app's Sanity
  clients pin perspective "published", so a drafted translation is invisible to
  the site AND to the editor meant to review it.

  The review itself has not gone away, only the place it happens. Each row below
  is marked `machine: true`, which makes /admin show it as needing review and
  i18n:status count it as awaiting one. Saving it in the editor clears the flag.
  Machine-assisted copy going live LOOKING reviewed, on pages quoting prices, is
  the failure this flow exists to prevent.
*/
import fs from "node:fs";
import path from "node:path";
import { rebuildDoc, extractDoc, sourceHash } from "./lib.mjs";
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
    Two different facts, two different fields.

    sourceHash records WHICH English this Spanish was made from — that is what
    i18n:extract compares to notice a translation has gone stale. `machine`
    records that nobody has read it yet.

    They were briefly folded together, by leaving the hash off a machine pass.
    That made every applied document look permanently stale to extract, which
    re-extracted and re-translated it on every run — a paid model call to
    rewrite the same text with the same text.
  */
  const row = rebuildDoc(type, source, strings, localeArg, {
    sourceHash: pendingHash,
    sourceRev: _rev,
    machine: true,
  });

  /*
    Patch, never createOrReplace: the document holds the English and every other
    language, and this replaces exactly one language's row. Anything already
    edited in /admin — including another translator's work — is left alone.
  */
  const i18n = [...(source.i18n ?? []).filter((r) => r?.locale !== localeArg), row];
  await client.patch(_id).set({ i18n }).commit();

  applied++;
  console.log(`  ✓ ${type}/${name} — ${localeArg} row written to ${_id}`);
}

if (applied) {
  console.log(`\n${applied} document(s) updated — live on the site within a minute.`);
  console.log(`\nThis is a machine first pass. Read it and fix what sounds stiff:`);
  console.log(`  npm run dev   →  http://localhost:3000/admin   (switch the language in the sidebar)`);
  console.log(`\nEach one shows as needing review until you save it there.`);
}
