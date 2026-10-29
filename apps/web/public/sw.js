/**
 * Quintara service worker (§33).
 *
 * Offline-supported: AI, local pass-and-play and tutorial (all client-side
 * engine). Online modes detect disconnection and recover via resync.
 *
 * Strategy:
 * - hashed build assets / icons: cache-first (immutable by name)
 * - navigations: network-first with cache fallback, then /offline
 * - other same-origin GETs (RSC payloads): network-first with cache fallback
 * - API and WebSocket traffic: never cached
 */

const CACHE_VERSION = "quintara-shell-v3";
const SHELL_ASSETS = [
  "/",
  "/offline",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/rules",
  "/tutorial",
  "/play/local",
  "/play/online",
  "/stats",
  "/settings",
  "/privacy",
  "/terms",
];

const STATIC_PATH = /^\/(?:_next\/static|icons)\//;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      // One missing route must not abort the whole install.
      await Promise.all(
        SHELL_ASSETS.map(async (url) => {
          try {
            await cache.add(url);
          } catch {
            // Route unavailable at install time; fetched on first use.
          }
        }),
      );
      // First install activates immediately; updates wait so the page can
      // offer a non-disruptive "new version" refresh.
      if (!self.registration.active) await self.skipWaiting();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request).then((response) => {
      if (response.ok && response.type === "basic") {
        const copy = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
      }
      return response;
    });
  });
}

function networkFirst(request, fallbackToShell) {
  return fetch(request)
    .then((response) => {
      if (response.ok && response.type === "basic") {
        const copy = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
      }
      return response;
    })
    .catch(async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (fallbackToShell) {
        return (
          (await caches.match("/offline")) ??
          (await caches.match("/")) ??
          Response.error()
        );
      }
      return new Response("Offline", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API, auth and dev HMR traffic are never cached.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/ws") ||
    url.pathname.startsWith("/_next/webpack-hmr")
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, true));
    return;
  }

  if (
    STATIC_PATH.test(url.pathname) ||
    url.pathname === "/icon.svg" ||
    url.pathname === "/manifest.webmanifest" ||
    ["style", "script", "font", "image"].includes(request.destination)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // RSC payloads and other same-origin data: fresh when online, cached when
  // offline so visited routes remain usable.
  event.respondWith(networkFirst(request, false));
});
