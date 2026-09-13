"use client";

/**
 * next/image loader for Sanity-hosted photos.
 *
 * Without this, Next fetches whatever URL we hand it and re-encodes it — so a
 * photo already flattened to 1600px/q80 by the Sanity CDN gets compressed a
 * second time. Pointing the loader at the CDN means the original asset is
 * resized exactly once, at the width the layout actually asks for.
 *
 * `fit=max` never enlarges past the original, and `auto=format` serves AVIF or
 * WebP where the browser supports it. Anything not on the Sanity CDN (Supabase
 * panoramas, files in /public) is returned untouched.
 */
const DEFAULT_QUALITY = 90;

export default function sanityImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  if (!src.startsWith("https://cdn.sanity.io/")) return src;

  const url = new URL(src);
  url.searchParams.set("w", String(width));
  url.searchParams.set("q", String(quality ?? DEFAULT_QUALITY));
  url.searchParams.set("fit", "max");
  url.searchParams.set("auto", "format");
  return url.toString();
}
