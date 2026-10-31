<!doctype html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>@yield('title', 'لوحة التحكم') — قرآنون</title>
    <link rel="stylesheet" href="{{ asset('assets/admin/admin.css') }}">
</head>
<body>
@auth
    <header class="bar">
        <a href="{{ route('admin.dashboard') }}" class="logo">قرآنون <span>لوحة التحكم</span></a>
        <nav>
            @foreach ([
                'admin.features.index' => 'المميزات',
                'admin.reciters.index' => 'القرّاء',
                'admin.scholars.index' => 'العلماء',
                'admin.languages.index' => 'اللغات',
                'admin.plans.index' => 'الباقات',
                'admin.payment-methods.index' => 'الدفع',
                'admin.orders.index' => 'الطلبات',
                'admin.users.index' => 'المستخدمون',
                'admin.settings' => 'الإعدادات',
            ] as $route => $label)
                <a href="{{ route($route) }}" @class(['on' => request()->routeIs(str_replace('.index', '.*', $route))])>{{ $label }}</a>
            @endforeach
        </nav>
        <form method="post" action="{{ route('admin.logout') }}">@csrf<button class="link">خروج</button></form>
    </header>
@endauth

<main class="page">
    @if (session('status'))
        <p class="flash">{{ session('status') }}</p>
    @endif
    @yield('content')
</main>
<script nonce="{{ $cspNonce }}">
    // Destructive actions ask first. (No inline handlers: they are blocked by the CSP.)
    document.addEventListener('submit', (e) => {
        const message = e.target.dataset.confirm;
        if (message && !confirm(message)) e.preventDefault();
    });
</script>
</body>
</html>
