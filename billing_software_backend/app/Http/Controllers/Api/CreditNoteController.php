<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\CreditNote;
use App\Models\Product;
use App\Models\Customer;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

class CreditNoteController extends Controller
{
    private function ensureTableExists()
    {
        if (!Schema::hasTable('credit_notes')) {
            Schema::create('credit_notes', function (Blueprint $table) {
                $table->increments('id');
                $table->integer('admin_id')->default(0);
                $table->integer('company_id')->default(0);
                $table->integer('cashier_id')->default(0);
                $table->string('return_no', 100)->nullable();
                $table->string('invoice_no', 100)->nullable();
                $table->date('invoice_date')->nullable();
                $table->date('return_date')->nullable();
                $table->integer('customer_id')->nullable();
                $table->string('customer_name', 150)->nullable();
                $table->string('customer_phone', 50)->nullable();
                $table->longText('products')->nullable();
                $table->decimal('sub_total', 12, 2)->default(0);
                $table->decimal('tax_total', 12, 2)->default(0);
                $table->decimal('discount_total', 12, 2)->default(0);
                $table->decimal('round_off', 10, 2)->default(0);
                $table->decimal('total_amount', 12, 2)->default(0);
                $table->decimal('refund_amount', 12, 2)->default(0);
                $table->decimal('balance_amount', 12, 2)->default(0);
                $table->string('payment_type', 50)->default('cash');
                $table->string('state_of_supply', 100)->nullable();
                $table->text('description')->nullable();
                $table->string('status', 50)->default('closed');
                $table->tinyInteger('is_deleted')->default(0);
                $table->timestamps();
            });
        }
    }

    public function createCreditNote(Request $request)
    {
        $this->ensureTableExists();

        $admin_id        = intval($request->input('admin_id', 0));
        $company_id      = intval($request->input('company_id', 0));
        $cashier_id      = intval($request->input('cashier_id', 0));
        $return_no       = trim($request->input('return_no', ''));
        $invoice_no      = trim($request->input('invoice_no', ''));
        $invoice_date    = $request->input('invoice_date') ?: null;
        $return_date     = $request->input('return_date') ?: date('Y-m-d');
        $customer_id     = intval($request->input('customer_id', 0));
        $customer_name   = trim($request->input('customer_name', 'Cash Customer'));
        $customer_phone  = trim($request->input('customer_phone', ''));
        $products        = $request->input('products', []);
        $sub_total       = floatval($request->input('sub_total', 0));
        $tax_total       = floatval($request->input('tax_total', 0));
        $discount_total  = floatval($request->input('discount_total', 0));
        $round_off       = floatval($request->input('round_off', 0));
        $total_amount    = floatval($request->input('total_amount', 0));
        $refund_amount   = floatval($request->input('refund_amount', 0));
        $payment_type    = trim($request->input('payment_type', 'cash'));
        $state_of_supply = trim($request->input('state_of_supply', ''));
        $description     = trim($request->input('description', ''));

        if (empty($products)) {
            return response()->json(['status' => false, 'message' => 'Please add at least one item to return.'], 400);
        }

        if ($admin_id <= 0 && $company_id > 0) {
            $comp = DB::table('companies')->where('id', $company_id)->first();
            if ($comp && !empty($comp->admin_id)) {
                $admin_id = intval($comp->admin_id);
            }
        }

        // Auto-generate Return No if empty
        if (empty($return_no)) {
            $count = CreditNote::where('admin_id', $admin_id)->count();
            $return_no = strval($count + 1);
        }

        // Auto-resolve or create customer if needed
        if ($customer_id <= 0 && !empty($customer_name) && strtolower($customer_name) !== 'cash customer') {
            $cust = Customer::where('name', $customer_name)
                ->where('is_deleted', 0)
                ->when($admin_id > 0, fn($q) => $q->where('admin_id', $admin_id))
                ->first();
            if ($cust) {
                $customer_id = $cust->id;
            } else {
                $newCust = Customer::create([
                    'admin_id'        => $admin_id,
                    'name'            => $customer_name,
                    'phone'           => $customer_phone,
                    'type'            => 'retail',
                    'credit_enabled'  => 1,
                    'pending_amount'  => 0,
                    'status'          => 'active',
                    'is_deleted'      => 0,
                    'created_at'      => now(),
                ]);
                $customer_id = $newCust->id;
            }
        }

        $balance_amount = ($payment_type === 'credit') ? 0 : max(0.0, $total_amount - $refund_amount);

        DB::beginTransaction();
        try {
            // 1. Restore Inventory Stock for returned items
            foreach ($products as $item) {
                $pid = intval($item['product_id'] ?? 0);
                $qty = floatval($item['qty'] ?? 1);
                if ($pid > 0 && $qty > 0) {
                    Product::where('id', $pid)->increment('stock', $qty);
                }
            }

            // 2. If Credit Sale Return, adjust Customer's Pending Debt
            if ($payment_type === 'credit' && $customer_id > 0) {
                $cust = Customer::find($customer_id);
                if ($cust) {
                    $cust->pending_amount = max(0.0, floatval($cust->pending_amount) - $total_amount);
                    $cust->save();
                }
            }

            // 3. Create Credit Note Record
            $creditNote = CreditNote::create([
                'admin_id'        => $admin_id,
                'company_id'      => $company_id,
                'cashier_id'      => $cashier_id,
                'return_no'       => $return_no,
                'invoice_no'      => $invoice_no,
                'invoice_date'    => $invoice_date,
                'return_date'     => $return_date,
                'customer_id'     => $customer_id > 0 ? $customer_id : null,
                'customer_name'   => $customer_name,
                'customer_phone'  => $customer_phone,
                'products'        => $products,
                'sub_total'       => $sub_total,
                'tax_total'       => $tax_total,
                'discount_total'  => $discount_total,
                'round_off'       => $round_off,
                'total_amount'    => $total_amount,
                'refund_amount'   => $payment_type === 'cash' ? ($refund_amount ?: $total_amount) : 0,
                'balance_amount'  => $balance_amount,
                'payment_type'    => $payment_type,
                'state_of_supply' => $state_of_supply,
                'description'     => $description,
                'status'          => 'closed',
                'is_deleted'      => 0,
            ]);

            DB::commit();

            return response()->json([
                'status'      => true,
                'message'     => 'Sale return / Credit note created successfully.',
                'credit_note' => $creditNote,
                'return_no'   => $return_no,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status'  => false,
                'message' => 'Error creating credit note: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getCreditNotes(Request $request)
    {
        $this->ensureTableExists();

        $admin_id   = intval($request->input('admin_id') ?: $request->query('admin_id', 0));
        $company_id = intval($request->input('company_id') ?: $request->query('company_id', 0));

        $query = CreditNote::where('is_deleted', 0);

        if ($admin_id > 0) {
            $query->where('admin_id', $admin_id);
        }
        if ($company_id > 0) {
            $query->where('company_id', $company_id);
        }

        $list = $query->orderBy('id', 'desc')->get();

        return response()->json([
            'status' => true,
            'data'   => $list
        ]);
    }

    public function deleteCreditNote(Request $request)
    {
        $this->ensureTableExists();

        $id = intval($request->input('id', 0));
        $creditNote = CreditNote::find($id);

        if (!$creditNote) {
            return response()->json(['status' => false, 'message' => 'Credit note not found.'], 404);
        }

        DB::beginTransaction();
        try {
            // Rollback inventory stock deduction
            $products = is_array($creditNote->products) ? $creditNote->products : json_decode($creditNote->products, true);
            if (is_array($products)) {
                foreach ($products as $item) {
                    $pid = intval($item['product_id'] ?? 0);
                    $qty = floatval($item['qty'] ?? 1);
                    if ($pid > 0 && $qty > 0) {
                        Product::where('id', $pid)->decrement('stock', $qty);
                    }
                }
            }

            // If credit note adjusted customer debt, restore it
            if ($creditNote->payment_type === 'credit' && $creditNote->customer_id > 0) {
                $cust = Customer::find($creditNote->customer_id);
                if ($cust) {
                    $cust->pending_amount = floatval($cust->pending_amount) + floatval($creditNote->total_amount);
                    $cust->save();
                }
            }

            $creditNote->update(['is_deleted' => 1]);

            DB::commit();

            return response()->json([
                'status'  => true,
                'message' => 'Credit note deleted and inventory adjusted successfully.'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status'  => false,
                'message' => 'Error deleting credit note: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getCreditNoteById(Request $request)
    {
        $this->ensureTableExists();

        $id = intval($request->input('id') ?: $request->query('id', 0));
        $creditNote = CreditNote::find($id);

        if (!$creditNote) {
            return response()->json(['status' => false, 'message' => 'Credit note not found.'], 404);
        }

        return response()->json([
            'status' => true,
            'data'   => $creditNote
        ]);
    }

    public function updateCreditNote(Request $request)
    {
        $this->ensureTableExists();

        $id = intval($request->input('id', 0));
        $creditNote = CreditNote::find($id);

        if (!$creditNote) {
            return response()->json(['status' => false, 'message' => 'Credit note not found.'], 404);
        }

        $admin_id        = intval($request->input('admin_id', $creditNote->admin_id));
        $company_id      = intval($request->input('company_id', $creditNote->company_id));
        $invoice_no      = trim($request->input('invoice_no', ''));
        $invoice_date    = $request->input('invoice_date') ?: null;
        $return_date     = $request->input('return_date') ?: date('Y-m-d');
        $customer_id     = intval($request->input('customer_id', $creditNote->customer_id));
        $customer_name   = trim($request->input('customer_name', $creditNote->customer_name));
        $customer_phone  = trim($request->input('customer_phone', $creditNote->customer_phone));
        $products        = $request->input('products', []);
        $sub_total       = floatval($request->input('sub_total', 0));
        $tax_total       = floatval($request->input('tax_total', 0));
        $discount_total  = floatval($request->input('discount_total', 0));
        $round_off       = floatval($request->input('round_off', 0));
        $total_amount    = floatval($request->input('total_amount', 0));
        $refund_amount   = floatval($request->input('refund_amount', 0));
        $payment_type    = trim($request->input('payment_type', 'cash'));
        $state_of_supply = trim($request->input('state_of_supply', ''));
        $description     = trim($request->input('description', ''));

        if (empty($products)) {
            return response()->json(['status' => false, 'message' => 'Please add at least one item.'], 400);
        }

        DB::beginTransaction();
        try {
            // 1. Rollback old stock increment from original products
            $oldProducts = is_array($creditNote->products) ? $creditNote->products : json_decode($creditNote->products, true);
            if (is_array($oldProducts)) {
                foreach ($oldProducts as $oldItem) {
                    $pid = intval($oldItem['product_id'] ?? 0);
                    $qty = floatval($oldItem['qty'] ?? 0);
                    if ($pid > 0 && $qty > 0) {
                        Product::where('id', $pid)->decrement('stock', $qty);
                    }
                }
            }

            // 2. Revert old customer pending debt adjustment if it was credit
            if ($creditNote->payment_type === 'credit' && $creditNote->customer_id > 0) {
                $oldCust = Customer::find($creditNote->customer_id);
                if ($oldCust) {
                    $oldCust->pending_amount = floatval($oldCust->pending_amount) + floatval($creditNote->total_amount);
                    $oldCust->save();
                }
            }

            // 3. Apply new stock increment for updated products
            foreach ($products as $newItem) {
                $pid = intval($newItem['product_id'] ?? 0);
                $qty = floatval($newItem['qty'] ?? 0);
                if ($pid > 0 && $qty > 0) {
                    Product::where('id', $pid)->increment('stock', $qty);
                }
            }

            // 4. Apply new customer pending debt adjustment if it is credit
            if ($payment_type === 'credit' && $customer_id > 0) {
                $newCust = Customer::find($customer_id);
                if ($newCust) {
                    $newCust->pending_amount = max(0.0, floatval($newCust->pending_amount) - $total_amount);
                    $newCust->save();
                }
            }

            $balance_amount = max(0.0, $total_amount - $refund_amount);

            $creditNote->update([
                'invoice_no'      => $invoice_no,
                'invoice_date'    => $invoice_date,
                'return_date'     => $return_date,
                'customer_id'     => $customer_id > 0 ? $customer_id : null,
                'customer_name'   => $customer_name,
                'customer_phone'  => $customer_phone,
                'products'        => $products,
                'sub_total'       => $sub_total,
                'tax_total'       => $tax_total,
                'discount_total'  => $discount_total,
                'round_off'       => $round_off,
                'total_amount'    => $total_amount,
                'refund_amount'   => $refund_amount,
                'balance_amount'  => $balance_amount,
                'payment_type'    => $payment_type,
                'state_of_supply' => $state_of_supply,
                'description'     => $description,
            ]);

            DB::commit();

            return response()->json([
                'status'  => true,
                'message' => 'Credit note updated successfully.',
                'data'    => $creditNote,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status'  => false,
                'message' => 'Error updating credit note: ' . $e->getMessage()
            ], 500);
        }
    }
}

