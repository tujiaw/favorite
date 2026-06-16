// Service Worker for 个人收藏中心 PWA
// Strategy:
//   - Dev (localhost): network-first everywhere (no stale cache)
//   - Production:
//       Navigations: network-first, fallback to cached index.html for offline
//       Same-origin static: cache-first
//       Cross-origin (esm.sh / Supabase): stale-while-revalidate
//   - config.js: always network (env-specific)

const VERSION = "v1";
const SHELL_CACHE = `favorite-shell-${VERSION}`;
const RUNTIME_CACHE = `favorite-runtime-${VERSION}`;

const IS_DEV = ["localhost", "127.0.0.1"].includes(self.location.hostname);

const APP_SHELL = [
  "/",
  "/index.html",
  "/app.js",
  "/styles.css",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-maskable.svg",
  "/src/controller.js",
  "/src/templates.js",
  "/src/state.js",
  "/src/data.js",
  "/src/crypto.js",
  "/src/utils.js",
  "/src/constants.js",
  "/src/icons.js",
  "/src/ai.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // config.js is environment-specific, never serve from cache
  if (url.origin === self.location.origin && url.pathname === "/config.js") return;

  // Dev: bypass cache entirely for live reload
  if (IS_DEV) return;

  // Navigations: network-first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/index.html"))
        )
    );
    return;
  }

  // Same-origin static assets: cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  // Cross-origin (esm.sh, Supabase, favicons): stale-while-revalidate
  event.respondWith(
    caches.open(RUNTIME_CACHE).then((cache) =>
      cache.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    )
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") self.skipWaiting();
});
