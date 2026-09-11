/** Production origin — canonical URLs, the sitemap, robots.txt and structured data all point here. */
export const SITE_URL = "https://sosuastudios.com";

/** Absolute URL on the production origin. */
export const absoluteUrl = (path: string) => new URL(path, SITE_URL).toString();
