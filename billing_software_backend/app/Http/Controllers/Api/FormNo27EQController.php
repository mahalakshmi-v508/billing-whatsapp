<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FormNo27EQController extends Controller
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
        $companyIds = $companyId > 0 ? [$companyId] : DB::table('companies')->where('admin_id', $adminId)->where('is_deleted', 0)->pluck('id')->map(fn($id) => intval($id))->all();

        $rows = [];
        $invoices = DB::table('invoices')->whereBetween(DB::raw('DATE(created_at)'), [$from, $to])->whereIn('company_id', $companyIds)->get(['invoice_no', 'customer_name', 'total_amount', 'paid_amount', 'gst_total', 'created_at', 'products']);
        foreach ($invoices as $invoice) {
            $lines = $this->decodeLines($invoice->products);
            $invoiceTcs = $this->firstNumber((array)$invoice, ['tcs', 'tcs_amount', 'tcs_total', 'tcs_collection']);
            $invoiceRate = $this->firstNumber((array)$invoice, ['tcs_rate', 'tcs_percentage', 'tcs_percent']);
            $lineTcsTotal = 0.0;
            foreach ($lines as $line) $lineTcsTotal += $this->firstNumber($line, ['tcs', 'tcs_amount', 'tcs_collection']);
            if ($invoiceTcs <= 0) $invoiceTcs = $lineTcsTotal;
            if ($invoiceTcs <= 0) continue;

            $taxName = (string)($this->firstValue((array)$invoice, ['tcs_name', 'tax_name']) ?: 'TCS');
            $rows[] = [
                'party_name' => trim((string)$invoice->customer_name) ?: 'Cash Customer',
                'invoice_no' => (string)($invoice->invoice_no ?: '-'),
                'total_value' => round(floatval($invoice->total_amount), 2),
                'amount_received' => round(floatval($invoice->paid_amount), 2),
                'total_tax' => round(floatval($invoice->gst_total), 2),
                'date' => substr((string)$invoice->created_at, 0, 10),
                'tax_name' => $taxName,
                'tax_percent' => round($invoiceRate, 2),
                'collection' => round($invoiceTcs, 2),
                'tcs' => round($invoiceTcs, 2),
            ];
        }

        return response()->json([
            'status' => true,
            'data' => $rows,
            'totals' => [
                'sale_with_tcs' => round(array_sum(array_column($rows, 'total_value')), 2),
                'tcs' => round(array_sum(array_column($rows, 'tcs')), 2),
            ],
        ]);
    }

    private function decodeLines($raw): array
    {
        $decoded = is_string($raw) ? json_decode($raw, true) : $raw;
        return is_array($decoded) ? $decoded : [];
    }

    private function firstValue(array $source, array $keys)
    {
        foreach ($keys as $key) if (isset($source[$key]) && $source[$key] !== '') return $source[$key];
        return null;
    }

    private function firstNumber(array $source, array $keys): float
    {
        return floatval($this->firstValue($source, $keys) ?: 0);
    }
}