const CACHE_NAME = "ffm-public-v1";
const PUBLIC_ASSETS = ["/offline", "/icon.svg", "/icon-1024.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PUBLIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isPublicNavigation(request, url) {
  return request.mode === "navigate" &&
    !url.pathname.startsWith("/api/") &&
    !url.pathname.startsWith("/dashboard") &&
    !url.pathname.startsWith("/account") &&
    !url.pathname.startsWith("/admin") &&
    !url.pathname.startsWith("/auth");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || !isPublicNavigation(request, url)) return;

  event.respondWith(
    fetch(request).catch(async () => (await caches.match(request)) ?? (await caches.match("/offline")))
  );
});
