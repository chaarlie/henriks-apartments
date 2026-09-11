/**
 * 360° panoramas live in the Supabase bucket `henriks-apartments` (the source of
 * truth). Tour stops store a bucket object path (e.g. "101/101-living-room.JPG");
 * the site serves them through Supabase's on-the-fly render endpoint, downscaled
 * to a 2:1 equirectangular ~200 KB frame — NEVER the ~6 MB originals.
 */
export const SUPABASE_PROJECT_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://jdomxbzbovlnnlxoqngs.supabase.co";

export const PANO_BUCKET = "henriks-apartments";

const RENDER_BASE = `${SUPABASE_PROJECT_URL}/storage/v1/render/image/public/${PANO_BUCKET}`;

/** Bucket object path → downscaled equirectangular render URL. */
export function panoramaUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path; // already a full URL
  const clean = path.replace(/^\/+/, "");
  return `${RENDER_BASE}/${clean}?width=2048&height=1024&resize=contain&quality=80`;
}
