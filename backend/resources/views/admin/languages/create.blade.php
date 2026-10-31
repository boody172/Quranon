@extends('layouts.admin')
@section('title', 'لغة جديدة')

@section('content')
<h1>لغة جديدة</h1>
<form method="post" action="{{ route('admin.languages.store') }}" class="panel form">
    @csrf
    <div class="grid">
        @include('admin.partials.field', ['name' => 'name', 'label' => 'اسم اللغة كما يراه المستخدم', 'value' => '', 'attrs' => 'required placeholder="Français"'])
        @include('admin.partials.field', ['name' => 'code', 'label' => 'الرمز', 'value' => '', 'attrs' => 'required dir="ltr" placeholder="fr"', 'hint' => 'رمز ISO من حرفين: fr, ur, tr, id…'])
        <label class="field">
            <span class="label">اتجاه الكتابة</span>
            <select name="dir">
                <option value="ltr">من اليسار لليمين</option>
                <option value="rtl">من اليمين لليسار</option>
            </select>
        </label>
    </div>
    <div class="actions"><button class="btn">متابعة للترجمة</button></div>
</form>
@endsection
