<?php

namespace Tests\Feature;

use App\Models\Feature;
use App\Models\Reciter;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AppApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_config_lists_active_features_in_order(): void
    {
        $this->seed(DatabaseSeeder::class);
        Feature::where('slug', 'search')->update(['is_active' => false]);

        $response = $this->getJson('/api/config')->assertOk();

        $this->assertSame('qibla', $response->json('features.0.slug'));
        $this->assertNotContains('search', collect($response->json('features'))->pluck('slug'));
        $this->assertNotEmpty($response->json('scholars'));
    }

    public function test_config_cache_is_refreshed_when_content_changes(): void
    {
        $this->getJson('/api/config')->assertJsonCount(0, 'reciters');

        Reciter::create(['mp3quran_id' => 51, 'name' => 'محمد صديق المنشاوي', 'country' => 'eg', 'is_late' => true]);

        $this->getJson('/api/config')
            ->assertJsonPath('reciters.0.id', 51)
            ->assertJsonPath('reciters.0.country', 'eg')
            ->assertJsonPath('reciters.0.late', true);
    }

    public function test_user_can_register_and_is_greeted_by_name(): void
    {
        $token = $this->postJson('/api/register', [
            'name' => 'أحمد', 'email' => 'ahmed@example.com', 'password' => 'secret-pass',
        ])->assertCreated()->json('token');

        $this->withToken($token)->getJson('/api/me')->assertJsonPath('user.name', 'أحمد');
    }

    public function test_login_rejects_wrong_password(): void
    {
        User::factory()->create(['email' => 'a@example.com']);

        $this->postJson('/api/login', ['email' => 'a@example.com', 'password' => 'wrong-pass'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_registration_cannot_grant_admin(): void
    {
        $this->postJson('/api/register', [
            'name' => 'x', 'email' => 'x@example.com', 'password' => 'secret-pass', 'is_admin' => true,
        ])->assertCreated();

        $this->assertFalse(User::where('email', 'x@example.com')->first()->is_admin);
    }

    public function test_saved_items_are_private_and_idempotent(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);

        $item = ['type' => 'surah', 'ref' => '18', 'title' => 'سورة الكهف'];
        $this->postJson('/api/saved', $item)->assertCreated();
        $this->postJson('/api/saved', $item)->assertOk();
        $this->getJson('/api/saved')->assertJsonCount(1, 'data');

        Sanctum::actingAs(User::factory()->create());
        $this->getJson('/api/saved')->assertJsonCount(0, 'data');

        Sanctum::actingAs($owner);
        $this->deleteJson('/api/saved/surah/18')->assertNoContent();
        $this->getJson('/api/saved')->assertJsonCount(0, 'data');
    }

    public function test_saved_items_validate_type(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/saved', ['type' => 'song', 'ref' => '1', 'title' => 'x'])
            ->assertJsonValidationErrors('type');
    }

    public function test_saved_items_require_authentication(): void
    {
        $this->getJson('/api/saved')->assertUnauthorized();
    }

    public function test_user_can_delete_their_account(): void
    {
        $user = User::factory()->create(['password' => 'secret-pass']);
        $user->savedItems()->create(['type' => 'surah', 'ref' => '1', 'title' => 'x']);
        $token = $user->createToken('app')->plainTextToken;

        $this->withToken($token)->deleteJson('/api/me', ['password' => 'wrong'])->assertJsonValidationErrors('password');
        $this->withToken($token)->deleteJson('/api/me', ['password' => 'secret-pass'])->assertNoContent();

        $this->assertModelMissing($user);
        $this->assertDatabaseCount('saved_items', 0);
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }
}
