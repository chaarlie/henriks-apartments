import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getWriteClient } from "@/sanity/lib/writeClient";
import { urlFor } from "@/sanity/lib/image";

export const runtime = "nodejs";

// Uploads one image to the Sanity asset pipeline and returns its reference +
// a cropped thumbnail URL. Admin-only; the write token never leaves the server.
export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Not an image" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const asset = await getWriteClient().assets.upload("image", buffer, {
      filename: file.name,
    });
    return NextResponse.json({
      ref: asset._id,
      alt: "",
      url: urlFor(asset._id).width(300).height(200).fit("crop").url(),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 },
    );
  }
}
