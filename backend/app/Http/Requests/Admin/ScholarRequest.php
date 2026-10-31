<?php

namespace App\Http\Requests\Admin;

use App\Enums\Country;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ScholarRequest extends FormRequest
{
    use TranslatableFields;

    public function rules(): array
    {
        return [
            ...$this->translatable('name', 120),
            ...$this->translatable('topic', 160),
            'country' => ['required', Rule::enum(Country::class)],
            'is_late' => ['boolean'],
            'url' => ['nullable', 'url:https', 'max:255'],
            'photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'remove_photo' => ['boolean'],
            'sort' => ['required', 'integer', 'min:0', 'max:999'],
            'is_active' => ['boolean'],
        ];
    }

    public function payload(): array
    {
        return $this->cleanTranslations($this->safe()->except(['photo', 'remove_photo']), 'name', 'topic');
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'is_late' => $this->boolean('is_late'),
            'is_active' => $this->boolean('is_active'),
            'remove_photo' => $this->boolean('remove_photo'),
        ]);
    }
}
