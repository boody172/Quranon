// Static reference data shipped with the app (works offline and before the API answers).
const SURAH_EN = "Al-Fatihah|Al-Baqarah|Al-Imran|An-Nisa|Al-Ma'idah|Al-An'am|Al-A'raf|Al-Anfal|At-Tawbah|Yunus|Hud|Yusuf|Ar-Ra'd|Ibrahim|Al-Hijr|An-Nahl|Al-Isra|Al-Kahf|Maryam|Taha|Al-Anbiya|Al-Hajj|Al-Mu'minun|An-Nur|Al-Furqan|Ash-Shu'ara|An-Naml|Al-Qasas|Al-Ankabut|Ar-Rum|Luqman|As-Sajdah|Al-Ahzab|Saba|Fatir|Ya-Sin|As-Saffat|Sad|Az-Zumar|Ghafir|Fussilat|Ash-Shura|Az-Zukhruf|Ad-Dukhan|Al-Jathiyah|Al-Ahqaf|Muhammad|Al-Fath|Al-Hujurat|Qaf|Adh-Dhariyat|At-Tur|An-Najm|Al-Qamar|Ar-Rahman|Al-Waqi'ah|Al-Hadid|Al-Mujadilah|Al-Hashr|Al-Mumtahanah|As-Saff|Al-Jumu'ah|Al-Munafiqun|At-Taghabun|At-Talaq|At-Tahrim|Al-Mulk|Al-Qalam|Al-Haqqah|Al-Ma'arij|Nuh|Al-Jinn|Al-Muzzammil|Al-Muddaththir|Al-Qiyamah|Al-Insan|Al-Mursalat|An-Naba|An-Nazi'at|Abasa|At-Takwir|Al-Infitar|Al-Mutaffifin|Al-Inshiqaq|Al-Buruj|At-Tariq|Al-A'la|Al-Ghashiyah|Al-Fajr|Al-Balad|Ash-Shams|Al-Layl|Ad-Duha|Ash-Sharh|At-Tin|Al-Alaq|Al-Qadr|Al-Bayyinah|Az-Zalzalah|Al-Adiyat|Al-Qari'ah|At-Takathur|Al-Asr|Al-Humazah|Al-Fil|Quraysh|Al-Ma'un|Al-Kawthar|Al-Kafirun|An-Nasr|Al-Masad|Al-Ikhlas|Al-Falaq|An-Nas".split('|');

export const SURAHS = `الفاتحة,7,M|البقرة,286,D|آل عمران,200,D|النساء,176,D|المائدة,120,D|الأنعام,165,M|الأعراف,206,M|الأنفال,75,D|التوبة,129,D|يونس,109,M|هود,123,M|يوسف,111,M|الرعد,43,D|إبراهيم,52,M|الحجر,99,M|النحل,128,M|الإسراء,111,M|الكهف,110,M|مريم,98,M|طه,135,M|الأنبياء,112,M|الحج,78,D|المؤمنون,118,M|النور,64,D|الفرقان,77,M|الشعراء,227,M|النمل,93,M|القصص,88,M|العنكبوت,69,M|الروم,60,M|لقمان,34,M|السجدة,30,M|الأحزاب,73,D|سبأ,54,M|فاطر,45,M|يس,83,M|الصافات,182,M|ص,88,M|الزمر,75,M|غافر,85,M|فصلت,54,M|الشورى,53,M|الزخرف,89,M|الدخان,59,M|الجاثية,37,M|الأحقاف,35,M|محمد,38,D|الفتح,29,D|الحجرات,18,D|ق,45,M|الذاريات,60,M|الطور,49,M|النجم,62,M|القمر,55,M|الرحمن,78,D|الواقعة,96,M|الحديد,29,D|المجادلة,22,D|الحشر,24,D|الممتحنة,13,D|الصف,14,D|الجمعة,11,D|المنافقون,11,D|التغابن,18,D|الطلاق,12,D|التحريم,12,D|الملك,30,M|القلم,52,M|الحاقة,52,M|المعارج,44,M|نوح,28,M|الجن,28,M|المزمل,20,M|المدثر,56,M|القيامة,40,M|الإنسان,31,D|المرسلات,50,M|النبأ,40,M|النازعات,46,M|عبس,42,M|التكوير,29,M|الانفطار,19,M|المطففين,36,M|الانشقاق,25,M|البروج,22,M|الطارق,17,M|الأعلى,19,M|الغاشية,26,M|الفجر,30,M|البلد,20,M|الشمس,15,M|الليل,21,M|الضحى,11,M|الشرح,8,M|التين,8,M|العلق,19,M|القدر,5,M|البينة,8,D|الزلزلة,8,D|العاديات,11,M|القارعة,11,M|التكاثر,8,M|العصر,3,M|الهمزة,9,M|الفيل,5,M|قريش,4,M|الماعون,7,M|الكوثر,3,M|الكافرون,6,M|النصر,3,D|المسد,5,M|الإخلاص,4,M|الفلق,5,M|الناس,6,M`
  .split('|').map((s, i) => { const [name, ayahs, type] = s.split(','); return { n: i + 1, name, ayahs: +ayahs, type, en: SURAH_EN[i] }; });

export const COUNTRIES = ['eg', 'sa', 'kw', 'sd', 'ma', 'ye'];

// كلمات مفتاحية (بعد التطبيع وحذف المسافات) → دولة، d = رحمه الله
export const RECITER_TAGS = [
  // مصر
  ['المنشاوي', 'eg', 1], ['عبدالباسط', 'eg', 1], ['الحصري', 'eg', 1], ['مصطفياسماعيل', 'eg', 1],
  ['محمدرفعت', 'eg', 1], ['محمودعليالبنا', 'eg', 1], ['الطبلاوي', 'eg', 1], ['شعيشع', 'eg', 1],
  ['البهتيمي', 'eg', 1], ['الشعشاعي', 'eg', 1], ['الفشني', 'eg', 1], ['غلوش', 'eg', 1],
  ['شعبانالصياد', 'eg', 1], ['الدمنهوري', 'eg', 1], ['نعينع', 'eg', 0], ['الشحات', 'eg', 0],
  ['محمدجبريل', 'eg', 0], ['الليثي', 'eg', 1], ['حجاجالهنداوي', 'eg', 0], ['محمودالطوخي', 'eg', 0],
  // السعودية
  ['السديس', 'sa', 0], ['الشريم', 'sa', 0], ['المعيقلي', 'sa', 0], ['الغامدي', 'sa', 0],
  ['الدوسري', 'sa', 0], ['بصفر', 'sa', 0], ['الجهني', 'sa', 0], ['بليله', 'sa', 0],
  ['عليجابر', 'sa', 1], ['محمدايوب', 'sa', 1], ['البدير', 'sa', 0], ['الجليل', 'sa', 0],
  ['القطامي', 'sa', 0], ['ابكر', 'sa', 0], ['العجمي', 'sa', 0], ['الرفاعي', 'sa', 0],
  ['الكلباني', 'sa', 0], ['اللحيدان', 'sa', 0], ['الحذيفي', 'sa', 0], ['القحطاني', 'sa', 0],
  ['ياسرالقرشي', 'sa', 0], ['السالمي', 'sa', 0], ['الاخضر', 'sa', 0], ['عبدالمحسنالقاسم', 'sa', 0],
  // الكويت
  ['العفاسي', 'kw', 0], ['الكندري', 'kw', 0],
  // السودان
  ['الزينمحمداحمد', 'sd', 0], ['نورينمحمدصديق', 'sd', 1],
  // المغرب
  ['القزابري', 'ma', 0], ['الكوشي', 'ma', 0],
  // اليمن
  ['فارسعباد', 'ye', 0],
];

// القراء المميزين في الصفحة الرئيسية (عمالقة دولة التلاوة)
// Full normalised names (no spaces) so namesakes are never confused (e.g. Yasser vs Ibrahim Al-Dossary).
export const FEATURED_KEYS = ['عبدالباسط', 'محمدصديقالمنشاوي', 'محمودخليلالحصري', 'مصطفياسماعيل', 'محمدرفعت', 'محمودعليالبنا', 'الطبلاوي', 'ياسرالدوسري', 'السديس', 'سعودالشريم', 'ماهرالمعيقلي', 'العفاسي', 'سعدالغامدي', 'العجمي', 'ناصرالقطامي', 'بصفر', 'الجهني', 'الحذيفي', 'محمدايوب', 'بندربليله'];

// Default scholars and where their audio lessons come from (the dashboard can change all of this).
// source: 'islamhouse' → IslamHouse author id · 'archive' → Internet Archive item identifier.
export const SCHOLARS = [
  { ar: ['الشيخ محمد متولي الشعراوي', 'خواطر حول القرآن الكريم'], en: ['Sheikh Muhammad Metwally Al-Shaarawy', 'Reflections on the Quran'], country: 'eg', late: true, source: 'archive', ref: 'Islamic_Tape-233_uP_bY_mUSLEm' },
  { ar: ['الشيخ محمد حسان', 'محاضرات ودروس'], en: ['Sheikh Muhammad Hassan', 'Lectures and lessons'], country: 'eg', source: 'archive', ref: 'mohamed-hassan-mp3' },
  { ar: ['د. عمر عبد الكافي', 'دروس ومحاضرات'], en: ['Dr. Omar Abdelkafy', 'Lessons and lectures'], country: 'eg', source: 'archive', ref: 'mawsoa-mp3_Omar-abdlkafee' },
  { ar: ['د. مصطفى حسني', 'رسالة من الله'], en: ['Dr. Mustafa Hosny', 'A Message from Allah'], country: 'eg', source: 'archive', ref: 'Resala.Hosny' },
  { ar: ['الشيخ محمد بن صالح العثيمين', 'تفسير وشروح'], en: ['Sheikh Muhammad ibn Salih Al-Uthaymeen', 'Tafsir and commentary'], country: 'sa', late: true, source: 'islamhouse', ref: '6842' },
  { ar: ['الشيخ عبد العزيز بن باز', 'فتاوى ودروس'], en: ['Sheikh Abdulaziz ibn Baz', 'Fatwas and lessons'], country: 'sa', late: true, source: 'islamhouse', ref: '6865' },
  { ar: ['الشيخ عبد الرزاق البدر', 'دروس ومواعظ'], en: ['Sheikh Abdul-Razzaq Al-Badr', 'Lessons and reminders'], country: 'sa', source: 'islamhouse', ref: '7737' },
  { ar: ['الشيخ صالح المغامسي', 'محاضرات ودروس'], en: ['Sheikh Saleh Al-Maghamsi', 'Lectures and lessons'], country: 'sa', source: 'archive', ref: 'Dourous-saleh-mghamsi-upByMuslem' },
  { ar: ['الشيخ عثمان الخميس', 'قصص الأنبياء'], en: ['Sheikh Othman Al-Khamees', 'Stories of the Prophets'], country: 'kw', source: 'archive', ref: 'Prophets_stories-othman_khamis_up_by_muslem' },
  { ar: ['د. محمد راتب النابلسي', 'تفسير القرآن الكريم'], en: ['Dr. Mohammed Rateb Al-Nabulsi', 'Tafsir of the Quran'], country: 'sy', source: 'archive', ref: 'Tasfeer-Nabulsi' },
  // Imams of the two Holy Mosques — sermons and lessons.
  { ar: ['الشيخ عبد الرحمن السديس', 'خطب ودروس الحرم المكي'], en: ['Sheikh Abdul-Rahman Al-Sudais', 'Sermons from Masjid al-Haram'], country: 'sa', source: 'islamhouse', ref: '8474' },
  { ar: ['الشيخ سعود الشريم', 'خطب ودروس الحرم المكي'], en: ['Sheikh Saud Al-Shuraim', 'Sermons from Masjid al-Haram'], country: 'sa', source: 'islamhouse', ref: '8603' },
  { ar: ['الشيخ علي الحذيفي', 'خطب المسجد النبوي'], en: ['Sheikh Ali Al-Hudhaify', 'Sermons from the Prophet’s Mosque'], country: 'sa', source: 'islamhouse', ref: '56685' },
  { ar: ['الشيخ صلاح البدير', 'خطب المسجد النبوي'], en: ['Sheikh Salah Al-Budair', 'Sermons from the Prophet’s Mosque'], country: 'sa', source: 'islamhouse', ref: '56690' },
  { ar: ['الشيخ عبد الباري الثبيتي', 'خطب المسجد النبوي'], en: ['Sheikh Abdul-Bari Al-Thubaiti', 'Sermons from the Prophet’s Mosque'], country: 'sa', source: 'islamhouse', ref: '8602' },
  { ar: ['الشيخ عبد المحسن القاسم', 'خطب المسجد النبوي'], en: ['Sheikh Abdul-Muhsin Al-Qasim', 'Sermons from the Prophet’s Mosque'], country: 'sa', source: 'islamhouse', ref: '8316' },
];
export const LESSON_COUNTRIES = ['eg', 'sa', 'kw', 'sy'];

export const KAABA = { lat: 21.422487, lng: 39.826206 };
