/*
  The two halves of translation: pulling the strings out of a document, and
  putting translated ones back.

  The rule this file exists to enforce is that nothing outside it ever sees the
  shape of a Sanity document. `about` is Portable Text — a tree of blocks
  carrying _key, style, marks and markDefs — and asking a model for "the same
  JSON, in Spanish" is how bold vanishes, links detach from their markDefs and
  _keys get invented. So extract() flattens everything to a flat map of plain
  strings, and rebuild() walks the ORIGINAL document again and substitutes text
  into it. Structure is never authored twice, which makes breaking it impossible
  rather than unlikely.

  Five document types now need this, and five hand-written extract/rebuild pairs
  would be the same twenty lines copied with different field names — so each
  type declares WHAT is translatable in TYPES below and one engine does the
  walking. Adding a sixth type is a table entry.

  Keys are the path back to the value: "space.<_key>.title", "about.<blockKey>.2",
  "chips.3". Object arrays key on _key rather than on position, because
  reordering a gallery would otherwise silently reassign every alt text to the
  wrong photo.

  What is deliberately NOT translated: names, codes, slugs, prices, deposits,
  dates, spec, panoramas, icons and image assets. Those are the same fact in
  every language, and the moment a second copy exists one of them starts being
  wrong.
*/

import { createHash } from "node:crypto";

/**
 * What is translatable, per document type.
 *
 *   scalars      plain string/text fields
 *   stringArrays arrays of bare strings
 *   blocks       Portable Text fields
 *   rows         [arrayField, [translatable keys]] — objects carrying a _key
 *   nested       [objectField, arrayField, [keys]] — rows one level down
 *   objects      [objectField, [keys]] — a plain object of strings
 *   imageAlt     { <storedAs>: <sourceField> } for a single image's alt text
 *   galleryAlt   an image ARRAY whose alts translate, matched by _key
 */
export const TYPES = {
  unit: {
    scalars: ["tagline", "keywords", "saleNote"],
    stringArrays: ["chips"],
    blocks: ["about"],
    rows: [
      ["space", ["title", "desc"]],
      ["termsOverride", ["title", "desc"]],
    ],
    nested: [
      ["amenitiesOverride", "inside", ["label"]],
      ["amenitiesOverride", "building", ["label"]],
    ],
    imageAlt: { coverAlt: "coverImage" },
    galleryAlt: "gallery",
  },
  hero: {
    scalars: ["eyebrow", "headline", "sub"],
    // Values translate too: "Any length" is copy, and "4 min" survives the
    // instruction to leave numbers alone.
    rows: [["stats", ["value", "label"]]],
    imageAlt: { backgroundAlt: "background" },
  },
  location: {
    scalars: ["heading", "addressLine"],
    rows: [["distances", ["label", "value"]]],
  },
  siteSettings: {
    scalars: ["hostNote", "stayNote"],
    rows: [["propertyAmenities", ["title", "desc"]]],
    objects: [["seo", ["title", "description"]]],
  },
  stayDefaults: {
    rows: [["houseRules", ["title", "desc"]]],
    nested: [
      ["amenities", "inside", ["label"]],
      ["amenities", "building", ["label"]],
    ],
  },
};

const isText = (v) => typeof v === "string" && v.trim().length > 0;
const spec = (type) => TYPES[type] ?? {};

/* ── Portable Text ───────────────────────────────────────────────────────── */

function extractBlocks(out, field, blocks) {
  for (const block of blocks ?? []) {
    if (!block?._key || block._type !== "block") continue;
    (block.children ?? []).forEach((child, i) => {
      // Whitespace-only spans carry no meaning and round-trip badly.
      if (child?._type === "span" && isText(child.text)) {
        out[`${field}.${block._key}.${i}`] = child.text;
      }
    });
  }
}

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

function extractRows(out, prefix, rows, fields) {
  for (const row of rows ?? []) {
    if (!row?._key) continue;
    for (const f of fields) {
      if (isText(row[f])) out[`${prefix}.${row._key}.${f}`] = row[f];
    }
  }
}

function rebuildRows(prefix, rows, fields, t) {
  return (rows ?? []).map((row) => {
    const next = { ...row };
    for (const f of fields) {
      const v = t[`${prefix}.${row?._key}.${f}`];
      if (v !== undefined) next[f] = v;
    }
    return next;
  });
}

/* ── The engine ──────────────────────────────────────────────────────────── */

/** A document's translatable strings, keyed so rebuildDoc() can find its way home. */
export function extractDoc(type, doc) {
  const s = spec(type);
  const out = {};

  for (const f of s.scalars ?? []) if (isText(doc[f])) out[f] = doc[f];

  for (const f of s.stringArrays ?? []) {
    (doc[f] ?? []).forEach((v, i) => {
      if (isText(v)) out[`${f}.${i}`] = v;
    });
  }

  for (const f of s.blocks ?? []) extractBlocks(out, f, doc[f]);

  for (const [field, keys] of s.rows ?? []) extractRows(out, field, doc[field], keys);

  for (const [obj, field, keys] of s.nested ?? []) {
    extractRows(out, `${obj}.${field}`, doc[obj]?.[field], keys);
  }

  for (const [obj, keys] of s.objects ?? []) {
    for (const k of keys) if (isText(doc[obj]?.[k])) out[`${obj}.${k}`] = doc[obj][k];
  }

  for (const [stored, source] of Object.entries(s.imageAlt ?? {})) {
    if (isText(doc[source]?.alt)) out[stored] = doc[source].alt;
  }

  if (s.galleryAlt) extractRows(out, s.galleryAlt, doc[s.galleryAlt], ["alt"]);

  return out;
}

/**
 * The row to store in `<doc>.i18n[]` for one locale.
 *
 * Only fields that actually have content are set. An empty array here would be
 * worse than a missing one: the site reads translations with
 * `coalesce(t.about, about)`, and `coalesce` treats `[]` as a value, so an empty
 * translated array would shadow the English instead of falling back to it.
 */
export function rebuildDoc(type, doc, t, locale, { sourceHash, sourceRev }) {
  const s = spec(type);
  const row = { _type: `${type}Translation`, _key: locale, locale, sourceHash, sourceRev };

  for (const f of s.scalars ?? []) if (t[f] !== undefined) row[f] = t[f];

  for (const f of s.stringArrays ?? []) {
    const arr = (doc[f] ?? []).map((v, i) => t[`${f}.${i}`] ?? v);
    if (arr.length) row[f] = arr;
  }

  for (const f of s.blocks ?? []) {
    if (doc[f]?.length) row[f] = rebuildBlocks(f, doc[f], t);
  }

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

/**
 * A fingerprint of the English a translation was made from.
 *
 * This replaces comparing the document's _rev, which cannot work when
 * translations live ON the document: writing the Spanish rewrites it and bumps
 * its _rev, so a rev captured at extract time never matches again and every
 * translated document reports stale the moment it is published.
 *
 * Hashing only the extracted English strings is immune to that — the hash moves
 * when the English moves, and not when anything else about the document does.
 *
 * Keys are sorted so the hash does not depend on projection order.
 */
export function sourceHash(strings) {
  const canonical = JSON.stringify(
    Object.keys(strings)
      .sort()
      .map((k) => [k, strings[k]]),
  );
  return createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}

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
