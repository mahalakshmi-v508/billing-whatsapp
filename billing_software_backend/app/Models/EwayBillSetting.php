<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EwayBillSetting extends Model
{
    protected $table = 'eway_bill_settings';

    protected $fillable = [
        'company_id',
        'api_provider',
        'environment',
        'gstin',
        'ewb_username',
        'ewb_password',
        'gsp_client_id',
        'gsp_client_secret',
        'integration_enabled',
        'last_test_at',
        'last_test_status',
        'last_test_message',
    ];

    protected $casts = [
        'integration_enabled' => 'boolean',
        'last_test_at' => 'datetime',
    ];
}