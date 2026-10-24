import { checkDimensions, ImageError } from "./image-format";
import type { CanvasEncoding } from "./worker-types";

export async function encodeOnCanvas(file: File): Promise<CanvasEncoding> {
  let bitmap: ImageBitmap | undefined;
  const canvas = document.createElement("canvas");
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const { width, height } = bitmap;
    checkDimensions(width, height);
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context)
      throw new ImageError(
        "PROCESSING_FAILED",
        "Your device could not allocate a canvas. Try a smaller image.",
      );
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    bitmap = undefined;
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else
          reject(
            new ImageError(
              "PROCESSING_FAILED",
              "The browser could not create a PNG. Retry with a smaller image.",
            ),
          );
      }, "image/png"),
    );
    return { blob, width, height };
  } finally {
    bitmap?.close();
    canvas.width = 0;
    canvas.height = 0;
  }
}
