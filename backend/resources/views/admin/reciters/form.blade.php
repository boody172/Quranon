@extends('layouts.admin')
@section('title', $reciter->exists ? 'تعديل قارئ' : 'قارئ جديد')

@section('content')
<div class="head">
    <h1>{{ $reciter->exists ? $reciter->name : 'قارئ جديد' }}</h1>
    @if ($reciter->exists)
        @include('admin.partials.delete', ['action' => route('admin.reciters.destroy', $reciter)])
    @endif
</div>

<form method="post" enctype="multipart/form-data" class="panel form"
      action="{{ $reciter->exists ? route('admin.reciters.update', $reciter) : route('admin.reciters.store') }}">
    @csrf
    @if ($reciter->exists) @method('put') @endif

    <div class="grid">
        @include('admin.partials.field', ['name' => 'name', 'label' => 'الاسم', 'value' => $reciter->name, 'attrs' => 'required'])
        @include('admin.partials.field', ['name' => 'mp3quran_id', 'label' => 'رقم القارئ في mp3quran', 'type' => 'number', 'value' => $reciter->mp3quran_id,
            'attrs' => 'required min="1" dir="ltr"', 'hint' => 'تجده في رابط صفحة القارئ داخل التطبيق: #/reciter/الرقم'])
        <label class="field">
            <span class="label">الدولة</span>
            <select name="country">
                <option value="">—</option>
                @foreach (\App\Enums\Country::options() as $value => $label)
                    <option value="{{ $value }}" @selected(old('country', $reciter->country?->value) === $value)>{{ $label }}</option>
                @endforeach
            </select>
        </label>
        @include('admin.partials.field', ['name' => 'sort', 'label' => 'الترتيب', 'type' => 'number', 'value' => $reciter->sort, 'attrs' => 'min="0" max="999" required'])
    </div>

    @include('admin.partials.image-field', ['name' => 'photo', 'label' => 'الصورة', 'current' => $reciter->imageUrl($reciter->photo_path)])

    <label class="check"><input type="checkbox" name="is_featured" value="1" @checked(old('is_featured', $reciter->is_featured))> يظهر في «أعلام التلاوة»</label>
    <label class="check"><input type="checkbox" name="is_late" value="1" @checked(old('is_late', $reciter->is_late))> متوفى (يظهر بجانب اسمه «رحمه الله»)</label>

    <div class="actions">
        <button class="btn">حفظ</button>
        <a href="{{ route('admin.reciters.index') }}" class="btn ghost">إلغاء</a>
    </div>
</form>
@endsection
