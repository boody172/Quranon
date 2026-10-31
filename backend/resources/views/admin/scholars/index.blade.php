@extends('layouts.admin')
@section('title', 'العلماء')

@section('content')
<div class="head">
    <h1>العلماء والدروس</h1>
    <a href="{{ route('admin.scholars.create') }}" class="btn">إضافة</a>
</div>

<div class="panel table">
    @foreach ($scholars as $scholar)
        <a href="{{ route('admin.scholars.edit', $scholar) }}" class="row">
            @if ($scholar->photo_path)
                <img src="{{ $scholar->imageUrl($scholar->photo_path) }}" alt="" class="avatar" loading="lazy">
            @else
                <span class="avatar">{{ mb_substr($scholar->label(), 0, 1) }}</span>
            @endif
            <span class="grow">{{ $scholar->label() }}<br><small class="muted">{{ $scholar->topic['ar'] ?? '' }}</small></span>
            <span class="muted">{{ $scholar->country->label() }}</span>
            @unless ($scholar->is_active)<span class="tag off">مخفي</span>@endunless
        </a>
    @endforeach
</div>
@endsection
