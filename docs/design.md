# AssetSanitize design reference

The generated primary-screen concept is `design-concept.png`. It is a design reference, never a flattened application background. Built with the built-in Image Gen tool on 25 October 2026 (Asia/Dhaka).

Prompt: a complete 1440px desktop image-metadata utility; light studio aesthetic; white background; ink text; restrained teal; compact headline “Share the image. Leave the metadata.”; horizontal upload zone; left image queue; right preview and grouped metadata; pale teal local-processing action bar; verified results; honest privacy limitations; ConsoleLog Studio attribution. No marketing sections, decorative badges, metrics, or giant hero.

## Design system

- White page, #f5f8f8 secondary surfaces, #142b2a text, #576b70 secondary text, #dce5e6 borders, #087f71 primary accent.
- System sans-serif; heading 40px desktop / 29px mobile, body 15px, controls 14px, labels 12px.
- Max content width 1240px, desktop gutter 40px, phone gutter 20px; 8px spacing scale; 10px panel corners.
- Lucide outline icons, approximately 18px for controls and 24px for main affordances. Code-native aperture mark.
- Desktop: upload zone, queue/inspector workspace, results. Mobile: same content stacked. Selected row has pale teal surface and a teal leading edge.
- Strong focus outlines, subtle hover changes, no essential animation; respect reduced motion.

The actual application starts empty. The reference’s populated state is reached through Try a sample. Add necessary processing, result, cancellation, and error states using the same component system.
