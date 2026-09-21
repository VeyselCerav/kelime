/* YDS Monster — network-first SW (PWA güncellemesi için HTML/JS cache yok) */
const CACHE = 'yds-monster-v16';

function isWordImagePath(pathname) {
  return (
    pathname.startsWith('/ensik-gemini/') ||
    pathname.startsWith('/seviye-gemini/') ||
    pathname.startsWith('/modul-gemini/') ||
    pathname.startsWith('/word-images/')
  );
}

/** Sayfa / script / stil — asla cache’leme (eski PWA takılı kalmasın) */
function isAppShellPath(request, url) {
  if (request.destination === 'document') return true;
  if (request.mode === 'navigate') return true;
  if (request.destination === 'script' || request.destination === 'style') return true;
  if (url.pathname.startsWith('/_next/')) return true;
  if (url.pathname === '/sw.js') return true;
  return false;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(['/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'])
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('push', (event) => {
  let data = {
    title: 'Tekrar seni bekliyor',
    body: 'Ödev kelimelerini tekrar etmeye hazır mısın?',
    url: '/flashcards?module=odev',
    tag: 'odev-reminder',
  };
  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch {
    /* ignore */
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'YDS Monster', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'odev-reminder',
      renotify: true,
      data: { url: data.url || '/flashcards?module=odev' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) ||
    '/flashcards?module=odev';
  const absolute = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.navigate(absolute);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(absolute);
        }
      })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (isWordImagePath(url.pathname) || isAppShellPath(request, url)) {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((c) => c || caches.match('/'))
      )
    );
    return;
  }

  // Diğer (ikon vb.): network, offline’da cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && request.destination === 'image') {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
