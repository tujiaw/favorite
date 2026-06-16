import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "index.html",
  "app.js",
  "src/controller.js",
  "src/templates.js",
  "src/data.js",
  "src/crypto.js",
  "src/utils.js",
  "src/state.js",
  "src/constants.js",
  "src/icons.js",
  "styles.css",
  "config.js",
  "manifest.webmanifest",
  "icon.svg",
  "icon-maskable.svg",
  "sw.js",
  "supabase/schema.sql",
  "docs/design/personal-favorite-center.md"
];

const missing = requiredFiles.filter((file) => !existsSync(file));
if (missing.length) {
  console.error(`Missing required files: ${missing.join(", ")}`);
  process.exit(1);
}

const app = [
  "app.js",
  "src/controller.js",
  "src/templates.js",
  "src/data.js",
  "src/crypto.js",
  "src/utils.js"
]
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");
const requiredSnippets = [
  "signInWithOAuth",
  "auth.getUser",
  "getAuthRedirectUrl",
  "encryptSecret",
  "decryptSecret",
  "classifyContent",
  "uploadImage",
  "favorite-images"
];

const missingSnippets = requiredSnippets.filter((snippet) => !app.includes(snippet));
if (missingSnippets.length) {
  console.error(`Missing required app behavior markers: ${missingSnippets.join(", ")}`);
  process.exit(1);
}

const schema = readFileSync("supabase/schema.sql", "utf8");
const policies = [
  "favorites_select_own",
  "favorites_insert_own",
  "favorites_update_own",
  "favorites_delete_own",
  "favorite_images_insert_own"
];
const missingPolicies = policies.filter((policy) => !schema.includes(policy));
if (missingPolicies.length) {
  console.error(`Missing RLS policies: ${missingPolicies.join(", ")}`);
  process.exit(1);
}

console.log("Static app verification passed.");
