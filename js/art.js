// Line illustrations for the home cards. Keys are referenced by the admin dashboard.
export const ART = {
  listen: `<svg viewBox="0 0 200 140"><path d="M50 92V74a50 50 0 0 1 100 0v18"/><rect x="38" y="88" width="26" height="40" rx="10"/><rect x="136" y="88" width="26" height="40" rx="10"/>
    <g class="eq"><path d="M84 112v-14"/><path d="M94 112v-26"/><path d="M104 112v-36"/><path d="M114 112v-22"/><path d="M124 112v-12"/></g></svg>`,
  mushaf: `<svg viewBox="0 0 200 140"><path d="M100 44c-14-10-34-12-56-12v74c22 0 42 2 56 12 14-10 34-12 56-12V32c-22 0-42 2-56 12zM100 44v74"/>
    <path d="M56 50h30M56 62h30M56 74h30M56 86h24M114 50h30M114 62h30M114 74h30M120 86h24" opacity=".55"/><path d="M60 118l40 14 40-14M70 124l-10 12M130 124l10 12"/></svg>`,
  radio: `<svg viewBox="0 0 200 140"><path d="M100 70l-22 64M100 70l22 64M86 110h28"/><circle cx="100" cy="64" r="7"/>
    <path class="w1" d="M80 44a28 28 0 0 0 0 40M120 44a28 28 0 0 1 0 40"/><path class="w2" d="M64 30a50 50 0 0 0 0 68M136 30a50 50 0 0 1 0 68"/><path class="w3" d="M48 16a72 72 0 0 0 0 96M152 16a72 72 0 0 1 0 96"/></svg>`,
  lessons: `<svg viewBox="0 0 200 140"><path d="M70 132V84a30 30 0 0 1 60 0v48"/><path d="M100 54c0-8 6-14 6-20-4 3-6 3-6 0 0 3-2 3-6 0 0 6 6 12 6 20z"/>
    <path d="M44 132V60l6-12 6 12v72M144 132V60l6-12 6 12v72"/><path d="M30 132h140M88 132v-22a12 12 0 0 1 24 0v22"/><path d="M40 70h20M140 70h20" opacity=".55"/></svg>`,
  qibla: `<svg viewBox="0 0 200 140"><circle cx="100" cy="72" r="60" opacity=".35"/><circle cx="100" cy="72" r="44" stroke-dasharray="3 7"/>
    <path d="M82 66l18-8 18 8v24l-18 8-18-8z"/><path d="M82 66l18 8 18-8M100 74v24"/><path d="M84 76l16 7 16-7" opacity=".7"/><path class="arrow" d="M100 4v18M92 14l8-10 8 10"/></svg>`,
};
ART.fav = `<svg viewBox="0 0 200 140"><path d="M100 128S38 92 30 56a34 34 0 0 1 70-16 34 34 0 0 1 70 16c-8 36-70 72-70 72z"/>
  <path d="M100 108S60 84 54 62a20 20 0 0 1 46-12 20 20 0 0 1 46 12c-6 22-46 46-46 46z" opacity=".45"/><path class="w1" d="M160 18v14M153 25h14M38 104v10M33 109h10"/></svg>`;
ART.kahf = `<svg viewBox="0 0 200 140"><path d="M20 132c10-60 40-104 80-104s70 44 80 104"/><path d="M62 132c4-34 18-58 38-58s34 24 38 58" opacity=".7"/>
  <path d="M10 132h180"/><path d="M146 22a14 14 0 1 0 12 20 11 11 0 1 1-12-20z"/><path class="w1" d="M54 30l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/><path class="w2" d="M128 54l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z"/></svg>`;
ART.hifz = `<svg viewBox="0 0 200 140"><path d="M100 48c-14-10-34-12-56-12v74c22 0 42 2 56 12 14-10 34-12 56-12V36c-22 0-42 2-56 12zM100 48v74"/>
  <path d="M58 56h28M58 68h28M58 80h20" opacity=".5"/><path class="w1" d="M118 60l8 8 16-18"/><path class="w2" d="M118 86l8 8 16-18"/><path d="M100 22v-8M86 26l-4-6M114 26l4-6" opacity=".6"/></svg>`;
ART.search = `<svg viewBox="0 0 200 140"><path d="M26 30h70M26 46h56M26 62h64M26 78h40M26 94h52" opacity=".45"/><circle cx="122" cy="62" r="38"/><path d="M150 90l32 32"/>
  <path class="w1" d="M106 50a20 20 0 0 1 22-6"/></svg>`;
// Used when the backend is not reachable. Mirrors database/seeders/FeatureSeeder.php.
const f = (slug, ar, en, link, art, tint, ink) => ({ slug, title: { ar: ar[0], en: en[0] }, subtitle: { ar: ar[1], en: en[1] }, link, art, tint, ink });
export const DEFAULT_FEATURES = [
  f('qibla', ['القبلة', 'حرّك الهاتف حتى يثبت السهم'], ['Qibla', 'Turn your phone until it locks'], '#/qibla', 'qibla', '#ddf3ee', '#0f766e'),
  f('listen', ['استمع', 'أكثر من مئتي قارئ'], ['Listen', 'Over 200 reciters'], '#/listen', 'listen', '#e3edfb', '#2557b8'),
  f('mushaf', ['المصحف', 'اقرأ بالرسم العثماني'], ['Mushaf', 'Read in the Uthmani script'], '#/mushaf', 'mushaf', '#f6ecd6', '#8c6118'),
  f('radio', ['الإذاعات', 'بث مباشر طوال اليوم'], ['Radio', 'Live, all day long'], '#/radio', 'radio', '#fbe6dc', '#b4501f'),
  f('lessons', ['دروس', 'تفسير وتدبّر من علماء موثوقين'], ['Lessons', 'Tafsir from trusted scholars'], '#/lessons', 'lessons', '#ebe6f8', '#5b45b0'),
  f('hifz', ['حفظ القرآن', 'احفظ آية آية وسمّع لنفسك'], ['Memorise', 'Learn verse by verse, then recite'], '#/hifz', 'hifz', '#e6f3e4', '#2f6b2a'),
  f('saved', ['محفوظاتي', 'كل ما حفظته في مكان واحد'], ['Saved', 'Everything you saved, in one place'], '#/saved', 'fav', '#f9e3ea', '#b23a63'),
  f('kahf', ['سورة الكهف', 'لقراءة يوم الجمعة'], ['Surah Al-Kahf', 'For Friday reading'], '#/surah/18', 'kahf', '#e4e8f7', '#34479c'),
  f('search', ['بحث', 'عن سورة أو قارئ'], ['Search', 'Find a surah or reciter'], '#/search', 'search', '#e2f1e7', '#22744a'),
];
