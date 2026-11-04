// Network-first so edits show up immediately; the cache is only the offline fallback.
const CACHE = "sitting-v37";
self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) return;
  if (new URL(e.request.url).pathname.startsWith("/api/")) return; // live rooms are never cached
  e.respondWith(
    fetch(e.request).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request))
  );
});
// Tapping a "your turn" notification brings the game back: focus an open window, or open the app.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    const open = list.find((w) => "focus" in w);
    return open ? open.focus() : self.clients.openWindow("/");
  }));
});
