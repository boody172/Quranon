{{-- One input per active language for a JSON field. $name, $label, $value (array|null), optional $textarea, $required --}}
@php($codes = \App\Models\Language::activeCodes())
<fieldset class="field translatable">
    <legend class="label">{{ $label }}</legend>
    @foreach ($codes as $code)
        @php($isRequired = ($required ?? true) && in_array($code, \App\Models\Language::BUILT_IN, true))
        <label class="lang-input">
            <span class="code">{{ strtoupper($code) }}</span>
            @if ($textarea ?? false)
                <textarea name="{{ $name }}[{{ $code }}]" rows="3" dir="auto" @required($isRequired)>{{ old("{$name}.{$code}", $value[$code] ?? '') }}</textarea>
            @else
                <input name="{{ $name }}[{{ $code }}]" value="{{ old("{$name}.{$code}", $value[$code] ?? '') }}" dir="auto" @required($isRequired)>
            @endif
        </label>
        @error("{$name}.{$code}")<span class="error">{{ $message }}</span>@enderror
    @endforeach
</fieldset>
