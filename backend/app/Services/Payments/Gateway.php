<?php

namespace App\Services\Payments;

use App\Models\Order;
use App\Models\PaymentMethod;

interface Gateway
{
    /** True when the dashboard holds every credential this gateway needs. */
    public function isConfigured(): bool;

    /** Starts payment for a pending order. */
    public function start(Order $order, PaymentMethod $method): CheckoutResult;
}
