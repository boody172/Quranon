<?php

namespace App\Models;

use App\Concerns\FlushesAppConfig;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['key', 'value'])]
class Translation extends Model
{
    use FlushesAppConfig;

    public function language(): BelongsTo
    {
        return $this->belongsTo(Language::class);
    }
}
