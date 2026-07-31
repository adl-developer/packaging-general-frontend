/**
 * Minimal, network-only service worker.
 *
 * This is a commerce site — a shop must never serve stale prices or stale
 * stock. See docs/superpowers/specs/2026-07-30-pwa-design.md §4: the
 * out-of-stock feature exists specifically to stop customers acting on
 * information that is no longer true, and a cache-first service worker would
 * reintroduce that failure at a lower layer, invisibly.
 *
 * Rules this file follows:
 *  - /store/*, /api/*, and every Medusa call: NEVER intercepted. No
 *    `respondWith`, ever — the browser fetches the network directly.
 *  - Cart, checkout, account, order pages, and every other navigation:
 *    network-first. The cache is only used as a last resort when the network
 *    request itself fails (i.e. genuinely offline), and only to show the
 *    static offline fallback page — never a cached copy of the real page.
 *  - The ONLY thing ever cache-first: Next.js's own build output under
 *    `/_next/static/*`, which is content-hashed and immutable by
 *    construction (a given hash's bytes never change; a new deploy emits new
 *    hashes). That's a standard, safe pattern — it carries no product data.
 *  - Non-GET requests (mutations) are never touched.
 *
 * If in doubt for any route: do not cache it.
 */

const STATIC_CACHE = "pg-static-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      try {
        await cache.add(OFFLINE_URL);
      } catch {
        // Best-effort only — a failed precache must never block install.
      }
    })(),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

function isImmutableBuildAsset(url) {
  return url.origin === self.location.origin && url.pathname.startsWith("/_next/static/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never touch mutations (cart/checkout/account writes all go through
  // POST/PUT/PATCH/DELETE server actions or route handlers).
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Only cache-first path in this whole file: hashed, immutable build assets.
  if (isImmutableBuildAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })(),
    );
    return;
  }

  // Top-level page navigations: always go to the network first. Only fall
  // back to the static offline page when the network request itself throws
  // (no connectivity) — never serve a cached copy of a real page.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(STATIC_CACHE);
          const offline = await cache.match(OFFLINE_URL);
          return offline ?? Response.error();
        }
      })(),
    );
    return;
  }

  // Everything else — /store/*, /api/*, RSC payload fetches, cart, checkout,
  // account, order routes, images, fonts, anything not matched above — is
  // deliberately left alone. No `respondWith` call means the browser handles
  // it exactly as if this service worker did not exist: network-only.
});
