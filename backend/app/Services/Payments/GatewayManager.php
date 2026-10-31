<?php

namespace App\Services\Payments;

use InvalidArgumentException;

class GatewayManager
{
    private const DRIVERS = [
        'manual' => ManualGateway::class,
        'paymob' => PaymobGateway::class,
        'paypal' => PayPalGateway::class,
    ];

    public function driver(string $name): Gateway
    {
        $class = self::DRIVERS[$name] ?? throw new InvalidArgumentException("Unknown gateway [{$name}]");

        return app($class);
    }

    public function isConfigured(string $name): bool
    {
        return isset(self::DRIVERS[$name]) && $this->driver($name)->isConfigured();
    }
}
