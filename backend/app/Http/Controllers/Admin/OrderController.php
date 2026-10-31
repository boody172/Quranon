<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\View\View;

class OrderController extends Controller
{
    public function index(Request $request): View
    {
        $status = $request->validate(['status' => ['nullable', Rule::in(['pending', 'paid', 'failed'])]])['status'] ?? null;

        return view('admin.orders.index', [
            'orders' => Order::with(['user:id,name,email', 'plan:id,slug'])
                ->when($status, fn ($q) => $q->where('status', $status))
                ->when($request->string('q')->trim()->value(), fn ($q, $term) => $q->where('reference', $term))
                ->latest()->paginate(30)->withQueryString(),
            'status' => $status,
        ]);
    }

    /** Confirms a manual transfer (InstaPay, bank) after checking it arrived. */
    public function markPaid(Order $order): RedirectResponse
    {
        abort_unless($order->gateway === 'manual' && $order->isPending(), 422);
        $order->markPaid();

        return back()->with('status', "تم تفعيل بلس للطلب {$order->reference}.");
    }

    public function cancel(Order $order): RedirectResponse
    {
        abort_unless($order->isPending(), 422);
        $order->forceFill(['status' => 'cancelled'])->save();

        return back()->with('status', "أُلغي الطلب {$order->reference}.");
    }
}
