/* =========================================================
   Synora service worker — makes the installed app open
   instantly and keep working offline.

     page (any route)   network first; offline → the last copy
     /assets/*          cache first: build files have content
                        hashes in their names, so they never change
     other files here   cached copy at once, refreshed behind it
     push message       shows the server's reminder (Synora closed)
     notification tap   focuses Synora, or opens it, on the right page;
                        "Attended" / "Missed" buttons open the dashboard
                        with the answer, which records it
     /api/*, analytics, other sites
                        not touched (always live; other sites stay
                        under the page's Content Security Policy)

   Bump VERSION to drop the cached page and small files.
   ========================================================= */

const VERSION = "v4";
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

/* A reminder pushed by the server (server/push.js) while Synora may be
   closed: { title, body, tag, url, actions?, attend? }. `attend`
   ({ classId, date }) marks the after-class "Did you attend?" question. */
self.addEventListener("push", (event) => {
  let msg;
  try { msg = event.data ? event.data.json() : {}; } catch { msg = { title: "Synora", body: event.data && event.data.text() }; }
  const options = {
    body: msg.body || "", tag: msg.tag, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png",
    data: { url: msg.url || "/dashboard", attend: msg.attend || null },
  };
  if (Array.isArray(msg.actions)) options.actions = msg.actions.slice(0, 2);
  if (msg.attend) options.requireInteraction = true;
  event.waitUntil(self.registration.showNotification(msg.title || "Synora", options));
});

/* Tapping a reminder brings Synora forward (or opens it) on the right page.
   A button on a "Did you attend?" notification carries the answer to the
   dashboard, which records it (src/pages/Dashboard.jsx). */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  let url = data.url || (event.notification.tag === "focus" ? "/focus" : "/dashboard");
  if (data.attend && (event.action === "attended" || event.action === "missed")) {
    url = "/dashboard?" + new URLSearchParams({ attend: data.attend.classId, date: data.attend.date, outcome: event.action });
  }
  event.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const client = open.find((c) => new URL(c.url).origin === self.location.origin);
    if (client) { await client.focus(); return client.navigate ? client.navigate(url).catch(() => {}) : undefined; }
    return self.clients.openWindow(url);
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_vercel/")) return;
  /* Icons and the manifest always come straight from the network: iOS
     reads them when adding to the Home Screen, and a stale or wrong cached
     copy there shows a plain letter instead of the logo. */
  if (/^\/(apple-touch-icon|favicon|icons\/|manifest\.webmanifest)/.test(url.pathname)) return;

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
