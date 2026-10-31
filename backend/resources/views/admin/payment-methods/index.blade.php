@extends('layouts.admin')
@section('title', 'طرق الدفع')

@section('content')
<div class="head">
    <h1>طرق الدفع</h1>
    <a href="{{ route('admin.payment-methods.create') }}" class="btn">إضافة طريقة</a>
</div>
<p class="muted">تظهر كل طريقة للمستخدم حسب دولته، وفقط بعد حفظ مفاتيح بوابتها في <a class="link-inline" href="{{ route('admin.settings') }}">الإعدادات</a>.</p>

<div class="panel table">
    @foreach ($methods as $method)
        <a href="{{ route('admin.payment-methods.edit', $method) }}" class="row">
            <span class="grow"><b>{{ $method->name['ar'] ?? $method->code }}</b><br>
                <small class="muted">{{ \App\Models\PaymentMethod::GATEWAYS[$method->gateway] }} ·
                    {{ collect($method->countries)->map(fn ($c) => \App\Models\PaymentMethod::REGIONS[$c] ?? $c)->join('، ') }}</small></span>
            @if (! $configured[$method->gateway])<span class="tag off">البوابة غير مفعّلة</span>
            @elseif ($method->gateway === 'paymob' && blank($method->gateway_option))<span class="tag off">ينقصها Integration ID</span>@endif
            @unless ($method->is_active)<span class="tag off">مخفية</span>@endunless
        </a>
    @endforeach
</div>
@endsection
