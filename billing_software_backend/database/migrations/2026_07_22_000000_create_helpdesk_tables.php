<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. TICKET CATEGORIES
        if (!Schema::hasTable('ticket_categories')) {
            Schema::create('ticket_categories', function (Blueprint $table) {
                $table->integer('id', true);
                $table->string('name', 150);
                $table->text('description')->nullable();
                $table->string('color', 20)->default('#4f46e5');
                $table->enum('status', ['active', 'inactive'])->default('active');
                $table->timestamp('created_at')->useCurrent();
                $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
            });

            // Seed default categories
            DB::table('ticket_categories')->insert([
                ['name' => 'Billing & Invoicing', 'description' => 'Issues related to invoices, payments, tax calculations, or receipt printing', 'color' => '#3b82f6', 'status' => 'active'],
                ['name' => 'Technical Support', 'description' => 'Software bugs, crashes, slow performance, or system errors', 'color' => '#ef4444', 'status' => 'active'],
                ['name' => 'Product Catalog & Inventory', 'description' => 'Adding products, stock discrepancies, barcode scanning, or categories', 'color' => '#10b981', 'status' => 'active'],
                ['name' => 'Account & Access', 'description' => 'Login, passwords, user roles, branch access, or company profile', 'color' => '#8b5cf6', 'status' => 'active'],
                ['name' => 'Feature Request', 'description' => 'Suggestions or requests for new functionality in the billing software', 'color' => '#f59e0b', 'status' => 'active'],
                ['name' => 'General Inquiry', 'description' => 'Other support requests and general questions', 'color' => '#6b7280', 'status' => 'active'],
            ]);
        }

        // 2. TICKETS
        if (!Schema::hasTable('tickets')) {
            Schema::create('tickets', function (Blueprint $table) {
                $table->integer('id', true);
                $table->string('ticket_no', 50)->unique();
                $table->integer('user_id'); // Creator
                $table->integer('company_id')->nullable();
                $table->integer('category_id')->nullable();
                $table->string('subject', 255);
                $table->longText('description')->nullable();
                $table->enum('priority', ['low', 'medium', 'high', 'critical'])->default('medium');
                $table->enum('status', ['open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed'])->default('open');
                $table->integer('assigned_to')->nullable(); // User ID
                $table->timestamp('assigned_at')->nullable();
                $table->timestamp('closed_at')->nullable();
                $table->timestamp('reopened_at')->nullable();
                $table->timestamp('created_at')->useCurrent();
                $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

                $table->foreign('category_id')->references('id')->on('ticket_categories')->onDelete('set null');
            });
        }

        // 3. TICKET ATTACHMENTS
        if (!Schema::hasTable('ticket_attachments')) {
            Schema::create('ticket_attachments', function (Blueprint $table) {
                $table->integer('id', true);
                $table->integer('ticket_id');
                $table->integer('user_id');
                $table->string('filename', 255);
                $table->string('original_name', 255);
                $table->string('file_path', 500);
                $table->string('file_type', 100)->nullable();
                $table->bigInteger('file_size')->default(0);
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('ticket_id')->references('id')->on('tickets')->onDelete('cascade');
            });
        }

        // 4. TICKET COMMENTS & INTERNAL NOTES
        if (!Schema::hasTable('ticket_comments')) {
            Schema::create('ticket_comments', function (Blueprint $table) {
                $table->integer('id', true);
                $table->integer('ticket_id');
                $table->integer('user_id');
                $table->longText('comment');
                $table->boolean('is_internal')->default(false); // True for internal support notes
                $table->timestamp('created_at')->useCurrent();
                $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

                $table->foreign('ticket_id')->references('id')->on('tickets')->onDelete('cascade');
            });
        }

        // 5. TICKET COMMENT ATTACHMENTS
        if (!Schema::hasTable('ticket_comment_attachments')) {
            Schema::create('ticket_comment_attachments', function (Blueprint $table) {
                $table->integer('id', true);
                $table->integer('comment_id');
                $table->integer('user_id');
                $table->string('filename', 255);
                $table->string('original_name', 255);
                $table->string('file_path', 500);
                $table->string('file_type', 100)->nullable();
                $table->bigInteger('file_size')->default(0);
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('comment_id')->references('id')->on('ticket_comments')->onDelete('cascade');
            });
        }

        // 6. TICKET LOGS (AUDIT LOG HISTORY)
        if (!Schema::hasTable('ticket_logs')) {
            Schema::create('ticket_logs', function (Blueprint $table) {
                $table->integer('id', true);
                $table->integer('ticket_id');
                $table->integer('user_id')->nullable();
                $table->string('user_name', 150)->nullable();
                $table->string('user_role', 50)->nullable();
                $table->string('action', 100);
                $table->text('old_value')->nullable();
                $table->text('new_value')->nullable();
                $table->string('ip_address', 45)->nullable();
                $table->text('user_agent')->nullable();
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('ticket_id')->references('id')->on('tickets')->onDelete('cascade');
            });
        }

        // 7. TICKET NOTIFICATIONS
        if (!Schema::hasTable('ticket_notifications')) {
            Schema::create('ticket_notifications', function (Blueprint $table) {
                $table->integer('id', true);
                $table->integer('ticket_id');
                $table->integer('user_id');
                $table->string('title', 255);
                $table->text('message');
                $table->string('type', 50)->default('ticket_update');
                $table->boolean('is_read')->default(false);
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('ticket_id')->references('id')->on('tickets')->onDelete('cascade');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ticket_notifications');
        Schema::dropIfExists('ticket_logs');
        Schema::dropIfExists('ticket_comment_attachments');
        Schema::dropIfExists('ticket_comments');
        Schema::dropIfExists('ticket_attachments');
        Schema::dropIfExists('tickets');
        Schema::dropIfExists('ticket_categories');
    }
};
