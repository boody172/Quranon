<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Language;
use App\Models\Setting;
use App\Services\AppConfig;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\View\View;

class SettingsController extends Controller
{
    /** Secret settings: shown only as "saved" in the form, never echoed back. */
    public const SECRETS = [
        'payments.paymob.secret_key' => 'Paymob Secret key',
        'payments.paymob.public_key' => 'Paymob Public key',
        'payments.paymob.hmac' => 'Paymob HMAC secret',
        'payments.paypal.client_id' => 'PayPal Client ID',
        'payments.paypal.secret' => 'PayPal Secret',
    ];

    public const TEXT_PROVIDERS = [
        'alquran_cloud' => ['label' => 'AlQuran Cloud (مجاني)', 'url' => 'https://api.alquran.cloud/v1'],
        'quran_com' => ['label' => 'Quran.com API (مجاني)', 'url' => 'https://api.quran.com/api/v4'],
    ];

    public function edit(): View
    {
        return view('admin.settings', [
            'sources' => array_merge(config('quranon.sources'), Setting::get('sources', [])),
            'perks' => Setting::get('plus_perks', []),
            'release' => Setting::get('release', ['version' => 0, 'notes' => []]),
            'secrets' => collect(self::SECRETS)->map(fn ($label, $key) => ['label' => $label, 'saved' => Setting::has($key)]),
            'paypalMode' => Setting::get('payments.paypal.mode', 'sandbox'),
            'languages' => Language::activeCodes(),
        ]);
    }

    public function updateSources(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'audio_api' => ['required', 'url:https', 'max:255'],
            'text_provider' => ['required', Rule::in(array_keys(self::TEXT_PROVIDERS))],
            'text_api' => ['required', 'url:https', 'max:255'],
            'islamhouse_api' => ['required', 'url:https', 'max:255'],
        ]);

        Setting::put('sources', $data);

        return back()->with('status', 'تم تحديث مصادر البيانات. انشر تحديثاً ليصل للمستخدمين فوراً.');
    }

    public function updatePerks(Request $request): RedirectResponse
    {
        $data = $request->validate(['perks' => ['array'], 'perks.*' => ['nullable', 'string', 'max:1000']]);

        $perks = collect($data['perks'] ?? [])
            ->map(fn ($text) => array_values(array_filter(array_map('trim', preg_split('/\R/u', (string) $text)))))
            ->filter()
            ->all();

        Setting::put('plus_perks', $perks ?: null);

        return back()->with('status', 'تم حفظ مزايا بلس.');
    }

    public function updatePayments(Request $request): RedirectResponse
    {
        $request->validate([
            'secrets' => ['array'],
            'secrets.*' => ['nullable', 'string', 'max:500'],
            'paypal_mode' => ['required', Rule::in(['sandbox', 'live'])],
        ]);

        foreach (self::SECRETS as $key => $label) {
            $value = $request->input('secrets.'.str_replace('.', '_', $key));
            if (filled($value)) {
                Setting::put($key, trim($value), secret: true);
            }
        }
        Setting::put('payments.paypal.mode', $request->input('paypal_mode'));
        AppConfig::flush();

        return back()->with('status', 'تم حفظ مفاتيح الدفع بشكل مشفّر.');
    }

    /** Bumps the release version: every open app shows "a new update is ready". */
    public function publish(Request $request): RedirectResponse
    {
        $data = $request->validate(['notes' => ['array'], 'notes.*' => ['nullable', 'string', 'max:200']]);
        $current = Setting::get('release', ['version' => 0]);

        Setting::put('release', [
            'version' => ($current['version'] ?? 0) + 1,
            'notes' => array_filter($data['notes'] ?? []),
            'published_at' => now()->toIso8601String(),
        ]);

        return back()->with('status', 'تم النشر. سيظهر إشعار التحديث للمستخدمين خلال دقيقة.');
    }
}
