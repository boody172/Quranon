// Smart sleep timer.
// - Time presets, or "end of this surah / lesson".
// - Never cuts a surah in its last minutes: when time is up and the track ends soon, it lets it finish.
// - Fades out gently (where the browser allows changing volume), then pauses.
// - One minute before stopping it offers "+10 min"; at night it offers to set itself.
import { num, t } from './i18n.js';
import { $, store, toast } from './util.js';

const PRESETS = [15, 30, 45, 60];
const FADE_SECONDS = 30;
const FINISH_TRACK_WITHIN = 180; // seconds left in the surah that we are willing to wait for
const audio = $('#audio');

const state = {
  mode: null, // null | 'time' | 'track'
  deadline: 0,
  nudged: false,
  fading: false,
  baseVolume: 1,
};

let isLive = () => false;
let onChange = () => {};

const remainingMs = () => Math.max(0, state.deadline - Date.now());

function restoreVolume() {
  if (state.fading) audio.volume = state.baseVolume;
  state.fading = false;
}

function clear() {
  restoreVolume();
  state.mode = null;
  state.deadline = 0;
  state.nudged = false;
  hideNudge();
  onChange();
}

function stopNow() {
  audio.pause();
  clear();
  toast(t('sleep.stopped'));
}

// ---------- nudge banner (above the mini player) ----------
function showNudge(text, actionLabel, action) {
  const box = $('#nudge');
  box.querySelector('span').textContent = text;
  const btn = box.querySelector('[data-act]');
  btn.textContent = actionLabel;
  btn.onclick = () => { hideNudge(); action(); };
  box.hidden = false;
}
function hideNudge() { $('#nudge').hidden = true; }

export const sleep = {
  presets: PRESETS,

  /** Wire the timer to the player (keeps this module free of player imports). */
  init({ live, changed }) {
    isLive = live;
    onChange = changed;
    $('#nudge [data-close]').onclick = hideNudge;
  },

  get mode() { return state.mode; },
  get minutesLeft() { return state.mode === 'time' ? Math.ceil(remainingMs() / 6e4) : 0; },

  setMinutes(minutes) {
    restoreVolume();
    state.mode = 'time';
    state.deadline = Date.now() + minutes * 6e4;
    state.nudged = false;
    store.set('sleepPreset', minutes);
    hideNudge();
    onChange();
    toast(t('player.sleepIn', { n: num(minutes) }));
  },

  setEndOfTrack() {
    restoreVolume();
    state.mode = 'track';
    state.deadline = 0;
    hideNudge();
    onChange();
    toast(t('sleep.atEndToast'));
  },

  cancel() {
    if (!state.mode) return;
    clear();
    toast(t('player.sleepOff'));
  },

  extend(minutes = 10) {
    restoreVolume();
    state.mode = 'time';
    state.deadline = Math.max(state.deadline, Date.now()) + minutes * 6e4;
    state.nudged = false;
    onChange();
    toast(t('sleep.extended', { n: num(minutes) }));
  },

  /** Called on every timeupdate (fires even with the screen locked while audio plays). */
  tick() {
    if (state.mode !== 'time' || audio.paused) return;
    const left = remainingMs() / 1000;
    const trackLeft = audio.duration && !isLive() ? audio.duration - audio.currentTime : Infinity;

    if (left <= 0) {
      // Smart: don't cut the surah if it is about to end anyway.
      if (trackLeft <= FINISH_TRACK_WITHIN) {
        restoreVolume();
        state.mode = 'track';
        onChange();
        toast(t('sleep.finishingTrack'));
        return;
      }
      stopNow();
      return;
    }
    if (left <= 60 && !state.nudged) {
      state.nudged = true;
      showNudge(t('sleep.endsSoon'), t('sleep.plus10'), () => sleep.extend(10));
    }
    if (left <= FADE_SECONDS && trackLeft > FINISH_TRACK_WITHIN) {
      if (!state.fading) { state.baseVolume = audio.volume || 1; state.fading = true; }
      audio.volume = Math.max(0.05, state.baseVolume * (left / FADE_SECONDS)); // read-only on iOS: harmless
    }
    onChange();
  },

  /** Called when a track ends. Returns true when playback should stop here. */
  onTrackEnd() {
    if (state.mode !== 'track') return false;
    clear();
    toast(t('sleep.stopped'));
    return true;
  },

  /** Called when playback starts: late at night, offer a timer once per night. */
  suggest() {
    if (state.mode) return;
    const now = new Date();
    const hour = now.getHours();
    if (hour < 21 && hour >= 4) return;
    const night = new Date(now - 4 * 36e5).toDateString(); // nights run until 4am
    if (store.get('sleepSuggested') === night) return;
    store.set('sleepSuggested', night);
    const minutes = store.get('sleepPreset', 30);
    setTimeout(() => {
      if (!state.mode && !audio.paused) {
        showNudge(t('sleep.suggest', { n: num(minutes) }), t('sleep.enable'), () => sleep.setMinutes(minutes));
      }
    }, 4000);
  },
};
