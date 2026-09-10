<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

class InvoiceSetting extends Model
{
    protected $table = 'invoice_settings';
    protected $guarded = [];
    public $timestamps = true;

    /**
     * Ensure all prefix, next_number and padding columns exist dynamically.
     */
    public static function ensureColumnsExist()
    {
        if (Schema::hasTable('invoice_settings')) {
            Schema::table('invoice_settings', function (Blueprint $table) {
                if (!Schema::hasColumn('invoice_settings', 'prefix')) {
                    $table->string('prefix', 50)->nullable()->default('INV-');
                }
                if (!Schema::hasColumn('invoice_settings', 'next_number')) {
                    $table->bigInteger('next_number')->default(1);
                }
                if (!Schema::hasColumn('invoice_settings', 'padding')) {
                    $table->integer('padding')->default(4);
                }
                if (!Schema::hasColumn('invoice_settings', 'credit_note_prefix')) {
                    $table->string('credit_note_prefix', 50)->nullable()->default('CN-');
                }
                if (!Schema::hasColumn('invoice_settings', 'credit_note_next_number')) {
                    $table->bigInteger('credit_note_next_number')->default(1);
                }
                if (!Schema::hasColumn('invoice_settings', 'credit_note_padding')) {
                    $table->integer('credit_note_padding')->default(4);
                }
                if (!Schema::hasColumn('invoice_settings', 'payment_in_prefix')) {
                    $table->string('payment_in_prefix', 50)->nullable()->default('PAYIN-');
                }
                if (!Schema::hasColumn('invoice_settings', 'payment_in_next_number')) {
                    $table->bigInteger('payment_in_next_number')->default(1);
                }
                if (!Schema::hasColumn('invoice_settings', 'payment_in_padding')) {
                    $table->integer('payment_in_padding')->default(4);
                }
                if (!Schema::hasColumn('invoice_settings', 'purchase_order_prefix')) {
                    $table->string('purchase_order_prefix', 50)->nullable()->default('PO-');
                }
                if (!Schema::hasColumn('invoice_settings', 'purchase_order_next_number')) {
                    $table->bigInteger('purchase_order_next_number')->default(1);
                }
                if (!Schema::hasColumn('invoice_settings', 'purchase_order_padding')) {
                    $table->integer('purchase_order_padding')->default(4);
                }
                if (!Schema::hasColumn('invoice_settings', 'payment_out_prefix')) {
                    $table->string('payment_out_prefix', 50)->nullable()->default('PAYOUT-');
                }
                if (!Schema::hasColumn('invoice_settings', 'payment_out_next_number')) {
                    $table->bigInteger('payment_out_next_number')->default(1);
                }
                if (!Schema::hasColumn('invoice_settings', 'payment_out_padding')) {
                    $table->integer('payment_out_padding')->default(4);
                }
                if (!Schema::hasColumn('invoice_settings', 'debit_note_prefix')) {
                    $table->string('debit_note_prefix', 50)->nullable()->default('DN-');
                }
                if (!Schema::hasColumn('invoice_settings', 'debit_note_next_number')) {
                    $table->bigInteger('debit_note_next_number')->default(1);
                }
                if (!Schema::hasColumn('invoice_settings', 'debit_note_padding')) {
                    $table->integer('debit_note_padding')->default(4);
                }
                if (!Schema::hasColumn('invoice_settings', 'estimate_prefix')) {
                    $table->string('estimate_prefix', 50)->nullable()->default('EST-');
                }
                if (!Schema::hasColumn('invoice_settings', 'estimate_next_number')) {
                    $table->bigInteger('estimate_next_number')->default(1);
                }
                if (!Schema::hasColumn('invoice_settings', 'estimate_padding')) {
                    $table->integer('estimate_padding')->default(4);
                }
                if (!Schema::hasColumn('invoice_settings', 'delivery_challan_prefix')) {
                    $table->string('delivery_challan_prefix', 50)->nullable()->default('DC-');
                }
                if (!Schema::hasColumn('invoice_settings', 'delivery_challan_next_number')) {
                    $table->bigInteger('delivery_challan_next_number')->default(1);
                }
                if (!Schema::hasColumn('invoice_settings', 'delivery_challan_padding')) {
                    $table->integer('delivery_challan_padding')->default(4);
                }
                if (!Schema::hasColumn('invoice_settings', 'proforma_invoice_prefix')) {
                    $table->string('proforma_invoice_prefix', 50)->nullable()->default('PI-');
                }
                if (!Schema::hasColumn('invoice_settings', 'proforma_invoice_next_number')) {
                    $table->bigInteger('proforma_invoice_next_number')->default(1);
                }
                if (!Schema::hasColumn('invoice_settings', 'proforma_invoice_padding')) {
                    $table->integer('proforma_invoice_padding')->default(4);
                }
                if (!Schema::hasColumn('invoice_settings', 'sale_order_prefix')) {
                    $table->string('sale_order_prefix', 50)->nullable()->default('SO-');
                }
                if (!Schema::hasColumn('invoice_settings', 'sale_order_next_number')) {
                    $table->bigInteger('sale_order_next_number')->default(1);
                }
                if (!Schema::hasColumn('invoice_settings', 'sale_order_padding')) {
                    $table->integer('sale_order_padding')->default(4);
                }
            });
        }
    }

    /**
     * Get or create default invoice settings for a company.
     */
    public static function getForCompany($company_id)
    {
        self::ensureColumnsExist();

        $setting = self::where('company_id', $company_id)->first();
        if (!$setting) {
            $setting = self::create([
                'company_id'                   => $company_id,
                'prefix'                       => 'INV-',
                'next_number'                  => 1,
                'padding'                      => 4,
                'credit_note_prefix'           => 'CN-',
                'credit_note_next_number'      => 1,
                'credit_note_padding'          => 4,
                'payment_in_prefix'            => 'PAYIN-',
                'payment_in_next_number'       => 1,
                'payment_in_padding'           => 4,
                'purchase_order_prefix'        => 'PO-',
                'purchase_order_next_number'   => 1,
                'purchase_order_padding'       => 4,
                'payment_out_prefix'           => 'PAYOUT-',
                'payment_out_next_number'      => 1,
                'payment_out_padding'          => 4,
                'debit_note_prefix'            => 'DN-',
                'debit_note_next_number'       => 1,
                'debit_note_padding'           => 4,
                'estimate_prefix'              => 'EST-',
                'estimate_next_number'         => 1,
                'estimate_padding'             => 4,
                'delivery_challan_prefix'      => 'DC-',
                'delivery_challan_next_number' => 1,
                'delivery_challan_padding'     => 4,
                'proforma_invoice_prefix'      => 'PI-',
                'proforma_invoice_next_number' => 1,
                'proforma_invoice_padding'     => 4,
                'sale_order_prefix'            => 'SO-',
                'sale_order_next_number'       => 1,
                'sale_order_padding'           => 4,
            ]);
        }
        return $setting;
    }

    /**
     * Format any document number with prefix and padding.
     */
    public static function formatNumber($prefix, $sequence, $padding = 4)
    {
        $p = ($prefix === 'None' || $prefix === null) ? '' : trim($prefix);
        $pad = max(1, intval($padding));
        $paddedSeq = str_pad(intval($sequence), $pad, '0', STR_PAD_LEFT);
        return $p . $paddedSeq;
    }
}
