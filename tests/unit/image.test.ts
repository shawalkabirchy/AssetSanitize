import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import ExifReader from "exifreader";
import {
  admitFiles,
  checkDimensions,
  crc32,
  inspectFormat,
  LIMITS,
  readPng,
  stripReviewedEncoderMetadata,
  verifyPng,
} from "../../src/lib/image-format";
import { inspectMetadata } from "../../src/lib/metadata";

const fixture = (name: string) =>
  new Uint8Array(readFileSync(new URL(`../fixtures/${name}`, import.meta.url)));
describe("file admission and structure", () => {
  it("checks CRC against the standard reference vector", () =>
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926));
  it("detects actual image types and header dimensions", () => {
    expect(inspectFormat(fixture("gps-camera.jpg"))).toEqual({
      type: "jpeg",
      width: 1200,
      height: 800,
    });
    expect(inspectFormat(fixture("transparent.png"))).toEqual({
      type: "png",
      width: 64,
      height: 48,
    });
  });
  it.each([
    "animated.png",
    "renamed-svg.jpg",
    "corrupt.jpg",
    "corrupt.png",
    "too-many-pixels.png",
  ])("rejects %s before decode", (name) =>
    expect(() => inspectFormat(fixture(name))).toThrow(),
  );
  it("accepts exact limits and rejects count, per-file and total excess", () => {
    const file = (size: number) => ({ size, name: "image.jpg" });
    expect(admitFiles([], [file(LIMITS.fileBytes)]).accepted).toHaveLength(1);
    expect(admitFiles([], [file(LIMITS.fileBytes + 1)]).rejected).toHaveLength(
      1,
    );
    expect(
      admitFiles(
        Array.from({ length: 10 }, () => file(1)),
        [file(1)],
      ).accepted,
    ).toHaveLength(0);
    expect(
      admitFiles(
        Array.from({ length: 4 }, () => file(LIMITS.fileBytes)),
        [file(LIMITS.fileBytes)],
      ).accepted,
    ).toHaveLength(1);
    expect(
      admitFiles(
        Array.from({ length: 5 }, () => file(LIMITS.fileBytes)),
        [file(1)],
      ).accepted,
    ).toHaveLength(0);
    expect(admitFiles([], [file(0)]).accepted).toHaveLength(0);
    expect(() => checkDimensions(6000, 4000)).not.toThrow();
    expect(() => checkDimensions(6001, 4000)).toThrow();
  });
});
describe("output verification", () => {
  it("accepts a structural PNG with expected dimensions", () =>
    expect(() =>
      verifyPng(fixture("plain.png"), { width: 120, height: 80 }),
    ).not.toThrow());
  it.each(["text-metadata.png", "animated.png", "corrupt.png"])(
    "blocks unsafe or damaged %s",
    (name) =>
      expect(() =>
        verifyPng(fixture(name), { width: 120, height: 80 }),
      ).toThrow(/verification/i),
  );
  it("rejects dimension mismatch, trailing bytes, truncated chunks, and unknown ancillary chunks", () => {
    const plain = fixture("plain.png");
    expect(() => verifyPng(plain, { width: 1, height: 1 })).toThrow();
    expect(() => readPng(new Uint8Array([...plain, 0]))).toThrow();
    expect(() => readPng(plain.subarray(0, plain.length - 2))).toThrow();
    const changed = fixture("text-metadata.png");
    changed.set(new TextEncoder().encode("aaAa"), 37);
    const view = new DataView(changed.buffer);
    const end = 33 + view.getUint32(33) + 12;
    view.setUint32(end - 4, crc32(changed.subarray(37, end - 4)));
    expect(() => verifyPng(changed, { width: 120, height: 80 })).toThrow();
  });
  it("has an independent positive control for identifying metadata", () => {
    const tags = ExifReader.load(fixture("gps-camera.jpg").buffer, {
      expanded: true,
    });
    expect(JSON.stringify(tags)).toContain("Demo Author");
    expect(JSON.stringify(tags)).toContain("DEMO-SERIAL-0001");
  });
  it("removes only reviewed encoder hashes and leaves the download allowlist strict", () => {
    const encoded = fixture("encoder-hash.png");
    expect(() => verifyPng(encoded, { width: 120, height: 80 })).toThrow();
    const output = stripReviewedEncoderMetadata(encoded);
    expect(() => verifyPng(output, { width: 120, height: 80 })).not.toThrow();
    expect(readPng(output).chunks.some((chunk) => chunk.type === "deBG")).toBe(
      false,
    );
    expect(() =>
      stripReviewedEncoderMetadata(fixture("invalid-encoder-hash.png")),
    ).toThrow();
    expect(() =>
      verifyPng(stripReviewedEncoderMetadata(fixture("encoder-sbit.png")), {
        width: 120,
        height: 80,
      }),
    ).not.toThrow();
    expect(() =>
      stripReviewedEncoderMetadata(fixture("invalid-encoder-sbit.png")),
    ).toThrow();
    expect(() =>
      verifyPng(stripReviewedEncoderMetadata(fixture("text-metadata.png")), {
        width: 120,
        height: 80,
      }),
    ).toThrow();
  });
});
describe("inspection outcomes", () => {
  it("recognizes location, serial, author and capture time", async () => {
    const inspection = await inspectMetadata(fixture("gps-camera.jpg"));
    expect(inspection.outcome).toBe("detected");
    expect(inspection.groups.map((group) => group.title)).toEqual(
      expect.arrayContaining([
        "Location",
        "Camera / device",
        "Author / software",
        "Capture time",
      ]),
    );
    expect(JSON.stringify(inspection)).toContain("DEMO-SERIAL-0001");
  });
  it("distinguishes missing fields from parse failures", async () => {
    expect((await inspectMetadata(fixture("plain.png"))).outcome).toBe(
      "not-detected",
    );
    await expect(inspectMetadata(fixture("broken-exif.jpg"))).rejects.toThrow(
      "Unable to inspect",
    );
  });
  it("reports PNG textual metadata and XMP", async () => {
    expect(
      JSON.stringify(await inspectMetadata(fixture("text-metadata.png"))),
    ).toContain("Demo PNG Author");
    expect(JSON.stringify(await inspectMetadata(fixture("xmp.jpg")))).toContain(
      "Demo XMP Author",
    );
  });
});
