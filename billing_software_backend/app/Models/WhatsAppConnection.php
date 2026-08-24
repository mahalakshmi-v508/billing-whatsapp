<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WhatsAppConnection extends Model
{
    protected $table = 'whatsapp_connections';

    protected $guarded = [];

    public $timestamps = false;

    public function isReady(): bool
    {
        return $this->status === 'ready';
    }
}
