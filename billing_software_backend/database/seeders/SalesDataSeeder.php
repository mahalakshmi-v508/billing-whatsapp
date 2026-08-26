<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class SalesDataSeeder extends Seeder
{
    public function run(): void
    {
        $companyId = 1;
        $now = Carbon::now();

        // ── Customers ──
        $customers = [
            ['name' => 'Ramanathan',   'phone' => '9876543210', 'address' => 'Chennai', 'status' => 'active'],
            ['name' => 'Priya',        'phone' => '9876543211', 'address' => 'T Nagar, Chennai', 'status' => 'active'],
            ['name' => 'Murugan',      'phone' => '9876543212', 'address' => 'Adyar, Chennai', 'status' => 'active'],
            ['name' => 'Lakshmi',      'phone' => '9876543213', 'address' => 'Velachery, Chennai', 'status' => 'active'],
            ['name' => 'Senthil',      'phone' => '9876543214', 'address' => 'Anna Nagar, Chennai', 'status' => 'active'],
            ['name' => 'Kavitha',      'phone' => '9876543215', 'address' => 'Porur, Chennai', 'status' => 'active'],
            ['name' => 'Arun',         'phone' => '9876543216', 'address' => 'Tambaram, Chennai', 'status' => 'active'],
            ['name' => 'Meena',        'phone' => '9876543217', 'address' => 'Mylapore, Chennai', 'status' => 'active'],
        ];

        $custIds = [];
        foreach ($customers as $c) {
            $existing = DB::table('customers')->where('phone', $c['phone'])->first();
            if ($existing) {
                $custIds[] = $existing->id;
            } else {
                $custIds[] = DB::table('customers')->insertGetId(array_merge($c, [
                    'is_deleted'  => 0,
                    'created_at'  => $now,
                ]));
            }
        }

        // ── Products for company_id=1 ──
        $products = DB::table('products')->where('company_id', $companyId)->where('is_deleted', 0)->get(['id', 'product_name', 'sale_price', 'price', 'stock']);
        $productMap = [];
        foreach ($products as $p) {
            $productMap[$p->product_name] = $p;
        }

        $findProduct = function ($name) use ($productMap) {
            return $productMap[$name] ?? null;
        };

        // ── Invoices (Sales) ──
        $invoices = [
            // Invoice 1 - Ramanathan
            [
                'customer_name' => 'Ramanathan',
                'items' => [
                    ['name' => 'Coca Cola 750ml', 'qty' => 3],
                    ['name' => 'Lays Classic Salted 52g', 'qty' => 5],
                    ['name' => 'Parle-G Biscuit 80g', 'qty' => 10],
                    ['name' => 'Amul Butter 100g', 'qty' => 2],
                ],
            ],
            // Invoice 2 - Priya
            [
                'customer_name' => 'Priya',
                'items' => [
                    ['name' => 'Dairy Milk 40g', 'qty' => 4],
                    ['name' => 'Oreo Original 120g', 'qty' => 3],
                    ['name' => 'Amul Taaza Milk 500ml', 'qty' => 5],
                    ['name' => 'Head Shoulders 180ml', 'qty' => 1],
                    ['name' => 'Lifebuoy Soap 100g', 'qty' => 2],
                ],
            ],
            // Invoice 3 - Murugan
            [
                'customer_name' => 'Murugan',
                'items' => [
                    ['name' => 'India Gate Basmati Rice 5kg', 'qty' => 2],
                    ['name' => 'Fortune Sunflower Oil 1L', 'qty' => 3],
                    ['name' => 'Tata Sampann Moong Dal 1kg', 'qty' => 2],
                    ['name' => 'Everest Chicken Masala 100g', 'qty' => 4],
                ],
            ],
            // Invoice 4 - Lakshmi
            [
                'customer_name' => 'Lakshmi',
                'items' => [
                    ['name' => 'Pepsi 750ml', 'qty' => 2],
                    ['name' => 'Kurkure Masala Munch 90g', 'qty' => 3],
                    ['name' => 'Britannia Good Day 75g', 'qty' => 4],
                    ['name' => 'Aavin Milk 500ml', 'qty' => 6],
                    ['name' => 'Surf Excel 1kg', 'qty' => 1],
                ],
            ],
            // Invoice 5 - Senthil
            [
                'customer_name' => 'Senthil',
                'items' => [
                    ['name' => 'Red Bull 250ml', 'qty' => 2],
                    ['name' => 'KitKat 4 Finger', 'qty' => 3],
                    ['name' => 'Saffola Gold Oil 1L', 'qty' => 2],
                    ['name' => 'Colgate MaxFresh 150g', 'qty' => 2],
                    ['name' => 'Dettol Soap 75g', 'qty' => 3],
                ],
            ],
            // Invoice 6 - Kavitha
            [
                'customer_name' => 'Kavitha',
                'items' => [
                    ['name' => 'Sprite 750ml', 'qty' => 4],
                    ['name' => 'Lays Magic Masala 52g', 'qty' => 6],
                    ['name' => 'Perk 40g', 'qty' => 5],
                    ['name' => 'Mother Dairy Curd 400g', 'qty' => 3],
                ],
            ],
            // Invoice 7 - Arun
            [
                'customer_name' => 'Arun',
                'items' => [
                    ['name' => 'Mountain Dew 750ml', 'qty' => 3],
                    ['name' => 'Bingo Mad Angles 80g', 'qty' => 4],
                    ['name' => 'Daawat Basmati Rice 1kg', 'qty' => 5],
                    ['name' => 'Sunsilk Black 180ml', 'qty' => 2],
                    ['name' => 'Ariel Matic 1kg', 'qty' => 1],
                    ['name' => 'Lizol Floor Cleaner 500ml', 'qty' => 2],
                ],
            ],
            // Invoice 8 - Meena
            [
                'customer_name' => 'Meena',
                'items' => [
                    ['name' => 'Real Mango Juice 1L', 'qty' => 2],
                    ['name' => 'Tropicana Apple 1L', 'qty' => 2],
                    ['name' => 'Amul Cheese Slices 200g', 'qty' => 1],
                    ['name' => 'Nivea Soft Cream 50ml', 'qty' => 1],
                    ['name' => 'MDH Chana Masala 100g', 'qty' => 2],
                ],
            ],
            // Invoice 9 - Ramanathan (repeat)
            [
                'customer_name' => 'Ramanathan',
                'items' => [
                    ['name' => 'Fanta 600ml', 'qty' => 3],
                    ['name' => 'Kurkure Masala Munch 90g', 'qty' => 4],
                    ['name' => 'Lux Soap 100g', 'qty' => 3],
                    ['name' => 'Vim Dishwash Liquid 500ml', 'qty' => 1],
                ],
            ],
            // Invoice 10 - Priya (repeat)
            [
                'customer_name' => 'Priya',
                'items' => [
                    ['name' => 'Amul Vanilla Cone', 'qty' => 4],
                    ['name' => 'Amul Chocolate Cup', 'qty' => 3],
                    ['name' => 'Kwality Wall\'s Magnum Stick', 'qty' => 2],
                    ['name' => 'Pepsodent 150g', 'qty' => 2],
                ],
            ],
            // Invoice 11 - Murugan (repeat)
            [
                'customer_name' => 'Murugan',
                'items' => [
                    ['name' => 'Coca Cola 750ml', 'qty' => 6],
                    ['name' => 'Parle-G Biscuit 80g', 'qty' => 20],
                    ['name' => 'Amul Taaza Milk 500ml', 'qty' => 10],
                ],
            ],
            // Invoice 12 - Lakshmi (repeat)
            [
                'customer_name' => 'Lakshmi',
                'items' => [
                    ['name' => 'India Gate Basmati Rice 5kg', 'qty' => 1],
                    ['name' => 'Saffola Gold Oil 1L', 'qty' => 1],
                    ['name' => 'Lifebuoy Soap 100g', 'qty' => 5],
                    ['name' => 'Colgate MaxFresh 150g', 'qty' => 3],
                ],
            ],
            // Invoice 13 - Walk-in
            [
                'customer_name' => 'Walk-in Customer',
                'items' => [
                    ['name' => 'Coca Cola 750ml', 'qty' => 1],
                    ['name' => 'Lays Classic Salted 52g', 'qty' => 2],
                    ['name' => 'Dairy Milk 40g', 'qty' => 1],
                ],
            ],
            // Invoice 14 - Walk-in
            [
                'customer_name' => 'Walk-in Customer',
                'items' => [
                    ['name' => 'Pepsi 750ml', 'qty' => 2],
                    ['name' => 'Britannia Good Day 75g', 'qty' => 2],
                    ['name' => 'Aavin Milk 500ml', 'qty' => 3],
                ],
            ],
            // Invoice 15 - Senthil (repeat)
            [
                'customer_name' => 'Senthil',
                'items' => [
                    ['name' => 'Surf Excel 1kg', 'qty' => 2],
                    ['name' => 'Fortune Sunflower Oil 1L', 'qty' => 2],
                    ['name' => 'Tata Sampann Moong Dal 1kg', 'qty' => 1],
                    ['name' => 'Everest Chicken Masala 100g', 'qty' => 3],
                ],
            ],
        ];

        $invoiceCount = 0;
        foreach ($invoices as $idx => $inv) {
            $custId = null;
            foreach ($custIds as $ci => $cid) {
                if ($customers[$ci]['name'] === $inv['customer_name']) { $custId = $cid; break; }
            }

            $productsJson = [];
            $subTotal = 0;
            $gstTotal = 0;

            foreach ($inv['items'] as $item) {
                $p = $findProduct($item['name']);
                if (!$p) continue;

                $qty = $item['qty'];
                $price = floatval($p->sale_price ?: $p->price);
                $lineTotal = $price * $qty;
                $gst = ($p->gst_percentage ?? 0) / 100;
                $lineGst = $lineTotal * $gst;

                $productsJson[] = [
                    'product_id' => $p->id,
                    'product_name' => $p->product_name,
                    'quantity' => $qty,
                    'price' => $price,
                    'total' => $lineTotal,
                    'gst_percentage' => $p->gst_percentage ?? 0,
                    'gst_amount' => round($lineGst, 2),
                ];

                $subTotal += $lineTotal;
                $gstTotal += $lineGst;
            }

            if (empty($productsJson)) continue;

            $totalAmount = round($subTotal + $gstTotal, 2);
            $invoiceNo = 'INV-' . str_pad(1000 + $idx, 4, '0', STR_PAD_LEFT);
            $daysAgo = rand(1, 45);
            $createdAt = $now->copy()->subDays($daysAgo)->subHours(rand(0, 12));

            DB::table('invoices')->insert([
                'invoice_no'      => $invoiceNo,
                'customer_id'     => $custId,
                'customer_name'   => $inv['customer_name'],
                'customer_phone'  => $custId ? ($customers[array_search($custId, $custIds)]['phone'] ?? '') : '',
                'cashier_id'      => null,
                'products'        => json_encode($productsJson),
                'sub_total'       => round($subTotal, 2),
                'gst_total'       => round($gstTotal, 2),
                'total_amount'    => $totalAmount,
                'paid_amount'     => $totalAmount,
                'balance_amount'  => 0,
                'previous_balance'=> 0,
                'current_balance' => 0,
                'payment_method'  => 'cash',
                'payment_type'    => 'cash',
                'gst_type'        => 'with_gst',
                'gst_no'          => '',
                'payment_status'  => 'paid',
                'company_id'      => $companyId,
                'due_date'        => null,
                'created_at'      => $createdAt->format('Y-m-d H:i:s'),
            ]);
            $invoiceCount++;
        }

        $this->command->info("Created {$invoiceCount} invoices for padmavathi Collection");
        $this->command->info("Customers: " . DB::table('customers')->where('is_deleted', 0)->count());
        $this->command->info("Total invoices: " . DB::table('invoices')->where('company_id', $companyId)->count());
    }
}
