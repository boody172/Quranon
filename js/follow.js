// Read along: while a reciter plays a surah, the mushaf highlights the verse being recited and sweeps
// through its words, then scrolls to the next verse. Verse times come from mp3quran's own timing data
// for the exact file being played; inside a verse, words are paced by their length.
import { cachedJSON, SOURCES } from './api.js';
import { player } from './player.js';
import { $, $$ } from './util.js';

const audio = $('#audio');
const LETTER = /[ء-يٱ-ۓ]/g;

// ---------- timing data ----------
const folderOf = (url) => { try { return new URL(url).pathname.replace(/[^/]*$/, ''); } catch { return ''; } };

let readsByFolder = null;
async function readFor(url) {
  if (!readsByFolder) {
    const reads = await cachedJSON(`${SOURCES.audio}/ayat_timing/reads`, { key: 'timing-reads', maxAgeHours: 24 * 7 }).catch(() => []);
    readsByFolder = new Map(reads.map((r) => [folderOf(r.folder_url), r.id]));
  }
  return readsByFolder.get(folderOf(url)) || null;
}

/** Does this recording have verse timings? (used to prefer a synced recording when opening a surah) */
export async function hasTiming(url) { return Boolean(await readFor(url)); }

async function timingsFor(item) {
  const read = item?.url && await readFor(item.url);
  if (!read) return null;
  const rows = await cachedJSON(`${SOURCES.audio}/ayat_timing?surah=${item.surah}&read=${read}`, { key: `timing-${read}-${item.surah}`, maxAgeHours: 24 * 30 }).catch(() => null);
  return Array.isArray(rows) && rows.length ? rows.map((r) => ({ ayah: r.ayah, start: r.start_time / 1000, end: r.end_time / 1000 })) : null;
}

// ---------- the follower ----------
/**
 * Starts following surah `n` in `root`. Returns a stop function.
 * `onState(state)`: 'on' (synced), 'other' (a different surah is playing), 'none' (no timing for this recording).
 */
export function follow(root, n, onState = () => {}) {
  let timings = null;
  let itemUrl = '';
  let current = { ayah: -1, word: -1 };
  let frame = 0;
  let userScrolledAt = 0;
  let stopped = false;

  // word weights per verse, computed once
  const words = new Map();
  const wordsOf = (ayah) => {
    if (!words.has(ayah)) {
      const spans = ayah === 0 ? [] : $$(`#a${ayah} .w`, root);
      const weights = spans.map((w) => (w.textContent.match(LETTER)?.length || 0) + 1.5); // + a breath per word
      const total = weights.reduce((a, b) => a + b, 0) || 1;
      let acc = 0;
      words.set(ayah, { spans, bounds: weights.map((x) => (acc += x) / total) });
    }
    return words.get(ayah);
  };

  const clear = () => {
    $$('.a.now, .basmala.now', root).forEach((el) => el.classList.remove('now'));
    $$('.w.lit, .w.cur', root).forEach((el) => el.classList.remove('lit', 'cur'));
    current = { ayah: -1, word: -1 };
  };

  function paint(time) {
    // binary search for the verse being recited
    let lo = 0;
    let hi = timings.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (timings[mid].start <= time) lo = mid; else hi = mid - 1;
    }
    const seg = timings[lo];
    const ayah = seg.ayah;
    const { spans, bounds } = wordsOf(ayah);
    const progress = Math.min(1, Math.max(0, (time - seg.start) / Math.max(0.1, seg.end - seg.start)));
    const word = spans.length ? Math.min(spans.length - 1, bounds.findIndex((b) => progress < b) >>> 0) : -1;

    if (ayah !== current.ayah) {
      clear();
      const el = ayah === 0 ? $('.basmala', root) : $(`#a${ayah}`, root);
      el?.classList.add('now');
      // keep the recited verse in view unless the reader is scrolling on their own
      if (el && Date.now() - userScrolledAt > 4000) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      current.ayah = ayah;
    }
    if (word !== current.word) {
      spans.forEach((w, i) => { w.classList.toggle('lit', i < word); w.classList.toggle('cur', i === word); });
      current.word = word;
    }
  }

  const loop = () => {
    frame = 0;
    if (stopped || !timings) return;
    paint(audio.currentTime);
    if (!audio.paused) frame = requestAnimationFrame(loop);
  };
  const kick = () => { if (!frame) frame = requestAnimationFrame(loop); };

  async function sync() {
    const item = player.current;
    if (!item?.surah) { timings = null; clear(); onState('idle'); return; }
    if (item.surah !== n) { timings = null; clear(); onState('other', item); return; }
    if (item.url === itemUrl && timings) { kick(); return; }
    itemUrl = item.url;
    timings = await timingsFor(item);
    if (stopped || player.current?.url !== itemUrl) return;
    if (!timings) { clear(); onState('none'); return; }
    onState('on');
    kick();
  }

  const onUserScroll = () => { userScrolledAt = Date.now(); };
  // Tapping a verse while following jumps the recitation there.
  const onTap = (e) => {
    const el = e.target.closest('.a');
    if (!el || !timings || player.current?.surah !== n) return;
    const seg = timings.find((s) => s.ayah === Number(el.dataset.a));
    if (seg) { audio.currentTime = seg.start + 0.01; userScrolledAt = 0; kick(); }
  };

  const events = ['play', 'seeked', 'loadedmetadata'];
  events.forEach((ev) => audio.addEventListener(ev, sync));
  audio.addEventListener('timeupdate', kick);
  addEventListener('wheel', onUserScroll, { passive: true });
  addEventListener('touchmove', onUserScroll, { passive: true });
  root.addEventListener('click', onTap);
  sync();

  return () => {
    stopped = true;
    cancelAnimationFrame(frame);
    events.forEach((ev) => audio.removeEventListener(ev, sync));
    audio.removeEventListener('timeupdate', kick);
    removeEventListener('wheel', onUserScroll);
    removeEventListener('touchmove', onUserScroll);
    root.removeEventListener('click', onTap);
    clear();
  };
}
