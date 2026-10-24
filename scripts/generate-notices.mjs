import assert from "node:assert/strict";
import { readFile, readdir, writeFile } from "node:fs/promises";

const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
const included = new Set();
const sections = [
  "AssetSanitize — third-party license notices\nGenerated from the installed production dependencies in package-lock.json.\nProject code: MIT, copyright 2026 ConsoleLog Studio.\n",
];
for (const [path, entry] of Object.entries(lock.packages)) {
  if (!path || entry.dev) continue;
  let pkg;
  try {
    pkg = JSON.parse(await readFile(`${path}/package.json`, "utf8"));
  } catch {
    continue;
  } // Optional dependencies for other operating systems are not installed or shipped.
  const key = `${pkg.name}@${pkg.version}`;
  if (included.has(key)) continue;
  included.add(key);
  let text = `\n${"=".repeat(72)}\n${key}\nLicense: ${pkg.license ?? entry.license ?? "See package source"}\n`;
  const files = (await readdir(path)).filter((name) =>
    /^(licen[cs]e|copying|notice)(\.|$)/i.test(name),
  );
  for (const file of files) {
    try {
      text += `\n--- ${file} ---\n${await readFile(`${path}/${file}`, "utf8")}\n`;
    } catch {
      /* A similarly named directory is not a notice file. */
    }
  }
  if (!files.length)
    text += `Source: https://www.npmjs.com/package/${pkg.name}\n`;
  sections.push(text);
}
assert(
  [...included].some((name) => name.startsWith("exifr@")),
  "The metadata reader's notice must be present.",
);
assert(
  [...included].some((name) => name.startsWith("react@")),
  "React's notice must be present.",
);
await writeFile("public/third-party-notices.txt", sections.join("\n").replace(/[\t ]+$/gm, "").trimEnd() + "\n");
console.log(
  `Retained license notices for ${included.size} installed production packages.`,
);
