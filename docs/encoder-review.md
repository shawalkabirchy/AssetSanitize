# Reviewed encoder behavior

WebKit's encoder also emits `sBIT`. The [W3C PNG specification](https://www.w3.org/TR/png-3/#11sBIT) defines this as significant-bit counts per color component. For the fresh 8-bit canvas output, AssetSanitize validates the expected component count and values 1–8, removes that reviewed technical chunk without touching image data, and then enforces the same download allowlist. Invalid bit counts and any other unreviewed chunks still fail.

On 25 October 2026, real Firefox processing produced `IHDR`, `IDAT`, `deBG`, `IEND`. The original strict verifier correctly blocked the output. The downloaded PNG allowlist remains unchanged.

Mozilla's [PNG encoder source](https://github.com/mozilla-firefox/firefox/blob/main/image/encoders/png/nsPNGEncoder.cpp), `MaybeAddCustomMetadata`, builds `deBG` from a randomization key and image-buffer hash. Its payload is 16 hexadecimal bytes and its position is after image data. This is generated browser/session information, not source-image pixels, and should not be disclosed by this tool.

AssetSanitize validates the encoder PNG's structure and checksums, removes only a `deBG` with that reviewed shape, then applies the original strict allowlist and metadata re-inspection. Invalid `deBG` and all other unreviewed chunks remain failures. This normalization is used only on freshly encoded canvases, never as a metadata-only source-file edit. Tests cover removal, invalid payloads, and continued rejection of textual metadata.

The tested Windows WebKit build does not provide OffscreenCanvas. Its fallback decodes and draws one image on an HTMLCanvasElement, calls toBlob asynchronously, and sends the result to the same worker verifier. Cancellation discards an in-flight native encoding when it returns; no further work is scheduled. Other engines perform decoding and encoding in the worker. Both paths preserve the same input and output limits.
