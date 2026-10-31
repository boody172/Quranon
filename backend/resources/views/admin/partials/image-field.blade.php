{{-- $name: input name, $current: public url or null, $label --}}
<div class="field">
    <span class="label">{{ $label }}</span>
    <div class="image-field">
        <img src="{{ $current ?? '' }}" alt="" @class(['empty' => ! $current]) data-preview>
        <div>
            <input type="file" name="{{ $name }}" accept="image/*" data-preview-input>
            <p class="muted small">JPG أو PNG أو WebP حتى 4 ميجا. تُضغط تلقائياً لتصبح خفيفة.</p>
            @if ($current)
                <label class="check"><input type="checkbox" name="remove_{{ $name }}" value="1"> حذف الصورة الحالية</label>
            @endif
        </div>
    </div>
    @error($name)<p class="error">{{ $message }}</p>@enderror
</div>
<script nonce="{{ $cspNonce }}">
    document.querySelectorAll('[data-preview-input]').forEach((input) => {
        input.onchange = () => {
            const img = input.closest('.image-field').querySelector('[data-preview]');
            if (input.files[0]) { img.src = URL.createObjectURL(input.files[0]); img.classList.remove('empty'); }
        };
    });
</script>
