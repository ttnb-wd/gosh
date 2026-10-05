// Retirement worker: no third-party code or offline private-data caching.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil((async () => {
  await self.registration.unregister();
  await Promise.all((await caches.keys()).map(key => caches.delete(key)));
  const pages = await self.clients.matchAll({ type: "window" });
  for (const page of pages) page.postMessage({ type: "GOSH_WORKER_RETIRED" });
})()));
