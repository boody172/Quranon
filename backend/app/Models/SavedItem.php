<?php

namespace App\Models;

use App\Enums\SavedItemType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['type', 'ref', 'title', 'subtitle'])]
class SavedItem extends Model
{
    protected function casts(): array
    {
        return ['type' => SavedItemType::class];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
