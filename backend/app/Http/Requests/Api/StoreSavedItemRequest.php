<?php

namespace App\Http\Requests\Api;

use App\Enums\SavedItemType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSavedItemRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::enum(SavedItemType::class)],
            'ref' => ['required', 'string', 'max:120'],
            'title' => ['required', 'string', 'max:160'],
            'subtitle' => ['nullable', 'string', 'max:160'],
        ];
    }
}
