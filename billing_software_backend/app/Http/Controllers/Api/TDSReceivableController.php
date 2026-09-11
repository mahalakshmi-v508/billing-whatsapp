<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TDSReceivableController extends Controller
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
        $invoices = DB::table('invoices')->whereBetween(DB::raw('DATE(created_at)'), [$from, $to])->whereIn('company_id', $companyIds)->get(['invoice_no', 'customer_name', 'total_amount', 'gst_total', 'created_at', 'products']);
        foreach ($invoices as $invoice) {
            $lines = $this->decodeLines($invoice->products);
            $tcs = $this->numberFrom((array)$invoice, ['tds', 'tds_amount', 'tds_receivable']);
            $rate = $this->numberFrom((array)$invoice, ['tds_rate', 'tds_percentage', 'tds_percent']);
            $name = $this->valueFrom((array)$invoice, ['tds_name', 'tax_name']) ?: 'TDS';
            $section = $this->valueFrom((array)$invoice, ['tds_section', 'tax_section']) ?: '';
            $code = $this->valueFrom((array)$invoice, ['collection_code', 'tds_collection_code']) ?: '';
            foreach ($lines as $line) {
                $lineTds = $this->numberFrom($line, ['tds', 'tds_amount', 'tds_receivable']);
                if ($lineTds > 0) {
                    $tcs += $lineTds;
                    $rate = $rate ?: $this->numberFrom($line, ['tds_rate', 'tds_percentage', 'tds_percent']);
                    $name = $this->valueFrom($line, ['tds_name', 'tax_name']) ?: $name;
                    $section = $this->valueFrom($line, ['tds_section', 'tax_section']) ?: $section;
                    $code = $this->valueFrom($line, ['collection_code', 'tds_collection_code']) ?: $code;
                }
            }
            if ($tcs <= 0) continue;
            $rows[] = ['party_name' => trim((string)$invoice->customer_name) ?: 'Cash Customer', 'transaction_type' => 'Sale', 'invoice_no' => (string)($invoice->invoice_no ?: '-'), 'total_amount' => round(floatval($invoice->total_amount), 2), 'taxable_amount' => round(max(0, floatval($invoice->total_amount) - floatval($invoice->gst_total)), 2), 'tds_receivable' => round($tcs, 2), 'date_of_deduction' => substr((string)$invoice->created_at, 0, 10), 'tax_name' => (string)$name, 'tax_section' => (string)$section, 'collection_code' => (string)$code, 'tds_rate' => round($rate, 2)];
        }
        return response()->json(['status' => true, 'data' => $rows, 'totals' => ['tds_receivable' => round(array_sum(array_column($rows, 'tds_receivable')), 2)]]);
    }

    private function decodeLines($raw): array { $decoded = is_string($raw) ? json_decode($raw, true) : $raw; return is_array($decoded) ? $decoded : []; }
    private function valueFrom(array $source, array $keys) { foreach ($keys as $key) if (isset($source[$key]) && $source[$key] !== '') return $source[$key]; return null; }
    private function numberFrom(array $source, array $keys): float { return floatval($this->valueFrom($source, $keys) ?: 0); }
}