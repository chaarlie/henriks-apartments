/**
 * Sizing helpers for Sanity photo URLs.
 *
 * `img()` in sanity.server.ts now returns the untransformed asset URL so
 * next/image can ask the CDN for exactly the width it needs. Anywhere the URL
 * is consumed *outside* next/image — link previews, structured data — it has to
 * carry its own size, because nothing else will add one.
 */
const CDN = "https://cdn.sanity.io/";

/**
 * Same asset, resized. Non-Sanity URLs are returned untouched.
 *
 * The default quality matches DEFAULT_QUALITY in sanity-image-loader.ts — see
 * the note there for why it is 75 rather than 90.
 */
export function sized(
  url: string,
  { width, height, quality = 75, crop = false }: { width: number; height?: number; quality?: number; crop?: boolean },
): string {
  if (!url.startsWith(CDN)) return url;
  const out = new URL(url);
  out.searchParams.set("w", String(width));
  if (height !== undefined) out.searchParams.set("h", String(height));
  out.searchParams.set("q", String(quality));
  out.searchParams.set("fit", crop ? "crop" : "max");
  out.searchParams.set("auto", "format");
  return out.toString();
}

/**
 * The picture WhatsApp, Facebook and Twitter show for a shared link: 1200×630
 * is their expected ratio, and a multi-megabyte original is often skipped.
 */
export function ogImage(url: string): string {
  return sized(url, { width: 1200, height: 630, quality: 85, crop: true });
}
