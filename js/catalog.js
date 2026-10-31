// Reciters, radios, lessons and surah helpers, merged from the audio API + admin-managed data.
import { appConfig, cachedJSON, SOURCES } from './api.js';
import { FEATURED_KEYS, RECITER_TAGS, SCHOLARS, SURAHS } from './data.js';
import { i18n, pick, t } from './i18n.js';
import { norm, pad3 } from './util.js';

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

export async function loadReciters() {
  const lang = audioLang();
  if (cache.has(lang)) return cache.get(lang);

  // Arabic names drive country tagging and featured detection; localized names are shown to the user.
  const [arabic, localized, config] = await Promise.all([
    fetchReciters('ar'),
    lang === 'ar' ? null : fetchReciters(lang).catch(() => null),
    appConfig(),
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
        photo: profile?.photo || null,
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
  return surahNumbers(moshaf).map((n) => ({ title: surahTitle(n), sub, url: moshaf.server + pad3(n) + '.mp3', surah: n }));
}

// ---------- lessons & radio ----------
export async function loadScholars() {
  const config = await appConfig();
  if (config?.scholars?.length) {
    return config.scholars.map((s) => ({ ...s, name: pick(s.name), topic: pick(s.topic) }));
  }
  return SCHOLARS.map((s, i) => {
    const [name, topic] = s[i18n.lang] || s.en;
    return { id: i, name, topic, country: s.country, late: Boolean(s.late), photo: null,
      url: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(`${s.ar[0]} ${s.ar[1]}`) };
  });
}

export const loadRadios = () =>
  cachedJSON(`${SOURCES.audio}/radios?language=${audioLang()}`, { key: 'radios-' + audioLang(), maxAgeHours: 72 }).then((d) => d.radios || []);

export const loadTafsir = () =>
  cachedJSON(`${SOURCES.audio}/tafsir?language=ar`, { key: 'tafsir', maxAgeHours: 72 }).then((d) => d.tafasir || null);

/** Language changed: drop localized lists so screens refetch in the new language. */
export const resetCatalog = () => cache.clear();
