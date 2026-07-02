/* =========================================
   Debt Manager — Service Worker
   Network-first: always tries to fetch the
   latest files when online, and only falls
   back to the cache when you're offline.
   This is deliberate — a cache-first strategy
   here would add a second layer of caching on
   top of the browser's, making it even harder
   to tell if you're looking at the latest code.
========================================= */

const CACHE_NAME = "debt-manager-v8";

const PRECACHE_URLS = [
    "./",
    "./index.html",
    "./manifest.json",
    "./icons/icon-192.png",
    "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {

    // Only handle same-origin GET requests. Cross-origin requests (like
    // Google Fonts) are left completely alone and pass through normally —
    // iOS Safari's service worker implementation is stricter than
    // desktop browsers about caching cross-origin/opaque responses, and
    // there's no real benefit to intercepting those here anyway.
    const isSameOrigin = new URL(event.request.url).origin === self.location.origin;
    if (event.request.method !== "GET" || !isSameOrigin) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const copy = response.clone();
                caches.open(CACHE_NAME)
                    .then((cache) => cache.put(event.request, copy))
                    .catch(() => {}); // never let a caching failure break the actual page load
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
