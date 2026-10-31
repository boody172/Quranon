<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('plus_until')->nullable()->after('is_admin');
        });

        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 40)->unique();
            $table->string('interval', 10);             // month | year | lifetime
            $table->json('prices');                     // { "EGP": 49, "SAR": 12, "USD": 2.99 }
            $table->boolean('is_highlighted')->default(false);
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort')->default(0);
            $table->timestamps();
        });

        Schema::create('payment_methods', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique();
            $table->json('name');
            $table->string('gateway', 20);              // manual | paymob | paypal
            $table->json('countries');                  // ["eg"], ["sa"], ["*"]
            $table->json('instructions')->nullable();   // manual methods only
            $table->string('gateway_option', 60)->nullable(); // e.g. Paymob integration id
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort')->default(0);
            $table->timestamps();
        });

        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 20)->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('plan_id')->constrained()->restrictOnDelete();
            $table->string('payment_method', 30);
            $table->string('gateway', 20);
            $table->char('currency', 3);
            $table->decimal('amount', 10, 2);
            $table->string('status', 12)->default('pending')->index(); // pending | paid | failed | cancelled
            $table->string('gateway_ref', 120)->nullable()->index();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
        Schema::dropIfExists('payment_methods');
        Schema::dropIfExists('plans');
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('plus_until'));
    }
};
