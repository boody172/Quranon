<?php

namespace App\Models;

use App\Concerns\FlushesAppConfig;
use App\Concerns\HasPublicImage;
use App\Enums\Country;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['mp3quran_id', 'name', 'country', 'is_late', 'is_featured', 'photo_path', 'sort'])]
class Reciter extends Model
{
    use FlushesAppConfig, HasPublicImage;

    protected function casts(): array
    {
        return [
            'country' => Country::class,
            'is_late' => 'boolean',
            'is_featured' => 'boolean',
            'mp3quran_id' => 'integer',
            'sort' => 'integer',
        ];
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderByDesc('is_featured')->orderBy('sort')->orderBy('name');
    }

    public function toAppArray(): array
    {
        return [
            'id' => $this->mp3quran_id,
            'country' => $this->country?->value,
            'late' => $this->is_late,
            'featured' => $this->is_featured,
            'photo' => $this->imageUrl($this->photo_path),
        ];
    }
}
