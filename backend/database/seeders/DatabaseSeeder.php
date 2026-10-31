<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([LanguageSeeder::class, FeatureSeeder::class, ScholarSeeder::class, BillingSeeder::class]);
    }
}
