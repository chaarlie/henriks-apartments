import type { MetadataRoute } from "next";
import { getUnitSlugs } from "@/lib/sanity.server";
import { absoluteUrl } from "@/lib/site";
import { DEFAULT_LOCALE, HREFLANG, LOCALES, localePath } from "@/lib/locales";

/**
 * One entry per language, each carrying alternates so the XML says the same
 * thing the <link rel="alternate"> tags in the page head do — disagreeing with
 * yourself in two places is worse than saying nothing.
 *
 * Built from LOCALES, like the head tags, so adding a language needs no change
 * here and the two cannot drift apart.
 */
function everywhere(path: string, priority: number): MetadataRoute.Sitemap {
  return LOCALES.map((locale) => ({
    url: absoluteUrl(localePath(locale, path)),
    changeFrequency: "weekly" as const,
    priority,
    alternates: {
      languages: {
        ...Object.fromEntries(
          LOCALES.map((l) => [HREFLANG[l], absoluteUrl(localePath(l, path))]),
        ),
        "x-default": absoluteUrl(localePath(DEFAULT_LOCALE, path)),
      },
    },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getUnitSlugs();
  return [
    ...everywhere("/", 1),
    ...slugs.flatMap((slug) => everywhere(`/apartments/${slug}`, 0.8)),
  ];
}
