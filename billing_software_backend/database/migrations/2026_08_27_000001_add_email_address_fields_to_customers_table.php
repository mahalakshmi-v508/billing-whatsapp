<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('email', 150)->nullable()->after('phone');
            $table->string('state', 100)->nullable()->after('email');
            $table->text('shipping_address')->nullable()->after('address');
            $table->string('billing_address_line1', 255)->nullable()->after('shipping_address');
            $table->string('billing_address_line2', 255)->nullable()->after('billing_address_line1');
            $table->string('billing_city', 100)->nullable()->after('billing_address_line2');
            $table->string('billing_state', 100)->nullable()->after('billing_city');
            $table->string('billing_pincode', 10)->nullable()->after('billing_state');
            $table->string('billing_country', 50)->nullable()->after('billing_pincode');
            $table->string('shipping_address_line1', 255)->nullable()->after('billing_country');
            $table->string('shipping_address_line2', 255)->nullable()->after('shipping_address_line1');
            $table->string('shipping_city', 100)->nullable()->after('shipping_address_line2');
            $table->string('shipping_state', 100)->nullable()->after('shipping_city');
            $table->string('shipping_pincode', 10)->nullable()->after('shipping_state');
            $table->string('shipping_country', 50)->nullable()->after('shipping_pincode');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn([
                'email', 'state', 'shipping_address',
                'billing_address_line1', 'billing_address_line2', 'billing_city',
                'billing_state', 'billing_pincode', 'billing_country',
                'shipping_address_line1', 'shipping_address_line2', 'shipping_city',
                'shipping_state', 'shipping_pincode', 'shipping_country',
            ]);
        });
    }
};
