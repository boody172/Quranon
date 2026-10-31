<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Editorial data layered on top of the mp3quran.net catalogue:
     * the audio itself stays on their CDN, we only keep photo, country and ordering.
     */
    public function up(): void
    {
        Schema::create('reciters', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('mp3quran_id')->unique();
            $table->string('name', 120);
            $table->char('country', 2)->nullable()->index();
            $table->boolean('is_late')->default(false);
            $table->boolean('is_featured')->default(false)->index();
            $table->string('photo_path')->nullable();
            $table->unsignedSmallInteger('sort')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reciters');
    }
};
