<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add multi-template support to the transaction message settings table.
     *
     *  - selected_template : which variant is active for the row
     *      ( 'template_1' | 'template_2' | 'custom' ), default 'template_1'
     *  - template_2        : the predefined "Template 2" message (customisable)
     *  - custom_template   : the user's free-form custom message
     *
     * The existing `template` column remains the "Template 1" message, so
     * existing rows keep working unchanged.
     */
    public function up(): void
    {
        if (!Schema::hasTable('transaction_message_settings')) {
            return;
        }

        Schema::table('transaction_message_settings', function (Blueprint $table) {
            $table->string('selected_template', 20)->default('template_1')->after('template');
            $table->longText('template_2')->nullable()->after('selected_template');
            $table->longText('custom_template')->nullable()->after('template_2');
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
            $table->dropColumn(['selected_template', 'template_2', 'custom_template']);
        });
    }
};
