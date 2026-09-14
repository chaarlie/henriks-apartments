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
 * Any path, under a given language.
 *
 * English carries no prefix — `/apartments/x`, not `/en/apartments/x` — so the
 * URLs already shared over WhatsApp and Facebook keep working. Every other
 * language is prefixed. Both spellings resolve (a rewrite serves the unprefixed
 * path from the same route tree), so the choice here is which one the site
 * *emits*, and emitting one form consistently is what keeps canonicals honest.
 */
export function localePath(locale: Locale, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return clean;
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}

/**
 * Split a browser path into the language it is being viewed in and the path
 * without that prefix.
 *
 * The inverse of localePath, and the way client components learn the locale:
 * `next/root-params` is server-only, and threading a prop down through every
 * client component that happens to render a link is exactly the kind of sweep
 * that misses one. The rewrite serving English unprefixed leaves the browser
 * path matching the address bar, so the pathname is a reliable source.
 *
 * "/en/x" resolves to English at "/x" — that URL exists but is not the one the
 * site emits, so this normalises it back to the canonical unprefixed form.
 */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const [, first = "", ...rest] = pathname.split("/");
  if (isLocale(first)) {
    const path = `/${rest.join("/")}`;
    return { locale: first, path: path === "/" ? "/" : path };
  }
  return { locale: DEFAULT_LOCALE, path: pathname || "/" };
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

/**
 * canonical + hreflang for a page that exists at the same path in every
 * language — which here is every page, since apartments keep one slug.
 *
 * The canonical has to carry the language prefix. A Spanish page claiming
 * `/apartments/x` as its canonical tells Google the Spanish catalogue is a
 * duplicate of the English one — the whole translated half of the site asking
 * not to be indexed. Building both tags from one function is what stops the two
 * drifting apart.
 *
 * Generating the alternates from LOCALES also makes them reciprocal by
 * construction: every page lists every other, which is the part hand-written
 * hreflang reliably gets wrong.
 *
 * x-default points at English — what someone whose language we do not publish
 * should land on.
 */
export function localeAlternates(locale: Locale, path: string) {
  return {
    canonical: localePath(locale, path),
    languages: {
      ...Object.fromEntries(LOCALES.map((l) => [HREFLANG[l], localePath(l, path)])),
      "x-default": localePath(DEFAULT_LOCALE, path),
    },
  };
}
