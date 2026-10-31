<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\FeatureRequest;
use App\Models\Feature;
use App\Services\ImageStore;
use Illuminate\Http\RedirectResponse;
use Illuminate\View\View;

class FeatureController extends Controller
{
    public function __construct(private ImageStore $images) {}

    public function index(): View
    {
        return view('admin.features.index', ['features' => Feature::ordered()->get()]);
    }

    public function create(): View
    {
        return view('admin.features.form', ['feature' => new Feature(['sort' => Feature::max('sort') + 1, 'is_active' => true])]);
    }

    public function store(FeatureRequest $request): RedirectResponse
    {
        Feature::create($this->payload($request, new Feature));

        return to_route('admin.features.index')->with('status', 'تمت إضافة الميزة.');
    }

    public function edit(Feature $feature): View
    {
        return view('admin.features.form', compact('feature'));
    }

    public function update(FeatureRequest $request, Feature $feature): RedirectResponse
    {
        $feature->update($this->payload($request, $feature));

        return to_route('admin.features.index')->with('status', 'تم حفظ التعديلات.');
    }

    public function destroy(Feature $feature): RedirectResponse
    {
        $this->images->delete($feature->image_path);
        $feature->delete();

        return to_route('admin.features.index')->with('status', 'تم حذف الميزة.');
    }

    private function payload(FeatureRequest $request, Feature $feature): array
    {
        $data = $request->payload();

        if ($request->hasFile('image')) {
            $data['image_path'] = $this->images->store($request->file('image'), 'features', $feature->image_path);
        } elseif ($request->boolean('remove_image')) {
            $this->images->delete($feature->image_path);
            $data['image_path'] = null;
        }

        return $data;
    }
}
