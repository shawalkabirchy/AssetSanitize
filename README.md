# AssetSanitize

**A self-initiated ConsoleLog Studio project.** Inspect JPEG/PNG metadata, reconstruct the visible image as PNG, verify the result, and download it. All image processing happens on the visitor's device.

- Source: [shawalkabirchy/AssetSanitize](https://github.com/shawalkabirchy/AssetSanitize)
- Studio: [consolelog.studio](https://consolelog.studio/)
- Live demo: awaiting Cloudflare Pages authorization; see [deployment](docs/deployment.md).
- [Case study](docs/case-study.md) · [Verification](docs/verification.md) · [LinkedIn drafts](docs/linkedin-drafts.md)

## Run locally

Reference development environment: Node **24.14.0**, npm **11.14.1**. Versions of Next.js, React, Tailwind, exifr, and test tools are pinned in package.json and package-lock.json. No API keys or paid accounts are needed locally.

```sh
npm ci
npm run dev
```

Development opens at http://localhost:3000. For the actual production export:

```sh
npm run build
npm run preview
```

Open http://localhost:4173. This serves the static `out/` directory. `next start` is not used for this static-export application.

## Verify

```sh
npm run build
npm run typecheck
npm test
npx playwright install chromium firefox webkit
npm run test:e2e
```

Playwright starts a production preview on 127.0.0.1:4173, or reuses an existing preview. Browser downloads are a development dependency, not a visitor requirement. Tests use real browser decoding/encoding and test-only ExifReader to independently inspect downloads. The test suite does not upload fixtures to a processing service.

`npm run fixtures` regenerates synthetic fixtures and the public sample. `npm run portfolio` captures screenshots, a walkthrough video, browser/environment information, and sample measurements from a running production preview. See [verification](docs/verification.md) for actual results and untested environments.

## Product boundaries

- Static JPEG and PNG input; verified PNG output only.
- Up to **10 files**, **20 MiB each**, **100 MiB total selected input**, **24 million decoded pixels per image**.
- Signatures and header dimensions are checked before preview/full decoding. Animated PNG, SVG (including renamed SVG), corrupt structures, and excessive dimensions are rejected.
- EXIF, GPS, XMP and IPTC inspection uses exifr with explicit options. PNG textual fields are reported too; compressed text is identified without claiming to expand it. “Not detected” means this reader found no recognized fields, not proof that arbitrary source data is absent.
- Metadata failures show **Unable to inspect**. Reconstruction/verification failures never enable download.
- Downloads are `cleaned-01.png`, `cleaned-02.png`, etc. Original filenames stay in the local UI.
- Clean images processes ready files sequentially. Cancel preserves verified results; Retry re-inspects failed/cancelled files. Remove releases one file. Clear all and refresh reset the session.
- Try a sample adds a clearly synthetic photo with demonstration author, GPS, serial, and capture-time tags. It never replaces existing images.

This removes **source metadata**, not visible text, faces, addresses, or other identifying picture content. It does not anonymize an image or guarantee it is safe to publish. Re-encoding can increase file size, discard high bit depth, and change color-profile interpretation. It is not a metadata-only archival edit.

## How privacy and verification work

There are no accounts, HTTP processing endpoints, database, analytics, session replay, service workers, or file persistence. Files, metadata and outputs remain in memory. Scripts, workers and assets are served from the application origin. The sample is an ordinary same-origin static asset request.

A Web Worker validates headers, inspects metadata, and normally decodes/draws/encodes the image using native canvas APIs. Browsers without OffscreenCanvas use a sequential HTML canvas fallback; the worker still validates the output. Cancellation discards an in-flight fallback encoding when the browser returns; it cannot interrupt that native operation mid-call.

The fresh PNG is structurally checked with CRCs and an exact allowlist: `IHDR`, `PLTE`, `IDAT`, `IEND`, `tRNS`, `sRGB`, `gAMA`, `cHRM`, `pHYs`. Identifying text/EXIF chunks and unknown chunks are blocked. Reviewed browser-generated `deBG` and `sBIT` chunks are validated and removed before this unchanged output gate; see [encoder review](docs/encoder-review.md). Metadata is re-inspected before a result becomes downloadable.

Clear all revokes object URLs, terminates the worker, and drops references. This is ordinary browser memory cleanup, not a claim of forensic secure erasure. Files already downloaded remain wherever the visitor saved them.

## Troubleshooting

- **Failed verification:** download remains blocked. Retry once or use another current browser. New encoder chunks need review, not an expanded allowlist without evidence.
- **Unable to inspect:** malformed/unsupported metadata is not presented as “metadata-free.” Retry or remove the file.
- **Processing stopped / out of resources:** close other tabs or choose a smaller image. Input limits cannot guarantee available device memory; PNG results can be much larger than compressed JPEGs.
- **Sample unavailable:** choose a local file, or restore network access for the sample asset. Your own selected files still use local processing.
- **Port 4173 in use:** stop the other local preview or use its existing production preview for tests.

## License and cost

Project code and synthetic fixtures: [MIT](LICENSE), as approved by the owner. Dependency notices are retained in [public/third-party-notices.txt](public/third-party-notices.txt) and regenerated at build time. The design concept is generated with the built-in Image Gen tool; actual product screenshots and walkthrough show the built application.

The runtime is static and requires no paid processing API. Cloudflare Pages deployment uses its free plan and free subdomain; quotas and terms must be checked at deployment. No paid resource, custom domain purchase, or optional analytics is enabled by this project. The original multi-project planning brief remains local and is excluded from the public repository.
