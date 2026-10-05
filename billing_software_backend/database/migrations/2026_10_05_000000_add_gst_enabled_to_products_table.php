<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('products')) {
            return;
        }

        $columnMissing = !Schema::hasColumn('products', 'gst_enabled');
        if ($columnMissing) {
            Schema::table('products', function (Blueprint $table) {
                $table->boolean('gst_enabled')->default(false)->after('gst_percentage');
            });

            DB::table('products')
                ->where('gst_percentage', '>', 0)
                ->update(['gst_enabled' => true]);
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('products') && Schema::hasColumn('products', 'gst_enabled')) {
            Schema::table('products', function (Blueprint $table) {
                $table->dropColumn('gst_enabled');
            });
        }
    }
};