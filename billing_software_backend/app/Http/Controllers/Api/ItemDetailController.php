<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ItemDetailController extends Controller
{
    public function index(Request $request)
    {
        $companyId = intval($request->input('company_id') ?: $request->query('company_id', 0));
        $adminId = intval($request->input('admin_id') ?: $request->query('admin_id', 0));
        $itemId = intval($request->input('item_id') ?: $request->query('item_id', 0));
        $from = $request->input('from_date') ?: $request->query('from_date', '');
        $to = $request->input('to_date') ?: $request->query('to_date', '');
        $hideInactive = filter_var(
            $request->input('hide_inactive_dates', $request->query('hide_inactive_dates', true)),
            FILTER_VALIDATE_BOOLEAN
        );

        if (!$companyId && !$adminId) {
            return response()->json(['status' => false, 'message' => 'company_id or admin_id required']);
        }
        if (!$itemId || !$from || !$to) {
            return response()->json(['status' => false, 'message' => 'item_id, from_date and to_date required']);
        }

        $from = date('Y-m-d', strtotime($from));
        $to = date('Y-m-d', strtotime($to));
        if ($to < $from) { [$from, $to] = [$to, $from]; }

        $companyIds = $companyId > 0
            ? [$companyId]
            : DB::table('companies')->where('admin_id', $adminId)->where('is_deleted', 0)->pluck('id')->map(fn($id) => intval($id))->all();

        $product = DB::table('products')
            ->where('id', $itemId)
            ->where('is_deleted', 0)
            ->whereIn('company_id', $companyIds)
            ->first(['id', 'product_name', 'stock']);

        if (!$product) {
            return response()->json(['status' => false, 'message' => 'Item not found']);
        }

        $movements = [];
        $addMovement = function (string $date, float $sale, float $purchase, float $adjustment = 0.0) use (&$movements) {
            if (!isset($movements[$date])) {
                $movements[$date] = ['sale_quantity' => 0.0, 'purchase_quantity' => 0.0, 'adjustment_quantity' => 0.0];
            }
            $movements[$date]['sale_quantity'] += $sale;
            $movements[$date]['purchase_quantity'] += $purchase;
            $movements[$date]['adjustment_quantity'] += $adjustment;
        };

        $invoiceQuery = DB::table('invoices')
            ->whereBetween(DB::raw('DATE(created_at)'), [$from, $to])
            ->whereNotNull('customer_id')
            ->where('customer_id', '>', 0)
            ->whereIn('company_id', $companyIds);
        foreach ($invoiceQuery->get(['created_at', 'products']) as $invoice) {
            foreach ($this->decodeLines($invoice->products) as $line) {
                if (intval($line['product_id'] ?? 0) !== $itemId) { continue; }
                $addMovement(substr((string)$invoice->created_at, 0, 10), $this->lineQuantity($line), 0.0);
            }
        }

        $purchaseQuery = DB::table('purchase_items as pi')
            ->join('purchases as pr', 'pi.purchase_id', '=', 'pr.id')
            ->where('pi.product_id', $itemId)
            ->where('pr.status', 'submitted')
            ->whereBetween('pr.purchase_date', [$from, $to])
            ->whereIn('pr.company_id', $companyIds)
            ->get(['pr.purchase_date', 'pi.quantity']);
        foreach ($purchaseQuery as $purchase) {
            $addMovement(substr((string)$purchase->purchase_date, 0, 10), 0.0, floatval($purchase->quantity));
        }

        if (Schema::hasTable('credit_notes')) {
            $creditNotes = DB::table('credit_notes')
                ->where('is_deleted', 0)
                ->whereBetween('return_date', [$from, $to])
                ->whereIn('company_id', $companyIds)
                ->get(['return_date', 'products']);
            foreach ($creditNotes as $note) {
                foreach ($this->decodeLines($note->products) as $line) {
                    if (intval($line['product_id'] ?? 0) !== $itemId) { continue; }
                    $addMovement(substr((string)$note->return_date, 0, 10), -$this->lineQuantity($line), 0.0);
                }
            }
        }

        if (Schema::hasTable('debit_notes')) {
            $debitNotes = DB::table('debit_notes')
                ->where('is_deleted', 0)
                ->whereBetween('return_date', [$from, $to])
                ->whereIn('company_id', $companyIds)
                ->get(['return_date', 'products']);
            foreach ($debitNotes as $note) {
                foreach ($this->decodeLines($note->products) as $line) {
                    if (intval($line['product_id'] ?? 0) !== $itemId) { continue; }
                    $addMovement(substr((string)$note->return_date, 0, 10), 0.0, -$this->lineQuantity($line));
                }
            }
        }

        $dateBefore = date('Y-m-d', strtotime($from . ' -1 day'));
        $openingQuantity = floatval($product->stock) - ($this->deltaAfter($companyIds, $dateBefore)[$itemId] ?? 0.0);
        $openingQuantity = round($openingQuantity, 2);
        $closingQuantity = $openingQuantity;
        $rows = [[
            'date' => $from,
            'sale_quantity' => 0.0,
            'purchase_quantity' => 0.0,
            'adjustment_quantity' => 0.0,
            'closing_quantity' => $openingQuantity,
            'purchase_label' => 'Beginning stock',
            'is_beginning' => true,
        ]];

        $cursor = strtotime($from);
        $last = strtotime($to);
        while ($cursor <= $last) {
            $date = date('Y-m-d', $cursor);
            $movement = $movements[$date] ?? ['sale_quantity' => 0.0, 'purchase_quantity' => 0.0, 'adjustment_quantity' => 0.0];
            $active = abs($movement['sale_quantity']) > 0 || abs($movement['purchase_quantity']) > 0 || abs($movement['adjustment_quantity']) > 0;
            if (!$hideInactive || $active) {
                $closingQuantity += $movement['purchase_quantity'] + $movement['adjustment_quantity'] - $movement['sale_quantity'];
                $rows[] = [
                    'date' => $date,
                    'sale_quantity' => round($movement['sale_quantity'], 2),
                    'purchase_quantity' => round($movement['purchase_quantity'], 2),
                    'adjustment_quantity' => round($movement['adjustment_quantity'], 2),
                    'closing_quantity' => round($closingQuantity, 2),
                    'purchase_label' => '',
                    'is_beginning' => false,
                ];
            }
            $cursor = strtotime('+1 day', $cursor);
        }

        return response()->json([
            'status' => true,
            'item' => ['id' => intval($product->id), 'name' => trim((string)$product->product_name)],
            'data' => $rows,
        ]);
    }

    private function deltaAfter(array $companyIds, string $after): array
    {
        $delta = [];
        $purchases = DB::table('purchase_items as pi')
            ->join('purchases as pr', 'pi.purchase_id', '=', 'pr.id')
            ->whereDate('pr.purchase_date', '>', $after)
            ->where('pr.status', 'submitted')
            ->whereIn('pr.company_id', $companyIds)
            ->select('pi.product_id', DB::raw('SUM(pi.quantity) as qty'))
            ->groupBy('pi.product_id')
            ->get();
        foreach ($purchases as $row) { $delta[intval($row->product_id)] = ($delta[intval($row->product_id)] ?? 0) + floatval($row->qty); }

        $this->addJsonDeltas($delta, DB::table('invoices')->whereDate('created_at', '>', $after)->whereIn('company_id', $companyIds)->get(['products']), 'products', -1.0);
        if (Schema::hasTable('credit_notes')) {
            $this->addJsonDeltas($delta, DB::table('credit_notes')->where('is_deleted', 0)->whereDate('return_date', '>', $after)->whereIn('company_id', $companyIds)->get(['products']), 'products', 1.0);
        }
        if (Schema::hasTable('debit_notes')) {
            $this->addJsonDeltas($delta, DB::table('debit_notes')->where('is_deleted', 0)->whereDate('return_date', '>', $after)->whereIn('company_id', $companyIds)->get(['products']), 'products', -1.0);
        }
        return $delta;
    }

    private function addJsonDeltas(array &$delta, $rows, string $column, float $sign): void
    {
        foreach ($rows as $row) {
            foreach ($this->decodeLines($row->{$column} ?? null) as $line) {
                $id = intval($line['product_id'] ?? 0);
                if ($id > 0) { $delta[$id] = ($delta[$id] ?? 0) + $sign * $this->lineQuantity($line); }
            }
        }
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