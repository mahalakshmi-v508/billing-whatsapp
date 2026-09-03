<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Day Book — aggregates the real money-moving transactions of a business
 * for a single calendar date into normalized rows:
 *   - Sales        (invoices)          → money IN  (the actually collected paid_amount)
 *   - Purchases    (purchase_payments) → money OUT (real supplier payments, incl. initial)
 *   - Sales Return (credit_notes, cash)→ money OUT (cash refunded to customer)
 *
 * It reads the existing tables only — it never writes, never fabricates rows, and
 * never uses a separate "day book" table. Credit sales are handled correctly by
 * counting only the actual received/payment amount, never the invoice total.
 *
 * Scoping:
 *   - company_id > 0  → single firm.
 *   - company_id = 0  → ALL FIRMS (aggregate across every company belonging to
 *     the given admin_id, mirroring `CompanyController::getCompaniesByAdmin`).
 */
class DayBookController extends Controller
{
    public function index(Request $request)
    {
        $company_id = intval($request->input('company_id') ?: $request->query('company_id', 0));
        $admin_id   = intval($request->input('admin_id') ?: $request->query('admin_id', 0));
        $date       = $request->input('date') ?: $request->query('date', date('Y-m-d'));
        $search     = trim($request->input('search') ?: $request->query('search', ''));

        if (!$company_id && !$admin_id) {
            return response()->json(['status' => false, 'message' => 'company_id or admin_id required']);
        }

        // Validate/normalize date to avoid malformed input.
        $parsed = strtotime($date);
        $date = $parsed ? date('Y-m-d', $parsed) : date('Y-m-d');

        // Resolve which companies to include.
        $companyIds = null; // null = all (when admin_id given)
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
                    'status'       => true,
                    'date'         => $date,
                    'transactions' => [],
                    'summary'      => ['money_in' => 0, 'money_out' => 0, 'net' => 0],
                ]);
            }
        }

        $rows = [];

        // ── 1. SALES (money IN) — from invoices created on this date ──
        // paid_amount is the amount actually collected at invoice time, so a
        // credit sale's unpaid balance never counts as money in.
        $salesQuery = DB::table('invoices as i')
            ->whereDate('i.created_at', $date)
            ->orderBy('i.id', 'desc');
        if ($company_id > 0) {
            $salesQuery->where('i.company_id', $company_id);
        } else {
            $salesQuery->whereIn('i.company_id', $companyIds);
        }
        $sales = $salesQuery->get(['invoice_no', 'customer_name', 'total_amount', 'paid_amount', 'balance_amount', 'payment_method']);

        foreach ($sales as $s) {
            $rows[] = [
                'kind'          => 'sale',
                'type'          => 'Sale',
                'name'          => $s->customer_name,
                'reference'     => $s->invoice_no,
                'payment_type'  => $this->paymentLabel($s->payment_method),
                'total'         => round(floatval($s->total_amount), 2),
                'money_in'      => round(floatval($s->paid_amount), 2),
                'money_out'     => 0.00,
                'balance'       => round(floatval($s->balance_amount), 2),
            ];
        }

        // ── 2. PURCHASES (money OUT) — real supplier payments on this date ──
        // purchase_payments is the discrete money-out ledger (submitPurchase,
        // payPurchase and paySupplierBulk each insert one row). Using it (not
        // purchases.paid_amount) avoids double counting the initial payment.
        $purchaseQuery = DB::table('purchase_payments as pp')
            ->join('purchases as p', 'pp.purchase_id', '=', 'p.id')
            ->leftJoin('suppliers as s', 'p.supplier_id', '=', 's.id')
            ->where('p.status', 'submitted') // ignore drafts
            ->whereDate('pp.payment_date', $date)
            ->orderBy('pp.id', 'desc');
        if ($company_id > 0) {
            $purchaseQuery->where('pp.company_id', $company_id);
        } else {
            $purchaseQuery->whereIn('pp.company_id', $companyIds);
        }
        $purchases = $purchaseQuery->get([
            'p.purchase_no', 's.supplier_name', 'pp.amount', 'pp.payment_method',
        ]);

        foreach ($purchases as $p) {
            $rows[] = [
                'kind'          => 'purchase',
                'type'          => 'Purchase',
                'name'          => $p->supplier_name,
                'reference'     => $p->purchase_no,
                'payment_type'  => $this->paymentLabel($p->payment_method),
                'total'         => round(floatval($p->amount), 2),
                'money_in'      => 0.00,
                'money_out'     => round(floatval($p->amount), 2),
                'balance'       => 0.00,
            ];
        }

        // ── 3. SALES RETURNS (money OUT) — cash refunds on this date ──
        // Only cash credit notes move money back to the customer; credit-type
        // returns only reduce the customer's debt and carry no cash outflow.
        // The credit_notes table is created at runtime by the credit-note module
        // (no migration) — guard with hasTable so this report never 500s on a
        // fresh install where no credit note has ever been created.
        $returns = collect();
        if (Schema::hasTable('credit_notes')) {
            $returnQuery = DB::table('credit_notes')
                ->where('is_deleted', 0)
                ->where('payment_type', 'cash')
                ->whereDate('return_date', $date)
                ->orderBy('id', 'desc');
            if ($company_id > 0) {
                $returnQuery->where('company_id', $company_id);
            } else {
                $returnQuery->whereIn('company_id', $companyIds);
            }
            $returns = $returnQuery->get(['return_no', 'invoice_no', 'customer_name', 'refund_amount', 'total_amount']);
        }

        foreach ($returns as $r) {
            $refund = round(floatval($r->refund_amount), 2);
            $rows[] = [
                'kind'          => 'sales_return',
                'type'          => 'Sales Return',
                'name'          => $r->customer_name,
                'reference'     => $r->return_no ?: $r->invoice_no,
                'payment_type'  => 'Cash',
                'total'         => $refund,
                'money_in'      => 0.00,
                'money_out'     => $refund,
                'balance'       => 0.00,
            ];
        }

        // ── Optional server-side search across relevant fields ──
        if ($search !== '') {
            $rows = array_values(array_filter($rows, function ($r) use ($search) {
                $q = strtolower($search);
                return str_contains(strtolower($r['name'] ?? ''), $q)
                    || str_contains(strtolower($r['reference'] ?? ''), $q)
                    || str_contains(strtolower($r['type'] ?? ''), $q)
                    || str_contains(strtolower($r['payment_type'] ?? ''), $q);
            }));
        }

        // ── Summary over the returned rows ──
        $moneyIn  = 0.0;
        $moneyOut = 0.0;
        foreach ($rows as $r) {
            $moneyIn  += floatval($r['money_in']);
            $moneyOut += floatval($r['money_out']);
        }

        return response()->json([
            'status'       => true,
            'date'         => $date,
            'transactions' => $rows,
            'summary'      => [
                'money_in'  => round($moneyIn, 2),
                'money_out' => round($moneyOut, 2),
                'net'       => round($moneyIn - $moneyOut, 2),
            ],
        ]);
    }

    /** Human-readable label for a stored payment method value. */
    private function paymentLabel($value)
    {
        if (!$value) return 'Cash';
        return ucfirst(strtolower($value));
    }
}
