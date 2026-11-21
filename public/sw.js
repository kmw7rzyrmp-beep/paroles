// Service worker de Star Song : rend le site installable et l'ouvre même sans connexion.
// Change VERSION quand tu modifies les icônes pour forcer la mise à jour du cache.
const VERSION = 'star-song-v3';
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

  // Icônes et images : la copie gardée si elle existe, sinon le réseau
  event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
