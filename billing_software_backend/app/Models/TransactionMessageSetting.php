<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TransactionMessageSetting extends Model
{
    protected $table = 'transaction_message_settings';

    protected $fillable = [
        'company_id',
        'transaction_type',
        'send_via',
        'auto_send',
        'send_to_party',
        'send_transaction_update',
        'send_copy_to_self',
        'party_balance_in_msg',
        'web_invoice_link_in_msg',
        'payment_link_in_msg',
        'template',
    ];

    protected $casts = [
        'auto_send' => 'boolean',
        'send_to_party' => 'boolean',
        'send_transaction_update' => 'boolean',
        'send_copy_to_self' => 'boolean',
        'party_balance_in_msg' => 'boolean',
        'web_invoice_link_in_msg' => 'boolean',
        'payment_link_in_msg' => 'boolean',
    ];
}