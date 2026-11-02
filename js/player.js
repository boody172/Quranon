// Audio player: queue, mini bar, full sheet, lock-screen controls, sleep timer, resume.
import { saved } from './account.js';
import { recordKhatma, surahName } from './catalog.js';
import { t } from './i18n.js';
import { $, $$, formatTime, ICON, store, toast } from './util.js';

const audio = $('#audio');
const sheet = $('#playerSheet');
const SLEEP_STEPS = [0, 15, 30, 60];

const state = {
  queue: [],
  index: 0,
  repeat: store.get('repeat', 'off'), // off | all | one
  sleepMinutes: 0,
  sleepTimer: null,
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
  $('#pRead').hidden = !item.surah;
  renderFavorite(item);
  $('#seek').disabled = Boolean(item.live);
  $('#miniPlay').innerHTML = $('#pPlay').innerHTML = audio.paused ? ICON.play : ICON.pause;
  $('#pRepeat').innerHTML = ICON.repeat + (state.repeat === 'one' ? '<b class="badge">1</b>' : '');
  $('#pRepeat').classList.toggle('on', state.repeat !== 'off');
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

function mediaSession(item) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: item.title, artist: item.sub, album: 'Quranon',
    artwork: [{ src: 'icons/icon.svg', sizes: '512x512', type: 'image/svg+xml' }],
  });
  const handlers = {
    play: () => audio.play(), pause: () => audio.pause(),
    previoustrack: () => player.prev(), nexttrack: () => player.next(),
  };
  for (const [action, fn] of Object.entries(handlers)) {
    try { navigator.mediaSession.setActionHandler(action, fn); } catch { /* unsupported action */ }
  }
}

function openSheet() {
  sheet.classList.add('open');
  sheet.setAttribute('aria-hidden', 'false');
}

function cycleSleepTimer() {
  state.sleepMinutes = SLEEP_STEPS[(SLEEP_STEPS.indexOf(state.sleepMinutes) + 1) % SLEEP_STEPS.length];
  clearTimeout(state.sleepTimer);
  $('#pSleep').classList.toggle('on', state.sleepMinutes > 0);
  if (!state.sleepMinutes) return toast(t('player.sleepOff'));
  state.sleepTimer = setTimeout(() => {
    audio.pause();
    state.sleepMinutes = 0;
    $('#pSleep').classList.remove('on');
  }, state.sleepMinutes * 6e4);
  toast(t('player.sleepIn', { n: state.sleepMinutes }));
}

function cycleRepeat() {
  state.repeat = { off: 'all', all: 'one', one: 'off' }[state.repeat];
  store.set('repeat', state.repeat);
  render();
  toast(t({ off: 'player.repeatOff', all: 'player.repeatAll', one: 'player.repeatOne' }[state.repeat]));
}

// --- wiring ---
audio.addEventListener('play', render);
audio.addEventListener('pause', render);
audio.addEventListener('ended', () => {
  if (current()?.khatma) recordKhatma(current(), true);
  player.next(true);
});
audio.addEventListener('error', () => {
  if (audio.getAttribute('src')) toast(`${t('player.cantLoad')} (${audio.error?.code ?? '?'})`);
});

// iOS 17+: treat this as media playback so the silent switch doesn't mute recitations.
if (navigator.audioSession) {
  try { navigator.audioSession.type = 'playback'; } catch { /* unsupported */ }
}
audio.addEventListener('timeupdate', () => {
  const progress = audio.duration ? audio.currentTime / audio.duration : 0;
  $('#miniBar').style.transform = `scaleX(${progress})`;
  if (!state.seeking) $('#seek').value = progress * 1000;
  $('#tCur').textContent = formatTime(audio.currentTime);
  $('#tDur').textContent = current()?.live ? t('player.liveShort') : formatTime(audio.duration);
  if (current() && !current().live && Math.floor(audio.currentTime) % 5 === 0) store.set('lastPos', audio.currentTime);
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
$('#pSleep').onclick = cycleSleepTimer;
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
