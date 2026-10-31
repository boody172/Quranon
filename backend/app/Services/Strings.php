<?php

namespace App\Services;

/**
 * The bundled app strings (i18n/*.json in the frontend). They define every translatable key;
 * the dashboard stores overrides and new languages in the database.
 */
class Strings
{
    public static function path(): string
    {
        return config('quranon.i18n_path');
    }

    /** @return array<string, string> */
    public static function bundled(string $code): array
    {
        $file = self::path()."/{$code}.json";

        return is_file($file) ? json_decode(file_get_contents($file), true, flags: JSON_THROW_ON_ERROR) : [];
    }

    /** @return list<string> */
    public static function keys(): array
    {
        return array_keys(self::bundled('en'));
    }
}
