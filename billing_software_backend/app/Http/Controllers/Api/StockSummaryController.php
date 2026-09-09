<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Stock Summary — the current inventory position of every item for a firm,
 * calculated from the real stock-affecting transactions of the project.
 *
 * The project maintains stock as a live running counter on `products.stock`
 * (there is no opening-stock column and no separate stock-ledger table). The
 * controller therefore uses `products.stock` as the single source of truth for
 * the CURRENT stock, and derives the "as-of" position for a chosen date by
 * unwinding the net effect of every transaction that occurred *after* that
 * date. When no date is supplied (or today is picked) the as-of stock equals
 * the live `products.stock` exactly.
 *
 *   current                      = products.stock (all movements already applied)
 *   stock_as_of(D) = current
 *       + Σ(post-D sales)        - Σ(post-D purchases)
 *       + Σ(post-D purchase ret) - Σ(post-D sale returns)
 *
 * Stock-affecting transaction sources (mirrors the write paths):
 *   - Purchase      (stock in):  `purchase_items` where parent `purchases.status='submitted'`
 *   - Sale          (stock out): `invoices.products`   (JSON) dated by created_at
 *   - Sale Return   (stock in):  `credit_notes.products`(JSON) dated by return_date
 *   - Purchase Ret. (stock out): `debit_notes.products` (JSON) dated by return_date
 *
 * It only reads — it never writes and never fabricates stock data.
 */
class StockSummaryController extends Controller
{
    public function index(Request $request)
    {
        $company_id = intval($request->input('company_id') ?: $request->query('company_id', 0));
        $admin_id   = intval($request->input('admin_id') ?: $request->query('admin_id', 0));

        if (!$company_id && !$admin_id) {
            return response()->json(['status' => false, 'message' => 'company_id or admin_id required']);
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
                return response()->json(['status' => true, 'data' => [], 'totals' => $this->emptyTotals()]);
            }
        }

        // As-of date (validate, default today).
        $asOfRaw = $request->input('as_of_date') ?: $request->query('as_of_date', date('Y-m-d'));
        $parsed = strtotime($asOfRaw);
        $asOf = $parsed ? date('Y-m-d', $parsed) : date('Y-m-d');

        $categoryId = intval($request->input('category_id') ?: $request->query('category_id', 0));
        $showInStock = filter_var(
            $request->input('show_in_stock', $request->query('show_in_stock', false)),
            FILTER_VALIDATE_BOOLEAN
        );
        $search = trim($request->input('search') ?: $request->query('search', ''));

        $page = max(1, intval($request->input('page') ?: $request->query('page', 1)));
        $limit = intval($request->input('limit') ?: $request->query('limit', 0));

        // ── 1. Base product rows with current live stock ──
        $productQuery = DB::table('products as p')
            ->leftJoin('categories as c', 'p.category_id', '=', 'c.id')
            ->where('p.is_deleted', 0)
            ->select(
                'p.id',
                'p.product_name',
                'p.product_code',
                'p.barcode',
                'p.unit',
                'p.stock as current_stock',
                'p.sale_price',
                'p.purchase_price',
                'p.price',
                'p.category_id',
                'c.name as category_name'
            );

        if ($company_id > 0) {
            $productQuery->where('p.company_id', $company_id);
        } else {
            $productQuery->whereIn('p.company_id', $companyIds);
        }
        if ($categoryId > 0) {
            $productQuery->where('p.category_id', $categoryId);
        }

        $products = $productQuery->get();

        // ── 2. Compute the "undo delta" for transactions after the as-of date ──
        // delta[pid] is the number that must be SUBTRACTED from the current
        // stock to obtain the as-of stock:
        //   stock_as_of = current - delta
        // where delta = -sales(>D) + purchases(>D) - purchaseReturns(>D) + saleReturns(>D)
        $delta = [];

        // 2a. Purchases after date increased stock → subtract to undo (sign +1)
        $this->addPurchaseDeltas($delta, $company_id, $companyIds, $asOf, +1.0);

        // 2b. Sale returns after date increased stock → subtract to undo (sign +1)
        if (Schema::hasTable('credit_notes')) {
            $this->addJsonDeltas($delta, $this->rowsAfter('credit_notes', 'return_date', $company_id, $companyIds, $asOf), 'products', +1.0);
        }

        // 2c. Sales after date decreased stock → add back to undo (sign -1)
        $this->addJsonDeltas($delta, $this->rowsAfter('invoices', 'created_at', $company_id, $companyIds, $asOf), 'products', -1.0);

        // 2d. Purchase returns after date decreased stock → add back to undo (sign -1)
        if (Schema::hasTable('debit_notes')) {
            $this->addJsonDeltas($delta, $this->rowsAfter('debit_notes', 'return_date', $company_id, $companyIds, $asOf), 'products', -1.0);
        }

        // ── 3. Build rows ──
        $rows = [];
        foreach ($products as $p) {
            $pid = intval($p->id);
            $stockQty = round(floatval($p->current_stock) - ($delta[$pid] ?? 0), 2);

            $salePrice = (float)($p->sale_price ?? 0) ?: (float)($p->price ?? 0);
            $purchasePrice = (float)($p->purchase_price ?? 0);

            if ($showInStock && $stockQty <= 0) {
                continue;
            }

            $reservedQty = 0.0; // no reservation module yet — structured for future
            $availableQty = round($stockQty - $reservedQty, 2);
            $stockValue = round($stockQty * $purchasePrice, 2);

            $rows[] = [
                'id'             => $pid,
                'item_name'      => $p->product_name,
                'product_code'   => $p->product_code,
                'barcode'        => $p->barcode,
                'unit'           => $p->unit,
                'category_id'    => $p->category_id,
                'category_name'  => $p->category_name,
                'sale_price'     => $salePrice,
                'purchase_price' => $purchasePrice,
                'stock_qty'      => $stockQty,
                'reserved_qty'   => $reservedQty,
                'available_qty'  => $availableQty,
                'stock_value'    => $stockValue,
            ];
        }

        // ── 4. Optional search across name / code / barcode ──
        if ($search !== '') {
            $q = strtolower($search);
            $rows = array_values(array_filter($rows, function ($r) use ($q) {
                return str_contains(strtolower($r['item_name'] ?? ''), $q)
                    || str_contains(strtolower($r['product_code'] ?? ''), $q)
                    || str_contains(strtolower($r['barcode'] ?? ''), $q);
            }));
        }

        // ── 5. Totals over the filtered full set (before pagination) ──
        $totals = ['stock_qty' => 0.0, 'reserved_qty' => 0.0, 'available_qty' => 0.0, 'stock_value' => 0.0];
        foreach ($rows as $r) {
            $totals['stock_qty']     += $r['stock_qty'];
            $totals['available_qty'] += $r['available_qty'];
            $totals['reserved_qty']  += $r['reserved_qty'];
            $totals['stock_value']   += $r['stock_value'];
        }
        foreach ($totals as $k => $v) {
            $totals[$k] = round($v, 2);
        }

        // ── 6. Pagination ──
        $total = count($rows);
        $lastPage = 1;
        $sliced = $rows;
        if ($limit > 0) {
            $lastPage = max(1, (int)ceil($total / $limit));
            if ($page > $lastPage) {
                $page = $lastPage;
            }
            $sliced = array_slice($rows, ($page - 1) * $limit, $limit);
        }

        return response()->json([
            'status'      => true,
            'data'        => array_values($sliced),
            'totals'      => $totals,
            'as_of_date'  => $asOf,
            'total'       => $total,
            'page'        => $limit > 0 ? $page : 1,
            'limit'       => $limit,
            'last_page'   => $lastPage,
        ]);
    }

    /** Accumulate purchase quantities (normalized table) after a date. */
    private function addPurchaseDeltas(array &$delta, $company_id, $companyIds, string $asOf, float $sign)
    {
        $q = DB::table('purchase_items as pi')
            ->join('purchases as pr', 'pi.purchase_id', '=', 'pr.id')
            ->where('pr.status', 'submitted')
            ->whereDate('pr.purchase_date', '>', $asOf)
            ->select('pi.product_id', DB::raw('SUM(pi.quantity) as qty'))
            ->groupBy('pi.product_id');

        if ($company_id > 0) {
            $q->where('pr.company_id', $company_id);
        } else {
            $q->whereIn('pr.company_id', $companyIds);
        }

        foreach ($q->get() as $row) {
            $pid = intval($row->product_id);
            if ($pid <= 0) continue;
            $delta[$pid] = ($delta[$pid] ?? 0) + ($sign * (float)$row->qty);
        }
    }

    /** Append deltas parsed from rows whose line items live in a JSON column. */
    private function addJsonDeltas(array &$delta, $rows, string $col, float $sign)
    {
        foreach ($rows as $row) {
            $items = is_string($row->{$col}) ? json_decode($row->{$col}, true) : $row->{$col};
            if (!is_array($items)) continue;
            foreach ($items as $item) {
                $pid = intval($item['product_id'] ?? 0);
                if ($pid <= 0) continue;
                $qty = floatval($item['qty'] ?? $item['quantity'] ?? 0);
                if ($qty == 0) continue;
                $delta[$pid] = ($delta[$pid] ?? 0) + ($sign * $qty);
            }
        }
    }

    /** Fetch rows of a table occurring strictly after an as-of date. */
    private function rowsAfter(string $table, string $dateCol, $company_id, $companyIds, string $asOf)
    {
        $q = DB::table($table)->whereDate($dateCol, '>', $asOf);
        if ($company_id > 0) {
            $q->where('company_id', $company_id);
        } else {
            $q->whereIn('company_id', $companyIds);
        }
        return $q->get();
    }

    private function emptyTotals()
    {
        return ['stock_qty' => 0.0, 'reserved_qty' => 0.0, 'available_qty' => 0.0, 'stock_value' => 0.0];
    }
}
