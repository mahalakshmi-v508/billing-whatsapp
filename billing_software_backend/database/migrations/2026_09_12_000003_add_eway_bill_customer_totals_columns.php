<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddEwayBillCustomerTotalsColumns extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('eway_bills', function (Blueprint $table) {
            if (!Schema::hasColumn('eway_bills', 'customer_name')) {
                $table->string('customer_name', 255)->nullable()->after('invoice_no');
            }
            if (!Schema::hasColumn('eway_bills', 'customer_phone')) {
                $table->string('customer_phone', 30)->nullable()->after('customer_name');
            }
            if (!Schema::hasColumn('eway_bills', 'from_address')) {
                $table->text('from_address')->nullable()->after('from_place');
            }
            if (!Schema::hasColumn('eway_bills', 'consignee_address')) {
                $table->text('consignee_address')->nullable()->after('consignee_place');
            }
            if (!Schema::hasColumn('eway_bills', 'taxable_amount')) {
                $table->decimal('taxable_amount', 12, 2)->nullable()->after('invoice_value');
            }
            if (!Schema::hasColumn('eway_bills', 'gst_total')) {
                $table->decimal('gst_total', 12, 2)->nullable()->after('taxable_amount');
            }
            if (!Schema::hasColumn('eway_bills', 'cgst_amount')) {
                $table->decimal('cgst_amount', 12, 2)->nullable()->after('gst_total');
            }
            if (!Schema::hasColumn('eway_bills', 'sgst_amount')) {
                $table->decimal('sgst_amount', 12, 2)->nullable()->after('cgst_amount');
            }
            if (!Schema::hasColumn('eway_bills', 'igst_amount')) {
                $table->decimal('igst_amount', 12, 2)->nullable()->after('sgst_amount');
            }
            if (!Schema::hasColumn('eway_bills', 'item_details')) {
                $table->longText('item_details')->nullable()->after('igst_amount');
            }
            if (!Schema::hasColumn('eway_bills', 'transport_mode')) {
                $table->string('transport_mode', 30)->nullable()->after('vehicle_type');
            }
            if (!Schema::hasColumn('eway_bills', 'supply_type')) {
                $table->string('supply_type', 60)->nullable()->after('transport_mode');
            }
            if (!Schema::hasColumn('eway_bills', 'sub_supply_type')) {
                $table->string('sub_supply_type', 60)->nullable()->after('supply_type');
            }
            if (!Schema::hasColumn('eway_bills', 'doc_type')) {
                $table->string('doc_type', 60)->nullable()->after('sub_supply_type');
            }
            if (!Schema::hasColumn('eway_bills', 'doc_number')) {
                $table->string('doc_number', 60)->nullable()->after('doc_type');
            }
            if (!Schema::hasColumn('eway_bills', 'doc_date')) {
                $table->date('doc_date')->nullable()->after('doc_number');
            }
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('eway_bills', function (Blueprint $table) {
            $columns = [
                'customer_name', 'customer_phone', 'from_address', 'consignee_address',
                'taxable_amount', 'gst_total', 'cgst_amount', 'sgst_amount', 'igst_amount',
                'item_details', 'transport_mode', 'supply_type', 'sub_supply_type',
                'doc_type', 'doc_number', 'doc_date',
            ];
            foreach ($columns as $column) {
                if (Schema::hasColumn('eway_bills', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
}