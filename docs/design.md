# AssetSanitize design reference

The generated primary-screen concept is `design-concept.png`. It is a design reference, never a flattened application background. The built app has moved on from it (see the 19 November 2026 revision below); the screenshots in `portfolio/` show the current app. Built with the built-in Image Gen tool on 25 October 2026 (Asia/Dhaka).

Prompt: a complete 1440px desktop image-metadata utility; light studio aesthetic; white background; ink text; restrained teal; compact headline “Share the image. Leave the metadata.”; horizontal upload zone; left image queue; right preview and grouped metadata; pale teal local-processing action bar; verified results; honest privacy limitations; ConsoleLog Studio attribution. No marketing sections, decorative badges, metrics, or giant hero.

## Design system

- White page, #f5f8f8 secondary surfaces, #142b2a text, #576b70 secondary text, #dce5e6 borders, #087f71 primary accent.
- IBM Plex Sans (variable) for interface text and IBM Plex Mono for metadata values, bundled from the application origin.
- Type tokens: h1 `clamp(32px, 2vw + 16px, 44px)` (30px on phones), section headings 18–20px, body and reading text 16px, small text 14px, labels 13px. Nothing is set below 13px.
- Max content width 1240px, desktop gutter 40px, phone gutter 20px; 4/8px spacing tokens; corners 6px (controls), 8px (inner panels), 12px (outer panels).
- Lucide outline icons, approximately 18px for controls and 24px for main affordances. Code-native aperture mark.
- Desktop: upload zone, queue/inspector workspace, results. Mobile: same content stacked. Selected row has pale teal surface and a teal leading edge.
- Strong focus outlines, subtle hover changes, no essential animation; respect reduced motion. Buttons step up 1px on hover and press down 1px (scale .985) on click; nav words draw a 1px underline.
- One filled button marks the main action in each state: Choose images (empty), Clean images (images ready), Download all or the single Download PNG (finished). A disabled filled button is never shown.

The actual application starts empty. The reference’s populated state is reached through Try a sample. Add necessary processing, result, cancellation, and error states using the same component system.

## Revision — 19 November 2026

A UI/UX review against the taste-skill's type, button, motion and copy rules led to these changes:

- **Headline names the category:** “Remove EXIF and GPS data from photos”, with a sub-line that says what is shown, what is downloaded, the 10-image limit and local processing.
- **Empty state is one large drop area** with Choose images and Try a sample. The image workspace and results appear once there is something to show; after the first image the upload area shrinks to a single “Add more images” row.
- **Drop and paste anywhere on the page.** A stray drop can no longer make the browser open the file and discard the session.
- **Readable metadata:** plain labels (Latitude, Camera maker, Serial number, Taken), coordinates merged with their hemisphere, derived duplicates removed, group counts, and a verified row at the top of the panel after cleaning.
- **Action bar** with the privacy line, “N images ready” or “Cleaning 2 of 5…”, and the main action. On phones it sticks to the bottom of the screen while the inspector is in view.
- **Results** show a thumbnail and the source filename for each generic download, offer Download all as a zip, and scroll into view when a clean run finishes.
