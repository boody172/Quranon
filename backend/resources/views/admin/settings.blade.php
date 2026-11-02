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
    <h2>الربح والإعلانات</h2>
    <p class="muted">الإعلان يظهر في تطبيقات المتاجر فقط (الموقع بدون إعلانات): إعلان «فتح التطبيق» من جوجل، مسبوق برسالة اعتذار قصيرة، لا يظهر أبداً أثناء التلاوة أو الحفظ، ومحتواه عائلي فقط.
        أرقام الوحدات من AdMob ← Apps ← تطبيقك ← Ad units ← App open. اتركها فارغة لاستخدام وحدات جوجل التجريبية.</p>
    <form method="post" action="{{ route('admin.settings.monetization') }}" class="form">
        @csrf @method('put')
        <label class="field">
            <span class="label">طريقة الربح</span>
            <select name="monetization">
                @foreach (\App\Http\Controllers\Admin\SettingsController::MONETIZATION as $key => $label)
                    <option value="{{ $key }}" @selected($monetization === $key)>{{ $label }}</option>
                @endforeach
            </select>
        </label>
        <div class="grid">
            @include('admin.partials.field', ['name' => 'android_unit', 'label' => 'وحدة App open — أندرويد', 'value' => str_starts_with($ads['appOpen']['android'], 'ca-app-pub-3940256099942544') ? '' : $ads['appOpen']['android'], 'attrs' => 'dir="ltr" placeholder="ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx"'])
            @include('admin.partials.field', ['name' => 'ios_unit', 'label' => 'وحدة App open — آيفون', 'value' => str_starts_with($ads['appOpen']['ios'], 'ca-app-pub-3940256099942544') ? '' : $ads['appOpen']['ios'], 'attrs' => 'dir="ltr" placeholder="ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx"'])
        </div>
        <div class="grid">
            @include('admin.partials.field', ['name' => 'every_hours', 'label' => 'إعلان واحد كل (ساعات)', 'type' => 'number', 'value' => $ads['everyHours'], 'attrs' => 'required min="1" max="72"'])
            @include('admin.partials.field', ['name' => 'skip_first_launches', 'label' => 'بدون إعلان في أول (مرات فتح)', 'type' => 'number', 'value' => $ads['skipFirstLaunches'], 'attrs' => 'required min="0" max="20"'])
        </div>
        <button class="btn">حفظ</button>
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
        @include('admin.partials.field', ['name' => 'islamhouse_api', 'label' => 'الدروس الصوتية (IslamHouse)', 'type' => 'url', 'value' => $sources['islamhouse_api'], 'attrs' => 'required dir="ltr"'])
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
