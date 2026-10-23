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
        if (Schema::hasTable('products') && !Schema::hasColumn('products', 'custom_fields')) {
            Schema::table('products', function (Blueprint $table) {
                $table->json('custom_fields')->nullable()->after('supplier_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('products') && Schema::hasColumn('products', 'custom_fields')) {
            Schema::table('products', function (Blueprint $table) {
                $table->dropColumn('custom_fields');
            });
        }
    }
};
