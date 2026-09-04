<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompanySetting extends Model
{
    protected $table = 'company_settings';
    protected $guarded = [];
    public $timestamps = true;

    protected function casts(): array
    {
        return [
            'settings' => 'array',
        ];
    }
}