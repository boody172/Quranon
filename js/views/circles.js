// Group memorisation ("حلقات الحفظ"): friends, family or a class memorise the same verses on one daily plan.
// The plan travels inside the invite link, so circles work even without the server; with an account
// the circle also gets a members board (progress, streaks, who finished today's portion).
import { appRequest } from '../api.js';
import { account } from '../account.js';
import { surahTitle } from '../catalog.js';
import { SURAHS } from '../data.js';
import { i18n, num, t } from '../i18n.js';
import { $, esc, ICON, store, toast } from '../util.js';

const PER_DAY = [1, 2, 3, 5, 10];
const SITE = 'https://quranon.vercel.app/';

// ---------- dates (the member's own calendar) ----------
const today = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
const dayNumber = (iso) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
const formatDate = (iso) => new Date(iso + 'T12:00').toLocaleDateString(i18n.lang === 'ar' ? 'ar-EG' : i18n.lang, { day: 'numeric', month: 'long' });

// "10 days" in proper Arabic: يوم / يومين / ٣–١٠ أيام / ١١+ يوماً
function daysText(n) {
  if (i18n.lang !== 'ar') return t('circle.days', { n: num(n) });
  if (n === 1) return 'يوم واحد';
  if (n === 2) return 'يومين';
  return `${num(n)} ${n <= 10 ? 'أيام' : 'يوماً'}`;
}

// ---------- local list ----------
const load = () => store.get('circles', []);
const save = (list) => store.set('circles', list);
const idOf = (c) => c.code || c.local;
const find = (id) => load().find((c) => idOf(c) === id);
function upsert(circle) {
  const list = load().filter((c) => idOf(c) !== idOf(circle) && !(circle.local && c.local === circle.local));
  save([circle, ...list]);
}

// ---------- invite links ----------
const b64 = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));

function inviteToken(c) {
  return b64(JSON.stringify({ n: c.name, s: c.surah, f: c.from, t: c.to, d: c.perDay, st: c.start, c: c.code || undefined, l: c.local }));
}
function parseToken(token) {
  try {
    const p = JSON.parse(unb64(token));
    const ayahs = SURAHS[p.s - 1]?.ayahs;
    if (!ayahs || !(p.f >= 1 && p.t <= ayahs && p.f <= p.t && p.d >= 1 && p.d <= 20) || !/^\d{4}-\d{2}-\d{2}$/.test(p.st)) return null;
    return { name: String(p.n || '').slice(0, 60), surah: p.s, from: p.f, to: p.t, perDay: p.d, start: p.st, code: p.c && /^[A-Z0-9]{6}$/.test(p.c) ? p.c : null, local: p.l || null };
  } catch { return null; }
}
const inviteUrl = (c) => (/^https?:/.test(location.origin) ? location.origin + location.pathname : SITE) + '#/circle/' + inviteToken(c);
const fromServer = (d) => ({ code: d.code, name: d.name, surah: d.surah, from: d.from, to: d.to, perDay: d.per_day, start: d.starts_on, local: null });

// ---------- plan maths ----------
function plan(c) {
  const total = c.to - c.from + 1;
  const days = Math.ceil(total / c.perDay);
  const day = dayNumber(today()) - dayNumber(c.start); // 0 = first day
  const first = c.from + day * c.perDay;
  const portion = day < 0 || first > c.to ? null : { from: first, to: Math.min(c.to, first + c.perDay - 1) };
  return { total, days, day, portion, notStarted: day < 0, finished: first > c.to };
}
const memorisedSet = (surah) => new Set(store.get('hifz:' + surah, []));
function myProgress(c) {
  const set = memorisedSet(c.surah);
  const { portion } = plan(c);
  let count = 0;
  for (let a = c.from; a <= c.to; a++) if (set.has(a)) count++;
  const doneToday = Boolean(portion) && Array.from({ length: portion.to - portion.from + 1 }, (_, i) => portion.from + i).every((a) => set.has(a));
  return { count, doneToday };
}

// ---------- server sync ----------
const online = () => account.signedIn;
async function pushProgress(c) {
  if (!c.code || !online()) return null;
  const { count, doneToday } = myProgress(c);
  const { data } = await appRequest(`circles/${c.code}/progress?today=${today()}`, {
    method: 'POST', token: account.token, body: { memorised: count, done_today: doneToday, today: today() },
  });
  return data;
}

// When verses are memorised in the hifz screen: celebrate today's portion and update the board.
const celebrated = new Set();
addEventListener('hifz:progress', (e) => {
  for (const c of load().filter((x) => x.surah === e.detail.surah)) {
    if (myProgress(c).doneToday && !celebrated.has(idOf(c) + today())) {
      celebrated.add(idOf(c) + today());
      toast(t('circle.doneToday', { name: c.name }));
    }
    pushProgress(c).catch(() => {});
  }
});

/** Opens the memorisation screen on a range of the circle. */
function startHifz(c, range) {
  const prev = store.get('hifz:setup', { reciter: 'ar.husary', repeat: 3, rounds: 1 });
  store.set('hifz:setup', { ...prev, surah: c.surah, from: range.from, to: range.to });
  location.hash = '#/hifz/start';
}

async function share(c) {
  const url = inviteUrl(c);
  const text = t('circle.inviteText', { name: c.name, surah: surahTitle(c.surah), n: num(c.perDay) });
  if (navigator.share) {
    try { await navigator.share({ title: c.name, text, url }); return; } catch (err) { if (err?.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(`${text}\n${url}`); toast(t('circle.linkCopied')); } catch { prompt(t('circle.copyThis'), url); }
}

// ---------- screens ----------
export async function circles(view) {
  const list = load();
  const yyyyMmDd = today();
  view.innerHTML = `
    <section class="hello"><p>${t('circle.kicker')}</p><h1>${t('circle.title')}</h1></section>
    <p class="muted">${t('circle.intro')}</p>
    <div class="list" id="myCircles">${list.length ? list.map((c) => {
      const p = plan(c);
      const mine = myProgress(c);
      return `<a class="row circle-row" href="#/circle/${esc(inviteToken(c))}">
        <span class="disc">${ICON.users || ICON.heart}</span>
        <span class="meta"><b>${esc(c.name)}</b><small>${esc(surahTitle(c.surah))} · ${t('circle.progressShort', { n: num(mine.count), total: num(p.total) })}</small></span>
        ${mine.doneToday ? `<span class="tag ok">${ICON.check}</span>` : p.portion ? `<span class="tag">${t('circle.todayShort')}</span>` : ''}
      </a>`;
    }).join('') : `<div class="empty-state small"><p>${t('circle.none')}</p></div>`}</div>

    <details class="card-form" ${list.length ? '' : 'open'}>
      <summary>${ICON.plus || '+'} ${t('circle.create')}</summary>
      <form class="form" id="createForm">
        <label>${t('circle.name')}<input name="name" maxlength="60" required placeholder="${t('circle.namePh')}"></label>
        <label>${t('hifz.surah')}<select class="select" name="surah">${SURAHS.map((s) => `<option value="${s.n}"${s.n === 67 ? ' selected' : ''}>${num(s.n)}. ${esc(surahTitle(s.n))}</option>`).join('')}</select></label>
        <div class="two">
          <label>${t('hifz.from')}<select class="select" name="from"></select></label>
          <label>${t('hifz.to')}<select class="select" name="to"></select></label>
        </div>
        <fieldset><legend>${t('circle.perDay')}</legend><div class="segmented" data-name="perDay">${PER_DAY.map((n) => `<button type="button" role="radio" aria-checked="${n === 3}" value="${n}">${num(n)}</button>`).join('')}</div></fieldset>
        <label>${t('circle.start')}<input name="start" type="date" value="${yyyyMmDd}" min="${yyyyMmDd}" dir="ltr" required></label>
        <p class="muted small" id="planHint"></p>
        <p class="form-error" id="createError" role="alert" hidden></p>
        <button class="pill primary wide">${t('circle.createBtn')}</button>
      </form>
    </details>

    <form class="form join-form" id="joinForm" ${online() ? '' : 'hidden'}>
      <label>${t('circle.joinCode')}<input name="code" maxlength="6" dir="ltr" autocapitalize="characters" autocomplete="off" placeholder="ABC234" required></label>
      <button class="pill">${t('circle.join')}</button>
    </form>
    <p class="muted small center">${online() ? t('circle.boardOn') : t('circle.boardOff')}</p>`;

  const form = $('#createForm');
  const fill = () => {
    const total = SURAHS[form.surah.value - 1].ayahs;
    const opts = (sel) => Array.from({ length: total }, (_, i) => `<option value="${i + 1}"${i + 1 === sel ? ' selected' : ''}>${num(i + 1)}</option>`).join('');
    form.from.innerHTML = opts(1);
    form.to.innerHTML = opts(total);
    hint();
  };
  const perDay = () => +form.querySelector('[data-name=perDay] [aria-checked=true]').value;
  const hint = () => {
    const days = Math.ceil((+form.to.value - +form.from.value + 1) / perDay());
    $('#planHint').textContent = t('circle.planHint', { days: daysText(days) });
  };
  fill();
  form.surah.onchange = fill;
  form.from.onchange = () => { if (+form.to.value < +form.from.value) form.to.value = form.from.value; hint(); };
  form.to.onchange = () => { if (+form.to.value < +form.from.value) form.from.value = form.to.value; hint(); };
  form.querySelector('.segmented').onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    form.querySelectorAll('.segmented button').forEach((x) => x.setAttribute('aria-checked', x === b));
    hint();
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    const c = {
      name: form.name.value.trim(), surah: +form.surah.value, from: +form.from.value, to: +form.to.value,
      perDay: perDay(), start: form.start.value || yyyyMmDd, code: null, local: Math.random().toString(36).slice(2, 10),
    };
    if (!c.name) return;
    if (online()) {
      try {
        const { data } = await appRequest('circles', {
          method: 'POST', token: account.token,
          body: { name: c.name, surah: c.surah, from: c.from, to: c.to, per_day: c.perDay, starts_on: c.start },
        });
        Object.assign(c, fromServer(data));
      } catch { /* server unreachable: the circle still works through its link */ }
    }
    upsert(c);
    toast(t('circle.created'));
    location.hash = '#/circle/' + inviteToken(c);
  };

  $('#joinForm').onsubmit = async (e) => {
    e.preventDefault();
    const code = e.target.code.value.trim().toUpperCase();
    try {
      const { data } = await appRequest(`circles/${encodeURIComponent(code)}/join?today=${today()}`, { method: 'POST', token: account.token });
      const c = fromServer(data);
      upsert(c);
      location.hash = '#/circle/' + inviteToken(c);
    } catch (err) {
      toast(t(err.status === 404 ? 'circle.badCode' : 'error.generic'));
    }
  };
}

export async function circle(view, { args: [token], setTitle }) {
  const fromLink = parseToken(token || '');
  if (!fromLink) { location.hash = '#/circles'; return; }
  let c = find(fromLink.code || fromLink.local) || null;
  const member = Boolean(c);
  c ||= fromLink;
  setTitle(c.name || t('circle.title'));

  if (!member) {
    const p = plan(c);
    view.innerHTML = `
      <section class="hello"><p>${t('circle.invited')}</p><h1>${esc(c.name)}</h1></section>
      <div class="circle-hero">
        <b>${esc(surahTitle(c.surah))}</b>
        <span>${t('hifz.range', { from: num(c.from), to: num(c.to) })}</span>
        <span>${t('circle.planLine', { n: num(c.perDay), days: daysText(p.days) })}</span>
        <span>${p.notStarted ? t('circle.startsOn', { date: formatDate(c.start) }) : t('circle.dayOf', { day: num(Math.min(p.day + 1, p.days)), days: num(p.days) })}</span>
      </div>
      <button class="pill primary wide" id="joinBtn">${t('circle.joinThis')}</button>`;
    $('#joinBtn').onclick = async () => {
      if (c.code && online()) {
        try { Object.assign(c, fromServer((await appRequest(`circles/${c.code}/join?today=${today()}`, { method: 'POST', token: account.token })).data)); } catch { /* joins locally */ }
      }
      upsert(c);
      toast(t('circle.joined'));
      circle(view, { args: [inviteToken(c)], setTitle });
    };
    return;
  }

  const p = plan(c);
  const mine = myProgress(c);
  const pct = Math.round((mine.count / p.total) * 100);
  view.innerHTML = `
    <section class="hello"><p>${esc(surahTitle(c.surah))} · ${t('hifz.range', { from: num(c.from), to: num(c.to) })}</p><h1>${esc(c.name)}</h1></section>
    <div class="today-card ${mine.doneToday ? 'done' : ''}">
      <small>${p.notStarted ? t('circle.startsOn', { date: formatDate(c.start) }) : p.finished ? t('circle.finished') : t('circle.dayOf', { day: num(p.day + 1), days: num(p.days) })}</small>
      <h2>${p.portion ? t('circle.todayPortion', { from: num(p.portion.from), to: num(p.portion.to) }) : p.finished ? t('circle.reviewAll') : t('circle.getReady')}</h2>
      ${mine.doneToday ? `<p>${ICON.check} ${t('circle.doneTodayShort')}</p>` : ''}
      <div class="actions">
        ${p.portion ? `<button class="pill primary" id="startToday">${ICON.play} ${t(mine.doneToday ? 'circle.reviewToday' : 'circle.startToday')}</button>` : ''}
        ${p.day > 0 ? `<button class="pill soft" id="reviewPast">${t('circle.reviewPast')}</button>` : ''}
      </div>
    </div>
    <div class="khatma"><b>${t('circle.myProgress')}</b><span>${num(mine.count)} / ${num(p.total)}</span>
      <div class="khatma-bar"><i style="width:${pct}%"></i></div></div>

    <h3 class="section-title">${t('circle.members')}</h3>
    <div class="list" id="board">${c.code && online() ? '<div class="skeleton"></div>'.repeat(2) : `<div class="empty-state small"><p>${t(online() ? 'circle.localOnly' : 'circle.signInForBoard')}</p>${online() ? '' : `<a class="pill soft" href="#/account">${t('account.login')}</a>`}</div>`}</div>

    <div class="actions circle-actions">
      <button class="pill primary" id="invite">${ICON.share || ''} ${t('circle.invite')}</button>
      <button class="pill" id="brag">${t('circle.shareProgress')}</button>
    </div>
    ${c.code ? `<p class="muted small center">${t('circle.codeIs')} <b class="code" dir="ltr">${esc(c.code)}</b></p>` : ''}
    <button class="link danger-link" id="leave">${t('circle.leave')}</button>`;

  $('#startToday') && ($('#startToday').onclick = () => startHifz(c, p.portion));
  $('#reviewPast') && ($('#reviewPast').onclick = () => startHifz(c, { from: c.from, to: Math.min(c.to, (p.portion?.from ?? c.to + 1) - 1) }));
  $('#invite').onclick = () => share(c);
  $('#brag').onclick = async () => {
    const text = t(mine.doneToday ? 'circle.bragDone' : 'circle.bragProgress', { name: c.name, n: num(mine.count), total: num(p.total) });
    const url = inviteUrl(c);
    if (navigator.share) { try { await navigator.share({ text, url }); return; } catch { /* fall through */ } }
    open('https://wa.me/?text=' + encodeURIComponent(`${text}\n${url}`), '_blank', 'noopener');
  };
  $('#leave').onclick = async () => {
    if (!confirm(t('circle.leaveConfirm'))) return;
    if (c.code && online()) appRequest(`circles/${c.code}/membership`, { method: 'DELETE', token: account.token }).catch(() => {});
    save(load().filter((x) => idOf(x) !== idOf(c)));
    location.hash = '#/circles';
  };

  if (c.code && online()) {
    try {
      // Joined from a link before signing in: join on the server now, then report progress.
      const data = await pushProgress(c).catch(async (err) => {
        if (err.status !== 403) throw err;
        await appRequest(`circles/${c.code}/join?today=${today()}`, { method: 'POST', token: account.token });
        return pushProgress(c);
      });
      const max = Math.max(1, p.total);
      $('#board').innerHTML = data.members.map((m, i) => `
        <div class="row member${m.me ? ' me' : ''}">
          <span class="rank">${num(i + 1)}</span>
          <span class="meta"><b>${esc(m.me ? t('circle.you') : m.name)}${m.owner ? ` <i class="host">${t('circle.host')}</i>` : ''}</b>
            <span class="mini-bar"><i style="width:${Math.round((m.memorised / max) * 100)}%"></i></span></span>
          <span class="member-stats">${m.streak ? `<span title="${t('circle.streak')}">🔥 ${num(m.streak)}</span>` : ''}${m.done_today ? `<span class="ok">${ICON.check}</span>` : ''}<small>${num(m.memorised)}</small></span>
        </div>`).join('');
    } catch (err) {
      $('#board').innerHTML = `<div class="empty-state small"><p>${t(err.status === 403 ? 'circle.notMember' : 'circle.boardError')}</p></div>`;
    }
  }
}
