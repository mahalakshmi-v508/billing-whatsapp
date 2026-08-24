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
        if (!Schema::hasTable('whatsapp_events')) {
            Schema::create('whatsapp_events', function (Blueprint $table) {
                $table->integer('id', true);
                $table->integer('connection_id')->nullable();
                $table->string('event', 100)->nullable();
                $table->json('payload')->nullable();
                $table->timestamp('created_at')->useCurrent();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('whatsapp_events');
    }
};
