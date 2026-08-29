import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Flat photography currently ships from /public; these patterns let the
    // JSON content layer point image fields at the Supabase bucket later
    // (the same shape a Sanity asset URL would take) without a code change.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "jdomxbzbovlnnlxoqngs.supabase.co",
        pathname: "/storage/v1/**",
      },
    ],
  },
};

export default nextConfig;
