<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\PaymentMethod;
use App\Models\Plan;
use App\Services\Payments\GatewayManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

class CheckoutController extends Controller
{
    public function __invoke(Request $request, GatewayManager $gateways): JsonResponse
    {
        $data = $request->validate([
            'plan' => ['required', 'string', Rule::exists('plans', 'slug')->where('is_active', true)],
            'currency' => ['required', Rule::in(Plan::CURRENCIES)],
            'method' => ['required', 'string', Rule::exists('payment_methods', 'code')->where('is_active', true)],
            'country' => ['required', Rule::in(['eg', 'sa', 'intl'])],
        ]);

        $plan = Plan::where('slug', $data['plan'])->firstOrFail();
        $method = PaymentMethod::where('code', $data['method'])->firstOrFail();
        // Price always comes from the database, never from the client.
        $amount = $plan->priceIn($data['currency']);

        if ($amount === null || ! $method->availableIn($data['country']) || ! $method->isReady($gateways)) {
            throw ValidationException::withMessages(['method' => 'This payment method is not available.']);
        }

        $order = Order::create([
            'user_id' => $request->user()->id,
            'plan_id' => $plan->id,
            'payment_method' => $method->code,
            'gateway' => $method->gateway,
            'currency' => $data['currency'],
            'amount' => $amount,
        ]);

        try {
            $result = $gateways->driver($method->gateway)->start($order, $method);
        } catch (Throwable $e) {
            Log::error('Checkout failed', ['order' => $order->reference, 'error' => $e->getMessage()]);
            $order->markFailed();

            return response()->json(['message' => 'Payment provider unavailable.'], 502);
        }

        return response()->json([
            'type' => $result->type,
            'url' => $result->url,
            'instructions' => $result->instructions,
            'reference' => $order->reference,
        ], 201);
    }
}
