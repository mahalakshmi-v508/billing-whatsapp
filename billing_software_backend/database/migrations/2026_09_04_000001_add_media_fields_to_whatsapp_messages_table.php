<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('whatsapp_messages', function (Blueprint $table) {
            if (!Schema::hasColumn('whatsapp_messages', 'mime_type')) {
                $table->string('mime_type', 120)->nullable()->after('media_name');
            }
            if (!Schema::hasColumn('whatsapp_messages', 'media_url')) {
                $table->string('media_url', 500)->nullable()->after('mime_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('whatsapp_messages', function (Blueprint $table) {
            $table->dropColumn(['mime_type', 'media_url']);
        });
    }
};
