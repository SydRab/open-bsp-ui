// [crm] P3-12: a minimal service worker, installability only. It caches
// the app shell for a reliable "Add to Home Screen" prompt and offline
// fallback, nothing else -- no self.registration.pushManager, no `push`
// event listener, no VAPID. CLAUDE.md's "Internal/system notifications
// are WhatsApp-first, permanently... never a browser/web-push dependency"
// rule means this file must never grow a push subscription; the lead/SLA
// alerts this same roadmap line asks for are delivered over WhatsApp
// instead (see crm._send_internal_whatsapp_alert, api/api).
const CACHE_NAME = "tgl-crm-shell-v1";
const APP_SHELL = [
  "/",
  "/manifest.json",
  "/logo-192x192.png",
  "/logo-512x512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
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
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Network-first for navigations (so a signed-in rep always sees fresh
// data when online), falling back to the cached shell only when the
// network is unreachable -- never serves a stale app bundle over a good
// connection. Everything else (API/Supabase calls, assets) passes through
// untouched; this worker does not try to cache or intercept them.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;

  event.respondWith(fetch(event.request).catch(() => caches.match("/")));
});
