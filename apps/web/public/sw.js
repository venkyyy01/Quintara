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
 *
 * All paths are derived from the worker's own location, so the same file
 * works at a domain root and under a GitHub Pages project path.
 */

const BASE = new URL("./", self.location.href).pathname.replace(/\/$/, "");
const at = (path) => `${BASE}${path}` || "/";

const CACHE_VERSION = "quintara-shell-v5";
const SHELL_ROUTES = [
  "",
  "/offline",
  "/rules",
  "/tutorial",
  "/play/local",
  "/play/online",
  "/stats",
  "/settings",
  "/privacy",
  "/terms",
];
const SHELL_ASSETS = [
  "/manifest.webmanifest",
  "/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

function shellUrls() {
  const urls = new Set(SHELL_ASSETS.map(at));
  for (const route of SHELL_ROUTES) {
    const path = at(route);
    urls.add(path || "/");
    // Static exports use trailing slashes; server builds usually do not.
    if (path) urls.add(`${path}/`);
  }
  return [...urls];
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      // One missing route must not abort the whole install.
      await Promise.all(
        shellUrls().map(async (url) => {
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
          (await caches.match(at("/offline"))) ??
          (await caches.match(at("/offline/"))) ??
          (await caches.match(at("/"))) ??
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
    url.pathname.startsWith(at("/api/")) ||
    url.pathname.startsWith(at("/ws")) ||
    url.pathname.startsWith(at("/_next/webpack-hmr"))
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, true));
    return;
  }

  if (
    url.pathname.startsWith(at("/_next/static/")) ||
    url.pathname.startsWith(at("/icons/")) ||
    url.pathname === at("/icon.svg") ||
    url.pathname === at("/manifest.webmanifest") ||
    ["style", "script", "font", "image"].includes(request.destination)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // RSC payloads and other same-origin data: fresh when online, cached when
  // offline so visited routes remain usable.
  event.respondWith(networkFirst(request, false));
});
