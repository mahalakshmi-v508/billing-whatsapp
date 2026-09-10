<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Item Wise Profit & Loss — per-item trading profit/loss across a date range,
 * derived entirely from the real transaction tables (never fabricated):
 *
 *   Sale            = invoice line values (ex-tax) within the range
 *   Sale Return     = credit_note line values (ex-tax) within the range
 *   Purchase        = purchase_items qty × price within the range
 *   Purchase Return = debit_note line values (ex-tax) within the range
 *   Opening Stock   = units on hand at the close of (from_date − 1 day)
 *                     × unit cost (in-range weighted-avg purchase cost when
 *                     available, else master purchase_price, else 0)
 *   Closing Stock   = units on hand at the close of to_date × unit cost
 *   Tax Receivable  = input tax on purchases − input tax on purchase returns
 *   Tax Payable     = output tax on sales − output tax on sale returns
 *   Mfg. Cost       = 0 (no mfg-cost field exists on products)
 *   Consumption Cost= 0 (no consumption field exists on products)
 *   Net Profit/Loss = Sale − Sale Return + Closing Stock − Opening Stock
 *                     − Purchase + Purchase Return − Mfg. − Consumption
 *
 * Stock is a live running counter on products.stock (there is no opening-stock
 * column and no stock-ledger table), so opening/closing is derived by unwinding
 * the net movement AFTER a date — the same approach as StockSummaryController:
 *
 *   as_of(D) = products.stock − delta(after D)
 *   delta    = −sales(>D) + purchases(>D) − purchaseReturns(>D) + saleReturns(>D)
 *
 * It only reads — it never writes.
 */
class ItemWiseProfitLossController extends Controller
{
    public function index(Request $request)
    {
        $company_id = intval($request->input('company_id') ?: $request->query('company_id', 0));
        $admin_id   = intval($request->input('admin_id') ?: $request->query('admin_id', 0));
        $from       = $request->input('from_date') ?: $request->query('from_date', '');
        $to         = $request->input('to_date') ?: $request->query('to_date', '');
        $itemsHavingSale = filter_var(
            $request->input('items_having_sale', $request->query('items_having_sale', false)),
            FILTER_VALIDATE_BOOLEAN
        );

        if (!$company_id && !$admin_id) {
            return response()->json(['status' => false, 'message' => 'company_id or admin_id required']);
        }
        if (!$from || !$to) {
            return response()->json(['status' => false, 'message' => 'from_date and to_date required']);
        }
        $from = date('Y-m-d', strtotime($from));
        $to   = date('Y-m-d', strtotime($to));
        if ($to < $from) { [$from, $to] = [$to, $from]; }

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
                return response()->json(['status' => true, 'data' => [], 'totals' => $this->emptyRow()]);
            }
        }

        // Base products.
        $products = DB::table('products as p')
            ->where('p.is_deleted', 0)
            ->whereIn('p.company_id', $companyIds)
            ->get(['id', 'product_name', 'stock', 'purchase_price']);

        $rows = [];
        foreach ($products as $p) {
            $pid = intval($p->id);
            $row = $this->emptyRow();
            $row['id'] = $pid;
            $row['item_name'] = trim((string)$p->product_name) ?: ('Item #' . $pid);
            $rows[$pid] = $row;
        }

        $dateBefore = date('Y-m-d', strtotime($from . ' -1 day'));
        $deltaOpen  = $this->deltaAfter($companyIds, $dateBefore); // opening qty = stock at close of from−1
        $deltaClose = $this->deltaAfter($companyIds, $to);         // closing qty = stock at close of to

        // ── SALES (invoices → products JSON) in range ──
        $invQuery = DB::table('invoices')
            ->whereBetween(DB::raw('DATE(created_at)'), [$from, $to])
            ->whereNotNull('customer_id')
            ->where('customer_id', '>', 0)
            ->whereIn('company_id', $companyIds);
        foreach ($invQuery->get(['id', 'products']) as $inv) {
            foreach ($this->decodeLines($inv->products) as $line) {
                $pid = intval($line['product_id'] ?? 0);
                if ($pid <= 0 || !isset($rows[$pid])) { continue; }
                $qty = floatval($line['qty'] ?? $line['quantity'] ?? 0);
                $net = $this->lineNet($line);
                $tax = $this->lineTax($line);
                $rows[$pid]['sale'] += $net;
                $rows[$pid]['sale_qty'] += $qty;
                $rows[$pid]['tax_payable'] += $tax;
            }
        }

        // ── SALE RETURNS (credit_notes → products JSON) in range ──
        if (Schema::hasTable('credit_notes')) {
            $cnQuery = DB::table('credit_notes')
                ->where('is_deleted', 0)
                ->whereBetween('return_date', [$from, $to])
                ->whereIn('company_id', $companyIds);
            foreach ($cnQuery->get(['id', 'products']) as $cn) {
                foreach ($this->decodeLines($cn->products) as $line) {
                    $pid = intval($line['product_id'] ?? 0);
                    if ($pid <= 0 || !isset($rows[$pid])) { continue; }
                    $net = $this->lineNet($line);
                    $tax = $this->lineTax($line);
                    $rows[$pid]['sale_return'] += $net;
                    $rows[$pid]['tax_payable'] -= $tax;
                }
            }
        }

        // ── PURCHASES (purchase_items) in range ──
        $purchaseQty = [];
        $purchaseCost = [];
        $purQuery = DB::table('purchase_items as pi')
            ->join('purchases as pr', 'pi.purchase_id', '=', 'pr.id')
            ->where('pr.status', 'submitted')
            ->whereBetween('pr.purchase_date', [$from, $to])
            ->whereIn('pr.company_id', $companyIds)
            ->select('pi.product_id', 'pi.quantity', 'pi.price', 'pi.gst_percentage', 'pi.tax_amount');
        foreach ($purQuery->get() as $pi) {
            $pid = intval($pi->product_id);
            if ($pid <= 0 || !isset($rows[$pid])) { continue; }
            $qty  = floatval($pi->quantity);
            $base = $qty * floatval($pi->price);
            $tax  = floatval($pi->tax_amount);
            if ($tax <= 0 && floatval($pi->gst_percentage) > 0) {
                $tax = round($base * floatval($pi->gst_percentage) / 100, 2);
            }
            $purchaseQty[$pid]  = ($purchaseQty[$pid] ?? 0) + $qty;
            $purchaseCost[$pid] = ($purchaseCost[$pid] ?? 0) + $base;
            $rows[$pid]['purchase'] += $base;
            $rows[$pid]['tax_receivable'] += $tax;
        }

        // ── PURCHASE RETURNS (debit_notes → products JSON) in range ──
        if (Schema::hasTable('debit_notes')) {
            $dnQuery = DB::table('debit_notes')
                ->where('is_deleted', 0)
                ->whereBetween('return_date', [$from, $to])
                ->whereIn('company_id', $companyIds);
            foreach ($dnQuery->get(['id', 'products']) as $dn) {
                foreach ($this->decodeLines($dn->products) as $line) {
                    $pid = intval($line['product_id'] ?? 0);
                    if ($pid <= 0 || !isset($rows[$pid])) { continue; }
                    $net = $this->lineNet($line);
                    $tax = $this->lineTax($line);
                    $rows[$pid]['purchase_return'] += $net;
                    $rows[$pid]['tax_receivable'] -= $tax;
                }
            }
        }

        // Valuate opening/closing stock (currently plain units) in ₹.
        // Unit cost: in-range weighted-avg purchase cost when the item was
        // bought in the period, else master purchase_price, else 0.
        $unitCost = function ($pid) use ($purchaseQty, $purchaseCost, $products) {
            $qty = $purchaseQty[$pid] ?? 0;
            if ($qty > 0) {
                return ($purchaseCost[$pid] ?? 0) / $qty;
            }
            $master = $products->firstWhere('id', $pid);
            return floatval($master->purchase_price ?? 0);
        };
        foreach ($rows as $pid => &$row) {
            $current = floatval($products->firstWhere('id', $pid)->stock ?? 0);
            $uc = $unitCost($pid);
            $row['opening_stock'] = round(($current - ($deltaOpen[$pid] ?? 0.0)) * $uc, 2);
            $row['closing_stock'] = round(($current - ($deltaClose[$pid] ?? 0.0)) * $uc, 2);
        }
        unset($row);

        // Finalize rows.
        $data = array_values($rows);
        foreach ($data as &$r) {
            foreach (['sale', 'sale_return', 'purchase', 'purchase_return', 'tax_receivable', 'tax_payable'] as $k) {
                $r[$k] = round(floatval($r[$k]), 2);
            }
            $r['mfg_cost']        = round(floatval($r['mfg_cost']), 2);
            $r['consumption_cost'] = round(floatval($r['consumption_cost']), 2);
            $r['net_profit'] = round(
                floatval($r['sale']) - floatval($r['sale_return'])
                + floatval($r['closing_stock']) - floatval($r['opening_stock'])
                - floatval($r['purchase']) + floatval($r['purchase_return'])
                - floatval($r['mfg_cost']) - floatval($r['consumption_cost']),
                2
            );
        }
        unset($r);

        if ($itemsHavingSale) {
            $data = array_values(array_filter($data, fn($r) => floatval($r['sale']) > 0 || floatval($r['sale_qty']) > 0));
        }
        usort($data, fn($a, $b) => strcasecmp($a['item_name'], $b['item_name']));

        $totals = $this->emptyRow();
        foreach ($data as $r) {
            foreach (array_keys($totals) as $k) {
                $totals[$k] += floatval($r[$k] ?? 0);
            }
        }
        foreach ($totals as $k => $v) {
            $totals[$k] = round($v, 2);
        }
        unset($totals['id'], $totals['item_name'], $totals['sale_qty']);
        foreach ($data as &$r) { unset($r['sale_qty']); } unset($r);

        return response()->json([
            'status'    => true,
            'from_date' => $from,
            'to_date'   => $to,
            'data'      => $data,
            'totals'    => $totals,
        ]);
    }

    /** Movement delta strictly AFTER a date (subtract from current stock). */
    private function deltaAfter(array $companyIds, string $after)
    {
        $delta = [];

        // Purchases after date raised stock → subtract to undo (sign +1).
        $q = DB::table('purchase_items as pi')
            ->join('purchases as pr', 'pi.purchase_id', '=', 'pr.id')
            ->where('pr.status', 'submitted')
            ->whereDate('pr.purchase_date', '>', $after)
            ->whereIn('pr.company_id', $companyIds)
            ->select('pi.product_id', DB::raw('SUM(pi.quantity) as qty'))
            ->groupBy('pi.product_id');
        foreach ($q->get() as $row) {
            $pid = intval($row->product_id);
            if ($pid <= 0) { continue; }
            $delta[$pid] = ($delta[$pid] ?? 0) + (float)$row->qty;
        }

        // Sale returns after date raised stock → subtract to undo (sign +1).
        if (Schema::hasTable('credit_notes')) {
            $this->addJsonDeltas($delta, $this->rowsAfter('credit_notes', 'return_date', $companyIds, $after), 'products', +1.0);
        }

        // Sales after date lowered stock → add back to undo (sign −1).
        $this->addJsonDeltas($delta, $this->rowsAfter('invoices', 'created_at', $companyIds, $after), 'products', -1.0);

        // Purchase returns after date lowered stock → add back to undo (sign −1).
        if (Schema::hasTable('debit_notes')) {
            $this->addJsonDeltas($delta, $this->rowsAfter('debit_notes', 'return_date', $companyIds, $after), 'products', -1.0);
        }

        return $delta;
    }

    /** Decode a `products` JSON column (string or array) into a line list. */
    private function decodeLines($raw)
    {
        $decoded = is_string($raw) ? json_decode($raw, true) : $raw;
        return is_array($decoded) ? $decoded : [];
    }

    /** Value of a line excluding tax (handles inclusive `amount` lines). */
    private function lineNet(array $line)
    {
        $qty   = floatval($line['qty'] ?? $line['quantity'] ?? 0);
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
        $gst    = floatval($line['gst'] ?? $line['gst_percentage'] ?? 0);
        if ($gst > 0) {
            if ($amtRaw !== null && $amtRaw !== '' && floatval($amtRaw) > 0) {
                // `amount` is inclusive of tax in this app → derive embedded tax.
                return round(floatval($amtRaw) - (floatval($amtRaw) / (1 + $gst / 100)), 2);
            }
            $qty   = floatval($line['qty'] ?? $line['quantity'] ?? 0);
            $price = floatval($line['price'] ?? $line['rate'] ?? 0);
            $disc  = floatval($line['discount'] ?? $line['discount_amount'] ?? 0);
            return round(max(0.0, ($price * $qty) - $disc) * $gst / 100, 2);
        }
        return 0.0;
    }

    /** Rows of a table occurring strictly after a date, company-scoped. */
    private function rowsAfter(string $table, string $dateCol, array $companyIds, string $after)
    {
        $q = DB::table($table)
            ->whereDate($dateCol, '>', $after)
            ->whereIn('company_id', $companyIds);
        if (in_array($table, ['credit_notes', 'debit_notes'], true)) {
            $q->where('is_deleted', 0);
        }
        return $q->get();
    }

    /** Accumulate qty deltas from rows whose line items live in a JSON column. */
    private function addJsonDeltas(array &$delta, $rows, string $col, float $sign)
    {
        foreach ($rows as $row) {
            foreach ($this->decodeLines($row->{$col} ?? null) as $item) {
                $pid = intval($item['product_id'] ?? 0);
                if ($pid <= 0) { continue; }
                $qty = floatval($item['qty'] ?? $item['quantity'] ?? 0);
                if ($qty == 0) { continue; }
                $delta[$pid] = ($delta[$pid] ?? 0) + ($sign * $qty);
            }
        }
    }

    private function emptyRow()
    {
        return [
            'sale'              => 0.0,
            'sale_return'       => 0.0,
            'purchase'          => 0.0,
            'purchase_return'   => 0.0,
            'opening_stock'     => 0.0,
            'closing_stock'     => 0.0,
            'tax_receivable'    => 0.0,
            'tax_payable'       => 0.0,
            'mfg_cost'          => 0.0,
            'consumption_cost'  => 0.0,
            'net_profit'        => 0.0,
            'sale_qty'          => 0.0,
        ];
    }
}