'use strict';
/* ================== أدوات ================== */
const $ = (s, el = document) => el.querySelector(s);
const API = { mp3: 'https://mp3quran.net/api/v3', text: 'https://api.alquran.cloud/v1' };
const ICON = {
  play: '<svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M7 4h4v16H7zM13 4h4v16h-4z" fill="currentColor"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z"/></svg>',
  heartF: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z" fill="currentColor"/></svg>',
  repeat: '<svg viewBox="0 0 24 24"><path d="M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M12 6c-2-1.5-5-2-8-2v15c3 0 6 .5 8 2 2-1.5 5-2 8-2V4c-3 0-6 .5-8 2zM12 6v15"/></svg>',
  headset: '<svg viewBox="0 0 24 24"><path d="M3 14v-2a9 9 0 0 1 18 0v2"/><rect x="2" y="14" width="5" height="7" rx="2"/><rect x="17" y="14" width="5" height="7" rx="2"/></svg>',
  radio: '<svg viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M7 8l10-5"/><circle cx="8" cy="14" r="2"/><path d="M14 13h4M14 16h4"/></svg>',
  cap: '<svg viewBox="0 0 24 24"><path d="M2 8l10-5 10 5-10 5z"/><path d="M6 10v5c3 3 9 3 12 0v-5"/></svg>',
  compass: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s || '').replace(/[ً-ْٰـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, '');
const arNum = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const pad3 = n => String(n).padStart(3, '0');
const fmt = t => { if (!isFinite(t)) return '0:00'; t = Math.floor(t); const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0'); };
const initials = name => { const w = name.replace(/^(الشيخ|الشيخة|د\.)\s*/, '').split(/\s+/); return (w[0]?.[0] || '') + (w[1]?.[0] || ''); };
const store = {
  get(k, d) { try { const v = localStorage.getItem('qn:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('qn:' + k, JSON.stringify(v)); } catch { /* المساحة ممتلئة أو التخزين غير متاح */ } },
};
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200); }

async function getJSON(url, cacheKey, maxAgeH = 24) {
  if (cacheKey) { const c = store.get('c:' + cacheKey); if (c && Date.now() - c.t < maxAgeH * 36e5) return c.v; }
  const r = await fetch(url);
  if (!r.ok) throw new Error(r.status);
  const v = await r.json();
  if (cacheKey) store.set('c:' + cacheKey, { t: Date.now(), v });
  return v;
}

/* ================== القراء ================== */
let RECITERS = null;
function tagReciter(r) {
  const n = norm(r.name);
  const hit = RECITER_TAGS.find(([k]) => n.includes(k));
  r.country = hit ? hit[1] : 'other';
  r.late = !!(hit && hit[2]);
  r.key = n;
  return r;
}
async function loadReciters() {
  if (RECITERS) return RECITERS;
  const data = await getJSON(API.mp3 + '/reciters?language=ar', 'reciters', 72);
  RECITERS = (data.reciters || []).filter(r => r.moshaf?.length).map(tagReciter).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  return RECITERS;
}
const reciterById = id => RECITERS?.find(r => String(r.id) === String(id));
const countryOf = id => COUNTRIES.find(c => c.id === id) || LESSON_COUNTRIES.find(c => c.id === id);
const surahList = m => (m.surah_list || '').split(',').filter(Boolean).map(Number);
function reciterLabel(r) {
  const c = countryOf(r.country);
  return [c ? c.flag + ' ' + c.name : '', r.late ? 'رحمه الله' : '', r.moshaf.length === 2 ? 'تلاوتان' : r.moshaf.length > 2 ? arNum(r.moshaf.length) + ' تلاوات' : ''].filter(Boolean).join(' · ');
}

const FEATURES = [
  { t: 'استمع', d: 'كل القراء بكل الروايات', href: '#/listen', ic: 'headset', c: '#e9c46a' },
  { t: 'المصحف', d: 'اقرأ بالرسم العثماني', href: '#/mushaf', ic: 'book', c: '#2fbf8f' },
  { t: 'الإذاعات', d: 'بث مباشر ٢٤ ساعة', href: '#/radio', ic: 'radio', c: '#ef8f6c' },
  { t: 'دروس', d: 'علماء من كل دولة', href: '#/lessons', ic: 'cap', c: '#7ea6f6' },
  { t: 'القبلة', d: 'بوصلة دقيقة', href: '#/qibla', ic: 'compass', c: '#b98cf0' },
  { t: 'المفضلة', d: 'قراؤك المفضلون', href: '#/listen/fav', ic: 'heart', c: '#f07ca0' },
  { t: 'سورة الكهف', d: 'سنة يوم الجمعة', href: '#/surah/18', ic: 'star', c: '#e9c46a' },
  { t: 'بحث', d: 'سورة أو قارئ', href: '#/search', ic: 'search', c: '#5fd0d8' },
];

/* ================== المشغل ================== */
const audio = $('#audio');
const P = {
  queue: [], i: 0, repeat: store.get('repeat', 'off'), speeds: [1, 1.25, 1.5, 0.75], speedI: 0, sleepAt: 0, sleepT: null,
  get cur() { return this.queue[this.i]; },
  // item: {title, sub, url, surah?, reciterId?, live?}
  load(queue, i = 0, autoplay = true) {
    this.queue = queue; this.i = i; const it = this.cur; if (!it) return;
    audio.src = it.url; audio.playbackRate = it.live ? 1 : this.speeds[this.speedI];
    if (autoplay) audio.play().catch(() => toast('تعذّر التشغيل — تأكد من الاتصال'));
    this.ui(); this.media();
    if (!it.live) store.set('last', { q: queue, i });
    $('#miniPlayer').hidden = false;
    document.querySelectorAll('[data-play]').forEach(el => el.classList.toggle('playing', el.dataset.play === it.url));
  },
  toggle() { if (!this.cur) return; audio.paused ? audio.play().catch(() => {}) : audio.pause(); },
  next(auto) {
    if (!this.queue.length) return;
    if (auto && this.repeat === 'one') { audio.currentTime = 0; audio.play(); return; }
    if (this.i < this.queue.length - 1) this.load(this.queue, this.i + 1);
    else if (this.repeat === 'all' || !auto) this.load(this.queue, 0);
  },
  prev() { if (audio.currentTime > 5) { audio.currentTime = 0; return; } this.load(this.queue, Math.max(0, this.i - 1)); },
  ui() {
    const it = this.cur; if (!it) return;
    $('#miniTitle').textContent = it.title; $('#miniSub').textContent = it.sub;
    $('#pTitle').textContent = it.title; $('#pSub').textContent = it.sub;
    $('#artSurah').textContent = it.surah ? SURAHS[it.surah - 1].name : (it.live ? 'بث مباشر' : '﴾ ﴿');
    $('#pRead').hidden = !it.surah; $('#pDownload').hidden = !!it.live; $('#pDownload').href = it.url;
    $('#seek').disabled = !!it.live;
    const playing = !audio.paused;
    $('#miniPlay').innerHTML = $('#pPlay').innerHTML = playing ? ICON.pause : ICON.play;
    $('#pRepeat').innerHTML = ICON.repeat + (this.repeat === 'one' ? '<small style="position:absolute;font-size:9px">1</small>' : '');
    $('#pRepeat').classList.toggle('on', this.repeat !== 'off'); $('#pRepeat').style.position = 'relative';
  },
  media() {
    if (!('mediaSession' in navigator)) return; const it = this.cur;
    navigator.mediaSession.metadata = new MediaMetadata({ title: it.title, artist: it.sub, album: 'قرآنون', artwork: [{ src: 'icons/icon.svg', sizes: '512x512', type: 'image/svg+xml' }] });
    const a = { play: () => audio.play(), pause: () => audio.pause(), previoustrack: () => this.prev(), nexttrack: () => this.next() };
    for (const k in a) try { navigator.mediaSession.setActionHandler(k, a[k]); } catch { }
  },
};
function surahItems(r, m) {
  return surahList(m).map(n => ({ title: 'سورة ' + SURAHS[n - 1].name, sub: r.name + (r.moshaf.length > 1 ? ' — ' + m.name : ''), url: m.server + pad3(n) + '.mp3', surah: n, reciterId: r.id, moshafId: m.id }));
}
audio.addEventListener('play', () => P.ui()); audio.addEventListener('pause', () => P.ui());
audio.addEventListener('ended', () => P.next(true));
audio.addEventListener('error', () => { if (audio.src) toast('تعذّر تحميل التلاوة'); });
audio.addEventListener('timeupdate', () => {
  const p = audio.duration ? audio.currentTime / audio.duration : 0;
  $('#miniBar').style.width = (p * 100) + '%';
  if (!seeking) $('#seek').value = p * 1000;
  $('#tCur').textContent = fmt(audio.currentTime); $('#tDur').textContent = P.cur?.live ? 'مباشر' : fmt(audio.duration);
  if (P.cur && !P.cur.live && Math.floor(audio.currentTime) % 5 === 0) store.set('lastPos', audio.currentTime);
});
let seeking = false;
$('#seek').addEventListener('input', e => { seeking = true; if (audio.duration) $('#tCur').textContent = fmt(e.target.value / 1000 * audio.duration); });
$('#seek').addEventListener('change', e => { seeking = false; if (audio.duration) audio.currentTime = e.target.value / 1000 * audio.duration; });
$('#miniPlay').onclick = $('#pPlay').onclick = () => P.toggle();
$('#pNext').onclick = () => P.next(); $('#pPrev').onclick = () => P.prev();
$('#pRepeat').onclick = () => { P.repeat = { off: 'all', all: 'one', one: 'off' }[P.repeat]; store.set('repeat', P.repeat); P.ui(); toast({ off: 'بدون تكرار', all: 'تكرار القائمة', one: 'تكرار السورة' }[P.repeat]); };
$('#pSpeed').onclick = () => { P.speedI = (P.speedI + 1) % P.speeds.length; const s = P.speeds[P.speedI]; if (!P.cur?.live) audio.playbackRate = s; $('#pSpeed').textContent = s + 'x'; };
$('#pSleep').onclick = () => {
  const opts = [0, 15, 30, 60]; const cur = opts.indexOf(P.sleepMin || 0); P.sleepMin = opts[(cur + 1) % opts.length];
  clearTimeout(P.sleepT);
  if (P.sleepMin) { P.sleepT = setTimeout(() => { audio.pause(); toast('تم إيقاف التلاوة — تصبح على خير'); P.sleepMin = 0; $('#pSleep').textContent = '⏾ مؤقت النوم'; }, P.sleepMin * 6e4); $('#pSleep').textContent = '⏾ بعد ' + arNum(P.sleepMin) + ' دقيقة'; toast('سيتوقف بعد ' + arNum(P.sleepMin) + ' دقيقة'); }
  else { $('#pSleep').textContent = '⏾ مؤقت النوم'; toast('تم إلغاء المؤقت'); }
};
$('#pRead').onclick = () => { closeSheet(); location.hash = '#/surah/' + P.cur.surah; };
const sheet = $('#playerSheet');
const openSheet = () => { sheet.classList.add('open'); sheet.setAttribute('aria-hidden', 'false'); };
const closeSheet = () => { sheet.classList.remove('open'); sheet.setAttribute('aria-hidden', 'true'); };
$('#miniOpen').onclick = openSheet; $('#sheetClose').onclick = closeSheet;
sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(); });

/* ================== المفضلة والسجل ================== */
const favs = new Set(store.get('favs', []));
const toggleFav = id => { id = String(id); favs.has(id) ? favs.delete(id) : favs.add(id); store.set('favs', [...favs]); toast(favs.has(id) ? 'أُضيف للمفضلة' : 'أُزيل من المفضلة'); };

/* ================== التوجيه ================== */
const view = $('#view');
const routes = {
  home: viewHome, listen: viewListen, reciter: viewReciter, mushaf: viewMushaf, surah: viewSurah,
  lessons: viewLessons, qibla: viewQibla, radio: viewRadio, search: viewSearch,
};
const TITLES = { home: 'قرآنون', listen: 'القرّاء', mushaf: 'المصحف الشريف', lessons: 'دروس قرآنية', qibla: 'اتجاه القبلة', radio: 'إذاعات القرآن', search: 'بحث' };
const TAB_OF = { reciter: 'listen', surah: 'mushaf', radio: 'listen', search: '' };
let cleanup = null;
async function route() {
  if (location.hash === '#features') { $('#features')?.scrollIntoView({ behavior: 'smooth' }); history.replaceState(null, '', '#/home'); return; }
  const [name = 'home', ...args] = location.hash.replace(/^#\/?/, '').split('/');
  const fn = routes[name] || viewHome;
  if (cleanup) { cleanup(); cleanup = null; }
  const tab = name in TAB_OF ? TAB_OF[name] : name;
  document.querySelectorAll('.tabbar a').forEach(a => a.classList.toggle('on', a.dataset.tab === tab));
  $('#pageTitle').textContent = TITLES[name] || 'قرآنون';
  $('#backBtn').hidden = !(name in TAB_OF);
  view.style.animation = 'none'; view.offsetHeight; view.style.animation = '';
  window.scrollTo(0, 0);
  try { await fn(...args); } catch (e) { console.error(e); view.innerHTML = errorBox(); }
}
const errorBox = () => `<div class="empty"><p>تعذّر الاتصال بالخادم 🌐</p><p class="muted">تأكد من اتصالك بالإنترنت ثم حاول مرة أخرى</p><button class="btn" onclick="route()">إعادة المحاولة</button></div>`;
const skeletons = n => '<div class="list">' + '<div class="skeleton"></div>'.repeat(n) + '</div>';
$('#backBtn').onclick = () => history.length > 1 ? history.back() : (location.hash = '#/home');
$('#searchBtn').onclick = () => location.hash = '#/search';
addEventListener('hashchange', route);

/* ================== الرئيسية ================== */
function greeting() { const h = new Date().getHours(); return h < 12 ? 'صباح الخير' : h < 18 ? 'مساء النور' : 'مساء الخير'; }
async function viewHome() {
  const last = store.get('last'); const lastRead = store.get('lastRead');
  const lastItem = last?.q?.[last.i];
  view.innerHTML = `
    <section class="brand-hero">
      <p class="eyebrow">القرآن كله · في مكان واحد</p>
      <h1>${greeting()}،<br><span class="grad">اسمع ما يطمئن قلبك</span></h1>
      <div class="cta"><a class="pill primary" href="#/listen">ابدأ الاستماع <svg viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></svg></a><a class="pill" href="#features">كل المميزات</a></div>
    </section>
    ${lastItem || lastRead ? `<div class="list" style="margin-bottom:6px">
      ${lastItem ? `<button class="row" id="resume"><div class="disc">${ICON.headset}</div><div class="meta"><b>${esc(lastItem.title)}</b><small>تابع الاستماع · ${esc(lastItem.sub)}</small></div>${ICON.play}</button>` : ''}
      ${lastRead ? `<a class="row" href="#/surah/${lastRead.s}/${lastRead.a || 1}"><div class="disc">${ICON.book}</div><div class="meta"><b>سورة ${SURAHS[lastRead.s - 1].name}</b><small>تابع القراءة · الآية ${arNum(lastRead.a || 1)}</small></div></a>` : ''}
    </div>` : ''}
    <div class="fcards" id="features">${MAIN_FEATURES.map((f, i) => `<a class="fcard" href="${f.href}" style="--d:${i * 70}ms"><div class="fart">${ART[f.art]}</div><div class="ftext"><b>${f.t}</b><span>${f.d}</span></div><span class="go"><svg viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></svg></span></a>`).join('')}</div>
    <div class="minis">${MINI_FEATURES.map(f => `<a class="mini" href="${f.href}"><span>${ICON[f.ic]}</span>${f.t}</a>`).join('')}</div>
    <div class="hero" id="dailyAyah" style="margin-top:22px"><small class="tag gold">آية اليوم</small><div class="ayah-text">…</div><small class="muted"></small></div>
    <div class="section"><h2>أعلام التلاوة</h2><a href="#/listen">الكل</a></div>
    <div class="hscroll" id="featured">${'<div class="rcard"><div class="skeleton" style="height:150px"></div></div>'.repeat(4)}</div>
    <div class="section"><h2>سور مختارة</h2><a href="#/mushaf">المصحف</a></div>
    <div class="chips">${[1, 36, 55, 56, 67, 112, 113, 114].map(n => `<a class="chip" href="#/surah/${n}">${SURAHS[n - 1].name}</a>`).join('')}</div>`;
  if (lastItem) $('#resume').onclick = () => { P.load(last.q, last.i); const pos = store.get('lastPos', 0); audio.addEventListener('loadedmetadata', () => { if (pos < audio.duration - 3) audio.currentTime = pos; }, { once: true }); };
  // آية اليوم: ثابتة طوال اليوم
  const day = Math.floor(Date.now() / 864e5), n = (day * 7919) % 6236 + 1;
  getJSON(`${API.text}/ayah/${n}/quran-uthmani`, 'ayah' + day, 24).then(d => {
    const a = d.data; $('#dailyAyah .ayah-text').textContent = a.text;
    $('#dailyAyah small.muted').innerHTML = `<a href="#/surah/${a.surah.number}/${a.numberInSurah}">سورة ${SURAHS[a.surah.number - 1].name} · ${arNum(a.numberInSurah)}</a>`;
  }).catch(() => { $('#dailyAyah .ayah-text').textContent = 'أَلَا بِذِكْرِ ٱللَّهِ تَطْمَئِنُّ ٱلْقُلُوبُ'; $('#dailyAyah small.muted').textContent = 'سورة الرعد · ٢٨'; });
  loadReciters().then(list => {
    const feat = FEATURED_KEYS.map(k => list.find(r => r.key.includes(k))).filter(Boolean);
    $('#featured') && ($('#featured').innerHTML = feat.map(rcard).join(''));
  }).catch(() => { $('#featured') && ($('#featured').innerHTML = '<p class="muted">تعذّر تحميل القراء</p>'); });
}
const rcard = r => `<a class="rcard" href="#/reciter/${r.id}"><div class="card"><div class="avatar">${esc(initials(r.name))}</div><b>${esc(r.name)}</b><small class="muted">${r.late ? 'رحمه الله' : (countryOf(r.country)?.name || '')}</small></div></a>`;
const rrow = r => `<a class="row" href="#/reciter/${r.id}"><div class="avatar">${esc(initials(r.name))}</div><div class="meta"><b>${esc(r.name)}</b><small>${esc(reciterLabel(r) || arNum(r.moshaf.length) + ' مصحف')}</small></div>${favs.has(String(r.id)) ? '<span class="tag gold">♥</span>' : ''}</a>`;

/* ================== استمع ================== */
let listenFilter = 'all', listenQuery = '';
async function viewListen(f) {
  if (f) listenFilter = f;
  view.innerHTML = `
    <div class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="q" placeholder="ابحث عن قارئ… (مثال: المنشاوي)" value="${esc(listenQuery)}"></div>
    <div class="chips" id="filters">
      ${[['all', 'الكل'], ['fav', '♥ المفضلة'], ['late', 'رحمهم الله'], ...COUNTRIES.map(c => [c.id, c.flag + ' ' + c.name]), ['other', '🌍 دول أخرى']]
      .map(([id, l]) => `<button class="chip ${listenFilter === id ? 'on' : ''}" data-f="${id}">${l}</button>`).join('')}
    </div>
    <a class="row" href="#/radio" style="margin-bottom:12px"><div class="disc">${ICON.radio}</div><div class="meta"><b>إذاعات القرآن المباشرة</b><small>بث مباشر ٢٤ ساعة لكبار القراء</small></div></a>
    <div id="count" class="muted" style="font-size:13px;margin-bottom:8px"></div>
    <div class="list" id="rlist">${'<div class="skeleton"></div>'.repeat(8)}</div>`;
  const list = await loadReciters();
  const draw = () => {
    const q = norm(listenQuery);
    const res = list.filter(r => (!q || r.key.includes(q)) && (listenFilter === 'all' || (listenFilter === 'fav' ? favs.has(String(r.id)) : listenFilter === 'late' ? r.late : r.country === listenFilter)));
    $('#count').textContent = arNum(res.length) + ' قارئ';
    $('#rlist').innerHTML = res.length ? res.slice(0, 400).map(rrow).join('') : `<div class="empty">${listenFilter === 'fav' ? 'لم تضف قراء للمفضلة بعد' : 'لا توجد نتائج'}</div>`;
  };
  draw();
  $('#q').oninput = e => { listenQuery = e.target.value; draw(); };
  $('#filters').onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; listenFilter = b.dataset.f; $('#filters .on')?.classList.remove('on'); b.classList.add('on'); draw(); };
}

async function viewReciter(id) {
  view.innerHTML = skeletons(10);
  await loadReciters(); const r = reciterById(id);
  if (!r) { view.innerHTML = '<div class="empty">القارئ غير موجود</div>'; return; }
  $('#pageTitle').textContent = r.name;
  let mi = 0;
  const draw = () => {
    const m = r.moshaf[mi]; const items = surahItems(r, m); const fav = favs.has(String(r.id));
    view.innerHTML = `
      <div class="profile"><div class="avatar">${esc(initials(r.name))}</div><div><h1 style="margin:0">${esc(r.name)}</h1><small class="muted">${esc(reciterLabel(r))}</small></div></div>
      <div class="actions">
        <button class="btn" id="playAll">${ICON.play} تشغيل الكل</button>
        <button class="btn ghost" id="shuffle">عشوائي</button>
        <button class="btn ghost" id="fav" aria-label="المفضلة">${fav ? ICON.heartF : ICON.heart}</button>
      </div>
      ${r.moshaf.length > 1 ? `<select class="chip" id="moshaf" style="width:100%;margin-bottom:12px">${r.moshaf.map((x, i) => `<option value="${i}" ${i === mi ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>` : `<p class="muted" style="margin-top:0">${esc(m.name)}</p>`}
      <div class="search"><input id="sq" placeholder="ابحث عن سورة…"></div>
      <div class="list" id="slist">${items.map((it, i) => `<button class="row ${P.cur?.url === it.url ? 'playing' : ''}" data-i="${i}" data-play="${esc(it.url)}" data-k="${norm(SURAHS[it.surah - 1].name)}">
        <span class="num">${arNum(it.surah)}</span><div class="meta"><b>${SURAHS[it.surah - 1].name}</b><small>${SURAHS[it.surah - 1].type} · ${arNum(SURAHS[it.surah - 1].ayahs)} آية</small></div>${ICON.play}</button>`).join('')}</div>`;
    $('#playAll').onclick = () => P.load(items, 0);
    $('#shuffle').onclick = () => P.load([...items].sort(() => Math.random() - .5), 0);
    $('#fav').onclick = () => { toggleFav(r.id); draw(); };
    $('#slist').onclick = e => { const b = e.target.closest('[data-i]'); if (b) P.load(items, +b.dataset.i); };
    $('#sq').oninput = e => { const q = norm(e.target.value); view.querySelectorAll('#slist .row').forEach(el => el.hidden = q && !el.dataset.k.includes(q)); };
    if ($('#moshaf')) $('#moshaf').onchange = e => { mi = +e.target.value; draw(); };
  };
  draw();
}

/* ================== الإذاعات ================== */
async function viewRadio() {
  view.innerHTML = `<div class="search"><input id="rq" placeholder="ابحث في الإذاعات…"></div><div class="list" id="radios">${'<div class="skeleton"></div>'.repeat(8)}</div>`;
  const d = await getJSON(API.mp3 + '/radios?language=ar', 'radios', 72);
  const radios = (d.radios || []).map(x => ({ ...x, k: norm(x.name) }));
  const items = radios.map(x => ({ title: x.name, sub: 'بث مباشر', url: x.url, live: true }));
  $('#radios').innerHTML = radios.map((x, i) => `<button class="row" data-i="${i}" data-play="${esc(x.url)}" data-k="${x.k}"><div class="disc">${ICON.radio}</div><div class="meta"><b>${esc(x.name)}</b><small>بث مباشر</small></div><span class="tag">LIVE</span></button>`).join('');
  $('#radios').onclick = e => { const b = e.target.closest('[data-i]'); if (b) P.load(items, +b.dataset.i); };
  $('#rq').oninput = e => { const q = norm(e.target.value); view.querySelectorAll('#radios .row').forEach(el => el.hidden = q && !el.dataset.k.includes(q)); };
}

/* ================== المصحف ================== */
async function viewMushaf() {
  const lastRead = store.get('lastRead');
  view.innerHTML = `
    ${lastRead ? `<a class="hero" style="display:block;margin-bottom:14px" href="#/surah/${lastRead.s}/${lastRead.a || 1}"><small class="tag gold">آخر قراءة</small><h2 style="margin-top:8px">سورة ${SURAHS[lastRead.s - 1].name}</h2><small class="muted">الآية ${arNum(lastRead.a || 1)} · اضغط للمتابعة</small></a>` : ''}
    <div class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="mq" placeholder="ابحث باسم السورة أو رقمها…"></div>
    <div class="list" id="mlist">${SURAHS.map(s => `<a class="row" href="#/surah/${s.n}" data-k="${norm(s.name)} ${s.n}"><span class="num">${arNum(s.n)}</span><div class="meta"><b>سورة ${s.name}</b><small>${s.type} · ${arNum(s.ayahs)} آية</small></div></a>`).join('')}</div>`;
  $('#mq').oninput = e => { const q = norm(e.target.value); view.querySelectorAll('#mlist .row').forEach(el => el.hidden = q && !el.dataset.k.includes(q)); };
}
async function viewSurah(n, ayah) {
  n = Math.min(114, Math.max(1, +n || 1)); const s = SURAHS[n - 1];
  $('#pageTitle').textContent = 'سورة ' + s.name;
  view.innerHTML = skeletons(6);
  const d = await getJSON(`${API.text}/surah/${n}/quran-uthmani`, 'surah' + n, 24 * 365);
  const ayahs = d.data.ayahs;
  const BASM = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
  const size = store.get('qsize', 26);
  view.innerHTML = `
    <div class="reader-tools">
      <button class="chip" id="fzMinus">أ−</button><button class="chip" id="fzPlus">أ+</button>
      <button class="chip" id="listenS">🎧 استمع للسورة</button>
      ${n > 1 ? `<a class="chip" href="#/surah/${n - 1}">→ السابقة</a>` : ''}${n < 114 ? `<a class="chip" href="#/surah/${n + 1}">التالية ←</a>` : ''}
    </div>
    <div class="mushaf-head"><h1>سورة ${s.name}</h1><small class="muted">${s.type} · ${arNum(s.ayahs)} آية</small></div>
    ${n !== 1 && n !== 9 ? `<div class="basmala">${BASM}</div>` : ''}
    <div class="mushaf-text" id="mtext" style="--qsize:${size}px">${ayahs.map(a => {
      let t = a.text; if (a.numberInSurah === 1 && n !== 1 && n !== 9 && t.startsWith('بِسْمِ')) t = t.replace(/^\S+\s+\S+\s+\S+\s+\S+\s*/, ''); // إزالة البسملة المدمجة في النص
      return `<span class="a" id="a${a.numberInSurah}" data-a="${a.numberInSurah}">${esc(t)} <span class="m">﴿${arNum(a.numberInSurah)}﴾</span></span> `;
    }).join('')}</div>
    <div class="actions" style="justify-content:center;margin-top:20px">${n < 114 ? `<a class="btn" href="#/surah/${n + 1}">السورة التالية: ${SURAHS[n].name}</a>` : ''}</div>`;
  const setSize = v => { v = Math.min(44, Math.max(18, v)); store.set('qsize', v); $('#mtext').style.setProperty('--qsize', v + 'px'); };
  $('#fzMinus').onclick = () => setSize(store.get('qsize', 26) - 2); $('#fzPlus').onclick = () => setSize(store.get('qsize', 26) + 2);
  $('#mtext').onclick = e => { const a = e.target.closest('.a'); if (!a) return; view.querySelectorAll('.a.sel').forEach(x => x.classList.remove('sel')); a.classList.add('sel'); store.set('lastRead', { s: n, a: +a.dataset.a }); toast('تم حفظ موضع القراءة: الآية ' + arNum(a.dataset.a)); };
  $('#listenS').onclick = async () => {
    await loadReciters(); const pref = store.get('prefReciter');
    const r = reciterById(pref) || RECITERS.find(x => x.key.includes('المنشاوي')) || RECITERS[0];
    const m = r.moshaf.find(m => surahList(m).includes(n)) || r.moshaf[0];
    const items = surahItems(r, m); P.load(items, Math.max(0, items.findIndex(x => x.surah === n)));
  };
  if (!store.get('lastRead') || store.get('lastRead').s !== n) store.set('lastRead', { s: n, a: +ayah || 1 });
  if (ayah) { const el = $('#a' + ayah); if (el) { el.classList.add('sel'); setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 100); } }
}

/* ================== الدروس ================== */
let lessonCountry = 'all';
async function viewLessons() {
  const yt = q => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);
  const draw = () => {
    const list = SCHOLARS.filter(s => lessonCountry === 'all' || s.country === lessonCountry);
    $('#scholars').innerHTML = list.map(s => { const c = countryOf(s.country); return `<a class="row" target="_blank" rel="noopener" href="${yt(s.name + ' ' + s.topic)}"><div class="avatar">${esc(initials(s.name))}</div><div class="meta"><b>${esc(s.name)}</b><small>${c.flag} ${c.name} · ${esc(s.topic)}${s.d ? ' · رحمه الله' : ''}</small></div><span class="tag">يوتيوب ↗</span></a>`; }).join('');
  };
  view.innerHTML = `
    <div class="hero"><small class="tag gold">تعلّم وتدبّر</small><h2 style="margin:10px 0 4px">دروس وتفسير من علماء العالم الإسلامي</h2><small class="muted">اختر الدولة ثم العالم، أو استمع للتفسير الصوتي سورة بسورة</small></div>
    <div class="section"><h2>العلماء حسب الدولة</h2></div>
    <div class="chips" id="lc">${[['all', 'الكل'], ...LESSON_COUNTRIES.map(c => [c.id, c.flag + ' ' + c.name])].map(([id, l]) => `<button class="chip ${lessonCountry === id ? 'on' : ''}" data-c="${id}">${l}</button>`).join('')}</div>
    <div class="list" id="scholars"></div>
    <div class="section"><h2>التفسير الصوتي</h2></div>
    <div class="list" id="tafsir">${'<div class="skeleton"></div>'.repeat(4)}</div>`;
  draw();
  $('#lc').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; lessonCountry = b.dataset.c; $('#lc .on')?.classList.remove('on'); b.classList.add('on'); draw(); };
  try {
    const d = await getJSON(API.mp3 + '/tafsir?language=ar', 'tafsir', 72);
    const t = d.tafasir; const soar = (t?.soar || []);
    if (!soar.length) throw 0;
    const items = soar.map(x => ({ title: x.name, sub: t.name || 'تفسير', url: x.url, surah: x.sura_id }));
    $('#tafsir').innerHTML = `<p class="muted" style="margin:0 0 4px">${esc(t.name || '')}</p>` + soar.slice(0, 200).map((x, i) => `<button class="row" data-i="${i}" data-play="${esc(x.url)}"><span class="num">${arNum(x.sura_id || i + 1)}</span><div class="meta"><b>${esc(x.name)}</b></div>${ICON.play}</button>`).join('');
    $('#tafsir').onclick = e => { const b = e.target.closest('[data-i]'); if (b) P.load(items, +b.dataset.i); };
  } catch { $('#tafsir').innerHTML = '<p class="muted">التفسير الصوتي غير متاح حالياً</p>'; }
}

/* ================== القبلة ================== */
function qiblaBearing(lat, lng) {
  const r = Math.PI / 180, φ1 = lat * r, φ2 = KAABA.lat * r, Δλ = (KAABA.lng - lng) * r;
  const y = Math.sin(Δλ), x = Math.cos(φ1) * Math.tan(φ2) - Math.sin(φ1) * Math.cos(Δλ);
  return (Math.atan2(y, x) / r + 360) % 360;
}
function distanceKm(lat, lng) {
  const r = Math.PI / 180, dφ = (KAABA.lat - lat) * r, dλ = (KAABA.lng - lng) * r;
  const a = Math.sin(dφ / 2) ** 2 + Math.cos(lat * r) * Math.cos(KAABA.lat * r) * Math.sin(dλ / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
async function viewQibla() {
  const R = 'min(36vw,144px)';
  view.innerHTML = `
    <p class="muted" style="text-align:center;margin:4px 0 0" id="qhint">ضع الهاتف بشكل مسطّح ثم اضغط «ابدأ»</p>
    <div class="compass-wrap"><div class="compass" id="compass"><div class="fixed-mark"></div>
      <div class="dial" id="dial"><div class="tick"></div>
        ${[['ش', 0, 'n'], ['شر', 90], ['ج', 180], ['غ', 270]].map(([l, d, c]) => `<span class="${c || ''}" style="transform:translate(-50%,-50%) rotate(${d}deg) translateY(calc(-1 * ${R})) rotate(${-d}deg)">${l}</span>`).join('')}
        <div class="needle" id="needle"><i></i><div class="kaaba">🕋</div></div>
      </div><div class="center-dot"></div></div></div>
    <div class="card stats"><div><b id="qDeg">—</b><small>زاوية القبلة</small></div><div><b id="qHead">—</b><small>اتجاه الهاتف</small></div><div><b id="qDist">—</b><small>كم إلى مكة</small></div></div>
    <div class="actions" style="justify-content:center;margin-top:16px"><button class="btn" id="qStart">${ICON.compass} ابدأ تحديد القبلة</button></div>
    <p class="muted" style="font-size:13px;text-align:center">إذا كانت البوصلة غير دقيقة، حرّك الهاتف على شكل رقم 8 لمعايرتها، وابتعد عن المعادن والمغناطيس.</p>`;
  let bearing = null, onOri = null, wasAligned = false;
  const update = heading => {
    $('#dial').style.transform = `rotate(${-heading}deg)`;
    $('#qHead').textContent = arNum(Math.round(heading)) + '°';
    if (bearing == null) return;
    const diff = Math.abs(((bearing - heading + 540) % 360) - 180);
    const ok = diff < 5; $('#compass').classList.toggle('aligned', ok);
    $('#qhint').textContent = ok ? '✅ أنت متجه نحو القبلة' : 'حرّك الهاتف حتى تصل الكعبة لأعلى الدائرة';
    if (ok && !wasAligned && navigator.vibrate) navigator.vibrate(80); wasAligned = ok;
  };
  const start = async () => {
    $('#qhint').textContent = 'جارٍ تحديد موقعك…';
    try {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 15000 }));
      const { latitude: la, longitude: lo } = pos.coords;
      bearing = qiblaBearing(la, lo); store.set('loc', { la, lo });
    } catch {
      const l = store.get('loc'); if (!l) { $('#qhint').textContent = 'يلزم السماح بالوصول للموقع لتحديد القبلة'; return; }
      bearing = qiblaBearing(l.la, l.lo); toast('تم استخدام آخر موقع معروف');
    }
    const l = store.get('loc');
    $('#needle').style.transform = `rotate(${bearing}deg)`;
    $('#qDeg').textContent = arNum(Math.round(bearing)) + '°';
    $('#qDist').textContent = arNum(Math.round(distanceKm(l.la, l.lo)).toLocaleString('en'));
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      let ok = false; try { ok = await DeviceOrientationEvent.requestPermission() === 'granted'; } catch { }
      if (!ok) toast('اسمح بمستشعر الحركة لتعمل البوصلة');
    }
    let got = false;
    onOri = e => {
      let h = null;
      if (typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading;
      else if (e.absolute && e.alpha != null) h = (360 - e.alpha) % 360;
      else if (e.type === 'deviceorientationabsolute' && e.alpha != null) h = (360 - e.alpha) % 360;
      if (h == null) return; got = true;
      const so = (screen.orientation?.angle || 0); update((h + so) % 360);
    };
    addEventListener('deviceorientationabsolute', onOri); addEventListener('deviceorientation', onOri);
    $('#qStart').hidden = true;
    setTimeout(() => { if (!got) { update(0); $('#qhint').textContent = `جهازك لا يدعم البوصلة — القبلة بزاوية ${arNum(Math.round(bearing))}° من الشمال`; } }, 2500);
  };
  $('#qStart').onclick = start;
  cleanup = () => { if (onOri) { removeEventListener('deviceorientationabsolute', onOri); removeEventListener('deviceorientation', onOri); } };
}

/* ================== بحث شامل ================== */
async function viewSearch() {
  view.innerHTML = `<div class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="gq" placeholder="ابحث عن سورة أو قارئ…" autofocus></div><div id="gres"></div>`;
  const list = await loadReciters().catch(() => []);
  $('#gq').focus();
  $('#gq').oninput = e => {
    const q = norm(e.target.value); if (!q) { $('#gres').innerHTML = ''; return; }
    const ss = SURAHS.filter(s => norm(s.name).includes(q) || String(s.n) === q).slice(0, 8);
    const rs = list.filter(r => r.key.includes(q)).slice(0, 15);
    $('#gres').innerHTML = (ss.length ? `<div class="section"><h3>السور</h3></div><div class="list">${ss.map(s => `<a class="row" href="#/surah/${s.n}"><span class="num">${arNum(s.n)}</span><div class="meta"><b>سورة ${s.name}</b><small>${s.type} · ${arNum(s.ayahs)} آية</small></div></a>`).join('')}</div>` : '')
      + (rs.length ? `<div class="section"><h3>القرّاء</h3></div><div class="list">${rs.map(rrow).join('')}</div>` : '')
      || '<div class="empty">لا توجد نتائج</div>';
  };
}

/* ================== تشغيل ================== */
(() => { const last = store.get('last'); if (last?.q?.[last.i]) { P.queue = last.q; P.i = last.i; audio.src = P.cur.url; P.ui(); $('#miniPlayer').hidden = false; } })();
document.addEventListener('click', e => { const a = e.target.closest('a[href^="#/reciter/"]'); if (a) store.set('prefReciter', a.getAttribute('href').split('/')[2]); });
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
route();
