<?php

namespace App\Concerns;

use Illuminate\Support\Facades\Storage;

/**
 * Exposes `{column}_url` for models that store an uploaded image path.
 */
trait HasPublicImage
{
    public function imageUrl(?string $path): ?string
    {
        return $path ? Storage::disk('public')->url($path) : null;
    }
}
