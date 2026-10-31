<?php

namespace App\Http\Controllers\Payments;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\Payments\PayPalGateway;
use Illuminate\Http\RedirectResponse;

class PayPalReturnController extends Controller
{
    public function __invoke(string $reference, PayPalGateway $paypal): RedirectResponse
    {
        $order = Order::where('reference', $reference)->where('gateway', 'paypal')->firstOrFail();

        if ($order->isPending()) {
            $paypal->capture($order) ? $order->markPaid() : $order->markFailed();
        }

        $status = $order->status === 'paid' ? 'paid' : 'failed';

        return redirect()->away(config('quranon.frontend_url')."/#/plus/{$status}");
    }
}
