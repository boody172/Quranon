import { saved } from '../account.js';
import { countryName, featuredReciters, findReciter, khatmaProgress, loadReciters, mixedShuffle, randomKhatma, reciterLine, surahKey, surahMeta, surahName, surahQueue } from '../catalog.js';
import { num, t } from '../i18n.js';
import { markPlaying, player } from '../player.js';
import { $, $$, avatar, esc, ICON, norm, toast } from '../util.js';

const FILTERS = ['all', 'saved', 'eg', 'sa', 'world'];
const filterState = { id: 'all', query: '' };
const filterLabel = (id) => (id === 'eg' || id === 'sa' ? t('country.' + id) : t('filter.' + id));

const reciterRow = (r) => `<a class="row" href="#/reciter/${r.id}">${avatar(r.name, r.photo)}
  <span class="meta"><b>${esc(r.name)}</b><small>${esc(reciterLine(r))}</small></span></a>`;

const reciterTile = (r) => `<a class="rtile" href="#/reciter/${r.id}">${avatar(r.name, r.photo, 76)}
  <b>${esc(r.name)}</b><small>${esc(r.late ? t('common.late') : countryName(r.country))}</small></a>`;

/** Alphabetical sections; Arabic letter variants (أ إ آ) share one heading. */
function groupByLetter(list) {
  const groups = new Map();
  for (const r of list) {
    const letter = (r.name.trim()[0] || '#').replace(/[أإآٱ]/, 'ا').toUpperCase();
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter).push(r);
  }
  return [...groups];
}

function matches(r, q) {
  if (q && !r.key.includes(q)) return false;
  switch (filterState.id) {
    case 'all': return true;
    case 'saved': return saved.has('reciter', r.id);
    case 'world': return !['eg', 'sa'].includes(r.country);
    default: return r.country === filterState.id;
  }
}

export async function listen(view, { args: [filter] }) {
  if (FILTERS.includes(filter)) filterState.id = filter;
  view.innerHTML = `
    <label class="search">${ICON.search}<input id="q" type="search" placeholder="${t('listen.search')}" value="${esc(filterState.query)}" autocomplete="off"></label>
    <div class="chips" id="filters">${FILTERS.map((id) =>
      `<button class="chip${filterState.id === id ? ' on' : ''}" data-f="${id}" aria-pressed="${filterState.id === id}">${filterLabel(id)}</button>`).join('')}</div>
    <div class="shuffle-card">
      <span class="disc">${ICON.shuffle}</span>
      <span class="meta"><b>${t('shuffle.title')}</b><small>${t('shuffle.subtitle')}</small></span>
      <button class="pill primary" id="mixAll">${ICON.play} ${t('shuffle.start')}</button>
    </div>
    <button class="link small" id="mixSaved" hidden>${t('shuffle.fromSaved')}</button>
    <section id="featured" hidden><h2 class="section">${t('listen.featured')}</h2><div class="hscroll"></div></section>
    <h2 class="section">${t('listen.all')} <small class="muted" id="count"></small></h2>
    <nav class="letters" id="letters" aria-label="${t('listen.az')}"></nav>
    <div class="list" id="rlist">${'<div class="skeleton"></div>'.repeat(8)}</div>`;

  const list = await loadReciters();
  $('#letters').onclick = (e) => {
    const b = e.target.closest('[data-l]');
    if (b) $('#letter-' + b.dataset.l)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const savedReciters = list.filter((r) => saved.has('reciter', r.id));
  $('#mixSaved').hidden = savedReciters.length < 2;
  $('#mixAll').onclick = () => {
    const { queue, refill } = mixedShuffle(list);
    player.play(queue, 0, { refill });
    toast(t('shuffle.started'));
  };
  $('#mixSaved').onclick = () => {
    const { queue, refill } = mixedShuffle(list, { pool: savedReciters });
    player.play(queue, 0, { refill });
    toast(t('shuffle.started'));
  };

  const draw = () => {
    const q = norm(filterState.query);
    const results = list.filter((r) => matches(r, q));
    $('#count').textContent = `(${num(results.length)})`;
    const groups = groupByLetter(results);
    $('#letters').innerHTML = q || groups.length < 4 ? '' : groups.map(([letter], i) => `<button data-l="${i}">${esc(letter)}</button>`).join('');
    $('#rlist').innerHTML = results.length
      ? groups.map(([letter, rows], i) => `<h3 class="letter" id="letter-${i}">${esc(letter)}</h3>${rows.map(reciterRow).join('')}`).join('')
      : `<p class="empty">${filterState.id === 'saved' ? t('listen.emptySaved') : t('common.noResults')}</p>`;

    const showFeatured = filterState.id === 'all' && !q;
    $('#featured').hidden = !showFeatured;
    if (showFeatured && !$('#featured .hscroll').childElementCount) {
      $('#featured .hscroll').innerHTML = featuredReciters(list).map(reciterTile).join('');
    }
  };
  draw();

  $('#q').addEventListener('input', (e) => { filterState.query = e.target.value; draw(); });
  $('#filters').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-f]');
    if (!chip) return;
    filterState.id = chip.dataset.f;
    $$('#filters .chip').forEach((c) => {
      c.classList.toggle('on', c === chip);
      c.setAttribute('aria-pressed', c === chip);
    });
    draw();
  });
}

export async function reciter(view, { args: [id], setTitle }) {
  view.innerHTML = '<div class="list">' + '<div class="skeleton"></div>'.repeat(10) + '</div>';
  const r = findReciter(await loadReciters(), id);
  if (!r) { view.innerHTML = `<p class="empty">${t('reciter.notFound')}</p>`; return; }
  setTitle(r.name);
  let moshafIndex = 0;

  const draw = () => {
    const moshaf = r.moshaf[moshafIndex];
    const queue = surahQueue(r, moshaf);
    const isSaved = saved.has('reciter', r.id);
    const progress = khatmaProgress(r, moshaf);
    view.innerHTML = `
      <header class="profile">${avatar(r.name, r.photo, 88)}
        <div><h1>${esc(r.name)}</h1><p class="muted">${esc(reciterLine(r))}</p></div></header>
      <div class="actions">
        <button class="pill primary" id="playKhatma">${ICON.play} ${t(progress.heard ? 'khatma.continue' : 'khatma.play')}</button>
        <button class="pill icon${isSaved ? ' saved' : ''}" id="save" aria-pressed="${isSaved}" aria-label="${t('reciter.save')}">${isSaved ? ICON.heartFilled : ICON.heart}</button>
      </div>
      <div class="khatma">
        <div class="khatma-bar"><i style="width:${(progress.heard / progress.total) * 100}%"></i></div>
        <p>${t('khatma.progress', { heard: progress.heard, total: progress.total })}${progress.done ? ' · ' + t('khatma.done', { n: progress.done }) : ''}</p>
        <button class="chip" id="playAll">${t('khatma.inOrder')}</button>
      </div>
      ${r.moshaf.length > 1
        ? `<select class="select" id="moshaf" aria-label="${t('reciter.recitation')}">${r.moshaf.map((m, i) => `<option value="${i}"${i === moshafIndex ? ' selected' : ''}>${esc(m.name)}${m.quality === 3 ? ' · ' + t('quality.high') : m.quality === 0 ? ' · ' + t('quality.low') : ''}</option>`).join('')}</select>`
        : `<p class="muted">${esc(moshaf.name)}${moshaf.quality === 3 ? ' · ' + t('quality.high') : moshaf.quality === 0 ? ' · ' + t('quality.low') : ''}</p>`}
      <label class="search">${ICON.search}<input id="sq" type="search" placeholder="${t('reciter.searchSurah')}" autocomplete="off"></label>
      <div class="list" id="slist">${queue.map((item, i) => `
        <button class="row" data-i="${i}" data-play="${esc(item.url)}" data-k="${surahKey(item.surah)}">
          <span class="num">${num(item.surah)}</span><span class="meta"><b>${esc(surahName(item.surah))}</b><small>${item.excerpt ? t('track.excerptShort') : surahMeta(item.surah)}</small></span>${ICON.play}</button>`).join('')}
      </div>`;

    markPlaying();
    $('#playAll').onclick = () => player.play(queue, 0);
    $('#playKhatma').onclick = () => {
      const khatma = randomKhatma(r, moshaf);
      player.play(khatma.queue, 0, { refill: khatma.refill });
      toast(t('khatma.started'));
    };
    $('#save').onclick = () => {
      const now = saved.toggle({ type: 'reciter', ref: r.id, title: r.name, subtitle: reciterLine(r) });
      toast(t(now ? 'toast.saved' : 'toast.removed'));
      draw();
    };
    $('#slist').onclick = (e) => { const row = e.target.closest('[data-i]'); if (row) player.play(queue, Number(row.dataset.i)); };
    $('#sq').oninput = (e) => {
      const q = norm(e.target.value);
      $$('#slist .row').forEach((row) => { row.hidden = Boolean(q) && !row.dataset.k.includes(q); });
    };
    $('#moshaf')?.addEventListener('change', (e) => { moshafIndex = Number(e.target.value); draw(); });
  };
  draw();
}
