<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add the configurable Credit Days period used by the Credit Due reminder
     * auto-send (stored per transaction_message_settings row for 'credit_due').
     */
    public function up(): void
    {
        if (!Schema::hasTable('transaction_message_settings')) {
            return;
        }

        if (!Schema::hasColumn('transaction_message_settings', 'credit_days')) {
            Schema::table('transaction_message_settings', function (Blueprint $table) {
                $table->unsignedInteger('credit_days')
                    ->nullable()
                    ->after('royalty_points_threshold');
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('transaction_message_settings')) {
            return;
        }

        if (Schema::hasColumn('transaction_message_settings', 'credit_days')) {
            Schema::table('transaction_message_settings', function (Blueprint $table) {
                $table->dropColumn('credit_days');
            });
        }
    }
};