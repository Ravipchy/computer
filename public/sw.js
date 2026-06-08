// Self-unregistering service worker.
// We don't use a service worker for this app, but old visitors may still have
// one registered from a previous version. Browsers re-fetch this file
// automatically; on activation we unregister and drop all caches so users
// stop seeing stale Next.js / Turbopack chunks ("module factory not available").

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      } catch {
        /* ignore */
      }
      try {
        await self.registration.unregister();
      } catch {
        /* ignore */
      }
      try {
        const clients = await self.clients.matchAll({ type: "window" });
        clients.forEach((client) => {
          if ("navigate" in client) client.navigate(client.url);
        });
      } catch {
        /* ignore */
      }
    })(),
  );
});
