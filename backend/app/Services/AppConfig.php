<?php

namespace App\Services;

use App\Http\Controllers\Admin\SettingsController;
use App\Models\Feature;
use App\Models\Language;
use App\Models\PaymentMethod;
use App\Models\Plan;
use App\Models\Reciter;
use App\Models\Scholar;
use App\Models\Setting;
use App\Services\Payments\GatewayManager;
use Illuminate\Support\Facades\Cache;

/**
 * Everything the app needs on launch, in one cached payload.
 * Flushed automatically whenever an admin edits content (see FlushesAppConfig).
 */
class AppConfig
{
    // Stored as plain arrays: the cache refuses to unserialize objects (cache.serializable_classes = false).
    private const CACHE_KEY = 'app-config:v3';

    public static function get(): array
    {
        return Cache::rememberForever(self::CACHE_KEY, fn () => collect([
            'features' => Feature::where('is_active', true)->ordered()->get()->map->toAppArray()->values(),
            'reciters' => Reciter::ordered()->get()->map->toAppArray()->values(),
            'scholars' => Scholar::where('is_active', true)->ordered()->get()->map->toAppArray()->values(),
            'i18n' => self::i18n(),
            'sources' => array_merge(config('quranon.sources'), Setting::get('sources', [])),
            'release' => Setting::get('release'),
            'plans' => Plan::active()->get()->map->toAppArray()->values(),
            'payment_methods' => PaymentMethod::active()->get()
                ->filter(fn (PaymentMethod $m) => $m->isReady(app(GatewayManager::class)))
                ->map->toAppArray()->values(),
            'plus_perks' => Setting::get('plus_perks'),
            'monetization' => Setting::get('monetization', 'ads'),
            'ads' => array_replace_recursive(SettingsController::ADS_DEFAULTS, Setting::get('ads', [])),
        ])->toArray());
    }

    public static function flush(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    private static function i18n(): array
    {
        $languages = Language::active()->with('translations')->get();

        return [
            'languages' => $languages->map(fn (Language $l) => ['code' => $l->code, 'name' => $l->name, 'dir' => $l->dir])->values()->all(),
            'strings' => $languages
                ->mapWithKeys(fn (Language $l) => [$l->code => $l->translations->pluck('value', 'key')])
                ->filter(fn ($strings) => $strings->isNotEmpty())
                ->map(fn ($strings) => $strings->all())
                ->all(),
        ];
    }
}
