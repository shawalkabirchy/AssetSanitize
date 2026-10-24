import { test, expect } from "@playwright/test";
import ExifReader from "exifreader";
import { readFile } from "node:fs/promises";
import { verifyPng } from "../../src/lib/image-format";

test("static export processes and independently verifies a metadata fixture", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator('input[type="file"]')
    .setInputFiles("tests/fixtures/gps-camera.jpg");
  await expect(page.getByText("Ready to clean", { exact: true })).toBeVisible();
  await expect(page.getByText("DEMO-SERIAL-0001", { exact: true })).toHaveCount(
    1,
  );
  await page.getByRole("button", { name: "Clean images" }).click();
  const downloadLink = page.getByRole("link", {
    name: "Download cleaned-01.png",
  });
  await expect(downloadLink).toBeVisible();
  const downloaded = page.waitForEvent("download");
  await downloadLink.click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe("cleaned-01.png");
  const output = await readFile((await download.path())!);
  verifyPng(output, { width: 1200, height: 800 });
  const tags = ExifReader.load(output, { expanded: true });
  expect(JSON.stringify(tags)).not.toMatch(
    /Demo Author|DEMO-SERIAL|GPSLatitude|DateTimeOriginal/,
  );
});
