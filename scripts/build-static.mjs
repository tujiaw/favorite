import { existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(".");
const dist = join(root, "dist");

if (!existsSync(join(dist, "index.html"))) {
  console.error("Static build failed: dist/index.html was not created by Vite.");
  process.exit(1);
}

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

console.log(`Static build generated ${dist}`);
