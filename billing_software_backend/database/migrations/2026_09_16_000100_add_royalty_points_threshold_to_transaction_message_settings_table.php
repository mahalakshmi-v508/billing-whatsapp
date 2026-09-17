<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add the per-company Royalty Points threshold used by the Royalty Points
     * auto-send message. It is stored on the same `royalty_points` setting row
     * in transaction_message_settings so no duplicate table is created.
     */
    public function up(): void
    {
        if (!Schema::hasTable('transaction_message_settings')) {
            return;
        }

        Schema::table('transaction_message_settings', function (Blueprint $table) {
            $table->unsignedInteger('royalty_points_threshold')->nullable()->after('custom_template');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('transaction_message_settings')) {
            return;
        }

        Schema::table('transaction_message_settings', function (Blueprint $table) {
            $table->dropColumn('royalty_points_threshold');
        });
    }
};