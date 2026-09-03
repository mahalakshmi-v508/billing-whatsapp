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
        Schema::table('whatsapp_messages', function (Blueprint $table) {
            if (!Schema::hasColumn('whatsapp_messages', 'is_edited')) {
                $table->boolean('is_edited')->default(false)->after('reply_to_message_id');
            }
            if (!Schema::hasColumn('whatsapp_messages', 'is_deleted')) {
                $table->boolean('is_deleted')->default(false)->nullable()->after('is_edited');
                $table->index('is_deleted');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('whatsapp_messages', function (Blueprint $table) {
            if (Schema::hasColumn('whatsapp_messages', 'is_deleted')) {
                $table->dropColumn('is_deleted');
            }
            if (Schema::hasColumn('whatsapp_messages', 'is_edited')) {
                $table->dropColumn('is_edited');
            }
        });
    }
};
