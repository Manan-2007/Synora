/* =========================================================
   Synora service worker — makes the installed app open
   instantly and keep working offline.

     page (any route)   network first; offline → the last copy
     /assets/*          cache first: build files have content
                        hashes in their names, so they never change
     other files here   cached copy at once, refreshed behind it
     /api/*, analytics, other sites
                        not touched (always live; other sites stay
                        under the page's Content Security Policy)

   Bump VERSION to drop the cached page and small files.
   ========================================================= */

const VERSION = "v1";
const PAGE = "synora-page-" + VERSION;
const FILES = "synora-files-" + VERSION;
const ASSETS = "synora-assets";          // kept across versions; trimmed below
const MAX_ASSETS = 120;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PAGE).then((c) => c.add("/")).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith("synora-") && ![PAGE, FILES, ASSETS].includes(key)) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_vercel/")) return;

  if (request.mode === "navigate") event.respondWith(page(request));
  else if (url.pathname.startsWith("/assets/")) event.respondWith(asset(request));
  else event.respondWith(file(request));
});

/* Every route serves the same app shell (index.html), stored under "/". */
async function page(request) {
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      const copy = response.clone();
      caches.open(PAGE).then((c) => c.put("/", copy));
    }
    return response;
  } catch {
    return (await caches.match("/", { cacheName: PAGE })) || Response.error();
  }
}

async function asset(request) {
  const cached = await caches.match(request, { cacheName: ASSETS });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(ASSETS);
    await cache.put(request, response.clone());
    const keys = await cache.keys();
    for (const old of keys.slice(0, Math.max(0, keys.length - MAX_ASSETS))) await cache.delete(old);
  }
  return response;
}

async function file(request) {
  const cache = await caches.open(FILES);
  const cached = await cache.match(request);
  const fresh = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });
  if (cached) {
    fresh.catch(() => {});
    return cached;
  }
  return fresh;
}
