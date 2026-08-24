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
        if (!Schema::hasTable('whatsapp_connections')) {
            Schema::create('whatsapp_connections', function (Blueprint $table) {
                $table->integer('id', true);
                $table->integer('company_id')->nullable();
                $table->integer('user_id')->nullable();
                $table->string('session_id', 100)->nullable()->unique();
                $table->string('phone_number', 30)->nullable();
                $table->string('display_name', 255)->nullable();
                $table->enum('status', ['disconnected', 'initializing', 'qr_ready', 'authenticated', 'ready', 'auth_failure', 'reconnecting'])->default('disconnected');
                $table->timestamp('last_qr_at')->nullable();
                $table->timestamp('connected_at')->nullable();
                $table->timestamp('disconnected_at')->nullable();
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
        Schema::dropIfExists('whatsapp_connections');
    }
};
