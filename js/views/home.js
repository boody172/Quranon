import { account } from '../account.js';
import { appConfig, verseByIndex } from '../api.js';
import { ART, DEFAULT_FEATURES } from '../art.js';
import { surahName } from '../catalog.js';
import { pick, t } from '../i18n.js';
import { player } from '../player.js';
import { Qibla } from '../qibla.js';
import { $, esc, ICON, store } from '../util.js';

const withTimeout = (promise, ms) => Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(null), ms))]);

function greeting() {
  const name = account.firstName();
  if (name) return t('greet.named', { name });
  const h = new Date().getHours();
  return t(h < 12 ? 'greet.morning' : h < 18 ? 'greet.evening' : 'greet.night');
}

const safeLink = (link) => (/^(#\/|https:\/\/)/.test(link || '') ? link : '#/home');
const safeColor = (c, fallback) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : fallback);

function featureCard(f, i) {
  const style = `--d:${i * 60}ms;--tint:${safeColor(f.tint, '#e2f1ed')};--ink:${safeColor(f.ink, '#0f766e')}`;
  const title = esc(pick(f.title));
  if (f.art === 'qibla') {
    return `<div class="fcard qcard" id="qcard" role="button" tabindex="0" style="${style}">
      <div class="fart">${Qibla.svg()}</div>
      <div class="ftext"><b>${title}</b><span id="qcardHint">${t('qibla.tapToStart')}</span></div>
      <a class="go" href="#/qibla" aria-label="${t('qibla.page')}">${ICON.arrow}</a></div>`;
  }
  const media = /^https:\/\//.test(f.image || '')
    ? `<img src="${esc(f.image)}" alt="" decoding="async" ${i < 2 ? 'fetchpriority="high"' : 'loading="lazy"'}>`
    : ART[f.art] || '';
  const link = safeLink(f.link);
  const external = link.startsWith('https:') ? ' target="_blank" rel="noopener"' : '';
  return `<a class="fcard" href="${esc(link)}"${external} style="${style}">
    <div class="fart${f.image ? ' photo' : ''}">${media}</div>
    <div class="ftext"><b>${title}</b><span>${esc(pick(f.subtitle))}</span></div>
    <span class="go">${ICON.arrow}</span></a>`;
}

function startQiblaCard(onCleanup) {
  const card = $('#qcard');
  if (!card) return;
  let started = false;
  const start = async () => {
    if (started) return;
    started = true;
    store.set('qiblaOn', true);
    const stop = await Qibla.start((st) => {
      $('#qcardHint').textContent = Qibla.hint(st);
      Qibla.render(card, st);
    });
    document.contains(card) ? onCleanup(stop) : stop();
  };
  card.addEventListener('click', (e) => { if (!e.target.closest('.go')) start(); });
  card.addEventListener('keydown', (e) => { if (e.key === 'Enter') start(); });
  if (store.get('qiblaOn') && Qibla.canAutoStart()) start();
}

function showVerseOfTheDay() {
  const day = Math.floor(Date.now() / 864e5);
  const index = ((day * 7919) % 6236) + 1; // same verse all day
  verseByIndex(index)
    .catch(() => ({ text: 'أَلَا بِذِكْرِ ٱللَّهِ تَطْمَئِنُّ ٱلْقُلُوبُ', surah: 13, ayah: 28 }))
    .then(({ text, surah, ayah }) => {
      const box = $('#dailyAyah');
      if (!box) return;
      box.querySelector('.ayah-text').textContent = text;
      box.querySelector('.ayah-ref').innerHTML = `<a href="#/surah/${surah}/${ayah}">${esc(t('home.ayahRef', { surah: surahName(surah), n: ayah }))}</a>`;
    });
}

export default async function home(view, { onCleanup }) {
  const config = await withTimeout(appConfig(), 350);
  const features = config?.features?.length ? config.features : DEFAULT_FEATURES;
  const last = store.get('last');
  const lastItem = last?.queue?.[last.index];

  view.innerHTML = `
    <section class="hello">
      <p>${esc(greeting())}</p>
      <h1>${t('home.title')}</h1>
    </section>
    ${lastItem ? `<button class="row resume" id="resume"><span class="disc">${ICON.play}</span>
      <span class="meta"><b>${esc(lastItem.title)}</b><small>${t('home.resume')} — ${esc(lastItem.sub)}</small></span></button>` : ''}
    <div class="fcards">${features.map(featureCard).join('')}</div>
    <figure class="ayah-card" id="dailyAyah" lang="ar" dir="rtl">
      <figcaption>${t('home.ayahOfDay')}</figcaption>
      <blockquote class="ayah-text">&nbsp;</blockquote>
      <p class="ayah-ref" dir="auto"></p>
    </figure>`;

  $('#resume')?.addEventListener('click', () => player.resume());
  startQiblaCard(onCleanup);
  showVerseOfTheDay();
}
