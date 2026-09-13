/**
 * The languages this site publishes, and the small vocabulary the rest of the
 * app needs about them.
 *
 * Single source of truth on purpose. This one array drives the translation
 * scripts, `generateStaticParams`, the canonical/hreflang tags, the sitemap and
 * the language switcher. Building all of them from the same list is what keeps
 * hreflang reciprocal — every page listing every other — which is the part
 * hand-written alternates reliably get wrong.
 *
 * Adding a language is a line here, then `npm run i18n:extract` and
 * `npm run i18n:translate`.
 *
 * Imported by BOTH the Next app and `scripts/i18n/*.mjs`. Node strips the type
 * annotations when a script imports it, so keep this file to erasable syntax
 * only — no enums, no parameter properties, nothing that needs a compiler to
 * emit real code.
 */
export const LOCALES = ["en", "es"] as const;

export type Locale = (typeof LOCALES)[number];

/** The language served on unprefixed URLs (`/`, not `/en`). */
export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/**
 * The tag hreflang wants.
 *
 * Plain "es" rather than "es-DO": the people who rent these apartments search
 * in Spanish from all over — Santo Domingo, but also Madrid and Buenos Aires
 * planning a move — and a region tag would narrow the targeting to one country
 * for no gain. Narrow it later if the search data says otherwise; it is one
 * value, and every tag on the site is built from it.
 */
export const HREFLANG: Record<Locale, string> = {
  en: "en",
  es: "es",
};

/**
 * A language's own name, for the switcher.
 *
 * The endonym, always — someone looking for their language recognises it
 * written the way they write it, so "Español" and never "Spanish".
 */
export const LANGUAGE_NAME: Record<Locale, string> = {
  en: "English",
  es: "Español",
};
