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
        if (!Schema::hasColumn('credit_settings', 'default_credit_days')) {
            Schema::table('credit_settings', function (Blueprint $table) {
                $table->integer('default_credit_days')->nullable()->default(30);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('credit_settings', 'default_credit_days')) {
            Schema::table('credit_settings', function (Blueprint $table) {
                $table->dropColumn('default_credit_days');
            });
        }
    }
};