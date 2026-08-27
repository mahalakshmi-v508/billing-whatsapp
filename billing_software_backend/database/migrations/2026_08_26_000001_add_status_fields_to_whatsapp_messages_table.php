<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('whatsapp_messages', function (Blueprint $table) {
            if (!Schema::hasColumn('whatsapp_messages', 'delivered_at')) {
                $table->timestamp('delivered_at')->nullable()->after('status');
            }
            if (!Schema::hasColumn('whatsapp_messages', 'read_at')) {
                $table->timestamp('read_at')->nullable()->after('delivered_at');
            }
            if (!Schema::hasIndex('whatsapp_messages', 'whatsapp_messages_whatsapp_message_id_index')) {
                $table->index('whatsapp_message_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('whatsapp_messages', function (Blueprint $table) {
            $table->dropIndex(['whatsapp_message_id']);
            $table->dropColumn(['delivered_at', 'read_at']);
        });
    }
};
