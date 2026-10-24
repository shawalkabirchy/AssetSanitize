import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { crc32 } from "../src/lib/image-format.ts";

await mkdir("tests/fixtures", { recursive: true });
await mkdir("public/samples", { recursive: true });
const art =
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
<rect width="1200" height="800" fill="#f2eee5"/><rect x="640" width="260" height="800" fill="#e4dfd3"/>
<circle cx="270" cy="205" r="145" fill="#dfa62d"/><circle cx="560" cy="890" r="400" fill="#267f79"/>
<circle cx="1310" cy="790" r="380" fill="#c17450"/><circle cx="920" cy="-70" r="280" fill="#163a35"/>
<text x="75" y="445" fill="#193d38" font-family="sans-serif" font-size="40" letter-spacing="10">SAMPLE</text>
<text x="75" y="505" fill="#193d38" font-family="sans-serif" font-size="40" letter-spacing="10">PHOTO</text>
</svg>`);
const tags = {
  IFD0: {
    Make: "Demo Camera",
    Model: "Studio One",
    Artist: "Demo Author",
    Software: "AssetSanitize fixture generator",
    Copyright: "Synthetic demo — ConsoleLog Studio",
  },
  IFD2: {
    BodySerialNumber: "DEMO-SERIAL-0001",
    DateTimeOriginal: "2026:01:15 10:30:00",
    UserComment: "Synthetic sample, no real personal information",
  },
  IFD3: {
    GPSLatitudeRef: "N",
    GPSLatitude: "0/1 0/1 0/1",
    GPSLongitudeRef: "E",
    GPSLongitude: "0/1 0/1 0/1",
  },
};
const sample = await sharp(art).withExif(tags).jpeg({ quality: 90 }).toBuffer();
await writeFile("public/samples/studio-sample.jpg", sample);
await writeFile("tests/fixtures/gps-camera.jpg", sample);
const cornerArt = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><path fill="#ed3636" d="M0 0h60v40H0z"/><path fill="#19a353" d="M60 0h60v40H60z"/><path fill="#285ce8" d="M0 40h60v40H0z"/><path fill="#eac62b" d="M60 40h60v40H60z"/></svg>`,
);
for (let orientation = 1; orientation <= 8; orientation++) {
  await sharp(cornerArt)
    .withMetadata({ orientation })
    .jpeg({ quality: 100, chromaSubsampling: "4:4:4" })
    .toFile(`tests/fixtures/orientation-${orientation}.jpg`);
}
await sharp({
  create: {
    width: 64,
    height: 48,
    channels: 4,
    background: { r: 20, g: 160, b: 120, alpha: 0.5 },
  },
})
  .png()
  .toFile("tests/fixtures/transparent.png");
const plain = await sharp(art).resize(120, 80).png().toBuffer();
await writeFile("tests/fixtures/plain.png", plain);
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length);
  body.copy(result, 4);
  result.writeUInt32BE(crc32(body), result.length - 4);
  return result;
}
function appendBeforeData(png, type, data) {
  return Buffer.concat([
    png.subarray(0, 33),
    chunk(type, data),
    png.subarray(33),
  ]);
}
await writeFile(
  "tests/fixtures/text-metadata.png",
  appendBeforeData(plain, "tEXt", Buffer.from("Author\0Demo PNG Author")),
);
await writeFile(
  "tests/fixtures/encoder-hash.png",
  appendBeforeData(plain, "deBG", Buffer.from("0123456789ABCDEF")),
);
await writeFile(
  "tests/fixtures/invalid-encoder-hash.png",
  appendBeforeData(plain, "deBG", Buffer.from("not-a-valid-hash!")),
);
await writeFile(
  "tests/fixtures/encoder-sbit.png",
  appendBeforeData(plain, "sBIT", Buffer.alloc(plain[25] === 6 ? 4 : 3, 8)),
);
await writeFile(
  "tests/fixtures/invalid-encoder-sbit.png",
  appendBeforeData(plain, "sBIT", Buffer.alloc(plain[25] === 6 ? 4 : 3, 16)),
);
await writeFile(
  "tests/fixtures/animated.png",
  appendBeforeData(plain, "acTL", Buffer.from([0, 0, 0, 2, 0, 0, 0, 0])),
);
await writeFile(
  "tests/fixtures/renamed-svg.jpg",
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><script>alert(1)</script></svg>',
  ),
);
await writeFile("tests/fixtures/corrupt.jpg", sample.subarray(0, 128));
const damaged = Buffer.from(plain);
damaged[damaged.length - 1] ^= 1;
await writeFile("tests/fixtures/corrupt.png", damaged);
const oversized = Buffer.from(plain);
oversized.writeUInt32BE(6001, 16);
oversized.writeUInt32BE(4000, 20);
oversized.writeUInt32BE(crc32(oversized.subarray(12, 29)), 29);
await writeFile("tests/fixtures/too-many-pixels.png", oversized);
// A valid JPEG containing a deliberately invalid TIFF header must not look metadata-free.
const badExif = Buffer.from("Exif\0\0II\x2a\0\xff\xff\xff\x7f", "binary");
const app1 = Buffer.alloc(badExif.length + 4);
app1[0] = 255;
app1[1] = 225;
app1.writeUInt16BE(badExif.length + 2, 2);
badExif.copy(app1, 4);
const jpegWithoutExif = await sharp(cornerArt).jpeg().toBuffer();
await writeFile(
  "tests/fixtures/broken-exif.jpg",
  Buffer.concat([
    jpegWithoutExif.subarray(0, 2),
    app1,
    jpegWithoutExif.subarray(2),
  ]),
);
const xmp = Buffer.from(
  'http://ns.adobe.com/xap/1.0/\0<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/" dc:creator="Demo XMP Author"/></rdf:RDF></x:xmpmeta>',
);
const xmpSegment = Buffer.alloc(xmp.length + 4);
xmpSegment[0] = 255;
xmpSegment[1] = 225;
xmpSegment.writeUInt16BE(xmp.length + 2, 2);
xmp.copy(xmpSegment, 4);
await writeFile(
  "tests/fixtures/xmp.jpg",
  Buffer.concat([
    jpegWithoutExif.subarray(0, 2),
    xmpSegment,
    jpegWithoutExif.subarray(2),
  ]),
);
console.log(
  "Created synthetic JPEG/PNG fixtures and the public sample. No real personal data was used.",
);
