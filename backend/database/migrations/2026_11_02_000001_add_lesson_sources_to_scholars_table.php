<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Lessons now play inside the app: each scholar points at an audio source
     * instead of an external (YouTube) link.
     */
    public function up(): void
    {
        Schema::table('scholars', function (Blueprint $table) {
            $table->dropColumn('url');
            $table->string('lessons_source', 20)->default('manual')->after('is_late'); // islamhouse | archive | manual
            $table->string('lessons_ref', 191)->nullable()->after('lessons_source');   // author id / item identifier
            $table->json('lessons')->nullable()->after('lessons_ref');                 // manual: [{ title, url }]
        });
    }

    public function down(): void
    {
        Schema::table('scholars', function (Blueprint $table) {
            $table->dropColumn(['lessons_source', 'lessons_ref', 'lessons']);
            $table->string('url')->nullable();
        });
    }
};
