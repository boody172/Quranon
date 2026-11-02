// Network layer: in-memory + localStorage cache with stale-while-revalidate,
// so a screen the user has seen once opens instantly afterwards.
import { CONFIG } from './config.js';
import { SURAHS } from './data.js';

const SURAH_AYAHS = SURAHS.map((s) => s.ayahs);

// Data providers. The dashboard can point these at another provider or a mirror
// (see "API sources" in the admin settings); values arrive with /api/config.
export const SOURCES = {
  audio: 'https://mp3quran.net/api/v3',
  text: 'https://api.alquran.cloud/v1',
  textProvider: 'alquran_cloud', // alquran_cloud | quran_com
  islamhouse: 'https://api3.islamhouse.com/v3/paV29H2gm56kvLPy', // public API key published by IslamHouse
  archive: 'https://archive.org',
  app: CONFIG.apiBase.replace(/\/$/, ''),
};

export function applySources(sources) {
  if (!sources) return;
  if (sources.audio_api) SOURCES.audio = sources.audio_api.replace(/\/$/, '');
  if (sources.text_api) SOURCES.text = sources.text_api.replace(/\/$/, '');
  if (sources.text_provider) SOURCES.textProvider = sources.text_provider;
  if (sources.islamhouse_api) SOURCES.islamhouse = sources.islamhouse_api.replace(/\/$/, '');
}

const memory = new Map();
const inflight = new Map();
const HOUR = 36e5;

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    err.body = await res.json().catch(() => null);
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

// Persistent cache in IndexedDB: large catalogue responses (reciter lists, surah texts) used to live in
// localStorage, whose synchronous reads/writes froze the screen and whose 5 MB quota filled up.
const idb = (() => {
  let opening = null;
  const open = () => (opening ||= new Promise((resolve, reject) => {
    const req = indexedDB.open('quranon', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('cache');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
  const run = (mode, fn) => open().then((db) => new Promise((resolve) => {
    const tx = db.transaction('cache', mode);
    const req = fn(tx.objectStore('cache'));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = tx.onabort = () => resolve(undefined);
  })).catch(() => undefined);
  return {
    get: (key) => run('readonly', (s) => s.get(key)),
    set: (key, value) => run('readwrite', (s) => s.put(value, key)),
    clear: () => run('readwrite', (s) => s.clear()),
  };
})();
export const clearPersistentCache = () => idb.clear();

// One-time cleanup: free the localStorage space the old cache took (memorisation progress lives there).
try {
  for (const k of Object.keys(localStorage)) if (k.startsWith('qn:c:')) localStorage.removeItem(k);
} catch { /* storage unavailable */ }

/**
 * Cached GET. Fresh cache → returned immediately. Stale cache → returned immediately
 * and refreshed in the background. No cache → network (deduplicated).
 */
export async function cachedJSON(url, { key, maxAgeHours = 24 } = {}) {
  const cacheKey = 'c:' + (key || url);
  const refresh = () => {
    if (!inflight.has(cacheKey)) {
      inflight.set(cacheKey, fetchJSON(url)
        .then((value) => {
          const entry = { t: Date.now(), v: value };
          memory.set(cacheKey, entry);
          idb.set(cacheKey, entry); // async, off the critical path
          return value;
        })
        .finally(() => inflight.delete(cacheKey)));
    }
    return inflight.get(cacheKey);
  };

  let hit = memory.get(cacheKey);
  if (!hit) {
    hit = await idb.get(cacheKey);
    if (hit) memory.set(cacheKey, hit);
  }
  if (hit) {
    if (Date.now() - hit.t > maxAgeHours * HOUR) refresh().catch(() => {});
    return hit.v;
  }
  return refresh();
}

/** Calls the Laravel API. Throws { status, body } on failure. */
export function appRequest(path, { method = 'GET', body, token } = {}) {
  if (!SOURCES.app) return Promise.reject(Object.assign(new Error('offline'), { status: 0 }));
  return fetchJSON(SOURCES.app + '/api/' + path, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/** Admin-managed content (features, reciter photos, scholars). Null when no backend is configured. */
export function appConfig() {
  if (!SOURCES.app) return Promise.resolve(null);
  return cachedJSON(SOURCES.app + '/api/config', { key: 'app-config', maxAgeHours: 1 / 60 }).catch(() => null);
}

/**
 * Uthmani text of one surah, normalised to [{ number, text }] whichever provider is active.
 */
export async function surahText(n) {
  if (SOURCES.textProvider === 'quran_com') {
    const data = await cachedJSON(`${SOURCES.text}/quran/verses/uthmani?chapter_number=${n}`, { key: `qc-surah${n}`, maxAgeHours: 24 * 365 });
    return data.verses.map((v) => ({ number: Number(v.verse_key.split(':')[1]), text: v.text_uthmani }));
  }
  const { data } = await cachedJSON(`${SOURCES.text}/surah/${n}/quran-uthmani`, { key: 'surah' + n, maxAgeHours: 24 * 365 });
  return data.ayahs.map((a) => ({ number: a.numberInSurah, text: a.text }));
}

/** One verse by its global index (1–6236). */
export async function verseByIndex(index) {
  if (SOURCES.textProvider === 'quran_com') {
    const { verse } = await cachedJSON(`${SOURCES.text}/verses/by_key/${keyFromIndex(index)}?fields=text_uthmani`, { key: 'qc-v' + index });
    const [surah, ayah] = verse.verse_key.split(':').map(Number);
    return { surah, ayah, text: verse.text_uthmani };
  }
  const { data } = await cachedJSON(`${SOURCES.text}/ayah/${index}/quran-uthmani`, { key: 'v' + index });
  return { surah: data.surah.number, ayah: data.numberInSurah, text: data.text };
}

function keyFromIndex(index) {
  let surah = 0;
  while (index > SURAH_AYAHS[surah]) index -= SURAH_AYAHS[surah++];
  return `${surah + 1}:${index}`;
}
