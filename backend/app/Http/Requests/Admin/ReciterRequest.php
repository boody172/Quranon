<?php

namespace App\Http\Requests\Admin;

use App\Enums\Country;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReciterRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'mp3quran_id' => ['required', 'integer', 'min:1', Rule::unique('reciters')->ignore($this->route('reciter'))],
            'name' => ['required', 'string', 'max:120'],
            'country' => ['nullable', Rule::enum(Country::class)],
            'is_late' => ['boolean'],
            'is_featured' => ['boolean'],
            'photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'remove_photo' => ['boolean'],
            'sort' => ['required', 'integer', 'min:0', 'max:999'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'is_late' => $this->boolean('is_late'),
            'is_featured' => $this->boolean('is_featured'),
            'remove_photo' => $this->boolean('remove_photo'),
        ]);
    }
}
