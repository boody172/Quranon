import { saved } from '../account.js';
import { surahText } from '../api.js';
import { findReciter, loadReciters, surahKey, surahMeta, surahName, surahNumbers, surahQueue, surahTitle } from '../catalog.js';
import { SURAHS } from '../data.js';
import { num, t } from '../i18n.js';
import { player } from '../player.js';
import { $, $$, esc, ICON, norm, store, toast } from '../util.js';

const BASMALA = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
const FONT_MIN = 20;
const FONT_MAX = 44;

export function mushaf(view) {
  const lastRead = store.get('lastRead');
  view.innerHTML = `
    ${lastRead ? `<a class="continue" href="#/surah/${lastRead.s}/${lastRead.a || 1}">
      <small>${t('mushaf.continue')}</small><b>${esc(surahTitle(lastRead.s))}</b><span>${t('mushaf.fromAyah', { n: lastRead.a || 1 })}</span></a>` : ''}
    <label class="search">${ICON.search}<input id="mq" type="search" placeholder="${t('mushaf.search')}" autocomplete="off"></label>
    <div class="list" id="mlist">${SURAHS.map((s) => `
      <a class="row" href="#/surah/${s.n}" data-k="${surahKey(s.n)}">
        <span class="num">${num(s.n)}</span><span class="meta"><b>${esc(surahTitle(s.n))}</b><small>${surahMeta(s.n)}</small></span></a>`).join('')}
    </div>`;

  $('#mq').oninput = (e) => {
    const q = norm(e.target.value);
    $$('#mlist .row').forEach((row) => { row.hidden = Boolean(q) && !row.dataset.k.includes(q); });
  };
}

function ayahMarkup({ number, text }, surahNo) {
  // Providers embed the basmala in the first verse; it is shown on its own line instead.
  if (number === 1 && surahNo !== 1 && surahNo !== 9 && text.startsWith('بِسْمِ')) {
    text = text.replace(/^(\S+\s+){4}/, '');
  }
  return `<span class="a" id="a${number}" data-a="${number}">${esc(text)} <span class="m">﴿${number.toLocaleString('ar-EG')}﴾</span></span> `;
}

async function playSurah(n) {
  const all = await loadReciters();
  // The reciter the user opened last, otherwise Sheikh al-Minshawi.
  const r = findReciter(all, store.get('prefReciter')) || all.find((x) => x.arabicKey.includes('المنشاوي')) || all[0];
  const moshaf = r.moshaf.find((m) => surahNumbers(m).includes(n)) || r.moshaf[0];
  const queue = surahQueue(r, moshaf);
  player.play(queue, Math.max(0, queue.findIndex((i) => i.surah === n)));
}

export async function surah(view, { args: [numArg, ayahArg], setTitle }) {
  const n = Math.min(114, Math.max(1, Number(numArg) || 1));
  setTitle(surahTitle(n));
  view.innerHTML = '<div class="list">' + '<div class="skeleton tall"></div>'.repeat(4) + '</div>';

  const ayahs = await surahText(n);
  const surahSaved = () => saved.has('surah', n);
  const saveLabel = () => `${surahSaved() ? ICON.bookmarkFilled : ICON.bookmark} ${t('mushaf.save')}`;
  view.innerHTML = `
    <div class="reader-tools">
      <button class="chip on" id="listen">${ICON.headset} ${t('mushaf.listen')}</button>
      <button class="chip" id="saveSurah" aria-pressed="${surahSaved()}">${saveLabel()}</button>
      <button class="chip" id="bigger" aria-label="${t('mushaf.bigger')}">+A</button>
      <button class="chip" id="smaller" aria-label="${t('mushaf.smaller')}">−A</button>
    </div>
    <article class="mushaf-page" lang="ar" dir="rtl">
      <header class="mushaf-head"><h1>سورة ${SURAHS[n - 1].name}</h1><small dir="auto">${surahMeta(n)}</small></header>
      ${n !== 1 && n !== 9 ? `<p class="basmala">${BASMALA}</p>` : ''}
      <div class="mushaf-text" id="mtext" style="--qsize:${store.get('qsize', 26)}px">${ayahs.map((a) => ayahMarkup(a, n)).join('')}</div>
    </article>
    ${n < 114 ? `<a class="pill primary wide next" href="#/surah/${n + 1}">${esc(t('mushaf.next', { name: surahName(n + 1) }))}</a>` : ''}
    <div class="ayah-bar" id="ayahBar" hidden>
      <span id="ayahLabel"></span>
      <button class="pill soft" id="saveAyah"></button>
      <button class="icon-btn small" id="closeBar" aria-label="${t('common.close')}">${ICON.close}</button>
    </div>`;

  const setSize = (px) => {
    px = Math.min(FONT_MAX, Math.max(FONT_MIN, px));
    store.set('qsize', px);
    $('#mtext').style.setProperty('--qsize', px + 'px');
  };
  $('#bigger').onclick = () => setSize(store.get('qsize', 26) + 2);
  $('#smaller').onclick = () => setSize(store.get('qsize', 26) - 2);
  $('#listen').onclick = () => playSurah(n);
  $('#saveSurah').onclick = (e) => {
    const now = saved.toggle({ type: 'surah', ref: n, title: surahTitle(n), subtitle: surahMeta(n) });
    e.currentTarget.innerHTML = saveLabel();
    e.currentTarget.setAttribute('aria-pressed', now);
    toast(t(now ? 'toast.saved' : 'toast.removed'));
  };

  // Tapping a verse marks the reading position and offers to save it.
  let selected = null;
  const showBar = (a) => {
    selected = a;
    $('#ayahLabel').textContent = t('ayah.label', { n: a });
    $('#saveAyah').textContent = t(saved.has('ayah', `${n}:${a}`) ? 'ayah.saved' : 'ayah.save');
    $('#ayahBar').hidden = false;
  };
  $('#mtext').onclick = (e) => {
    const el = e.target.closest('.a');
    if (!el) return;
    $$('.a.sel', view).forEach((x) => x.classList.remove('sel'));
    el.classList.add('sel');
    store.set('lastRead', { s: n, a: Number(el.dataset.a) });
    showBar(Number(el.dataset.a));
  };
  $('#saveAyah').onclick = () => {
    const text = $('#a' + selected).firstChild.textContent.trim();
    const now = saved.toggle({ type: 'ayah', ref: `${n}:${selected}`, title: t('ayah.ref', { surah: surahName(n), n: selected }), subtitle: text.slice(0, 150) });
    toast(t(now ? 'toast.saved' : 'toast.removed'));
    showBar(selected);
  };
  $('#closeBar').onclick = () => { $('#ayahBar').hidden = true; };

  if (store.get('lastRead')?.s !== n) store.set('lastRead', { s: n, a: Number(ayahArg) || 1 });
  const target = ayahArg && $('#a' + Number(ayahArg));
  if (target) {
    target.classList.add('sel');
    requestAnimationFrame(() => target.scrollIntoView({ block: 'center' }));
  }
}
