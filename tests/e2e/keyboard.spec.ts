import { test, expect } from "@playwright/test";

test("keyboard completes the sample, clean, download and clear workflow", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to image workspace" })).toBeFocused();
  const sample = page.getByRole("button", { name: "Try a sample", exact: true });
  await sample.focus(); await page.keyboard.press("Enter");
  await expect(page.getByText("Ready to clean", { exact: true })).toBeVisible();
  const clean = page.getByRole("button", { name: "Clean images", exact: true });
  await clean.focus(); await page.keyboard.press("Space");
  const link = page.getByRole("link", { name: "Download cleaned-01.png", exact: true });
  await expect(link).toBeVisible();
  await link.focus();
  const event = page.waitForEvent("download"); await page.keyboard.press("Enter");
  expect((await event).suggestedFilename()).toBe("cleaned-01.png");
  const clear = page.getByRole("button", { name: "Clear all", exact: true });
  await clear.focus(); await page.keyboard.press("Enter");
  await expect(page.locator(".queue-item")).toHaveCount(0);
  await expect(page.getByText("A closer look at your image.", { exact: true })).toBeVisible();
});
