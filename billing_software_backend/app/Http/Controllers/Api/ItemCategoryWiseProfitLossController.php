<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Item Category Wise Profit & Loss — the same real per-item P&L figures as
 * ItemWiseProfitLossController, but aggregated per category (parent) and
 * subcategory (child) using the products.category_id / subcategory_id mapping.
 *
 * Each product contributes to exactly one subcategory row (when it has one),
 * otherwise to its category row directly. A parent category row always shows
 * the FULL aggregate of every product in that category (children included),
 * so summing the top-level rows never double-counts.
 *
 * Products with no category are grouped under a real "Uncategorized" row so no
 * transaction is ever dropped. Mfg / Consumption cost = 0 (no such product
 * fields exist). It only reads — never writes.
 */
class ItemCategoryWiseProfitLossController extends Controller
{
    public function index(Request $request)
    {
        $company_id = intval($request->input('company_id') ?: $request->query('company_id', 0));
        $admin_id   = intval($request->input('admin_id') ?: $request->query('admin_id', 0));
        $from       = $request->input('from_date') ?: $request->query('from_date', '');
        $to         = $request->input('to_date') ?: $request->query('to_date', '');
        $filterCat  = intval($request->input('category_id') ?: $request->query('category_id', 0));
        $filterSub  = intval($request->input('subcategory_id') ?: $request->query('subcategory_id', 0));

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
                return response()->json(['status' => true, 'data' => [], 'totals' => $this->emptyAgg()]);
            }
        }

        // Category / subcategory names for the aggregation.
        $catNames = DB::table('categories')
            ->whereIn('company_id', $companyIds)
            ->where('is_deleted', 0)
            ->pluck('name', 'id')
            ->map(fn($n) => trim((string)$n))
            ->all();
        $subInfo = []; // subcategory_id => ['name','category_id']
        foreach (DB::table('subcategories')
            ->whereIn('company_id', $companyIds)
            ->where('is_deleted', 0)
            ->get(['id', 'name', 'category_id']) as $s) {
            $subInfo[intval($s->id)] = ['name' => trim((string)$s->name), 'category_id' => intval($s->category_id)];
        }

        // Base products (the only item source).
        $products = DB::table('products as p')
            ->where('p.is_deleted', 0)
            ->whereIn('p.company_id', $companyIds)
            ->get(['id', 'product_name', 'category_id', 'subcategory_id', 'stock', 'purchase_price']);

        $rows = [];
        foreach ($products as $p) {
            $pid = intval($p->id);
            $catId = intval($p->category_id);
            if (!isset($catNames[$catId])) { $catId = 0; } // missing category → uncategorized
            $subId = intval($p->subcategory_id);
            if (!isset($subInfo[$subId]) || $subInfo[$subId]['category_id'] !== $catId) { $subId = 0; }
            $rows[$pid] = [
                'category_id' => $catId,
                'subcategory_id' => $subId,
            ] + $this->emptyAgg(false);
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
                $rows[$pid]['sale'] += $this->lineNet($line);
                $rows[$pid]['tax_payable'] += $this->lineTax($line);
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
                    $rows[$pid]['sale_return'] += $this->lineNet($line);
                    $rows[$pid]['tax_payable'] -= $this->lineTax($line);
                }
            }
        }

        // ── PURCHASES (purchase_items) in range (also builds the cost basis) ──
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
            $purchaseQty[$pid] = ($purchaseQty[$pid] ?? 0) + $qty;
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
                    $rows[$pid]['purchase_return'] += $this->lineNet($line);
                    $rows[$pid]['tax_receivable'] -= $this->lineTax($line);
                }
            }
        }

        // Finalize products: value stock in ₹ and compute per-product P&L.
        $productsById = $products->keyBy('id');
        foreach ($rows as $pid => &$pr) {
            $prod = $productsById->get($pid);
            $current = floatval($prod->stock ?? 0);
            $openQty = $current - ($deltaOpen[$pid] ?? 0.0);
            $closeQty = $current - ($deltaClose[$pid] ?? 0.0);
            $uc = $this->unitCost($pid, $purchaseQty, $purchaseCost, $purchase_price = $prod->purchase_price ?? 0);
            $opening = round($openQty * $uc, 2);
            $closing = round($closeQty * $uc, 2);
            $pr['opening_stock'] = $opening;
            $pr['closing_stock'] = $closing;
            $pr['net_profit'] = round(
                floatval($pr['sale']) - floatval($pr['sale_return'])
                + $closing - $opening
                - floatval($pr['purchase']) + floatval($pr['purchase_return'])
                - floatval($pr['mfg_cost']) - floatval($pr['consumption_cost']),
                2
            );
        }
        unset($pr);

        // Aggregate products → category (parent) and subcategory (child) rows.
        $parents = []; // catKey => row
        $children = []; // catKey => [subId => row]
        foreach ($rows as $pid => $pr) {
            $catId = $pr['category_id'];
            if (!isset($parents[$catId])) {
                $parents[$catId] = ['id' => $catId, 'catId' => $catId] + $this->emptyAgg(false);
            }
            $this->accRow($parents[$catId], $pr);
            if ($pr['subcategory_id'] > 0) {
                $subId = $pr['subcategory_id'];
                if (!isset($children[$catId][$subId])) {
                    $children[$catId][$subId] = ['id' => $subId] + $this->emptyAgg(false);
                }
                $this->accRow($children[$catId][$subId], $pr);
            }
        }

        // Attach children + names, drop bookkeeping keys.
        $data = [];
        foreach (array_keys($parents) as $catId) {
            $row = $parents[$catId];
            $name = $catId > 0 ? ($catNames[$catId] ?? 'Item #' . $catId) : 'Uncategorized';
            $childRows = [];
            foreach (($children[$catId] ?? []) as $subId => $child) {
                $childRows[] = ['id' => $subId, 'name' => $subInfo[$subId]['name'] ?? 'Item #' . $subId, 'type' => 'subcategory'] + $this->trim($child);
            }
            usort($childRows, fn($a, $b) => strcasecmp($a['name'], $b['name']));
            $item = ['id' => $catId > 0 ? $catId : -1, 'name' => $name, 'type' => 'category'] + $this->trim($row);
            $item['children'] = $childRows;
            $data[] = $item;
        }

        // Apply category/subcategory filter.
        if ($filterSub > 0) {
            $found = null;
            $parentCat = $subInfo[$filterSub]['category_id'] ?? 0;
            foreach ($data as $item) {
                if ($item['catId'] === $parentCat && isset($item['children'])) {
                    foreach ($item['children'] as $child) {
                        if ($child['id'] === $filterSub) { $found = $child; break; }
                    }
                }
                if ($found) { break; }
            }
            if ($found) {
                $data = [['id' => $found['id'], 'name' => $found['name'], 'type' => 'subcategory'] + $this->trim($found)];
            } else {
                $data = [];
            }
        } elseif ($filterCat > 0) {
            $data = array_values(array_filter($data, fn($item) => $item['catId'] === $filterCat));
        }

        foreach ($data as &$item) { unset($item['catId']); } unset($item);
        usort($data, fn($a, $b) => strcasecmp($a['name'], $b['name']));

        // Totals from top-level rows (parents aggregate their children).
        $totals = $this->emptyAgg();
        foreach ($data as $item) {
            foreach (array_keys($totals) as $k) {
                $totals[$k] += floatval($item[$k] ?? 0);
            }
        }
        foreach ($totals as $k => $v) { $totals[$k] = round($v, 2); }
        unset($totals['sale_qty']);

        return response()->json([
            'status'    => true,
            'from_date' => $from,
            'to_date'   => $to,
            'data'      => $data,
            'totals'    => $totals,
        ]);
    }

    /** Sum a product row into an aggregate row. */
    private function accRow(array &$agg, array $row)
    {
        foreach (['sale', 'sale_return', 'purchase', 'purchase_return', 'opening_stock', 'closing_stock', 'tax_receivable', 'tax_payable', 'mfg_cost', 'consumption_cost'] as $k) {
            $agg[$k] += floatval($row[$k] ?? 0);
        }
        $agg['net_profit'] = round(
            floatval($agg['sale']) - floatval($agg['sale_return'])
            + floatval($agg['closing_stock']) - floatval($agg['opening_stock'])
            - floatval($agg['purchase']) + floatval($agg['purchase_return'])
            - floatval($agg['mfg_cost']) - floatval($agg['consumption_cost']),
            2
        );
    }

    /** Drop internal bookkeeping keys from an aggregated row. */
    private function trim(array $row)
    {
        unset($row['sale_qty']);
        return $row;
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
            $net = max(0.0, ($price * $qty) - $disc) - $tax;
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

    /** Product cost basis: in-range weighted-avg purchase, else master price. */
    private function unitCost(int $pid, array $purchaseQty, array $purchaseCost, $masterPrice)
    {
        $qty = $purchaseQty[$pid] ?? 0;
        if ($qty > 0) {
            return ($purchaseCost[$pid] ?? 0) / $qty;
        }
        return floatval($masterPrice);
    }

    private function emptyAgg(bool $withQty = true)
    {
        $row = [
            'sale'             => 0.0,
            'sale_return'      => 0.0,
            'purchase'         => 0.0,
            'purchase_return'  => 0.0,
            'opening_stock'    => 0.0,
            'closing_stock'    => 0.0,
            'tax_receivable'   => 0.0,
            'tax_payable'      => 0.0,
            'mfg_cost'         => 0.0,
            'consumption_cost' => 0.0,
            'net_profit'       => 0.0,
        ];
        if ($withQty) {
            $row['sale_qty'] = 0.0;
        }
        return $row;
    }
}