import type { MediaImage } from "@/lib/admin/types";

/**
 * Promote a gallery photo to the cover, by EXCHANGE rather than assignment.
 *
 * The old cover takes the chosen photo's place in the gallery. A plain assignment
 * would drop it off the site altogether: `coverImage` is its own field, so a cover
 * that is not also a gallery entry exists nowhere else — and none of the four
 * covers is in its gallery today, so this is the normal case, not the edge one.
 *
 * Swapping keeps every photo, keeps the gallery the same length, keeps positions
 * stable, and is undone by clicking the same button on the photo that moved.
 *
 * With no previous cover there is nothing to swap in, so the chosen photo simply
 * leaves the gallery — it is about to lead the strip as the cover, and leaving it
 * in both places would list it twice in the editor.
 *
 * Pure, and separate from the editor, because "no photo is silently lost" is the
 * invariant worth pinning.
 */
export function promoteToCover(
  gallery: MediaImage[],
  cover: MediaImage | null,
  index: number,
): { cover: MediaImage | null; gallery: MediaImage[] } {
  const chosen = gallery[index];
  if (!chosen) return { cover, gallery };
  return {
    cover: chosen,
    gallery: cover
      ? gallery.map((g, j) => (j === index ? cover : g))
      : gallery.filter((_, j) => j !== index),
  };
}

/** A translation row, as far as photo alt text is concerned. */
export type AltRow = Record<string, unknown> & {
  /** One caption per photo, matched to it by the Sanity array key — never by position. */
  galleryAlts?: { _key?: string; alt?: string }[];
};

/**
 * Strip translated alt text that no longer describes the photo it points at.
 *
 * Both cases leave the Spanish page captioning the WRONG picture rather than
 * merely missing one, which is worse: nothing falls back, and nothing looks
 * broken.
 *
 *   1. The cover changed. `coverAlt` is one string meaning "whatever the cover
 *      is", so a new cover silently inherits the old photo's caption. This
 *      predates the Make cover button — replacing the cover photo has always done
 *      it.
 *   2. A photo left the gallery. Its `galleryAlts` entry is keyed by a `_key` that
 *      is no longer present, so it lingers describing nothing — and is how a
 *      reused key later picks up a stranger's caption.
 *
 * Clearing, not moving: the English editor and the translation editor are separate
 * saves, and a photo promoted to cover crosses between two different stores
 * (`galleryAlts[key]` and `coverAlt`). Falling back to English is honest; carrying
 * the wrong sentence across is not.
 *
 * Returns null when nothing needed changing, so an ordinary save writes nothing.
 */
export function pruneStaleAlts(
  rows: AltRow[],
  opts: { coverChanged: boolean; galleryKeys: Set<string> },
): AltRow[] | null {
  if (!rows.length) return null;
  let touched = false;

  const next = rows.map((row) => {
    const out: AltRow = { ...row };
    if (opts.coverChanged && out.coverAlt) {
      delete out.coverAlt;
      touched = true;
    }
    if (Array.isArray(row.galleryAlts)) {
      const kept = row.galleryAlts.filter((a) => a?._key && opts.galleryKeys.has(a._key));
      if (kept.length !== row.galleryAlts.length) {
        out.galleryAlts = kept;
        touched = true;
      }
    }
    return out;
  });

  return touched ? next : null;
}
