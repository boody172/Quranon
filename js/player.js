// Audio player: queue, mini bar, full sheet, lock-screen controls, sleep timer, resume.
import { saved } from './account.js';
import { recordKhatma, surahName } from './catalog.js';
import { num, t } from './i18n.js';
import { sleep } from './sleep.js';
import { $, $$, esc, formatTime, ICON, store, toast } from './util.js';

const audio = $('#audio');
const sheet = $('#playerSheet');

const state = {
  queue: [],
  index: 0,
  repeat: store.get('repeat', 'off'), // off | all | one
  seeking: false,
  refill: null, // endless mode: returns more items when the queue is about to run out
};

const current = () => state.queue[state.index];

export const player = {
  get current() { return current(); },

  /**
   * item: { title, sub, url, surah?, live? }
   * options.refill: () => item[] — makes the queue endless (shuffle / radio-style listening).
   */
  play(queue, index = 0, { refill = null } = {}) {
    if (queue !== state.queue) state.refill = refill;
    state.queue = queue;
    state.index = index;
    if (state.refill && state.queue.length - state.index < 3) state.queue.push(...state.refill());
    const item = current();
    if (!item) return;
    audio.src = item.url;
    audio.load(); // iOS: start a fresh load for the new source inside the tap
    audio.play().catch((err) => {
      // AbortError just means another tap replaced this track.
      if (err?.name !== 'AbortError') toast(`${t('player.cantPlay')} (${err?.name || 'Error'})`);
    });
    if (!item.live) store.set('last', state.refill ? { queue: [item], index: 0 } : { queue, index });
    if (item.khatma) recordKhatma(item, false);
    $('#miniPlayer').hidden = false;
    render();
    mediaSession(item);
    markPlaying();
    sleep.suggest();
    renderSleep();
  },

  resume() {
    const last = store.get('last');
    if (!last?.queue?.[last.index]) return;
    const position = store.get('lastPos', 0);
    this.play(last.queue, last.index);
    audio.addEventListener('loadedmetadata', () => {
      if (position < audio.duration - 3) audio.currentTime = position;
    }, { once: true });
  },

  pause() { audio.pause(); },

  toggle() {
    if (current()) audio.paused ? audio.play().catch(() => {}) : audio.pause();
  },
  next(auto = false) {
    if (!state.queue.length) return;
    if (auto && state.repeat === 'one') { audio.currentTime = 0; audio.play(); return; }
    if (state.refill && state.index >= state.queue.length - 2) state.queue.push(...state.refill());
    if (state.index < state.queue.length - 1) this.play(state.queue, state.index + 1);
    else if (state.repeat === 'all' || !auto) this.play(state.queue, 0);
  },
  prev() {
    if (audio.currentTime > 5) { audio.currentTime = 0; return; }
    this.play(state.queue, Math.max(0, state.index - 1));
  },
  closeSheet() {
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
  },
};

/** Highlights the row of whatever is playing on the current screen. */
export function markPlaying() {
  const url = current()?.url;
  $$('[data-play]').forEach((el) => el.classList.toggle('playing', el.dataset.play === url));
}

function render() {
  const item = current();
  if (!item) return;
  $('#miniTitle').textContent = $('#pTitle').textContent = item.title;
  $('#miniSub').textContent = $('#pSub').textContent = item.sub;
  $('#artSurah').textContent = item.surah ? surahName(item.surah) : item.live ? t('player.live') : '';
  renderPhoto(item.photo);
  $('#pRead').hidden = !item.surah;
  renderFavorite(item);
  $('#seek').disabled = Boolean(item.live);
  $('#miniPlay').innerHTML = $('#pPlay').innerHTML = audio.paused ? ICON.play : ICON.pause;
  $('#pRepeat').innerHTML = ICON.repeat + (state.repeat === 'one' ? '<b class="badge">1</b>' : '');
  $('#pRepeat').classList.toggle('on', state.repeat !== 'off');
}

/** Reciter portrait on the mini player and the full player (falls back to the default artwork). */
function renderPhoto(photo) {
  const art = $('#playerSheet .art');
  const disc = $('#miniPlayer .disc');
  art.classList.toggle('has-photo', Boolean(photo));
  disc.classList.toggle('has-photo', Boolean(photo));
  art.querySelector('img')?.remove();
  disc.querySelector('img')?.remove();
  if (!photo) return;
  const img = (cls) => {
    const el = new Image();
    el.src = photo;
    el.alt = '';
    el.decoding = 'async';
    el.className = cls;
    el.onerror = () => { el.remove(); art.classList.remove('has-photo'); disc.classList.remove('has-photo'); };
    return el;
  };
  art.prepend(img('art-photo'));
  disc.prepend(img('disc-photo'));
}

/** Heart for whatever is playing: the reciter, the radio station or the scholar. */
function renderFavorite(item) {
  const fav = item.fav;
  const on = Boolean(fav && saved.has(fav.type, fav.ref));
  $('#miniFav').hidden = $('#pFav').hidden = !fav;
  $('#miniFav').innerHTML = on ? ICON.heartFilled : ICON.heart;
  $('#miniFav').classList.toggle('on', on);
  $('#miniFav').setAttribute('aria-pressed', on);
  $('#pFav').innerHTML = `${on ? ICON.heartFilled : ICON.heart} ${fav ? fav.title : ''}`;
  $('#pFav').classList.toggle('on', on);
}

function toggleFavorite() {
  const fav = current()?.fav;
  if (!fav) return;
  const now = saved.toggle(fav);
  toast(t(now ? 'toast.saved' : 'toast.removed'));
  renderFavorite(current());
}

// Lock screen, headphones, car (CarPlay "Now Playing" / Android Auto) and smart watches.
const ARTWORK = [96, 128, 192, 256, 512].map((n) => ({ src: new URL(`icons/icon-${n}.webp`, location.href).href, sizes: `${n}x${n}`, type: 'image/webp' }));

function mediaSession(item) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: item.title, artist: item.sub, album: item.surah ? t('app.name') + ' — ' + t('page.listen') : t('app.name'),
    artwork: item.photo ? [{ src: item.photo, sizes: '256x256', type: 'image/jpeg' }, ...ARTWORK] : ARTWORK,
  });
  const skip = (delta) => { if (!current()?.live && audio.duration) audio.currentTime = Math.min(audio.duration, Math.max(0, audio.currentTime + delta)); };
  const handlers = {
    play: () => audio.play(), pause: () => audio.pause(), stop: () => audio.pause(),
    previoustrack: () => player.prev(), nexttrack: () => player.next(),
    seekbackward: (d) => skip(-(d?.seekOffset || 15)),
    seekforward: (d) => skip(d?.seekOffset || 15),
    seekto: item.live ? null : (d) => { if (audio.duration) audio.currentTime = d.seekTime; },
  };
  for (const [action, fn] of Object.entries(handlers)) {
    try { navigator.mediaSession.setActionHandler(action, fn); } catch { /* unsupported action */ }
  }
}

let lastPosition = 0;
let lastPosSave = 0;
function positionState() {
  if (!navigator.mediaSession?.setPositionState || current()?.live || !audio.duration || !isFinite(audio.duration)) return;
  if (Date.now() - lastPosition < 4000) return;
  lastPosition = Date.now();
  try { navigator.mediaSession.setPositionState({ duration: audio.duration, position: Math.min(audio.currentTime, audio.duration), playbackRate: audio.playbackRate }); } catch { /* ignore */ }
}

function openSheet() {
  sheet.classList.add('open');
  sheet.setAttribute('aria-hidden', 'false');
}

// ---------- sleep timer panel ----------
function renderSleep() {
  const mode = sleep.mode;
  const btn = $('#pSleep');
  btn.classList.toggle('on', Boolean(mode));
  btn.querySelector('.badge')?.remove();
  if (mode) btn.insertAdjacentHTML('beforeend', `<b class="badge">${mode === 'time' ? num(sleep.minutesLeft) : '⏹'}</b>`);
  $('#miniSleep').classList.toggle('on', Boolean(mode)); // always visible: easy to find before sleeping
  const panel = $('#sleepPanel');
  if (panel.hidden) return;
  const live = Boolean(current()?.live);
  const chip = (attrs, label, on) => `<button class="chip${on ? ' on' : ''}" ${attrs}>${esc(label)}</button>`;
  $('#sleepChips').innerHTML = [
    chip('data-sleep="off"', t('sleep.off'), !mode),
    ...sleep.presets.map((m) => chip(`data-sleep="${m}"`, t('sleep.minutes', { n: num(m) }), false)),
    live ? '' : chip('data-sleep="track"', t(current()?.surah ? 'sleep.endOfSurah' : 'sleep.endOfTrack'), mode === 'track'),
  ].join('');
  $('#sleepState').textContent = mode === 'time' ? t('sleep.left', { n: num(sleep.minutesLeft) })
    : mode === 'track' ? t('sleep.atEnd') : t('sleep.hint');
}

function toggleSleepPanel() {
  const panel = $('#sleepPanel');
  panel.hidden = !panel.hidden;
  renderSleep();
}

$('#sleepChips').onclick = (e) => {
  const v = e.target.closest('[data-sleep]')?.dataset.sleep;
  if (!v) return;
  if (v === 'off') sleep.cancel();
  else if (v === 'track') sleep.setEndOfTrack();
  else sleep.setMinutes(Number(v));
  $('#sleepPanel').hidden = true;
  renderSleep();
};

let lastSleepRender = 0;
sleep.init({
  live: () => Boolean(current()?.live),
  changed: () => {
    // tick() calls this several times a second; the badge only needs a refresh now and then
    if (Date.now() - lastSleepRender < 1000 && sleep.mode === 'time') return;
    lastSleepRender = Date.now();
    renderSleep();
  },
});

function cycleRepeat() {
  state.repeat = { off: 'all', all: 'one', one: 'off' }[state.repeat];
  store.set('repeat', state.repeat);
  render();
  toast(t({ off: 'player.repeatOff', all: 'player.repeatAll', one: 'player.repeatOne' }[state.repeat]));
}

// --- wiring ---
audio.addEventListener('play', () => { render(); if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'; });
audio.addEventListener('pause', () => { render(); if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'; });
audio.addEventListener('ended', () => {
  if (current()?.khatma) recordKhatma(current(), true);
  if (sleep.onTrackEnd()) return;
  player.next(true);
});
// ---------- keep playing through bad connections (cars, tunnels, switching towers) ----------
// A network hiccup used to stop the recitation with an error. Now the player waits, then reconnects and
// continues from the same second; the user only hears about it if the connection stays gone.
const recovery = { tries: 0, url: '', timer: null, stallTimer: null, wantPlay: false };

function reconnect() {
  const item = current();
  if (!item) return;
  if (recovery.url !== item.url) { recovery.url = item.url; recovery.tries = 0; }
  if (recovery.tries >= 6) {
    toast(`${t('player.cantLoad')} (${audio.error?.code ?? '?'})`);
    return;
  }
  const at = item.live ? 0 : audio.currentTime || store.get('lastPos', 0);
  const delay = [500, 1500, 3000, 5000, 8000, 12000][recovery.tries++];
  clearTimeout(recovery.timer);
  recovery.timer = setTimeout(() => {
    if (!navigator.onLine) { recovery.tries--; recovery.timer = setTimeout(reconnect, 3000); return; } // wait for signal
    audio.src = item.live ? item.url + (item.url.includes('?') ? '&' : '?') + 'r=' + Date.now() : item.url;
    audio.load();
    if (!item.live && at > 1) audio.addEventListener('loadedmetadata', () => { audio.currentTime = at; }, { once: true });
    audio.play().catch(() => {});
  }, delay);
}

audio.addEventListener('error', () => {
  if (!audio.getAttribute('src')) return;
  // code 2 = network, 3 = decode hiccup, 4 = unreachable source: all worth retrying
  reconnect();
});
// Buffer ran dry ("waiting"/"stalled"): give it 12 s to recover on its own, then reconnect.
const watchStall = () => {
  clearTimeout(recovery.stallTimer);
  recovery.stallTimer = setTimeout(() => { if (!audio.paused && audio.readyState < 3) reconnect(); }, 12000);
};
audio.addEventListener('waiting', watchStall);
audio.addEventListener('stalled', watchStall);
audio.addEventListener('playing', () => { clearTimeout(recovery.stallTimer); recovery.tries = 0; });
// Signal is back: resume right away instead of waiting for the next retry.
addEventListener('online', () => { if (current() && audio.paused && recovery.tries) { recovery.tries = 0; reconnect(); } });

// iOS 17+: treat this as media playback so the silent switch doesn't mute recitations.
if (navigator.audioSession) {
  try { navigator.audioSession.type = 'playback'; } catch { /* unsupported */ }
}
audio.addEventListener('timeupdate', () => {
  sleep.tick();
  positionState();
  const progress = audio.duration ? audio.currentTime / audio.duration : 0;
  $('#miniBar').style.transform = `scaleX(${progress})`;
  if (!state.seeking) $('#seek').value = progress * 1000;
  $('#tCur').textContent = formatTime(audio.currentTime);
  $('#tDur').textContent = current()?.live ? t('player.liveShort') : formatTime(audio.duration);
  // Resume point: saved every ~5 s (timeupdate fires several times a second).
  if (current() && !current().live && Date.now() - lastPosSave > 5000) { lastPosSave = Date.now(); store.set('lastPos', audio.currentTime); }
});

$('#seek').addEventListener('input', (e) => {
  state.seeking = true;
  if (audio.duration) $('#tCur').textContent = formatTime((e.target.value / 1000) * audio.duration);
});
$('#seek').addEventListener('change', (e) => {
  state.seeking = false;
  if (audio.duration) audio.currentTime = (e.target.value / 1000) * audio.duration;
});

$('#miniPlay').onclick = $('#pPlay').onclick = () => player.toggle();
$('#pNext').onclick = () => player.next();
$('#pPrev').onclick = () => player.prev();
$('#pRepeat').onclick = cycleRepeat;
$('#pSleep').onclick = toggleSleepPanel;
$('#miniSleep').onclick = () => { openSheet(); if ($('#sleepPanel').hidden) toggleSleepPanel(); };
$('#miniFav').onclick = $('#pFav').onclick = toggleFavorite;
$('#pRead').onclick = () => { player.closeSheet(); location.hash = '#/surah/' + current().surah; };
$('#miniOpen').onclick = openSheet;
$('#sheetClose').onclick = () => player.closeSheet();
sheet.addEventListener('click', (e) => { if (e.target === sheet) player.closeSheet(); });

// Restore the last track (paused) so "continue" is one tap away.
const last = store.get('last');
if (last?.queue?.[last.index]) {
  state.queue = last.queue;
  state.index = last.index;
  audio.src = current().url;
  $('#miniPlayer').hidden = false;
  render();
}
