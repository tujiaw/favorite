import { createServer } from "node:http";
import { createReadStream, existsSync, readFileSync, statSync, watch } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(".");
const port = Number(process.env.PORT || 3000);
loadLocalEnv();

const liveReloadClients = new Set();
const watchedFiles = [
  "index.html",
  "app.js",
  "sw.js",
  "src",
  "styles.css",
  ".env.local",
  "manifest.webmanifest",
  "icon.svg",
  "icon-maskable.svg"
];

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

const server = createServer((request, response) => {
  const url = new URL(request.url || "/", `http://localhost:${port}`);

  if (url.pathname === "/__dev/events") {
    response.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    });
    response.write("event: connected\ndata: ok\n\n");
    liveReloadClients.add(response);
    request.on("close", () => liveReloadClients.delete(response));
    return;
  }

  if (url.pathname === "/config.js") {
    loadLocalEnv();
    response.writeHead(200, {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "no-store"
    });
    response.end(
      `window.FAVORITE_SUPABASE = ${JSON.stringify(getSupabaseConfig(), null, 2)};\n`
    );
    return;
  }

  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = normalize(join(root, requested));

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  const contentType = types[extname(filePath)] || "application/octet-stream";

  if (filePath.endsWith("index.html")) {
    response.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store"
    });
    response.end(injectLiveReload(readFileSync(filePath, "utf8")));
    return;
  }

  response.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "no-store"
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, () => {
  console.log(`Favorite center is running at http://localhost:${port}`);
  console.log(`Supabase config: ${getSupabaseConfig().url ? "configured" : "not configured"}`);
  console.log("Live reload is watching static app files.");
});

function getSupabaseConfig() {
  return {
    url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    anonKey:
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      ""
  };
}

function loadLocalEnv() {
  const envPath = join(root, ".env.local");
  if (!existsSync(envPath)) return;

  const env = readFileSync(envPath, "utf8");
  for (const rawLine of env.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function injectLiveReload(html) {
  const script = `
    <script>
      (() => {
        const events = new EventSource("/__dev/events");
        events.addEventListener("reload", () => window.location.reload());
        events.onerror = () => console.debug("Live reload connection lost; retrying...");
      })();
    </script>
  `;
  return html.replace("</body>", `${script}\n  </body>`);
}

function notifyReload(file) {
  const payload = `event: reload\ndata: ${JSON.stringify({ file, time: Date.now() })}\n\n`;
  for (const client of liveReloadClients) {
    client.write(payload);
  }
  console.log(`Reloading clients after change: ${file}`);
}

const debounceTimers = new Map();
for (const relativeFile of watchedFiles) {
  const filePath = join(root, relativeFile);
  if (!existsSync(filePath)) continue;

  const isDirectory = statSync(filePath).isDirectory();
  watch(filePath, { persistent: true, recursive: isDirectory }, (_event, filename) => {
    clearTimeout(debounceTimers.get(relativeFile));
    debounceTimers.set(
      relativeFile,
      setTimeout(() => notifyReload(filename ? `${relativeFile}/${filename}` : relativeFile), 120)
    );
  });
}
