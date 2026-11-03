const cacheName = "knowledge-os-v2";
const core = ["/", "/api/concepts", "/manifest.webmanifest", "/icon.svg", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    const response = await fetch("/", { cache: "reload" });
    if (!response.ok) throw new Error("Could not precache the app shell");
    const html = await response.text();
    const assets = Array.from(html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g), match => match[1]);
    await cache.addAll([...core, ...assets]);
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith("knowledge-os-") && name !== cacheName) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (!core.includes(url.pathname) && !url.pathname.startsWith("/assets/")) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    try {
      const response = await fetch(event.request);
      if (response.ok) {
        await cache.put(event.request, response.clone());
        return response;
      }
      return (await cache.match(event.request)) ?? response;
    } catch {
      return (await cache.match(event.request)) ?? Response.error();
    }
  })());
});
