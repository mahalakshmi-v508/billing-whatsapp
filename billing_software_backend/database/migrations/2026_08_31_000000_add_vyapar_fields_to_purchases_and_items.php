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
        if (Schema::hasTable('purchases')) {
            Schema::table('purchases', function (Blueprint $table) {
                if (!Schema::hasColumn('purchases', 'discount_total')) {
                    $table->decimal('discount_total', 10, 2)->default(0)->after('gst_total');
                }
                if (!Schema::hasColumn('purchases', 'round_off')) {
                    $table->decimal('round_off', 10, 2)->default(0)->after('discount_total');
                }
                if (!Schema::hasColumn('purchases', 'payment_type')) {
                    $table->string('payment_type', 50)->default('Cash')->after('balance_amount');
                }
                if (!Schema::hasColumn('purchases', 'state_of_supply')) {
                    $table->string('state_of_supply', 100)->nullable()->after('payment_type');
                }
                if (!Schema::hasColumn('purchases', 'terms_conditions')) {
                    $table->text('terms_conditions')->nullable()->after('state_of_supply');
                }
                if (!Schema::hasColumn('purchases', 'description')) {
                    $table->text('description')->nullable()->after('terms_conditions');
                }
                if (!Schema::hasColumn('purchases', 'bill_attachment')) {
                    $table->string('bill_attachment', 255)->nullable()->after('description');
                }
            });
        }

        if (Schema::hasTable('purchase_items')) {
            Schema::table('purchase_items', function (Blueprint $table) {
                if (!Schema::hasColumn('purchase_items', 'tax_mode')) {
                    $table->string('tax_mode', 20)->default('without_tax')->after('price');
                }
                if (!Schema::hasColumn('purchase_items', 'discount_percent')) {
                    $table->decimal('discount_percent', 5, 2)->default(0)->after('tax_mode');
                }
                if (!Schema::hasColumn('purchase_items', 'discount_amount')) {
                    $table->decimal('discount_amount', 10, 2)->default(0)->after('discount_percent');
                }
                if (!Schema::hasColumn('purchase_items', 'tax_amount')) {
                    $table->decimal('tax_amount', 10, 2)->default(0)->after('gst_percentage');
                }
                if (!Schema::hasColumn('purchase_items', 'total_amount')) {
                    $table->decimal('total_amount', 10, 2)->default(0)->after('tax_amount');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('purchases')) {
            Schema::table('purchases', function (Blueprint $table) {
                $columns = [
                    'discount_total', 'round_off', 'payment_type',
                    'state_of_supply', 'terms_conditions', 'description', 'bill_attachment'
                ];
                foreach ($columns as $column) {
                    if (Schema::hasColumn('purchases', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }

        if (Schema::hasTable('purchase_items')) {
            Schema::table('purchase_items', function (Blueprint $table) {
                $columns = ['tax_mode', 'discount_percent', 'discount_amount', 'tax_amount', 'total_amount'];
                foreach ($columns as $column) {
                    if (Schema::hasColumn('purchase_items', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }
    }
};
