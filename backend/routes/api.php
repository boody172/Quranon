<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CheckoutController;
use App\Http\Controllers\Api\ConfigController;
use App\Http\Controllers\Api\SavedItemController;
use App\Http\Controllers\Payments\PaymobWebhookController;
use Illuminate\Support\Facades\Route;

Route::get('config', ConfigController::class)->middleware('throttle:120,1');

Route::middleware('throttle:10,1')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);
});

Route::post('webhooks/paymob', PaymobWebhookController::class)->middleware('throttle:60,1')->name('webhooks.paymob');

Route::middleware(['auth:sanctum', 'throttle:60,1'])->group(function () {
    Route::get('me', [AuthController::class, 'me']);
    Route::post('logout', [AuthController::class, 'logout']);

    Route::get('saved', [SavedItemController::class, 'index']);
    Route::post('saved', [SavedItemController::class, 'store']);
    Route::delete('saved/{type}/{ref}', [SavedItemController::class, 'destroy'])->where('ref', '.+');

    Route::post('checkout', CheckoutController::class)->middleware('throttle:10,1');
});
