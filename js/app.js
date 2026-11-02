// Entry point: language, router, top bar and release notices. Screens live in js/views/.
import { appConfig, applySources, clearPersistentCache, surahText } from './api.js';
import { loadReciters, resetCatalog } from './catalog.js';
import { SURAHS } from './data.js';
import { i18n, pick, t } from './i18n.js';
import { player } from './player.js';
import { $, clearCachedData, esc, ICON, store } from './util.js';
import { initCarPlay, refreshCarPlay } from './carplay.js';
import { initAds, monetization } from './ads.js';

// Screens load on first visit (the service worker already has them cached), so opening the app only
// parses the home screen.
const lazy = (load, name = 'default') => () => load().then((m) => m[name]);
const listen = () => import('./views/listen.js');
const mushaf = () => import('./views/mushaf.js');
const more = () => import('./views/more.js');
const circles = () => import('./views/circles.js');

const ROUTES = {
  home: { load: lazy(() => import('./views/home.js')) },
  listen: { load: lazy(listen, 'listen'), title: 'page.listen' },
  reciter: { load: lazy(listen, 'reciter'), parent: '#/listen' },
  mushaf: { load: lazy(mushaf, 'mushaf'), title: 'page.mushaf' },
  surah: { load: lazy(mushaf, 'surah'), parent: '#/mushaf' },
  radio: { load: lazy(more, 'radio'), title: 'page.radio' },
  lessons: { load: lazy(more, 'lessons'), title: 'page.lessons' },
  scholar: { load: lazy(more, 'scholarView'), parent: '#/lessons' },
  qibla: { load: lazy(more, 'qiblaView'), title: 'page.qibla' },
  search: { load: lazy(more, 'search'), title: 'page.search' },
  saved: { load: lazy(more, 'savedView'), title: 'page.saved' },
  account: { load: lazy(more, 'accountView'), title: 'page.account' },
  plus: { load: lazy(() => import('./views/plus.js'), 'plus'), title: 'page.plus' },
  hifz: { load: lazy(() => import('./views/hifz.js'), 'hifz'), title: 'page.hifz' },
  circles: { load: lazy(circles, 'circles'), title: 'page.circles', parent: '#/hifz' },
  circle: { load: lazy(circles, 'circle'), parent: '#/circles' },
};

const view = $('#view');
let cleanups = [];
let currentName = 'home';
let navigatedInApp = false;

function parseHash() {
  const [name, ...args] = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  return ROUTES[name] ? { name, args } : { name: 'home', args: [] };
}

function setTitle(text) {
  $('#pageTitle').textContent = text;
  document.title = text === t('app.name') ? text : `${text} — ${t('app.name')}`;
}

async function route() {
  let { name, args } = parseHash();
  if (name === 'plus' && monetization() !== 'plus') { name = 'home'; args = []; } // free with ads: no subscription
  const def = ROUTES[name];
  cleanups.forEach((fn) => fn());
  cleanups = [];
  player.closeSheet();
  if (name !== currentName) navigatedInApp = true;
  currentName = name;

  setTitle(def.title ? t(def.title) : t('app.name'));
  $('#backBtn').hidden = name === 'home';
  $('#accountBtn').hidden = name !== 'home';
  $('#langBtn').hidden = name !== 'home';

  view.classList.remove('enter');
  void view.offsetWidth; // restart the enter animation
  view.classList.add('enter');
  window.scrollTo(0, 0);

  try {
    const render = await def.load();
    if (currentName !== name) return; // the user moved on while the screen was loading
    await render(view, { args, setTitle, onCleanup: (fn) => cleanups.push(fn) });
  } catch (err) {
    console.error(err);
    view.innerHTML = `<div class="empty-state"><h2>${t('error.offlineTitle')}</h2><p>${t('error.offlineText')}</p>
      <button class="pill primary" id="retry">${t('error.retry')}</button></div>`;
    $('#retry').onclick = route;
  }
}

// ---------- language ----------
function renderLangButton() {
  $('#langBtn').textContent = i18n.lang === 'ar' ? 'EN' : 'ع';
  if (i18n.languages.length > 2) $('#langBtn').innerHTML = ICON.globe;
}

async function switchLanguage(code) {
  await i18n.use(code);
  resetCatalog();
  renderLangButton();
  route();
  refreshCarPlay();
}

$('#langBtn').onclick = () => {
  const langs = i18n.languages;
  if (langs.length === 2) return switchLanguage(langs.find((l) => l.code !== i18n.lang).code);
  const menu = $('#langMenu');
  menu.innerHTML = langs.map((l) => `<button data-lang="${esc(l.code)}" lang="${esc(l.code)}">${esc(l.name)}${l.code === i18n.lang ? ICON.check : ''}</button>`).join('');
  menu.hidden = !menu.hidden;
};
$('#langMenu').onclick = (e) => {
  const btn = e.target.closest('[data-lang]');
  if (!btn) return;
  $('#langMenu').hidden = true;
  switchLanguage(btn.dataset.lang);
};

// ---------- release notice ----------
function checkRelease(config) {
  if (!config) return; // backend unreachable: nothing to compare
  const release = config.release;
  const version = release?.version || 0;
  const seen = store.get('release');
  if (seen == null) { store.set('release', version); return; } // first visit: already up to date
  if (version <= seen) return;
  const banner = $('#updateBanner');
  banner.querySelector('b').textContent = t('update.available');
  banner.querySelector('span').textContent = pick(release.notes) || '';
  banner.querySelector('button').textContent = t('update.apply');
  banner.hidden = false;
  banner.querySelector('button').onclick = async () => {
    store.set('release', release.version);
    clearCachedData();
    await clearPersistentCache();
    if ('caches' in window) await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
    location.reload();
  };
}

// ---------- navigation helpers ----------
$('#backBtn').onclick = () => {
  if (navigatedInApp && history.length > 1) history.back();
  else location.hash = ROUTES[currentName].parent || '#/home';
};

// Remember the reciter the user opens, so "listen" in the mushaf uses their favourite voice.
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href^="#/reciter/"]');
  if (link) store.set('prefReciter', link.getAttribute('href').split('/')[2]);
});

// Warm the cache the moment a finger touches a link, so the next screen opens instantly.
document.addEventListener('pointerdown', (e) => {
  const href = e.target.closest('a[href^="#/"]')?.getAttribute('href') || '';
  const surahMatch = href.match(/^#\/surah\/(\d+)/);
  if (surahMatch && SURAHS[surahMatch[1] - 1]) surahText(Number(surahMatch[1])).catch(() => {});
  else if (/^#\/(listen|reciter|search|saved)/.test(href)) loadReciters().catch(() => {});
}, { passive: true });

// ---------- boot ----------
const config = await Promise.race([appConfig(), new Promise((resolve) => setTimeout(resolve, 600))]);
applySources(config?.sources);
await i18n.init(config?.i18n);
renderLangButton();
addEventListener('hashchange', route);
route();
checkRelease(config);
initCarPlay();
initAds();

// Content published while the app was open still reaches the user on their next screen.
(window.requestIdleCallback || ((fn) => setTimeout(fn, 1200)))(async () => {
  const fresh = await appConfig();
  checkRelease(fresh);
  loadReciters().catch(() => {});
  listen().catch(() => {});
  mushaf().catch(() => {});
});

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  // When a new version takes over, reload once so every file comes from the same release.
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !reloaded) { reloaded = true; location.reload(); }
  });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => reg.update()).catch(() => {});
}
