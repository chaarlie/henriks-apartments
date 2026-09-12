import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
