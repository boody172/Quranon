<?php

namespace Database\Seeders;

use App\Models\Language;
use Illuminate\Database\Seeder;

class LanguageSeeder extends Seeder
{
    public function run(): void
    {
        Language::updateOrCreate(['code' => 'ar'], ['name' => 'العربية', 'dir' => 'rtl', 'is_active' => true, 'sort' => 0]);
        Language::updateOrCreate(['code' => 'en'], ['name' => 'English', 'dir' => 'ltr', 'is_active' => true, 'sort' => 1]);
    }
}
