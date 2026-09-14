import type { NextConfig } from "next";
import { DEFAULT_LOCALE } from "./lib/locales";

const nextConfig: NextConfig = {
  /*
    English has no prefix; every other language does.

    Every route lives under app/[lang], so "/" and "/apartments/x" have no file
    to match. These rewrite them to the default language internally — the URL in
    the address bar is untouched, the page renders as English. One set of route
    files, and the English URLs already shared over WhatsApp and Facebook keep
    working.

    Rewrites rather than redirects, deliberately: a redirect would make /en/… the
    real address, which is a second URL for a page that already has one.

    Done here rather than in proxy.ts on purpose — that file is the /admin auth
    gate, and locale routing has no business sharing a matcher with it.
  */
  async rewrites() {
    return [
      { source: "/", destination: `/${DEFAULT_LOCALE}` },
      { source: "/apartments/:slug", destination: `/${DEFAULT_LOCALE}/apartments/:slug` },
    ];
  },
  images: {
    // Sanity's CDN does the resizing, from the original, once — see
    // lib/sanity-image-loader.ts. Other hosts pass through untouched.
    loader: "custom",
    loaderFile: "./lib/sanity-image-loader.ts",
    // Flat photography currently ships from /public; these patterns let the
    // JSON content layer point image fields at the Supabase bucket later
    // (the same shape a Sanity asset URL would take) without a code change.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "jdomxbzbovlnnlxoqngs.supabase.co",
        pathname: "/storage/v1/**",
      },
      {
        // Sanity image asset CDN (unit galleries, hero, panoramas).
        protocol: "https",
        hostname: "cdn.sanity.io",
        pathname: "/images/**",
      },
    ],
  },
};

export default nextConfig;
