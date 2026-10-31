<?php

namespace App\Services\Payments;

final readonly class CheckoutResult
{
    private function __construct(public string $type, public ?string $url = null, public ?array $instructions = null) {}

    public static function redirect(string $url): self
    {
        return new self('redirect', url: $url);
    }

    public static function manual(?array $instructions): self
    {
        return new self('manual', instructions: $instructions);
    }
}
