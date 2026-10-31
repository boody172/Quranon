<?php

namespace Database\Seeders;

use App\Models\Feature;
use Illuminate\Database\Seeder;

/** Mirrors DEFAULT_FEATURES in js/art.js. */
class FeatureSeeder extends Seeder
{
    public function run(): void
    {
        $features = [
            ['qibla', ['القبلة', 'حرّك الهاتف حتى يثبت السهم'], ['Qibla', 'Turn your phone until it locks'], '#/qibla', 'qibla', '#ddf3ee', '#0f766e'],
            ['listen', ['استمع', 'أكثر من مئتي قارئ'], ['Listen', 'Over 200 reciters'], '#/listen', 'listen', '#e3edfb', '#2557b8'],
            ['mushaf', ['المصحف', 'اقرأ بالرسم العثماني'], ['Mushaf', 'Read in the Uthmani script'], '#/mushaf', 'mushaf', '#f6ecd6', '#8c6118'],
            ['radio', ['الإذاعات', 'بث مباشر طوال اليوم'], ['Radio', 'Live, all day long'], '#/radio', 'radio', '#fbe6dc', '#b4501f'],
            ['lessons', ['دروس', 'تفسير وتدبّر من علماء موثوقين'], ['Lessons', 'Tafsir from trusted scholars'], '#/lessons', 'lessons', '#ebe6f8', '#5b45b0'],
            ['saved', ['محفوظاتي', 'كل ما حفظته في مكان واحد'], ['Saved', 'Everything you saved, in one place'], '#/saved', 'fav', '#f9e3ea', '#b23a63'],
            ['kahf', ['سورة الكهف', 'لقراءة يوم الجمعة'], ['Surah Al-Kahf', 'For Friday reading'], '#/surah/18', 'kahf', '#e4e8f7', '#34479c'],
            ['search', ['بحث', 'عن سورة أو قارئ'], ['Search', 'Find a surah or reciter'], '#/search', 'search', '#e2f1e7', '#22744a'],
        ];

        foreach ($features as $i => [$slug, $ar, $en, $link, $art, $tint, $ink]) {
            Feature::updateOrCreate(['slug' => $slug], [
                'title' => ['ar' => $ar[0], 'en' => $en[0]],
                'subtitle' => ['ar' => $ar[1], 'en' => $en[1]],
                'link' => $link, 'art' => $art, 'tint' => $tint, 'ink' => $ink, 'sort' => $i, 'is_active' => true,
            ]);
        }
    }
}
