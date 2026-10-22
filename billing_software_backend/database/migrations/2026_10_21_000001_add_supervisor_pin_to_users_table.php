<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\CompanySetting;
use App\Models\User;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'supervisor_pin')) {
                $table->string('supervisor_pin', 10)->nullable()->after('active_token');
            }
        });

        // Move existing supervisor PIN from company settings JSON to the company admin user row
        try {
            $companySettings = CompanySetting::whereNotNull('settings')->get();
            foreach ($companySettings as $cs) {
                $settings = $cs->settings;
                if (!is_array($settings) || empty($settings['cashier_security']) || !is_array($settings['cashier_security'])) {
                    continue;
                }

                $security = $settings['cashier_security'];
                $pin = trim((string) ($security['supervisor_admin_pin'] ?? ''));

                if ($pin !== '') {
                    $admin = User::where('company_id', $cs->company_id)
                        ->where('role', 'admin')
                        ->orderBy('id')
                        ->first();

                    if ($admin) {
                        $admin->update(['supervisor_pin' => $pin]);
                    }
                }

                unset($security['supervisor_admin_pin'], $security['supervisor_pin_set']);
                $settings['cashier_security'] = $security;
                $cs->update(['settings' => $settings]);
            }
        } catch (\Throwable $e) {
            // Table might not exist yet or connection issue — skip data migration
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'supervisor_pin')) {
                $table->dropColumn('supervisor_pin');
            }
        });
    }
};
