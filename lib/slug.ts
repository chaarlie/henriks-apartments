/**
 * Page addresses have to survive being a URL: lowercase, no spaces, no accents,
 * no punctuation beyond hyphens. Henrik types whatever he likes in /admin and
 * this is what actually gets stored, so an apartment can never end up at a
 * broken address like "/apartments/Apartment 1".
 */
export function toSlug(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents: "Sosúa" → "Sosua"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "");
}

/**
 * The addresses an apartment should still answer to after moving to `next`.
 *
 * Slugs are safe to change because the old ones keep resolving: `saveUnit`
 * stores this list, and the apartment page permanently redirects anything on it
 * to the current address. This is the bookkeeping that makes that true.
 *
 * Two rules, both of which are bugs if broken:
 *
 *   - `next` is removed from the list. Renaming a → b → a would otherwise leave
 *     "a" recorded as its own former address, and the page would redirect to
 *     itself until the browser gave up.
 *   - the list is deduplicated and order-stable, so repeated saves at the same
 *     address don't grow it without bound.
 *
 * Pure on purpose — the I/O lives in saveUnit, the invariants live here.
 */
export function formerSlugs(
  current: string | null | undefined,
  previous: readonly string[] | null | undefined,
  next: string,
): string[] {
  return [...new Set([...(previous ?? []), ...(current ? [current] : [])])].filter(
    (s) => s && s !== next,
  );
}
