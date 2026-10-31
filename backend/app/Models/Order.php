<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

#[Fillable(['user_id', 'plan_id', 'payment_method', 'gateway', 'currency', 'amount'])]
class Order extends Model
{
    protected function casts(): array
    {
        return ['amount' => 'decimal:2', 'paid_at' => 'datetime'];
    }

    protected static function booted(): void
    {
        static::creating(function (Order $order) {
            $order->reference ??= 'QN-'.Str::upper(Str::random(8));
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Marks the order paid and extends the user's Plus membership. Safe to call twice
     * (webhooks retry): the row lock + status check make it idempotent.
     */
    public function markPaid(?string $gatewayRef = null): void
    {
        DB::transaction(function () use ($gatewayRef) {
            $order = static::whereKey($this->id)->lockForUpdate()->first();

            if (! $order->isPending()) {
                return;
            }

            $order->forceFill(['status' => 'paid', 'paid_at' => now(), 'gateway_ref' => $gatewayRef ?? $order->gateway_ref])->save();

            $user = $order->user()->lockForUpdate()->first();
            $user->forceFill(['plus_until' => $order->plan->extend($user->plus_until)])->save();
        });

        $this->refresh();
    }

    public function markFailed(): void
    {
        static::whereKey($this->id)->where('status', 'pending')->update(['status' => 'failed']);
        $this->refresh();
    }
}
