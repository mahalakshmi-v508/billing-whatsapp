<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\InvoiceSetting;
use App\Models\Invoice;

class InvoiceSettingController extends Controller
{
    /**
     * Get invoice settings for a company.
     */
    public function get(Request $request)
    {
        $company_id = intval($request->input('company_id') ?: $request->query('company_id', 0));
        if (!$company_id) {
            return response()->json(["status" => false, "message" => "Company ID required"], 400);
        }

        $setting = InvoiceSetting::getForCompany($company_id);

        return response()->json([
            "status" => true,
            "data"   => $setting,
        ]);
    }

    /**
     * Save / Update invoice settings for a company.
     */
    public function save(Request $request)
    {
        $company_id = intval($request->input('company_id', 0));
        if (!$company_id) {
            return response()->json(["status" => false, "message" => "Company ID required"], 400);
        }

        $setting = InvoiceSetting::getForCompany($company_id);

        $prefix = $request->input('prefix');
        if ($prefix !== null) {
            $setting->prefix = trim($prefix);
        }

        $next_number = $request->input('next_number');
        if ($next_number !== null) {
            $setting->next_number = max(1, intval($next_number));
        }

        $padding = $request->input('padding');
        if ($padding !== null) {
            $setting->padding = max(1, intval($padding));
        }

        if ($request->has('credit_note_prefix')) {
            $setting->credit_note_prefix = trim($request->input('credit_note_prefix'));
        }
        if ($request->has('sale_order_prefix')) {
            $setting->sale_order_prefix = trim($request->input('sale_order_prefix'));
        }
        if ($request->has('purchase_order_prefix')) {
            $setting->purchase_order_prefix = trim($request->input('purchase_order_prefix'));
        }
        if ($request->has('estimate_prefix')) {
            $setting->estimate_prefix = trim($request->input('estimate_prefix'));
        }
        if ($request->has('proforma_invoice_prefix')) {
            $setting->proforma_invoice_prefix = trim($request->input('proforma_invoice_prefix'));
        }
        if ($request->has('delivery_challan_prefix')) {
            $setting->delivery_challan_prefix = trim($request->input('delivery_challan_prefix'));
        }
        if ($request->has('payment_in_prefix')) {
            $setting->payment_in_prefix = trim($request->input('payment_in_prefix'));
        }

        $setting->save();

        return response()->json([
            "status"  => true,
            "message" => "Invoice settings saved successfully",
            "data"    => $setting,
        ]);
    }

    /**
     * Get the next formatted invoice number preview for a company.
     */
    public function getNextNumber(Request $request)
    {
        $company_id = intval($request->input('company_id') ?: $request->query('company_id', 0));
        if (!$company_id) {
            return response()->json(["status" => false, "message" => "Company ID required"], 400);
        }

        $setting = InvoiceSetting::getForCompany($company_id);
        $prefix  = $setting->prefix;
        $seq     = max(1, intval($setting->next_number));
        $padding = max(1, intval($setting->padding));

        // Skip any existing invoice numbers to guarantee uniqueness
        while (Invoice::where('company_id', $company_id)->where('invoice_no', InvoiceSetting::formatNumber($prefix, $seq, $padding))->exists()) {
            $seq++;
        }

        $formatted = InvoiceSetting::formatNumber($prefix, $seq, $padding);

        return response()->json([
            "status"     => true,
            "invoice_no" => $formatted,
            "prefix"     => $prefix,
            "sequence"   => $seq,
            "padding"    => $padding,
        ]);
    }
}
