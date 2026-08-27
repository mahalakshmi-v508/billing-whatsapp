<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WhatsAppMessage extends Model
{
    protected $table = 'whatsapp_messages';

    protected $guarded = [];

    public $timestamps = false;

    protected $casts = [
        'delivered_at' => 'datetime',
        'read_at' => 'datetime',
    ];
}
