<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\TranslatableFields;
use App\Models\PaymentMethod;
use App\Services\Payments\GatewayManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\View\View;

class PaymentMethodController extends Controller
{
    use TranslatableFields;

    public function index(GatewayManager $gateways): View
    {
        return view('admin.payment-methods.index', [
            'methods' => PaymentMethod::orderBy('sort')->get(),
            'configured' => collect(PaymentMethod::GATEWAYS)->keys()->mapWithKeys(fn ($g) => [$g => $gateways->isConfigured($g)]),
        ]);
    }

    public function create(): View
    {
        return view('admin.payment-methods.form', ['method' => new PaymentMethod([
            'gateway' => 'manual', 'countries' => ['eg'], 'is_active' => true, 'sort' => PaymentMethod::max('sort') + 1,
        ])]);
    }

    public function store(Request $request): RedirectResponse
    {
        PaymentMethod::create($this->validated($request));

        return to_route('admin.payment-methods.index')->with('status', 'تمت إضافة طريقة الدفع.');
    }

    public function edit(PaymentMethod $paymentMethod): View
    {
        return view('admin.payment-methods.form', ['method' => $paymentMethod]);
    }

    public function update(Request $request, PaymentMethod $paymentMethod): RedirectResponse
    {
        $paymentMethod->update($this->validated($request, $paymentMethod));

        return to_route('admin.payment-methods.index')->with('status', 'تم الحفظ.');
    }

    public function destroy(PaymentMethod $paymentMethod): RedirectResponse
    {
        $paymentMethod->delete();

        return to_route('admin.payment-methods.index')->with('status', 'تم الحذف.');
    }

    private function validated(Request $request, ?PaymentMethod $method = null): array
    {
        $data = $request->validate([
            'code' => ['required', 'alpha_dash:ascii', 'max:30', Rule::unique('payment_methods')->ignore($method)],
            ...$this->translatable('name', 40),
            ...$this->translatable('instructions', 400, required: false),
            'gateway' => ['required', Rule::in(array_keys(PaymentMethod::GATEWAYS))],
            'gateway_option' => [Rule::requiredIf($request->input('gateway') === 'paymob'), 'nullable', 'regex:/^\d{1,12}$/'],
            'countries' => ['required', 'array', 'min:1'],
            'countries.*' => [Rule::in(array_keys(PaymentMethod::REGIONS))],
            'sort' => ['required', 'integer', 'min:0', 'max:999'],
        ], ['gateway_option.required' => 'اكتب رقم الـ Integration ID من لوحة Paymob.']);

        return $this->cleanTranslations($data, 'instructions') + ['is_active' => $request->boolean('is_active')];
    }
}
