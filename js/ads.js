// Ads (store apps only — the website stays ad-free).
// One Google "App Open" ad when the app opens or comes back after a while, never more than once every few hours,
// never on the first launch, never over a recitation or a memorisation session, and always introduced with a
// short honest note. Family-safe content only. Consent (GDPR) and Apple's tracking prompt are handled first.
import { appConfig } from './api.js';
import { CONFIG } from './config.js';
import { t } from './i18n.js';
import { $, store } from './util.js';

const cap = window.Capacitor;
const native = Boolean(cap?.isNativePlatform?.());
const platform = cap?.getPlatform?.();
const AdMob = native ? cap.registerPlugin?.('AdMob') : null;
const AppOpen = native ? cap.registerPlugin?.('AppOpenAd') : null;

let settings = { monetization: CONFIG.monetization, ...CONFIG.ads };
let ready = null;
let loaded = false;
let hiddenAt = 0;

/** 'ads' | 'plus' | 'none' — the dashboard (if hosted) overrides config.js. */
export const monetization = () => settings.monetization;

function applyServerSettings(config) {
  if (config?.monetization) settings.monetization = config.monetization;
  if (config?.ads) settings = { ...settings, ...config.ads, appOpen: { ...settings.appOpen, ...config.ads.appOpen } };
}

const unitId = () => settings.appOpen?.[platform];
// never over a recitation, a lesson or an open memorisation session
const audioBusy = () => !$('#audio')?.paused || Boolean(document.querySelector('#verse'));

async function start() {
  // 1. Privacy consent where the law requires it (EU/UK…) — Google's own form.
  try {
    const info = await AdMob.requestConsentInfo();
    if (info.isConsentFormAvailable && info.status === 'REQUIRED') await AdMob.showConsentForm();
  } catch { /* consent service unavailable: ads stay non-personalised */ }
  // 2. iOS: Apple's tracking prompt (declining still shows ads, just less relevant ones).
  if (platform === 'ios') {
    try {
      const { status } = await AdMob.trackingAuthorizationStatus();
      if (status === 'notDetermined') await AdMob.requestTrackingAuthorization();
    } catch { /* older iOS */ }
  }
  // 3. Start the SDK with family-safe ads only.
  await AdMob.initialize({ maxAdContentRating: 'General' });
}

async function preload() {
  if (loaded || !unitId()) return;
  try { await AppOpen.load({ adUnitId: unitId() }); loaded = true; } catch { loaded = false; }
}

function due() {
  const last = store.get('adShownAt', 0);
  return Date.now() - last > settings.everyHours * 36e5;
}

/** The honest note before the ad. Resolves after ~2.5 s or when the user taps "continue". */
function note() {
  return new Promise((resolve) => {
    const box = document.createElement('div');
    box.className = 'ad-note';
    box.setAttribute('role', 'dialog');
    box.innerHTML = `<div class="ad-card"><b>${t('ads.title')}</b><p>${t('ads.text')}</p>
      <button class="pill primary">${t('ads.continue')}</button></div>`;
    document.body.append(box);
    let done = false;
    const finish = () => { if (done) return; done = true; box.remove(); resolve(); };
    box.querySelector('button').onclick = finish;
    setTimeout(finish, 2500);
  });
}

async function maybeShow() {
  if (settings.monetization !== 'ads' || !loaded || !due() || audioBusy() || document.hidden) return;
  await note();
  if (audioBusy()) return; // the user started something meanwhile
  try {
    loaded = false;
    store.set('adShownAt', Date.now());
    await AppOpen.show();
  } catch { /* expired or failed: try again next time */ }
  preload();
}

export async function initAds() {
  applyServerSettings(await appConfig().catch(() => null));
  if (!AdMob || !AppOpen || settings.monetization !== 'ads') return;

  const launches = store.get('launches', 0) + 1;
  store.set('launches', launches);
  ready ||= start().then(preload).catch(() => {});
  await ready;
  if (launches > (settings.skipFirstLaunches ?? 1)) {
    // give a slow network a few seconds, never longer: the user came to listen, not to wait
    const t0 = Date.now();
    while (!loaded && Date.now() - t0 < 4000) await new Promise((r) => setTimeout(r, 250));
    maybeShow();
  }

  // Coming back after a while counts as an "open" too.
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (hiddenAt && Date.now() - hiddenAt > 30 * 6e4) { await preload(); maybeShow(); }
  });
}
