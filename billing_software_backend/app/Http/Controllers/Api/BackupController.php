<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class BackupController extends Controller
{
    /**
     * One-click full company data export.
     * Returns a structured, downloadable JSON file.
     */
    public function export(Request $request)
    {
        $company_id = intval($request->input('company_id') ?: $request->query('company_id', 0));

        if (!$company_id) {
            // Try authenticated user's company
            $user = auth()->user();
            if ($user && !empty($user->company_id)) {
                $company_id = intval($user->company_id);
            }
        }

        if (!$company_id) {
            // Fallback: pick the first available company
            $first = DB::table('companies')->where('is_deleted', 0)->first();
            if ($first) {
                $company_id = intval($first->id);
            }
        }

        if (!$company_id) {
            return response()->json([
                'status'  => false,
                'message' => 'No company found to backup',
            ], 404);
        }

        $company = DB::table('companies')->where('id', $company_id)->first();
        if (!$company) {
            return response()->json([
                'status'  => false,
                'message' => 'Company not found',
            ], 404);
        }

        // 1. Company Settings
        $settings = null;
        if (Schema::hasTable('company_settings')) {
            $s = DB::table('company_settings')->where('company_id', $company_id)->first();
            $settings = $s ? json_decode($s->settings, true) : null;
        }

        // 2. Categories & Subcategories
        $categories = Schema::hasTable('categories')
            ? DB::table('categories')->where('company_id', $company_id)->get()
            : [];
        $subcategories = Schema::hasTable('subcategories')
            ? DB::table('subcategories')->get()
            : [];
        $brands = Schema::hasTable('brands')
            ? DB::table('brands')->get()
            : [];

        // 3. Products
        $products = Schema::hasTable('products')
            ? DB::table('products')->where('company_id', $company_id)->where('is_deleted', 0)->get()
            : [];

        // 4. Customers
        $customers = [];
        if (Schema::hasTable('customers')) {
            $custQuery = DB::table('customers');
            if (Schema::hasColumn('customers', 'company_id')) {
                $custQuery->where('company_id', $company_id);
            }
            if (Schema::hasColumn('customers', 'is_deleted')) {
                $custQuery->where('is_deleted', 0);
            }
            $customers = $custQuery->get();
        }

        // 5. Suppliers
        $suppliers = [];
        if (Schema::hasTable('suppliers')) {
            $supQuery = DB::table('suppliers');
            if (Schema::hasColumn('suppliers', 'company_id')) {
                $supQuery->where('company_id', $company_id);
            }
            if (Schema::hasColumn('suppliers', 'is_deleted')) {
                $supQuery->where('is_deleted', 0);
            }
            $suppliers = $supQuery->get();
        }

        // 6. Invoices & Invoice Items
        $invoices = [];
        if (Schema::hasTable('invoices')) {
            $invQuery = DB::table('invoices')->where('company_id', $company_id);
            if (Schema::hasColumn('invoices', 'is_deleted')) {
                $invQuery->where('is_deleted', 0);
            }
            $invoices = $invQuery->orderBy('id', 'desc')->get();
        }

        // 7. Payments
        $payments = [];
        if (Schema::hasTable('payments')) {
            $payQuery = DB::table('payments');
            if (Schema::hasColumn('payments', 'company_id')) {
                $payQuery->where('company_id', $company_id);
            }
            $payments = $payQuery->orderBy('id', 'desc')->get();
        }

        // 8. Purchases & Purchase Items
        $purchases = [];
        if (Schema::hasTable('purchases')) {
            $purQuery = DB::table('purchases')->where('company_id', $company_id);
            if (Schema::hasColumn('purchases', 'is_deleted')) {
                $purQuery->where('is_deleted', 0);
            }
            $purchases = $purQuery->orderBy('id', 'desc')->get();
        }

        // 9. Expenses
        $expenses = [];
        if (Schema::hasTable('expenses')) {
            $expQuery = DB::table('expenses')->where('company_id', $company_id);
            if (Schema::hasColumn('expenses', 'is_deleted')) {
                $expQuery->where('is_deleted', 0);
            }
            $expenses = $expQuery->orderBy('id', 'desc')->get();
        }

        // 10. Day Closings (Z-Reports)
        $dayClosings = [];
        if (Schema::hasTable('day_closings')) {
            $dayClosings = DB::table('day_closings')
                ->where('company_id', $company_id)
                ->orderBy('closing_date', 'desc')
                ->get();
        }

        $now = date('Y-m-d H:i:s');
        $safeCompanyName = preg_replace('/[^A-Za-z0-9_-]/', '_', $company->company_name ?? 'Store');
        $filename = "PaySplitX_Backup_{$safeCompanyName}_" . date('Ymd_His') . ".json";

        $backupPayload = [
            'app'           => 'PaySplitX ERP',
            'version'       => '2.0',
            'export_type'   => 'full_company_backup',
            'exported_at'   => $now,
            'company_info'  => [
                'id'           => $company->id,
                'name'         => $company->company_name,
                'phone'        => $company->phone ?? '',
                'gstin'        => $company->gstin ?? '',
                'address'      => $company->company_address ?? '',
                'state'        => $company->state ?? '',
            ],
            'summary'       => [
                'products_count'      => count($products),
                'invoices_count'      => count($invoices),
                'customers_count'     => count($customers),
                'suppliers_count'     => count($suppliers),
                'purchases_count'     => count($purchases),
                'expenses_count'      => count($expenses),
                'day_closings_count'  => count($dayClosings),
            ],
            'data'          => [
                'company'        => $company,
                'settings'       => $settings,
                'categories'     => $categories,
                'subcategories'  => $subcategories,
                'brands'         => $brands,
                'products'       => $products,
                'customers'      => $customers,
                'suppliers'      => $suppliers,
                'invoices'       => $invoices,
                'payments'       => $payments,
                'purchases'      => $purchases,
                'expenses'       => $expenses,
                'day_closings'   => $dayClosings,
            ],
        ];

        $jsonContent = json_encode($backupPayload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        return response($jsonContent, 200, [
            'Content-Type'        => 'application/json',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control'       => 'no-cache, no-store, must-revalidate',
            'Pragma'              => 'no-cache',
            'Expires'             => '0',
        ]);
    }
}
