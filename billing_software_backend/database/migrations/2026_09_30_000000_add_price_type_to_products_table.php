<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add per-product "with GST / without GST" pricing modes.
     *
     * The mode records whether the stored sale_price / purchase_price already
     * includes GST, so the same product can be re-costed correctly on Sale
     * Invoice, POS and Purchase Bill without re-deriving it from a final total.
     *
     * NOTE: 'without_gst' is the default on purpose. Every existing product in
     * this system has always had GST added ON TOP of its stored price
     * (AddSale.jsx / PurchaseController 'without_tax' branch), so defaulting to
     * 'without_gst' keeps all existing products behaving exactly as before.
     */
    public function up(): void
    {
        if (!Schema::hasTable('products')) {
            return;
        }

        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'sale_price_type')) {
                $table->enum('sale_price_type', ['with_gst', 'without_gst'])
                    ->default('without_gst')
                    ->after('sale_price');
            }

            if (!Schema::hasColumn('products', 'purchase_price_type')) {
                $table->enum('purchase_price_type', ['with_gst', 'without_gst'])
                    ->default('without_gst')
                    ->after('purchase_price');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('products')) {
            return;
        }

        Schema::table('products', function (Blueprint $table) {
            $columns = array_values(array_filter(
                ['sale_price_type', 'purchase_price_type'],
                fn ($c) => Schema::hasColumn('products', $c)
            ));

            if ($columns) {
                $table->dropColumn($columns);
            }
        });
    }
};
