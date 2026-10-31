<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Feature;
use App\Models\Reciter;
use App\Models\SavedItem;
use App\Models\Scholar;
use App\Models\User;
use Illuminate\View\View;

class DashboardController extends Controller
{
    public function __invoke(): View
    {
        return view('admin.dashboard', [
            'stats' => [
                ['label' => 'المميزات', 'value' => Feature::count(), 'route' => 'admin.features.index'],
                ['label' => 'القرّاء', 'value' => Reciter::count(), 'route' => 'admin.reciters.index'],
                ['label' => 'العلماء', 'value' => Scholar::count(), 'route' => 'admin.scholars.index'],
                ['label' => 'المستخدمون', 'value' => User::where('is_admin', false)->count(), 'route' => 'admin.users.index'],
            ],
            'savedCount' => SavedItem::count(),
            'latestUsers' => User::where('is_admin', false)->latest()->limit(5)->get(['name', 'email', 'created_at']),
        ]);
    }
}
