<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('report_views')) {
            Schema::create('report_views', function (Blueprint $table) {
                $table->integer('id', true);
                $table->integer('admin_id')->nullable();
                $table->string('report_slug', 100);
                $table->integer('view_count')->default(0);
                $table->timestamp('last_viewed_at')->nullable();
                $table->timestamp('created_at')->useCurrent()->nullable();
                $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate()->nullable();

                $table->unique(['admin_id', 'report_slug']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('report_views');
    }
};
