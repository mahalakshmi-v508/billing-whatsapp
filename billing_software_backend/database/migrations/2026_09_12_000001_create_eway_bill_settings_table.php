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
        if (!Schema::hasTable('eway_bill_settings')) {
            Schema::create('eway_bill_settings', function (Blueprint $table) {
                $table->integer('id', true);
                $table->integer('company_id');
                $table->string('api_provider', 100)->nullable();
                $table->string('environment', 100)->nullable();
                $table->string('gstin', 100)->nullable();
                $table->string('ewb_username', 150)->nullable();
                $table->text('ewb_password')->nullable();
                $table->string('gsp_client_id', 150)->nullable();
                $table->text('gsp_client_secret')->nullable();
                $table->tinyInteger('integration_enabled')->default(0);
                $table->timestamp('last_test_at')->nullable();
                $table->string('last_test_status', 30)->nullable();
                $table->string('last_test_message', 255)->nullable();
                $table->timestamp('created_at')->useCurrent();
                $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

                // One settings row per company
                $table->unique('company_id');
                $table->foreign('company_id')->references('id')->on('companies')->onDelete('cascade');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('eway_bill_settings');
    }
};