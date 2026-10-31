<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Plan;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\View\View;

class PlanController extends Controller
{
    public function index(): View
    {
        return view('admin.plans.index', ['plans' => Plan::orderBy('sort')->get()]);
    }

    public function create(): View
    {
        return view('admin.plans.form', ['plan' => new Plan(['interval' => 'month', 'is_active' => true, 'sort' => Plan::max('sort') + 1, 'prices' => []])]);
    }

    public function store(Request $request): RedirectResponse
    {
        Plan::create($this->validated($request));

        return to_route('admin.plans.index')->with('status', 'تمت إضافة الباقة.');
    }

    public function edit(Plan $plan): View
    {
        return view('admin.plans.form', compact('plan'));
    }

    public function update(Request $request, Plan $plan): RedirectResponse
    {
        $plan->update($this->validated($request, $plan));

        return to_route('admin.plans.index')->with('status', 'تم حفظ الباقة.');
    }

    public function destroy(Plan $plan): RedirectResponse
    {
        // Plans with orders are archived, not deleted, so payment history stays intact.
        Order::where('plan_id', $plan->id)->exists() ? $plan->update(['is_active' => false]) : $plan->delete();

        return to_route('admin.plans.index')->with('status', 'تمت إزالة الباقة.');
    }

    private function validated(Request $request, ?Plan $plan = null): array
    {
        $data = $request->validate([
            'slug' => ['required', 'alpha_dash:ascii', 'max:40', Rule::unique('plans')->ignore($plan)],
            'interval' => ['required', Rule::in(array_keys(Plan::INTERVALS))],
            'prices' => ['required', 'array'],
            ...collect(Plan::CURRENCIES)->mapWithKeys(fn ($c) => ["prices.{$c}" => ['required', 'numeric', 'min:0.5', 'max:100000']])->all(),
            'sort' => ['required', 'integer', 'min:0', 'max:999'],
        ]);

        return $data + [
            'is_active' => $request->boolean('is_active'),
            'is_highlighted' => $request->boolean('is_highlighted'),
        ];
    }
}
