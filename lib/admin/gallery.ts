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
