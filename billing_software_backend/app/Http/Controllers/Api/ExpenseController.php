<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\ExpenseItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

class ExpenseController extends Controller
{
    public function __construct()
    {
        $this->ensureTableExists();
    }

    private function ensureTableExists()
    {
        // 1. expense_categories Table
        if (!Schema::hasTable('expense_categories')) {
            Schema::create('expense_categories', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('admin_id')->nullable();
                $table->unsignedBigInteger('company_id')->nullable();
                $table->string('name');
                $table->string('type')->default('Indirect Expense'); // Direct Expense / Indirect Expense
                $table->text('description')->nullable();
                $table->string('status')->default('active');
                $table->tinyInteger('is_deleted')->default(0);
                $table->timestamps();
            });

            // Seed default categories
            $defaults = [
                ['name' => 'Payment-in Discount', 'type' => 'Direct Expense'],
                ['name' => 'Petrol', 'type' => 'Indirect Expense'],
                ['name' => 'Rent', 'type' => 'Indirect Expense'],
                ['name' => 'Salary', 'type' => 'Indirect Expense'],
                ['name' => 'Tea', 'type' => 'Indirect Expense'],
                ['name' => 'Transport', 'type' => 'Direct Expense'],
                ['name' => 'Electricity', 'type' => 'Indirect Expense'],
                ['name' => 'Office Maintenance', 'type' => 'Indirect Expense'],
            ];

            foreach ($defaults as $d) {
                DB::table('expense_categories')->insert([
                    'admin_id' => null,
                    'company_id' => null,
                    'name' => $d['name'],
                    'type' => $d['type'],
                    'status' => 'active',
                    'is_deleted' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // 2. expense_items Table
        if (!Schema::hasTable('expense_items')) {
            Schema::create('expense_items', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('admin_id')->nullable();
                $table->unsignedBigInteger('company_id')->nullable();
                $table->unsignedBigInteger('category_id')->nullable();
                $table->string('item_name');
                $table->string('hsn_sac')->nullable();
                $table->decimal('price', 15, 2)->default(0);
                $table->string('tax_type')->default('Tax Excluded'); // Tax Excluded / Tax Included
                $table->decimal('tax_rate', 8, 2)->default(0);
                $table->string('status')->default('active');
                $table->tinyInteger('is_deleted')->default(0);
                $table->timestamps();
            });
        }

        // 3. expenses Table
        if (!Schema::hasTable('expenses')) {
            Schema::create('expenses', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('admin_id')->nullable();
                $table->unsignedBigInteger('company_id')->nullable();
                $table->unsignedBigInteger('cashier_id')->nullable();
                $table->string('expense_no')->nullable();
                $table->date('expense_date')->nullable();
                $table->unsignedBigInteger('category_id')->nullable();
                $table->string('category_name')->nullable();
                $table->string('party_name')->nullable();
                $table->string('party_phone')->nullable();
                $table->boolean('is_gst')->default(false);
                $table->longText('items')->nullable(); // JSON
                $table->decimal('sub_total', 15, 2)->default(0);
                $table->decimal('tax_total', 15, 2)->default(0);
                $table->decimal('discount_total', 15, 2)->default(0);
                $table->decimal('round_off', 10, 2)->default(0);
                $table->decimal('total_amount', 15, 2)->default(0);
                $table->decimal('paid_amount', 15, 2)->default(0);
                $table->decimal('balance_amount', 15, 2)->default(0);
                $table->string('payment_type')->default('Cash');
                $table->text('description')->nullable();
                $table->string('status')->default('active');
                $table->tinyInteger('is_deleted')->default(0);
                $table->timestamps();
            });
        }
    }

    /* ══════════════════════════════════════════════════════════════
       CATEGORIES API
       ══════════════════════════════════════════════════════════════ */

    public function getCategories(Request $request)
    {
        $company_id = intval($request->input('company_id') ?: $request->query('company_id', 0));
        $admin_id = intval($request->input('admin_id') ?: $request->query('admin_id', 0));

        $query = DB::table('expense_categories as ec')
            ->where('ec.is_deleted', 0);

        if ($company_id > 0) {
            $query->where(function ($q) use ($company_id) {
                $q->where('ec.company_id', $company_id)->orWhereNull('ec.company_id');
            });
        }

        $categories = $query->select('ec.*')
            ->selectRaw('(SELECT COALESCE(SUM(e.total_amount), 0) FROM expenses e WHERE e.category_id = ec.id AND e.is_deleted = 0) as total_amount')
            ->selectRaw('(SELECT COALESCE(SUM(e.balance_amount), 0) FROM expenses e WHERE e.category_id = ec.id AND e.is_deleted = 0) as total_balance')
            ->selectRaw('(SELECT COUNT(e.id) FROM expenses e WHERE e.category_id = ec.id AND e.is_deleted = 0) as tx_count')
            ->orderBy('ec.id', 'asc')
            ->get();

        return response()->json([
            'status' => true,
            'data' => $categories
        ]);
    }

    public function createCategory(Request $request)
    {
        $name = trim($request->input('name', ''));
        $type = trim($request->input('type', 'Indirect Expense')) ?: 'Indirect Expense';
        $company_id = intval($request->input('company_id', 0)) ?: null;
        $admin_id = intval($request->input('admin_id', 0)) ?: null;

        if (!$name) {
            return response()->json(['status' => false, 'message' => 'Category name is required']);
        }

        $cat = ExpenseCategory::create([
            'admin_id' => $admin_id,
            'company_id' => $company_id,
            'name' => $name,
            'type' => $type,
            'status' => 'active',
            'is_deleted' => 0
        ]);

        return response()->json([
            'status' => true,
            'message' => 'Expense category created successfully',
            'data' => $cat
        ]);
    }

    public function updateCategory(Request $request)
    {
        $id = intval($request->input('id', 0));
        $name = trim($request->input('name', ''));
        $type = trim($request->input('type', ''));

        $cat = ExpenseCategory::find($id);
        if (!$cat) {
            return response()->json(['status' => false, 'message' => 'Category not found']);
        }

        if ($name) $cat->name = $name;
        if ($type) $cat->type = $type;
        $cat->save();

        return response()->json([
            'status' => true,
            'message' => 'Category updated successfully',
            'data' => $cat
        ]);
    }

    public function deleteCategory(Request $request)
    {
        $id = intval($request->input('id', 0));
        $cat = ExpenseCategory::find($id);
        if (!$cat) {
            return response()->json(['status' => false, 'message' => 'Category not found']);
        }

        $cat->is_deleted = 1;
        $cat->save();

        return response()->json([
            'status' => true,
            'message' => 'Category deleted successfully'
        ]);
    }

    /* ══════════════════════════════════════════════════════════════
       ITEMS API
       ══════════════════════════════════════════════════════════════ */

    public function getItems(Request $request)
    {
        $company_id = intval($request->input('company_id') ?: $request->query('company_id', 0));

        $query = DB::table('expense_items as ei')
            ->leftJoin('expense_categories as ec', 'ei.category_id', '=', 'ec.id')
            ->select('ei.*', 'ec.name as category_name')
            ->where('ei.is_deleted', 0);

        if ($company_id > 0) {
            $query->where(function ($q) use ($company_id) {
                $q->where('ei.company_id', $company_id)->orWhereNull('ei.company_id');
            });
        }

        $items = $query->orderBy('ei.id', 'desc')->get();

        return response()->json([
            'status' => true,
            'data' => $items
        ]);
    }

    public function createItem(Request $request)
    {
        $item_name = trim($request->input('item_name', ''));
        $category_id = intval($request->input('category_id', 0)) ?: null;
        $hsn_sac = trim($request->input('hsn_sac', ''));
        $price = floatval($request->input('price', 0));
        $tax_type = trim($request->input('tax_type', 'Tax Excluded')) ?: 'Tax Excluded';
        $tax_rate = floatval($request->input('tax_rate', 0));
        $company_id = intval($request->input('company_id', 0)) ?: null;
        $admin_id = intval($request->input('admin_id', 0)) ?: null;

        if (!$item_name) {
            return response()->json(['status' => false, 'message' => 'Item name is required']);
        }

        $item = ExpenseItem::create([
            'admin_id' => $admin_id,
            'company_id' => $company_id,
            'category_id' => $category_id,
            'item_name' => $item_name,
            'hsn_sac' => $hsn_sac ?: null,
            'price' => $price,
            'tax_type' => $tax_type,
            'tax_rate' => $tax_rate,
            'status' => 'active',
            'is_deleted' => 0
        ]);

        return response()->json([
            'status' => true,
            'message' => 'Expense item created successfully',
            'data' => $item
        ]);
    }

    /* ══════════════════════════════════════════════════════════════
       EXPENSES VOUCHERS API
       ══════════════════════════════════════════════════════════════ */

    public function getExpenses(Request $request)
    {
        $company_id = intval($request->input('company_id') ?: $request->query('company_id', 0));
        $admin_id = intval($request->input('admin_id') ?: $request->query('admin_id', 0));
        $category_id = intval($request->input('category_id') ?: $request->query('category_id', 0));
        $category_name = trim($request->input('category_name') ?: $request->query('category_name', ''));
        $payment_type = trim($request->input('payment_type') ?: $request->query('payment_type', ''));
        $from_date = trim($request->input('from_date') ?: $request->query('from_date', ''));
        $to_date = trim($request->input('to_date') ?: $request->query('to_date', ''));
        $search = trim($request->input('search') ?: $request->query('search', ''));

        $query = Expense::where('is_deleted', 0);

        if ($company_id > 0) {
            $query->where('company_id', $company_id);
        }

        if ($category_id > 0) {
            $query->where('category_id', $category_id);
        } elseif (!empty($category_name)) {
            $query->where('category_name', $category_name);
        }

        if (!empty($payment_type) && strtolower($payment_type) !== 'all') {
            $query->where('payment_type', $payment_type);
        }

        if (!empty($from_date)) {
            $query->whereDate('expense_date', '>=', $from_date);
        }

        if (!empty($to_date)) {
            $query->whereDate('expense_date', '<=', $to_date);
        }

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('expense_no', 'like', "%{$search}%")
                  ->orWhere('party_name', 'like', "%{$search}%")
                  ->orWhere('party_phone', 'like', "%{$search}%")
                  ->orWhere('category_name', 'like', "%{$search}%");
            });
        }

        $expenses = $query->orderBy('id', 'desc')->get();

        return response()->json([
            'status' => true,
            'data' => $expenses,
            'count' => $expenses->count()
        ]);
    }

    public function getExpenseById(Request $request)
    {
        $id = intval($request->input('id') ?: $request->query('id', 0));
        $expense = Expense::find($id);

        if (!$expense || $expense->is_deleted) {
            return response()->json(['status' => false, 'message' => 'Expense not found']);
        }

        return response()->json([
            'status' => true,
            'data' => $expense
        ]);
    }

    public function createExpense(Request $request)
    {
        $admin_id = intval($request->input('admin_id', 0)) ?: null;
        $company_id = intval($request->input('company_id', 0)) ?: null;
        $cashier_id = intval($request->input('cashier_id', 0)) ?: null;
        $expense_no = trim($request->input('expense_no', ''));
        $expense_date = trim($request->input('expense_date', date('Y-m-d')));
        $category_id = intval($request->input('category_id', 0)) ?: null;
        $category_name = trim($request->input('category_name', ''));
        $party_name = trim($request->input('party_name', ''));
        $party_phone = trim($request->input('party_phone', ''));
        $is_gst = boolval($request->input('is_gst', false));
        $items = $request->input('items', []);
        $sub_total = floatval($request->input('sub_total', 0));
        $tax_total = floatval($request->input('tax_total', 0));
        $discount_total = floatval($request->input('discount_total', 0));
        $round_off = floatval($request->input('round_off', 0));
        $total_amount = floatval($request->input('total_amount', 0));
        $paid_amount = floatval($request->input('paid_amount', $total_amount));
        $balance_amount = floatval($request->input('balance_amount', max(0, $total_amount - $paid_amount)));
        $payment_type = trim($request->input('payment_type', 'Cash')) ?: 'Cash';
        $description = trim($request->input('description', ''));

        // If category_name provided but no category_id, resolve or create category
        if (!$category_id && !empty($category_name)) {
            $cat = ExpenseCategory::whereRaw('LOWER(name) = ?', [strtolower($category_name)])
                ->where('is_deleted', 0)
                ->first();
            if ($cat) {
                $category_id = $cat->id;
            } else {
                $newCat = ExpenseCategory::create([
                    'admin_id' => $admin_id,
                    'company_id' => $company_id,
                    'name' => $category_name,
                    'type' => 'Indirect Expense',
                    'status' => 'active',
                    'is_deleted' => 0
                ]);
                $category_id = $newCat->id;
            }
        }

        // Auto-generate expense_no if empty
        if (empty($expense_no)) {
            $count = Expense::where('company_id', $company_id)->count();
            $expense_no = strval($count + 1);
        }

        $expense = Expense::create([
            'admin_id' => $admin_id,
            'company_id' => $company_id,
            'cashier_id' => $cashier_id,
            'expense_no' => $expense_no,
            'expense_date' => $expense_date,
            'category_id' => $category_id,
            'category_name' => $category_name,
            'party_name' => $party_name ?: null,
            'party_phone' => $party_phone ?: null,
            'is_gst' => $is_gst,
            'items' => is_array($items) ? $items : json_decode($items, true),
            'sub_total' => $sub_total,
            'tax_total' => $tax_total,
            'discount_total' => $discount_total,
            'round_off' => $round_off,
            'total_amount' => $total_amount,
            'paid_amount' => $paid_amount,
            'balance_amount' => $balance_amount,
            'payment_type' => $payment_type,
            'description' => $description ?: null,
            'status' => 'active',
            'is_deleted' => 0
        ]);

        return response()->json([
            'status' => true,
            'message' => 'Expense created successfully',
            'data' => $expense
        ]);
    }

    public function updateExpense(Request $request)
    {
        $id = intval($request->input('id', 0));
        $expense = Expense::find($id);

        if (!$expense || $expense->is_deleted) {
            return response()->json(['status' => false, 'message' => 'Expense not found']);
        }

        $category_name = trim($request->input('category_name', $expense->category_name));
        $category_id = intval($request->input('category_id', $expense->category_id));
        $items = $request->input('items', $expense->items);
        $total_amount = floatval($request->input('total_amount', $expense->total_amount));
        $paid_amount = floatval($request->input('paid_amount', $expense->paid_amount));

        $expense->expense_no = $request->input('expense_no', $expense->expense_no);
        $expense->expense_date = $request->input('expense_date', $expense->expense_date);
        $expense->category_id = $category_id;
        $expense->category_name = $category_name;
        $expense->party_name = $request->input('party_name', $expense->party_name);
        $expense->party_phone = $request->input('party_phone', $expense->party_phone);
        $expense->is_gst = boolval($request->input('is_gst', $expense->is_gst));
        $expense->items = is_array($items) ? $items : json_decode($items, true);
        $expense->sub_total = floatval($request->input('sub_total', $expense->sub_total));
        $expense->tax_total = floatval($request->input('tax_total', $expense->tax_total));
        $expense->discount_total = floatval($request->input('discount_total', $expense->discount_total));
        $expense->round_off = floatval($request->input('round_off', $expense->round_off));
        $expense->total_amount = $total_amount;
        $expense->paid_amount = $paid_amount;
        $expense->balance_amount = floatval($request->input('balance_amount', max(0, $total_amount - $paid_amount)));
        $expense->payment_type = $request->input('payment_type', $expense->payment_type);
        $expense->description = $request->input('description', $expense->description);
        $expense->save();

        return response()->json([
            'status' => true,
            'message' => 'Expense updated successfully',
            'data' => $expense
        ]);
    }

    public function deleteExpense(Request $request)
    {
        $id = intval($request->input('id', 0));
        $expense = Expense::find($id);

        if (!$expense) {
            return response()->json(['status' => false, 'message' => 'Expense not found']);
        }

        $expense->is_deleted = 1;
        $expense->save();

        return response()->json([
            'status' => true,
            'message' => 'Expense deleted successfully'
        ]);
    }
}
