/*
  The two halves of translation: pulling the strings out of a unit, and putting
  translated ones back.

  The rule this file exists to enforce is that nothing outside it ever sees the
  shape of a Sanity document. `about` is Portable Text — a tree of blocks
  carrying _key, style, marks and markDefs — and asking a model for "the same
  JSON, in Spanish" is how bold vanishes, links detach from their markDefs and
  _keys get invented. So extract() flattens everything to a flat map of plain
  strings, and rebuild() walks the ORIGINAL document again and substitutes text
  into it. Structure is never authored twice, which makes breaking it impossible
  rather than unlikely.

  Keys are the path back to the value: "space.<_key>.title", "about.<blockKey>.2",
  "chips.3". Object arrays key on _key rather than on position, because
  reordering the gallery in the Studio would otherwise silently reassign every
  alt text to the wrong photo.

  What is deliberately NOT translated: name, code, slug, prices, deposits,
  dates, spec, panoramas and image assets. Those are the same fact in every
  language, and the moment a second copy exists one of them starts being wrong.
*/

import { createHash } from "node:crypto";

/** Whole-string fields outside any array. */
export const SCALAR_FIELDS = ["tagline", "keywords", "saleNote"];

/**
 * A fingerprint of the English a translation was made from.
 *
 * This replaces comparing the document's _rev, which cannot work when
 * translations live ON the unit: writing the Spanish rewrites the document and
 * bumps its _rev, so a rev captured at extract time never matches again and
 * every translated apartment reports stale the moment it is published.
 *
 * Hashing only the extracted English strings is immune to that — the hash moves
 * when the English moves, and not when anything else about the document does.
 * (The sibling project this pipeline came from gets away with _rev because its
 * posts translate into a SEPARATE document; its in-place case does no staleness
 * check at all.)
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

const isText = (v) => typeof v === "string" && v.trim().length > 0;

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

/* ── Units ───────────────────────────────────────────────────────────────── */

/** A unit's translatable strings, keyed so rebuildUnit() can find its way home. */
export function extractUnit(unit) {
  const out = {};

  for (const field of SCALAR_FIELDS) {
    if (isText(unit[field])) out[field] = unit[field];
  }

  (unit.chips ?? []).forEach((chip, i) => {
    if (isText(chip)) out[`chips.${i}`] = chip;
  });

  if (isText(unit.coverImage?.alt)) out["coverImage.alt"] = unit.coverImage.alt;
  extractRows(out, "gallery", unit.gallery, ["alt"]);

  extractBlocks(out, "about", unit.about);
  extractRows(out, "space", unit.space, ["title", "desc"]);
  extractRows(out, "terms", unit.termsOverride, ["title", "desc"]);
  extractRows(out, "amen.inside", unit.amenitiesOverride?.inside, ["label"]);
  extractRows(out, "amen.building", unit.amenitiesOverride?.building, ["label"]);

  return out;
}

/**
 * The row to store in `unit.i18n[]` for one locale.
 *
 * Only fields that actually have content are set. An empty array here would be
 * worse than a missing one: the site reads translations with
 * `coalesce(t.about, about)`, and `coalesce` treats `[]` as a value, so an empty
 * translated array would shadow the English instead of falling back to it.
 */
export function rebuildUnit(unit, t, locale, { sourceHash, sourceRev }) {
  const row = { _type: "unitTranslation", _key: locale, locale, sourceHash, sourceRev };

  for (const field of SCALAR_FIELDS) {
    if (t[field] !== undefined) row[field] = t[field];
  }

  const chips = (unit.chips ?? []).map((chip, i) => t[`chips.${i}`] ?? chip);
  if (chips.length) row.chips = chips;

  if (t["coverImage.alt"] !== undefined) row.coverAlt = t["coverImage.alt"];

  /*
    Alt text only — never a second copy of the image asset. The photo is the
    same photo in every language; duplicating the reference would just be one
    more thing that can drift out of step with the gallery.
  */
  const galleryAlts = (unit.gallery ?? [])
    .filter((img) => img?._key && t[`gallery.${img._key}.alt`] !== undefined)
    .map((img) => ({ _key: img._key, alt: t[`gallery.${img._key}.alt`] }));
  if (galleryAlts.length) row.galleryAlts = galleryAlts;

  if (unit.about?.length) row.about = rebuildBlocks("about", unit.about, t);
  if (unit.space?.length) row.space = rebuildRows("space", unit.space, ["title", "desc"], t);
  if (unit.termsOverride?.length) {
    row.termsOverride = rebuildRows("terms", unit.termsOverride, ["title", "desc"], t);
  }

  const inside = rebuildRows("amen.inside", unit.amenitiesOverride?.inside, ["label"], t);
  const building = rebuildRows("amen.building", unit.amenitiesOverride?.building, ["label"], t);
  if (inside.length || building.length) {
    row.amenitiesOverride = { inside, building };
  }

  return row;
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
