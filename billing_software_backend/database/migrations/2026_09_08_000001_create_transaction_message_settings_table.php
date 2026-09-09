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
        if (!Schema::hasTable('transaction_message_settings')) {
            Schema::create('transaction_message_settings', function (Blueprint $table) {
                $table->increments('id');
                $table->integer('company_id')->index();
                $table->string('transaction_type', 50);
                $table->string('send_via', 30)->default('personal_whatsapp');
                $table->boolean('auto_send')->default(false);
                $table->boolean('send_to_party')->default(true);
                $table->boolean('send_transaction_update')->default(false);
                $table->boolean('send_copy_to_self')->default(false);
                $table->boolean('auto_share_vyapar')->default(false);
                $table->boolean('party_balance_in_msg')->default(false);
                $table->boolean('web_invoice_link_in_msg')->default(true);
                $table->boolean('payment_link_in_msg')->default(false);
                $table->longText('template')->nullable();
                $table->timestamps();
                $table->unique(['company_id', 'transaction_type']);

                $table->foreign('company_id')->references('id')->on('companies')->onDelete('cascade');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transaction_message_settings');
    }
};