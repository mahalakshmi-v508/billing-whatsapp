<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class GstRateReportController extends Controller
{
    public function index(Request $request)
    {
        $companyId = intval($request->input('company_id') ?: $request->query('company_id', 0));
        $adminId = intval($request->input('admin_id') ?: $request->query('admin_id', 0));
        $from = $request->input('from_date') ?: $request->query('from_date', '');
        $to = $request->input('to_date') ?: $request->query('to_date', '');

        if (!$companyId && !$adminId) return response()->json(['status' => false, 'message' => 'company_id or admin_id required']);
        if (!$from || !$to) return response()->json(['status' => false, 'message' => 'from_date and to_date required']);
        $from = date('Y-m-d', strtotime($from));
        $to = date('Y-m-d', strtotime($to));
        if ($to < $from) { [$from, $to] = [$to, $from]; }
        $companyIds = $companyId > 0
            ? [$companyId]
            : DB::table('companies')->where('admin_id', $adminId)->where('is_deleted', 0)->pluck('id')->map(fn($id) => intval($id))->all();

        $rates = [];
        $add = function (float $rate, float $saleTaxable, float $taxOut, float $purchaseTaxable, float $taxIn) use (&$rates) {
            $key = number_format($rate, 2, '.', '');
            if (!isset($rates[$key])) {
                $rates[$key] = ['tax_name' => 'GST ' . rtrim(rtrim($key, '0'), '.') . '%', 'tax_percent' => round($rate, 2), 'taxable_sale_amount' => 0.0, 'tax_in' => 0.0, 'taxable_purchase_expense_amount' => 0.0, 'tax_out' => 0.0];
            }
            $rates[$key]['taxable_sale_amount'] += $saleTaxable;
            $rates[$key]['tax_out'] += $taxOut;
            $rates[$key]['taxable_purchase_expense_amount'] += $purchaseTaxable;
            $rates[$key]['tax_in'] += $taxIn;
        };

        $invoices = DB::table('invoices')->whereBetween(DB::raw('DATE(created_at)'), [$from, $to])->whereNotNull('customer_id')->where('customer_id', '>', 0)->whereIn('company_id', $companyIds)->get(['products']);
        foreach ($invoices as $invoice) {
            foreach ($this->decodeLines($invoice->products) as $line) {
                $rate = floatval($line['gst'] ?? $line['gst_percentage'] ?? 0);
                $quantity = floatval($line['qty'] ?? $line['quantity'] ?? 0);
                $price = floatval($line['price'] ?? $line['rate'] ?? 0);
                $tax = floatval($line['tax_amount'] ?? $line['tax'] ?? 0);
                $amount = $line['amount'] ?? $line['total_amount'] ?? null;
                $gross = $amount === null || $amount === '' ? $quantity * $price : floatval($amount);
                $taxable = $tax > 0 ? max(0.0, $gross - $tax) : max(0.0, $gross);
                if ($tax <= 0 && $rate > 0) $tax = round($taxable * $rate / 100, 2);
                $add($rate, $taxable, $tax, 0.0, 0.0);
            }
        }

        $purchases = DB::table('purchase_items as pi')->join('purchases as pr', 'pi.purchase_id', '=', 'pr.id')->where('pr.status', 'submitted')->whereBetween('pr.purchase_date', [$from, $to])->whereIn('pr.company_id', $companyIds)->get(['pi.quantity', 'pi.price', 'pi.discount_amount', 'pi.gst_percentage', 'pi.tax_amount']);
        foreach ($purchases as $purchase) {
            $rate = floatval($purchase->gst_percentage);
            $taxable = max(0.0, floatval($purchase->quantity) * floatval($purchase->price) - floatval($purchase->discount_amount));
            $tax = floatval($purchase->tax_amount);
            if ($tax <= 0 && $rate > 0) $tax = round($taxable * $rate / 100, 2);
            $add($rate, 0.0, 0.0, $taxable, $tax);
        }

        $expenseColumns = ['expense_date', 'company_id'];
        foreach (['tax_rate', 'tax_total', 'total_amount'] as $column) {
            if (Schema::hasColumn('expenses', $column)) $expenseColumns[] = $column;
        }
        $expenses = DB::table('expenses')->where('is_deleted', 0)->whereBetween('expense_date', [$from, $to])->whereIn('company_id', $companyIds)->get($expenseColumns);
        foreach ($expenses as $expense) {
            $rate = floatval($expense->tax_rate ?? 0);
            $tax = floatval($expense->tax_total ?? 0);
            $amount = floatval($expense->total_amount ?? 0);
            $add($rate, 0.0, 0.0, max(0.0, $amount - $tax), $tax);
        }

        $data = array_values($rates);
        foreach ($data as &$row) {
            foreach (['taxable_sale_amount', 'tax_in', 'taxable_purchase_expense_amount', 'tax_out'] as $key) $row[$key] = round($row[$key], 2);
        }
        unset($row);
        usort($data, fn($a, $b) => $a['tax_percent'] <=> $b['tax_percent']);

        return response()->json(['status' => true, 'data' => $data, 'totals' => ['tax_in' => round(array_sum(array_column($data, 'tax_in')), 2), 'tax_out' => round(array_sum(array_column($data, 'tax_out')), 2)]]);
    }

    private function decodeLines($raw): array
    {
        $decoded = is_string($raw) ? json_decode($raw, true) : $raw;
        return is_array($decoded) ? $decoded : [];
    }
}