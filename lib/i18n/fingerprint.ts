/*
  Pulling a document's translatable strings out, and fingerprinting them.

  Split from ./schema.ts because this half needs node:crypto: the table of what
  is translatable must stay importable from the browser bundle, and this must
  never reach it. Server code and the translation scripts only.

  Keys are the path back to the value: "space.<_key>.title", "about.<blockKey>.2",
  "chips.3". Object arrays key on _key rather than on position, because
  reordering a gallery would otherwise silently reassign every alt text to the
  wrong photo.

  Both the scripts and /admin extract, for different reasons. The scripts do it
  to send strings off for translation; the admin does it to fingerprint the
  English and compare that against what each translation row was written from.
  Rebuilding a document from translated strings stays the scripts' job alone
  (rebuildDoc in scripts/i18n/lib.mjs) — the admin edits structured form state
  and writes the row directly.

  Erasable syntax only: scripts/i18n/*.mjs import this and Node strips the types.
*/

import { createHash } from "node:crypto";
import { TYPES, type TranslatableSpec } from "./schema.ts";

/** A Sanity document as GROQ returns it: untyped JSON. */
export type RawDoc = Record<string, unknown>;

interface RawBlock {
  _type?: string;
  _key?: string;
  children?: { _type?: string; text?: string }[];
}

interface RawRow {
  _key?: string;
  [field: string]: unknown;
}

const isText = (v: unknown): boolean => typeof v === "string" && v.trim().length > 0;

const spec = (type: string): TranslatableSpec => TYPES[type] ?? {};

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
 * Keys are sorted so the hash does not depend on projection order. That is also
 * what lets /admin compute the same hash from its own narrower projection as the
 * scripts get from the whole document.
 */
export function sourceHash(strings: Record<string, string>): string {
  const canonical = JSON.stringify(
    Object.keys(strings)
      .sort()
      .map((k) => [k, strings[k]]),
  );
  return createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}

function extractBlocks(
  out: Record<string, string>,
  field: string,
  blocks: RawBlock[] | undefined,
): void {
  for (const block of blocks ?? []) {
    if (!block?._key || block._type !== "block") continue;
    (block.children ?? []).forEach((child, i) => {
      // Whitespace-only spans carry no meaning and round-trip badly.
      if (child?._type === "span" && isText(child.text)) {
        out[`${field}.${block._key}.${i}`] = child.text as string;
      }
    });
  }
}

function extractRows(
  out: Record<string, string>,
  prefix: string,
  rows: RawRow[] | undefined,
  fields: string[],
): void {
  for (const row of rows ?? []) {
    if (!row?._key) continue;
    for (const f of fields) {
      if (isText(row[f])) out[`${prefix}.${row._key}.${f}`] = row[f] as string;
    }
  }
}

/** A document's translatable strings, keyed so rebuildDoc() can find its way home. */
export function extractDoc(type: string, doc: RawDoc): Record<string, string> {
  const s = spec(type);
  const out: Record<string, string> = {};

  for (const f of s.scalars ?? []) {
    if (isText(doc[f])) out[f] = doc[f] as string;
  }

  for (const f of s.stringArrays ?? []) {
    ((doc[f] as unknown[]) ?? []).forEach((v, i) => {
      if (isText(v)) out[`${f}.${i}`] = v as string;
    });
  }

  for (const f of s.blocks ?? []) {
    extractBlocks(out, f, doc[f] as RawBlock[] | undefined);
  }

  for (const [field, keys] of s.rows ?? []) {
    extractRows(out, field, doc[field] as RawRow[] | undefined, keys);
  }

  for (const [obj, field, keys] of s.nested ?? []) {
    const parent = doc[obj] as RawDoc | undefined;
    extractRows(out, `${obj}.${field}`, parent?.[field] as RawRow[] | undefined, keys);
  }

  for (const [obj, keys] of s.objects ?? []) {
    const parent = doc[obj] as RawDoc | undefined;
    for (const k of keys) {
      const v = parent?.[k];
      if (isText(v)) out[`${obj}.${k}`] = v as string;
    }
  }

  for (const [stored, source] of Object.entries(s.imageAlt ?? {})) {
    const alt = (doc[source] as RawDoc | undefined)?.alt;
    if (isText(alt)) out[stored] = alt as string;
  }

  if (s.galleryAlt) {
    extractRows(out, s.galleryAlt, doc[s.galleryAlt] as RawRow[] | undefined, ["alt"]);
  }

  return out;
}
