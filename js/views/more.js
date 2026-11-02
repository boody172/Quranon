// Smaller screens: radio, lessons, search, saved items, account, qibla page.
import { monetization } from '../ads.js';
import { account, saved } from '../account.js';
import { SOURCES } from '../api.js';
import { countryName, getLessonParts, loadRadios, loadReciters, loadScholars, loadTafsir, reciterLine, scholarLessons, surahKey, surahMeta, surahTitle } from '../catalog.js';
import { LESSON_COUNTRIES, SURAHS } from '../data.js';
import { i18n, num, t } from '../i18n.js';
import { markPlaying, player } from '../player.js';
import { Qibla } from '../qibla.js';
import { $, $$, avatar, esc, ICON, norm, toast } from '../util.js';

const filterRows = (input, rows) => input.addEventListener('input', () => {
  const q = norm(input.value);
  $$(rows).forEach((row) => { row.hidden = Boolean(q) && !row.dataset.k.includes(q); });
});

export async function radio(view) {
  view.innerHTML = `<label class="search">${ICON.search}<input id="rq" type="search" placeholder="${t('radio.search')}" autocomplete="off"></label>
    <div class="list" id="radios">${'<div class="skeleton"></div>'.repeat(8)}</div>`;
  const radios = await loadRadios();
  const queue = radios.map((r) => ({ title: r.name, sub: t('player.live'), url: r.url, live: true, fav: { type: 'radio', ref: String(r.id), title: r.name, subtitle: t('player.live') } }));
  $('#radios').innerHTML = radios.map((r, i) => `
    <button class="row" data-i="${i}" data-play="${esc(r.url)}" data-k="${norm(r.name)}">
      <span class="disc">${ICON.radio}</span><span class="meta"><b>${esc(r.name)}</b></span><span class="live">${t('radio.live')}</span></button>`).join('');
  markPlaying();
  $('#radios').onclick = (e) => { const row = e.target.closest('[data-i]'); if (row) player.play(queue, Number(row.dataset.i)); };
  filterRows($('#rq'), '#radios .row');
}

let lessonCountry = 'all';
export async function lessons(view) {
  view.innerHTML = `
    <div class="chips" id="lc">${[['all', t('filter.all')], ...LESSON_COUNTRIES.map((c) => [c, countryName(c)])].map(([id, label]) =>
      `<button class="chip${lessonCountry === id ? ' on' : ''}" data-c="${id}">${label}</button>`).join('')}</div>
    <div class="list" id="scholars">${'<div class="skeleton"></div>'.repeat(5)}</div>
    <h2 class="section">${t('lessons.tafsir')}</h2>
    <div class="list" id="tafsir">${'<div class="skeleton"></div>'.repeat(4)}</div>`;

  const scholars = await loadScholars();
  const draw = () => {
    const list = scholars.filter((s) => lessonCountry === 'all' || s.country === lessonCountry);
    $('#scholars').innerHTML = list.map((s) => `
      <a class="row" href="#/scholar/${encodeURIComponent(s.id)}">${avatar(s.name, s.photo)}
        <span class="meta"><b>${esc(s.name)}</b><small>${esc([s.topic, countryName(s.country), s.late ? t('common.late') : ''].filter(Boolean).join(' · '))}</small></span>
        <span class="trail">${ICON.headset}</span></a>`).join('') || `<p class="empty">${t('lessons.noScholars')}</p>`;
  };
  draw();
  $('#lc').onclick = (e) => {
    const chip = e.target.closest('[data-c]');
    if (!chip) return;
    lessonCountry = chip.dataset.c;
    $$('#lc .chip').forEach((c) => c.classList.toggle('on', c === chip));
    draw();
  };

  try {
    const tafsir = await loadTafsir();
    const parts = tafsir?.soar || [];
    if (!parts.length) throw new Error('empty');
    const queue = parts.map((p) => ({ title: p.name, sub: tafsir.name || t('lessons.tafsir'), url: p.url, surah: p.sura_id }));
    $('#tafsir').innerHTML = `<p class="muted">${esc(tafsir.name || '')}</p>` + parts.map((p, i) => `
      <button class="row" data-i="${i}" data-play="${esc(p.url)}"><span class="num">${num(p.sura_id || i + 1)}</span>
        <span class="meta"><b>${esc(p.name)}</b></span>${ICON.play}</button>`).join('');
    markPlaying();
    $('#tafsir').onclick = (e) => { const row = e.target.closest('[data-i]'); if (row) player.play(queue, Number(row.dataset.i)); };
  } catch {
    $('#tafsir').innerHTML = `<p class="empty">${t('lessons.tafsirUnavailable')}</p>`;
  }
}

export async function search(view) {
  view.innerHTML = `<label class="search">${ICON.search}<input id="gq" type="search" placeholder="${t('search.placeholder')}" autocomplete="off"></label><div id="gres"></div>`;
  const input = $('#gq');
  input.focus();
  const reciters = await loadReciters().catch(() => []);
  input.addEventListener('input', () => {
    const q = norm(input.value);
    if (!q) { $('#gres').innerHTML = ''; return; }
    const surahs = SURAHS.filter((s) => surahKey(s.n).includes(q)).slice(0, 8);
    const people = reciters.filter((r) => r.key.includes(q)).slice(0, 15);
    $('#gres').innerHTML =
      (surahs.length ? `<h2 class="section">${t('search.surahs')}</h2><div class="list">${surahs.map((s) => `
        <a class="row" href="#/surah/${s.n}"><span class="num">${num(s.n)}</span><span class="meta"><b>${esc(surahTitle(s.n))}</b><small>${surahMeta(s.n)}</small></span></a>`).join('')}</div>` : '')
      + (people.length ? `<h2 class="section">${t('search.reciters')}</h2><div class="list">${people.map((r) => `
        <a class="row" href="#/reciter/${r.id}">${avatar(r.name, r.photo)}<span class="meta"><b>${esc(r.name)}</b><small>${esc(reciterLine(r))}</small></span></a>`).join('')}</div>` : '')
      || `<p class="empty">${t('common.noResults')}</p>`;
  });
}

/** A scholar's audio lessons, played inside the app in order. */
export async function scholarView(view, { args: [id], setTitle }) {
  view.innerHTML = '<div class="list">' + '<div class="skeleton"></div>'.repeat(8) + '</div>';
  const scholar = (await loadScholars()).find((s) => String(s.id) === String(id));
  if (!scholar) { view.innerHTML = `<p class="empty">${t('lessons.notFound')}</p>`; return; }
  setTitle(scholar.name);

  const lessons = [];
  let page = 0;
  let more = true;
  const sub = scholar.name;

  view.innerHTML = `
    <header class="profile">${avatar(scholar.name, scholar.photo, 88)}
      <div><h1>${esc(scholar.name)}</h1><p class="muted">${esc([scholar.topic, countryName(scholar.country), scholar.late ? t('common.late') : ''].filter(Boolean).join(' · '))}</p></div></header>
    <div class="actions"><button class="pill primary" id="playAll" disabled>${ICON.play} ${t('lessons.playAll')}</button></div>
    <div class="list" id="lessonList">${'<div class="skeleton"></div>'.repeat(6)}</div>
    <button class="pill wide" id="moreLessons" hidden>${t('lessons.more')}</button>`;

  const row = (lesson, i) => `<button class="row" data-i="${i}">
    <span class="num">${num(i + 1)}</span><span class="meta"><b>${esc(lesson.title)}</b></span>${ICON.play}</button>`;

  const loadPage = async () => {
    $('#moreLessons').disabled = true;
    const result = await scholarLessons(scholar, ++page);
    lessons.push(...result.lessons);
    more = result.more;
    $('#lessonList').innerHTML = lessons.length ? lessons.map(row).join('') : `<p class="empty">${t('lessons.none')}</p>`;
    $('#moreLessons').hidden = !more;
    $('#moreLessons').disabled = false;
    $('#playAll').disabled = !lessons.length;
    markPlaying();
  };

  // A lesson can have several audio files; each becomes one queue entry, in order.
  const queueFrom = async (from, count) => {
    const chosen = lessons.slice(from, from + count);
    const parts = await Promise.all(chosen.map((l) => getLessonParts(l).catch(() => [])));
    const fav = { type: 'scholar', ref: String(scholar.id), title: scholar.name, subtitle: scholar.topic };
    return chosen.flatMap((lesson, i) => parts[i].map((p, n) => ({
      title: parts[i].length > 1 ? `${lesson.title} (${num(n + 1)})` : lesson.title,
      sub,
      url: p.url,
      fav,
    })));
  };

  const play = async (from) => {
    const queue = await queueFrom(from, 25);
    if (!queue.length) { toast(t('lessons.unavailable')); return; }
    player.play(queue, 0);
  };

  $('#lessonList').onclick = (e) => { const r = e.target.closest('[data-i]'); if (r) play(Number(r.dataset.i)); };
  $('#playAll').onclick = () => play(0);
  $('#moreLessons').onclick = loadPage;

  try {
    await loadPage();
  } catch {
    $('#lessonList').innerHTML = `<p class="empty">${t('lessons.unavailable')}</p>`;
  }
}

const SAVED_GROUPS = [
  ['reciter', 'saved.reciters', (i) => `#/reciter/${i.ref}`],
  ['scholar', 'saved.scholars', (i) => `#/scholar/${i.ref}`],
  ['radio', 'saved.radios', null], // plays right here
  ['surah', 'saved.surahs', (i) => `#/surah/${i.ref}`],
  ['ayah', 'saved.ayahs', (i) => `#/surah/${i.ref.replace(':', '/')}`],
];

export async function savedView(view) {
  view.innerHTML = '<div id="savedRoot"></div>';
  const root = $('#savedRoot');
  const draw = (reciters = []) => {
    const all = saved.all();
    if (!all.length) {
      root.innerHTML = `<div class="empty-state">${ICON.heart}<h2>${t('saved.emptyTitle')}</h2>
        <p>${t('saved.emptyText')}</p><a class="pill primary" href="#/listen">${t('saved.browse')}</a></div>`;
      return;
    }
    root.innerHTML = SAVED_GROUPS.map(([type, label, href]) => {
      const group = saved.ofType(type);
      if (!group.length) return '';
      return `<h2 class="section">${t(label)}</h2><div class="list">${group.map((item) => {
        const title = item.title || reciters.find((r) => String(r.id) === item.ref)?.name || t('saved.reciters');
        const text = `<b>${esc(title)}</b>${item.subtitle ? `<small>${esc(item.subtitle)}</small>` : ''}`;
        const open = href ? `<a class="meta" href="${href(item)}">${text}</a>` : `<button class="meta" data-radio="${esc(item.ref)}">${text}</button>`;
        return `<div class="row">${open}
          <button class="icon-btn small" data-type="${type}" data-ref="${esc(item.ref)}" aria-label="${t('common.remove')}">${ICON.close}</button></div>`;
      }).join('')}</div>`;
    }).join('');
  };
  draw();
  loadReciters().then(draw).catch(() => {});
  root.onclick = async (e) => {
    const radioBtn = e.target.closest('[data-radio]');
    if (radioBtn) {
      const station = (await loadRadios()).find((r) => String(r.id) === radioBtn.dataset.radio);
      if (station) player.play([{ title: station.name, sub: t('player.live'), url: station.url, live: true, fav: { type: 'radio', ref: String(station.id), title: station.name, subtitle: t('player.live') } }]);
      return;
    }
    const btn = e.target.closest('[data-type]');
    if (!btn) return;
    saved.toggle({ type: btn.dataset.type, ref: btn.dataset.ref });
    toast(t('toast.removed'));
    draw();
  };
}

export async function accountView(view) {
  if (account.signedIn) {
    await Promise.race([account.refresh().catch(() => {}), new Promise((r) => setTimeout(r, 800))]); // fresh Plus status
    const plusUntil = account.user?.plus_until;
    view.innerHTML = `
      <section class="hello"><p>${t('account.yours')}</p><h1>${esc(t('greet.named', { name: account.firstName() }))}</h1></section>
      <div class="list">
        <a class="row" href="#/saved"><span class="disc">${ICON.heart}</span><span class="meta"><b>${t('page.saved')}</b><small>${t('saved.count', { n: saved.all().length })}</small></span></a>
        ${monetization() === 'plus' ? `<a class="row" href="#/plus"><span class="disc">${ICON.star}</span><span class="meta"><b>${t('plus.title')}</b>
          <small>${plusUntil ? esc(t('account.plusActive', { date: new Date(plusUntil).toLocaleDateString(i18n.lang === 'ar' ? 'ar-EG' : i18n.lang) })) : t('plus.subtitle')}</small></span></a>` : ''}
      </div>
      <p class="muted small">${t('account.synced')}</p>
      <button class="pill wide" id="logout">${t('account.logout')}</button>
      <details class="danger-zone">
        <summary>${t('account.delete')}</summary>
        <p class="muted small">${t('account.deleteHint')}</p>
        <form class="form" id="deleteForm">
          <label>${t('account.password')}<input name="password" type="password" autocomplete="current-password" dir="ltr" required></label>
          <p class="form-error" id="deleteError" role="alert" hidden></p>
          <button class="pill wide danger">${t('account.deleteConfirm')}</button>
        </form>
      </details>
      <p class="center small"><a class="link-inline" href="privacy.html">${t('account.privacy')}</a></p>`;
    $('#logout').onclick = async () => { await account.logout(); toast(t('account.loggedOut')); location.hash = '#/home'; };
    $('#deleteForm').onsubmit = async (e) => {
      e.preventDefault();
      try {
        await account.deleteAccount(new FormData(e.target).get('password'));
        toast(t('account.deleted'));
        location.hash = '#/home';
      } catch (err) {
        $('#deleteError').textContent = err.body?.errors?.password?.[0] || t('error.generic');
        $('#deleteError').hidden = false;
      }
    };
    return;
  }

  let mode = 'login';
  const draw = () => {
    const login = mode === 'login';
    view.innerHTML = `
      <section class="hello"><p>${t('account.yours')}</p><h1>${t(login ? 'account.welcomeBack' : 'account.new')}</h1></section>
      <form class="form" id="authForm" novalidate>
        ${login ? '' : `<label>${t('account.name')}<input name="name" autocomplete="given-name" required maxlength="60"></label>`}
        <label>${t('account.email')}<input name="email" type="email" autocomplete="email" dir="ltr" required maxlength="190"></label>
        <label>${t('account.password')}<input name="password" type="password" autocomplete="${login ? 'current-password' : 'new-password'}" dir="ltr" required minlength="8" maxlength="128"></label>
        <p class="form-error" id="formError" role="alert" hidden></p>
        <button class="pill primary wide">${t(login ? 'account.login' : 'account.register')}</button>
      </form>
      <button class="link" id="switchMode">${t(login ? 'account.toRegister' : 'account.toLogin')}</button>
      <p class="muted small center">${t('account.optional')}</p>
      <p class="center small"><a class="link-inline" href="privacy.html">${t('account.privacy')}</a></p>`;

    $('#switchMode').onclick = () => { mode = login ? 'register' : 'login'; draw(); };
    $('#authForm').onsubmit = async (e) => {
      e.preventDefault();
      const form = new FormData(e.target);
      const button = e.target.querySelector('button');
      const error = $('#formError');
      button.disabled = true;
      error.hidden = true;
      try {
        if (login) await account.login(form.get('email'), form.get('password'));
        else await account.register(form.get('name'), form.get('email'), form.get('password'));
        toast(t('greet.named', { name: account.firstName() }));
        location.hash = '#/home';
      } catch (err) {
        const first = err.body?.errors && Object.values(err.body.errors)[0]?.[0];
        error.textContent = !SOURCES.app || err.status === 0 ? t('account.unavailable') : first || t('error.generic');
        error.hidden = false;
        button.disabled = false;
      }
    };
  };
  draw();
}

export function qiblaView(view, { onCleanup }) {
  view.innerHTML = `
    <div class="qpage" id="qroot">
      <p class="qhint" id="qhint">${t('qibla.locating')}</p>
      <div class="qbig">${Qibla.svg()}</div>
      <div class="stats">
        <div><b id="qDeg">—</b><small>${t('qibla.angle')}</small></div>
        <div><b id="qHead">—</b><small>${t('qibla.heading')}</small></div>
        <div><b id="qDist">—</b><small>${t('qibla.distance')}</small></div>
      </div>
      <button class="pill primary" id="qStart">${ICON.compass} ${t('qibla.start')}</button>
      <p class="muted small">${t('qibla.calibrate')}</p>
    </div>`;
  const root = $('#qroot');
  $('#qStart').hidden = true;
  root.addEventListener('click', () => Qibla.unlockMotion());
  Qibla.start((st) => {
    if (!document.contains(root)) return;
    $('#qhint').textContent = Qibla.hint(st);
    Qibla.render(root, st);
    if (st.bearing != null) {
      $('#qDeg').textContent = num(Math.round(st.bearing)) + '°';
      $('#qDist').textContent = num(Math.round(st.dist));
    }
    if (st.heading != null && st.state === 'live') $('#qHead').textContent = num(Math.round(st.heading)) + '°';
  }).then((stop) => (document.contains(root) ? onCleanup(stop) : stop()));
}
