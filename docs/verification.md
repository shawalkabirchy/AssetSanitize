# Verification record

Date: 25 October 2026 (Asia/Dhaka). Final local release result: **18 unit tests and 35 browser checks passed**. The final browser run had no skipped, unexpected, or flaky results. The production build and TypeScript checks passed. The production dependency audit reported zero known vulnerabilities.

The separate Browser plugin/skill is not installed. Automated checks use the approved Playwright workflow; the Codex in-app browser is also used for rendered interaction and visual review. Actual files are processed through browser APIs, not a mocked processing service.

Evidence locations: tests/unit/image.test.ts, tests/e2e/proof.spec.ts, tests/e2e/workflow.spec.ts; portfolio screenshots, environment.json, and walkthrough.webm. The test-only cancellation delay delays real worker delivery to make an otherwise hardware-dependent timing check deterministic; it does not fabricate a cleaned result.

Published to **https://assetsanitize.pages.dev/** on 26 October 2026 (Asia/Dhaka). The production deployment passed **all 35 browser checks**, with zero skipped, unexpected, or flaky results. Local build, TypeScript, and all 18 unit checks were rerun successfully. The connected Cloudflare plugin handled publication; the separate saved Wrangler login was unchanged. Real Safari is not available on this Windows machine; WebKit automation is recorded separately.

## Acceptance results

| Check | Method | Result | Evidence |
| --- | --- | --- | --- |
| P04-A1 | Known GPS/serial/author/time, XMP/PNG text, metadata-free and malformed-EXIF fixtures | Passed | Unit inspection tests; mixed-input browser test |
| P04-A2 | CRC/structure/allowlist, forbidden/unknown chunks, independent ExifReader positive control and real downloads | Passed | Unit verifier; proof.spec.ts in five browsers |
| P04-A3 | Eight orientation corner patterns/dimensions; alpha-plane and exact visible PNG pixel comparison | Passed | workflow.spec.ts in three engines |
| P04-A4 | Honest sizes, visible SAMPLE PHOTO, help and footer limitations | Passed | Pixel/copy assertions; screenshots; walkthrough |
| P04-A5 | Count/byte/pixel limits, corruption, disguised SVG, APNG, mixed batches, cancel/retry | Passed | Unit limits; workflow/drop browser tests |
| P04-A6 | Requests/WebSockets, no unexpected origins/bodies/filenames, object URL release, refresh, generic downloads | Passed | Privacy browser test and download proof |
| G-A1 | 360px/1440px overflow, axe WCAG 2 A/AA and 2.1 AA, keyboard main workflow, dialog focus, reduced motion | Passed in tested environments | workflow.spec.ts; keyboard.spec.ts; screenshots |
| G-A2 | Honest processing/result/error states and distinct inspection outcomes | Passed | Browser state and unit assertions |
| G-A3 | Clear/refresh reset session; late worker replies cannot restore cleared data | Passed where applicable | drop.spec.ts; privacy test; no persistence/backup applies |
| G-A4 | No image upload or runtime telemetry in observed flows | Passed | Network assertions, source review, in-app console review |
| G-A5 | Bounded sequential work, isolated failure, cancellation and cleanup | Passed | Mixed-batch, cancel/retry, late-reply tests |
| G-A6 | Commands, browser versions, hardware and observations recorded | Passed | acceptance.json; environment.json; this report |
| Deployed provider | Actual HTTPS assets, worker, headers and complete workflow | Passed | deployed-acceptance.json; deployed-smoke.json; deployed-headers.json; deployed desktop/mobile screenshots |
| Real Safari | Actual desktop/iOS Safari | Not run | No Apple browser/device available |

## Commands and environment

Executed: `npm run fixtures`; `npm test` (18 passed); `npm run typecheck`; `npm run build`; `npx playwright test --reporter=list,json` (35 passed); `npm audit --omit=dev --json` (0 advisories); `npm run portfolio`. ffprobe independently measured the recording at **36.36 seconds**.

Reference machine: Windows 11 build 26200 x64, Intel i7-1355U, 12 logical CPUs, 16 GiB RAM; Node 24.14.0, npm 11.14.1. Chromium 156.0.8078.4, Firefox 157.0 and WebKit 27.2 ran all 11 scenarios each. Installed Chrome 156.0.8078.47 and Edge 156.0.4314.42 ran the processing/download proof.

The production preview was http://127.0.0.1:4173. The in-app browser additionally completed sample inspection/cleaning, exposed the verified download, opened help by keyboard, and restored focus on Escape. No relevant console errors/warnings or framework overlay were present.

## Saved evidence

- [Raw final browser results](portfolio/acceptance.json): 35 expected, zero unexpected/skipped/flaky.
- [Environment and sample observation](portfolio/environment.json): the synthetic 31,098-byte JPEG produced a 202,794-byte PNG in one Chromium walkthrough. Click-to-verified was observed at 146 ms including automation overhead. This is a single observation, not a benchmark or maximum-file performance claim.
- [Desktop inspection](portfolio/desktop-inspection.png), [desktop result](portfolio/desktop-result.png), [360px result](portfolio/mobile-result.png), [walkthrough](portfolio/walkthrough.webm).
- [Encoder review](encoder-review.md): narrow handling of Firefox/WebKit encoder additions, with the original download allowlist unchanged. Explicit tab indices fix WebKit skip/download-link focus.

## Deployed release evidence — 26 October 2026

The initial production deployment `bc6a3627-2293-47ae-93c2-fb08c3bcff4f` built Git commit `7df38888903254bf3506641a70d0a154704ba702`. Cloudflare reported a successful production deploy with `uses_functions: false`. The stable address is https://assetsanitize.pages.dev/; the deployment address is https://bc6a3627.assetsanitize.pages.dev.

The existing suite was run with `BASE_URL=https://assetsanitize.pages.dev` and `npm run test:e2e -- --reporter=list,json`. It exercised Chromium, Firefox, WebKit, installed Chrome, and installed Edge against the HTTPS host. The test runner sent synthetic files only to browser file inputs; selected image bytes were processed locally.

- [Raw deployed browser results](portfolio/deployed-acceptance.json): 35 passed, zero skipped/unexpected/flaky.
- [Live smoke evidence](portfolio/deployed-smoke.json): sample inspection, two actual worker instances from the same-origin worker chunk, independent ExifReader inspection of the 202,794-byte `cleaned-01.png` download, clear/reload, and 360px/1440px screenshots. All 23 observed page requests were same-origin GETs without bodies, and no console warnings/errors were recorded.
- [Public response headers](portfolio/deployed-headers.json): HTTPS 200, CSP, nosniff, no-referrer, framing denial, and disabled camera/microphone/geolocation permissions. Cloudflare also adds CDN network-error reporting headers; no Web Analytics script is enabled.
- [Deployed environment](portfolio/deployed-environment.json): measured browser versions and hardware for this release.
- [Live desktop](portfolio/deployed-desktop.png) and [live mobile](portfolio/deployed-mobile.png): the actual published result state, visually reviewed with no clipping or page-level horizontal overflow.

Favicon, synthetic sample, license notices, application chunks, and worker chunks loaded successfully from the production origin. The separate Browser plugin was unavailable, so the existing Playwright workflow provided automation and screenshots.

Known limits: actual Safari remains unverified. Input caps cannot guarantee available memory. Canvas reconstruction can increase size and change bit-depth/color interpretation. No anonymity, secure-erasure, certification, or visible-redaction claim is made.

## Custom domain check — 19 November 2026

`https://assetsanitize.consolelog.studio/` was added as a custom domain on the existing `assetsanitize` Pages project and checked from this machine after it went live:

- HTTPS 200 with a valid certificate, `Server: cloudflare`, and the page title "AssetSanitize — private image metadata cleaner".
- The same security headers as the provider address: CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and disabled camera/microphone/geolocation permissions.
- Favicon (`image/svg+xml`), synthetic sample (`image/jpeg`) and license notices (`text/plain`) returned 200.
- The HTML is byte-identical to `https://assetsanitize.pages.dev/` (same SHA-256), so both hosts serve the same deployment.

The 35-check browser suite was not rerun against the custom domain.

## UI/UX revision — 19 November 2026

Branch `ui-ux-refresh`. The changes are described in [design.md](design.md#revision--19-november-2026). Results below are from the static export served locally at `127.0.0.1:4273`, because another local project held port 4173 during this session.

- **TypeScript:** passed. **Unit:** 21 passed. New checks cover plain metadata labels, merged coordinates, altitude formatting and the Download all archive (entries stored unchanged under generic names).
- **Browser:** 55 passed, 1 skipped, across Chromium, Firefox and WebKit, plus `proof.spec.ts` in installed Chrome and Edge. The new `tests/e2e/ux.spec.ts` covers:
  - a drop outside the upload box: the file is added and the page does not navigate;
  - a drop while images are processing: refused with a reason;
  - a clipboard paste;
  - one filled main button in each state, with axe WCAG 2 A/AA and 2.1 AA scans of both finished states;
  - Download all: every PNG in the zip is re-checked with `verifyPng` and ExifReader;
  - the "Cleaning 2 of 3…" progress line;
  - the phone action bar staying at the bottom of the viewport.
- **Skipped:** the clipboard paste test in Firefox. Firefox empties `clipboardData` on a scripted paste event, so the test cannot hand it a file; a real paste carries the file.
- **Test change:** the cancellation test's worker delay went from 1 s to 4 s. With tracing on, WebKit's click (including the new 140 ms hover step) needed more than the old 1 s window. The app was not changed for this.
- **Text-size scan** at 1440, 1024, 820 and 390px in the empty, ready and finished states: no visible text under 13px, no horizontal overflow, no page errors. Both IBM Plex faces load from the application origin.
- **taste-skill `perf.mjs`:** 0 FAIL, 4 WARN. The warnings are a busy host CPU, plus 548 KiB of parsed JavaScript from Next.js/React, which was already there. Layout shift 0.000; one 44.8 KiB font file at load.
- **taste-skill `consistency.mjs`** (software profile, 1440 and 390px):
  - Fixed: the text-contrast findings (sentences now use `--ink-soft`, 7.7:1) and the nav-edge finding.
  - Remaining FAILs are marketing-page structure rules (hero screen, section heights, one section per screen, hero call to action, the kit's own container markup) that a single-screen tool does not follow.
  - The h1 check wants a category noun; the owner chose "Remove EXIF and GPS data from photos".
- **Next.js upgrade:** on 16.4.3, `npm run build` wrote `out/` and then exited with code 1 (`SecurityFatalError`) because of a published advisory concerning `use cache`, which this app does not use. Next was upgraded to **16.4.6** at the owner's request. The build now exits 0. `npm audit --omit=dev` reports 0 vulnerabilities. TypeScript, all 21 unit tests and the browser suite (55 passed, 1 skipped as above) were re-run on the upgraded build.
- **Dev dependency:** `serve`, the local preview and test server, went from 14.2.6 to **14.2.8** to clear a `compression` advisory. It is not part of the published site. The full `npm audit`, development dependencies included, now reports 0 vulnerabilities, and the browser suite passed again through the new `serve`.
