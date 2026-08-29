<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CreditNote extends Model
{
    protected $table = 'credit_notes';
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'products' => 'array',
        ];
    }
}
