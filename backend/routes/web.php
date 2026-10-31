<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\Payments\PayPalReturnController;
use App\Http\Middleware\EnsureUserIsAdmin;
use App\Http\Middleware\RestrictAdminIps;
use Illuminate\Support\Facades\Route;

Route::get('payments/paypal/return/{reference}', PayPalReturnController::class)
    ->middleware('throttle:20,1')->name('payments.paypal.return');

Route::prefix(config('quranon.admin_path'))->name('admin.')->middleware(RestrictAdminIps::class)->group(function () {
    Route::middleware('guest')->group(function () {
        Route::get('login', [Admin\AuthController::class, 'create'])->name('login');
        Route::post('login', [Admin\AuthController::class, 'store'])->middleware('throttle:5,1');
    });

    Route::middleware(['auth', EnsureUserIsAdmin::class])->group(function () {
        Route::get('/', Admin\DashboardController::class)->name('dashboard');
        Route::post('logout', [Admin\AuthController::class, 'destroy'])->name('logout');

        Route::resource('features', Admin\FeatureController::class)->except('show');
        Route::resource('reciters', Admin\ReciterController::class)->except('show');
        Route::resource('scholars', Admin\ScholarController::class)->except('show');
        Route::resource('languages', Admin\LanguageController::class)->except('show');
        Route::resource('plans', Admin\PlanController::class)->except('show');
        Route::resource('payment-methods', Admin\PaymentMethodController::class)->except('show');

        Route::get('orders', [Admin\OrderController::class, 'index'])->name('orders.index');
        Route::post('orders/{order}/paid', [Admin\OrderController::class, 'markPaid'])->name('orders.paid');
        Route::post('orders/{order}/cancel', [Admin\OrderController::class, 'cancel'])->name('orders.cancel');

        Route::get('settings', [Admin\SettingsController::class, 'edit'])->name('settings');
        Route::put('settings/sources', [Admin\SettingsController::class, 'updateSources'])->name('settings.sources');
        Route::put('settings/perks', [Admin\SettingsController::class, 'updatePerks'])->name('settings.perks');
        Route::put('settings/payments', [Admin\SettingsController::class, 'updatePayments'])->name('settings.payments');
        Route::post('settings/publish', [Admin\SettingsController::class, 'publish'])->name('settings.publish');

        Route::get('users', [Admin\UserController::class, 'index'])->name('users.index');
    });
});
