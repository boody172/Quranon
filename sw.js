// Service worker: app shell works offline; Quran text is cached after first read;
// catalogue APIs use stale-while-revalidate. Audio is streamed, never cached here.
const VERSION = 'v5';
const SHELL = `qn-shell-${VERSION}`;
const DATA = 'qn-data-v1';
const SHELL_FILES = [
  './', 'index.html', 'manifest.json', 'icons/icon.svg', 'css/fonts.css', 'css/style.css',
  'js/app.js', 'js/util.js', 'js/config.js', 'js/api.js', 'js/catalog.js', 'js/account.js', 'js/player.js',
  'js/qibla.js', 'js/art.js', 'js/data.js', 'js/views/home.js', 'js/views/listen.js', 'js/views/mushaf.js', 'js/views/more.js',
  'fonts/plex-ar-400.woff2', 'fonts/plex-ar-500.woff2', 'fonts/plex-ar-600.woff2',
  'fonts/alexandria-ar-500.woff2', 'fonts/alexandria-ar-700.woff2', 'fonts/amiri-quran.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== DATA).map((k) => caches.delete(k)))));
  self.clients.claim();
});

const cacheFirst = (req, name) => caches.match(req).then((hit) => hit || fetch(req).then((res) => {
  if (res.ok) { const copy = res.clone(); caches.open(name).then((c) => c.put(req, copy)); }
  return res;
}));

const staleWhileRevalidate = (req, name) => caches.open(name).then((cache) => cache.match(req).then((hit) => {
  const network = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; });
  return hit || network;
}));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.pathname.endsWith('.mp3')) return;

  if (url.origin === location.origin) e.respondWith(staleWhileRevalidate(req, SHELL));
  else if (url.host === 'api.alquran.cloud') e.respondWith(cacheFirst(req, DATA));
  else if (url.host === 'mp3quran.net' && url.pathname.startsWith('/api/')) e.respondWith(staleWhileRevalidate(req, DATA));
});
