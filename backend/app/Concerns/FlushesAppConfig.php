<?php

namespace App\Concerns;

use App\Services\AppConfig;

/**
 * Any change to content shown in the app invalidates the cached /api/config payload.
 */
trait FlushesAppConfig
{
    protected static function bootFlushesAppConfig(): void
    {
        static::saved(fn () => AppConfig::flush());
        static::deleted(fn () => AppConfig::flush());
    }
}
