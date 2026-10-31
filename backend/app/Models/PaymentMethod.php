<?php

namespace App\Models;

use App\Concerns\FlushesAppConfig;
use App\Services\Payments\GatewayManager;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['code', 'name', 'gateway', 'countries', 'instructions', 'gateway_option', 'is_active', 'sort'])]
class PaymentMethod extends Model
{
    use FlushesAppConfig;

    public const GATEWAYS = ['manual' => 'يدوي (تأكيد من لوحة التحكم)', 'paymob' => 'Paymob', 'paypal' => 'PayPal'];

    public const REGIONS = ['eg' => 'مصر', 'sa' => 'السعودية', '*' => 'باقي العالم'];

    protected function casts(): array
    {
        return [
            'name' => 'array',
            'countries' => 'array',
            'instructions' => 'array',
            'is_active' => 'boolean',
            'sort' => 'integer',
        ];
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true)->orderBy('sort')->orderBy('id');
    }

    /** Configured end to end: gateway credentials saved and, for Paymob, an integration id set. */
    public function isReady(GatewayManager $gateways): bool
    {
        return $gateways->isConfigured($this->gateway) && ($this->gateway !== 'paymob' || filled($this->gateway_option));
    }

    public function availableIn(string $country): bool
    {
        return in_array('*', $this->countries, true) || in_array($country, $this->countries, true);
    }

    public function toAppArray(): array
    {
        return ['code' => $this->code, 'name' => $this->name, 'countries' => $this->countries];
    }
}
