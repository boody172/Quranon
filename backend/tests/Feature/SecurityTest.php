<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_responses_carry_hardening_headers(): void
    {
        $this->getJson('/api/config')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeaderMissing('X-Powered-By');
    }

    public function test_dashboard_pages_have_a_strict_csp_with_nonce(): void
    {
        $response = $this->get('/admin/login');
        $csp = $response->headers->get('Content-Security-Policy');

        $this->assertStringContainsString("frame-ancestors 'none'", $csp);
        $this->assertStringNotContainsString("script-src 'self' 'unsafe-inline'", $csp);
        preg_match("/'nonce-([^']+)'/", $csp, $m);
        $response->assertSee('nonce="'.$m[1].'"', false);
    }

    public function test_dashboard_can_be_limited_to_specific_ips(): void
    {
        config(['quranon.admin_ips' => ['10.0.0.1']]);

        $this->get('/admin/login')->assertNotFound();
        $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.1'])->get('/admin/login')->assertOk();
    }

    public function test_admin_login_is_rate_limited(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->post('/admin/login', ['email' => 'x@example.com', 'password' => 'wrong']);
        }

        $this->post('/admin/login', ['email' => 'x@example.com', 'password' => 'wrong'])->assertTooManyRequests();
    }

    public function test_api_tokens_expire(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('app')->plainTextToken;

        $this->travel(91)->days();

        $this->withToken($token)->getJson('/api/me')->assertUnauthorized();
    }

    public function test_csrf_is_enforced_on_dashboard_forms(): void
    {
        $this->withMiddleware()->actingAs(User::factory()->admin()->create());

        // Laravel disables CSRF checks in tests by default; re-enable to prove forms are protected.
        $this->app->instance('env', 'production');
        $this->post('/admin/settings/publish')->assertStatus(419);
    }
}
