<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReciterRequest;
use App\Models\Reciter;
use App\Services\ImageStore;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ReciterController extends Controller
{
    public function __construct(private ImageStore $images) {}

    public function index(Request $request): View
    {
        $reciters = Reciter::ordered()
            ->when($request->string('q')->trim()->value(), fn ($q, $term) => $q->where('name', 'like', "%{$term}%"))
            ->paginate(30)
            ->withQueryString();

        return view('admin.reciters.index', compact('reciters'));
    }

    public function create(): View
    {
        return view('admin.reciters.form', ['reciter' => new Reciter(['sort' => 0])]);
    }

    public function store(ReciterRequest $request): RedirectResponse
    {
        Reciter::create($this->payload($request, new Reciter));

        return to_route('admin.reciters.index')->with('status', 'تمت إضافة القارئ.');
    }

    public function edit(Reciter $reciter): View
    {
        return view('admin.reciters.form', compact('reciter'));
    }

    public function update(ReciterRequest $request, Reciter $reciter): RedirectResponse
    {
        $reciter->update($this->payload($request, $reciter));

        return to_route('admin.reciters.index')->with('status', 'تم حفظ التعديلات.');
    }

    public function destroy(Reciter $reciter): RedirectResponse
    {
        $this->images->delete($reciter->photo_path);
        $reciter->delete();

        return to_route('admin.reciters.index')->with('status', 'تم حذف القارئ.');
    }

    private function payload(ReciterRequest $request, Reciter $reciter): array
    {
        $data = $request->safe()->except(['photo', 'remove_photo']);

        if ($request->hasFile('photo')) {
            $data['photo_path'] = $this->images->store($request->file('photo'), 'reciters', $reciter->photo_path);
        } elseif ($request->boolean('remove_photo')) {
            $this->images->delete($reciter->photo_path);
            $data['photo_path'] = null;
        }

        return $data;
    }
}
