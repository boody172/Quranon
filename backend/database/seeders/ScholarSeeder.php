<?php

namespace Database\Seeders;

use App\Models\Scholar;
use Illuminate\Database\Seeder;

class ScholarSeeder extends Seeder
{
    public function run(): void
    {
        $scholars = [
            [['الشيخ محمد متولي الشعراوي', 'خواطر حول القرآن الكريم'], ['Sheikh Muhammad Metwally Al-Shaarawy', 'Reflections on the Quran'], 'eg', true],
            [['الشيخ محمد حسان', 'دروس ومحاضرات'], ['Sheikh Muhammad Hassan', 'Lessons and lectures'], 'eg', false],
            [['د. عمر عبد الكافي', 'دروس في السيرة والتزكية'], ['Dr. Omar Abdelkafy', 'Seerah and self-purification'], 'eg', false],
            [['د. مصطفى حسني', 'معاني الآيات والتزكية'], ['Dr. Mustafa Hosny', 'Meanings of the verses'], 'eg', false],
            [['الشيخ محمد بن صالح العثيمين', 'تفسير وشروح'], ['Sheikh Muhammad ibn Salih Al-Uthaymeen', 'Tafsir and commentary'], 'sa', true],
            [['الشيخ عبد العزيز بن باز', 'فتاوى ودروس'], ['Sheikh Abdulaziz ibn Baz', 'Fatwas and lessons'], 'sa', true],
            [['الشيخ صالح المغامسي', 'تأملات قرآنية'], ['Sheikh Saleh Al-Maghamsi', 'Quranic reflections'], 'sa', false],
            [['الشيخ عثمان الخميس', 'تفسير ودروس'], ['Sheikh Othman Al-Khamees', 'Tafsir and lessons'], 'kw', false],
            [['د. محمد راتب النابلسي', 'تفسير وإعجاز'], ['Dr. Mohammed Rateb Al-Nabulsi', 'Tafsir and the miracles of the Quran'], 'sy', false],
        ];

        foreach ($scholars as $i => [$ar, $en, $country, $late]) {
            Scholar::updateOrCreate(['sort' => $i], [
                'name' => ['ar' => $ar[0], 'en' => $en[0]],
                'topic' => ['ar' => $ar[1], 'en' => $en[1]],
                'country' => $country, 'is_late' => $late, 'is_active' => true,
                'url' => 'https://www.youtube.com/results?search_query='.rawurlencode("{$ar[0]} {$ar[1]}"),
            ]);
        }
    }
}
