<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('features', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 60)->unique();
            $table->json('title');      // { "ar": "...", "en": "..." }
            $table->json('subtitle')->nullable();
            $table->string('link', 255);
            $table->string('art', 40)->nullable();
            $table->string('image_path')->nullable();
            $table->char('tint', 7)->default('#e6f4f1');
            $table->char('ink', 7)->default('#0f766e');
            $table->unsignedSmallInteger('sort')->default(0)->index();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('features');
    }
};
