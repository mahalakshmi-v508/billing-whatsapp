<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class TDSPayableController extends Controller
{
    public function index(Request $request)
    {
        $companyId = intval($request->input('company_id') ?: $request->query('company_id', 0));
        $adminId = intval($request->input('admin_id') ?: $request->query('admin_id', 0));
        $from = $request->input('from_date') ?: $request->query('from_date', '');
        $to = $request->input('to_date') ?: $request->query('to_date', '');
        if (!$companyId && !$adminId) return response()->json(['status' => false, 'message' => 'company_id or admin_id required']);
        if (!$from || !$to) return response()->json(['status' => false, 'message' => 'from_date and to_date required']);
        $from = date('Y-m-d', strtotime($from)); $to = date('Y-m-d', strtotime($to));
        if ($to < $from) { [$from, $to] = [$to, $from]; }
        $companyIds = $companyId > 0 ? [$companyId] : DB::table('companies')->where('admin_id', $adminId)->where('is_deleted', 0)->pluck('id')->map(fn($id) => intval($id))->all();
        $rows = [];

        if (Schema::hasTable('purchases')) {
            $columns = ['id', 'supplier_id', 'purchase_no', 'purchase_date', 'total_amount'];
            foreach (['taxable_amount', 'tds_amount', 'tds_rate', 'tds_percentage', 'tds_name', 'tds_section', 'collection_code'] as $column) if (Schema::hasColumn('purchases', $column)) $columns[] = $column;
            $purchases = DB::table('purchases')->where('status', 'submitted')->whereBetween('purchase_date', [$from, $to])->whereIn('company_id', $companyIds)->get($columns);
            foreach ($purchases as $purchase) {
                $tds = floatval($purchase->tds_amount ?? 0);
                if ($tds <= 0) continue;
                $rows[] = $this->row($purchase->supplier_id, 'Purchase', $purchase->purchase_no, $purchase->total_amount, $purchase->taxable_amount ?? $purchase->total_amount, $tds, $purchase->purchase_date, $purchase->tds_name ?? 'TDS', $purchase->tds_section ?? '', $purchase->collection_code ?? '', $purchase->tds_rate ?? $purchase->tds_percentage ?? 0);
            }
        }

        if (Schema::hasTable('expenses')) {
            $columns = ['id', 'party_name', 'expense_date', 'total_amount'];
            foreach (['bill_no', 'taxable_amount', 'tds_amount', 'tds_rate', 'tds_percentage', 'tds_name', 'tds_section', 'collection_code'] as $column) if (Schema::hasColumn('expenses', $column)) $columns[] = $column;
            $expenses = DB::table('expenses')->where('is_deleted', 0)->whereBetween('expense_date', [$from, $to])->whereIn('company_id', $companyIds)->get($columns);
            foreach ($expenses as $expense) {
                $tds = floatval($expense->tds_amount ?? 0);
                if ($tds <= 0) continue;
                $rows[] = $this->row($expense->party_name ?? 'Expense', 'Expense', $expense->bill_no ?? '-', $expense->total_amount, $expense->taxable_amount ?? $expense->total_amount, $tds, $expense->expense_date, $expense->tds_name ?? 'TDS', $expense->tds_section ?? '', $expense->collection_code ?? '', $expense->tds_rate ?? $expense->tds_percentage ?? 0);
            }
        }
        return response()->json(['status' => true, 'data' => $rows, 'totals' => ['tds_payable' => round(array_sum(array_column($rows, 'tds_payable')), 2)]]);
    }

    private function row($party, $type, $bill, $total, $taxable, $tds, $date, $name, $section, $code, $rate): array
    {
        return ['party_name' => (string)$party, 'transaction_type' => $type, 'bill_no' => (string)($bill ?: '-'), 'total_amount' => round(floatval($total), 2), 'taxable_amount' => round(floatval($taxable), 2), 'tds_payable' => round(floatval($tds), 2), 'date_of_deduction' => substr((string)$date, 0, 10), 'tax_name' => (string)$name, 'tax_section' => (string)$section, 'collection_code' => (string)$code, 'tds_rate' => round(floatval($rate), 2)];
    }
}