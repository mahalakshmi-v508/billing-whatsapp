<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $cols = ['billing_address_line1', 'billing_address_line2', 'billing_city'];
        foreach ($cols as $col) {
            $exists = DB::select("SHOW COLUMNS FROM `customers` LIKE '{$col}'");
            if (!empty($exists)) {
                DB::statement("ALTER TABLE `customers` DROP COLUMN `{$col}`");
            }
        }
    }

    public function down(): void
    {
        Schema::table('customers', function ($table) {
            $table->string('billing_address_line1', 255)->nullable();
            $table->string('billing_address_line2', 255)->nullable();
            $table->string('billing_city', 100)->nullable();
        });
    }
};
