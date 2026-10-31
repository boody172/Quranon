<?php

namespace App\Http\Requests\Admin;

use App\Models\Language;

/**
 * Validation for fields stored as { "ar": "...", "en": "...", ... }.
 * Arabic and English are required; any other active language is optional.
 */
trait TranslatableFields
{
    protected function translatable(string $field, int $max, bool $required = true): array
    {
        $rules = [$field => [$required ? 'required' : 'nullable', 'array']];

        foreach (Language::activeCodes() as $code) {
            $mustFill = $required && in_array($code, Language::BUILT_IN, true);
            $rules["{$field}.{$code}"] = [$mustFill ? 'required' : 'nullable', 'string', "max:{$max}"];
        }

        return $rules;
    }

    /** Drops empty translations so the app falls back to English instead of showing a blank. */
    protected function cleanTranslations(array $data, string ...$fields): array
    {
        foreach ($fields as $field) {
            if (isset($data[$field])) {
                $data[$field] = array_filter($data[$field], fn ($v) => filled($v)) ?: null;
            }
        }

        return $data;
    }
}
