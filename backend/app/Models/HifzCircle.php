<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Str;

class HifzCircle extends Model
{
    public const MAX_MEMBERS = 100;

    protected $fillable = ['name', 'surah', 'from_ayah', 'to_ayah', 'per_day', 'starts_on'];

    protected function casts(): array
    {
        return ['starts_on' => 'date'];
    }

    protected static function booted(): void
    {
        static::creating(function (HifzCircle $circle) {
            // Short, easy to read aloud or type: no 0/O or 1/I.
            do {
                $code = collect(range(1, 6))->map(fn () => Str::of('ABCDEFGHJKLMNPQRSTUVWXYZ23456789')->charAt(random_int(0, 31)))->join('');
            } while (static::where('code', $code)->exists());
            $circle->code = $code;
        });
    }

    public function getRouteKeyName(): string
    {
        return 'code';
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'hifz_circle_members')
            ->using(HifzCircleMember::class)
            ->withPivot(['memorised', 'streak', 'last_done_on'])
            ->withTimestamps();
    }

    public function hasMember(User $user): bool
    {
        return $this->members()->whereKey($user->getKey())->exists();
    }
}
