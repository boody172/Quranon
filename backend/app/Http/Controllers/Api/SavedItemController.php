<?php

namespace App\Http\Controllers\Api;

use App\Enums\SavedItemType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreSavedItemRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SavedItemController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $items = $request->user()->savedItems()->latest()->get(['type', 'ref', 'title', 'subtitle', 'created_at']);

        return response()->json(['data' => $items]);
    }

    public function store(StoreSavedItemRequest $request): JsonResponse
    {
        $data = $request->validated();

        $item = $request->user()->savedItems()->updateOrCreate(
            ['type' => $data['type'], 'ref' => $data['ref']],
            ['title' => $data['title'], 'subtitle' => $data['subtitle'] ?? null],
        );

        return response()->json(['data' => $item->only(['type', 'ref', 'title', 'subtitle'])], $item->wasRecentlyCreated ? 201 : 200);
    }

    public function destroy(Request $request, SavedItemType $type, string $ref): JsonResponse
    {
        $request->user()->savedItems()->where(['type' => $type, 'ref' => $ref])->delete();

        return response()->json(status: 204);
    }
}
