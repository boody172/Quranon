@extends('layouts.admin')
@section('title', 'باقة')

@section('content')
<div class="head">
    <h1>{{ $plan->exists ? 'تعديل الباقة' : 'باقة جديدة' }}</h1>
    @if ($plan->exists) @include('admin.partials.delete', ['action' => route('admin.plans.destroy', $plan)]) @endif
</div>
<form method="post" action="{{ $plan->exists ? route('admin.plans.update', $plan) : route('admin.plans.store') }}" class="panel form">
    @csrf @if ($plan->exists) @method('put') @endif
    <div class="grid">
        @include('admin.partials.field', ['name' => 'slug', 'label' => 'المعرّف (إنجليزي)', 'value' => $plan->slug, 'attrs' => 'required dir="ltr"'])
        <label class="field"><span class="label">المدة</span>
            <select name="interval">@foreach (\App\Models\Plan::INTERVALS as $key => $label)<option value="{{ $key }}" @selected(old('interval', $plan->interval) === $key)>{{ $label }}</option>@endforeach</select></label>
        @include('admin.partials.field', ['name' => 'sort', 'label' => 'الترتيب', 'type' => 'number', 'value' => $plan->sort, 'attrs' => 'required min="0"'])
    </div>
    <div class="grid">
        @foreach (\App\Models\Plan::CURRENCIES as $currency)
            @include('admin.partials.field', ['name' => "prices[$currency]", 'label' => "السعر بـ $currency", 'type' => 'number', 'value' => $plan->prices[$currency] ?? '', 'attrs' => 'required step="0.01" min="0.5" dir="ltr"'])
            @error("prices.$currency")<span class="error">{{ $message }}</span>@enderror
        @endforeach
    </div>
    <label class="check"><input type="checkbox" name="is_highlighted" value="1" @checked(old('is_highlighted', $plan->is_highlighted))> تمييزها بشارة «الأوفر»</label>
    <label class="check"><input type="checkbox" name="is_active" value="1" @checked(old('is_active', $plan->is_active))> ظاهرة في التطبيق</label>
    <div class="actions"><button class="btn">حفظ</button><a href="{{ route('admin.plans.index') }}" class="btn ghost">إلغاء</a></div>
</form>
@endsection
