<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const INDEX_NAME = 'customers_gst_no_unique';

    public function up(): void
    {
        if (! Schema::hasTable('customers') || ! Schema::hasColumn('customers', 'gst_no')) {
            return;
        }

        $seen = [];
        $values = [];
        foreach (DB::table('customers')->whereNotNull('gst_no')->get(['id', 'gst_no']) as $customer) {
            $gstin = strtoupper(trim((string) $customer->gst_no));
            if ($gstin === '') {
                $values[] = [$customer->id, null];

                continue;
            }

            if (isset($seen[$gstin])) {
                throw new RuntimeException(sprintf(
                    'Cannot add the unique customer GSTIN index: GSTIN %s is assigned to customer IDs %s and %s. Resolve the duplicate records, then rerun migrations.',
                    $gstin,
                    $seen[$gstin],
                    $customer->id
                ));
            }

            $seen[$gstin] = $customer->id;
            $values[] = [$customer->id, $gstin];
        }

        foreach ($values as [$customerId, $gstin]) {
            DB::table('customers')->where('id', $customerId)->update(['gst_no' => $gstin]);
        }

        $indexes = Schema::getIndexes('customers');
        $hasUniqueGstin = collect($indexes)->contains(
            fn (array $index) => ($index['columns'] ?? []) === ['gst_no'] && ($index['unique'] ?? false)
        );

        if (! $hasUniqueGstin) {
            Schema::table('customers', function (Blueprint $table) {
                $table->unique('gst_no', self::INDEX_NAME);
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('customers')) {
            return;
        }

        $hasIndex = collect(Schema::getIndexes('customers'))->contains(
            fn (array $index) => ($index['name'] ?? '') === self::INDEX_NAME
        );

        if ($hasIndex) {
            Schema::table('customers', function (Blueprint $table) {
                $table->dropUnique(self::INDEX_NAME);
            });
        }
    }
};
