<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Bill Wise Profit — profit/loss for each individual sale invoice across a
 * date range, optionally scoped to a single party (customer).
 *
 * Everything is derived from the real transaction tables (never fabricated):
 *
 *   Total Sale Amount  = the invoice's stored `total_amount` (the bill value
 *                        the customer pays, incl. GST when applicable).
 *   Sale Value (net)   = Σ per-line net value (amount minus embedded tax) —
 *                        the same ex-tax line value used by
 *                        ItemWiseProfitLossController ('sale' column).
 *   Cost Total         = Σ (line qty × products.purchase_price) — the same
 *                        master purchase/cost price the existing Stock,
 *                        Low-Stock and Item-wise P&L reports use.
 *   GST Total          = Σ per-line tax (stored tax_amount, else derived from
 *                        the line GST% the same way item-wise P&L does).
 *   Profit / Loss      = Sale Value (net) − Cost Total
 *                        (>0 profit, <0 loss, =0 break-even).
 *   Profit %           = Profit / Sale Value × 100 (0 when sale is zero).
 *
 * The endpoint only reads — it never writes.
 */
class BillWiseProfitController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'from_date'  => 'required|date',
            'to_date'    => 'required|date',
            'company_id' => 'nullable|integer',
            'admin_id'   => 'nullable|integer',
            'party_id'   => 'nullable|integer',
        ]);

        $company_id = intval($validated['company_id'] ?? 0);
        $admin_id   = intval($validated['admin_id'] ?? 0);
        $party_id   = intval($validated['party_id'] ?? 0);
        $from       = date('Y-m-d', strtotime($validated['from_date']));
        $to         = date('Y-m-d', strtotime($validated['to_date']));
        if ($to < $from) { [$from, $to] = [$to, $from]; }

        if (!$company_id && !$admin_id) {
            return response()->json(['status' => false, 'message' => 'company_id or admin_id required'], 422);
        }

        if ($company_id > 0) {
            $companyIds = [$company_id];
        } else {
            $companyIds = DB::table('companies')
                ->where('admin_id', $admin_id)
                ->where('is_deleted', 0)
                ->pluck('id')
                ->map(fn($id) => intval($id))
                ->all();
            if (empty($companyIds)) {
                return response()->json([
                    'status'    => true,
                    'from_date' => $from,
                    'to_date'   => $to,
                    'data'      => [],
                    'summary'   => $this->emptySummary(),
                ]);
            }
        }

        // Master cost prices (products.purchase_price) + names, company scoped.
        // Deleted products are included so historical invoices can still be
        // valued — the row is only missing if the company has no such product.
        $prods = [];
        foreach (DB::table('products')
            ->whereIn('company_id', $companyIds)
            ->get(['id', 'product_name', 'purchase_price']) as $p) {
            $pid = intval($p->id);
            $prods[$pid] = $p;
        }

        // Party names for invoices that only store the customer_id.
        $custNames = [];
        if (Schema::hasTable('customers')) {
            foreach (DB::table('customers')->where('is_deleted', 0)->get(['id', 'name']) as $c) {
                $custNames[(int)$c->id] = trim((string)$c->name);
            }
        }

        $invQuery = DB::table('invoices')
            ->whereIn('company_id', $companyIds)
            ->whereBetween(DB::raw('DATE(created_at)'), [$from, $to])
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc');

        if ($party_id > 0) {
            $invQuery->where('customer_id', $party_id);
        }

        $rows = [];
        foreach ($invQuery->get([
            'id', 'invoice_no', 'customer_id', 'customer_name', 'sub_total',
            'gst_total', 'total_amount', 'gst_type', 'products', 'created_at',
        ]) as $inv) {
            $lines = $this->decodeLines($inv->products);

            $saleValue  = 0.0;
            $costTotal  = 0.0;
            $gstTotal   = 0.0;
            $discountTotal = 0.0;
            $itemCount  = 0;
            $details    = [];

            foreach ($lines as $line) {
                if (!is_array($line)) { continue; }
                $pid = intval($line['product_id'] ?? 0);
                $qty = $this->lineQty($line);

                $net = $this->lineNet($line);
                $tax = $this->lineTax($line);
                $disc = floatval($line['discount'] ?? $line['discount_amount'] ?? 0);

                $unitCost = ($pid > 0 && isset($prods[$pid])) ? floatval($prods[$pid]->purchase_price ?? 0) : 0.0;
                $lineCost = $qty * $unitCost;

                $saleValue       += $net;
                $costTotal       += $lineCost;
                $gstTotal        += $tax;
                $discountTotal   += $disc;
                $itemCount++;

                $details[] = [
                    'product_id'      => $pid,
                    'product_name'    => $this->lineName($line),
                    'qty'             => round($qty, 2),
                    'price'           => round(floatval($line['price'] ?? $line['rate'] ?? 0), 2),
                    'discount'        => round($disc, 2),
                    'gst_percentage'  => round(floatval($line['gst'] ?? $line['gst_percentage'] ?? $line['tax_percent'] ?? $line['tax_rate'] ?? 0), 2),
                    'tax_amount'      => round($tax, 2),
                    'amount'          => round($this->lineAmount($line), 2),
                    'net_amount'      => round($net, 2),
                    'cost_amount'     => round($lineCost, 2),
                    'profit'          => round($net - $lineCost, 2),
                ];
            }

            $profit = $saleValue - $costTotal;
            $profitPercent = $saleValue > 0 ? ($profit / $saleValue) * 100 : 0.0;

            $partyName = trim((string)$inv->customer_name);
            if ($partyName === '') {
                $partyName = $custNames[(int)$inv->customer_id] ?? 'Customer';
            }

            $rows[] = [
                'id'               => (int)$inv->id,
                'invoice_no'       => $inv->invoice_no ?: '',
                'invoice_date'     => $inv->created_at ? date('Y-m-d', strtotime($inv->created_at)) : '',
                'party_id'         => (int)$inv->customer_id,
                'party'            => $partyName,
                'sub_total'        => round(floatval($inv->sub_total ?? 0), 2),
                'gst_type'         => $inv->gst_type ?: '',
                'gst_total'        => round($gstTotal, 2),
                'discount_total'   => round($discountTotal, 2),
                'sale_value'       => round($saleValue, 2),
                'total_sale_amount'=> round(floatval($inv->total_amount ?? ($saleValue + $gstTotal)), 2),
                'cost_total'       => round($costTotal, 2),
                'profit'           => round($profit, 2),
                'profit_percent'   => round($profitPercent, 2),
                'item_count'       => $itemCount,
                'details'          => $details,
            ];
        }

        $totalSaleAmount = round(array_sum(array_column($rows, 'total_sale_amount')), 2);
        $totalProfit     = round(array_sum(array_column($rows, 'profit')), 2);
        $totalCost       = round(array_sum(array_column($rows, 'cost_total')), 2);

        return response()->json([
            'status'    => true,
            'from_date' => $from,
            'to_date'   => $to,
            'party_id'  => $party_id,
            'data'      => $rows,
            'summary'   => [
                'invoice_count'      => count($rows),
                'total_sale_amount'  => $totalSaleAmount,
                'total_cost'         => $totalCost,
                'total_profit'       => $totalProfit,
            ],
        ]);
    }

    /** Decode a `products` JSON column (string or array) into a line list. */
    private function decodeLines($raw)
    {
        $decoded = is_string($raw) ? json_decode($raw, true) : $raw;
        return is_array($decoded) ? $decoded : [];
    }

    /** Quantity of a line. */
    private function lineQty(array $line)
    {
        return floatval($line['qty'] ?? $line['quantity'] ?? 0);
    }

    /** Value of a line excluding tax (handles inclusive `amount` lines). */
    private function lineNet(array $line)
    {
        $qty   = $this->lineQty($line);
        $price = floatval($line['price'] ?? $line['rate'] ?? 0);
        $disc  = floatval($line['discount'] ?? $line['discount_amount'] ?? 0);
        $tax   = $this->lineTax($line);

        $amtRaw = $line['amount'] ?? $line['total_amount'] ?? null;
        if ($amtRaw === null || $amtRaw === '') {
            $base = max(0.0, ($price * $qty) - $disc);
            $net  = $base - $tax;
        } else {
            $net = floatval($amtRaw) - $tax;
            if ($net < 0) {
                $net = max(0.0, ($price * $qty) - $disc) - $tax;
            }
        }
        return round(max(0.0, $net), 2);
    }

    /** Tax on a line (explicit stored value, else derived from GST%). */
    private function lineTax(array $line)
    {
        $tax = floatval($line['tax_amount'] ?? $line['tax'] ?? 0);
        if ($tax > 0) { return $tax; }
        $amtRaw = $line['amount'] ?? $line['total_amount'] ?? null;
        $gst    = floatval($line['gst'] ?? $line['gst_percentage'] ?? $line['tax_percent'] ?? $line['tax_rate'] ?? 0);
        if ($gst > 0) {
            if ($amtRaw !== null && $amtRaw !== '' && floatval($amtRaw) > 0) {
                // `amount` is treated as inclusive of tax in this app → derive embedded tax.
                return round(floatval($amtRaw) - (floatval($amtRaw) / (1 + $gst / 100)), 2);
            }
            $qty   = $this->lineQty($line);
            $price = floatval($line['price'] ?? $line['rate'] ?? 0);
            $disc  = floatval($line['discount'] ?? $line['discount_amount'] ?? 0);
            return round(max(0.0, ($price * $qty) - $disc) * $gst / 100, 2);
        }
        return 0.0;
    }

    /** Raw line amount (inclusive of tax) used for display only. */
    private function lineAmount(array $line)
    {
        $amtRaw = $line['amount'] ?? $line['total_amount'] ?? null;
        if ($amtRaw !== null && $amtRaw !== '') {
            return floatval($amtRaw);
        }
        $qty   = $this->lineQty($line);
        $price = floatval($line['price'] ?? $line['rate'] ?? 0);
        $disc  = floatval($line['discount'] ?? $line['discount_amount'] ?? 0);
        $gst   = floatval($line['gst'] ?? $line['gst_percentage'] ?? $line['tax_percent'] ?? $line['tax_rate'] ?? 0);
        $base  = max(0.0, ($price * $qty) - $disc);
        return $gst > 0 ? round($base + ($base * $gst / 100), 2) : round($base, 2);
    }

    /** Product name of a line, falling back to generic label. */
    private function lineName(array $line)
    {
        $name = trim((string)($line['product_name'] ?? $line['name'] ?? $line['item_name'] ?? $line['item'] ?? ''));
        return $name !== '' ? $name : 'Item';
    }

    private function emptySummary()
    {
        return [
            'invoice_count'     => 0,
            'total_sale_amount' => 0.0,
            'total_cost'        => 0.0,
            'total_profit'      => 0.0,
        ];
    }
}