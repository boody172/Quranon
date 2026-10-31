@extends('layouts.admin')
@section('title', 'ترجمة '.$language->name)

@section('content')
<div class="head">
    <h1>{{ $language->name }}</h1>
    @unless ($language->isBuiltIn())
        @include('admin.partials.delete', ['action' => route('admin.languages.destroy', $language)])
    @endunless
</div>

<form method="post" action="{{ route('admin.languages.update', $language) }}" class="form">
    @csrf @method('put')
    <div class="panel">
        <div class="grid">
            @include('admin.partials.field', ['name' => 'name', 'label' => 'الاسم', 'value' => $language->name, 'attrs' => 'required'])
            <label class="field">
                <span class="label">الاتجاه</span>
                <select name="dir">
                    <option value="ltr" @selected($language->dir === 'ltr')>من اليسار لليمين</option>
                    <option value="rtl" @selected($language->dir === 'rtl')>من اليمين لليسار</option>
                </select>
            </label>
        </div>
        @unless ($language->isBuiltIn())
            <label class="check"><input type="checkbox" name="is_active" value="1" @checked($language->is_active)> ظاهرة في التطبيق</label>
        @endunless
    </div>

    <div class="panel">
        <div class="head">
            <h2>النصوص</h2>
            <input type="search" placeholder="ابحث في النصوص" class="filter" data-filter>
        </div>
        <p class="muted small">اترك الحقل فارغاً لاستخدام النص الافتراضي.</p>
        <div class="strings">
            @foreach ($keys as $key)
                <label class="string" data-text="{{ $key }} {{ $english[$key] ?? '' }} {{ $arabic[$key] ?? '' }}">
                    <span class="ref"><code dir="ltr">{{ $key }}</code><span dir="ltr">{{ $english[$key] ?? '' }}</span><span dir="rtl">{{ $arabic[$key] ?? '' }}</span></span>
                    <input name="strings[{{ $key }}]" value="{{ old("strings.$key", $values[$key] ?? '') }}"
                           placeholder="{{ $bundled[$key] ?? '' }}" dir="{{ $language->dir }}">
                </label>
            @endforeach
        </div>
    </div>

    <div class="actions sticky"><button class="btn">حفظ</button></div>
</form>
<script nonce="{{ $cspNonce }}">
    document.querySelector('[data-filter]').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        document.querySelectorAll('.string').forEach((row) => { row.hidden = q && !row.dataset.text.toLowerCase().includes(q); });
    });
</script>
@endsection
