// Translations. Arabic and English ship with the app (i18n/*.json); the dashboard can
// override any string and add new languages, which arrive through /api/config.
import { $$, store } from './util.js';

const BUILT_IN = { ar: { name: 'العربية', dir: 'rtl' }, en: { name: 'English', dir: 'ltr' } };

const state = { lang: 'ar', strings: {}, fallback: {}, languages: { ...BUILT_IN }, remote: {} };

const loadBuiltIn = (code) => (BUILT_IN[code] ? fetch(`i18n/${code}.json`).then((r) => r.json()).catch(() => ({})) : Promise.resolve({}));

function detect() {
  const saved = store.get('lang');
  if (saved) return saved;
  return (navigator.language || '').toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

export function t(key, params) {
  let text = state.strings[key] ?? state.fallback[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) text = text.replaceAll(`{${k}}`, typeof v === 'number' ? num(v) : v);
  }
  return text;
}

const formatters = new Map();
/** Locale-aware number (Arabic-Indic digits in Arabic). */
export function num(value, { grouping = true } = {}) {
  const locale = state.lang === 'ar' ? 'ar-EG' : state.lang;
  const id = locale + grouping;
  if (!formatters.has(id)) formatters.set(id, new Intl.NumberFormat(locale, { useGrouping: grouping }));
  return formatters.get(id).format(value);
}

/** Picks the current language from a { ar: '...', en: '...' } object coming from the backend. */
export const pick = (value) => (value && typeof value === 'object' ? value[state.lang] ?? value.en ?? value.ar ?? Object.values(value)[0] ?? '' : value ?? '');

export const i18n = {
  get lang() { return state.lang; },
  get dir() { return state.languages[state.lang]?.dir || 'ltr'; },
  get languages() { return Object.entries(state.languages).map(([code, l]) => ({ code, ...l })); },

  /** remote: { languages: [{ code, name, dir }], strings: { code: { key: value } } } */
  async init(remote) {
    if (remote) {
      for (const l of remote.languages || []) {
        if (/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(l.code)) state.languages[l.code] = { name: l.name, dir: l.dir === 'rtl' ? 'rtl' : 'ltr' };
      }
      // Strings are plain text: drop any markup so a compromised dashboard can't inject HTML.
      state.remote = Object.fromEntries(Object.entries(remote.strings || {}).map(([code, strings]) =>
        [code, Object.fromEntries(Object.entries(strings).map(([k, v]) => [k, String(v).replace(/[<>]/g, '')]))]));
    }
    await this.use(state.languages[detect()] ? detect() : 'ar', { persist: false });
  },

  async use(code, { persist = true } = {}) {
    const [own, english] = await Promise.all([loadBuiltIn(code), code === 'en' ? null : loadBuiltIn('en')]);
    state.lang = code;
    state.strings = { ...own, ...(state.remote[code] || {}) };
    state.fallback = { ...(english || own), ...(state.remote.en || {}) };
    if (persist) store.set('lang', code);
    document.documentElement.lang = code;
    document.documentElement.dir = this.dir;
    $$('[data-i18n-label]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nLabel)));
    $$('[data-i18n-text]').forEach((el) => { el.textContent = t(el.dataset.i18nText); });
  },
};
