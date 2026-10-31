@extends('layouts.admin')
@section('title', 'الباقات')

@section('content')
<div class="head">
    <h1>باقات قرآنون بلس</h1>
    <a href="{{ route('admin.plans.create') }}" class="btn">إضافة باقة</a>
</div>
<div class="panel table">
    @foreach ($plans as $plan)
        <a href="{{ route('admin.plans.edit', $plan) }}" class="row">
            <span class="grow"><b>{{ \App\Models\Plan::INTERVALS[$plan->interval] }}</b> <small class="muted" dir="ltr">{{ $plan->slug }}</small><br>
                <small class="muted" dir="ltr">@foreach ($plan->prices as $currency => $price){{ $currency }} {{ $price }}@unless ($loop->last) · @endunless @endforeach</small></span>
            @if ($plan->is_highlighted)<span class="tag">الأوفر</span>@endif
            @unless ($plan->is_active)<span class="tag off">مخفية</span>@endunless
        </a>
    @endforeach
</div>
@endsection
