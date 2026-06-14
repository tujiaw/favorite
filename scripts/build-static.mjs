import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(".");
const dist = join(root, "dist");

const files = [
  "index.html",
  "app.js",
  "styles.css",
  "manifest.webmanifest",
  "icon.svg"
];

rmSync(dist, { force: true, recursive: true });
mkdirSync(dist, { recursive: true });

for (const file of files) {
  copyFileSync(join(root, file), join(dist, file));
}

cpSync(join(root, "src"), join(dist, "src"), { recursive: true });

const config = {
  url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  anonKey:
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
};

writeFileSync(
  join(dist, "config.js"),
  `window.FAVORITE_SUPABASE = ${JSON.stringify(config, null, 2)};\n`,
  "utf8"
);

if (!existsSync(join(dist, "index.html"))) {
  console.error("Static build failed: dist/index.html was not created.");
  process.exit(1);
}

console.log(`Static build generated ${dist}`);
