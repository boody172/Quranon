<?php

namespace App\Http\Requests\Admin;

use App\Models\Feature;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class FeatureRequest extends FormRequest
{
    use TranslatableFields;

    public function rules(): array
    {
        return [
            'slug' => ['required', 'alpha_dash:ascii', 'max:60', Rule::unique('features')->ignore($this->route('feature'))],
            ...$this->translatable('title', 60),
            ...$this->translatable('subtitle', 120, required: false),
            'link' => ['required', 'string', 'max:255', 'regex:/^(#\/|https:\/\/)/'],
            'art' => ['nullable', Rule::in(array_keys(Feature::ARTS))],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'remove_image' => ['boolean'],
            'tint' => ['required', 'hex_color'],
            'ink' => ['required', 'hex_color'],
            'sort' => ['required', 'integer', 'min:0', 'max:999'],
            'is_active' => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return ['link.regex' => 'الرابط لازم يبدأ بـ #/ (صفحة داخل التطبيق) أو https:// (رابط خارجي).'];
    }

    public function payload(): array
    {
        return $this->cleanTranslations($this->safe()->except(['image', 'remove_image']), 'subtitle');
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'is_active' => $this->boolean('is_active'),
            'remove_image' => $this->boolean('remove_image'),
        ]);
    }
}
