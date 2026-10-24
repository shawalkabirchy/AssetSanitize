import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("drop accepts real signatures despite a misleading extension and MIME type", async ({
  page,
}) => {
  await page.goto("/");
  const source = (await readFile("tests/fixtures/plain.png")).toString(
    "base64",
  );
  await page.evaluate((base64) => {
    const transfer = new DataTransfer();
    const bytes = Uint8Array.from(atob(base64), (value) => value.charCodeAt(0));
    transfer.items.add(
      new File([bytes], "actually-png.jpg", { type: "image/jpeg" }),
    );
    const zone = document.querySelector(".upload-zone")!;
    zone.dispatchEvent(
      new DragEvent("dragover", {
        bubbles: true,
        cancelable: true,
        dataTransfer: transfer,
      }),
    );
    zone.dispatchEvent(
      new DragEvent("dragleave", { bubbles: true, relatedTarget: window }),
    );
    zone.dispatchEvent(
      new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer: transfer,
      }),
    );
  }, source);
  await expect(page.getByText("Ready to clean", { exact: true })).toBeVisible();
  await expect(page.locator("figcaption")).toContainText("PNG");
  await page.getByRole("button", { name: "Clean images", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Download cleaned-01.png" }),
  ).toBeVisible();
});

test("clear during inspection ignores a real worker reply delivered late", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    Object.assign(window, { __qaLateDelivered: false, __qaLateQueued: false });
    window.Worker = class extends NativeWorker {
      delayed = false;
      postMessage(message: { file: File }) {
        this.delayed = message.file.name === "late.png";
        super.postMessage(message);
      }
      set onmessage(callback: ((event: MessageEvent) => void) | null) {
        super.onmessage = (event) => {
          if (this.delayed && event.data.kind === "inspected") {
            Object.assign(window, { __qaLateQueued: true });
            setTimeout(() => {
              Object.assign(window, { __qaLateDelivered: true });
              callback?.(event);
            }, 700);
          } else callback?.(event);
        };
      }
    };
  });
  await page.goto("/");
  const buffer = await readFile("tests/fixtures/plain.png");
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "late.png", mimeType: "image/png", buffer });
  await expect(
    page.locator(".queue-status").filter({ hasText: "Inspecting…" }),
  ).toBeVisible();
  // Wait until the real reply has reached the wrapper and is awaiting delivery.
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { __qaLateQueued: boolean }).__qaLateQueued,
      ),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Clear all", exact: true }).click();
  await expect(page.locator(".queue-item")).toHaveCount(0);
  await page
    .locator('input[type="file"]')
    .setInputFiles("tests/fixtures/plain.png");
  await expect(page.getByText("Ready to clean", { exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { __qaLateDelivered: boolean })
            .__qaLateDelivered,
      ),
    )
    .toBe(true);
  await expect(page.locator(".queue-item")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "plain.png", exact: true }),
  ).toBeVisible();
});
