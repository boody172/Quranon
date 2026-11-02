<?php

namespace Database\Seeders;

use App\Models\Scholar;
use Illuminate\Database\Seeder;

class ScholarSeeder extends Seeder
{
    public function run(): void
    {
        $scholars = [
            [['الشيخ محمد متولي الشعراوي', 'خواطر حول القرآن الكريم'], ['Sheikh Muhammad Metwally Al-Shaarawy', 'Reflections on the Quran'], 'eg', true, 'archive', 'Islamic_Tape-233_uP_bY_mUSLEm'],
            [['الشيخ محمد حسان', 'محاضرات ودروس'], ['Sheikh Muhammad Hassan', 'Lectures and lessons'], 'eg', false, 'archive', 'mohamed-hassan-mp3'],
            [['د. عمر عبد الكافي', 'دروس ومحاضرات'], ['Dr. Omar Abdelkafy', 'Lessons and lectures'], 'eg', false, 'archive', 'mawsoa-mp3_Omar-abdlkafee'],
            [['د. مصطفى حسني', 'رسالة من الله'], ['Dr. Mustafa Hosny', 'A Message from Allah'], 'eg', false, 'archive', 'Resala.Hosny'],
            [['الشيخ محمد بن صالح العثيمين', 'تفسير وشروح'], ['Sheikh Muhammad ibn Salih Al-Uthaymeen', 'Tafsir and commentary'], 'sa', true, 'islamhouse', '6842'],
            [['الشيخ عبد العزيز بن باز', 'فتاوى ودروس'], ['Sheikh Abdulaziz ibn Baz', 'Fatwas and lessons'], 'sa', true, 'islamhouse', '6865'],
            [['الشيخ عبد الرزاق البدر', 'دروس ومواعظ'], ['Sheikh Abdul-Razzaq Al-Badr', 'Lessons and reminders'], 'sa', false, 'islamhouse', '7737'],
            [['الشيخ صالح المغامسي', 'محاضرات ودروس'], ['Sheikh Saleh Al-Maghamsi', 'Lectures and lessons'], 'sa', false, 'archive', 'Dourous-saleh-mghamsi-upByMuslem'],
            [['الشيخ عثمان الخميس', 'قصص الأنبياء'], ['Sheikh Othman Al-Khamees', 'Stories of the Prophets'], 'kw', false, 'archive', 'Prophets_stories-othman_khamis_up_by_muslem'],
            [['د. محمد راتب النابلسي', 'تفسير القرآن الكريم'], ['Dr. Mohammed Rateb Al-Nabulsi', 'Tafsir of the Quran'], 'sy', false, 'archive', 'Tasfeer-Nabulsi'],
        ];

        foreach ($scholars as $i => [$ar, $en, $country, $late, $source, $ref]) {
            Scholar::updateOrCreate(['sort' => $i], [
                'name' => ['ar' => $ar[0], 'en' => $en[0]],
                'topic' => ['ar' => $ar[1], 'en' => $en[1]],
                'country' => $country, 'is_late' => $late, 'is_active' => true,
                'lessons_source' => $source, 'lessons_ref' => $ref,
            ]);
        }
    }
}
