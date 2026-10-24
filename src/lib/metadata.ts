import * as exifr from "exifr";
import { ImageError, readPng } from "./image-format";

export type MetadataField = { label: string; value: string };
export type MetadataGroup = { title: string; fields: MetadataField[] };
export type Inspection = {
  outcome: "detected" | "not-detected";
  groups: MetadataGroup[];
  count: number;
};
const GROUPS = [
  "Location",
  "Camera / device",
  "Author / software",
  "Capture time",
  "Other recognized fields",
];

function groupFor(key: string) {
  if (/gps|latitude|longitude|altitude|location/i.test(key)) return 0;
  if (
    /make|model|serial|lens|camera|iso|exposure|fnumber|focal|flash/i.test(key)
  )
    return 1;
  if (/artist|author|creator|copyright|software|owner|credit|byline/i.test(key))
    return 2;
  if (/date|time|offset/i.test(key)) return 3;
  return 4;
}

export function groupMetadata(raw: Record<string, unknown>): Inspection {
  const groups = GROUPS.map((title) => ({
    title,
    fields: [] as MetadataField[],
  }));
  function visit(data: Record<string, unknown>, depth = 0) {
    if (depth > 3) return;
    for (const [key, value] of Object.entries(data)) {
      if (
        value == null ||
        value instanceof Uint8Array ||
        value instanceof ArrayBuffer
      )
        continue;
      if (
        typeof value === "object" &&
        !Array.isArray(value) &&
        !(value instanceof Date)
      ) {
        visit(value as Record<string, unknown>, depth + 1);
        continue;
      }
      let text: string;
      if (value instanceof Date)
        text = Number.isNaN(value.getTime())
          ? "Unrecognized date"
          : value
              .toISOString()
              .replace("T", " ")
              .replace(/\.000Z$/, " UTC");
      else if (["string", "number", "boolean"].includes(typeof value))
        text = String(value);
      else if (
        Array.isArray(value) &&
        value.length <= 12 &&
        value.every((item) => ["string", "number"].includes(typeof item))
      )
        text = value.join(", ");
      else continue;
      const fields = groups[groupFor(key)].fields;
      const label = key
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replaceAll("_", " ");
      if (
        !fields.some((field) => field.label === label && field.value === text)
      )
        fields.push({ label, value: text.slice(0, 1000) });
    }
  }
  visit(raw);
  const count = groups.reduce((sum, group) => sum + group.fields.length, 0);
  return {
    outcome: count ? "detected" : "not-detected",
    groups: groups.filter((group) => group.fields.length),
    count,
  };
}

export async function inspectMetadata(bytes: Uint8Array): Promise<Inspection> {
  try {
    // exifr's shipped types omit its documented reader and error-handling options.
    const options = {
      tiff: true,
      xmp: true,
      iptc: true,
      ifd1: false,
      exif: true,
      gps: true,
      interop: true,
      userComment: true,
      icc: false,
      jfif: false,
      ihdr: false,
      mergeOutput: false,
      silentErrors: false,
      chunked: false,
      reviveValues: false,
    };
    const raw = (await exifr.parse(bytes, options)) as
      Record<string, unknown> | undefined;
    const result = groupMetadata(raw ?? {});
    // exifr does not expose arbitrary PNG text; report their presence without claiming to understand compressed content.
    if (bytes[0] === 137) {
      for (const chunk of readPng(bytes).chunks) {
        if (!["tEXt", "zTXt", "iTXt"].includes(chunk.type)) continue;
        const delimiter = chunk.data.indexOf(0);
        if (delimiter < 1 || delimiter > 79)
          throw new Error("Invalid PNG text");
        const label = new TextDecoder("latin1").decode(
          chunk.data.subarray(0, delimiter),
        );
        const value =
          chunk.type === "tEXt"
            ? new TextDecoder("latin1")
                .decode(chunk.data.subarray(delimiter + 1))
                .slice(0, 1000)
            : `Embedded ${chunk.type} field; content not expanded`;
        const title = GROUPS[groupFor(label)];
        let group = result.groups.find((group) => group.title === title);
        if (!group) {
          group = { title, fields: [] };
          result.groups.push(group);
        }
        group.fields.push({ label, value });
        result.count++;
      }
      result.outcome = result.count ? "detected" : "not-detected";
    }
    return result;
  } catch {
    throw new ImageError(
      "INSPECTION_FAILED",
      "Unable to inspect this image. Its metadata could not be read reliably. Retry or remove it.",
    );
  }
}
