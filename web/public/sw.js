const scope = new URL(self.registration.scope);
const cachePrefix = "knowledge-os:" + scope.pathname + ":";
const cacheName = cachePrefix + "v1";
const core = ["./", "concepts.json", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png"]
  .map(path => new URL(path, scope).href);
const assetsPath = new URL("assets/", scope).pathname;

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    const response = await fetch(scope, { cache: "reload" });
    if (!response.ok) throw new Error("Could not precache the app shell");
    const html = await response.text();
    const assets = Array.from(html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g), match => new URL(match[1], scope).href);
    await cache.addAll([...core, ...assets]);
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith(cachePrefix) && name !== cacheName) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (!core.includes(url.href) && !url.pathname.startsWith(assetsPath)) return;
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
