# LinkedIn drafts — do not publish automatically

## 1. Problem

A photo can carry more than the picture.

For a hypothetical creative team handing images to a client, embedded GPS, camera serials, author fields, and capture times are easy to overlook. Renaming the file doesn't remove them.

We're building AssetSanitize as a self-initiated ConsoleLog Studio project: inspect an image, reconstruct it locally, verify the result, and download a PNG.

The boundary matters: metadata cleanup does not hide text, faces, or addresses visible in the picture.

If your team shares image assets, where does this check fit into your handoff today?

Visual: desktop-inspection.png. This draft describes the project during development; the verified public demo is now available at https://assetsanitize.pages.dev/.

## 2. Build decision

We made the download button wait.

In AssetSanitize, drawing an image onto a new canvas is only part of the job. The exported PNG must also pass structural checks and metadata re-inspection before it becomes downloadable.

That uncovered real browser differences: encoders can add their own technical information. We reviewed those cases and kept a strict output allowlist.

Files are processed on the visitor's device, and the downloaded file gets a generic name.

This is a self-initiated studio project exploring a small, dependable privacy workflow. It removes source metadata; it doesn't redact the image itself.

Visual: desktop-result.png or the working walkthrough. Source: https://github.com/shawalkabirchy/AssetSanitize.

## 3. Demo / case study

AssetSanitize is live: choose → inspect → clean → verify → download.

Built by ConsoleLog Studio as a self-initiated portfolio project for image-sharing workflows. It supports static JPEG and PNG input and exports verified PNGs without sending selected images to a processing service.

The case study covers the practical details: orientation, transparency, cancellation, browser differences, and checking the actual output.

A deliberate limit: visible identifying content remains, and the new PNG can be larger than the original.

Try the synthetic sample: https://assetsanitize.pages.dev/.
Read the source: https://github.com/shawalkabirchy/AssetSanitize

If your team has a file handoff that needs fewer manual checks, we'd be interested in how you handle it today.

Publication note: these posts remain drafts. Attach walkthrough.webm and label all imagery as synthetic demonstration data.
