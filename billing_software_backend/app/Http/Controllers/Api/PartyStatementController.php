<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Party Statement — a per-party ledger built from the real transaction
 * tables of the project. It never writes, never fabricates rows and never
 * uses a separate "party statement" table.
 *
 * A "party" is either a Customer (receivable / money-in side) or a Supplier
 * (payable / money-out side):
 *
 *   Customer ledger rows:
 *     - Sale          (invoices)             → money in  (paid_amount collected)
 *     - Sale Return   (credit_notes)         → money out (refund_amount refunded)
 *     Receivable = invoiced − received (+ returns adjustments)
 *
 *   Supplier ledger rows:
 *     - Purchase / Payment (purchase_payments) → money out (amount paid)
 *     Total Purchase comes from purchases (submitted) for the date range.
 *     Payable = purchased − paid.
 *
 * Date filtering consistently scopes BOTH the transaction table and the
 * summary. Opening balance (receivable/payable outstanding before the
 * selected from-date) is included so running "balance" columns are exact.
 */
class PartyStatementController extends Controller
{
    /**
     * Return the selectable parties (customers + suppliers) for a firm.
     * Customers are scoped by admin_id, suppliers by company_id.
     */
    public function getParties(Request $request)
    {
        $company_id = intval($request->input('company_id') ?: $request->query('company_id', 0));
        $admin_id   = intval($request->input('admin_id') ?: $request->query('admin_id', 0));

        if (!$company_id && !$admin_id) {
            return response()->json(['status' => false, 'message' => 'company_id or admin_id required']);
        }

        $parties = [];

        // Customers (receivables) — scoped by admin
        $custQuery = DB::table('customers')
            ->where('is_deleted', 0);
        if ($admin_id > 0) {
            $custQuery->where('admin_id', $admin_id);
        }
        $custQuery->orderBy('name', 'asc');
        $customers = $custQuery->get(['id', 'name', 'phone', 'type', 'pending_amount']);

        foreach ($customers as $c) {
            $name = trim((string)($c->name ?? ''));
            if ($name === '' || strtolower($name) === 'customer' || strtolower($name) === 'cash customer') {
                continue;
            }
            $parties[] = [
                'id'    => (int)$c->id,
                'role'  => 'customer',
                'name'  => $name,
                'phone' => $c->phone ?: '',
                'group' => 'Customer',
                'outstanding' => round(floatval($c->pending_amount), 2),
            ];
        }

        // Suppliers (payables) — scoped by company
        $supplierQuery = DB::table('suppliers')
            ->where('is_deleted', 0);
        if ($company_id > 0) {
            $supplierQuery->where('company_id', $company_id);
        }
        $supplierQuery->orderBy('supplier_name', 'asc');
        $suppliers = $supplierQuery->get(['id', 'supplier_name', 'mobile_number']);

        foreach ($suppliers as $s) {
            $name = trim((string)($s->supplier_name ?? ''));
            if ($name === '') {
                continue;
            }
            $parties[] = [
                'id'    => (int)$s->id,
                'role'  => 'supplier',
                'name'  => $name,
                'phone' => $s->mobile_number ?: '',
                'group' => 'Supplier',
                'outstanding' => 0,
            ];
        }

        // Sort combined list by name
        usort($parties, fn($a, $b) => strcasecmp($a['name'], $b['name']));

        return response()->json(['status' => true, 'data' => $parties]);
    }

    /**
     * Build the party statement for one party across a date range.
     */
    public function getStatement(Request $request)
    {
        $company_id = intval($request->input('company_id') ?: $request->query('company_id', 0));
        $admin_id   = intval($request->input('admin_id') ?: $request->query('admin_id', 0));
        $party_id   = intval($request->input('party_id') ?: $request->query('party_id', 0));
        $role       = trim($request->input('role') ?: $request->query('role', 'customer'));
        $from       = $request->input('from_date') ?: $request->query('from_date', '');
        $to         = $request->input('to_date') ?: $request->query('to_date', '');

        if ($party_id <= 0) {
            return response()->json(['status' => false, 'message' => 'party_id required']);
        }
        if (!$from || !$to) {
            return response()->json(['status' => false, 'message' => 'from_date and to_date required']);
        }

        $from = date('Y-m-d', strtotime($from));
        $to   = date('Y-m-d', strtotime($to));
        if ($to < $from) {
            [$from, $to] = [$to, $from];
        }

        $rows = [];
        $summary = [
            'total_sale'       => 0.0,
            'total_purchase'   => 0.0,
            'total_expense'    => 0.0,
            'total_money_in'   => 0.0,
            'total_money_out'  => 0.0,
            'total_receivable' => 0.0,
            'total_payable'    => 0.0,
            'opening_receivable' => 0.0,
            'opening_payable'    => 0.0,
            'party_name'       => '',
            'party_role'       => $role,
        ];

        if ($role === 'supplier') {
            $this->buildSupplierStatement($company_id, $party_id, $from, $to, $rows, $summary);
        } else {
            $this->buildCustomerStatement($company_id, $admin_id, $party_id, $from, $to, $rows, $summary);
        }

        return response()->json([
            'status'       => true,
            'party'        => $summary['party_name'],
            'party_role'   => $role,
            'from_date'    => $from,
            'to_date'      => $to,
            'transactions' => array_values($rows),
            'summary'      => $summary,
        ]);
    }

    /* ── CUSTOMER (receivable / money-in side) ────────────────────── */
    private function buildCustomerStatement($company_id, $admin_id, $customer_id, $from, $to, &$rows, &$summary)
    {
        $cust = DB::table('customers')
            ->where('id', $customer_id)
            ->when($admin_id > 0, fn($q) => $q->where('admin_id', $admin_id))
            ->first();
        if (!$cust) {
            return;
        }
        $partyName = trim((string)$cust->name) ?: 'Customer';
        $summary['party_name'] = $partyName;

        // ── Opening receivable (outstanding before from_date) ──
        $openingSaleQ = DB::table('invoices')->where('customer_id', $customer_id);
        if ($company_id > 0) $openingSaleQ->where('company_id', $company_id);
        $openingSaleQ->whereDate('created_at', '<', $from);
        $openingSale = $openingSaleQ->selectRaw('COALESCE(SUM(total_amount),0) as t, COALESCE(SUM(paid_amount),0) as p')->first();

        $openingReturn = 0.0;
        if (Schema::hasTable('credit_notes')) {
            $openingRetQ = DB::table('credit_notes')->where('customer_id', $customer_id)->where('is_deleted', 0);
            if ($company_id > 0) $openingRetQ->where('company_id', $company_id);
            $openingRetQ->whereDate('return_date', '<', $from);
            $openingReturn = floatval($openingRetQ->selectRaw('COALESCE(SUM(total_amount),0) as t')->value('t'));
        }
        $opening = floatval($openingSale->t) - floatval($openingSale->p) - $openingReturn;
        $opening = max(0.0, $opening);
        $summary['opening_receivable'] = round($opening, 2);

        // ── Sales in range ──
        $saleQ = DB::table('invoices')->where('customer_id', $customer_id);
        if ($company_id > 0) $saleQ->where('company_id', $company_id);
        $saleQ->whereBetween(DB::raw('DATE(created_at)'), [$from, $to]);
        $sales = $saleQ->orderBy('created_at', 'asc')->get(
            ['invoice_no', 'customer_name', 'total_amount', 'paid_amount', 'balance_amount', 'created_at']
        );

        foreach ($sales as $s) {
            $total    = floatval($s->total_amount);
            $received = floatval($s->paid_amount);
            $summary['total_sale'] += $total;
            $summary['total_money_in'] += $received;

            $rows[] = [
                'date'           => $s->created_at ? date('Y-m-d', strtotime($s->created_at)) : '',
                'txn_type'       => 'Sale',
                'ref_no'         => $s->invoice_no ?: '',
                'party_name'     => $partyName,
                'total'          => round($total, 2),
                'received'       => round($received, 2),
                'paid'           => 0.00,
                'txn_balance'    => round($total - $received, 2),
                'receivable_bal' => 0.00,
                'payable_bal'    => 0.00,
                'kind'           => 'sale',
            ];
        }

        // ── Sale returns (credit notes) in range ──
        if (Schema::hasTable('credit_notes')) {
            $retQ = DB::table('credit_notes')->where('customer_id', $customer_id)->where('is_deleted', 0);
            if ($company_id > 0) $retQ->where('company_id', $company_id);
            $retQ->whereBetween('return_date', [$from, $to]);
            $returns = $retQ->orderBy('return_date', 'asc')->get(
                ['return_no', 'invoice_no', 'total_amount', 'refund_amount', 'payment_type', 'return_date']
            );
            foreach ($returns as $r) {
                $total  = floatval($r->total_amount);
                $refund = floatval($r->refund_amount);
                // A return reduces the customer's receivable by the returned total.
                $summary['total_sale'] -= $total;      // Sale − Sale Return
                $summary['total_money_out'] += $refund; // cash returned to customer

                $rows[] = [
                    'date'           => $r->return_date ?: '',
                    'txn_type'       => 'Sale Return',
                    'ref_no'         => $r->return_no ?: ($r->invoice_no ?: ''),
                    'party_name'     => $partyName,
                    'total'          => round($total, 2),
                    'received'       => 0.00,
                    'paid'           => round($refund, 2),
                    'txn_balance'    => round($total - $refund, 2),
                    'receivable_bal' => 0.00,
                    'payable_bal'    => 0.00,
                    'kind'           => 'sales_return',
                ];
            }
        }

        // Sort combined rows by date (sales & returns interleaved), then
        // recompute the running receivable balance in chronological order.
        usort($rows, function ($a, $b) {
            if ($a['date'] === $b['date']) return 0;
            return $a['date'] < $b['date'] ? -1 : 1;
        });
        $runningBal = $summary['opening_receivable'];
        foreach ($rows as &$r) {
            if ($r['kind'] === 'sale')          $runningBal += floatval($r['total']) - floatval($r['received']);
            if ($r['kind'] === 'sales_return')  $runningBal -= floatval($r['total']);
            $r['receivable_bal'] = round(max(0.0, $runningBal), 2);
        }
        unset($r);

        // ── Closing receivable for the range (outstanding as of end) ──
        $summary['total_sale']       = round($summary['total_sale'], 2);
        $summary['total_money_in']   = round($summary['total_money_in'], 2);
        $summary['total_money_out']  = round($summary['total_money_out'], 2);
        $summary['total_receivable'] = round(max(0.0, $runningBal), 2);
    } // end buildCustomerStatement

    /* ── SUPPLIER (payable / money-out side) ───────────────────────── */
    private function buildSupplierStatement($company_id, $supplier_id, $from, $to, &$rows, &$summary)
    {
        $supplier = DB::table('suppliers')->where('id', $supplier_id)
            ->when($company_id > 0, fn($q) => $q->where('company_id', $company_id))
            ->first();
        if (!$supplier) {
            return;
        }
        $partyName = trim((string)$supplier->supplier_name) ?: 'Supplier';
        $summary['party_name'] = $partyName;

        // ── Opening payable (outstanding before from_date) ──
        $openingPayBase = DB::table('purchases as p')
            ->where('p.supplier_id', $supplier_id)
            ->where('p.status', 'submitted')
            ->whereDate('p.purchase_date', '<', $from);
        if ($company_id > 0) $openingPayBase->where('p.company_id', $company_id);
        $openingPurchased = floatval($openingPayBase->sum('p.total_amount'));

        $openingPayLed = DB::table('purchase_payments as pp')
            ->join('purchases as p', 'pp.purchase_id', '=', 'p.id')
            ->where('p.supplier_id', $supplier_id)
            ->where('p.status', 'submitted')
            ->whereDate('pp.payment_date', '<', $from);
        if ($company_id > 0) $openingPayLed->where('p.company_id', $company_id);
        $openingPaid = floatval($openingPayLed->sum('pp.amount'));

        $opening = max(0.0, $openingPurchased - $openingPaid);
        $summary['opening_payable'] = round($opening, 2);

        $running = $opening;

        // ── Purchases in range ──
        $purQ = DB::table('purchases as p')
            ->leftJoin('suppliers as s', 'p.supplier_id', '=', 's.id');
        $purQ->where('p.supplier_id', $supplier_id)
            ->where('p.status', 'submitted')
            ->whereBetween('p.purchase_date', [$from, $to]);
        if ($company_id > 0) $purQ->where('p.company_id', $company_id);
        $purchases = $purQ->get(['p.purchase_no', 'p.total_amount', 'p.paid_amount', 'p.balance_amount', 'p.purchase_date', 's.supplier_name']);

        foreach ($purchases as $p) {
            $total  = floatval($p->total_amount);
            $running += $total;
            $summary['total_purchase'] += $total;

            $rows[] = [
                'date'           => $p->purchase_date ?: '',
                'txn_type'       => 'Purchase',
                'ref_no'         => $p->purchase_no ?: '',
                'party_name'     => $partyName,
                'total'          => round($total, 2),
                'received'       => 0.00,
                'paid'           => 0.00,
                'txn_balance'    => round($total, 2),
                'receivable_bal' => 0.00,
                'payable_bal'    => round($running, 2),
                'kind'           => 'purchase',
            ];
        }

        // ── Purchase payments (money-out) in range ──
        $payQ = DB::table('purchase_payments as pp')
            ->join('purchases as p', 'pp.purchase_id', '=', 'p.id')
            ->leftJoin('suppliers as s', 'p.supplier_id', '=', 's.id')
            ->where('p.supplier_id', $supplier_id)
            ->where('p.status', 'submitted')
            ->whereBetween('pp.payment_date', [$from, $to]);
        if ($company_id > 0) $payQ->where('pp.company_id', $company_id);
        $payments = $payQ->orderBy('pp.payment_date', 'asc')->get(
            ['p.purchase_no', 'pp.amount', 'pp.payment_date', 'p.paid_amount', 'p.balance_amount', 's.supplier_name']
        );

        foreach ($payments as $pay) {
            $amount = floatval($pay->amount);
            $running -= $amount;
            $summary['total_money_out'] += $amount;

            $rows[] = [
                'date'           => $pay->payment_date ?: '',
                'txn_type'       => 'Payment',
                'ref_no'         => $pay->purchase_no ?: '',
                'party_name'     => $partyName,
                'total'          => round($amount, 2),
                'received'       => 0.00,
                'paid'           => round($amount, 2),
                'txn_balance'    => round(-$amount, 2),
                'receivable_bal' => 0.00,
                'payable_bal'    => round(max(0.0, $running), 2),
                'kind'           => 'payment',
            ];
        }

        // Sort combined rows by date (purchases & payments interleaved)
        usort($rows, function ($a, $b) {
            if ($a['date'] === $b['date']) return 0;
            return $a['date'] < $b['date'] ? -1 : 1;
        });

        // Recompute running payable in date order after merge
        $runningBal = $summary['opening_payable'];
        foreach ($rows as &$r) {
            if ($r['kind'] === 'purchase') $runningBal += floatval($r['total']);
            if ($r['kind'] === 'payment')  $runningBal -= floatval($r['paid']);
            $r['payable_bal'] = round(max(0.0, $runningBal), 2);
        }
        unset($r);

        $summary['total_purchase'] = round($summary['total_purchase'], 2);
        $summary['total_money_out'] = round($summary['total_money_out'], 2);
        $summary['total_payable'] = round(max(0.0, $runningBal), 2);
    }
}
