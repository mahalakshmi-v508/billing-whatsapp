<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transaction_message_auto_sends', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->string('transaction_type', 40);
            $table->string('txn_no', 100);
            $table->text('message')->nullable();
            $table->text('destinations')->nullable();
            $table->boolean('pdf_attached')->default(false);
            $table->unsignedTinyInteger('pdf_attempts')->default(0);
            $table->timestamps();

            $table->unique(['company_id', 'transaction_type', 'txn_no'], 'tms_auto_unique');
            $table->foreign('company_id')->references('id')->on('companies')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transaction_message_auto_sends');
    }
};