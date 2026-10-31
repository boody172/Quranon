<?php

namespace App\Services\Payments;

use App\Models\Order;
use App\Models\PaymentMethod;
use App\Models\Setting;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * PayPal Orders v2 for everyone outside Egypt and Saudi Arabia.
 * PayPal does not settle EGP/SAR, so those orders are charged at the plan's USD price.
 */
class PayPalGateway implements Gateway
{
    public function isConfigured(): bool
    {
        return Setting::has('payments.paypal.client_id') && Setting::has('payments.paypal.secret');
    }

    public function start(Order $order, PaymentMethod $method): CheckoutResult
    {
        if ($order->currency !== 'USD') {
            $order->forceFill(['currency' => 'USD', 'amount' => $order->plan->priceIn('USD')])->save();
        }

        $response = Http::withToken($this->accessToken())->acceptJson()->timeout(20)
            ->post($this->baseUrl().'/v2/checkout/orders', [
                'intent' => 'CAPTURE',
                'purchase_units' => [[
                    'reference_id' => $order->reference,
                    'custom_id' => $order->reference,
                    'description' => 'Quranon Plus',
                    'amount' => ['currency_code' => 'USD', 'value' => number_format((float) $order->amount, 2, '.', '')],
                ]],
                'payment_source' => ['paypal' => ['experience_context' => [
                    'brand_name' => 'Quranon',
                    'user_action' => 'PAY_NOW',
                    'return_url' => route('payments.paypal.return', $order->reference),
                    'cancel_url' => config('quranon.frontend_url').'/#/plus',
                ]]],
            ]);

        $approve = collect($response->json('links', []))->firstWhere('rel', 'payer-action')['href'] ?? null;

        if ($response->failed() || ! $approve) {
            throw new RuntimeException('PayPal rejected the order: '.$response->status());
        }

        $order->forceFill(['gateway_ref' => $response->json('id')])->save();

        return CheckoutResult::redirect($approve);
    }

    /** Captures an approved order. Returns true only when PayPal confirms the money moved. */
    public function capture(Order $order): bool
    {
        $response = Http::withToken($this->accessToken())->acceptJson()->timeout(20)
            ->withBody('{}', 'application/json')
            ->post($this->baseUrl()."/v2/checkout/orders/{$order->gateway_ref}/capture");

        $unit = $response->json('purchase_units.0');

        return $response->successful()
            && $response->json('status') === 'COMPLETED'
            && ($unit['reference_id'] ?? null) === $order->reference
            && data_get($unit, 'payments.captures.0.amount.value') === number_format((float) $order->amount, 2, '.', '');
    }

    private function accessToken(): string
    {
        $response = Http::asForm()->timeout(20)
            ->withBasicAuth(Setting::get('payments.paypal.client_id'), Setting::get('payments.paypal.secret'))
            ->post($this->baseUrl().'/v1/oauth2/token', ['grant_type' => 'client_credentials']);

        return $response->json('access_token') ?? throw new RuntimeException('PayPal authentication failed');
    }

    private function baseUrl(): string
    {
        return Setting::get('payments.paypal.mode') === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
    }
}
