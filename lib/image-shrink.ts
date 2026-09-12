/**
 * Last-resort resize for a photo the server refused to accept whole.
 *
 * Photos upload at their original size and quality. A serverless request body
 * is capped around 4.5 MB, though, and phone photos are routinely 3–12 MB — so
 * when one comes back as "Request Entity Too Large" this shrinks it just enough
 * to fit rather than failing the upload. Deliberately generous: 3500px still
 * exceeds anything the site displays.
 *
 * Anything the browser can't decode (HEIC in most browsers) is returned as-is
 * so the server can answer for it.
 */
const MAX_EDGE = 3500;
const QUALITY = 0.92;
/** Below this, resizing costs more than it saves. */
const PASS_THROUGH_BYTES = 1_200_000;

export async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < PASS_THROUGH_BYTES) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY),
    );
    // If the "smaller" version isn't smaller, keep the original.
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
}
