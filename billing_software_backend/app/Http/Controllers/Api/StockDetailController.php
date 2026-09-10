<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Stock Detail — a classic per-item stock movement report for a date range,
 * built entirely from the real transaction tables (never fabricated):
 *
 *   Beginning Quantity = units on hand at the close of (from_date − 1 day)
 *   Quantity In        = purchase qty + sale return qty within the range
 *   Purchase Amount    = buying value of purchases − purchase returns (ex-tax)
 *   Quantity Out       = sale qty + purchase return qty within the range
 *   Sale Amount        = selling value of sales − sale returns (ex-tax)
 *   Closing Quantity   = Beginning + Quantity In − Quantity Out
 *
 * This mirrors the existing per-item logic in ItemWiseProfitLossController
 * (same line decoding, same ex-tax line values, same company scoping) and the
 * stock-as-of unwinding in StockSummaryController:
 *
 *   as_of(D) = products.stock − delta(after D)
 *   delta    = −sales(>D) + purchases(>D) − purchaseReturns(>D) + saleReturns(>D)
 *
 * Optional filter: category_id (> 0) restricts to one product category.
 * It only reads — it never writes.
 */
class StockDetailController extends Controller
{
    public function index(Request $request)
    {
        $company_id = intval($request->input('company_id') ?: $request->query('company_id', 0));
        $admin_id   = intval($request->input('admin_id') ?: $request->query('admin_id', 0));
        $from       = $request->input('from_date') ?: $request->query('from_date', '');
        $to         = $request->input('to_date') ?: $request->query('to_date', '');
        $filterCat  = intval($request->input('category_id') ?: $request->query('category_id', 0));

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
                return response()->json(['status' => true, 'data' => [], 'totals' => $this->emptyTotals()]);
            }
        }

        $products = DB::table('products as p')
            ->where('p.is_deleted', 0)
            ->whereIn('p.company_id', $companyIds)
            ->when($filterCat > 0, fn($q) => $q->where('p.category_id', $filterCat))
            ->get(['id', 'product_name', 'stock']);

        $rows = [];
        foreach ($products as $p) {
            $pid = intval($p->id);
            $rows[$pid] = [
                'id'               => $pid,
                'item_name'        => trim((string)$p->product_name) ?: ('Item #' . $pid),
                'beginning_qty'    => 0.0,
                'quantity_in'      => 0.0,
                'purchase_amount'  => 0.0,
                'quantity_out'     => 0.0,
                'sale_amount'      => 0.0,
                'closing_qty'      => 0.0,
            ];
        }

        $dateBefore = date('Y-m-d', strtotime($from . ' -1 day'));
        $deltaOpen  = $this->deltaAfter($companyIds, $dateBefore); // beginning = stock at close of from − 1

        // ── SALES in range (quantity out + net sale value) ──
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
                $rows[$pid]['quantity_out'] += $qty;
                $rows[$pid]['sale_amount']  += $this->lineNet($line);
            }
        }

        // ── SALE RETURNS in range (quantity in − net sale value) ──
        if (Schema::hasTable('credit_notes')) {
            $cnQuery = DB::table('credit_notes')
                ->where('is_deleted', 0)
                ->whereBetween('return_date', [$from, $to])
                ->whereIn('company_id', $companyIds);
            foreach ($cnQuery->get(['id', 'products']) as $cn) {
                foreach ($this->decodeLines($cn->products) as $line) {
                    $pid = intval($line['product_id'] ?? 0);
                    if ($pid <= 0 || !isset($rows[$pid])) { continue; }
                    $qty = floatval($line['qty'] ?? $line['quantity'] ?? 0);
                    $rows[$pid]['quantity_in']   += $qty;
                    $rows[$pid]['sale_amount']   -= $this->lineNet($line);
                }
            }
        }

        // ── PURCHASES in range (quantity in + buying value) ──
        $purQuery = DB::table('purchase_items as pi')
            ->join('purchases as pr', 'pi.purchase_id', '=', 'pr.id')
            ->where('pr.status', 'submitted')
            ->whereBetween('pr.purchase_date', [$from, $to])
            ->whereIn('pr.company_id', $companyIds)
            ->select('pi.product_id', 'pi.quantity', 'pi.price');
        foreach ($purQuery->get() as $pi) {
            $pid = intval($pi->product_id);
            if ($pid <= 0 || !isset($rows[$pid])) { continue; }
            $qty  = floatval($pi->quantity);
            $rows[$pid]['quantity_in']    += $qty;
            $rows[$pid]['purchase_amount'] += $qty * floatval($pi->price);
        }

        // ── PURCHASE RETURNS in range (quantity out − buying value) ──
        if (Schema::hasTable('debit_notes')) {
            $dnQuery = DB::table('debit_notes')
                ->where('is_deleted', 0)
                ->whereBetween('return_date', [$from, $to])
                ->whereIn('company_id', $companyIds);
            foreach ($dnQuery->get(['id', 'products']) as $dn) {
                foreach ($this->decodeLines($dn->products) as $line) {
                    $pid = intval($line['product_id'] ?? 0);
                    if ($pid <= 0 || !isset($rows[$pid])) { continue; }
                    $qty = floatval($line['qty'] ?? $line['quantity'] ?? 0);
                    $rows[$pid]['quantity_out']    += $qty;
                    $rows[$pid]['purchase_amount'] -= $this->lineNet($line);
                }
            }
        }

        // Beginning from the unwound counter; closing reconciles exactly.
        foreach ($rows as $pid => &$row) {
            $current = floatval($products->firstWhere('id', $pid)->stock ?? 0);
            $row['beginning_qty'] = round($current - ($deltaOpen[$pid] ?? 0.0), 2);
            $row['quantity_in']   = round($row['quantity_in'], 2);
            $row['quantity_out']  = round($row['quantity_out'], 2);
            $row['purchase_amount'] = round($row['purchase_amount'], 2);
            $row['sale_amount']   = round($row['sale_amount'], 2);
            $row['closing_qty']   = round($row['beginning_qty'] + $row['quantity_in'] - $row['quantity_out'], 2);
        }
        unset($row);

        $data = array_values($rows);
        usort($data, fn($a, $b) => strcasecmp($a['item_name'], $b['item_name']));

        $totals = $this->emptyTotals();
        foreach ($data as $r) {
            foreach (array_keys($totals) as $k) {
                if (in_array($k, ['id', 'item_name'], true)) { continue; }
                $totals[$k] += floatval($r[$k] ?? 0);
            }
        }
        foreach ($totals as $k => $v) {
            if (in_array($k, ['id', 'item_name'], true)) { continue; }
            $totals[$k] = round($v, 2);
        }
        unset($totals['id'], $totals['item_name']);

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

        if (Schema::hasTable('credit_notes')) {
            $this->addJsonDeltas($delta, $this->rowsAfter('credit_notes', 'return_date', $companyIds, $after), 'products', +1.0);
        }

        $this->addJsonDeltas($delta, $this->rowsAfter('invoices', 'created_at', $companyIds, $after), 'products', -1.0);

        if (Schema::hasTable('debit_notes')) {
            $this->addJsonDeltas($delta, $this->rowsAfter('debit_notes', 'return_date', $companyIds, $after), 'products', -1.0);
        }

        return $delta;
    }

    private function decodeLines($raw)
    {
        $decoded = is_string($raw) ? json_decode($raw, true) : $raw;
        return is_array($decoded) ? $decoded : [];
    }

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

    private function lineTax(array $line)
    {
        $tax = floatval($line['tax_amount'] ?? $line['tax'] ?? 0);
        if ($tax > 0) { return $tax; }
        $amtRaw = $line['amount'] ?? $line['total_amount'] ?? null;
        $gst    = floatval($line['gst'] ?? $line['gst_percentage'] ?? 0);
        if ($gst > 0) {
            if ($amtRaw !== null && $amtRaw !== '' && floatval($amtRaw) > 0) {
                return round(floatval($amtRaw) - (floatval($amtRaw) / (1 + $gst / 100)), 2);
            }
            $qty   = floatval($line['qty'] ?? $line['quantity'] ?? 0);
            $price = floatval($line['price'] ?? $line['rate'] ?? 0);
            $disc  = floatval($line['discount'] ?? $line['discount_amount'] ?? 0);
            return round(max(0.0, ($price * $qty) - $disc) * $gst / 100, 2);
        }
        return 0.0;
    }

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

    private function emptyTotals()
    {
        return [
            'id'              => 0,
            'item_name'       => '',
            'beginning_qty'   => 0.0,
            'quantity_in'     => 0.0,
            'purchase_amount' => 0.0,
            'quantity_out'    => 0.0,
            'sale_amount'     => 0.0,
            'closing_qty'     => 0.0,
        ];
    }
}