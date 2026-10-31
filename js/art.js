// رسومات كبيرة لكروت المميزات (خطوط نيون بنفس روح الريفرنس)
const ART = {
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
const MAIN_FEATURES = [
  { t: 'استمع', d: 'كل القرّاء بكل الروايات', href: '#/listen', art: 'listen' },
  { t: 'المصحف', d: 'اقرأ وتدبّر', href: '#/mushaf', art: 'mushaf' },
  { t: 'الإذاعات', d: 'بث مباشر ٢٤ ساعة', href: '#/radio', art: 'radio' },
  { t: 'دروس', d: 'وتفسير من كل دولة', href: '#/lessons', art: 'lessons' },
  { t: 'القبلة', d: 'بوصلة دقيقة', href: '#/qibla', art: 'qibla' },
];
const MINI_FEATURES = [
  { t: 'المفضلة', href: '#/listen/fav', ic: 'heart' },
  { t: 'سورة الكهف', href: '#/surah/18', ic: 'star' },
  { t: 'بحث', href: '#/search', ic: 'search' },
  { t: 'قصار السور', href: '#/surah/112', ic: 'book' },
];
