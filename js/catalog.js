// Reciters, radios, lessons and surah helpers, merged from the audio API + admin-managed data.
import { appConfig, cachedJSON, SOURCES } from './api.js';
import { FEATURED_KEYS, RECITER_TAGS, SCHOLARS, SURAHS } from './data.js';
import { i18n, pick, t } from './i18n.js';
import { norm, pad3, store, toast } from './util.js';

// ---------- surahs ----------
export const surahName = (n) => (i18n.lang === 'ar' ? SURAHS[n - 1].name : SURAHS[n - 1].en);
export const surahTitle = (n) => t('surah.name', { name: surahName(n) });
export const surahMeta = (n) => {
  const s = SURAHS[n - 1];
  return t('surah.meta', { type: t(s.type === 'M' ? 'surah.meccan' : 'surah.medinan'), n: s.ayahs });
};
/** Search key matching both the Arabic and the English name. */
export const surahKey = (n) => `${norm(SURAHS[n - 1].name)} ${norm(SURAHS[n - 1].en)} ${n}`;

export const countryName = (id) => (id && id !== 'other' ? t('country.' + id) : '');
export const surahNumbers = (moshaf) => (moshaf.surah_list || '').split(',').filter(Boolean).map(Number);

// ---------- reciters ----------
const cache = new Map(); // lang → merged list
const audioLang = () => (i18n.lang === 'ar' ? 'ar' : 'eng');
const fetchReciters = (lang) => cachedJSON(`${SOURCES.audio}/reciters?language=${lang}`, { key: 'reciters-' + lang, maxAgeHours: 72 });

function tag(arabicName) {
  const key = norm(arabicName);
  const match = RECITER_TAGS.find(([k]) => key.includes(k));
  return { key, country: match ? match[1] : 'other', late: Boolean(match?.[2]) };
}

// Freely licensed portraits from Wikimedia Commons, matched once by scripts/reciter-photos (id → image URL).
let photosPromise = null;
const loadPhotos = () => (photosPromise ||= fetch('data/reciter-photos.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({})));

export async function loadReciters() {
  const lang = audioLang();
  if (cache.has(lang)) return cache.get(lang);

  // Arabic names drive country tagging and featured detection; localized names are shown to the user.
  const [arabic, localized, config, photos] = await Promise.all([
    fetchReciters('ar'),
    lang === 'ar' ? null : fetchReciters(lang).catch(() => null),
    appConfig(),
    loadPhotos(),
  ]);
  const shown = new Map((localized?.reciters || []).map((r) => [r.id, r]));
  const profiles = new Map((config?.reciters || []).map((p) => [p.id, p]));

  const list = (arabic.reciters || [])
    .filter((r) => r.moshaf?.length)
    .map((r) => {
      const display = shown.get(r.id) || r;
      const profile = profiles.get(r.id);
      const tagged = tag(r.name);
      return {
        ...display,
        moshaf: display.moshaf?.length ? display.moshaf : r.moshaf,
        arabicKey: tagged.key,
        key: tagged.key + ' ' + norm(display.name),
        country: profile?.country || tagged.country,
        late: profile ? profile.late : tagged.late,
        featured: Boolean(profile?.featured),
        photo: profile?.photo || photos[r.id] || null, // admin photo first, then the bundled Wikimedia one
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, i18n.lang));
  cache.set(lang, list);
  return list;
}

export const findReciter = (list, id) => list.find((r) => String(r.id) === String(id));

export function featuredReciters(list) {
  const chosen = list.filter((r) => r.featured);
  return chosen.length ? chosen : FEATURED_KEYS.map((k) => list.find((r) => r.arabicKey.includes(k))).filter(Boolean);
}

export function reciterLine(r) {
  const parts = [countryName(r.country), r.late ? t('common.late') : ''];
  if (r.moshaf.length === 2) parts.push(t('recitations.two'));
  else if (r.moshaf.length > 2) parts.push(t('recitations.many', { n: r.moshaf.length }));
  return parts.filter(Boolean).join(i18n.lang === 'ar' ? '، ' : ' · ');
}

/** Player queue for one recitation (moshaf) of a reciter. */
export function surahQueue(reciter, moshaf) {
  const sub = reciter.name + (reciter.moshaf.length > 1 ? ` — ${moshaf.name}` : '');
  const fav = { type: 'reciter', ref: String(reciter.id), title: reciter.name, subtitle: reciterLine(reciter) };
  const photo = reciter.photo || null;
  return surahNumbers(moshaf).map((n) => ({ title: surahTitle(n), sub, url: moshaf.server + pad3(n) + '.mp3', surah: n, fav, photo }));
}

// ---------- shuffle ----------
function shuffled(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- random khatma ----------
// Every surah once, in a random order, until the whole Quran is complete; progress survives restarts.
const khatmaKey = (reciter, moshaf) => `khatma:${reciter.id}:${moshaf.id}`;

function khatmaItems(reciter, moshaf, plan, from) {
  const bySurah = new Map(surahQueue(reciter, moshaf).map((item) => [item.surah, item]));
  const key = khatmaKey(reciter, moshaf);
  return plan.order.slice(from).map((n, i) => ({
    ...bySurah.get(n),
    khatma: { key, order: plan.order, pos: from + i, done: plan.done, reciter: reciter.name },
  }));
}

export function khatmaProgress(reciter, moshaf) {
  const plan = store.get(khatmaKey(reciter, moshaf));
  return { heard: plan?.pos || 0, total: surahNumbers(moshaf).length, done: plan?.done || 0 };
}

export function randomKhatma(reciter, moshaf) {
  const available = surahNumbers(moshaf);
  let plan = store.get(khatmaKey(reciter, moshaf));
  if (!plan || plan.pos >= plan.order.length || plan.order.length !== available.length) {
    plan = { order: shuffled(available), pos: 0, done: plan?.done || 0 };
  }
  // When this khatma is about to end, line up the next one (it is only saved once it starts playing).
  let next = plan;
  const refill = () => {
    next = { order: shuffled(available), pos: 0, done: next.done + 1 };
    return khatmaItems(reciter, moshaf, next, 0);
  };
  return { queue: khatmaItems(reciter, moshaf, plan, plan.pos), refill };
}

/**
 * Called by the player when a khatma surah starts (finished = false) and when it ends (finished = true).
 * A surah only counts as heard once it has played to the end, so closing the app mid-surah never skips it.
 */
export function recordKhatma(item, finished) {
  const { key, order, pos, done, reciter } = item.khatma;
  const next = finished ? pos + 1 : pos;
  const completed = next === order.length;
  store.set(key, { order, pos: next, done: completed ? done + 1 : done });
  if (completed) toast(t('khatma.completed', { name: reciter }));
}

/**
 * Radio-style listening: a different reciter and surah every time.
 * options.pool narrows the reciters (e.g. only the user's saved ones).
 */
export function mixedShuffle(reciters, { pool = null } = {}) {
  const candidates = (pool?.length ? pool : reciters).filter((r) => r.moshaf?.length);
  const recent = [];
  const pickOne = () => {
    // Choose only among reciters not heard recently (a back-to-back repeat is impossible).
    const fresh = candidates.filter((c) => !recent.includes(c.id));
    const pool = fresh.length ? fresh : candidates.filter((c) => c.id !== recent[recent.length - 1]);
    const r = (pool.length ? pool : candidates)[Math.floor(Math.random() * (pool.length || candidates.length))];
    recent.push(r.id);
    if (recent.length > Math.min(5, candidates.length - 1)) recent.shift();
    const moshaf = r.moshaf[Math.floor(Math.random() * r.moshaf.length)];
    const surahs = surahNumbers(moshaf);
    const n = surahs[Math.floor(Math.random() * surahs.length)];
    return surahQueue(r, moshaf).find((item) => item.surah === n);
  };
  const refill = () => Array.from({ length: 10 }, pickOne).filter(Boolean);
  return { queue: refill(), refill };
}

// ---------- lessons & radio ----------
export async function loadScholars() {
  const config = await appConfig();
  if (config?.scholars?.length) {
    return config.scholars.map((s) => ({ ...s, name: pick(s.name), topic: pick(s.topic) }));
  }
  return SCHOLARS.map((s, i) => {
    const [name, topic] = s[i18n.lang] || s.en;
    return { id: i + 1, name, topic, country: s.country, late: Boolean(s.late), photo: null, source: s.source, ref: s.ref, lessons: null };
  });
}

// ---------- audio lessons ----------
// Every source is normalised to lessons of the shape { key, title, parts: [{ url }] | null }.
// IslamHouse lists lessons first and resolves their audio files on demand (getLessonParts).
const LESSON_PAGE = 30;
const audioFile = /\.(mp3|m4a|ogg)$/i;
const naturalOrder = (a, b) => a.localeCompare(b, 'ar', { numeric: true });
// Community collections sometimes bundle theme songs, nasheeds or promos: only real lessons are listed.
const notALesson = /(أغني|اغني|أغان|اغان|غناء|نشيد|أنشود|انشود|موسيق|تتر|برومو|إعلان|اعلان|song|music|nasheed|promo|trailer)/i;
const tidyTitle = (text) => text.replace(/[_]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

async function archiveLessons(identifier) {
  const meta = await cachedJSON(`${SOURCES.archive}/metadata/${encodeURIComponent(identifier)}`, { key: 'ia-' + identifier, maxAgeHours: 24 * 7 });
  return (meta.files || [])
    .filter((f) => f.source === 'original' && audioFile.test(f.name) && !notALesson.test(`${f.title || ''} ${f.name}`))
    .sort((a, b) => naturalOrder(a.name, b.name))
    .map((f) => ({
      key: f.name,
      title: tidyTitle(f.title || f.name.split('/').pop().replace(audioFile, '')),
      parts: [{ url: `${SOURCES.archive}/download/${encodeURIComponent(identifier)}/${f.name.split('/').map(encodeURIComponent).join('/')}` }],
    }));
}

/** One page of a scholar's lessons: { lessons, more }. */
export async function scholarLessons(scholar, page = 1) {
  if (scholar.source === 'islamhouse') {
    const url = `${SOURCES.islamhouse}/main/get-author-items/${encodeURIComponent(scholar.ref)}/audios/ar/ar/${page}/${LESSON_PAGE}/json`;
    const { data = [] } = await cachedJSON(url, { key: `ih-${scholar.ref}-${page}`, maxAgeHours: 24 });
    return { lessons: data.map((d) => ({ key: String(d.id), title: d.title, parts: null })), more: data.length === LESSON_PAGE };
  }
  const all = scholar.source === 'archive' ? await archiveLessons(scholar.ref) : (scholar.lessons || []).map((l, i) => ({ key: String(i), title: l.title, parts: [{ url: l.url }] }));
  const start = (page - 1) * LESSON_PAGE;
  return { lessons: all.slice(start, start + LESSON_PAGE), more: all.length > start + LESSON_PAGE };
}

/** Audio files of one lesson, in order. */
export async function getLessonParts(lesson) {
  if (lesson.parts) return lesson.parts;
  const item = await cachedJSON(`${SOURCES.islamhouse}/main/get-item/${encodeURIComponent(lesson.key)}/ar/json`, { key: 'ih-item-' + lesson.key, maxAgeHours: 24 * 30 });
  lesson.parts = (item.attachments || []).filter((a) => audioFile.test(a.url || '')).map((a) => ({ url: a.url }));
  return lesson.parts;
}

export const loadRadios = () =>
  cachedJSON(`${SOURCES.audio}/radios?language=${audioLang()}`, { key: 'radios-' + audioLang(), maxAgeHours: 72 }).then((d) => d.radios || []);

export const loadTafsir = () =>
  cachedJSON(`${SOURCES.audio}/tafsir?language=ar`, { key: 'tafsir', maxAgeHours: 72 }).then((d) => d.tafasir || null);

/** Language changed: drop localized lists so screens refetch in the new language. */
export const resetCatalog = () => cache.clear();
