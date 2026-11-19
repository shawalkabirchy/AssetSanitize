# Walkthrough and screenshot captions

The recording is a real interaction with the production static build and synthetic sample data. No processing results are mocked. Run `npm run build`, `npm run preview`, then `npm run portfolio` to reproduce it.

## 30–60 second walkthrough

| Moment | What the viewer sees | Optional narration |
| --- | --- | --- |
| 0–4 s | Empty drop area and local-processing line | “An image can carry more than its pixels.” |
| 4–16 s | Load the sample and inspect location, device serial, author, and time | “These are synthetic examples of fields a shared photo can include.” |
| 16–22 s | Explain reconstruction and the visible-content boundary | “Everything happens on your device. This removes source metadata, not identifying details inside the picture.” |
| 22–30 s | Clean, verify, and show actual output size | “The PNG is checked before the download becomes available.” |
| 30–36 s | Download cleaned-01.png | “The result gets a generic filename.” |
| 36–41 s | Clear the session | “Clear all releases the local session.” |

Actual recording duration depends on machine and processing time. It includes deliberate presentation pauses. The script checks successful download, no application errors, and no mobile overflow.

## Annotated screens

- **desktop-empty.png:** a single drop area with Choose images and Try a sample; the workspace appears once an image is added.
- **desktop-inspection.png:** the selected source is previewed next to grouped metadata with plain labels. The metadata region scrolls independently; the walkthrough reveals the remaining groups. The action bar shows how many images are ready.
- **desktop-result.png:** the preview switches to the verified output, the metadata panel confirms none of the listed fields are in the PNG, and the result row shows its source, thumbnail and honest sizes.
- **mobile-result.png:** the same completed workflow at 360px width, with no page-level horizontal overflow and the action bar at the foot of the workspace.

The concept image is a design reference. These four screenshots and walkthrough.webm are evidence of the actual built app. Screenshots contain no customer data or credentials.
