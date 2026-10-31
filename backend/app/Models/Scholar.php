<?php

namespace App\Models;

use App\Concerns\FlushesAppConfig;
use App\Concerns\HasPublicImage;
use App\Enums\Country;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'topic', 'country', 'is_late', 'url', 'photo_path', 'sort', 'is_active'])]
class Scholar extends Model
{
    use FlushesAppConfig, HasPublicImage;

    protected function casts(): array
    {
        return [
            'name' => 'array',
            'topic' => 'array',
            'country' => Country::class,
            'is_late' => 'boolean',
            'is_active' => 'boolean',
            'sort' => 'integer',
        ];
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort')->orderBy('id');
    }

    public function label(): string
    {
        return $this->name['ar'] ?? collect($this->name)->first() ?? '';
    }

    public function toAppArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'topic' => $this->topic,
            'country' => $this->country->value,
            'late' => $this->is_late,
            'url' => $this->url,
            'photo' => $this->imageUrl($this->photo_path),
        ];
    }
}
