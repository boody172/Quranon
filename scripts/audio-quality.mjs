// Reads the MP3 frame header of every mp3quran recording (first surah file): bitrate, sample rate, channels.
// Run: node scripts/audio-quality.mjs → quality.json; the app uses the compact form in data/audio-quality.json ({ moshafId: [kbps, kHz, mono?] }).
const BR = { 1: [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320], 2: [0,8,16,24,32,40,48,56,64,80,96,112,128,144,160] };
const SR = { 3: [44100,48000,32000], 2: [22050,24000,16000], 0: [11025,12000,8000] };
function parse(buf) {
  let i = 0;
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) i = 10 + ((buf[6] & 0x7f) << 21 | (buf[7] & 0x7f) << 14 | (buf[8] & 0x7f) << 7 | (buf[9] & 0x7f));
  for (; i < buf.length - 4; i++) {
    if (buf[i] === 0xff && (buf[i + 1] & 0xe0) === 0xe0) {
      const ver = (buf[i + 1] >> 3) & 3, layer = (buf[i + 1] >> 1) & 3, bri = buf[i + 2] >> 4, sri = (buf[i + 2] >> 2) & 3, ch = buf[i + 3] >> 6;
      if (layer !== 1 || bri === 0 || bri === 15 || sri === 3 || ver === 1) continue;
      const kbps = (ver === 3 ? BR[1] : BR[2])[bri];
      // VBR? look for Xing/Info/VBRI tag in this frame
      const s = buf.slice(i, i + 200).toString('latin1');
      const vbr = /Xing|VBRI/.test(s);
      return { kbps, hz: SR[ver][sri], mono: ch === 3, vbr, needMore: false };
    }
  }
  return { needMore: i >= buf.length - 4 };
}
async function head(url, bytes) {
  const r = await fetch(url, { headers: { Range: `bytes=0-${bytes - 1}` } });
  if (!r.ok && r.status !== 206) throw new Error('HTTP ' + r.status);
  return Buffer.from(await r.arrayBuffer());
}
const { reciters } = await (await fetch('https://mp3quran.net/api/v3/reciters?language=ar')).json();
const rows = [];
const jobs = [];
for (const r of reciters) for (const m of r.moshaf) {
  const first = String(m.surah_list.split(',')[0]).padStart(3, '0');
  jobs.push({ rid: r.id, name: r.name, mid: m.id, mname: m.name, type: m.moshaf_type, server: m.server, url: m.server + first + '.mp3' });
}
let n = 0;
async function worker() {
  while (jobs.length) {
    const j = jobs.shift();
    try {
      let b = await head(j.url, 65536), p = parse(b);
      if (p.needMore) { b = await head(j.url, 600000); p = parse(b); }
      rows.push({ ...j, ...p });
    } catch (e) { rows.push({ ...j, error: e.message }); }
    if (++n % 100 === 0) console.error(n);
  }
}
await Promise.all(Array.from({ length: 12 }, worker));
(await import('node:fs')).writeFileSync('quality.json', JSON.stringify(rows));
const ok = rows.filter((r) => r.kbps);
const dist = {};
for (const r of ok) { const k = `${r.kbps}k ${r.hz / 1000}kHz ${r.mono ? 'mono' : 'stereo'}${r.vbr ? ' vbr' : ''}`; dist[k] = (dist[k] || 0) + 1; }
console.log('recordings', rows.length, 'parsed', ok.length, 'errors', rows.length - ok.length);
console.log(Object.entries(dist).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${v}\t${k}`).join('\n'));
const servers = {}; for (const r of rows) { const h = new URL(r.server).host; servers[h] = (servers[h] || 0) + 1; }
console.log('servers:', JSON.stringify(servers));
