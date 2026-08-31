<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('account_number', 50)->nullable()->after('gst_no');
            $table->string('pan_number', 20)->nullable()->after('account_number');
            $table->date('date_of_birth')->nullable()->after('pan_number');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn(['account_number', 'pan_number', 'date_of_birth']);
        });
    }
};
