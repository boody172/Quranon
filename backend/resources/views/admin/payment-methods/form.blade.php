@extends('layouts.admin')
@section('title', 'طريقة دفع')

@section('content')
<div class="head">
    <h1>{{ $method->exists ? ($method->name['ar'] ?? $method->code) : 'طريقة دفع جديدة' }}</h1>
    @if ($method->exists) @include('admin.partials.delete', ['action' => route('admin.payment-methods.destroy', $method)]) @endif
</div>
<form method="post" action="{{ $method->exists ? route('admin.payment-methods.update', $method) : route('admin.payment-methods.store') }}" class="panel form">
    @csrf @if ($method->exists) @method('put') @endif
    <div class="grid">
        @include('admin.partials.field', ['name' => 'code', 'label' => 'المعرّف (إنجليزي)', 'value' => $method->code, 'attrs' => 'required dir="ltr"'])
        <label class="field"><span class="label">البوابة</span>
            <select name="gateway">@foreach (\App\Models\PaymentMethod::GATEWAYS as $key => $label)<option value="{{ $key }}" @selected(old('gateway', $method->gateway) === $key)>{{ $label }}</option>@endforeach</select></label>
        @include('admin.partials.field', ['name' => 'gateway_option', 'label' => 'Paymob Integration ID', 'value' => $method->gateway_option, 'attrs' => 'dir="ltr" inputmode="numeric"', 'hint' => 'من لوحة Paymob ← Developers ← Payment Integrations'])
        @include('admin.partials.field', ['name' => 'sort', 'label' => 'الترتيب', 'type' => 'number', 'value' => $method->sort, 'attrs' => 'required min="0"'])
    </div>
    @include('admin.partials.translatable', ['name' => 'name', 'label' => 'الاسم الظاهر', 'value' => $method->name])
    <fieldset class="field"><legend class="label">متاحة في</legend>
        @foreach (\App\Models\PaymentMethod::REGIONS as $code => $label)
            <label class="check"><input type="checkbox" name="countries[]" value="{{ $code }}" @checked(in_array($code, old('countries', $method->countries ?? []), true))> {{ $label }}</label>
        @endforeach
        @error('countries')<span class="error">{{ $message }}</span>@enderror
    </fieldset>
    @include('admin.partials.translatable', ['name' => 'instructions', 'label' => 'تعليمات الدفع (للطرق اليدوية مثل إنستاباي)', 'value' => $method->instructions, 'textarea' => true, 'required' => false])
    <label class="check"><input type="checkbox" name="is_active" value="1" @checked(old('is_active', $method->is_active))> مفعّلة</label>
    <div class="actions"><button class="btn">حفظ</button><a href="{{ route('admin.payment-methods.index') }}" class="btn ghost">إلغاء</a></div>
</form>
@endsection
