<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EwayBill extends Model
{
    protected $table = 'eway_bills';

    protected $fillable = [
        'company_id',
        'invoice_id',
        'invoice_no',
        'invoice_date',
        'invoice_value',
        'ewb_number',
        'ewaybill_type',
        'from_gstin',
        'to_gstin',
        'consignee_name',
        'consignee_place',
        'consignee_address',
        'from_place',
        'from_address',
        'transporter_name',
        'transporter_id',
        'vehicle_number',
        'vehicle_type',
        'distance_km',
        'generated_date',
        'valid_upto',
        'status',
        'customer_name',
        'customer_phone',
        'taxable_amount',
        'gst_total',
        'cgst_amount',
        'sgst_amount',
        'igst_amount',
        'item_details',
        'transport_mode',
        'supply_type',
        'sub_supply_type',
        'doc_type',
        'doc_number',
        'doc_date',
    ];

    protected $casts = [
        'invoice_date' => 'date',
        'invoice_value' => 'float',
        'taxable_amount' => 'float',
        'gst_total' => 'float',
        'cgst_amount' => 'float',
        'sgst_amount' => 'float',
        'igst_amount' => 'float',
        'distance_km' => 'float',
        'generated_date' => 'datetime',
        'valid_upto' => 'datetime',
        'item_details' => 'array',
    ];

    public function company()
    {
        return $this->belongsTo(\App\Models\Company::class, 'company_id');
    }
}