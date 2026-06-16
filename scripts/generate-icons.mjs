// Generates PNG icons (192, 512, maskable) from icon.svg.
// Uses sharp if available; otherwise falls back to resvg-js; otherwise warns.
// Run: node scripts/generate-icons.mjs

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(".");
const svgPath = join(root, "icon.svg");

if (!existsSync(svgPath)) {
  console.error("icon.svg not found");
  process.exit(1);
}

const svg = readFileSync(svgPath);

async function loadRenderer() {
  try {
    return { name: "sharp", mod: (await import("sharp")).default };
  } catch {
    try {
      return { name: "resvg", mod: (await import("@resvg/resvg-js")).default };
    } catch {
      return null;
    }
  }
}

const targets = [
  { file: "icon-192.png", size: 192, padding: 0 },
  { file: "icon-512.png", size: 512, padding: 0 },
  { file: "icon-maskable-512.png", size: 512, padding: 0.2 }
];

const renderer = await loadRenderer();

if (!renderer) {
  console.warn(
    "No PNG renderer found (sharp or @resvg/resvg-js). Skipping PNG icon generation."
  );
  console.warn(
    "SVG icons will be used. For broad PWA compatibility, install sharp and re-run:"
  );
  console.warn("  npm install sharp && node scripts/generate-icons.mjs");
  process.exit(0);
}

for (const { file, size, padding } of targets) {
  const out = join(root, file);
  if (renderer.name === "sharp") {
    await renderer.mod(svg).resize(size, size).png().toFile(out);
  } else {
    const fitTo = Math.round(size * (1 - padding));
    const fit = new renderer.mod.Resvg(svg, {
      fitTo: { mode: "width", value: fitTo }
    });
    const png = fit.render().asPng();
    writeFileSync(out, png);
  }
  console.log(`Generated ${file} (${size}x${size})`);
}
