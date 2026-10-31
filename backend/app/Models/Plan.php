<?php

namespace App\Models;

use App\Concerns\FlushesAppConfig;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

#[Fillable(['slug', 'interval', 'prices', 'is_highlighted', 'is_active', 'sort'])]
class Plan extends Model
{
    use FlushesAppConfig;

    public const CURRENCIES = ['EGP', 'SAR', 'USD'];

    public const INTERVALS = ['month' => 'شهري', 'year' => 'سنوي', 'lifetime' => 'مدى الحياة'];

    protected function casts(): array
    {
        return ['prices' => 'array', 'is_highlighted' => 'boolean', 'is_active' => 'boolean', 'sort' => 'integer'];
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true)->orderBy('sort')->orderBy('id');
    }

    public function priceIn(string $currency): ?float
    {
        $price = $this->prices[$currency] ?? null;

        return $price === null ? null : (float) $price;
    }

    /** New expiry when this plan is bought, extending any time the user still has. */
    public function extend(?Carbon $current): Carbon
    {
        $from = $current && $current->isFuture() ? $current->copy() : now();

        return match ($this->interval) {
            'month' => $from->addMonthNoOverflow(),
            'year' => $from->addYearNoOverflow(),
            default => Carbon::create(2100),
        };
    }

    public function toAppArray(): array
    {
        return [
            'slug' => $this->slug,
            'interval' => $this->interval,
            'prices' => array_map('floatval', $this->prices),
            'highlighted' => $this->is_highlighted,
        ];
    }
}
