<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Global audit trail for every mutating action performed in the billing
     * software. Rows are written by App\Http\Middleware\LogAuditTrail, which
     * intercepts all POST/PUT/PATCH/DELETE API calls.
     */
    public function up(): void
    {
        if (Schema::hasTable('audit_logs')) {
            return;
        }

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->bigIncrements('id');

            // Tenant scope
            $table->unsignedBigInteger('company_id')->nullable()->index();

            // Who did it (denormalised so the trail survives user deletion)
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->string('user_name', 150)->nullable();
            $table->string('user_role', 50)->nullable();

            // What happened
            $table->string('module', 100)->index();      // e.g. "Customer", "Invoice"
            $table->string('action', 50)->index();       // create|update|delete|login|...
            $table->string('description', 500)->nullable();

            // Which record was touched
            $table->string('record_type', 100)->nullable();
            $table->string('record_label', 255)->nullable();
            $table->unsignedBigInteger('record_id')->nullable();

            // Before / after snapshots (JSON). $table->longText is used instead of
            // json() because MySQL < 5.7.8 cannot index json columns and SQLite
            // treats json() as plain text anyway.
            $table->longText('old_values')->nullable();
            $table->longText('new_values')->nullable();

            // Request context
            $table->string('http_method', 10)->nullable();
            $table->string('endpoint', 255)->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 500)->nullable();

            $table->timestamp('created_at')->useCurrent()->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};