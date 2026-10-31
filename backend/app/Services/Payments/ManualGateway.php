<?php

namespace App\Services\Payments;

use App\Models\Order;
use App\Models\PaymentMethod;

/**
 * Transfers confirmed by hand from the dashboard (InstaPay, bank transfer).
 * The user writes the order reference in the transfer note.
 */
class ManualGateway implements Gateway
{
    public function isConfigured(): bool
    {
        return true;
    }

    public function start(Order $order, PaymentMethod $method): CheckoutResult
    {
        return CheckoutResult::manual($method->instructions);
    }
}
