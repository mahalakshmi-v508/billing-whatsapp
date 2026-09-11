<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * GST Tax Report — aggregates GST tax collected (Sale Tax) and GST tax paid
 * (Purchase / Expense Tax) per party within a given date range.
 *
 * Data sources:
 *   - Sales:    `invoices.gst_total` grouped by customer_name
 *   - Purchases: `purchases.gst_total` grouped by supplier name
 *   - Expenses:  `expenses.tax_total` grouped by party_name
 *
 * Scoping:
 *   - company_id > 0  → single firm
 *   - company_id = 0  → all firms for the given admin_id
 */
class GstReportController extends Controller
{
    public function index(Request $request)
    {
        $company_id = intval($request->input('company_id') ?: $request->query('company_id', 0));
        $admin_id   = intval($request->input('admin_id') ?: $request->query('admin_id', 0));

        if (!$company_id && !$admin_id) {
            return response()->json(['status' => false, 'message' => 'company_id or admin_id required']);
        }

        // Date range
        $fromDateRaw = $request->input('from_date') ?: $request->query('from_date', date('Y-m-d'));
        $toDateRaw   = $request->input('to_date')   ?: $request->query('to_date', date('Y-m-d'));

        $fromParsed = strtotime($fromDateRaw);
        $toParsed   = strtotime($toDateRaw);
        $fromDate   = $fromParsed ? date('Y-m-d', $fromParsed) : date('Y-m-d');
        $toDate     = $toParsed   ? date('Y-m-d', $toParsed)   : date('Y-m-d');

        // Validate from <= to
        if ($fromDate > $toDate) {
            return response()->json(['status' => false, 'message' => 'From date cannot be after To date']);
        }

        // Resolve companies
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
                    'status'  => true,
                    'data'    => [],
                    'totals'  => ['tax_in' => 0, 'tax_out' => 0],
                    'from_date' => $fromDate,
                    'to_date'   => $toDate,
                ]);
            }
        }

        // ── 1. SALE TAX per party (from invoices) ──
        $saleTaxByParty = [];
        $invoicesQuery = DB::table('invoices as i')
            ->whereDate('i.created_at', '>=', $fromDate)
            ->whereDate('i.created_at', '<=', $toDate)
            ->select('i.customer_name', DB::raw('COALESCE(SUM(i.gst_total), 0) as total_sale_tax'));

        if ($company_id > 0) {
            $invoicesQuery->where('i.company_id', $company_id);
        } else {
            $invoicesQuery->whereIn('i.company_id', $companyIds);
        }

        $saleTaxByParty = $invoicesQuery
            ->groupBy('i.customer_name')
            ->get()
            ->pluck('total_sale_tax', 'customer_name')
            ->toArray();

        // ── 2. PURCHASE TAX per party (from purchases + supplier) ──
        $purchaseTaxByParty = [];
        $purchasesQuery = DB::table('purchases as pr')
            ->join('suppliers as s', 'pr.supplier_id', '=', 's.id')
            ->whereDate('pr.purchase_date', '>=', $fromDate)
            ->whereDate('pr.purchase_date', '<=', $toDate)
            ->where('pr.status', 'submitted')
            ->select('s.supplier_name as supplier_name', DB::raw('COALESCE(SUM(pr.gst_total), 0) as total_purchase_tax'));

        if ($company_id > 0) {
            $purchasesQuery->where('pr.company_id', $company_id);
        } else {
            $purchasesQuery->whereIn('pr.company_id', $companyIds);
        }

        $purchaseTaxByParty = $purchasesQuery
            ->groupBy('s.supplier_name')
            ->get()
            ->pluck('total_purchase_tax', 'supplier_name')
            ->toArray();

        // ── 3. EXPENSE TAX per party (from expenses) ──
        $expenseTaxByParty = [];
        $expensesQuery = DB::table('expenses as e')
            ->whereDate('e.expense_date', '>=', $fromDate)
            ->whereDate('e.expense_date', '<=', $toDate)
            ->where('e.is_deleted', 0)
            ->select('e.party_name', DB::raw('COALESCE(SUM(e.tax_total), 0) as total_expense_tax'));

        if ($company_id > 0) {
            $expensesQuery->where('e.company_id', $company_id);
        } else {
            $expensesQuery->whereIn('e.company_id', $companyIds);
        }

        $expenseTaxByParty = $expensesQuery
            ->groupBy('e.party_name')
            ->get()
            ->pluck('total_expense_tax', 'party_name')
            ->toArray();

        // ── 4. Merge all party names ──
        $allParties = array_unique(array_merge(
            array_keys($saleTaxByParty),
            array_keys($purchaseTaxByParty),
            array_keys($expenseTaxByParty)
        ));

        $data = [];
        $totalTaxIn  = 0.0;
        $totalTaxOut = 0.0;

        foreach ($allParties as $partyName) {
            $partyName = trim($partyName);
            if ($partyName === '' || $partyName === 'Customer' || $partyName === 'cash customer') {
                // Skip generic/empty party names but still count their taxes
            }

            $saleTax = floatval($saleTaxByParty[$partyName] ?? 0);
            $purchaseTax = floatval($purchaseTaxByParty[$partyName] ?? 0);
            $expenseTax = floatval($expenseTaxByParty[$partyName] ?? 0);
            $purchaseExpenseTax = round($purchaseTax + $expenseTax, 2);

            $totalTaxIn  += $purchaseExpenseTax;
            $totalTaxOut += $saleTax;

            $data[] = [
                'party_name'            => $partyName ?: 'Unknown',
                'sale_tax'              => round($saleTax, 2),
                'purchase_expense_tax'  => $purchaseExpenseTax,
            ];
        }

        // Sort by party name
        usort($data, fn($a, $b) => strcasecmp($a['party_name'], $b['party_name']));

        return response()->json([
            'status'    => true,
            'data'      => $data,
            'totals'    => [
                'tax_in'  => round($totalTaxIn, 2),
                'tax_out' => round($totalTaxOut, 2),
            ],
            'from_date' => $fromDate,
            'to_date'   => $toDate,
        ]);
    }
}
