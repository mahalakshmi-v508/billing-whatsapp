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
            if (!Schema::hasColumn('whatsapp_messages', 'reply_to_message_id')) {
                $table->unsignedBigInteger('reply_to_message_id')->nullable()->after('media_name');
                $table->index('reply_to_message_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('whatsapp_messages', function (Blueprint $table) {
            if (Schema::hasIndex('whatsapp_messages', 'whatsapp_messages_reply_to_message_id_index')) {
                $table->dropIndex('whatsapp_messages_reply_to_message_id_index');
            }
            if (Schema::hasColumn('whatsapp_messages', 'reply_to_message_id')) {
                $table->dropColumn('reply_to_message_id');
            }
        });
    }
};