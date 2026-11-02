@extends('layouts.admin')
@section('title', $scholar->exists ? 'تعديل' : 'إضافة عالم')

@section('content')
<div class="head">
    <h1>{{ $scholar->exists ? $scholar->label() : 'إضافة عالم' }}</h1>
    @if ($scholar->exists)
        @include('admin.partials.delete', ['action' => route('admin.scholars.destroy', $scholar)])
    @endif
</div>

<form method="post" enctype="multipart/form-data" class="panel form"
      action="{{ $scholar->exists ? route('admin.scholars.update', $scholar) : route('admin.scholars.store') }}">
    @csrf
    @if ($scholar->exists) @method('put') @endif

    <div class="grid">
        @include('admin.partials.translatable', ['name' => 'name', 'label' => 'الاسم', 'value' => $scholar->name])
        @include('admin.partials.translatable', ['name' => 'topic', 'label' => 'المجال', 'value' => $scholar->topic])
        <label class="field">
            <span class="label">الدولة</span>
            <select name="country" required>
                @foreach (\App\Enums\Country::options() as $value => $label)
                    <option value="{{ $value }}" @selected(old('country', $scholar->country?->value) === $value)>{{ $label }}</option>
                @endforeach
            </select>
        </label>
        @include('admin.partials.field', ['name' => 'sort', 'label' => 'الترتيب', 'type' => 'number', 'value' => $scholar->sort, 'attrs' => 'min="0" max="999" required'])
    </div>
    <fieldset class="field">
        <legend class="label">مصدر الدروس الصوتية (تُشغَّل داخل التطبيق بالترتيب)</legend>
        <select name="lessons_source" data-lesson-source>
            @foreach (\App\Models\Scholar::SOURCES as $key => $label)
                <option value="{{ $key }}" @selected(old('lessons_source', $scholar->lessons_source ?? 'islamhouse') === $key)>{{ $label }}</option>
            @endforeach
        </select>
    </fieldset>
    <div data-source-panel="ref">
        @include('admin.partials.field', ['name' => 'lessons_ref', 'label' => 'رقم الشيخ أو معرّف المجموعة', 'value' => $scholar->lessons_ref, 'attrs' => 'dir="ltr"',
            'hint' => 'IslamHouse: الرقم في رابط صفحة الشيخ (مثال 6842). Internet Archive: الجزء بعد /details/ في الرابط.'])
    </div>
    <label class="field" data-source-panel="manual">
        <span class="label">الدروس — درس في كل سطر</span>
        <textarea name="lessons_text" rows="6" dir="auto" placeholder="الدرس الأول | https://example.com/lesson-1.mp3">{{ old('lessons_text', collect($scholar->lessons ?? [])->map(fn ($l) => $l['title'].' | '.$l['url'])->implode("\n")) }}</textarea>
        @error('lessons_text')<span class="error">{{ $message }}</span>@enderror
    </label>
    <script nonce="{{ $cspNonce }}">
        (() => {
            const select = document.querySelector('[data-lesson-source]');
            const sync = () => document.querySelectorAll('[data-source-panel]').forEach((el) => {
                el.hidden = (el.dataset.sourcePanel === 'manual') !== (select.value === 'manual');
            });
            select.addEventListener('change', sync);
            sync();
        })();
    </script>
    @include('admin.partials.image-field', ['name' => 'photo', 'label' => 'الصورة', 'current' => $scholar->imageUrl($scholar->photo_path)])

    <label class="check"><input type="checkbox" name="is_late" value="1" @checked(old('is_late', $scholar->is_late))> متوفى</label>
    <label class="check"><input type="checkbox" name="is_active" value="1" @checked(old('is_active', $scholar->is_active))> ظاهر في التطبيق</label>

    <div class="actions">
        <button class="btn">حفظ</button>
        <a href="{{ route('admin.scholars.index') }}" class="btn ghost">إلغاء</a>
    </div>
</form>
@endsection
