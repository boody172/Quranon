<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A memorisation circle: friends, family or a class memorising the same verses on the same daily plan.
        Schema::create('hifz_circles', function (Blueprint $table) {
            $table->id();
            $table->string('code', 12)->unique();
            $table->string('name', 60);
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedTinyInteger('surah');
            $table->unsignedSmallInteger('from_ayah');
            $table->unsignedSmallInteger('to_ayah');
            $table->unsignedTinyInteger('per_day');
            $table->date('starts_on');
            $table->timestamps();
        });

        Schema::create('hifz_circle_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hifz_circle_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('memorised')->default(0);
            $table->unsignedSmallInteger('streak')->default(0);
            $table->date('last_done_on')->nullable();
            $table->timestamps();

            $table->unique(['hifz_circle_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hifz_circle_members');
        Schema::dropIfExists('hifz_circles');
    }
};
