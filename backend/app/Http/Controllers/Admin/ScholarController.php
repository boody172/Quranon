<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ScholarRequest;
use App\Models\Scholar;
use App\Services\ImageStore;
use Illuminate\Http\RedirectResponse;
use Illuminate\View\View;

class ScholarController extends Controller
{
    public function __construct(private ImageStore $images) {}

    public function index(): View
    {
        return view('admin.scholars.index', ['scholars' => Scholar::ordered()->get()]);
    }

    public function create(): View
    {
        return view('admin.scholars.form', ['scholar' => new Scholar(['sort' => Scholar::max('sort') + 1, 'is_active' => true])]);
    }

    public function store(ScholarRequest $request): RedirectResponse
    {
        Scholar::create($this->payload($request, new Scholar));

        return to_route('admin.scholars.index')->with('status', 'تمت إضافة العالم.');
    }

    public function edit(Scholar $scholar): View
    {
        return view('admin.scholars.form', compact('scholar'));
    }

    public function update(ScholarRequest $request, Scholar $scholar): RedirectResponse
    {
        $scholar->update($this->payload($request, $scholar));

        return to_route('admin.scholars.index')->with('status', 'تم حفظ التعديلات.');
    }

    public function destroy(Scholar $scholar): RedirectResponse
    {
        $this->images->delete($scholar->photo_path);
        $scholar->delete();

        return to_route('admin.scholars.index')->with('status', 'تم الحذف.');
    }

    private function payload(ScholarRequest $request, Scholar $scholar): array
    {
        $data = $request->payload();

        if ($request->hasFile('photo')) {
            $data['photo_path'] = $this->images->store($request->file('photo'), 'scholars', $scholar->photo_path);
        } elseif ($request->boolean('remove_photo')) {
            $this->images->delete($scholar->photo_path);
            $data['photo_path'] = null;
        }

        return $data;
    }
}
