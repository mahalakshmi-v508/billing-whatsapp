<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TransactionMessageAutoSend extends Model
{
    protected $fillable = [
        'company_id',
        'transaction_type',
        'txn_no',
        'message',
        'destinations',
        'pdf_attached',
        'pdf_attempts',
    ];

    protected $casts = [
        'pdf_attached' => 'boolean',
        'pdf_attempts' => 'integer',
    ];
}