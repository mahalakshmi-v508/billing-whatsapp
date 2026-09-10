<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Low Stock Summary — a read-only report listing items whose current stock is
 * below the project's existing low-stock threshold.
 *
 * The existing low-stock definition is used as-is:
 *   DashboardController::getStats() counts  low_stock = stock < 5
 * so the column "Minimum Stock Qty" reflects that existing threshold (5) and a
 * low-stock row is one where  stock_qty < 5.
 *
 * Stock Qty is the live products.stock counter (products.stock). Stock Value
 * follows the project's existing convention in StockSummaryController:
 *   stock_value = stock_qty * purchase_price  (0 when no purchase price set).
 *
 * Optional filters:
 *   show_in_stock=1  -> list every item currently in stock (stock > 0)
 *   category_id > 0  -> restrict to one product category (All Categories = 0)
 *
 * It only reads — never writes.
 */
class LowStockSummaryController extends Controller
{
    const MIN_STOCK_QTY = 5;

    public function index(Request $request)
    {
        $company_id   = intval($request->input('company_id') ?: $request->query('company_id', 0));
        $admin_id     = intval($request->input('admin_id') ?: $request->query('admin_id', 0));
        $categoryId   = intval($request->input('category_id') ?: $request->query('category_id', 0));
        $showInStock  = filter_var($request->input('show_in_stock') ?: $request->query('show_in_stock', 0), FILTER_VALIDATE_BOOLEAN);

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

        $minStock = self::MIN_STOCK_QTY;

        $query = DB::table('products')
            ->where('is_deleted', 0)
            ->whereIn('company_id', $companyIds)
            ->where(function ($q) use ($categoryId) {
                if ($categoryId > 0) {
                    $q->where('category_id', $categoryId);
                }
            });

        $rows = [];
        foreach ($query->get() as $p) {
            $stockQty = round((float)$p->stock, 2);
            $purchasePrice = (float)($p->purchase_price ?? 0);
            $stockValue = round($stockQty * $purchasePrice, 2);

            if ($showInStock) {
                // "Show items in stock" -> every item currently in stock.
                if ($stockQty <= 0) {
                    continue;
                }
            } else {
                // Default -> the project's existing low-stock definition.
                if ($stockQty >= $minStock) {
                    continue;
                }
            }

            $rows[] = [
                'id'               => intval($p->id),
                'item_name'        => (string)$p->product_name,
                'minimum_stock_qty' => $minStock,
                'stock_qty'        => $stockQty,
                'stock_value'      => $stockValue,
            ];
        }

        usort($rows, fn($a, $b) => strcmp(strtolower((string)$a['item_name']), strtolower((string)$b['item_name'])));

        $totals = ['stock_qty' => 0.0, 'stock_value' => 0.0];
        foreach ($rows as $r) {
            $totals['stock_qty']  += $r['stock_qty'];
            $totals['stock_value'] += $r['stock_value'];
        }
        $totals['stock_qty']  = round($totals['stock_qty'], 2);
        $totals['stock_value'] = round($totals['stock_value'], 2);

        return response()->json([
            'status' => true,
            'data'   => $rows,
            'totals' => $totals,
            'meta'   => [
                'minimum_stock_qty' => $minStock,
                'low_stock_rule'    => 'stock < ' . $minStock,
            ],
        ]);
    }

    private function emptyTotals()
    {
        return ['stock_qty' => 0.0, 'stock_value' => 0.0];
    }
}