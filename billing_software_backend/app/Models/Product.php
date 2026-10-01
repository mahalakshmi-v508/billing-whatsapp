<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $table = 'products';
    protected $guarded = [];
    public $timestamps = true;

    /**
     * Numeric columns arrive from MySQL as strings ("18.00"). Casting them keeps
     * JSON responses numeric so the frontend never has to parse them, and makes
     * the pricing maths type-safe.
     */
    protected $casts = [
        'price'             => 'float',
        'sale_price'        => 'float',
        'purchase_price'    => 'float',
        'gst_percentage'    => 'float',
        'stock'             => 'integer',
        'sale_price_type'     => 'string',
        'purchase_price_type' => 'string',
    ];

    /**
     * Guaranteed pricing modes for every product, including rows created before
     * sale_price_type / purchase_price_type existed.
     *
     * 'without_gst' is the safe default: it reproduces exactly how the system
     * always treated a stored price (GST added on top), so no existing product
     * changes behaviour.
     */
    public function getSalePriceTypeAttribute($value)
    {
        return \App\Support\GstCalculator::normaliseMode($value);
    }

    public function getPurchasePriceTypeAttribute($value)
    {
        return \App\Support\GstCalculator::normaliseMode($value);
    }
}
