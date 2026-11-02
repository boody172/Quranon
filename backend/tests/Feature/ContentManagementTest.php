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
            'islamhouse_api' => 'https://api3.islamhouse.com/v3/key',
        ])->assertRedirect();

        $this->getJson('/api/config')
            ->assertJsonPath('sources.audio_api', 'https://mirror.example.com/api/v3')
            ->assertJsonPath('sources.text_provider', 'quran_com');
    }

    public function test_data_sources_must_be_https(): void
    {
        $this->put('/admin/settings/sources', ['audio_api' => 'http://insecure.example.com', 'text_provider' => 'alquran_cloud', 'text_api' => 'https://api.alquran.cloud/v1', 'islamhouse_api' => 'https://x.test'])
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

    public function test_scholars_expose_their_lesson_source_to_the_app(): void
    {
        $scholars = collect($this->getJson('/api/config')->json('scholars'));

        $this->assertSame(['source' => 'islamhouse', 'ref' => '6842'], collect($scholars->firstWhere('name.ar', 'الشيخ محمد بن صالح العثيمين'))->only('source', 'ref')->all());
        $this->assertSame('archive', $scholars->firstWhere('name.ar', 'الشيخ محمد متولي الشعراوي')['source']);
    }

    public function test_admin_adds_a_scholar_with_hand_picked_audio_lessons(): void
    {
        $this->post('/admin/scholars', [
            'name' => ['ar' => 'شيخ تجربة', 'en' => 'Test Sheikh'], 'topic' => ['ar' => 'دروس', 'en' => 'Lessons'],
            'country' => 'eg', 'sort' => 50, 'is_active' => '1', 'lessons_source' => 'manual',
            'lessons_text' => "الدرس الأول | https://cdn.example.com/1.mp3\nسطر غير صالح\nدرس | http://insecure.example.com/2.mp3\nالدرس الثاني | https://cdn.example.com/2.mp3",
        ])->assertRedirect('/admin/scholars');

        $scholar = collect($this->getJson('/api/config')->json('scholars'))->firstWhere('name.en', 'Test Sheikh');
        $this->assertSame([
            ['title' => 'الدرس الأول', 'url' => 'https://cdn.example.com/1.mp3'],
            ['title' => 'الدرس الثاني', 'url' => 'https://cdn.example.com/2.mp3'],
        ], $scholar['lessons']);
    }

    public function test_lesson_source_reference_is_validated(): void
    {
        $base = ['name' => ['ar' => 'x', 'en' => 'x'], 'topic' => ['ar' => 'x', 'en' => 'x'], 'country' => 'eg', 'sort' => 1];

        $this->post('/admin/scholars', $base + ['lessons_source' => 'archive', 'lessons_ref' => '../../etc/passwd'])->assertSessionHasErrors('lessons_ref');
        $this->post('/admin/scholars', $base + ['lessons_source' => 'manual', 'lessons_text' => 'no links here'])->assertSessionHasErrors('lessons_text');
    }

    public function test_admin_switches_to_ads_and_sets_ad_units(): void
    {
        $this->getJson('/api/config')->assertJsonPath('monetization', 'ads')
            ->assertJsonPath('ads.appOpen.ios', 'ca-app-pub-3940256099942544/5575463023'); // Google test unit by default

        $admin = User::factory()->create(['is_admin' => true]);
        $this->actingAs($admin)->put('/admin/settings/monetization', [
            'monetization' => 'ads', 'android_unit' => 'ca-app-pub-1234567890123456/1111111111', 'ios_unit' => '',
            'every_hours' => 6, 'skip_first_launches' => 2,
        ])->assertRedirect();

        $this->getJson('/api/config')
            ->assertJsonPath('ads.appOpen.android', 'ca-app-pub-1234567890123456/1111111111')
            ->assertJsonPath('ads.appOpen.ios', 'ca-app-pub-3940256099942544/5575463023')
            ->assertJsonPath('ads.everyHours', 6);

        $this->actingAs($admin)->put('/admin/settings/monetization', [
            'monetization' => 'plus', 'android_unit' => 'not-an-ad-unit', 'every_hours' => 6, 'skip_first_launches' => 1,
        ])->assertSessionHasErrors('android_unit');
        $this->actingAs($admin)->put('/admin/settings/monetization', [
            'monetization' => 'plus', 'every_hours' => 6, 'skip_first_launches' => 1,
        ]);
        $this->getJson('/api/config')->assertJsonPath('monetization', 'plus');
        $this->actingAs($admin)->get('/admin/settings')->assertOk()->assertSee('الربح والإعلانات');
    }
}
