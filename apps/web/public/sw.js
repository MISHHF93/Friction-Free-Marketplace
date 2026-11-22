const CACHE_NAME = "ffm-public-v2";
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
  if (request.headers.get("authorization")) return false;
  return request.mode === "navigate" &&
    !url.pathname.startsWith("/api/") &&
    !url.pathname.startsWith("/dashboard") &&
    !url.pathname.startsWith("/account") &&
    !url.pathname.startsWith("/admin") &&
    !url.pathname.startsWith("/seller") &&
    !url.pathname.startsWith("/assistant") &&
    !url.pathname.startsWith("/auth");
}

function isImmutableStaticAsset(url) {
  if (url.pathname.startsWith("/_next/static/")) return true;
  if (url.pathname.startsWith("/icons/") || url.pathname.startsWith("/brand/")) return true;
  return /\/(icon-1024\.png|icon\.svg|apple-touch-icon\.png|favicon(?:-\d+)?\.(?:png|ico))$/.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (isImmutableStaticAsset(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) {
        await cache.put(request, response.clone());
      }
      return response;
    })());
    return;
  }

  if (!isPublicNavigation(request, url)) return;

  event.respondWith(
    fetch(request).catch(async () => (await caches.match(request)) ?? (await caches.match("/offline")))
  );
});
