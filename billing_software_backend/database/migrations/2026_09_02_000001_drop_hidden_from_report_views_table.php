<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('report_views') && Schema::hasColumn('report_views', 'hidden')) {
            Schema::table('report_views', function (Blueprint $table) {
                $table->dropColumn('hidden');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('report_views') && !Schema::hasColumn('report_views', 'hidden')) {
            Schema::table('report_views', function (Blueprint $table) {
                $table->tinyInteger('hidden')->default(0);
            });
        }
    }
};