<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InvoiceSetting extends Model
{
    protected $table = 'invoice_settings';
    protected $guarded = [];
    public $timestamps = true;

    /**
     * Get or create default invoice settings for a company.
     */
    public static function getForCompany($company_id)
    {
        $setting = self::where('company_id', $company_id)->first();
        if (!$setting) {
            $setting = self::create([
                'company_id'              => $company_id,
                'prefix'                  => 'INV-',
                'next_number'             => 1,
                'padding'                 => 4,
                'credit_note_prefix'      => 'CN-',
                'sale_order_prefix'       => 'SO-',
                'purchase_order_prefix'   => 'PO-',
                'estimate_prefix'         => 'EST-',
                'proforma_invoice_prefix' => 'PI-',
                'delivery_challan_prefix' => 'DC-',
                'payment_in_prefix'       => 'PAY-',
            ]);
        }
        return $setting;
    }

    /**
     * Format an invoice number with prefix and padding.
     */
    public static function formatNumber($prefix, $sequence, $padding = 4)
    {
        $p = ($prefix === 'None' || $prefix === null) ? '' : trim($prefix);
        $pad = max(1, intval($padding));
        $paddedSeq = str_pad(intval($sequence), $pad, '0', STR_PAD_LEFT);
        return $p . $paddedSeq;
    }
}
