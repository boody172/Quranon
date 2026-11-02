// CarPlay (iOS app only): sends the car a browsable library and plays whatever the driver picks.
// The car screen is drawn natively (ios/App/App/CarPlay*.swift); playback stays in the normal player,
// so "Now Playing", the sleep timer and the khatma progress all keep working.
import { loadRadios, loadReciters, featuredReciters, findReciter, mixedShuffle, randomKhatma } from './catalog.js';
import { t } from './i18n.js';
import { player } from './player.js';
import { saved } from './account.js';

const native = window.Capacitor?.isNativePlatform?.() && window.Capacitor.getPlatform?.() === 'ios';
const plugin = native ? window.Capacitor.registerPlugin?.('CarPlay') : null;

let radios = [];

async function library() {
  const reciters = await loadReciters();
  radios = await loadRadios().catch(() => []);
  const reciterItem = (r) => ({ id: 'k:' + r.id, title: r.name, detail: t('carplay.khatma') });
  const savedReciters = saved.ofType('reciter').map((s) => findReciter(reciters, s.ref)).filter(Boolean);
  const savedRadios = saved.ofType('radio').map((s) => radios.find((r) => String(r.id) === s.ref)).filter(Boolean);
  return [
    {
      id: 'listen', title: t('page.listen'), icon: 'play.circle',
      items: [
        { id: 'mix', title: t('shuffle.title'), detail: t('shuffle.subtitle') },
        ...featuredReciters(reciters).slice(0, 30).map(reciterItem),
      ],
    },
    {
      id: 'saved', title: t('page.saved'), icon: 'heart',
      items: [
        ...(savedReciters.length > 1 ? [{ id: 'mixSaved', title: t('shuffle.fromSaved'), detail: '' }] : []),
        ...savedReciters.map(reciterItem),
        ...savedRadios.map((r) => ({ id: 'r:' + r.id, title: r.name, detail: t('player.live') })),
      ],
      empty: t('carplay.noSaved'),
    },
    {
      id: 'radio', title: t('page.radio'), icon: 'dot.radiowaves.left.and.right',
      items: radios.slice(0, 100).map((r) => ({ id: 'r:' + r.id, title: r.name, detail: t('player.live') })),
    },
  ];
}

async function select(id) {
  const reciters = await loadReciters();
  if (id === 'mix' || id === 'mixSaved') {
    const pool = id === 'mixSaved' ? reciters.filter((r) => saved.has('reciter', r.id)) : null;
    const { queue, refill } = mixedShuffle(reciters, { pool });
    return player.play(queue, 0, { refill });
  }
  const [kind, ref] = [id.slice(0, 1), id.slice(2)];
  if (kind === 'k') {
    const r = findReciter(reciters, ref);
    if (!r?.moshaf.length) return;
    const { queue, refill } = randomKhatma(r, r.moshaf[0]);
    return player.play(queue, 0, { refill });
  }
  if (kind === 'r') {
    const i = radios.findIndex((r) => String(r.id) === ref);
    if (i < 0) return;
    const queue = radios.map((r) => ({ title: r.name, sub: t('player.live'), url: r.url, live: true, fav: { type: 'radio', ref: String(r.id), title: r.name, subtitle: t('player.live') } }));
    return player.play(queue, i);
  }
}

export async function refreshCarPlay() {
  if (!plugin) return;
  try { await plugin.setLibrary({ sections: await library() }); } catch { /* car not supported */ }
}

export async function initCarPlay() {
  if (!plugin) return;
  await plugin.addListener('select', ({ id }) => select(id));
  const { pending } = await plugin.ready().catch(() => ({}));
  if (pending) select(pending); // the driver picked something before the app finished loading
  refreshCarPlay();
  document.addEventListener('visibilitychange', () => { if (document.hidden) refreshCarPlay(); });
}
