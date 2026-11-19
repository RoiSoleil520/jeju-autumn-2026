"use strict";
const CACHE_NAME = "jeju-autumn-2026-v14";
const CORE_FILES = [
  "./",
  "./index.html",
  "./appearance.js?v=20261119-compact-small",
  "./style.css?v=20261119-compact-small",
  "./data.js?v=20261119-compact-small",
  "./app.js?v=20261119-compact-small",
  "./schedule.js?v=20261119-compact-small",
  "./shops.js?v=20261119-compact-small",
  "./assets/icon.svg",
  "./assets/seongsan.webp",
  "./assets/saebyeol.webp",
  "./assets/shops/barnnet.webp",
  "./assets/shops/islander.webp",
  "./assets/shops/mood.webp",
  "./assets/shops/planer.webp",
  "./assets/shops/slomo.webp",
  "./assets/shops/studio943-1.webp",
  "./assets/shops/studio943-2.webp",
  "./assets/shops/studio943-3.webp",
  "./assets/shops/triple-1.webp",
  "./assets/shops/triple-2.webp",
  "./assets/shops/triple-3.webp",
  "./assets/shops/vintage-1.webp",
  "./assets/shops/vintage-2.webp",
  "./assets/shops/vintage-3.webp",
  "./manifest.webmanifest",
];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_FILES))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("jeju-autumn-2026-") && key !== CACHE_NAME,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    !event.request.url.startsWith(self.registration.scope)
  )
    return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, copy)),
          );
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === "navigate")
          return caches.match(new URL("./index.html", self.registration.scope));
        return Response.error();
      }),
  );
});
