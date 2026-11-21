// Service worker de Star Song : rend le site installable et l'ouvre même sans connexion.
// Change VERSION quand tu modifies les icônes pour forcer la mise à jour du cache.
const VERSION = 'star-song-v9';
const SHELL = ['/', '/blindtest', '/manifest.webmanifest', '/icon.png', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/favicon.ico'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  // On ne touche jamais aux recherches, aux comptes ni aux autres sites : toujours en direct
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // Page : d'abord le réseau (pour avoir la dernière version), sinon la copie gardée
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(url.pathname, copy)); }
          return res;
        })
        .catch(async () => (await caches.match(url.pathname)) || caches.match('/'))
    );
    return;
  }

  // Code et styles (.js, .css) : toujours le réseau d'abord, pour avoir la dernière version du site
  if (/\.(js|css)$/.test(url.pathname)) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // Icônes et images : la copie gardée si elle existe, sinon le réseau
  event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});

// Notifications envoyées par le serveur (même quand le site est fermé)
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: 'Star Song', body: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(data.title || 'Star Song', {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    data: { url: data.url || '/' },
  }));
});

// clic sur la notification : on ouvre (ou on remet au premier plan) la bonne page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const tab of tabs) {
      if (new URL(tab.url).origin === self.location.origin && 'focus' in tab) {
        await tab.focus();
        if ('navigate' in tab) return tab.navigate(target);
        return;
      }
    }
    return self.clients.openWindow(target);
  })());
});
