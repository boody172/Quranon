// Service worker.
// App files are precached per release and served straight from the cache (no network wait on open).
// A new release = a new VERSION here: the browser sees the changed sw.js, precaches the new files,
// and open pages reload once onto them. Catalogue APIs: stale-while-revalidate. Audio is never touched.
const VERSION = 'v21';
const SHELL = `qn-shell-${VERSION}`;
const DATA = 'qn-data-v1';
const SHELL_FILES = [
  './', 'index.html', 'manifest.json', 'icons/icon.svg', 'icons/logo.svg', 'icons/icon-192.webp', 'icons/icon-256.webp', 'icons/icon-512.webp',
  'css/fonts.css', 'css/style.css', 'i18n/ar.json', 'i18n/en.json', 'data/reciter-photos.json',
  'js/app.js', 'js/util.js', 'js/config.js', 'js/api.js', 'js/catalog.js', 'js/account.js', 'js/player.js',
  'js/qibla.js', 'js/art.js', 'js/data.js', 'js/i18n.js', 'js/sleep.js', 'js/carplay.js', 'js/ads.js',
  'js/views/home.js', 'js/views/listen.js', 'js/views/mushaf.js', 'js/views/more.js', 'js/views/hifz.js', 'js/views/plus.js', 'js/views/circles.js',
  'fonts/plex-ar-400.woff2', 'fonts/plex-ar-500.woff2', 'fonts/plex-ar-600.woff2',
  'fonts/alexandria-ar-500.woff2', 'fonts/alexandria-ar-700.woff2', 'fonts/amiri-quran.woff2',
];

self.addEventListener('install', (e) => {
  // cache: 'reload' skips the HTTP cache so a release never precaches an older copy of a file.
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES.map((f) => new Request(f, { cache: 'reload' })))));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const stale = (await caches.keys()).filter((k) => k !== SHELL && k !== DATA);
    await Promise.all(stale.map((k) => caches.delete(k)));
    await self.clients.claim(); // open pages reload themselves once on controllerchange (js/app.js)
  })());
});

const put = (name, req, res) => { if (res.ok && res.type !== 'opaque') { const copy = res.clone(); caches.open(name).then((c) => c.put(req, copy)); } return res; };

const cacheFirst = (req, name) => caches.match(req).then((hit) => hit || fetch(req).then((res) => put(name, req, res)));

const staleWhileRevalidate = (req, name) => caches.open(name).then((cache) => cache.match(req).then((hit) => {
  const network = fetch(req).then((res) => put(name, req, res));
  if (hit) { network.catch(() => {}); return hit; }
  return network;
}));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // Never touch audio/video (Safari sends them through the worker as range requests) or non-GET calls.
  if (req.method !== 'GET' || req.destination === 'audio' || req.destination === 'video' || req.headers.has('range')) return;

  if (url.origin === location.origin) {
    if (url.pathname.endsWith('/sw.js')) return;
    // Pages: the precached app (any #/route is the same index.html).
    if (req.mode === 'navigate' && !/\.\w+$/.test(url.pathname.replace(/\/$/, '')) ) {
      e.respondWith(caches.match('index.html', { cacheName: SHELL }).then((hit) => hit || fetch(req)));
      return;
    }
    e.respondWith(caches.match(req, { cacheName: SHELL, ignoreSearch: true }).then((hit) => hit || staleWhileRevalidate(req, DATA)));
  } else if (url.host === 'api.alquran.cloud' || url.host === 'api.quran.com') e.respondWith(cacheFirst(req, DATA));
  else if (url.host === 'mp3quran.net' && url.pathname.startsWith('/api/')) e.respondWith(staleWhileRevalidate(req, DATA));
});
