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
        if (!Schema::hasTable('whatsapp_messages')) {
            Schema::create('whatsapp_messages', function (Blueprint $table) {
                $table->integer('id', true);
                $table->integer('connection_id')->nullable();
                $table->integer('company_id')->nullable();
                $table->string('whatsapp_message_id', 255)->nullable();
                $table->string('customer_phone', 30)->nullable();
                $table->string('chat_id', 100)->nullable();
                $table->enum('direction', ['incoming', 'outgoing'])->nullable();
                $table->string('message_type', 50)->default('text');
                $table->text('message')->nullable();
                $table->string('media_name', 255)->nullable();
                $table->string('status', 50)->default('pending');
                $table->timestamp('sent_at')->nullable();
                $table->timestamp('created_at')->useCurrent();
                $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('whatsapp_messages');
    }
};
