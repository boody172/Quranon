<?php

namespace App\Models;

use App\Concerns\FlushesAppConfig;
use App\Concerns\HasPublicImage;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['slug', 'title', 'subtitle', 'link', 'art', 'image_path', 'tint', 'ink', 'sort', 'is_active'])]
class Feature extends Model
{
    use FlushesAppConfig, HasPublicImage;

    /** Built-in illustrations the app ships with (see js/art.js). */
    public const ARTS = [
        'qibla' => 'القبلة (بوصلة حيّة)',
        'listen' => 'سماعة',
        'mushaf' => 'مصحف',
        'radio' => 'برج بث',
        'lessons' => 'مسجد',
        'fav' => 'قلب',
        'kahf' => 'كهف وهلال',
        'search' => 'بحث',
    ];

    protected function casts(): array
    {
        return ['title' => 'array', 'subtitle' => 'array', 'is_active' => 'boolean', 'sort' => 'integer'];
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort')->orderBy('id');
    }

    /** Title in the dashboard's language (Arabic first). */
    public function label(): string
    {
        return $this->title['ar'] ?? collect($this->title)->first() ?? $this->slug;
    }

    public function toAppArray(): array
    {
        return [
            'slug' => $this->slug,
            'title' => $this->title,
            'subtitle' => $this->subtitle,
            'link' => $this->link,
            'art' => $this->art,
            'image' => $this->imageUrl($this->image_path),
            'tint' => $this->tint,
            'ink' => $this->ink,
        ];
    }
}
