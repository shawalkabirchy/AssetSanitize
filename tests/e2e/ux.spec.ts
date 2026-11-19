import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import ExifReader from "exifreader";
import { unzipSync } from "fflate";
import { readFile } from "node:fs/promises";
import { verifyPng } from "../../src/lib/image-format";

const filledButtons = (page: Page) =>
  page.locator('[data-slot="button"][data-variant="default"]:visible');

async function addViaEvent(
  page: Page,
  kind: "drop" | "paste",
  selector: string,
  name: string,
) {
  const source = (await readFile("tests/fixtures/plain.png")).toString("base64");
  await page.evaluate(
    ({ base64, kind, selector, name }) => {
      const transfer = new DataTransfer();
      const bytes = Uint8Array.from(atob(base64), (value) => value.charCodeAt(0));
      transfer.items.add(new File([bytes], name, { type: "image/png" }));
      const target = document.querySelector(selector)!;
      if (kind === "paste")
        target.dispatchEvent(
          new ClipboardEvent("paste", {
            bubbles: true,
            cancelable: true,
            clipboardData: transfer,
          }),
        );
      else
        for (const type of ["dragenter", "dragover", "drop"])
          target.dispatchEvent(
            new DragEvent(type, {
              bubbles: true,
              cancelable: true,
              dataTransfer: transfer,
            }),
          );
    },
    { base64: source, kind, selector, name },
  );
}

test("a file dropped outside the upload box is added and the page stays", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles("tests/fixtures/plain.png");
  await expect(page.getByText("Ready to clean", { exact: true })).toBeVisible();
  const url = page.url();
  await addViaEvent(page, "drop", ".metadata-panel", "dropped.png");
  await expect(page.locator(".queue-item")).toHaveCount(2);
  await expect(page.locator(".queue-item").filter({ hasText: "dropped.png" })).toBeVisible();
  await expect(page.getByText("Ready to clean", { exact: true })).toHaveCount(2);
  await addViaEvent(page, "drop", "footer", "footer.png");
  await expect(page.locator(".queue-item")).toHaveCount(3);
  expect(page.url()).toBe(url);
});

test("a drop while images are processing is refused with a reason", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      postMessage(message: { operation: string; file: File }) {
        if (message.file.name === "slow.png")
          setTimeout(() => super.postMessage(message), 1500);
        else super.postMessage(message);
      }
    };
  });
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles({
    name: "slow.png",
    mimeType: "image/png",
    buffer: await readFile("tests/fixtures/plain.png"),
  });
  await addViaEvent(page, "drop", "main", "late.png");
  await expect(page.locator("#queue-notice")).toHaveText(
    "Wait for the current images to finish, then add more.",
  );
  await expect(page.locator(".queue-item")).toHaveCount(1);
});

test("an image pasted from the clipboard is added", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName === "firefox",
    "Firefox empties clipboardData on scripted paste events; a real paste carries the file.",
  );
  await page.goto("/");
  await addViaEvent(page, "paste", "body", "pasted.png");
  await expect(page.locator(".queue-item").filter({ hasText: "pasted.png" })).toBeVisible();
  await expect(page.getByText("Ready to clean", { exact: true })).toBeVisible();
});

test("each state shows one filled main button", async ({ page }) => {
  await page.goto("/");
  await expect(filledButtons(page)).toHaveText(["Choose images"]);
  const source = await readFile("tests/fixtures/gps-camera.jpg");
  await page.locator('input[type="file"]').setInputFiles([
    { name: "first.jpg", mimeType: "image/jpeg", buffer: source },
    { name: "second.jpg", mimeType: "image/jpeg", buffer: source },
  ]);
  await expect(page.getByText("Ready to clean", { exact: true })).toHaveCount(2);
  await expect(filledButtons(page)).toHaveText(["Clean images"]);
  await expect(page.getByText("2 images ready", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clean images", exact: true }).click();
  await expect(page.getByText("2 verified PNGs", { exact: true })).toBeVisible();
  await expect(filledButtons(page)).toHaveText(["Download all"]);
  await expect(page.getByText("from first.jpg", { exact: false })).toBeVisible();
  await expect(page.getByText(/Verified: none of these \d+ fields are in the cleaned PNG\./)).toBeVisible();
  const finished = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(finished.violations).toEqual([]);
  // A single result whose download is the main action: the filled link keeps its white label.
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles({ name: "only.jpg", mimeType: "image/jpeg", buffer: source });
  await expect(page.getByText("Ready to clean", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clean images", exact: true }).click();
  await expect(filledButtons(page)).toHaveText(["Download PNG"]);
  const single = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(single.violations).toEqual([]);
});

test("download all packs every verified PNG without metadata", async ({ page }) => {
  await page.goto("/");
  const source = await readFile("tests/fixtures/gps-camera.jpg");
  await page.locator('input[type="file"]').setInputFiles([
    { name: "first.jpg", mimeType: "image/jpeg", buffer: source },
    { name: "second.jpg", mimeType: "image/jpeg", buffer: source },
  ]);
  await expect(page.getByText("Ready to clean", { exact: true })).toHaveCount(2);
  await page.getByRole("button", { name: "Clean images", exact: true }).click();
  await expect(page.getByText("2 verified PNGs", { exact: true })).toBeVisible();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download all", exact: true }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("assetsanitize-cleaned.zip");
  const files = unzipSync(await readFile((await download.path())!));
  expect(Object.keys(files)).toEqual(["cleaned-01.png", "cleaned-02.png"]);
  for (const output of Object.values(files)) {
    verifyPng(output, { width: 1200, height: 800 });
    const tags = ExifReader.load(Buffer.from(output), { expanded: true });
    expect(JSON.stringify(tags)).not.toMatch(
      /Demo Author|DEMO-SERIAL|GPSLatitude|DateTimeOriginal/,
    );
  }
});

test("a batch shows which image is being cleaned", async ({ page }) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      postMessage(message: { operation: string; file: File }) {
        // Delay delivery, never fake a result, so the progress line can be observed.
        if (message.operation === "clean" && message.file.name === "slow.png")
          setTimeout(() => super.postMessage(message), 1500);
        else super.postMessage(message);
      }
    };
  });
  await page.goto("/");
  const buffer = await readFile("tests/fixtures/plain.png");
  await page.locator('input[type="file"]').setInputFiles(
    ["a.png", "slow.png", "c.png"].map((name) => ({
      name,
      mimeType: "image/png",
      buffer,
    })),
  );
  await expect(page.getByText("Ready to clean", { exact: true })).toHaveCount(3);
  await page.getByRole("button", { name: "Clean images", exact: true }).click();
  await expect(page.locator(".action-status")).toHaveText("Cleaning 2 of 3…");
  await expect(page.getByText("3 verified PNGs", { exact: true })).toBeVisible();
});

test("on a phone the main action stays in reach while reading metadata", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample", exact: true }).click();
  await expect(page.getByText("Ready to clean", { exact: true })).toBeVisible();
  await page.locator(".metadata-panel").evaluate((element) =>
    element.scrollIntoView({ block: "start" }),
  );
  const bar = await page.locator(".action-bar").boundingBox();
  expect(bar).not.toBeNull();
  expect(Math.abs(bar!.y + bar!.height - 844)).toBeLessThanOrEqual(1);
  await expect(page.getByRole("button", { name: "Clean images", exact: true })).toBeInViewport();
});
