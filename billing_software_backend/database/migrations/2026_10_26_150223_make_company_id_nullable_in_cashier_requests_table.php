<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('cashier_requests')) {
            try {
                DB::statement("ALTER TABLE cashier_requests MODIFY company_id INT NULL DEFAULT NULL");
                DB::statement("ALTER TABLE cashier_requests MODIFY cashier_name VARCHAR(100) NULL DEFAULT NULL");
                DB::statement("ALTER TABLE cashier_requests MODIFY cashier_email VARCHAR(100) NULL DEFAULT NULL");
                DB::statement("ALTER TABLE cashier_requests MODIFY cashier_password VARCHAR(255) NULL DEFAULT NULL");
            } catch (\Exception $e) {
                // ignore
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('cashier_requests')) {
            try {
                DB::statement("ALTER TABLE cashier_requests MODIFY company_id INT NOT NULL");
            } catch (\Exception $e) {
                // ignore
            }
        }
    }
};
