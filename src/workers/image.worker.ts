/// <reference lib="webworker" />
import {
  ImageError,
  inspectFormat,
  LIMITS,
  stripReviewedEncoderMetadata,
  verifyPng,
} from "../lib/image-format";
import { inspectMetadata } from "../lib/metadata";
import type { WorkerReply, WorkerRequest } from "../lib/worker-types";

const scope = self as unknown as DedicatedWorkerGlobalScope;
scope.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  const { jobId, operation, file, encoded } = data;
  const reply = (data: WorkerReply) => scope.postMessage(data);
  let bitmap: ImageBitmap | undefined;
  let canvas: OffscreenCanvas | undefined;
  try {
    if (!(file instanceof Blob) || file.size > LIMITS.fileBytes)
      throw new ImageError(
        "FILE_TOO_LARGE",
        "Each image must be 20 MiB or smaller.",
      );
    const bytes = new Uint8Array(await file.arrayBuffer());
    const info = inspectFormat(bytes);
    if (operation === "inspect") {
      const inspection = await inspectMetadata(bytes);
      reply({ jobId, kind: "inspected", info, inspection });
      return;
    }
    if (operation !== "clean")
      throw new ImageError(
        "PROCESSING_FAILED",
        "Unknown processing operation.",
      );
    reply({ jobId, kind: "progress", status: "processing" });
    let width: number, height: number, blob: Blob;
    if (encoded) {
      ({ width, height, blob } = encoded);
      if (!(
        (width === info.width && height === info.height) ||
        (width === info.height && height === info.width)
      ))
        throw new ImageError(
          "VERIFICATION_FAILED",
          "Output dimensions changed unexpectedly.",
        );
    } else {
      if (
        typeof createImageBitmap !== "function" ||
        typeof OffscreenCanvas !== "function"
      )
        throw new ImageError(
          "BROWSER_UNSUPPORTED",
          "Your browser cannot process images in its worker. Use a current browser.",
        );
      bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      if (bitmap.width * bitmap.height > LIMITS.pixels)
        throw new ImageError(
          "IMAGE_TOO_LARGE",
          "This image exceeds the 24 million pixel limit.",
        );
      if (bitmap.width * bitmap.height !== info.width * info.height)
        throw new ImageError(
          "PROCESSING_FAILED",
          "The decoded image dimensions do not match its header.",
        );
      canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const context = canvas.getContext("2d", { alpha: true });
      if (!context)
        throw new ImageError(
          "PROCESSING_FAILED",
          "Your device could not allocate an image canvas. Try a smaller image.",
        );
      context.drawImage(bitmap, 0, 0);
      width = bitmap.width;
      height = bitmap.height;
      bitmap.close();
      bitmap = undefined;
      blob = await canvas.convertToBlob({ type: "image/png" });
      canvas.width = 0;
      canvas.height = 0;
      canvas = undefined;
    }
    if (!blob.size || blob.type !== "image/png")
      throw new ImageError(
        "PROCESSING_FAILED",
        "The browser could not create a PNG. Retry or choose a smaller image.",
      );
    reply({ jobId, kind: "progress", status: "verifying" });
    const original = new Uint8Array(await blob.arrayBuffer());
    const output = stripReviewedEncoderMetadata(original);
    verifyPng(output, { width, height });
    try {
      const inspection = await inspectMetadata(output);
      if (inspection.count) throw new Error("Output fields detected");
    } catch {
      throw new ImageError(
        "VERIFICATION_FAILED",
        "Output metadata could not be verified. Download is blocked.",
      );
    }
    if (output !== original)
      blob = new Blob([output.buffer as ArrayBuffer], { type: "image/png" });
    reply({ jobId, kind: "cleaned", blob, width, height });
  } catch (error) {
    const known = error instanceof ImageError;
    reply({
      jobId,
      kind: "failed",
      code: known ? error.code : "PROCESSING_FAILED",
      message: known
        ? error.message
        : "This image could not be processed. It may be damaged or exceed your device’s available memory. Retry or remove it.",
    });
  } finally {
    bitmap?.close();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
};
