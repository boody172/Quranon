<?php

namespace App\Enums;

enum Country: string
{
    case Egypt = 'eg';
    case SaudiArabia = 'sa';
    case Kuwait = 'kw';
    case Sudan = 'sd';
    case Morocco = 'ma';
    case Yemen = 'ye';
    case Syria = 'sy';

    public function label(): string
    {
        return match ($this) {
            self::Egypt => 'مصر',
            self::SaudiArabia => 'السعودية',
            self::Kuwait => 'الكويت',
            self::Sudan => 'السودان',
            self::Morocco => 'المغرب',
            self::Yemen => 'اليمن',
            self::Syria => 'سوريا',
        };
    }

    /** @return array<string, string> */
    public static function options(): array
    {
        return collect(self::cases())->mapWithKeys(fn (self $c) => [$c->value => $c->label()])->all();
    }
}
