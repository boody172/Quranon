<?php

namespace Database\Seeders;

use App\Models\PaymentMethod;
use App\Models\Plan;
use Illuminate\Database\Seeder;

/**
 * Suggested Plus pricing and the payment methods people actually use in each market.
 * Gateway methods stay hidden from the app until their keys are saved in Settings.
 */
class BillingSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            ['monthly', 'month', ['EGP' => 49, 'SAR' => 12, 'USD' => 2.99], false],
            ['yearly', 'year', ['EGP' => 399, 'SAR' => 99, 'USD' => 19.99], true],
            ['lifetime', 'lifetime', ['EGP' => 999, 'SAR' => 249, 'USD' => 49.99], false],
        ];
        foreach ($plans as $i => [$slug, $interval, $prices, $highlighted]) {
            Plan::updateOrCreate(['slug' => $slug], compact('interval', 'prices') + ['is_highlighted' => $highlighted, 'is_active' => true, 'sort' => $i]);
        }

        $methods = [
            // code, ar, en, gateway, countries, active
            ['card', 'بطاقة بنكية', 'Card', 'paymob', ['eg', 'sa'], true],
            ['apple_pay', 'Apple Pay', 'Apple Pay', 'paymob', ['eg', 'sa'], true],
            ['wallet', 'محفظة الموبايل', 'Mobile wallet', 'paymob', ['eg'], true],
            ['fawry', 'فوري', 'Fawry', 'paymob', ['eg'], false],
            ['mada', 'مدى', 'mada', 'paymob', ['sa'], true],
            ['instapay', 'إنستاباي', 'InstaPay', 'manual', ['eg'], false],
            ['paypal', 'باي بال أو بطاقة', 'PayPal or card', 'paypal', ['*'], true],
        ];
        foreach ($methods as $i => [$code, $ar, $en, $gateway, $countries, $active]) {
            PaymentMethod::updateOrCreate(['code' => $code], [
                'name' => ['ar' => $ar, 'en' => $en], 'gateway' => $gateway, 'countries' => $countries,
                'is_active' => $active, 'sort' => $i,
                'instructions' => $code === 'instapay' ? [
                    'ar' => 'حوّل قيمة الاشتراك عبر إنستاباي إلى العنوان: (اكتب عنوانك هنا)',
                    'en' => 'Send the amount via InstaPay to: (write your address here)',
                ] : null,
            ]);
        }
    }
}
