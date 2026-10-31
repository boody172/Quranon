@extends('layouts.admin')
@section('title', 'الإعدادات')

@section('content')
<h1>الإعدادات</h1>

<section class="panel">
    <h2>نشر تحديث للمستخدمين</h2>
    <p class="muted">بعد أي تعديل كبير، اضغط «نشر» ليظهر للمستخدمين إشعار «يوجد تحديث جديد» مع رسالتك. الإصدار الحالي: <b>{{ $release['version'] ?? 0 }}</b>
        @isset($release['published_at']) · نُشر {{ \Illuminate\Support\Carbon::parse($release['published_at'])->diffForHumans() }} @endisset</p>
    <form method="post" action="{{ route('admin.settings.publish') }}" class="form">
        @csrf
        @include('admin.partials.translatable', ['name' => 'notes', 'label' => 'رسالة قصيرة عن الجديد (اختياري)', 'value' => [], 'required' => false])
        <button class="btn">نشر التحديث</button>
    </form>
</section>

<section class="panel">
    <h2>مصادر البيانات (API)</h2>
    <p class="muted">كلها مجانية. يمكنك التبديل لمزوّد آخر أو لنسخة احتياطية (mirror) في أي وقت دون تحديث التطبيق.</p>
    <form method="post" action="{{ route('admin.settings.sources') }}" class="form">
        @csrf @method('put')
        @include('admin.partials.field', ['name' => 'audio_api', 'label' => 'الصوتيات والقرّاء والإذاعات', 'type' => 'url', 'value' => $sources['audio_api'], 'attrs' => 'required dir="ltr"', 'hint' => 'الافتراضي: https://mp3quran.net/api/v3'])
        <div class="grid">
            <label class="field">
                <span class="label">نص المصحف</span>
                <select name="text_provider" data-provider>
                    @foreach (\App\Http\Controllers\Admin\SettingsController::TEXT_PROVIDERS as $key => $provider)
                        <option value="{{ $key }}" data-url="{{ $provider['url'] }}" @selected($sources['text_provider'] === $key)>{{ $provider['label'] }}</option>
                    @endforeach
                </select>
            </label>
            @include('admin.partials.field', ['name' => 'text_api', 'label' => 'رابط المزوّد', 'type' => 'url', 'value' => $sources['text_api'], 'attrs' => 'required dir="ltr" data-provider-url'])
        </div>
        <button class="btn">حفظ المصادر</button>
    </form>
</section>

<section class="panel">
    <h2>مزايا قرآنون بلس</h2>
    <p class="muted">ميزة في كل سطر. تظهر في صفحة الاشتراك.</p>
    <form method="post" action="{{ route('admin.settings.perks') }}" class="form">
        @csrf @method('put')
        @foreach ($languages as $code)
            <label class="field"><span class="label">{{ strtoupper($code) }}</span>
                <textarea name="perks[{{ $code }}]" rows="4" dir="auto">{{ implode("\n", $perks[$code] ?? []) }}</textarea></label>
        @endforeach
        <button class="btn">حفظ المزايا</button>
    </form>
</section>

<section class="panel">
    <h2>مفاتيح الدفع</h2>
    <p class="muted">تُحفظ مشفّرة ولا تُعرض مرة أخرى. اترك الحقل فارغاً للإبقاء على المفتاح الحالي.
        Paymob للدفع في مصر والسعودية، وPayPal لباقي العالم.</p>
    <form method="post" action="{{ route('admin.settings.payments') }}" class="form" autocomplete="off">
        @csrf @method('put')
        <div class="grid">
            @foreach ($secrets as $key => $secret)
                <label class="field">
                    <span class="label">{{ $secret['label'] }} @if ($secret['saved'])<span class="tag">محفوظ</span>@endif</span>
                    <input type="password" name="secrets[{{ str_replace('.', '_', $key) }}]" dir="ltr" autocomplete="new-password">
                </label>
            @endforeach
            <label class="field">
                <span class="label">وضع PayPal</span>
                <select name="paypal_mode">
                    <option value="sandbox" @selected($paypalMode === 'sandbox')>تجريبي (Sandbox)</option>
                    <option value="live" @selected($paypalMode === 'live')>حقيقي (Live)</option>
                </select>
            </label>
        </div>
        <p class="muted small">رابط إشعارات Paymob (ضعه في لوحة Paymob): <code dir="ltr">{{ route('webhooks.paymob') }}</code></p>
        <button class="btn">حفظ المفاتيح</button>
    </form>
</section>

<script nonce="{{ $cspNonce }}">
    document.querySelector('[data-provider]').addEventListener('change', (e) => {
        document.querySelector('[data-provider-url]').value = e.target.selectedOptions[0].dataset.url;
    });
</script>
@endsection
