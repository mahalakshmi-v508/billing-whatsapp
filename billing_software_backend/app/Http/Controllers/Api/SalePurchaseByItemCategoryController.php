<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SalePurchaseByItemCategoryController extends Controller
{
    public function index(Request $request)
    {
        $companyId = intval($request->input('company_id') ?: $request->query('company_id', 0));
        $adminId = intval($request->input('admin_id') ?: $request->query('admin_id', 0));
        $partyId = intval($request->input('party_id') ?: $request->query('party_id', 0));
        $partyType = trim((string)($request->input('party_type') ?: $request->query('party_type', '')));
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
            ->leftJoin('categories as c', 'p.category_id', '=', 'c.id')
            ->where('p.is_deleted', 0)
            ->whereIn('p.company_id', $companyIds)
            ->get(['p.id', 'p.category_id', 'c.name as category_name']);

        $categoryByProduct = [];
        $rows = [];
        foreach ($products as $product) {
            $categoryId = intval($product->category_id);
            $key = $categoryId > 0 ? (string)$categoryId : 'uncategorized';
            $categoryByProduct[intval($product->id)] = $key;
            if (!isset($rows[$key])) {
                $rows[$key] = [
                    'id' => $categoryId ?: -1,
                    'item_category' => $categoryId > 0 ? trim((string)$product->category_name) : 'Uncategorized',
                    'sale_quantity' => 0.0,
                    'total_sale_amount' => 0.0,
                    'purchase_quantity' => 0.0,
                    'total_purchase_amount' => 0.0,
                ];
            }
        }

        $add = function (int $productId, float $saleQty, float $saleAmount, float $purchaseQty, float $purchaseAmount) use (&$rows, $categoryByProduct) {
            $key = $categoryByProduct[$productId] ?? null;
            if ($key === null || !isset($rows[$key])) { return; }
            $rows[$key]['sale_quantity'] += $saleQty;
            $rows[$key]['total_sale_amount'] += $saleAmount;
            $rows[$key]['purchase_quantity'] += $purchaseQty;
            $rows[$key]['total_purchase_amount'] += $purchaseAmount;
        };

        $invoices = DB::table('invoices')
            ->whereBetween(DB::raw('DATE(created_at)'), [$from, $to])
            ->whereNotNull('customer_id')
            ->where('customer_id', '>', 0)
            ->whereIn('company_id', $companyIds)
            ->when($partyType === 'customer' && $partyId > 0, fn($query) => $query->where('customer_id', $partyId))
            ->get(['products']);
        foreach ($invoices as $invoice) {
            foreach ($this->decodeLines($invoice->products) as $line) {
                $add(intval($line['product_id'] ?? 0), $this->lineQuantity($line), $this->lineNet($line), 0.0, 0.0);
            }
        }

        $purchases = DB::table('purchase_items as pi')
            ->join('purchases as pr', 'pi.purchase_id', '=', 'pr.id')
            ->where('pr.status', 'submitted')
            ->whereBetween('pr.purchase_date', [$from, $to])
            ->whereIn('pr.company_id', $companyIds)
            ->when($partyType === 'supplier' && $partyId > 0, fn($query) => $query->where('pr.supplier_id', $partyId))
            ->get(['pi.product_id', 'pi.quantity', 'pi.price']);
        foreach ($purchases as $purchase) {
            $quantity = floatval($purchase->quantity);
            $add(intval($purchase->product_id), 0.0, 0.0, $quantity, $quantity * floatval($purchase->price));
        }

        if (Schema::hasTable('credit_notes')) {
            $notes = DB::table('credit_notes')->where('is_deleted', 0)->whereBetween('return_date', [$from, $to])->whereIn('company_id', $companyIds)->get(['products']);
            foreach ($notes as $note) {
                foreach ($this->decodeLines($note->products) as $line) {
                    $add(intval($line['product_id'] ?? 0), -$this->lineQuantity($line), -$this->lineNet($line), 0.0, 0.0);
                }
            }
        }

        if (Schema::hasTable('debit_notes')) {
            $notes = DB::table('debit_notes')->where('is_deleted', 0)->whereBetween('return_date', [$from, $to])->whereIn('company_id', $companyIds)->get(['products']);
            foreach ($notes as $note) {
                foreach ($this->decodeLines($note->products) as $line) {
                    $add(intval($line['product_id'] ?? 0), 0.0, 0.0, -$this->lineQuantity($line), -$this->lineNet($line));
                }
            }
        }

        $data = array_values($rows);
        foreach ($data as &$row) {
            $row['sale_quantity'] = round($row['sale_quantity'], 2);
            $row['total_sale_amount'] = round($row['total_sale_amount'], 2);
            $row['purchase_quantity'] = round($row['purchase_quantity'], 2);
            $row['total_purchase_amount'] = round($row['total_purchase_amount'], 2);
        }
        unset($row);
        usort($data, fn($a, $b) => strcasecmp($a['item_category'], $b['item_category']));

        $totals = [
            'sale_quantity' => round(array_sum(array_column($data, 'sale_quantity')), 2),
            'total_sale_amount' => round(array_sum(array_column($data, 'total_sale_amount')), 2),
            'purchase_quantity' => round(array_sum(array_column($data, 'purchase_quantity')), 2),
            'total_purchase_amount' => round(array_sum(array_column($data, 'total_purchase_amount')), 2),
        ];

        return response()->json(['status' => true, 'data' => $data, 'totals' => $totals]);
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

    private function lineNet(array $line): float
    {
        $amount = $line['amount'] ?? $line['total_amount'] ?? null;
        $quantity = $this->lineQuantity($line);
        $price = floatval($line['price'] ?? $line['rate'] ?? 0);
        $discount = floatval($line['discount'] ?? $line['discount_amount'] ?? 0);
        $tax = floatval($line['tax_amount'] ?? 0);
        $net = $amount === null || $amount === '' ? ($price * $quantity) - $discount : floatval($amount);
        return round(max(0.0, $net - $tax), 2);
    }
}