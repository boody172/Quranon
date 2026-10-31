<?php

namespace App\Http\Controllers\Payments;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\Payments\PaymobGateway;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class PaymobWebhookController extends Controller
{
    public function __invoke(Request $request, PaymobGateway $paymob): Response
    {
        $transaction = $request->input('obj', []);

        if (! is_array($transaction) || ! $paymob->verify($transaction, (string) $request->query('hmac'))) {
            Log::warning('Paymob webhook with invalid signature', ['ip' => $request->ip()]);

            return response('', 401);
        }

        $order = Order::where('reference', data_get($transaction, 'order.merchant_order_id'))->first();

        if ($order && $order->isPending()) {
            $paidInFull = (int) data_get($transaction, 'amount_cents') === (int) round($order->amount * 100)
                && data_get($transaction, 'currency') === $order->currency;

            match (true) {
                data_get($transaction, 'success') === true && ! data_get($transaction, 'pending') && $paidInFull => $order->markPaid((string) data_get($transaction, 'id')),
                data_get($transaction, 'success') === false && ! data_get($transaction, 'pending') => $order->markFailed(),
                default => null,
            };
        }

        return response('', 200);
    }
}
