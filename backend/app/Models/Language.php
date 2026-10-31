<?php

namespace App\Models;

use App\Concerns\FlushesAppConfig;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['code', 'name', 'dir', 'is_active', 'sort'])]
class Language extends Model
{
    use FlushesAppConfig;

    /** Languages whose strings ship with the app (i18n/*.json). */
    public const BUILT_IN = ['ar', 'en'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'sort' => 'integer'];
    }

    public function translations(): HasMany
    {
        return $this->hasMany(Translation::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true)->orderBy('sort')->orderBy('id');
    }

    public function isBuiltIn(): bool
    {
        return in_array($this->code, self::BUILT_IN, true);
    }

    /** Codes of every active language, used to build per-language form fields. */
    public static function activeCodes(): array
    {
        return static::active()->pluck('code')->all() ?: self::BUILT_IN;
    }
}
