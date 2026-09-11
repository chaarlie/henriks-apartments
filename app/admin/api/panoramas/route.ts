import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/session";
import { SUPABASE_PROJECT_URL, PANO_BUCKET } from "@/lib/panorama";

export const runtime = "nodejs";

const IMAGE_RE = /\.(jpe?g|png|webp)$/i;

// Lists image objects in the Supabase bucket so the tour editor can offer a
// picker. Needs SUPABASE_ANON_KEY (public bucket listing still requires an
// apikey header). Returns [] with a hint when the key isn't configured.
async function listFolder(prefix: string, key: string, depth = 0): Promise<string[]> {
  if (depth > 3) return [];
  const res = await fetch(
    `${SUPABASE_PROJECT_URL}/storage/v1/object/list/${PANO_BUCKET}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ prefix, limit: 200, sortBy: { column: "name", order: "asc" } }),
      cache: "no-store",
    },
  );
  if (!res.ok) return [];
  const items: { name: string; id: string | null }[] = await res.json();
  const paths: string[] = [];
  for (const it of items) {
    const full = prefix + it.name;
    if (it.id === null) {
      // folder → recurse
      paths.push(...(await listFolder(full + "/", key, depth + 1)));
    } else if (IMAGE_RE.test(it.name)) {
      paths.push(full);
    }
  }
  return paths;
}

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  const key = process.env.SUPABASE_ANON_KEY;
  if (!key) {
    return NextResponse.json({
      panoramas: [],
      error: "SUPABASE_ANON_KEY not set — type the bucket path manually.",
    });
  }

  try {
    const paths = await listFolder("", key);
    return NextResponse.json({ panoramas: paths });
  } catch (e) {
    return NextResponse.json({
      panoramas: [],
      error: e instanceof Error ? e.message : "List failed",
    });
  }
}
