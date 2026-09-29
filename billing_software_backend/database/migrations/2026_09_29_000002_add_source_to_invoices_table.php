<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Distinguishes a bill raised from the POS counter (Billing screen) from a
     * regular sale invoice (Add Sale screen). Both write to the same `invoices`
     * table, so without this column the invoice list cannot tell them apart and
     * every row renders as "Sale".
     */
    public function up(): void
    {
        if (!Schema::hasTable('invoices')) {
            return;
        }

        if (Schema::hasColumn('invoices', 'source')) {
            return;
        }

        Schema::table('invoices', function (Blueprint $table) {
            $table->string('source', 20)->default('sale')->after('payment_type');
            $table->index('source');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('invoices') || !Schema::hasColumn('invoices', 'source')) {
            return;
        }

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropIndex(['source']);
            $table->dropColumn('source');
        });
    }
};
