@extends('layouts.admin')
@section('title', 'القرّاء')

@section('content')
<div class="head">
    <h1>القرّاء</h1>
    <a href="{{ route('admin.reciters.create') }}" class="btn">إضافة قارئ</a>
</div>
<p class="muted">الصوت يأتي من mp3quran.net. هنا تضيف الصورة والدولة وتختار من يظهر في «أعلام التلاوة».</p>

<form class="search"><input type="search" name="q" value="{{ request('q') }}" placeholder="ابحث بالاسم"></form>

<div class="panel table">
    @forelse ($reciters as $reciter)
        <a href="{{ route('admin.reciters.edit', $reciter) }}" class="row">
            @if ($reciter->photo_path)
                <img src="{{ $reciter->imageUrl($reciter->photo_path) }}" alt="" class="avatar" loading="lazy">
            @else
                <span class="avatar">{{ mb_substr($reciter->name, 0, 1) }}</span>
            @endif
            <span class="grow">{{ $reciter->name }}</span>
            <span class="muted">{{ $reciter->country?->label() }}</span>
            @if ($reciter->is_featured)<span class="tag">مميز</span>@endif
        </a>
    @empty
        <p class="muted">لم تُضف أي بيانات للقرّاء بعد.</p>
    @endforelse
</div>
{{ $reciters->links('admin.partials.pagination') }}
@endsection
