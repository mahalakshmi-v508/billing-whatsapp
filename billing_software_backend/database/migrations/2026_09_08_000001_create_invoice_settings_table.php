<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('invoice_settings')) {
            Schema::create('invoice_settings', function (Blueprint $table) {
                $table->id();
                $table->integer('company_id')->unsigned();
                $table->string('prefix', 50)->default('INV-');
                $table->bigInteger('next_number')->default(1);
                $table->integer('padding')->default(4);
                $table->string('credit_note_prefix', 50)->nullable()->default('CN-');
                $table->string('sale_order_prefix', 50)->nullable()->default('SO-');
                $table->string('purchase_order_prefix', 50)->nullable()->default('PO-');
                $table->string('estimate_prefix', 50)->nullable()->default('EST-');
                $table->string('proforma_invoice_prefix', 50)->nullable()->default('PI-');
                $table->string('delivery_challan_prefix', 50)->nullable()->default('DC-');
                $table->string('payment_in_prefix', 50)->nullable()->default('PAY-');
                $table->timestamps();

                $table->index('company_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoice_settings');
    }
};
