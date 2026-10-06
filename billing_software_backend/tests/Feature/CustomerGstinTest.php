<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\CustomerController;
use App\Support\Gstin;
use Illuminate\Database\QueryException;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Tests\TestCase;

class CustomerGstinTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('customers');
        Schema::create('customers', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('admin_id')->nullable();
            $table->tinyInteger('is_deleted')->default(0);
            $table->string('name')->nullable();
            $table->string('phone')->nullable();
            $table->text('address')->nullable();
            $table->string('type')->nullable();
            $table->string('gst_no', 20)->nullable();
        });
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('customers');

        parent::tearDown();
    }

    public function test_gstin_values_are_normalized_validated_and_unique_to_one_customer(): void
    {
        $this->assertSame('33ABCDE1234F1Z5', Gstin::normalize(' 33abcde1234f1z5 '));
        $this->assertTrue(Gstin::isValid('33ABCDE1234F1Z5'));
        $this->assertFalse(Gstin::isValid('33ABCDE1234F1Z'));

        $firstCustomer = DB::table('customers')->insertGetId(['gst_no' => '33ABCDE1234F1Z5']);

        $this->assertFalse(Gstin::belongsToAnotherCustomer('33ABCDE1234F1Z5', $firstCustomer));
        $this->assertTrue(Gstin::belongsToAnotherCustomer('33ABCDE1234F1Z5', $firstCustomer + 1));
    }

    public function test_customer_save_allows_its_existing_gstin_and_rejects_another_customers_gstin(): void
    {
        $firstCustomer = DB::table('customers')->insertGetId([
            'admin_id' => 1,
            'gst_no' => '33ABCDE1234F1Z5',
        ]);
        $secondCustomer = DB::table('customers')->insertGetId([
            'admin_id' => 1,
            'gst_no' => null,
        ]);
        $controller = app(CustomerController::class);

        $sameCustomerResponse = $controller->customerSave(Request::create('/customer/customer_save', 'POST', [
            'admin_id' => 1,
            'customer_id' => $firstCustomer,
            'gst_no' => ' 33abcde1234f1z5 ',
        ]));

        $this->assertSame(200, $sameCustomerResponse->getStatusCode());
        $this->assertTrue($sameCustomerResponse->getData()->status);

        $duplicateResponse = $controller->customerSave(Request::create('/customer/customer_save', 'POST', [
            'admin_id' => 1,
            'customer_id' => $secondCustomer,
            'gst_no' => '33ABCDE1234F1Z5',
        ]));

        $this->assertSame(422, $duplicateResponse->getStatusCode());
        $this->assertSame(
            'This GSTIN is already registered with another customer.',
            $duplicateResponse->getData()->message
        );
        $this->assertNull(DB::table('customers')->where('id', $secondCustomer)->value('gst_no'));
    }

    public function test_unique_index_migration_normalizes_values_and_allows_empty_gstins(): void
    {
        DB::table('customers')->insert([
            ['gst_no' => ' 33abcde1234f1z5 '],
            ['gst_no' => ''],
        ]);

        $migration = require database_path('migrations/2026_10_06_000000_add_unique_index_to_customer_gst_no.php');
        $migration->up();

        $this->assertSame('33ABCDE1234F1Z5', DB::table('customers')->where('id', 1)->value('gst_no'));
        $this->assertNull(DB::table('customers')->where('id', 2)->value('gst_no'));

        $this->expectException(QueryException::class);
        DB::table('customers')->insert(['gst_no' => '33ABCDE1234F1Z5']);
    }

    public function test_unique_index_migration_refuses_existing_normalized_duplicates_without_modifying_data(): void
    {
        DB::table('customers')->insert([
            ['gst_no' => '33ABCDE1234F1Z5'],
            ['gst_no' => ' 33abcde1234f1z5 '],
        ]);

        $migration = require database_path('migrations/2026_10_06_000000_add_unique_index_to_customer_gst_no.php');

        try {
            $migration->up();
            $this->fail('Migration should refuse duplicate GSTIN records.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('customer IDs 1 and 2', $exception->getMessage());
        }

        $this->assertSame(' 33abcde1234f1z5 ', DB::table('customers')->where('id', 2)->value('gst_no'));
        $hasGstinUniqueIndex = collect(Schema::getIndexes('customers'))->contains(
            fn (array $index) => ($index['columns'] ?? []) === ['gst_no'] && ($index['unique'] ?? false)
        );
        $this->assertFalse($hasGstinUniqueIndex);
    }
}
