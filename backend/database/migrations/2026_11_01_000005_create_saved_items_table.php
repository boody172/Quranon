<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('saved_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20);
            $table->string('ref', 120);
            $table->string('title', 160);
            $table->string('subtitle', 160)->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'type', 'ref']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saved_items');
    }
};
