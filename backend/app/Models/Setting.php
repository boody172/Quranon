<?php

namespace App\Models;

use App\Concerns\FlushesAppConfig;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

/**
 * Key/value settings editable from the dashboard. Secrets (payment keys) are encrypted at rest
 * with APP_KEY and never leave the server.
 */
class Setting extends Model
{
    use FlushesAppConfig;

    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['key', 'value', 'is_secret'];

    protected function casts(): array
    {
        return ['is_secret' => 'boolean'];
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        $row = static::find($key);

        if (! $row || $row->value === null) {
            return $default;
        }

        $raw = $row->is_secret ? Crypt::decryptString($row->value) : $row->value;

        return json_decode($raw, true);
    }

    public static function put(string $key, mixed $value, bool $secret = false): void
    {
        $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);

        static::updateOrCreate(['key' => $key], [
            'value' => $secret ? Crypt::encryptString($json) : $json,
            'is_secret' => $secret,
        ]);
    }

    public static function has(string $key): bool
    {
        return static::whereKey($key)->whereNotNull('value')->exists();
    }
}
