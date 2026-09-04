<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Expense extends Model
{
    use HasFactory;

    protected $table = 'expenses';

    protected $fillable = [
        'admin_id',
        'company_id',
        'cashier_id',
        'expense_no',
        'expense_date',
        'category_id',
        'category_name',
        'party_name',
        'party_phone',
        'is_gst',
        'items',
        'sub_total',
        'tax_total',
        'discount_total',
        'round_off',
        'total_amount',
        'paid_amount',
        'balance_amount',
        'payment_type',
        'description',
        'status',
        'is_deleted',
    ];

    protected $casts = [
        'items' => 'array',
        'is_gst' => 'boolean',
        'sub_total' => 'decimal:2',
        'tax_total' => 'decimal:2',
        'discount_total' => 'decimal:2',
        'round_off' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'balance_amount' => 'decimal:2',
        'is_deleted' => 'integer',
    ];
}
