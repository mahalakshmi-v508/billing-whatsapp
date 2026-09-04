<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\DebitNote;
use App\Models\Product;
use App\Models\Supplier;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

class DebitNoteController extends Controller
{
    private function ensureTableExists()
    {
        if (!Schema::hasTable('debit_notes')) {
            Schema::create('debit_notes', function (Blueprint $table) {
                $table->increments('id');
                $table->integer('admin_id')->default(0);
                $table->integer('company_id')->default(0);
                $table->integer('cashier_id')->default(0);
                $table->string('return_no', 100)->nullable();
                $table->string('bill_no', 100)->nullable();
                $table->date('bill_date')->nullable();
                $table->date('return_date')->nullable();
                $table->integer('supplier_id')->nullable();
                $table->string('supplier_name', 150)->nullable();
                $table->string('supplier_phone', 50)->nullable();
                $table->longText('products')->nullable();
                $table->decimal('sub_total', 12, 2)->default(0);
                $table->decimal('tax_total', 12, 2)->default(0);
                $table->decimal('discount_total', 12, 2)->default(0);
                $table->decimal('round_off', 10, 2)->default(0);
                $table->decimal('total_amount', 12, 2)->default(0);
                $table->decimal('refund_amount', 12, 2)->default(0);
                $table->decimal('balance_amount', 12, 2)->default(0);
                $table->string('payment_type', 50)->default('Cash');
                $table->string('state_of_supply', 100)->nullable();
                $table->text('description')->nullable();
                $table->string('status', 50)->default('closed');
                $table->tinyInteger('is_deleted')->default(0);
                $table->timestamps();
            });
        }
    }

    public function createDebitNote(Request $request)
    {
        $this->ensureTableExists();

        $admin_id        = intval($request->input('admin_id', 0));
        $company_id      = intval($request->input('company_id', 0));
        $cashier_id      = intval($request->input('cashier_id', 0));
        $return_no       = trim($request->input('return_no', ''));
        $bill_no         = trim($request->input('bill_no', ''));
        $bill_date       = $request->input('bill_date') ?: null;
        $return_date     = $request->input('return_date') ?: date('Y-m-d');
        $supplier_id     = intval($request->input('supplier_id', 0));
        $supplier_name   = trim($request->input('supplier_name', ''));
        $supplier_phone  = trim($request->input('supplier_phone', ''));
        $products        = $request->input('products', []);
        $sub_total       = floatval($request->input('sub_total', 0));
        $tax_total       = floatval($request->input('tax_total', 0));
        $discount_total  = floatval($request->input('discount_total', 0));
        $round_off       = floatval($request->input('round_off', 0));
        $total_amount    = floatval($request->input('total_amount', 0));
        $refund_amount   = floatval($request->input('refund_amount', 0));
        $payment_type    = trim($request->input('payment_type', 'Cash'));
        $state_of_supply = trim($request->input('state_of_supply', 'Tamil Nadu'));
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
            $count = DebitNote::where('admin_id', $admin_id)->count();
            $return_no = strval($count + 1);
        }

        // Auto-resolve or create supplier if needed
        if ($supplier_id <= 0 && !empty($supplier_name)) {
            $sup = Supplier::where('supplier_name', $supplier_name)
                ->when($admin_id > 0, fn($q) => $q->where('admin_id', $admin_id))
                ->first();
            if ($sup) {
                $supplier_id = $sup->id;
            } else {
                $newSup = Supplier::create([
                    'admin_id'      => $admin_id,
                    'company_id'    => $company_id,
                    'supplier_name' => $supplier_name,
                    'phone'         => $supplier_phone,
                    'status'        => 'active',
                    'created_at'    => now(),
                ]);
                $supplier_id = $newSup->id;
            }
        }

        $balance_amount = (strtolower($payment_type) === 'credit') ? 0 : max(0.0, $total_amount - $refund_amount);

        DB::beginTransaction();
        try {
            // 1. Reduce Stock for returned items
            foreach ($products as $item) {
                $pid = intval($item['product_id'] ?? 0);
                $qty = floatval($item['qty'] ?? 1);
                if ($pid > 0 && $qty > 0) {
                    $prod = Product::find($pid);
                    if ($prod) {
                        $prod->stock = max(0, floatval($prod->stock) - $qty);
                        $prod->save();
                    }
                }
            }

            // 2. Create Debit Note Record
            $debitNote = DebitNote::create([
                'admin_id'        => $admin_id,
                'company_id'      => $company_id,
                'cashier_id'      => $cashier_id,
                'return_no'       => $return_no,
                'bill_no'         => $bill_no,
                'bill_date'       => $bill_date,
                'return_date'     => $return_date,
                'supplier_id'     => $supplier_id > 0 ? $supplier_id : null,
                'supplier_name'   => $supplier_name,
                'supplier_phone'  => $supplier_phone,
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
                'status'          => 'closed',
                'is_deleted'      => 0,
            ]);

            DB::commit();

            return response()->json([
                'status'     => true,
                'message'    => 'Debit Note created successfully.',
                'debit_note' => $debitNote,
                'id'         => $debitNote->id,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status'  => false,
                'message' => 'Failed to create Debit Note: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getDebitNotes(Request $request)
    {
        $this->ensureTableExists();

        $admin_id    = intval($request->input('admin_id', 0));
        $company_id  = intval($request->input('company_id', 0));
        $supplier_id = intval($request->input('supplier_id', 0));
        $from_date   = $request->input('from_date');
        $to_date     = $request->input('to_date');
        $search      = trim($request->input('search', ''));

        $query = DebitNote::where('is_deleted', 0);

        if ($company_id > 0) {
            $query->where('company_id', $company_id);
        } elseif ($admin_id > 0) {
            $query->where('admin_id', $admin_id);
        }

        if ($supplier_id > 0) {
            $query->where('supplier_id', $supplier_id);
        }

        if (!empty($from_date) && !empty($to_date)) {
            $query->whereBetween('return_date', [$from_date, $to_date]);
        }

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('return_no', 'like', "%{$search}%")
                  ->orWhere('bill_no', 'like', "%{$search}%")
                  ->orWhere('supplier_name', 'like', "%{$search}%")
                  ->orWhere('supplier_phone', 'like', "%{$search}%");
            });
        }

        $list = $query->orderBy('id', 'desc')->get();

        return response()->json([
            'status' => true,
            'data'   => $list,
            'count'  => $list->count(),
            'totals' => [
                'total_amount'   => floatval($list->sum('total_amount')),
                'refund_amount'  => floatval($list->sum('refund_amount')),
                'balance_amount' => floatval($list->sum('balance_amount')),
            ]
        ]);
    }

    public function getDebitNoteById(Request $request)
    {
        $this->ensureTableExists();

        $id = intval($request->input('id', 0));
        $debitNote = DebitNote::find($id);

        if (!$debitNote || $debitNote->is_deleted) {
            return response()->json(['status' => false, 'message' => 'Debit Note not found.'], 404);
        }

        return response()->json([
            'status' => true,
            'data'   => $debitNote
        ]);
    }

    public function updateDebitNote(Request $request)
    {
        $this->ensureTableExists();

        $id = intval($request->input('id', 0));
        $debitNote = DebitNote::find($id);

        if (!$debitNote || $debitNote->is_deleted) {
            return response()->json(['status' => false, 'message' => 'Debit Note not found.'], 404);
        }

        $admin_id        = intval($request->input('admin_id', $debitNote->admin_id));
        $company_id      = intval($request->input('company_id', $debitNote->company_id));
        $return_no       = trim($request->input('return_no', $debitNote->return_no));
        $bill_no         = trim($request->input('bill_no', $debitNote->bill_no));
        $bill_date       = $request->input('bill_date') ?: $debitNote->bill_date;
        $return_date     = $request->input('return_date') ?: $debitNote->return_date;
        $supplier_id     = intval($request->input('supplier_id', $debitNote->supplier_id));
        $supplier_name   = trim($request->input('supplier_name', $debitNote->supplier_name));
        $supplier_phone  = trim($request->input('supplier_phone', $debitNote->supplier_phone));
        $products        = $request->input('products', []);
        $sub_total       = floatval($request->input('sub_total', 0));
        $tax_total       = floatval($request->input('tax_total', 0));
        $discount_total  = floatval($request->input('discount_total', 0));
        $round_off       = floatval($request->input('round_off', 0));
        $total_amount    = floatval($request->input('total_amount', 0));
        $refund_amount   = floatval($request->input('refund_amount', 0));
        $payment_type    = trim($request->input('payment_type', 'Cash'));
        $state_of_supply = trim($request->input('state_of_supply', 'Tamil Nadu'));
        $description     = trim($request->input('description', ''));

        if (empty($products)) {
            return response()->json(['status' => false, 'message' => 'Please add at least one item.'], 400);
        }

        $balance_amount = (strtolower($payment_type) === 'credit') ? 0 : max(0.0, $total_amount - $refund_amount);

        DB::beginTransaction();
        try {
            // 1. Revert Old Product Stock (increment back)
            $oldProducts = is_array($debitNote->products) ? $debitNote->products : json_decode($debitNote->products, true);
            if (!empty($oldProducts)) {
                foreach ($oldProducts as $oldItem) {
                    $pid = intval($oldItem['product_id'] ?? 0);
                    $qty = floatval($oldItem['qty'] ?? 0);
                    if ($pid > 0 && $qty > 0) {
                        $prod = Product::find($pid);
                        if ($prod) {
                            $prod->stock = floatval($prod->stock) + $qty;
                            $prod->save();
                        }
                    }
                }
            }

            // 2. Apply New Product Stock Reduction (decrement stock)
            foreach ($products as $item) {
                $pid = intval($item['product_id'] ?? 0);
                $qty = floatval($item['qty'] ?? 1);
                if ($pid > 0 && $qty > 0) {
                    $prod = Product::find($pid);
                    if ($prod) {
                        $prod->stock = max(0, floatval($prod->stock) - $qty);
                        $prod->save();
                    }
                }
            }

            // 3. Update Record
            $debitNote->update([
                'admin_id'        => $admin_id,
                'company_id'      => $company_id,
                'return_no'       => $return_no,
                'bill_no'         => $bill_no,
                'bill_date'       => $bill_date,
                'return_date'     => $return_date,
                'supplier_id'     => $supplier_id > 0 ? $supplier_id : null,
                'supplier_name'   => $supplier_name,
                'supplier_phone'  => $supplier_phone,
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
                'message' => 'Debit Note updated successfully.',
                'data'    => $debitNote,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status'  => false,
                'message' => 'Failed to update Debit Note: ' . $e->getMessage()
            ], 500);
        }
    }

    public function deleteDebitNote(Request $request)
    {
        $this->ensureTableExists();

        $id = intval($request->input('id', 0));
        $debitNote = DebitNote::find($id);

        if (!$debitNote) {
            return response()->json(['status' => false, 'message' => 'Debit Note not found.'], 404);
        }

        DB::beginTransaction();
        try {
            // Restore inventory stock
            $products = is_array($debitNote->products) ? $debitNote->products : json_decode($debitNote->products, true);
            if (!empty($products)) {
                foreach ($products as $item) {
                    $pid = intval($item['product_id'] ?? 0);
                    $qty = floatval($item['qty'] ?? 0);
                    if ($pid > 0 && $qty > 0) {
                        $prod = Product::find($pid);
                        if ($prod) {
                            $prod->stock = floatval($prod->stock) + $qty;
                            $prod->save();
                        }
                    }
                }
            }

            $debitNote->update(['is_deleted' => 1]);

            DB::commit();

            return response()->json([
                'status'  => true,
                'message' => 'Debit Note deleted and stock restored successfully.'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status'  => false,
                'message' => 'Failed to delete Debit Note: ' . $e->getMessage()
            ], 500);
        }
    }
}
