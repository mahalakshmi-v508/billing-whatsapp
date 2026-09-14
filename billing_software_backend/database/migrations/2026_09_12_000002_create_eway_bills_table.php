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
        if (!Schema::hasTable('eway_bills')) {
            Schema::create('eway_bills', function (Blueprint $table) {
                $table->integer('id', true);
                $table->integer('company_id');
                $table->integer('invoice_id')->nullable();
                $table->string('invoice_no', 100)->nullable();
                $table->date('invoice_date')->nullable();
                $table->decimal('invoice_value', 12, 2)->nullable();
                $table->string('ewb_number', 40)->nullable();
                $table->string('ewaybill_type', 20)->default('EWB');
                $table->string('from_gstin', 100)->nullable();
                $table->string('to_gstin', 100)->nullable();
                $table->string('consignee_name', 150)->nullable();
                $table->string('consignee_place', 150)->nullable();
                $table->string('from_place', 150)->nullable();
                $table->string('transporter_name', 150)->nullable();
                $table->string('transporter_id', 60)->nullable();
                $table->string('vehicle_number', 40)->nullable();
                $table->string('vehicle_type', 30)->default('Regular');
                $table->decimal('distance_km', 8, 2)->nullable();
                $table->dateTime('generated_date')->nullable();
                $table->dateTime('valid_upto')->nullable();
                $table->enum('status', ['Active', 'In Transporter', 'Cancelled', 'Expired'])->default('Active');
                $table->timestamp('created_at')->useCurrent();
                $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

                $table->index(['company_id', 'status']);
                $table->unique(['company_id', 'ewb_number']);
                $table->foreign('company_id')->references('id')->on('companies')->onDelete('cascade');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('eway_bills');
    }
};