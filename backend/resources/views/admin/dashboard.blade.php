@extends('layouts.admin')

@section('content')
<h1>أهلاً، {{ auth()->user()->name }}</h1>
<p class="muted">أي تعديل هنا يظهر في التطبيق خلال دقيقة. لإشعار كل المستخدمين بالتحديث استخدم «نشر تحديث» من <a href="{{ route('admin.settings') }}" class="link-inline">الإعدادات</a>.</p>

<div class="stats">
    @foreach ($stats as $stat)
        <a href="{{ route($stat['route']) }}" class="panel stat">
            <strong>{{ number_format($stat['value']) }}</strong>
            <span>{{ $stat['label'] }}</span>
        </a>
    @endforeach
</div>

<section class="panel">
    <h2>آخر المسجّلين</h2>
    @forelse ($latestUsers as $user)
        <div class="line"><span>{{ $user->name }}</span><span class="muted">{{ $user->created_at->diffForHumans() }}</span></div>
    @empty
        <p class="muted">لا يوجد مستخدمون بعد.</p>
    @endforelse
    <p class="muted small">إجمالي العناصر المحفوظة عند المستخدمين: {{ number_format($savedCount) }}</p>
</section>
@endsection
