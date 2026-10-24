import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import sharp from "sharp";

async function downloadPng(page: Page, name = "cleaned-01.png") {
  const link = page.getByRole("link", {
    name: `Download ${name}`,
    exact: true,
  });
  await expect(link).toBeVisible();
  const event = page.waitForEvent("download");
  await link.click();
  const download = await event;
  expect(download.suggestedFilename()).toBe(name);
  return readFile((await download.path())!);
}

test("all eight EXIF orientations are applied once", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/");
  await page
    .locator('input[type="file"]')
    .setInputFiles(
      Array.from(
        { length: 8 },
        (_, i) => `tests/fixtures/orientation-${i + 1}.jpg`,
      ),
    );
  await expect(page.getByText("Ready to clean", { exact: true })).toHaveCount(
    8,
  );
  await page.getByRole("button", { name: "Clean images", exact: true }).click();
  await expect(page.getByText("8 verified PNGs", { exact: true })).toBeVisible({
    timeout: 25_000,
  });
  const orders = [
    "RGBY",
    "GRYB",
    "YBGR",
    "BYRG",
    "RBGY",
    "BRYG",
    "YGBR",
    "GYRB",
  ];
  const colors: Record<string, number[]> = {
    R: [237, 54, 54],
    G: [25, 163, 83],
    B: [40, 92, 232],
    Y: [234, 198, 43],
  };
  for (let i = 0; i < 8; i++) {
    const output = await downloadPng(page, `cleaned-0${i + 1}.png`);
    const { data, info } = await sharp(output)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect([info.width, info.height]).toEqual(i < 4 ? [120, 80] : [80, 120]);
    const corners = [
      [10, 10],
      [info.width - 11, 10],
      [10, info.height - 11],
      [info.width - 11, info.height - 11],
    ];
    corners.forEach(([x, y], corner) => {
      const offset = (y * info.width + x) * 4;
      const expected = colors[orders[i][corner]];
      const distance = expected.reduce(
        (sum, channel, c) => sum + Math.abs(data[offset + c] - channel),
        0,
      );
      expect(distance, `orientation ${i + 1}, corner ${corner}`).toBeLessThan(
        65,
      );
    });
  }
});

test("transparency and visible PNG pixels survive reconstruction", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator('input[type="file"]')
    .setInputFiles([
      "tests/fixtures/transparent.png",
      "tests/fixtures/text-metadata.png",
    ]);
  await expect(page.getByText("Ready to clean", { exact: true })).toHaveCount(
    2,
  );
  await page.getByRole("button", { name: "Clean images", exact: true }).click();
  await expect(
    page.getByText("2 verified PNGs", { exact: true }),
  ).toBeVisible();
  const transparent = await downloadPng(page);
  const { data, info } = await sharp(transparent)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  expect([info.width, info.height]).toEqual([64, 48]);
  for (let offset = 3; offset < data.length; offset += 4)
    expect(Math.abs(data[offset] - 128)).toBeLessThanOrEqual(1);
  const textOutput = await downloadPng(page, "cleaned-02.png");
  const originalPixels = await sharp("tests/fixtures/text-metadata.png")
    .ensureAlpha()
    .raw()
    .toBuffer();
  const outputPixels = await sharp(textOutput).ensureAlpha().raw().toBuffer();
  expect(outputPixels.equals(originalPixels)).toBe(true);
});

test("mixed invalid inputs do not erase the valid result", async ({ page }) => {
  await page.goto("/");
  const files = [
    "renamed-svg.jpg",
    "animated.png",
    "corrupt.jpg",
    "corrupt.png",
    "too-many-pixels.png",
    "broken-exif.jpg",
    "plain.png",
  ];
  await page
    .locator('input[type="file"]')
    .setInputFiles(files.map((file) => `tests/fixtures/${file}`));
  await expect(
    page.locator(".queue-status").filter({ hasText: "Needs attention" }),
  ).toHaveCount(6);
  await expect(page.getByText("Ready to clean", { exact: true })).toHaveCount(
    1,
  );
  await page
    .locator(".queue-item")
    .filter({ hasText: "broken-exif.jpg" })
    .click();
  await expect(
    page.getByText(
      "Unable to inspect. This does not mean the image has no metadata.",
    ),
  ).toBeVisible();
  await page.locator(".queue-item").filter({ hasText: "plain.png" }).click();
  await expect(page.getByText(/Not detected by this reader/)).toBeVisible();
  await page.getByRole("button", { name: "Clean images", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Download cleaned-07.png" }),
  ).toBeVisible();
});

test("cancel keeps the first verified file and retry completes the second", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      postMessage(message: { operation: string; file: File }) {
        // Delay delivery, never fake a worker result: cancellation remains deterministic on fast hardware.
        if (message.operation === "clean" && message.file.name === "second.jpg")
          setTimeout(() => super.postMessage(message), 1000);
        else super.postMessage(message);
      }
    };
  });
  await page.goto("/");
  const source = await readFile("tests/fixtures/gps-camera.jpg");
  await page.locator('input[type="file"]').setInputFiles([
    { name: "first.jpg", mimeType: "image/jpeg", buffer: source },
    { name: "second.jpg", mimeType: "image/jpeg", buffer: source },
  ]);
  await expect(page.getByText("Ready to clean", { exact: true })).toHaveCount(
    2,
  );
  await page.getByRole("button", { name: "Clean images", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Download cleaned-01.png" }),
  ).toBeVisible();
  await expect(
    page.locator(".queue-item").filter({ hasText: "second.jpg" }),
  ).toContainText("Cleaning");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Download cleaned-01.png" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Download cleaned-02.png" }),
  ).toHaveCount(0);
  await page.locator(".queue-item").filter({ hasText: "second.jpg" }).click();
  await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Download cleaned-02.png" }),
  ).toBeVisible();
});

test("selection limits preserve the queue and report useful errors", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles({
    name: "too-big.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.alloc(20 * 1024 ** 2 + 1),
  });
  await expect(page.locator("#queue-notice")).toContainText(
    "20 MiB or smaller",
  );
  const source = await readFile("tests/fixtures/plain.png");
  await page.locator('input[type="file"]').setInputFiles(
    Array.from({ length: 11 }, (_, i) => ({
      name: `${i}.png`,
      mimeType: "image/png",
      buffer: source,
    })),
  );
  await expect(page.getByText("Ready to clean", { exact: true })).toHaveCount(
    10,
  );
  await expect(page.locator("#queue-notice")).toContainText("up to 10 images");
});

test("no file data leaves the browser and clear/refresh release session state", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const active = new Set<string>();
    const create = URL.createObjectURL.bind(URL),
      revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (object) => {
      const url = create(object);
      active.add(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      active.delete(url);
      revoke(url);
    };
    Object.defineProperty(window, "__qaActiveUrls", { value: active });
  });
  await page.goto("/");
  const requests: { url: string; method: string; body: string | null }[] = [];
  const sockets: string[] = [];
  page.on("request", (request) =>
    requests.push({
      url: request.url(),
      method: request.method(),
      body: request.postData(),
    }),
  );
  page.on("websocket", (socket) => sockets.push(socket.url()));
  const source = await readFile("tests/fixtures/gps-camera.jpg");
  await page.locator('input[type="file"]').setInputFiles({
    name: "private-client-name.jpg",
    mimeType: "image/jpeg",
    buffer: source,
  });
  await expect(page.getByText("Ready to clean", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clean images", exact: true }).click();
  await downloadPng(page);
  for (const request of requests) {
    expect(new URL(request.url).origin).toBe(new URL(page.url()).origin);
    expect(request.method).toBe("GET");
    expect(request.body).toBeNull();
    expect(request.url).not.toMatch(/private-client|Demo%20Author|DEMO-SERIAL/);
  }
  expect(sockets).toEqual([]);
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  await page.getByRole("button", { name: "Clear all", exact: true }).click();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __qaActiveUrls: Set<string> }).__qaActiveUrls
          .size,
    ),
  ).toBe(0);
  await expect(page.locator(".queue-item")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /Download cleaned/ }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".queue-item")).toHaveCount(0);
});

test("sample, responsive layout, keyboard focus, accessibility and console", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  await expect(page).toHaveTitle(/AssetSanitize/);
  await page.getByRole("button", { name: "Try a sample", exact: true }).click();
  await expect(page.getByText("Ready to clean", { exact: true })).toBeVisible();
  for (const width of [360, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  }
  const help = page.getByRole("button", { name: "How it works", exact: true });
  await help.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText(/does not redact faces/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(help).toBeFocused();
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe("auto");
  expect(errors).toEqual([]);
});
