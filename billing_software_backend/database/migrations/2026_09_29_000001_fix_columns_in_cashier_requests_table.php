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
            Schema::table('cashier_requests', function (Blueprint $table) {
                if (!Schema::hasColumn('cashier_requests', 'requested_by')) {
                    $table->integer('requested_by')->nullable()->after('company_id');
                }
                if (!Schema::hasColumn('cashier_requests', 'admin_id')) {
                    $table->integer('admin_id')->nullable()->after('company_id');
                }
                if (!Schema::hasColumn('cashier_requests', 'name')) {
                    $table->string('name', 100)->nullable()->after('company_id');
                }
                if (!Schema::hasColumn('cashier_requests', 'email')) {
                    $table->string('email', 100)->nullable()->after('name');
                }
                if (!Schema::hasColumn('cashier_requests', 'password')) {
                    $table->string('password', 255)->nullable()->after('email');
                }
            });

            // Sync data if cashier_name/cashier_email/admin_id exists
            if (Schema::hasColumn('cashier_requests', 'admin_id') && Schema::hasColumn('cashier_requests', 'requested_by')) {
                DB::statement("UPDATE cashier_requests SET requested_by = admin_id WHERE requested_by IS NULL AND admin_id IS NOT NULL");
                DB::statement("UPDATE cashier_requests SET admin_id = requested_by WHERE admin_id IS NULL AND requested_by IS NOT NULL");
            }
            if (Schema::hasColumn('cashier_requests', 'cashier_name') && Schema::hasColumn('cashier_requests', 'name')) {
                DB::statement("UPDATE cashier_requests SET name = cashier_name WHERE name IS NULL AND cashier_name IS NOT NULL");
            }
            if (Schema::hasColumn('cashier_requests', 'cashier_email') && Schema::hasColumn('cashier_requests', 'email')) {
                DB::statement("UPDATE cashier_requests SET email = cashier_email WHERE email IS NULL AND cashier_email IS NOT NULL");
            }
            if (Schema::hasColumn('cashier_requests', 'cashier_password') && Schema::hasColumn('cashier_requests', 'password')) {
                DB::statement("UPDATE cashier_requests SET password = cashier_password WHERE password IS NULL AND cashier_password IS NOT NULL");
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No down destructive rollback needed
    }
};
