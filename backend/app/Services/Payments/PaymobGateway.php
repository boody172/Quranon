<?php

namespace App\Services\Payments;

use App\Models\Order;
use App\Models\PaymentMethod;
use App\Models\Setting;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Paymob Intention API (Egypt: cards, Meeza, wallets, Apple Pay, Fawry/Aman; Saudi Arabia: mada, cards, Apple Pay).
 * Each payment method row stores its Paymob integration id in `gateway_option`.
 */
class PaymobGateway implements Gateway
{
    /** Fields Paymob concatenates (in this order) to sign the transaction callback. */
    private const HMAC_FIELDS = [
        'amount_cents', 'created_at', 'currency', 'error_occured', 'has_parent_transaction', 'id',
        'integration_id', 'is_3d_secure', 'is_auth', 'is_capture', 'is_refunded', 'is_standalone_payment',
        'is_voided', 'order.id', 'owner', 'pending', 'source_data.pan', 'source_data.sub_type',
        'source_data.type', 'success',
    ];

    public function isConfigured(): bool
    {
        return Setting::has('payments.paymob.secret_key') && Setting::has('payments.paymob.public_key') && Setting::has('payments.paymob.hmac');
    }

    public function start(Order $order, PaymentMethod $method): CheckoutResult
    {
        $base = $this->baseUrl($order->currency);
        $cents = (int) round($order->amount * 100);
        $user = $order->user;

        $response = Http::withToken(Setting::get('payments.paymob.secret_key'), 'Token')
            ->acceptJson()->timeout(20)
            ->post("{$base}/v1/intention/", [
                'amount' => $cents,
                'currency' => $order->currency,
                'payment_methods' => [(int) $method->gateway_option],
                'items' => [['name' => 'Quranon Plus', 'amount' => $cents, 'quantity' => 1]],
                'billing_data' => [
                    'first_name' => $user->name, 'last_name' => '-', 'email' => $user->email, 'phone_number' => 'NA',
                    'street' => 'NA', 'building' => 'NA', 'floor' => 'NA', 'apartment' => 'NA', 'city' => 'NA', 'country' => 'NA',
                ],
                'special_reference' => $order->reference,
                'notification_url' => route('webhooks.paymob'),
                'redirection_url' => config('quranon.frontend_url').'/#/plus',
            ]);

        $secret = $response->json('client_secret');

        if ($response->failed() || ! $secret) {
            throw new RuntimeException('Paymob rejected the intention: '.$response->status());
        }

        $order->forceFill(['gateway_ref' => (string) $response->json('id')])->save();

        return CheckoutResult::redirect("{$base}/unifiedcheckout/?".http_build_query([
            'publicKey' => Setting::get('payments.paymob.public_key'),
            'clientSecret' => $secret,
        ]));
    }

    /** Verifies the transaction callback signature (constant-time comparison). */
    public function verify(array $transaction, string $hmac): bool
    {
        $payload = collect(self::HMAC_FIELDS)
            ->map(fn (string $field) => $this->stringify(data_get($transaction, $field)))
            ->implode('');

        return hash_equals(hash_hmac('sha512', $payload, (string) Setting::get('payments.paymob.hmac')), strtolower($hmac));
    }

    private function stringify(mixed $value): string
    {
        return is_bool($value) ? ($value ? 'true' : 'false') : (string) $value;
    }

    private function baseUrl(string $currency): string
    {
        return $currency === 'SAR' ? 'https://ksa.paymob.com' : 'https://accept.paymob.com';
    }
}
