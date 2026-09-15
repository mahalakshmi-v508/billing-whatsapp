<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Party Wise Profit & Loss — aggregated profit/loss per party (customer)
 * across a date range.
 *
 * Profit per invoice = sale_value (net, ex-tax) − cost_total (qty × purchase_price).
 * Each party row = sum of all their invoices' sale_value, total_sale_amount,
 *                  cost_total, and profit.
 *
 * It only reads — it never writes.
 */
class PartyWiseProfitLossController extends Controller
{
    public function index(Request $request)
    {
        $company_id = intval($request->input('company_id') ?: $request->query('company_id', 0));
        $admin_id   = intval($request->input('admin_id') ?: $request->query('admin_id', 0));
        $party_id   = intval($request->input('party_id') ?: $request->query('party_id', 0));
        $from       = $request->input('from_date') ?: $request->query('from_date', '');
        $to         = $request->input('to_date') ?: $request->query('to_date', '');

        if (!$company_id && !$admin_id) {
            return response()->json(['status' => false, 'message' => 'company_id or admin_id required']);
        }
        if (!$from || !$to) {
            return response()->json(['status' => false, 'message' => 'from_date and to_date required']);
        }

        $from = date('Y-m-d', strtotime($from));
        $to   = date('Y-m-d', strtotime($to));
        if ($to < $from) { [$from, $to] = [$to, $from]; }

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
                return response()->json(['status' => true, 'from_date' => $from, 'to_date' => $to, 'data' => [], 'summary' => $this->emptySummary()]);
            }
        }

        // Master cost prices.
        $prods = [];
        foreach (DB::table('products')
            ->whereIn('company_id', $companyIds)
            ->get(['id', 'purchase_price']) as $p) {
            $prods[intval($p->id)] = $p;
        }

        // Customer names and phones.
        $custNames = [];
        $custPhones = [];
        if (Schema::hasTable('customers')) {
            foreach (DB::table('customers')->where('is_deleted', 0)->get(['id', 'name', 'phone']) as $c) {
                $custNames[(int)$c->id]   = trim((string)$c->name);
                $custPhones[(int)$c->id]  = trim((string)$c->phone);
            }
        }

        $invQuery = DB::table('invoices')
            ->whereIn('company_id', $companyIds)
            ->whereBetween(DB::raw('DATE(created_at)'), [$from, $to])
            ->orderBy('customer_id');

        if ($party_id > 0) {
            $invQuery->where('customer_id', $party_id);
        }

        // Aggregate per-party.
        $parties = [];
        foreach ($invQuery->get([
            'id', 'customer_id', 'customer_name', 'customer_phone',
            'total_amount', 'products',
        ]) as $inv) {
            $cid = (int)$inv->customer_id;
            if ($cid <= 0) { continue; }

            if (!isset($parties[$cid])) {
                $partyName = trim((string)$inv->customer_name);
                if ($partyName === '') {
                    $partyName = $custNames[$cid] ?? 'Customer';
                }
                $phone = trim((string)$inv->customer_phone);
                if ($phone === '') {
                    $phone = $custPhones[$cid] ?? '';
                }
                $parties[$cid] = [
                    'party_id'         => $cid,
                    'party_name'       => $partyName,
                    'phone'            => $phone,
                    'total_sale_amount'=> 0.0,
                    'cost_total'       => 0.0,
                    'profit'           => 0.0,
                    'invoice_count'    => 0,
                ];
            }

            $lines = $this->decodeLines($inv->products);
            $saleValue = 0.0;
            $costTotal = 0.0;

            foreach ($lines as $line) {
                if (!is_array($line)) { continue; }
                $pid = intval($line['product_id'] ?? 0);
                $qty = floatval($line['qty'] ?? $line['quantity'] ?? 0);
                $net = $this->lineNet($line);
                $unitCost = ($pid > 0 && isset($prods[$pid])) ? floatval($prods[$pid]->purchase_price ?? 0) : 0.0;

                $saleValue += $net;
                $costTotal += $qty * $unitCost;
            }

            $parties[$cid]['total_sale_amount'] += round(floatval($inv->total_amount ?? 0), 2);
            $parties[$cid]['cost_total']        += round($costTotal, 2);
            $parties[$cid]['profit']            += round($saleValue - $costTotal, 2);
            $parties[$cid]['invoice_count']     += 1;
        }

        $data = array_values($parties);
        usort($data, fn($a, $b) => strcasecmp($a['party_name'], $b['party_name']));

        // Round final values.
        foreach ($data as &$r) {
            $r['total_sale_amount'] = round($r['total_sale_amount'], 2);
            $r['cost_total']        = round($r['cost_total'], 2);
            $r['profit']            = round($r['profit'], 2);
        }
        unset($r);

        $summary = [
            'total_sale_amount' => round(array_sum(array_column($data, 'total_sale_amount')), 2),
            'total_profit'      => round(array_sum(array_column($data, 'profit')), 2),
            'party_count'       => count($data),
        ];

        return response()->json([
            'status'    => true,
            'from_date' => $from,
            'to_date'   => $to,
            'data'      => $data,
            'summary'   => $summary,
        ]);
    }

    private function decodeLines($raw)
    {
        $decoded = is_string($raw) ? json_decode($raw, true) : $raw;
        return is_array($decoded) ? $decoded : [];
    }

    private function lineNet(array $line)
    {
        $qty   = floatval($line['qty'] ?? $line['quantity'] ?? 0);
        $price = floatval($line['price'] ?? $line['rate'] ?? 0);
        $disc  = floatval($line['discount'] ?? $line['discount_amount'] ?? 0);
        $tax   = $this->lineTax($line);

        $amtRaw = $line['amount'] ?? $line['total_amount'] ?? null;
        if ($amtRaw === null || $amtRaw === '') {
            $base = max(0.0, ($price * $qty) - $disc);
            $net  = $base - $tax;
        } else {
            $net = floatval($amtRaw) - $tax;
            if ($net < 0) {
                $net = max(0.0, ($price * $qty) - $disc) - $tax;
            }
        }
        return round(max(0.0, $net), 2);
    }

    private function lineTax(array $line)
    {
        $tax = floatval($line['tax_amount'] ?? $line['tax'] ?? 0);
        if ($tax > 0) { return $tax; }
        $amtRaw = $line['amount'] ?? $line['total_amount'] ?? null;
        $gst    = floatval($line['gst'] ?? $line['gst_percentage'] ?? 0);
        if ($gst > 0) {
            if ($amtRaw !== null && $amtRaw !== '' && floatval($amtRaw) > 0) {
                return round(floatval($amtRaw) - (floatval($amtRaw) / (1 + $gst / 100)), 2);
            }
            $qty   = floatval($line['qty'] ?? $line['quantity'] ?? 0);
            $price = floatval($line['price'] ?? $line['rate'] ?? 0);
            $disc  = floatval($line['discount'] ?? $line['discount_amount'] ?? 0);
            return round(max(0.0, ($price * $qty) - $disc) * $gst / 100, 2);
        }
        return 0.0;
    }

    private function emptySummary()
    {
        return ['total_sale_amount' => 0.0, 'total_profit' => 0.0, 'party_count' => 0];
    }
}
