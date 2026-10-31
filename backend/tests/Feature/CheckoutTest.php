<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\PaymentMethod;
use App\Models\Setting;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CheckoutTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->user = User::factory()->create();
        Sanctum::actingAs($this->user);
    }

    private function configurePaymob(): void
    {
        Setting::put('payments.paymob.secret_key', 'egy_sk_test', secret: true);
        Setting::put('payments.paymob.public_key', 'egy_pk_test', secret: true);
        Setting::put('payments.paymob.hmac', 'hmac-secret', secret: true);
        PaymentMethod::where('code', 'card')->update(['gateway_option' => '4512345']);
    }

    private function signedTransaction(Order $order, bool $success = true, ?int $cents = null): array
    {
        $transaction = [
            'amount_cents' => $cents ?? (int) round($order->amount * 100), 'created_at' => '2026-11-01T10:00:00', 'currency' => $order->currency,
            'error_occured' => false, 'has_parent_transaction' => false, 'id' => 991, 'integration_id' => 4512345,
            'is_3d_secure' => true, 'is_auth' => false, 'is_capture' => false, 'is_refunded' => false, 'is_standalone_payment' => true,
            'is_voided' => false, 'order' => ['id' => 55, 'merchant_order_id' => $order->reference], 'owner' => 7, 'pending' => false,
            'source_data' => ['pan' => '2346', 'sub_type' => 'MasterCard', 'type' => 'card'], 'success' => $success,
        ];
        $fields = ['amount_cents', 'created_at', 'currency', 'error_occured', 'has_parent_transaction', 'id', 'integration_id', 'is_3d_secure',
            'is_auth', 'is_capture', 'is_refunded', 'is_standalone_payment', 'is_voided', 'order.id', 'owner', 'pending',
            'source_data.pan', 'source_data.sub_type', 'source_data.type', 'success'];
        $payload = collect($fields)->map(fn ($f) => is_bool($v = data_get($transaction, $f)) ? ($v ? 'true' : 'false') : (string) $v)->implode('');

        return [$transaction, hash_hmac('sha512', $payload, 'hmac-secret')];
    }

    public function test_unconfigured_gateways_are_hidden_and_rejected(): void
    {
        $this->getJson('/api/config')->assertJsonCount(0, 'payment_methods');

        $this->postJson('/api/checkout', ['plan' => 'yearly', 'currency' => 'EGP', 'method' => 'card', 'country' => 'eg'])
            ->assertJsonValidationErrors('method');
    }

    public function test_manual_instapay_flow_until_admin_confirms(): void
    {
        PaymentMethod::where('code', 'instapay')->update(['is_active' => true]);

        $response = $this->postJson('/api/checkout', ['plan' => 'monthly', 'currency' => 'EGP', 'method' => 'instapay', 'country' => 'eg'])
            ->assertCreated()->assertJsonPath('type', 'manual');

        $order = Order::where('reference', $response->json('reference'))->firstOrFail();
        $this->assertSame('49.00', $order->amount);
        $this->assertNull($this->user->fresh()->plus_until);

        $this->actingAs(User::factory()->admin()->create())->post("/admin/orders/{$order->id}/paid")->assertRedirect();
        $this->assertSame('paid', $order->fresh()->status);
        $this->assertTrue($this->user->fresh()->plus_until->between(now()->addDays(27), now()->addDays(32)));
    }

    public function test_method_must_be_offered_in_the_buyers_country(): void
    {
        PaymentMethod::where('code', 'instapay')->update(['is_active' => true]);

        $this->postJson('/api/checkout', ['plan' => 'monthly', 'currency' => 'USD', 'method' => 'instapay', 'country' => 'intl'])
            ->assertJsonValidationErrors('method');
    }

    public function test_client_cannot_choose_the_price(): void
    {
        PaymentMethod::where('code', 'instapay')->update(['is_active' => true]);

        $ref = $this->postJson('/api/checkout', ['plan' => 'lifetime', 'currency' => 'SAR', 'method' => 'instapay', 'country' => 'eg', 'amount' => 1])->json('reference');

        $this->assertSame('249.00', Order::where('reference', $ref)->value('amount'));
    }

    public function test_paymob_checkout_and_signed_webhook_activate_plus(): void
    {
        $this->configurePaymob();
        Http::fake(['accept.paymob.com/v1/intention/' => Http::response(['id' => 'pi_1', 'client_secret' => 'cs_abc'])]);

        $response = $this->postJson('/api/checkout', ['plan' => 'yearly', 'currency' => 'EGP', 'method' => 'card', 'country' => 'eg'])
            ->assertCreated()->assertJsonPath('type', 'redirect');
        $this->assertStringStartsWith('https://accept.paymob.com/unifiedcheckout/?publicKey=egy_pk_test&clientSecret=cs_abc', $response->json('url'));
        Http::assertSent(fn ($r) => $r['amount'] === 39900 && $r['payment_methods'] === [4512345] && $r->hasHeader('Authorization', 'Token egy_sk_test'));

        $order = Order::where('reference', $response->json('reference'))->first();
        [$tx, $hmac] = $this->signedTransaction($order);

        $this->postJson('/api/webhooks/paymob?hmac='.$hmac, ['type' => 'TRANSACTION', 'obj' => $tx])->assertOk();
        $this->postJson('/api/webhooks/paymob?hmac='.$hmac, ['type' => 'TRANSACTION', 'obj' => $tx])->assertOk(); // retries are harmless

        $this->assertSame('paid', $order->fresh()->status);
        $this->assertTrue($this->user->fresh()->plus_until->between(now()->addDays(364), now()->addDays(367)));
    }

    public function test_forged_or_underpaid_paymob_webhooks_are_ignored(): void
    {
        $this->configurePaymob();
        PaymentMethod::where('code', 'instapay')->update(['is_active' => true]);
        $order = Order::create(['user_id' => $this->user->id, 'plan_id' => 2, 'payment_method' => 'card', 'gateway' => 'paymob', 'currency' => 'EGP', 'amount' => 399]);

        [$tx] = $this->signedTransaction($order);
        $this->postJson('/api/webhooks/paymob?hmac=deadbeef', ['obj' => $tx])->assertUnauthorized();

        [$cheap, $hmac] = $this->signedTransaction($order, cents: 100);
        $this->postJson('/api/webhooks/paymob?hmac='.$hmac, ['obj' => $cheap])->assertOk();

        $this->assertSame('pending', $order->fresh()->status);
        $this->assertNull($this->user->fresh()->plus_until);
    }

    public function test_paypal_charges_usd_and_captures_on_return(): void
    {
        Setting::put('payments.paypal.client_id', 'cid', secret: true);
        Setting::put('payments.paypal.secret', 'csecret', secret: true);
        Http::fake([
            'api-m.sandbox.paypal.com/v1/oauth2/token' => Http::response(['access_token' => 'tok']),
            'api-m.sandbox.paypal.com/v2/checkout/orders' => Http::response(['id' => 'PP-1', 'links' => [['rel' => 'payer-action', 'href' => 'https://www.sandbox.paypal.com/checkoutnow?token=PP-1']]]),
        ]);

        $response = $this->postJson('/api/checkout', ['plan' => 'yearly', 'currency' => 'EGP', 'method' => 'paypal', 'country' => 'intl'])->assertCreated();
        $order = Order::where('reference', $response->json('reference'))->first();
        $this->assertSame(['USD', '19.99'], [$order->currency, $order->amount]);

        Http::fake([
            'api-m.sandbox.paypal.com/v1/oauth2/token' => Http::response(['access_token' => 'tok']),
            'api-m.sandbox.paypal.com/v2/checkout/orders/PP-1/capture' => Http::response(['status' => 'COMPLETED', 'purchase_units' => [[
                'reference_id' => $order->reference, 'payments' => ['captures' => [['amount' => ['value' => '19.99', 'currency_code' => 'USD']]]],
            ]]]),
        ]);
        $this->get("/payments/paypal/return/{$order->reference}")->assertRedirect(config('quranon.frontend_url').'/#/plus/paid');
        $this->assertSame('paid', $order->fresh()->status);
    }
}
