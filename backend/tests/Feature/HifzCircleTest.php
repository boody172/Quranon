<?php

namespace Tests\Feature;

use App\Models\HifzCircle;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class HifzCircleTest extends TestCase
{
    use RefreshDatabase;

    private function createCircle(User $owner, array $overrides = []): string
    {
        Sanctum::actingAs($owner);

        return $this->postJson('/api/circles', $overrides + [
            'name' => 'حلقة العائلة', 'surah' => 67, 'from' => 1, 'to' => 30, 'per_day' => 3, 'starts_on' => '2026-11-01',
        ])->assertCreated()->json('data.code');
    }

    public function test_member_creates_circle_and_friend_joins_with_code(): void
    {
        $owner = User::factory()->create(['name' => 'Ahmed Ali']);
        $code = $this->createCircle($owner);
        $this->assertMatchesRegularExpression('/^[A-HJ-NP-Z2-9]{6}$/', $code);

        $friend = User::factory()->create(['name' => 'Omar']);
        Sanctum::actingAs($friend);
        $this->getJson("/api/circles/$code")->assertForbidden(); // board is for members only

        $this->postJson("/api/circles/$code/join")
            ->assertOk()
            ->assertJsonPath('data.members_count', 2)
            ->assertJsonPath('data.surah', 67);
        $this->postJson("/api/circles/$code/join")->assertJsonPath('data.members_count', 2); // idempotent

        $names = collect($this->getJson("/api/circles/$code")->json('data.members'))->pluck('name')->all();
        $this->assertEqualsCanonicalizing(['Ahmed', 'Omar'], $names); // first names only
        $this->getJson('/api/circles')->assertJsonPath('data.0.code', $code);
    }

    public function test_progress_builds_a_daily_streak_and_ranks_members(): void
    {
        Carbon::setTestNow('2026-11-02 20:00:00');
        $owner = User::factory()->create(['name' => 'Ahmed']);
        $code = $this->createCircle($owner);
        $friend = User::factory()->create(['name' => 'Omar']);
        Sanctum::actingAs($friend);
        $this->postJson("/api/circles/$code/join");

        $this->postJson("/api/circles/$code/progress", ['memorised' => 3, 'done_today' => true, 'today' => '2026-11-02'])->assertOk();
        $this->postJson("/api/circles/$code/progress", ['memorised' => 3, 'done_today' => true, 'today' => '2026-11-02'])->assertOk(); // same day twice
        Carbon::setTestNow('2026-11-03 21:00:00');
        $board = $this->postJson("/api/circles/$code/progress", ['memorised' => 6, 'done_today' => true, 'today' => '2026-11-03'])->json('data.members');

        $this->assertSame('Omar', $board[0]['name']);
        $this->assertSame(2, $board[0]['streak']);
        $this->assertTrue($board[0]['done_today']);
        $this->assertTrue($board[0]['me']);
        $this->assertSame(0, $board[1]['memorised']);

        // Missing two days breaks the streak.
        Carbon::setTestNow('2026-11-06 09:00:00');
        $this->getJson("/api/circles/$code")->assertJsonPath('data.members.0.streak', 0);
        $this->postJson("/api/circles/$code/progress", ['memorised' => 7, 'done_today' => true, 'today' => '2026-11-06'])
            ->assertJsonPath('data.members.0.streak', 1);
    }

    public function test_validation_and_limits(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);
        $this->postJson('/api/circles', ['name' => 'x', 'surah' => 1, 'from' => 1, 'to' => 8, 'per_day' => 1, 'starts_on' => '2026-11-01'])
            ->assertUnprocessable()->assertJsonValidationErrors('to'); // Al-Fatiha has 7 verses
        $this->postJson('/api/circles', ['name' => 'x', 'surah' => 115, 'from' => 1, 'to' => 2, 'per_day' => 1, 'starts_on' => '2026-11-01'])
            ->assertUnprocessable();

        $code = $this->createCircle($owner);
        $this->postJson("/api/circles/$code/progress", ['memorised' => 31, 'done_today' => false])->assertUnprocessable();
        $this->postJson('/api/circles/NOPE99/join')->assertNotFound();
    }

    public function test_leaving_hands_over_ownership_and_last_member_removes_circle(): void
    {
        $owner = User::factory()->create();
        $code = $this->createCircle($owner);
        $friend = User::factory()->create();
        Sanctum::actingAs($friend);
        $this->postJson("/api/circles/$code/join");

        Sanctum::actingAs($owner);
        $this->deleteJson("/api/circles/$code/membership")->assertNoContent();
        $this->assertSame($friend->id, HifzCircle::firstWhere('code', $code)->owner_id);

        Sanctum::actingAs($friend);
        $this->deleteJson("/api/circles/$code/membership")->assertNoContent();
        $this->assertDatabaseMissing('hifz_circles', ['code' => $code]);
    }

    public function test_deleting_the_owner_account_keeps_the_circle_for_others(): void
    {
        $owner = User::factory()->create();
        $code = $this->createCircle($owner);
        $friend = User::factory()->create();
        Sanctum::actingAs($friend);
        $this->postJson("/api/circles/$code/join");

        $owner->delete();

        $this->getJson("/api/circles/$code")->assertOk()->assertJsonPath('data.members_count', 1);
    }

    public function test_guests_cannot_use_circles(): void
    {
        $this->getJson('/api/circles')->assertUnauthorized();
        $this->postJson('/api/circles/ABCDEF/join')->assertUnauthorized();
    }
}
