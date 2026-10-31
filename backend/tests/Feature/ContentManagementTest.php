<?php

namespace Tests\Feature;

use App\Models\Language;
use App\Models\Setting;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ContentManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->actingAs(User::factory()->admin()->create());
    }

    public function test_admin_overrides_a_built_in_string(): void
    {
        $arabic = Language::where('code', 'ar')->first();

        $this->put("/admin/languages/{$arabic->id}", [
            'name' => 'العربية', 'dir' => 'rtl',
            'strings' => ['home.title' => 'قلبك يطمئن هنا', 'page.listen' => 'استمع'], // second equals default → not stored
        ])->assertRedirect();

        $this->getJson('/api/config')->assertJsonPath('i18n.strings.ar', ['home.title' => 'قلبك يطمئن هنا']);
    }

    public function test_admin_adds_a_new_language_that_appears_only_once_activated(): void
    {
        $this->post('/admin/languages', ['code' => 'fr', 'name' => 'Français', 'dir' => 'ltr'])->assertRedirect();
        $french = Language::where('code', 'fr')->first();
        $this->assertNotContains('fr', collect($this->getJson('/api/config')->json('i18n.languages'))->pluck('code'));

        $this->put("/admin/languages/{$french->id}", [
            'name' => 'Français', 'dir' => 'ltr', 'is_active' => '1', 'strings' => ['home.title' => 'Écoutez ce qui apaise le cœur', 'not.a.key' => 'x'],
        ]);

        $this->getJson('/api/config')
            ->assertJsonFragment(['code' => 'fr', 'name' => 'Français', 'dir' => 'ltr'])
            ->assertJsonPath('i18n.strings.fr', ['home.title' => 'Écoutez ce qui apaise le cœur']);
    }

    public function test_built_in_languages_cannot_be_deleted_or_disabled(): void
    {
        $english = Language::where('code', 'en')->first();

        $this->delete("/admin/languages/{$english->id}")->assertForbidden();
        $this->put("/admin/languages/{$english->id}", ['name' => 'English', 'dir' => 'ltr']); // no is_active
        $this->assertTrue($english->fresh()->is_active);
    }

    public function test_publishing_bumps_the_release_shown_to_users(): void
    {
        $this->post('/admin/settings/publish', ['notes' => ['ar' => 'قرّاء جدد', 'en' => 'New reciters']])->assertRedirect();
        $this->post('/admin/settings/publish', ['notes' => ['ar' => 'تحسينات']]);

        $this->getJson('/api/config')
            ->assertJsonPath('release.version', 2)
            ->assertJsonPath('release.notes', ['ar' => 'تحسينات']);
    }

    public function test_data_sources_can_be_switched(): void
    {
        $this->put('/admin/settings/sources', [
            'audio_api' => 'https://mirror.example.com/api/v3', 'text_provider' => 'quran_com', 'text_api' => 'https://api.quran.com/api/v4',
        ])->assertRedirect();

        $this->getJson('/api/config')
            ->assertJsonPath('sources.audio_api', 'https://mirror.example.com/api/v3')
            ->assertJsonPath('sources.text_provider', 'quran_com');
    }

    public function test_data_sources_must_be_https(): void
    {
        $this->put('/admin/settings/sources', ['audio_api' => 'http://insecure.example.com', 'text_provider' => 'alquran_cloud', 'text_api' => 'https://api.alquran.cloud/v1'])
            ->assertSessionHasErrors('audio_api');
    }

    public function test_payment_secrets_are_encrypted_at_rest_and_never_shown(): void
    {
        $this->put('/admin/settings/payments', ['secrets' => ['payments_paymob_secret_key' => 'sk_live_very_secret'], 'paypal_mode' => 'sandbox']);

        $this->assertSame('sk_live_very_secret', Setting::get('payments.paymob.secret_key'));
        $this->assertStringNotContainsString('sk_live_very_secret', DB::table('settings')->where('key', 'payments.paymob.secret_key')->value('value'));
        $this->get('/admin/settings')->assertDontSee('sk_live_very_secret');
        $this->assertStringNotContainsString('sk_live', $this->getJson('/api/config')->getContent());
    }

    public function test_plus_perks_are_saved_one_per_line(): void
    {
        $this->put('/admin/settings/perks', ['perks' => ['ar' => "ميزة أولى\n\nميزة ثانية ", 'en' => '']])->assertSessionHasNoErrors();

        $this->getJson('/api/config')->assertJsonPath('plus_perks', ['ar' => ['ميزة أولى', 'ميزة ثانية']]);
    }
}
