const CACHE = 'levelup-v6';
const ASSETS = [
  './',
  './index.html',
  './simple.html',
  './css/styles.css',
  './js/app.js',
  './js/achievements.js',
  './js/auth.js',
  './js/challenges.js',
  './js/date.js',
  './js/gamify.js',
  './js/icons.js',
  './js/logic.js',
  './js/nav-icons.js',
  './js/onboarding.js',
  './js/plans.js',
  './js/simple-board.js',
  './js/storage.js',
  './js/supabase.js',
  './js/sync.js',
  './js/theme.js',
  './js/ui-feedback.js',
  './js/widgets.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Cache API only supports http(s); skip chrome-extension, data, blob, etc.
  const url = e.request.url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
