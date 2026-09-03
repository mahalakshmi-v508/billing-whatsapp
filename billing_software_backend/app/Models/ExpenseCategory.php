<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExpenseCategory extends Model
{
    use HasFactory;

    protected $table = 'expense_categories';

    protected $fillable = [
        'admin_id',
        'company_id',
        'name',
        'type', // 'Direct Expense' or 'Indirect Expense'
        'description',
        'status',
        'is_deleted',
    ];

    protected $casts = [
        'is_deleted' => 'integer',
    ];
}
