<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Language;
use App\Services\Strings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\View\View;

class LanguageController extends Controller
{
    public function index(): View
    {
        return view('admin.languages.index', [
            'languages' => Language::withCount('translations')->orderBy('sort')->get(),
            'total' => count(Strings::keys()),
        ]);
    }

    public function create(): View
    {
        return view('admin.languages.create');
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'code' => ['required', 'regex:/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/', 'unique:languages,code'],
            'name' => ['required', 'string', 'max:40'],
            'dir' => ['required', Rule::in(['ltr', 'rtl'])],
        ]);

        $language = Language::create($data + ['sort' => Language::max('sort') + 1, 'is_active' => false]);

        return to_route('admin.languages.edit', $language)->with('status', 'أُضيفت اللغة. ترجم النصوص ثم فعّلها لتظهر في التطبيق.');
    }

    /** Translation editor: every app string with the English and Arabic originals for reference. */
    public function edit(Language $language): View
    {
        return view('admin.languages.edit', [
            'language' => $language,
            'keys' => Strings::keys(),
            'english' => Strings::bundled('en'),
            'arabic' => Strings::bundled('ar'),
            'bundled' => Strings::bundled($language->code),
            'values' => $language->translations()->pluck('value', 'key'),
        ]);
    }

    public function update(Request $request, Language $language): RedirectResponse
    {
        $keys = Strings::keys();
        $data = $request->validate([
            'name' => ['required', 'string', 'max:40'],
            'dir' => ['required', Rule::in(['ltr', 'rtl'])],
            'is_active' => ['boolean'],
            'strings' => ['array'],
            'strings.*' => ['nullable', 'string', 'max:500'],
        ]);

        DB::transaction(function () use ($language, $data, $keys, $request) {
            $language->update([
                'name' => $data['name'],
                'dir' => $data['dir'],
                // Built-in languages can never be switched off: the app needs a guaranteed fallback.
                'is_active' => $language->isBuiltIn() || $request->boolean('is_active'),
            ]);

            $bundled = Strings::bundled($language->code);
            foreach (array_intersect_key($data['strings'] ?? [], array_flip($keys)) as $key => $value) {
                // Store only real overrides; matching the bundled text or blank means "use the default".
                if (blank($value) || $value === ($bundled[$key] ?? null)) {
                    $language->translations()->where('key', $key)->delete();
                } else {
                    $language->translations()->updateOrCreate(['key' => $key], ['value' => $value]);
                }
            }
        });

        return back()->with('status', 'تم حفظ الترجمة.');
    }

    public function destroy(Language $language): RedirectResponse
    {
        abort_if($language->isBuiltIn(), 403, 'لا يمكن حذف العربية أو الإنجليزية.');
        $language->delete();

        return to_route('admin.languages.index')->with('status', 'تم حذف اللغة.');
    }
}
