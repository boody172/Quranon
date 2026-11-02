<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CheckoutController;
use App\Http\Controllers\Api\ConfigController;
use App\Http\Controllers\Api\HifzCircleController;
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
    Route::delete('me', [AuthController::class, 'destroy'])->middleware('throttle:5,1');

    Route::get('saved', [SavedItemController::class, 'index']);
    Route::post('saved', [SavedItemController::class, 'store']);
    Route::delete('saved/{type}/{ref}', [SavedItemController::class, 'destroy'])->where('ref', '.+');

    Route::get('circles', [HifzCircleController::class, 'index']);
    Route::post('circles', [HifzCircleController::class, 'store'])->middleware('throttle:10,1');
    Route::get('circles/{circle}', [HifzCircleController::class, 'show']);
    Route::post('circles/{circle}/join', [HifzCircleController::class, 'join'])->middleware('throttle:20,1');
    Route::post('circles/{circle}/progress', [HifzCircleController::class, 'progress']);
    Route::delete('circles/{circle}/membership', [HifzCircleController::class, 'leave']);

    Route::post('checkout', CheckoutController::class)->middleware('throttle:10,1');
});
