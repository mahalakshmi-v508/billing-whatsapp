<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\InvoiceSetting;
use App\Models\Invoice;
use App\Models\CreditNote;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class InvoiceSettingController extends Controller
{
    /**
     * Get invoice and document numbering settings for a company.
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
     * Save / Update numbering settings for all document types.
     */
    public function save(Request $request)
    {
        $company_id = intval($request->input('company_id', 0));
        if (!$company_id) {
            return response()->json(["status" => false, "message" => "Company ID required"], 400);
        }

        $setting = InvoiceSetting::getForCompany($company_id);

        $fields = [
            'prefix', 'next_number', 'padding',
            'credit_note_prefix', 'credit_note_next_number', 'credit_note_padding',
            'payment_in_prefix', 'payment_in_next_number', 'payment_in_padding',
            'purchase_order_prefix', 'purchase_order_next_number', 'purchase_order_padding',
            'payment_out_prefix', 'payment_out_next_number', 'payment_out_padding',
            'debit_note_prefix', 'debit_note_next_number', 'debit_note_padding',
            'estimate_prefix', 'estimate_next_number', 'estimate_padding',
            'delivery_challan_prefix', 'delivery_challan_next_number', 'delivery_challan_padding',
            'proforma_invoice_prefix', 'proforma_invoice_next_number', 'proforma_invoice_padding',
            'sale_order_prefix', 'sale_order_next_number', 'sale_order_padding',
            'expense_prefix', 'expense_next_number', 'expense_padding',
        ];

        foreach ($fields as $field) {
            if ($request->has($field)) {
                $val = $request->input($field);
                if (str_ends_with($field, '_number') || $field === 'next_number') {
                    $setting->{$field} = max(1, intval($val));
                } elseif (str_ends_with($field, '_padding') || $field === 'padding') {
                    $setting->{$field} = max(1, intval($val));
                } else {
                    $setting->{$field} = trim(strval($val));
                }
            }
        }

        $setting->save();

        return response()->json([
            "status"  => true,
            "message" => "Document numbering settings saved successfully",
            "data"    => $setting,
        ]);
    }

    /**
     * Get the next formatted sequential number for any document type.
     */
    public function getNextNumber(Request $request)
    {
        $company_id = intval($request->input('company_id') ?: $request->query('company_id', 0));
        if (!$company_id) {
            return response()->json(["status" => false, "message" => "Company ID required"], 400);
        }

        $type = strtolower(trim($request->input('type') ?: $request->query('type', 'invoice')));
        $setting = InvoiceSetting::getForCompany($company_id);

        $prefixField  = 'prefix';
        $seqField     = 'next_number';
        $paddingField = 'padding';
        $tableName    = 'invoices';
        $columnName   = 'invoice_no';

        switch ($type) {
            case 'credit_note':
            case 'sale_return':
                $prefixField  = 'credit_note_prefix';
                $seqField     = 'credit_note_next_number';
                $paddingField = 'credit_note_padding';
                $tableName    = 'credit_notes';
                $columnName   = 'return_no';
                break;

            case 'payment_in':
            case 'receipt':
                $prefixField  = 'payment_in_prefix';
                $seqField     = 'payment_in_next_number';
                $paddingField = 'payment_in_padding';
                $tableName    = 'payments';
                $columnName   = 'receipt_no';
                break;

            case 'purchase_order':
            case 'po':
            case 'purchase':
                $prefixField  = 'purchase_order_prefix';
                $seqField     = 'purchase_order_next_number';
                $paddingField = 'purchase_order_padding';
                $tableName    = 'purchases';
                $columnName   = 'purchase_no';
                break;

            case 'payment_out':
            case 'voucher':
                $prefixField  = 'payment_out_prefix';
                $seqField     = 'payment_out_next_number';
                $paddingField = 'payment_out_padding';
                $tableName    = 'purchase_payments';
                $columnName   = 'receipt_no';
                break;

            case 'debit_note':
            case 'purchase_return':
                $prefixField  = 'debit_note_prefix';
                $seqField     = 'debit_note_next_number';
                $paddingField = 'debit_note_padding';
                $tableName    = 'debit_notes';
                $columnName   = 'return_no';
                break;

            case 'estimate':
            case 'quotation':
                $prefixField  = 'estimate_prefix';
                $seqField     = 'estimate_next_number';
                $paddingField = 'estimate_padding';
                $tableName    = 'estimates';
                $columnName   = 'estimate_no';
                break;

            case 'delivery_challan':
            case 'challan':
                $prefixField  = 'delivery_challan_prefix';
                $seqField     = 'delivery_challan_next_number';
                $paddingField = 'delivery_challan_padding';
                $tableName    = 'delivery_challans';
                $columnName   = 'challan_no';
                break;

            case 'proforma':
            case 'proforma_invoice':
                $prefixField  = 'proforma_invoice_prefix';
                $seqField     = 'proforma_invoice_next_number';
                $paddingField = 'proforma_invoice_padding';
                $tableName    = 'proforma_invoices';
                $columnName   = 'invoice_no';
                break;

            case 'sale_order':
            case 'order':
                $prefixField  = 'sale_order_prefix';
                $seqField     = 'sale_order_next_number';
                $paddingField = 'sale_order_padding';
                $tableName    = 'sale_orders';
                $columnName   = 'order_no';
                break;

            case 'expense':
            case 'expense_voucher':
                $prefixField  = 'expense_prefix';
                $seqField     = 'expense_next_number';
                $paddingField = 'expense_padding';
                $tableName    = 'expenses';
                $columnName   = 'expense_no';
                break;

            default:
                $prefixField  = 'prefix';
                $seqField     = 'next_number';
                $paddingField = 'padding';
                $tableName    = 'invoices';
                $columnName   = 'invoice_no';
                break;
        }

        $prefix  = $setting->{$prefixField} ?? 'INV-';
        $seq     = max(1, intval($setting->{$seqField} ?? 1));
        $padding = max(1, intval($setting->{$paddingField} ?? 4));

        // Skip existing numbers across tables
        $checkExists = function($formattedNum) use ($type, $tableName, $columnName, $company_id) {
            $numVariants = [
                $formattedNum,
                '#' . $formattedNum,
                ltrim($formattedNum, '#')
            ];

            if ($type === 'payment_in' || $type === 'receipt') {
                if (Schema::hasTable('payments')) {
                    return DB::table('payments')
                        ->when($company_id > 0 && Schema::hasColumn('payments', 'company_id'), fn($q) => $q->where('company_id', $company_id))
                        ->where(function($q) use ($numVariants) {
                            $q->whereIn('receipt_no', $numVariants)
                              ->orWhereIn('invoice_no', $numVariants);
                        })
                        ->exists();
                }
            } elseif ($type === 'payment_out' || $type === 'voucher') {
                if (Schema::hasTable('purchase_payments')) {
                    return DB::table('purchase_payments')
                        ->when($company_id > 0 && Schema::hasColumn('purchase_payments', 'company_id'), fn($q) => $q->where('company_id', $company_id))
                        ->whereIn('receipt_no', $numVariants)
                        ->exists();
                }
            } elseif (Schema::hasTable($tableName) && Schema::hasColumn($tableName, $columnName)) {
                return DB::table($tableName)
                    ->when($company_id > 0 && Schema::hasColumn($tableName, 'company_id'), fn($q) => $q->where('company_id', $company_id))
                    ->whereIn($columnName, $numVariants)
                    ->exists();
            }
            return false;
        };

        while ($checkExists(InvoiceSetting::formatNumber($prefix, $seq, $padding))) {
            $seq++;
        }

        $formatted = InvoiceSetting::formatNumber($prefix, $seq, $padding);

        return response()->json([
            "status"           => true,
            "type"             => $type,
            "formatted_number" => $formatted,
            "invoice_no"       => $formatted,
            "return_no"        => $formatted,
            "receipt_no"       => $formatted,
            "order_no"         => $formatted,
            "prefix"           => $prefix,
            "sequence"         => $seq,
            "padding"          => $padding,
        ]);
    }
}
