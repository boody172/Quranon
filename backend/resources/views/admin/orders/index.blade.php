@extends('layouts.admin')
@section('title', 'الطلبات')

@section('content')
<h1>الطلبات</h1>
<div class="filters">
    @foreach (['' => 'الكل', 'pending' => 'بانتظار الدفع', 'paid' => 'مدفوعة', 'failed' => 'فشلت'] as $key => $label)
        <a href="{{ route('admin.orders.index', array_filter(['status' => $key])) }}" @class(['chip', 'on' => ($status ?? '') === $key])>{{ $label }}</a>
    @endforeach
    <form class="search inline"><input type="search" name="q" value="{{ request('q') }}" placeholder="رقم الطلب QN-…" dir="ltr"></form>
</div>

<div class="panel table">
    @forelse ($orders as $order)
        <div class="row">
            <span class="grow"><b dir="ltr">{{ $order->reference }}</b> · {{ $order->user?->name }}<br>
                <small class="muted">{{ \App\Models\Plan::INTERVALS[$order->plan->interval ?? ''] ?? $order->plan?->slug }} ·
                    <span dir="ltr">{{ $order->currency }} {{ $order->amount }}</span> · {{ $order->payment_method }} · {{ $order->created_at->diffForHumans() }}</small></span>
            <span @class(['tag', 'off' => $order->status !== 'paid'])>{{ ['pending' => 'بانتظار الدفع', 'paid' => 'مدفوع', 'failed' => 'فشل', 'cancelled' => 'ملغي'][$order->status] }}</span>
            @if ($order->isPending() && $order->gateway === 'manual')
                <form method="post" action="{{ route('admin.orders.paid', $order) }}" data-confirm="تأكدت من وصول التحويل؟">@csrf<button class="btn small">تأكيد الدفع</button></form>
            @endif
            @if ($order->isPending())
                <form method="post" action="{{ route('admin.orders.cancel', $order) }}">@csrf<button class="btn ghost small">إلغاء</button></form>
            @endif
        </div>
    @empty
        <p class="muted" style="padding: 0 20px">لا توجد طلبات.</p>
    @endforelse
</div>
{{ $orders->links('admin.partials.pagination') }}
@endsection
