@extends('layouts.admin')
@section('title', $feature->exists ? 'تعديل ميزة' : 'ميزة جديدة')

@section('content')
<div class="head">
    <h1>{{ $feature->exists ? 'تعديل: '.$feature->label() : 'ميزة جديدة' }}</h1>
    @if ($feature->exists)
        @include('admin.partials.delete', ['action' => route('admin.features.destroy', $feature)])
    @endif
</div>

<form method="post" enctype="multipart/form-data" class="panel form"
      action="{{ $feature->exists ? route('admin.features.update', $feature) : route('admin.features.store') }}">
    @csrf
    @if ($feature->exists) @method('put') @endif

    <div class="grid">
        @include('admin.partials.field', ['name' => 'link', 'label' => 'يفتح على', 'value' => $feature->link, 'attrs' => 'required dir="ltr"',
            'hint' => 'صفحة داخلية مثل #/listen أو #/surah/36، أو رابط خارجي يبدأ بـ https://'])
        @include('admin.partials.field', ['name' => 'slug', 'label' => 'معرّف داخلي (إنجليزي)', 'value' => $feature->slug, 'attrs' => 'required dir="ltr" pattern="[A-Za-z0-9_-]+"'])
    </div>

    <div class="grid">
        @include('admin.partials.translatable', ['name' => 'title', 'label' => 'العنوان', 'value' => $feature->title])
        @include('admin.partials.translatable', ['name' => 'subtitle', 'label' => 'سطر وصف قصير', 'value' => $feature->subtitle, 'required' => false])
    </div>

    <div class="grid">
        <label class="field">
            <span class="label">الرسمة</span>
            <select name="art">
                <option value="">بدون رسمة (استخدم صورة)</option>
                @foreach (\App\Models\Feature::ARTS as $key => $label)
                    <option value="{{ $key }}" @selected(old('art', $feature->art) === $key)>{{ $label }}</option>
                @endforeach
            </select>
        </label>
        @include('admin.partials.field', ['name' => 'tint', 'label' => 'لون الخلفية', 'type' => 'color', 'value' => $feature->tint ?? '#e6f4f1'])
        @include('admin.partials.field', ['name' => 'ink', 'label' => 'لون الرسمة والزر', 'type' => 'color', 'value' => $feature->ink ?? '#0f766e'])
        @include('admin.partials.field', ['name' => 'sort', 'label' => 'الترتيب', 'type' => 'number', 'value' => $feature->sort, 'attrs' => 'min="0" max="999" required'])
    </div>

    @include('admin.partials.image-field', ['name' => 'image', 'label' => 'صورة البطاقة (اختياري — تحل محل الرسمة)', 'current' => $feature->imageUrl($feature->image_path)])

    <label class="check"><input type="checkbox" name="is_active" value="1" @checked(old('is_active', $feature->is_active))> ظاهرة في التطبيق</label>

    <div class="actions">
        <button class="btn">حفظ</button>
        <a href="{{ route('admin.features.index') }}" class="btn ghost">إلغاء</a>
    </div>
</form>
@endsection
