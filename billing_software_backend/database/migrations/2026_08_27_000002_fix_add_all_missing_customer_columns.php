<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $columns = [
            'address_line1'          => "ALTER TABLE `customers` ADD COLUMN `address_line1` VARCHAR(255) NULL AFTER `address`",
            'address_line2'          => "ALTER TABLE `customers` ADD COLUMN `address_line2` VARCHAR(255) NULL AFTER `address_line1`",
            'city'                   => "ALTER TABLE `customers` ADD COLUMN `city` VARCHAR(100) NULL AFTER `address_line2`",
            'billing_state'          => "ALTER TABLE `customers` ADD COLUMN `billing_state` VARCHAR(100) NULL AFTER `city`",
            'billing_country'        => "ALTER TABLE `customers` ADD COLUMN `billing_country` VARCHAR(50) NULL DEFAULT 'India' AFTER `billing_state`",
            'billing_pincode'        => "ALTER TABLE `customers` ADD COLUMN `billing_pincode` VARCHAR(10) NULL AFTER `billing_country`",
            'email'                  => "ALTER TABLE `customers` ADD COLUMN `email` VARCHAR(150) NULL AFTER `phone`",
            'state'                  => "ALTER TABLE `customers` ADD COLUMN `state` VARCHAR(100) NULL AFTER `email`",
            'shipping_address'       => "ALTER TABLE `customers` ADD COLUMN `shipping_address` TEXT NULL AFTER `address`",
            'shipping_address_line1' => "ALTER TABLE `customers` ADD COLUMN `shipping_address_line1` VARCHAR(255) NULL AFTER `shipping_address`",
            'shipping_address_line2' => "ALTER TABLE `customers` ADD COLUMN `shipping_address_line2` VARCHAR(255) NULL AFTER `shipping_address_line1`",
            'shipping_city'          => "ALTER TABLE `customers` ADD COLUMN `shipping_city` VARCHAR(100) NULL AFTER `shipping_address_line2`",
            'shipping_state'         => "ALTER TABLE `customers` ADD COLUMN `shipping_state` VARCHAR(100) NULL AFTER `shipping_city`",
            'shipping_country'       => "ALTER TABLE `customers` ADD COLUMN `shipping_country` VARCHAR(50) NULL DEFAULT 'India' AFTER `shipping_state`",
            'shipping_pincode'       => "ALTER TABLE `customers` ADD COLUMN `shipping_pincode` VARCHAR(10) NULL AFTER `shipping_country`",
            'account_number'         => "ALTER TABLE `customers` ADD COLUMN `account_number` VARCHAR(50) NULL AFTER `gst_no`",
            'pan_number'             => "ALTER TABLE `customers` ADD COLUMN `pan_number` VARCHAR(20) NULL AFTER `account_number`",
            'date_of_birth'          => "ALTER TABLE `customers` ADD COLUMN `date_of_birth` DATE NULL AFTER `pan_number`",
        ];

        foreach ($columns as $colName => $sql) {
            $exists = DB::select("SHOW COLUMNS FROM `customers` LIKE '{$colName}'");
            if (empty($exists)) {
                DB::statement($sql);
            }
        }
    }

    public function down(): void
    {
        $cols = [
            'address_line1', 'address_line2', 'city', 'billing_state', 'billing_country', 'billing_pincode',
            'email', 'state', 'shipping_address',
            'shipping_address_line1', 'shipping_address_line2', 'shipping_city',
            'shipping_state', 'shipping_country', 'shipping_pincode',
            'account_number', 'pan_number', 'date_of_birth',
        ];
        Schema::table('customers', function ($table) {
            $table->dropColumn($cols);
        });
    }
};
