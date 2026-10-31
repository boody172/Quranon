@extends('layouts.admin')
@section('title', 'اللغات')

@section('content')
<div class="head">
    <h1>اللغات والترجمة</h1>
    <a href="{{ route('admin.languages.create') }}" class="btn">إضافة لغة</a>
</div>
<p class="muted">العربية والإنجليزية مدمجتان في التطبيق. يمكنك تعديل أي نص فيهما، أو إضافة لغة جديدة وترجمتها هنا.</p>

<div class="panel table">
    @foreach ($languages as $language)
        <a href="{{ route('admin.languages.edit', $language) }}" class="row">
            <span class="avatar">{{ strtoupper($language->code) }}</span>
            <span class="grow">{{ $language->name }}<br>
                <small class="muted">
                    @if ($language->isBuiltIn())
                        مدمجة · {{ $language->translations_count }} نص معدّل
                    @else
                        {{ $language->translations_count }} من {{ $total }} نص مترجم
                    @endif
                </small>
            </span>
            <span class="tag {{ $language->is_active ? '' : 'off' }}">{{ $language->is_active ? 'ظاهرة' : 'مخفية' }}</span>
        </a>
    @endforeach
</div>
@endsection
