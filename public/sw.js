/* YDS Monster — minimal SW (kurulum / offline iskeleti) */
const CACHE = 'yds-monster-v3';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(['/', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'])
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Dış CDN (R2 vb.) isteklerine dokunma — mobilde kırık görsel yapıyordu
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        if (
          response.ok &&
          (request.destination === 'document' || request.destination === 'image')
        ) {
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || caches.match('/'))
      )
  );
});
