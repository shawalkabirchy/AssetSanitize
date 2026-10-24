export const LIMITS = {
  files: 10,
  fileBytes: 20 * 1024 ** 2,
  totalBytes: 100 * 1024 ** 2,
  pixels: 24_000_000,
} as const;

export class ImageError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export type ImageInfo = { type: "jpeg" | "png"; width: number; height: number };
export type PngChunk = {
  type: string;
  data: Uint8Array;
  offset: number;
  end: number;
};
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const OUTPUT_CHUNKS = new Set([
  "IHDR",
  "PLTE",
  "IDAT",
  "IEND",
  "tRNS",
  "sRGB",
  "gAMA",
  "cHRM",
  "pHYs",
]);
const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++)
    value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  return value >>> 0;
});

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const value of bytes) crc = CRC_TABLE[(crc ^ value) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function invalid(
  message = "The image structure is corrupt or incomplete.",
): never {
  throw new ImageError("FILE_INVALID", message);
}

export function checkDimensions(width: number, height: number) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1
  )
    invalid();
  if (width * height > LIMITS.pixels)
    throw new ImageError(
      "IMAGE_TOO_LARGE",
      "This image exceeds the 24 million pixel limit.",
    );
}

export function readPng(
  bytes: Uint8Array,
  output = false,
): { info: ImageInfo; chunks: PngChunk[] } {
  if (!PNG_SIGNATURE.every((value, i) => bytes[i] === value))
    invalid("This is not a PNG file.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunks: PngChunk[] = [];
  let offset = 8;
  let width = 0,
    height = 0,
    color = -1,
    paletteEntries = 0;
  let seenData = false,
    dataEnded = false,
    ended = false;
  const seen = new Set<string>();
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) invalid();
    const length = view.getUint32(offset);
    const end = offset + 12 + length;
    if (end > bytes.length) invalid();
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    if (!/^[A-Za-z]{4}$/.test(type)) invalid();
    if (crc32(bytes.subarray(offset + 4, end - 4)) !== view.getUint32(end - 4))
      invalid("The PNG contains a damaged chunk checksum.");
    if (["acTL", "fcTL", "fdAT"].includes(type))
      throw new ImageError(
        "FILE_ANIMATED",
        "Animated PNG is not supported. Choose a static JPEG or PNG.",
      );
    if (output && !OUTPUT_CHUNKS.has(type))
      throw new ImageError(
        "VERIFICATION_FAILED",
        "The encoder produced a chunk that could not be verified as safe.",
      );
    if (!chunks.length && type !== "IHDR") invalid();
    const data = bytes.subarray(offset + 8, end - 4);
    if (type === "IHDR") {
      if (seen.has(type) || length !== 13) invalid();
      width = view.getUint32(offset + 8);
      height = view.getUint32(offset + 12);
      checkDimensions(width, height);
      color = data[9];
      const depths: Record<number, number[]> = {
        0: [1, 2, 4, 8, 16],
        2: [8, 16],
        3: [1, 2, 4, 8],
        4: [8, 16],
        6: [8, 16],
      };
      if (
        !depths[color]?.includes(data[8]) ||
        data[10] !== 0 ||
        data[11] !== 0 ||
        data[12] > 1
      )
        invalid();
    } else if (type === "PLTE") {
      if (
        seen.has(type) ||
        seenData ||
        length < 3 ||
        length > 768 ||
        length % 3 ||
        [0, 4].includes(color)
      )
        invalid();
      paletteEntries = length / 3;
    } else if (type === "IDAT") {
      if (dataEnded || (color === 3 && !paletteEntries)) invalid();
      seenData = true;
    } else if (type === "IEND") {
      if (length || !seenData || end !== bytes.length) invalid();
      ended = true;
    } else {
      if (seenData) dataEnded = true;
      if (type.charCodeAt(0) < 97)
        invalid("The PNG contains an unsupported critical chunk.");
      const fixedLengths: Record<string, number> = {
        sRGB: 1,
        gAMA: 4,
        cHRM: 32,
        pHYs: 9,
      };
      if (
        type in fixedLengths &&
        (seen.has(type) || length !== fixedLengths[type] || seenData)
      )
        invalid();
      if (
        type === "tRNS" &&
        (seen.has(type) ||
          seenData ||
          ![0, 2, 3].includes(color) ||
          (color === 0 && length !== 2) ||
          (color === 2 && length !== 6) ||
          (color === 3 && (!paletteEntries || length > paletteEntries)))
      )
        invalid();
    }
    seen.add(type);
    chunks.push({ type, data, offset, end });
    offset = end;
  }
  if (!ended) invalid();
  return { info: { type: "png", width, height }, chunks };
}

function readJpeg(bytes: Uint8Array): ImageInfo {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;
  let info: ImageInfo | undefined;
  const sof = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
    0xcf,
  ]);
  while (offset < bytes.length) {
    if (bytes[offset++] !== 0xff) invalid();
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xd9) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) invalid();
    const length = view.getUint16(offset);
    if (length < 2 || offset + length > bytes.length) invalid();
    if (sof.has(marker)) {
      if (length < 8 || info) invalid();
      const height = view.getUint16(offset + 3),
        width = view.getUint16(offset + 5);
      checkDimensions(width, height);
      info = { type: "jpeg", width, height };
    }
    if (marker === 0xda) {
      let hasEnd = false;
      for (let i = offset + length; i < bytes.length - 1; i++) {
        if (bytes[i] === 0xff && bytes[i + 1] === 0xd9) {
          hasEnd = true;
          break;
        }
      }
      if (!info || !hasEnd) invalid();
      return info;
    }
    offset += length;
  }
  return invalid();
}

export function inspectFormat(bytes: Uint8Array): ImageInfo {
  if (bytes.length > LIMITS.fileBytes)
    throw new ImageError(
      "FILE_TOO_LARGE",
      "Each image must be 20 MiB or smaller.",
    );
  if (PNG_SIGNATURE.every((value, i) => bytes[i] === value))
    return readPng(bytes).info;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return readJpeg(bytes);
  throw new ImageError(
    "FILE_UNSUPPORTED",
    "Only static JPEG and PNG images are supported. File names do not determine the format.",
  );
}

export function verifyPng(
  bytes: Uint8Array,
  expected: { width: number; height: number },
) {
  try {
    const { info } = readPng(bytes, true);
    if (info.width !== expected.width || info.height !== expected.height)
      invalid("Output dimensions changed unexpectedly.");
  } catch {
    throw new ImageError(
      "VERIFICATION_FAILED",
      "Failed verification. This output is not available for download.",
    );
  }
}

export function stripReviewedEncoderMetadata(bytes: Uint8Array) {
  const { chunks } = readPng(bytes);
  const reviewed = chunks.filter(
    (chunk) => chunk.type === "deBG" || chunk.type === "sBIT",
  );
  if (!reviewed.length) return bytes;
  // Firefox adds a session-keyed canvas hash; remove this reviewed chunk, never allow it in downloads.
  const header = chunks[0].data;
  const significantChannels: Record<number, number> = {
    0: 1,
    2: 3,
    3: 3,
    4: 2,
    6: 4,
  };
  if (
    reviewed.some((chunk) =>
      chunk.type === "deBG"
        ? chunk.data.length !== 16 ||
          !/^[0-9a-f]{16}$/i.test(new TextDecoder().decode(chunk.data))
        : header[8] !== 8 ||
          chunk.data.length !== significantChannels[header[9]] ||
          chunk.data.some((value) => value < 1 || value > 8),
    )
  ) {
    throw new ImageError(
      "VERIFICATION_FAILED",
      "Unrecognized encoder metadata. Download is blocked.",
    );
  }
  const output = new Uint8Array(
    bytes.length -
      reviewed.reduce((sum, chunk) => sum + chunk.end - chunk.offset, 0),
  );
  output.set(bytes.subarray(0, 8));
  let offset = 8;
  for (const chunk of chunks) {
    if (chunk.type === "deBG" || chunk.type === "sBIT") continue;
    output.set(bytes.subarray(chunk.offset, chunk.end), offset);
    offset += chunk.end - chunk.offset;
  }
  return output;
}

export function admitFiles<T extends { name: string; size: number }>(
  existing: T[],
  incoming: T[],
) {
  const accepted: T[] = [],
    rejected: string[] = [];
  let total = existing.reduce((sum, file) => sum + file.size, 0);
  for (const file of incoming) {
    let reason = "";
    if (existing.length + accepted.length >= LIMITS.files)
      reason =
        "The queue holds up to 10 images. Remove an image to add another.";
    else if (!file.size) reason = "This file is empty.";
    else if (file.size > LIMITS.fileBytes)
      reason = "Each image must be 20 MiB or smaller.";
    else if (total + file.size > LIMITS.totalBytes)
      reason = "Selected images must total 100 MiB or less.";
    if (reason) rejected.push(`${file.name}: ${reason}`);
    else {
      accepted.push(file);
      total += file.size;
    }
  }
  return { accepted, rejected };
}
