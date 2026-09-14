<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EwayBill extends Model
{
    protected $table = 'eway_bills';
    protected $guarded = [];
    public $timestamps = true;
}