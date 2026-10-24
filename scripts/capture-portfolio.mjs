import assert from "node:assert/strict";
import { mkdir, rename, writeFile, readFile } from "node:fs/promises";
import os from "node:os";
import { chromium, firefox, webkit } from "@playwright/test";

const output = "docs/portfolio";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  recordVideo: {
    dir: `${output}/recording`,
    size: { width: 1440, height: 1000 },
  },
});
const page = await context.newPage();
const video = page.video();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const base = process.env.DEMO_URL ?? "http://127.0.0.1:4173";
const pause = (milliseconds) => page.waitForTimeout(milliseconds); // Presentation pacing, not test synchronization.
await page.goto(base);
await page
  .getByRole("heading", { name: "Share the image. Leave the metadata." })
  .waitFor();
await page.screenshot({ path: `${output}/desktop-empty.png`, fullPage: true });
await pause(4000);
await page.getByRole("button", { name: "Try a sample", exact: true }).click();
await page.getByText("Ready to clean", { exact: true }).waitFor();
await page.screenshot({
  path: `${output}/desktop-inspection.png`,
  fullPage: true,
});
await pause(5000);
await page.locator(".metadata-scroll").evaluate((element) => {
  element.scrollTop = 150;
});
await pause(4000);
await page.locator(".metadata-scroll").evaluate((element) => {
  element.scrollTop = element.scrollHeight;
});
await pause(3000);
await page.getByRole("button", { name: "How it works", exact: true }).click();
await page.getByRole("dialog").waitFor();
await pause(5000);
await page.keyboard.press("Escape");
await page.locator(".metadata-scroll").evaluate((element) => {
  element.scrollTop = 0;
});
const started = performance.now();
await page.getByRole("button", { name: "Clean images", exact: true }).click();
await page.getByRole("link", { name: "Download cleaned-01.png" }).waitFor();
const sampleElapsedMs = Math.round(performance.now() - started);
await page.screenshot({ path: `${output}/desktop-result.png`, fullPage: true });
await pause(5000);
const downloading = page.waitForEvent("download");
await page.getByRole("link", { name: "Download cleaned-01.png" }).click();
const download = await downloading;
assert.equal(download.suggestedFilename(), "cleaned-01.png");
const source = await readFile("public/samples/studio-sample.jpg");
const result = await readFile(await download.path());
await pause(4000);
await page.getByRole("button", { name: "Clear all", exact: true }).click();
await page.getByText("A closer look at your image.", { exact: true }).waitFor();
await pause(5000);
await page.close();
await context.close();
const videoPath = await video.path();
await rename(videoPath, `${output}/walkthrough.webm`);

const mobile = await browser.newPage({
  viewport: { width: 360, height: 800 },
  deviceScaleFactor: 1,
});
await mobile.goto(base);
await mobile.getByRole("button", { name: "Try a sample", exact: true }).click();
await mobile.getByText("Ready to clean", { exact: true }).waitFor();
await mobile.getByRole("button", { name: "Clean images", exact: true }).click();
await mobile.getByRole("link", { name: "Download cleaned-01.png" }).waitFor();
assert(
  await mobile.evaluate(
    () => document.documentElement.scrollWidth <= innerWidth,
  ),
  "The mobile workflow must not overflow horizontally.",
);
await mobile.screenshot({
  path: `${output}/mobile-result.png`,
  fullPage: true,
});
await mobile.close();
const versions = { chromium: browser.version() };
await browser.close();
for (const [name, engine, channel] of [
  ["firefox", firefox],
  ["webkit", webkit],
  ["chrome", chromium, "chrome"],
  ["edge", chromium, "msedge"],
]) {
  try {
    const instance = await engine.launch(channel ? { channel } : {});
    versions[name] = instance.version();
    await instance.close();
  } catch {
    versions[name] = "Not available";
  }
}
assert.equal(
  errors.length,
  0,
  "The walkthrough must not contain application errors.",
);
await writeFile(
  `${output}/environment.json`,
  JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      timeZone: "Asia/Dhaka",
      baseUrl: base,
      node: process.version,
      os: `${os.platform()} ${os.release()} ${os.arch()}`,
      cpu: os.cpus()[0]?.model,
      logicalCpus: os.cpus().length,
      memoryGiB: Math.round(os.totalmem() / 1024 ** 3),
      browsers: versions,
      desktopViewport: "1440 × 1000",
      mobileViewport: "360 × 800",
      sample: {
        fixture: "public/samples/studio-sample.jpg",
        inputBytes: source.length,
        outputBytes: result.length,
        clickToVerifiedMs: sampleElapsedMs,
        note: "Single observed walkthrough run, including automation overhead; not a performance benchmark.",
      },
      applicationErrors: errors,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Captured four screenshots, the complete walkthrough, and environment evidence in ${output}.`,
);
