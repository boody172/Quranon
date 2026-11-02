// Finds a freely licensed (Wikimedia Commons) portrait for each mp3quran reciter via Wikidata.
// Run: node scripts/reciter-photos.mjs  → writes photos.json (id → image URL) and log.tsv (for manual review),
// then copy the reviewed photos.json to data/reciter-photos.json. Photos set in the admin dashboard take priority.
const UA = { 'User-Agent': 'QuranonApp/1.0 (https://quranon.vercel.app; reciter photo lookup)' };
const j = async (u) => { for (let i = 0; i < 3; i++) { try { const r = await fetch(u, { headers: UA }); if (r.ok) return r.json(); } catch {} await new Promise((r) => setTimeout(r, 800)); } return null; };
const ar = (await j('https://mp3quran.net/api/v3/reciters?language=ar')).reciters;
const en = new Map((await j('https://mp3quran.net/api/v3/reciters?language=eng')).reciters.map((r) => [r.id, r.name]));
const RELEVANT = /قار[ئى]|مقر[ئى]|قرآن|القرآن|إمام|امام|خطيب|مؤذن|reciter|qari|quran|qur'an|imam|muezzin|recitation/i;
const entities = async (ids) => ids.length ? (await j(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids.join('|')}&props=claims|descriptions|labels|sitelinks&languages=ar|en&format=json`))?.entities || {} : {};
const OCC = new Set();
// Only images Wikipedia itself marks as freely licensed (pilicense=free), never fair-use uploads.
async function freePageImage(e) {
  for (const site of ['arwiki', 'enwiki']) {
    const title = e.sitelinks?.[site]?.title; if (!title) continue;
    const host = site === 'arwiki' ? 'ar' : 'en';
    const p = await j(`https://${host}.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=name&pilicense=free&titles=${encodeURIComponent(title)}&format=json`);
    const name = Object.values(p?.query?.pages || {})[0]?.pageimage;
    if (name && /\.(jpe?g|png|webp)$/i.test(name)) return name.replace(/_/g, ' ');
  }
  return null;
}
async function commonsCategoryImage(e) {
  const cat = e.claims.P373?.[0]?.mainsnak?.datavalue?.value; if (!cat) return null;
  const p = await j(`https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=${encodeURIComponent('Category:' + cat)}&cmtype=file&cmlimit=10&format=json`);
  const f = (p?.query?.categorymembers || []).map((m) => m.title.replace(/^File:/, '')).find((t) => /\.(jpe?g|png|webp)$/i.test(t));
  return f || null;
} // occupations seen on accepted matches (for the log)
async function candidates(name, lang) {
  const s = await j(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}&language=${lang}&uselang=${lang}&type=item&limit=5&format=json`);
  return (s?.search || []).map((x) => x.id);
}
async function viaWikipedia(name) {
  const s = await j(`https://ar.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name + ' قارئ')}&srlimit=3&format=json`);
  const titles = (s?.query?.search || []).map((x) => x.title);
  if (!titles.length) return [];
  const p = await j(`https://ar.wikipedia.org/w/api.php?action=query&prop=pageprops&titles=${encodeURIComponent(titles.join('|'))}&format=json`);
  return Object.values(p?.query?.pages || {}).map((x) => x.pageprops?.wikibase_item).filter(Boolean);
}
const norm = (s) => String(s || '').replace(/[ًٌٍَُِّْـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/^(الشيخ|القارئ)\s+/, '').replace(/\s+/g, ' ').trim().toLowerCase();
const tokens = (s) => norm(s).split(' ').filter((w) => w.length > 1);
// Given name AND family name must both appear, so "Noreen Mohammed Siddiq" can't match "Mohamed Siddiq El-Minshawi".
function nameMatches(reciterName, labels) {
  const want = tokens(reciterName);
  if (!want.length) return false;
  return labels.some((l) => {
    const have = new Set(tokens(l));
    return have.has(want[0]) && have.has(want[want.length - 1]) && want.filter((w) => have.has(w)).length >= Math.min(2, want.length);
  });
}
const fs = await import('node:fs');
const out = {}, log = [];
let i = 0;
for (const r of ar) {
  i++;
  if (out[r.id]) continue;
  const ids = [...new Set([...(await candidates(r.name, 'ar')), ...(en.get(r.id) ? await candidates(en.get(r.id), 'en') : []), ...(await viaWikipedia(r.name))])];
  const ents = await entities(ids.slice(0, 12));
  let best = null;
  for (const id of ids) {
    const e = ents[id]; if (!e?.claims) continue;
    const human = (e.claims.P31 || []).some((c) => c.mainsnak?.datavalue?.value?.id === 'Q5');
    let img = e.claims.P18?.[0]?.mainsnak?.datavalue?.value;
    if (!human) continue;
    const labels = [e.labels?.ar?.value, e.labels?.en?.value, ...(Object.values(e.sitelinks || {}).filter((s) => /^(ar|en)wiki$/.test(s.site)).map((s) => s.title))].filter(Boolean);
    const desc = `${e.descriptions?.ar?.value || ''} ${e.descriptions?.en?.value || ''} ${labels.join(' ')}`;
    const occ = (e.claims.P106 || []).map((c) => c.mainsnak?.datavalue?.value?.id);
    const reciterOcc = occ.some((o) => ['Q2373398', 'Q1076502', 'Q12149045', 'Q133485', 'Q1259917'].includes(o));
    const nameOk = nameMatches(r.name, labels) || (en.get(r.id) && nameMatches(en.get(r.id), labels));
    if (!(nameOk && (RELEVANT.test(desc) || reciterOcc))) continue;
    if (!img) img = await freePageImage(e) || await commonsCategoryImage(e);
    if (img) { best = { id, img, desc: desc.slice(0, 90), occ }; break; }
  }
  if (best) {
    out[r.id] = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(best.img.replace(/ /g, '_'))}?width=256`;
    best.occ.forEach((o) => OCC.add(o));
    log.push(`${r.id}\t${r.name}\t${best.id}\t${best.img}\t${best.desc}`);
  }
  if (i % 25 === 0) console.error(`${i}/${ar.length} found ${Object.keys(out).length}`);
}
fs.writeFileSync('photos.json', JSON.stringify(out, null, 1)); fs.writeFileSync('log.tsv', log.join('\n'));
console.log('total', ar.length, 'found', Object.keys(out).length);
