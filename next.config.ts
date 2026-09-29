import type { NextConfig } from "next";
import { DEFAULT_LOCALE } from "./lib/locales";

const nextConfig: NextConfig = {
  // Nothing gains from telling every client which framework serves this.
  poweredByHeader: false,
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
  /*
    www → apex, permanently.

    Both hostnames served 200, so every page existed at two addresses — the
    duplicate-content case an auditor flags first, and it splits whatever link
    equity the site earns. The canonical tag already pointed at the apex from
    both, but a canonical is a hint and a redirect is a directive.

    Done here rather than in the host's dashboard so it lives in version control
    and cannot be undone by someone clicking around. Redirects run BEFORE the
    rewrites below, and the destination host differs from the matched one, so
    there is no loop.

    The host is hardcoded rather than read from SITE_URL because `has` matches a
    literal — and getting it wrong fails loudly (www stops resolving) rather than
    quietly.
  */
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.sosuastudios.com" }],
        destination: "https://sosuastudios.com/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      { source: "/", destination: `/${DEFAULT_LOCALE}` },
      { source: "/apartments/:slug", destination: `/${DEFAULT_LOCALE}/apartments/:slug` },
    ];
  },
  /*
    Headroom for /admin photo uploads.

    proxy.ts matches /admin/:path*, so Next clones and buffers those request
    bodies to make them readable twice. Past this ceiling it does not refuse the
    request — it hands the route the first N bytes, and the upload route's
    multipart parse then fails on a body cut in half. The default is 10MB, which
    ordinary phone photos clear.

    Photos are shrunk client-side well below this (see SHRINK_ABOVE_BYTES in
    app/admin/AdminApp.tsx); this covers the ones the browser cannot decode to
    shrink, like HEIC straight off an iPhone.
  */
  experimental: {
    proxyClientMaxBodySize: "25mb",
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
