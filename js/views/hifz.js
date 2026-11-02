// Hifz: memorise a range of verses — listen with repetition, hide the text, then recite and get checked.
import { surahText } from '../api.js';
import { surahTitle } from '../catalog.js';
import { SURAHS } from '../data.js';
import { num, t } from '../i18n.js';
import { player } from '../player.js';
import { $, $$, esc, ICON, store, toast } from '../util.js';

// Verse-by-verse recitations (Islamic Network CDN, free).
const RECITERS = [
  ['ar.husary', 'reciter.husary'],
  ['ar.minshawi', 'reciter.minshawi'],
  ['ar.alafasy', 'reciter.alafasy'],
  ['ar.abdulbasitmurattal', 'reciter.abdulbasit'],
  ['ar.mahermuaiqly', 'reciter.maher'],
];
const REPEATS = [1, 3, 5, 7, 10];
const ROUNDS = [1, 2, 3, 0]; // 0 = until stopped
const AYAH_OFFSETS = SURAHS.reduce((acc, s, i) => [...acc, acc[i] + s.ayahs], [0]);

const audioUrl = (edition, surah, ayah) => `https://cdn.islamic.network/quran/audio/128/${edition}/${AYAH_OFFSETS[surah - 1] + ayah}.mp3`;

// ---------- memorised verses (per surah) ----------
const progressKey = (surah) => 'hifz:' + surah;
const memorised = (surah) => new Set(store.get(progressKey(surah), []));
function setMemorised(surah, ayah, value) {
  const set = memorised(surah);
  value ? set.add(ayah) : set.delete(ayah);
  store.set(progressKey(surah), [...set].sort((a, b) => a - b));
}

// ---------- recitation check ----------
const plain = (text) => text
  .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
  .replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
  .replace(/[^ء-ي\s]/g, ' ')
  .split(/\s+/).filter(Boolean);

function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[a.length][b.length];
}

/** Marks each verse word as said / missed by aligning it with what was heard. */
function compare(expected, heard) {
  const said = plain(heard);
  let cursor = 0;
  return plain(expected).map((word) => {
    for (let k = cursor; k < Math.min(said.length, cursor + 3); k++) {
      if (distance(word, said[k]) <= Math.max(1, Math.floor(word.length / 4))) { cursor = k + 1; return true; }
    }
    return false;
  });
}

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// ---------- screens ----------
export async function hifz(view, { onCleanup }) {
  const saved = store.get('hifz:setup', { surah: 1, from: 1, to: 7, reciter: 'ar.husary', repeat: 3, rounds: 1 });

  const surahOptions = SURAHS.map((s) => {
    const done = memorised(s.n).size;
    return `<option value="${s.n}"${s.n === saved.surah ? ' selected' : ''}>${num(s.n)}. ${esc(surahTitle(s.n))}${done ? ` · ${num(done)}/${num(s.ayahs)}` : ''}</option>`;
  }).join('');

  view.innerHTML = `
    <section class="hello"><p>${t('hifz.kicker')}</p><h1>${t('hifz.title')}</h1></section>
    <form class="form hifz-setup" id="setup">
      <label>${t('hifz.surah')}<select class="select" name="surah">${surahOptions}</select></label>
      <div class="two">
        <label>${t('hifz.from')}<select class="select" name="from"></select></label>
        <label>${t('hifz.to')}<select class="select" name="to"></select></label>
      </div>
      <label>${t('hifz.reciter')}<select class="select" name="reciter">${RECITERS.map(([id, key]) => `<option value="${id}"${id === saved.reciter ? ' selected' : ''}>${t(key)}</option>`).join('')}</select></label>
      <fieldset><legend>${t('hifz.repeat')}</legend><div class="segmented" data-name="repeat">${REPEATS.map((n) => `<button type="button" role="radio" aria-checked="${n === saved.repeat}" value="${n}">${num(n)}×</button>`).join('')}</div></fieldset>
      <fieldset><legend>${t('hifz.rounds')}</legend><div class="segmented" data-name="rounds">${ROUNDS.map((n) => `<button type="button" role="radio" aria-checked="${n === saved.rounds}" value="${n}">${n ? num(n) + '×' : '∞'}</button>`).join('')}</div></fieldset>
      <p class="muted small" id="rangeProgress"></p>
      <button class="pill primary wide">${ICON.play} ${t('hifz.start')}</button>
    </form>`;

  const form = $('#setup');
  const fillAyahs = (from, to) => {
    const total = SURAHS[form.surah.value - 1].ayahs;
    const opts = (sel) => Array.from({ length: total }, (_, i) => `<option value="${i + 1}"${i + 1 === sel ? ' selected' : ''}>${num(i + 1)}</option>`).join('');
    form.from.innerHTML = opts(Math.min(from, total));
    form.to.innerHTML = opts(Math.min(to, total));
    const done = memorised(+form.surah.value).size;
    $('#rangeProgress').textContent = t('hifz.memorisedCount', { n: done, total });
  };
  fillAyahs(saved.from, saved.to);
  form.surah.onchange = () => fillAyahs(1, Math.min(7, SURAHS[form.surah.value - 1].ayahs));
  form.from.onchange = () => { if (+form.to.value < +form.from.value) form.to.value = form.from.value; };
  form.to.onchange = () => { if (+form.to.value < +form.from.value) form.from.value = form.to.value; };
  $$('.segmented', form).forEach((group) => group.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) $$('button', group).forEach((x) => x.setAttribute('aria-checked', x === b));
  }));
  const choice = (name) => +$(`[data-name="${name}"] [aria-checked="true"]`, form).value;

  form.onsubmit = (e) => {
    e.preventDefault();
    const setup = {
      surah: +form.surah.value, from: +form.from.value, to: +form.to.value,
      reciter: form.reciter.value, repeat: choice('repeat'), rounds: choice('rounds'),
    };
    store.set('hifz:setup', setup);
    session(view, setup, onCleanup);
  };
}

async function session(view, setup, onCleanup) {
  view.innerHTML = '<div class="skeleton tall"></div>';
  const verses = (await surahText(setup.surah)).filter((v) => v.number >= setup.from && v.number <= setup.to);
  const audio = new Audio();
  audio.preload = 'auto';
  const state = { index: 0, rep: 1, round: 1, playing: false, mode: 'show' }; // mode: show | hint | hide
  let listening = null;
  onCleanup(() => { audio.pause(); audio.src = ''; listening?.abort(); });

  view.innerHTML = `
    <div class="hifz-head">
      <h2>${esc(surahTitle(setup.surah))}</h2>
      <p class="muted">${t('hifz.range', { from: setup.from, to: setup.to })}</p>
    </div>
    <div class="chips hifz-modes" id="modes">
      ${['show', 'hint', 'hide'].map((m) => `<button class="chip${m === state.mode ? ' on' : ''}" data-mode="${m}">${t('hifz.mode.' + m)}</button>`).join('')}
    </div>
    <article class="hifz-card" lang="ar" dir="rtl"><p class="hifz-verse" id="verse"></p><p class="hifz-check" id="check" hidden></p></article>
    <p class="hifz-status" id="status"></p>
    <div class="controls hifz-controls">
      <button class="icon-btn lg" id="hPrev" aria-label="${t('player.prev')}"><svg viewBox="0 0 24 24"><path d="M6 5v14M18 5l-9 7 9 7z"/></svg></button>
      <button class="icon-btn xl play" id="hPlay" aria-label="${t('player.playPause')}"></button>
      <button class="icon-btn lg" id="hNext" aria-label="${t('player.next')}"><svg viewBox="0 0 24 24"><path d="M18 5v14M6 5l9 7-9 7z"/></svg></button>
    </div>
    <div class="actions hifz-actions">
      <button class="pill" id="recite">${ICON.mic} ${t('hifz.recite')}</button>
      <button class="pill" id="markDone"></button>
    </div>
    <button class="link" id="changeSetup">${t('hifz.change')}</button>`;

  const verse = () => verses[state.index];

  function renderVerse() {
    const words = verse().text.split(/\s+/);
    const shown = state.mode === 'show' ? words
      : state.mode === 'hint' ? words.map((w, i) => (i === 0 ? w : '<span class="hidden-word">' + esc(w) + '</span>'))
        : words.map((w) => '<span class="hidden-word">' + esc(w) + '</span>');
    $('#verse').innerHTML = (state.mode === 'show' ? shown.map(esc) : shown).join(' ') + ` <span class="m">﴿${verse().number.toLocaleString('ar-EG')}﴾</span>`;
    $('#check').hidden = true;
    const done = memorised(setup.surah).has(verse().number);
    $('#markDone').innerHTML = `${done ? ICON.check : ICON.bookmark} ${t(done ? 'hifz.memorised' : 'hifz.markMemorised')}`;
    $('#markDone').classList.toggle('done', done);
    $('#status').textContent = t('hifz.status', {
      ayah: verse().number, rep: state.rep, repeat: setup.repeat,
      round: state.round, rounds: setup.rounds || '∞',
    });
    $('#hPlay').innerHTML = state.playing ? ICON.pause : ICON.play;
  }

  function load() {
    audio.src = audioUrl(setup.reciter, setup.surah, verse().number);
    renderVerse();
  }

  function play() {
    player.pause(); // never two recitations at once
    state.playing = true;
    audio.play().catch(() => { state.playing = false; toast(t('player.cantPlay')); renderVerse(); });
    renderVerse();
  }

  function pause() { state.playing = false; audio.pause(); renderVerse(); }

  audio.addEventListener('ended', () => {
    if (state.rep < setup.repeat) { state.rep++; audio.currentTime = 0; audio.play(); renderVerse(); return; }
    state.rep = 1;
    if (state.index < verses.length - 1) { state.index++; load(); audio.play(); return; }
    if (!setup.rounds || state.round < setup.rounds) { state.round++; state.index = 0; load(); audio.play(); return; }
    state.playing = false;
    renderVerse();
    toast(t('hifz.finished'));
  });

  $('#hPlay').onclick = () => (state.playing ? pause() : play());
  $('#hPrev').onclick = () => { state.index = Math.max(0, state.index - 1); state.rep = 1; load(); if (state.playing) audio.play(); };
  $('#hNext').onclick = () => { state.index = Math.min(verses.length - 1, state.index + 1); state.rep = 1; load(); if (state.playing) audio.play(); };
  $('#modes').onclick = (e) => {
    const b = e.target.closest('[data-mode]');
    if (!b) return;
    state.mode = b.dataset.mode;
    $$('#modes .chip').forEach((c) => c.classList.toggle('on', c === b));
    renderVerse();
  };
  $('#verse').onclick = (e) => { e.target.closest('.hidden-word')?.classList.add('revealed'); };
  $('#markDone').onclick = () => {
    setMemorised(setup.surah, verse().number, !memorised(setup.surah).has(verse().number));
    renderVerse();
  };
  $('#changeSetup').onclick = () => { audio.pause(); hifz(view, { onCleanup }); };

  // Recite from memory: speech recognition where the browser offers it, otherwise reveal-and-self-check.
  $('#recite').onclick = () => {
    pause();
    if (!Recognition) {
      state.mode = 'show';
      $$('#modes .chip').forEach((c) => c.classList.toggle('on', c.dataset.mode === 'show'));
      renderVerse();
      toast(t('hifz.noMic'));
      return;
    }
    listening?.abort();
    listening = new Recognition();
    listening.lang = 'ar-SA';
    listening.interimResults = false;
    listening.maxAlternatives = 3;
    $('#recite').classList.add('listening');
    $('#recite').innerHTML = `${ICON.mic} ${t('hifz.listening')}`;
    listening.onresult = (e) => {
      const heard = [...e.results[0]].map((alt) => alt.transcript).join(' ');
      const result = compare(verse().text, heard);
      const words = verse().text.split(/\s+/).filter((w) => plain(w).length);
      const score = result.filter(Boolean).length / result.length;
      $('#verse').innerHTML = words.map((w, i) => `<span class="${result[i] ? 'said' : 'missed'}">${esc(w)}</span>`).join(' ');
      $('#check').hidden = false;
      $('#check').textContent = t(score >= 0.85 ? 'hifz.great' : score >= 0.5 ? 'hifz.almost' : 'hifz.tryAgain', { pct: Math.round(score * 100) });
      if (score >= 0.85) {
        setMemorised(setup.surah, verse().number, true);
        $('#markDone').innerHTML = `${ICON.check} ${t('hifz.memorised')}`;
        $('#markDone').classList.add('done');
      }
    };
    listening.onerror = () => toast(t('hifz.micError'));
    listening.onend = () => {
      $('#recite').classList.remove('listening');
      $('#recite').innerHTML = `${ICON.mic} ${t('hifz.recite')}`;
    };
    listening.start();
  };

  load();
}
