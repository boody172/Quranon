// Small shared helpers. No dependencies.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

/** Normalises text for forgiving search: Arabic diacritics/letter variants, Latin case, spaces and punctuation. */
export const norm = (s) => String(s || '')
  .toLowerCase()
  .replace(/[ً-ْٰـ]/g, '')
  .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
  .replace(/[\s'’`.-]+/g, '');
export const pad3 = (n) => String(n).padStart(3, '0');

export function formatTime(t) {
  if (!Number.isFinite(t)) return '0:00';
  t = Math.floor(t);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = String(t % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

export function initials(name) {
  const words = String(name).replace(/^(الشيخ|الشيخة|د\.)\s*/, '').split(/\s+/);
  return (words[0]?.[0] || '') + (words[1]?.[0] || '');
}

/** localStorage wrapper that never throws (private mode, quota, disabled storage). */
export const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem('qn:' + key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('qn:' + key, JSON.stringify(value)); } catch { /* storage unavailable */ }
  },
  remove(key) {
    try { localStorage.removeItem('qn:' + key); } catch { /* storage unavailable */ }
  },
};

/** Drops every cached API response (used when a new release is published). */
export function clearCachedData() {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith('qn:c:')).forEach((k) => localStorage.removeItem(k));
  } catch { /* storage unavailable */ }
}

let toastTimer;
export function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

/** Avatar: lazy-loaded photo when we have one, initials otherwise (and on load error). */
export function avatar(name, photo, size = 52) {
  const letters = esc(initials(name));
  if (!photo) return `<span class="avatar" style="--s:${size}px">${letters}</span>`;
  return `<span class="avatar" style="--s:${size}px" data-initials="${letters}"><img src="${esc(photo)}" alt="" width="${size}" height="${size}" loading="lazy" decoding="async"></span>`;
}

// Broken photo → fall back to initials (one listener for the whole app).
document.addEventListener('error', (e) => {
  const img = e.target;
  if (img.tagName === 'IMG' && img.parentElement?.dataset.initials !== undefined) {
    img.parentElement.textContent = img.parentElement.dataset.initials;
  }
}, true);

const svg = (d, extra = '') => `<svg viewBox="0 0 24 24" aria-hidden="true"${extra}>${d}</svg>`;
export const ICON = {
  play: svg('<path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none"/>'),
  pause: svg('<path d="M7 4h3.5v16H7zM13.5 4H17v16h-3.5z" fill="currentColor" stroke="none"/>'),
  heart: svg('<path d="M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z"/>'),
  heartFilled: svg('<path d="M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z" fill="currentColor"/>'),
  bookmark: svg('<path d="M6 3h12v18l-6-4-6 4z"/>'),
  bookmarkFilled: svg('<path d="M6 3h12v18l-6-4-6 4z" fill="currentColor"/>'),
  repeat: svg('<path d="M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4"/>'),
  book: svg('<path d="M12 6c-2-1.5-5-2-8-2v15c3 0 6 .5 8 2 2-1.5 5-2 8-2V4c-3 0-6 .5-8 2zM12 6v15"/>'),
  headset: svg('<path d="M3 14v-2a9 9 0 0 1 18 0v2"/><rect x="2" y="14" width="5" height="7" rx="2"/><rect x="17" y="14" width="5" height="7" rx="2"/>'),
  radio: svg('<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M7 8l10-5"/><circle cx="8" cy="14" r="2"/><path d="M14 13h4M14 16h4"/>'),
  compass: svg('<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),
  shuffle: svg('<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>'),
  mic: svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'),
  star: svg('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>'),
  globe: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  arrow: svg('<path d="M19 12H5M11 6l-6 6 6 6"/>', ' class="arrow"'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  external: svg('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
};
