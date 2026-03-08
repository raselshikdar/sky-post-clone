/**
 * Convert any image file to compressed AVIF format.
 * Target max size: 100KB. Falls back to lower quality if needed.
 */
export async function convertToAvif(file: File, maxSizeKB = 100): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  // Try progressively lower quality until under maxSizeKB
  for (let quality = 0.85; quality >= 0.1; quality -= 0.1) {
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/avif", quality)
    );
    if (blob.size <= maxSizeKB * 1024 || quality <= 0.15) {
      // If still too large at min quality, resize
      if (blob.size > maxSizeKB * 1024) {
        return await resizeAndConvert(canvas, maxSizeKB);
      }
      const name = file.name.replace(/\.[^.]+$/, "") + ".avif";
      return new File([blob], name, { type: "image/avif" });
    }
  }

  // Fallback (shouldn't reach here)
  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/avif", 0.1)
  );
  const name = file.name.replace(/\.[^.]+$/, "") + ".avif";
  return new File([blob], name, { type: "image/avif" });
}

/** @deprecated Use convertToAvif instead */
export const convertToWebP = convertToAvif;

async function resizeAndConvert(
  sourceCanvas: HTMLCanvasElement,
  maxSizeKB: number
): Promise<File> {
  let scale = 0.9;
  while (scale > 0.1) {
    const w = Math.round(sourceCanvas.width * scale);
    const h = Math.round(sourceCanvas.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(sourceCanvas, 0, 0, w, h);
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/avif", 0.7)
    );
    if (blob.size <= maxSizeKB * 1024) {
      return new File([blob], "image.avif", { type: "image/avif" });
    }
    scale -= 0.1;
  }
  // Final fallback at tiny size
  const blob = await new Promise<Blob>((resolve) =>
    sourceCanvas.toBlob((b) => resolve(b!), "image/avif", 0.1)
  );
  return new File([blob], "image.avif", { type: "image/avif" });
}
