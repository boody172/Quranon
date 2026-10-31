@extends('layouts.admin')
@section('title', 'تسجيل الدخول')

@section('content')
<form method="post" action="{{ route('admin.login') }}" class="panel login">
    @csrf
    <h1>تسجيل الدخول</h1>
    <p class="muted">هذه الصفحة لمدير التطبيق فقط.</p>

    <label>البريد الإلكتروني
        <input type="email" name="email" value="{{ old('email') }}" required autofocus autocomplete="username">
    </label>
    <label>كلمة المرور
        <input type="password" name="password" required autocomplete="current-password">
    </label>
    @error('email')<p class="error">{{ $message }}</p>@enderror
    <label class="check"><input type="checkbox" name="remember" value="1"> تذكّرني على هذا الجهاز</label>
    <button class="btn">دخول</button>
</form>
@endsection
