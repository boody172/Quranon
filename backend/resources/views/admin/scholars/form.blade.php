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
    @include('admin.partials.field', ['name' => 'url', 'label' => 'رابط الدروس', 'type' => 'url', 'value' => $scholar->url, 'attrs' => 'dir="ltr" placeholder="https://"', 'hint' => 'قناة يوتيوب أو قائمة تشغيل'])
    @include('admin.partials.image-field', ['name' => 'photo', 'label' => 'الصورة', 'current' => $scholar->imageUrl($scholar->photo_path)])

    <label class="check"><input type="checkbox" name="is_late" value="1" @checked(old('is_late', $scholar->is_late))> متوفى</label>
    <label class="check"><input type="checkbox" name="is_active" value="1" @checked(old('is_active', $scholar->is_active))> ظاهر في التطبيق</label>

    <div class="actions">
        <button class="btn">حفظ</button>
        <a href="{{ route('admin.scholars.index') }}" class="btn ghost">إلغاء</a>
    </div>
</form>
@endsection
