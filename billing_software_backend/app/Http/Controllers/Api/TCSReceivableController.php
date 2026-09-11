<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TCSReceivableController extends Controller
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
            $tcs = $this->numberFrom((array)$invoice, ['tcs', 'tcs_amount', 'tcs_total', 'tcs_collection']);
            $rate = $this->numberFrom((array)$invoice, ['tcs_rate', 'tcs_percentage', 'tcs_percent']);
            $taxName = $this->valueFrom((array)$invoice, ['tcs_name', 'tax_name']) ?: 'TCS';
            $taxSection = $this->valueFrom((array)$invoice, ['tcs_section', 'tax_section']) ?: '';
            $collectionCode = $this->valueFrom((array)$invoice, ['collection_code', 'tcs_collection_code']) ?: '';
            foreach ($lines as $line) {
                $lineTcs = $this->numberFrom($line, ['tcs', 'tcs_amount', 'tcs_collection']);
                if ($lineTcs > 0) {
                    $tcs += $lineTcs;
                    $rate = $rate ?: $this->numberFrom($line, ['tcs_rate', 'tcs_percentage', 'tcs_percent']);
                    $taxName = $this->valueFrom($line, ['tcs_name', 'tax_name']) ?: $taxName;
                    $taxSection = $this->valueFrom($line, ['tcs_section', 'tax_section']) ?: $taxSection;
                    $collectionCode = $this->valueFrom($line, ['collection_code', 'tcs_collection_code']) ?: $collectionCode;
                }
            }
            if ($tcs <= 0) continue;
            $rows[] = [
                'party_name' => trim((string)$invoice->customer_name) ?: 'Cash Customer',
                'bill_no' => (string)($invoice->invoice_no ?: '-'),
                'total_value' => round(floatval($invoice->total_amount), 2),
                'amount_paid' => round(floatval($invoice->paid_amount), 2),
                'total_tcs_paid' => round($tcs, 2),
                'date_of_collection' => substr((string)$invoice->created_at, 0, 10),
                'tax_name' => (string)$taxName,
                'tax_section' => (string)$taxSection,
                'collection_code' => (string)$collectionCode,
                'tcs_rate' => round($rate, 2),
            ];
        }

        return response()->json([
            'status' => true,
            'data' => $rows,
            'totals' => [
                'total_value' => round(array_sum(array_column($rows, 'total_value')), 2),
                'total_tcs_paid' => round(array_sum(array_column($rows, 'total_tcs_paid')), 2),
            ],
        ]);
    }

    private function decodeLines($raw): array
    {
        $decoded = is_string($raw) ? json_decode($raw, true) : $raw;
        return is_array($decoded) ? $decoded : [];
    }

    private function valueFrom(array $source, array $keys)
    {
        foreach ($keys as $key) if (isset($source[$key]) && $source[$key] !== '') return $source[$key];
        return null;
    }

    private function numberFrom(array $source, array $keys): float
    {
        return floatval($this->valueFrom($source, $keys) ?: 0);
    }
}