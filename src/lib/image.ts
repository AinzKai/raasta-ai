/**
 * Re-encode a photo in the browser before upload: downscale and redraw onto a
 * canvas. This strips EXIF metadata (including GPS location) and keeps the
 * upload small. Returns a JPEG data URL.
 */
export async function prepareImage(file: File, maxSide = 1600, quality = 0.82): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("unsupported");
  if (file.size > 15 * 1024 * 1024) throw new Error("too-large");

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no-canvas");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", quality);
}
