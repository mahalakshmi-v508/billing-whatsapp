<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExpenseItem extends Model
{
    use HasFactory;

    protected $table = 'expense_items';

    protected $fillable = [
        'admin_id',
        'company_id',
        'category_id',
        'item_name',
        'hsn_sac',
        'price',
        'tax_type', // 'Tax Excluded' or 'Tax Included'
        'tax_rate',
        'status',
        'is_deleted',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'tax_rate' => 'decimal:2',
        'is_deleted' => 'integer',
    ];
}
