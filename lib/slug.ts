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
