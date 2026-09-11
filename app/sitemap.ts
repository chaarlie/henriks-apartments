import type { MetadataRoute } from "next";
import { getUnitSlugs } from "@/lib/sanity.server";
import { absoluteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getUnitSlugs();
  return [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    ...slugs.map((slug) => ({
      url: absoluteUrl(`/apartments/${slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
