<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DebitNote extends Model
{
    use HasFactory;

    protected $table = 'debit_notes';

    protected $fillable = [
        'admin_id',
        'company_id',
        'cashier_id',
        'return_no',
        'bill_no',
        'bill_date',
        'return_date',
        'supplier_id',
        'supplier_name',
        'supplier_phone',
        'products',
        'sub_total',
        'tax_total',
        'discount_total',
        'round_off',
        'total_amount',
        'refund_amount',
        'balance_amount',
        'payment_type',
        'state_of_supply',
        'description',
        'status',
        'is_deleted',
    ];

    protected $casts = [
        'products'        => 'array',
        'sub_total'       => 'float',
        'tax_total'       => 'float',
        'discount_total'  => 'float',
        'round_off'       => 'float',
        'total_amount'    => 'float',
        'refund_amount'   => 'float',
        'balance_amount'  => 'float',
        'is_deleted'      => 'integer',
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }

    public function company()
    {
        return $this->belongsTo(Company::class, 'company_id');
    }
}
