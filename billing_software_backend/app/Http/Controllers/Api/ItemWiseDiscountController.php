<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ItemWiseDiscountController extends Controller
{
    public function index(Request $request)
    {
        $companyId = intval($request->input('company_id') ?: $request->query('company_id', 0));
        $adminId = intval($request->input('admin_id') ?: $request->query('admin_id', 0));
        $categoryId = intval($request->input('category_id') ?: $request->query('category_id', 0));
        $subcategoryId = intval($request->input('subcategory_id') ?: $request->query('subcategory_id', 0));
        $itemName = trim((string)($request->input('item_name') ?: $request->query('item_name', '')));
        $from = $request->input('from_date') ?: $request->query('from_date', '');
        $to = $request->input('to_date') ?: $request->query('to_date', '');

        if (!$companyId && !$adminId) {
            return response()->json(['status' => false, 'message' => 'company_id or admin_id required']);
        }
        if (!$from || !$to) {
            return response()->json(['status' => false, 'message' => 'from_date and to_date required']);
        }
        $from = date('Y-m-d', strtotime($from));
        $to = date('Y-m-d', strtotime($to));
        if ($to < $from) { [$from, $to] = [$to, $from]; }

        $companyIds = $companyId > 0
            ? [$companyId]
            : DB::table('companies')->where('admin_id', $adminId)->where('is_deleted', 0)->pluck('id')->map(fn($id) => intval($id))->all();

        $products = DB::table('products as p')
            ->where('p.is_deleted', 0)
            ->whereIn('p.company_id', $companyIds)
            ->when($categoryId > 0, fn($query) => $query->where('p.category_id', $categoryId))
            ->when($subcategoryId > 0, fn($query) => $query->where('p.subcategory_id', $subcategoryId))
            ->get(['p.id', 'p.product_name']);
        $productIds = $products->pluck('id')->map(fn($id) => intval($id))->flip()->all();
        $productNames = $products->mapWithKeys(fn($product) => [intval($product->id) => trim((string)$product->product_name)])->all();

        $rows = [];
        $invoices = DB::table('invoices')
            ->whereBetween(DB::raw('DATE(created_at)'), [$from, $to])
            ->whereNotNull('customer_id')
            ->where('customer_id', '>', 0)
            ->whereIn('company_id', $companyIds)
            ->get(['products']);

        foreach ($invoices as $invoice) {
            foreach ($this->decodeLines($invoice->products) as $line) {
                $productId = intval($line['product_id'] ?? 0);
                if ($productId <= 0 || !isset($productIds[$productId])) { continue; }
                $name = $productNames[$productId] ?? trim((string)($line['product_name'] ?? ''));
                if ($itemName !== '' && stripos($name, $itemName) === false) { continue; }

                $quantity = $this->lineQuantity($line);
                $price = floatval($line['price'] ?? $line['rate'] ?? 0);
                $discount = max(0.0, floatval($line['discount'] ?? $line['discount_amount'] ?? 0));
                $amount = $line['amount'] ?? $line['total_amount'] ?? null;
                $saleAmount = $amount === null || $amount === ''
                    ? max(0.0, ($quantity * $price) - $discount)
                    : floatval($amount);

                if (!isset($rows[$productId])) {
                    $rows[$productId] = [
                        'id' => $productId,
                        'item_name' => $name ?: ('Item #' . $productId),
                        'total_qty_sold' => 0.0,
                        'total_sale_amount' => 0.0,
                        'total_discount_amount' => 0.0,
                        'discount_base' => 0.0,
                    ];
                }
                $rows[$productId]['total_qty_sold'] += $quantity;
                $rows[$productId]['total_sale_amount'] += $saleAmount;
                $rows[$productId]['total_discount_amount'] += $discount;
                $rows[$productId]['discount_base'] += max(0.0, $quantity * $price);
            }
        }

        $data = array_values($rows);
        foreach ($data as &$row) {
            $row['total_qty_sold'] = round($row['total_qty_sold'], 2);
            $row['total_sale_amount'] = round($row['total_sale_amount'], 2);
            $row['total_discount_amount'] = round($row['total_discount_amount'], 2);
            $row['avg_discount_percent'] = $row['discount_base'] > 0
                ? round(($row['total_discount_amount'] / $row['discount_base']) * 100, 2)
                : 0.0;
            unset($row['discount_base']);
        }
        unset($row);
        usort($data, fn($a, $b) => strcasecmp($a['item_name'], $b['item_name']));

        return response()->json([
            'status' => true,
            'data' => $data,
            'totals' => [
                'total_qty_sold' => round(array_sum(array_column($data, 'total_qty_sold')), 2),
                'total_sale_amount' => round(array_sum(array_column($data, 'total_sale_amount')), 2),
                'total_discount_amount' => round(array_sum(array_column($data, 'total_discount_amount')), 2),
            ],
        ]);
    }

    private function decodeLines($raw): array
    {
        $decoded = is_string($raw) ? json_decode($raw, true) : $raw;
        return is_array($decoded) ? $decoded : [];
    }

    private function lineQuantity(array $line): float
    {
        return floatval($line['qty'] ?? $line['quantity'] ?? 0);
    }
}