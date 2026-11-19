import { zipSync } from "fflate";

// A fixed entry date keeps the archive from recording when it was made.
const FIXED_DATE = new Date(1980, 0, 1);

/** Packs already-compressed PNGs without recompressing them. */
export async function zipFiles(files: { name: string; blob: Blob }[]) {
  const entries: Record<string, [Uint8Array, { level: 0; mtime: Date }]> = {};
  for (const file of files)
    entries[file.name] = [
      new Uint8Array(await file.blob.arrayBuffer()),
      { level: 0, mtime: FIXED_DATE },
    ];
  return new Blob([zipSync(entries)], { type: "application/zip" });
}
