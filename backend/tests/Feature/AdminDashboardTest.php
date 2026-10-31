<?php

namespace Tests\Feature;

use App\Models\Feature;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminDashboardTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->admin()->create();
    }

    public function test_guests_are_sent_to_login(): void
    {
        $this->get('/admin')->assertRedirect('/admin/login');
        $this->get('/admin/features')->assertRedirect('/admin/login');
    }

    public function test_regular_users_cannot_log_in_to_the_dashboard(): void
    {
        User::factory()->create(['email' => 'user@example.com', 'password' => 'secret-pass']);

        $this->post('/admin/login', ['email' => 'user@example.com', 'password' => 'secret-pass'])
            ->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_regular_user_session_is_rejected(): void
    {
        $this->actingAs(User::factory()->create())->get('/admin')->assertRedirect('/admin/login');
    }

    public function test_admin_can_log_in(): void
    {
        $admin = User::factory()->admin()->create(['password' => 'a-long-password-1']);

        $this->post('/admin/login', ['email' => $admin->email, 'password' => 'a-long-password-1'])
            ->assertRedirect('/admin');
        $this->get('/admin')->assertOk()->assertSee($admin->name);
    }

    public function test_admin_pages_render(): void
    {
        $this->seed();
        $this->actingAs($this->admin());

        $pages = ['', '/features', '/features/create', '/reciters', '/reciters/create', '/scholars', '/scholars/create', '/users',
            '/languages', '/languages/create', '/languages/1/edit', '/plans', '/plans/create', '/plans/1/edit',
            '/payment-methods', '/payment-methods/create', '/payment-methods/1/edit', '/orders', '/settings', '/scholars/1/edit'];
        foreach (array_map(fn ($p) => '/admin'.$p, $pages) as $url) {
            $this->get($url)->assertOk();
        }
        $this->get('/admin/features/'.Feature::first()->id.'/edit')->assertOk();
    }

    public function test_admin_can_create_feature_with_compressed_image(): void
    {
        Storage::fake('public');
        $this->actingAs($this->admin());

        $this->post('/admin/features', [
            'slug' => 'azkar', 'title' => ['ar' => 'الأذكار', 'en' => 'Adhkar'], 'subtitle' => ['ar' => 'الصباح والمساء', 'en' => ''], 'link' => '#/azkar',
            'tint' => '#fff4e0', 'ink' => '#9a5b00', 'sort' => 9, 'is_active' => '1',
            'image' => UploadedFile::fake()->image('cover.jpg', 2000, 1200),
        ])->assertRedirect('/admin/features');

        $feature = Feature::where('slug', 'azkar')->firstOrFail();
        $this->assertStringEndsWith('.webp', $feature->image_path);
        Storage::disk('public')->assertExists($feature->image_path);
        $this->assertSame(900, getimagesizefromstring(Storage::disk('public')->get($feature->image_path))[0]);

        $this->getJson('/api/config')
            ->assertJsonFragment(['slug' => 'azkar', 'title' => ['ar' => 'الأذكار', 'en' => 'Adhkar']])
            ->assertJsonFragment(['subtitle' => ['ar' => 'الصباح والمساء']]); // empty English dropped → app falls back
    }

    public function test_feature_link_must_be_internal_or_https(): void
    {
        $this->actingAs($this->admin());

        $this->post('/admin/features', [
            'slug' => 'bad', 'title' => ['ar' => 'x', 'en' => 'x'], 'link' => 'javascript:alert(1)', 'tint' => '#ffffff', 'ink' => '#000000', 'sort' => 1,
        ])->assertSessionHasErrors('link');
    }

    public function test_deleting_feature_removes_its_image(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('features/old.webp', 'x');
        $feature = Feature::create(['slug' => 'x', 'title' => ['ar' => 'x'], 'link' => '#/x', 'image_path' => 'features/old.webp']);

        $this->actingAs($this->admin())->delete("/admin/features/{$feature->id}")->assertRedirect();

        $this->assertModelMissing($feature);
        Storage::disk('public')->assertMissing('features/old.webp');
    }

    public function test_uploads_must_be_real_raster_images(): void
    {
        Storage::fake('public');
        $this->actingAs($this->admin());
        $svg = UploadedFile::fake()->createWithContent('x.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
        $fakePng = UploadedFile::fake()->createWithContent('x.png', '<?php echo 1; ?>');

        foreach ([$svg, $fakePng] as $file) {
            $this->post('/admin/features', [
                'slug' => 'x'.uniqid(), 'title' => ['ar' => 'x', 'en' => 'x'], 'link' => '#/x', 'tint' => '#ffffff', 'ink' => '#000000', 'sort' => 1, 'image' => $file,
            ])->assertSessionHasErrors('image');
        }
        $this->assertSame([], Storage::disk('public')->allFiles());
    }
}
