<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockSummaryByItemCategoryController extends Controller
{
    public function index(Request $request)
    {
        $companyId = intval($request->input('company_id') ?: $request->query('company_id', 0));
        $adminId = intval($request->input('admin_id') ?: $request->query('admin_id', 0));

        if (!$companyId && !$adminId) {
            return response()->json(['status' => false, 'message' => 'company_id or admin_id required']);
        }

        $companyIds = $companyId > 0
            ? [$companyId]
            : DB::table('companies')->where('admin_id', $adminId)->where('is_deleted', 0)->pluck('id')->map(fn($id) => intval($id))->all();

        $rows = [];
        $products = DB::table('products as p')
            ->leftJoin('categories as c', 'p.category_id', '=', 'c.id')
            ->where('p.is_deleted', 0)
            ->whereIn('p.company_id', $companyIds)
            ->get(['p.category_id', 'p.stock', 'p.purchase_price', 'c.name as category_name']);

        foreach ($products as $product) {
            $key = intval($product->category_id) > 0 ? (string)$product->category_id : 'uncategorized';
            if (!isset($rows[$key])) {
                $rows[$key] = [
                    'id' => intval($product->category_id) ?: -1,
                    'item_category' => intval($product->category_id) > 0 ? trim((string)$product->category_name) : 'Uncategorized',
                    'stock_quantity' => 0.0,
                    'stock_value' => 0.0,
                ];
            }
            $quantity = floatval($product->stock);
            $rows[$key]['stock_quantity'] += $quantity;
            $rows[$key]['stock_value'] += $quantity * floatval($product->purchase_price);
        }

        $data = array_values($rows);
        foreach ($data as &$row) {
            $row['stock_quantity'] = round($row['stock_quantity'], 2);
            $row['stock_value'] = round($row['stock_value'], 2);
        }
        unset($row);
        usort($data, fn($a, $b) => strcasecmp($a['item_category'], $b['item_category']));

        return response()->json([
            'status' => true,
            'data' => $data,
            'totals' => [
                'stock_quantity' => round(array_sum(array_column($data, 'stock_quantity')), 2),
                'stock_value' => round(array_sum(array_column($data, 'stock_value')), 2),
            ],
        ]);
    }
}