<?php

namespace App\Http\Requests\Admin;

use App\Enums\Country;
use App\Models\Scholar;
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
            'lessons_source' => ['required', Rule::in(array_keys(Scholar::SOURCES))],
            'lessons_ref' => [Rule::requiredIf(fn () => $this->input('lessons_source') !== 'manual'), 'nullable', 'string', 'max:191', 'regex:/^[A-Za-z0-9._-]+$/'],
            'lessons_text' => [Rule::requiredIf(fn () => $this->input('lessons_source') === 'manual'), 'nullable', 'string', 'max:20000'],
            'photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'remove_photo' => ['boolean'],
            'sort' => ['required', 'integer', 'min:0', 'max:999'],
            'is_active' => ['boolean'],
        ];
    }

    public function payload(): array
    {
        $data = $this->cleanTranslations($this->safe()->except(['photo', 'remove_photo', 'lessons_text']), 'name', 'topic');
        $data['lessons'] = $data['lessons_source'] === 'manual' ? $this->parsedLessons() : null;

        return $data;
    }

    /** "Title | https://…/file.mp3" per line → [{ title, url }]. */
    public function parsedLessons(): array
    {
        return collect(preg_split('/\R/u', (string) $this->input('lessons_text')))
            ->map(fn ($line) => array_map('trim', explode('|', $line, 2)))
            ->filter(fn ($parts) => count($parts) === 2 && filter_var($parts[1], FILTER_VALIDATE_URL) && str_starts_with($parts[1], 'https://'))
            ->map(fn ($parts) => ['title' => mb_substr($parts[0], 0, 160), 'url' => $parts[1]])
            ->values()
            ->all();
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if ($this->input('lessons_source') === 'manual' && $this->parsedLessons() === []) {
                $validator->errors()->add('lessons_text', 'اكتب درساً واحداً على الأقل بالشكل: العنوان | https://رابط-الملف.mp3');
            }
        });
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
