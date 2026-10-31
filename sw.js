// Service worker: يحفظ واجهة التطبيق للعمل بدون إنترنت، ويخزّن نصوص السور بعد أول قراءة
const SHELL = 'qn-shell-v1', DATA = 'qn-data-v1';
const FILES = ['./', 'index.html', 'css/style.css', 'js/data.js', 'js/app.js', 'icons/icon.svg', 'manifest.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => ![SHELL, DATA].includes(k)).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.pathname.endsWith('.mp3')) return; // الصوت يُبث مباشرة
  if (u.origin === location.origin) { e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(SHELL).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request))); return; }
  if (/alquran\.cloud|fonts\.(googleapis|gstatic)\.com/.test(u.host)) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { const c = r.clone(); caches.open(DATA).then(x => x.put(e.request, c)); return r; })));
  }
});
