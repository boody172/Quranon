@extends('layouts.admin')
@section('title', 'المميزات')

@section('content')
<div class="head">
    <h1>المميزات</h1>
    <a href="{{ route('admin.features.create') }}" class="btn">إضافة ميزة</a>
</div>
<p class="muted">هذه هي البطاقات الكبيرة في الشاشة الرئيسية، بنفس الترتيب.</p>

<div class="cards">
    @foreach ($features as $feature)
        <a href="{{ route('admin.features.edit', $feature) }}" class="feature" style="--tint: {{ $feature->tint }}; --ink: {{ $feature->ink }}">
            @if ($feature->image_path)
                <img src="{{ $feature->imageUrl($feature->image_path) }}" alt="" loading="lazy">
            @endif
            <span class="order">{{ $feature->sort }}</span>
            <strong>{{ $feature->label() }}</strong>
            <span>{{ $feature->subtitle['ar'] ?? '' }}</span>
            @unless ($feature->is_active)<em class="pill-off">مخفية</em>@endunless
        </a>
    @endforeach
</div>
@endsection
