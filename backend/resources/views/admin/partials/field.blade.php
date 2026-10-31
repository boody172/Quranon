{{-- Simple text-like input. $name, $label, $value, optional $type, $hint, $attrs --}}
<label class="field">
    <span class="label">{{ $label }}</span>
    <input type="{{ $type ?? 'text' }}" name="{{ $name }}" value="{{ old($name, $value) }}" {!! $attrs ?? '' !!}>
    @isset($hint)<span class="muted small">{{ $hint }}</span>@endisset
    @error($name)<span class="error">{{ $message }}</span>@enderror
</label>
