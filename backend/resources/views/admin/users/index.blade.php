@extends('layouts.admin')
@section('title', 'المستخدمون')

@section('content')
<h1>المستخدمون</h1>
<p class="muted">{{ number_format($users->total()) }} حساب.</p>

<div class="panel table">
    @forelse ($users as $user)
        <div class="row">
            <span class="avatar">{{ mb_substr($user->name, 0, 1) }}</span>
            <span class="grow">{{ $user->name }}<br><small class="muted" dir="ltr">{{ $user->email }}</small></span>
            <span class="muted small">{{ $user->saved_items_count }} محفوظ</span>
            <span class="muted small">{{ $user->created_at->format('Y/m/d') }}</span>
        </div>
    @empty
        <p class="muted">لا يوجد مستخدمون بعد.</p>
    @endforelse
</div>
{{ $users->links('admin.partials.pagination') }}
@endsection
