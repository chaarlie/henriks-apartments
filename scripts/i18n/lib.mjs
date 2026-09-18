/*
  Putting translated strings back into a document.

  The rule this file exists to enforce is that nothing outside it ever sees the
  shape of a Sanity document. `about` is Portable Text — a tree of blocks
  carrying _key, style, marks and markDefs — and asking a model for "the same
  JSON, in Spanish" is how bold vanishes, links detach from their markDefs and
  _keys get invented. So extraction flattens everything to a flat map of plain
  strings, and rebuild() walks the ORIGINAL document again and substitutes text
  into it. Structure is never authored twice, which makes breaking it impossible
  rather than unlikely.

  The other half — the table of what is translatable, and the extraction and
  fingerprinting that read it — moved to lib/i18n/{schema,fingerprint}.ts when
  /admin gained language-aware editing. The editor needs the same list of
  translatable fields and the same fingerprint, and a second copy of either
  would drift. They are re-exported here so every script keeps its existing
  `from "./lib.mjs"` import.

  Rebuilding stays here: it is the scripts' job alone. The admin edits
  structured form state and writes its translation row directly.
*/

import { TYPES } from "../../lib/i18n/schema.ts";
import { sourceHash, extractDoc } from "../../lib/i18n/fingerprint.ts";

export { TYPES, sourceHash, extractDoc };

const spec = (type) => TYPES[type] ?? {};

/* ── Portable Text ───────────────────────────────────────────────────────── */

/*
  Link text is translated; link targets are not. A markDef href means the same
  thing in both languages, and "translating" a URL breaks it — so markDefs ride
  along untouched on the spread below.
*/
function rebuildBlocks(field, blocks, t) {
  return (blocks ?? []).map((block) => {
    if (block?._type !== "block") return block;
    return {
      ...block,
      children: (block.children ?? []).map((child, i) => {
        const next = t[`${field}.${block._key}.${i}`];
        return next === undefined ? child : { ...child, text: next };
      }),
    };
  });
}

/* ── Arrays of objects ───────────────────────────────────────────────────── */

function rebuildRows(prefix, rows, fields, t) {
  return (rows ?? []).map((row) => {
    /*
      `_key` and the listed fields, never a spread of the source row.

      Anything not listed is untranslatable by definition — an icon name, an
      image asset, a hotspot, a fixed `kind` — and copying it here parks a
      second copy in the translations array that no translation schema
      declares. The Studio then shows it as an unknown field, and because the
      admin writer merges `...prior` (lib/admin/actions.ts), whatever lands
      here stays for good. Eight Spanish amenity rows carried a stray `icon`
      that way.

      Same rule as galleryAlts below: translate the words, leave the thing
      they describe on the source document.

      A listed field with no translation still falls back to the source text,
      rather than being dropped. /admin prefills its translation form straight
      from this row and writes back whatever is in the box, so a dropped field
      would come back as "" on the next save — and mergeRows would let that ""
      overwrite the English instead of falling back to it.
    */
    const next = { _key: row?._key };
    for (const f of fields) {
      // ?? not ||: "" here is a real translation, not a missing one.
      const v = t[`${prefix}.${row?._key}.${f}`] ?? row?.[f];
      if (v !== undefined) next[f] = v;
    }
    return next;
  });
}

/* ── The engine ──────────────────────────────────────────────────────────── */

/**
 * The row to store in `<doc>.i18n[]` for one locale.
 *
 * Only fields that actually have content are set. An empty array here would be
 * worse than a missing one: the site reads translations with
 * `coalesce(t.about, about)`, and `coalesce` treats `[]` as a value, so an empty
 * translated array would shadow the English instead of falling back to it.
 */
export function rebuildDoc(type, doc, t, locale, { sourceHash, sourceRev, machine }) {
  const s = spec(type);
  const row = { _type: `${type}Translation`, _key: locale, locale, sourceHash, sourceRev, machine };

  for (const f of s.scalars ?? []) if (t[f] !== undefined) row[f] = t[f];

  for (const f of s.stringArrays ?? []) {
    const arr = (doc[f] ?? []).map((v, i) => t[`${f}.${i}`] ?? v);
    if (arr.length) row[f] = arr;
  }

  for (const f of s.blocks ?? []) {
    if (doc[f]?.length) row[f] = rebuildBlocks(f, doc[f], t);
  }

  // Tour translations own labels only; geometry and media stay on the source —
  // which is now just what rebuildRows does for every row, so no special case.
  for (const [field, keys] of s.rows ?? []) {
    if (doc[field]?.length) row[field] = rebuildRows(field, doc[field], keys, t);
  }

  for (const [obj, field, keys] of s.nested ?? []) {
    const built = rebuildRows(`${obj}.${field}`, doc[obj]?.[field], keys, t);
    if (built.length) row[obj] = { ...(row[obj] ?? {}), [field]: built };
  }

  for (const [obj, keys] of s.objects ?? []) {
    const built = {};
    for (const k of keys) if (t[`${obj}.${k}`] !== undefined) built[k] = t[`${obj}.${k}`];
    if (Object.keys(built).length) row[obj] = built;
  }

  for (const stored of Object.keys(s.imageAlt ?? {})) {
    if (t[stored] !== undefined) row[stored] = t[stored];
  }

  /*
    Alt text only — never a second copy of the image asset. The photo is the
    same photo in every language; duplicating the reference would just be one
    more thing that can drift out of step with the gallery.
  */
  if (s.galleryAlt) {
    const alts = (doc[s.galleryAlt] ?? [])
      .filter((img) => img?._key && t[`${s.galleryAlt}.${img._key}.alt`] !== undefined)
      .map((img) => ({ _key: img._key, alt: t[`${s.galleryAlt}.${img._key}.alt`] }));
    if (alts.length) row.galleryAlts = alts;
  }

  return row;
}

/** Units, via the generic engine. Kept as named helpers for the scripts. */
export const extractUnit = (unit) => extractDoc("unit", unit);
export const rebuildUnit = (unit, t, locale, provenance) =>
  rebuildDoc("unit", unit, t, locale, provenance);

/** Sanity treats an id under `drafts.` as a draft — that is the whole mechanism. */
export function draftId(id) {
  return id.startsWith("drafts.") ? id : `drafts.${id}`;
}

/** The published id behind a draft id. */
export function publishedId(id) {
  return id.startsWith("drafts.") ? id.slice("drafts.".length) : id;
}

/*
  A placeholder is not a token.

  .env.example ships REPLACE_WITH_… values so the file documents what is needed.
  Once scripts load .env.local they will happily send a placeholder as a bearer
  token, get a 401, and report an empty dataset as "nothing to translate" — a
  wrong answer that looks like a valid one.
*/
export function usable(value) {
  return Boolean(value) && !/^REPLACE_WITH/i.test(value);
}
