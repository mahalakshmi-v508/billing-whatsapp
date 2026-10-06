<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Supplier;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

class SupplierController extends Controller
{
    private function ensureSchemaUpdated()
    {
        if (Schema::hasTable('suppliers')) {
            Schema::table('suppliers', function (Blueprint $table) {
                if (!Schema::hasColumn('suppliers', 'advance_balance')) {
                    $table->decimal('advance_balance', 12, 2)->default(0.00)->after('mobile_number');
                }
            });
        }
    }

    public function create(Request $request)
    {
        $this->ensureSchemaUpdated();
        $company_id     = intval($request->input('company_id', 0));
        $supplier_name  = trim($request->input('supplier_name', ''));
        $mobile_number  = trim($request->input('mobile_number', ''));
        $alt_mobile     = trim($request->input('alt_mobile', ''));
        $email          = trim($request->input('email', ''));
        $gst_number     = trim($request->input('gst_number', ''));
        $address        = trim($request->input('address', ''));
        $city           = trim($request->input('city', ''));
        $district       = trim($request->input('district', ''));
        $state          = trim($request->input('state', ''));
        $pincode        = trim($request->input('pincode', ''));
        $country        = trim($request->input('country', ''));
        $advance_balance = floatval($request->input('advance_balance', 0.00));

        if (!$company_id || !$supplier_name || !$mobile_number) {
            return response()->json([
                "status" => false,
                "message" => "Company, Supplier Name, and Mobile Number are required"
            ]);
        }

        Supplier::create([
            'company_id' => $company_id,
            'supplier_name' => $supplier_name,
            'mobile_number' => $mobile_number,
            'alt_mobile' => $alt_mobile ?: null,
            'email' => $email ?: null,
            'gst_number' => $gst_number ?: null,
            'address' => $address ?: null,
            'city' => $city ?: null,
            'district' => $district ?: null,
            'state' => $state ?: null,
            'pincode' => $pincode ?: null,
            'country' => $country ?: null,
            'advance_balance' => $advance_balance,
            'status' => 'active',
            'is_deleted' => 0
        ]);

        return response()->json([
            "status" => true,
            "message" => "Supplier created successfully"
        ]);
    }

    public function getAll(Request $request)
    {
        $this->ensureSchemaUpdated();
        $company_id = intval($request->input('company_id') ?: $request->query('company_id', 0));
        $admin_id = intval($request->input('admin_id') ?: $request->query('admin_id', 0));
        $query = Supplier::where('is_deleted', 0);
        if ($company_id > 0) {
            $query->where('company_id', $company_id);
        } elseif ($admin_id > 0) {
            $adminCompanyIds = \Illuminate\Support\Facades\DB::table('companies')
                ->where('admin_id', $admin_id)
                ->where('is_deleted', 0)
                ->pluck('id')
                ->all();
            if (!empty($adminCompanyIds)) {
                $query->whereIn('company_id', $adminCompanyIds);
            }
        }

        $suppliers = $query->select('suppliers.*')
            ->selectRaw('(SELECT COALESCE(SUM(balance_amount), 0) FROM purchases WHERE purchases.supplier_id = suppliers.id AND purchases.status = "submitted") as pending_balance')
            ->selectRaw('(SELECT COALESCE(SUM(balance_amount), 0) FROM purchases WHERE purchases.supplier_id = suppliers.id AND purchases.status = "submitted") as balance_amount')
            ->selectRaw('(SELECT COALESCE(SUM(balance_amount), 0) FROM purchases WHERE purchases.supplier_id = suppliers.id AND purchases.status = "submitted") as total_balance')
            ->selectRaw('(COALESCE(suppliers.advance_balance, 0) + (SELECT COALESCE(SUM(amount), 0) FROM purchase_payments WHERE purchase_payments.supplier_id = suppliers.id AND (purchase_payments.purchase_id = 0 OR purchase_payments.purchase_id IS NULL))) as advance_balance')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            "status" => true,
            "data" => $suppliers
        ]);
    }

    public function getById(Request $request)
    {
        $this->ensureSchemaUpdated();
        $id = intval($request->input('id') ?: $request->query('id', 0));
        $supplier = Supplier::where('id', $id)
            ->select('suppliers.*')
            ->selectRaw('(SELECT COALESCE(SUM(balance_amount), 0) FROM purchases WHERE purchases.supplier_id = suppliers.id AND purchases.status = "submitted") as pending_balance')
            ->selectRaw('(SELECT COALESCE(SUM(balance_amount), 0) FROM purchases WHERE purchases.supplier_id = suppliers.id AND purchases.status = "submitted") as balance_amount')
            ->selectRaw('(SELECT COALESCE(SUM(balance_amount), 0) FROM purchases WHERE purchases.supplier_id = suppliers.id AND purchases.status = "submitted") as total_balance')
            ->selectRaw('(COALESCE(suppliers.advance_balance, 0) + (SELECT COALESCE(SUM(amount), 0) FROM purchase_payments WHERE purchase_payments.supplier_id = suppliers.id AND (purchase_payments.purchase_id = 0 OR purchase_payments.purchase_id IS NULL))) as advance_balance')
            ->first();

        if (!$supplier) {
            return response()->json([
                "status" => false,
                "message" => "Supplier not found"
            ]);
        }

        return response()->json([
            "status" => true,
            "data" => $supplier
        ]);
    }

    public function toggleSupplierStatus(Request $request)
    {
        $id = intval($request->input('id', 0));
        $status = $request->input('status', '');

        if (!$id || !$status) {
            return response()->json([
                "status" => false,
                "message" => "Invalid data"
            ]);
        }

        Supplier::where('id', $id)->update(['status' => $status]);

        return response()->json([
            "status" => true,
            "message" => "Supplier status updated successfully"
        ]);
    }

    public function update(Request $request)
    {
        $id             = intval($request->input('id', 0));
        $supplier_name  = trim($request->input('supplier_name', ''));
        $mobile_number  = trim($request->input('mobile_number', ''));
        $alt_mobile     = trim($request->input('alt_mobile', ''));
        $email          = trim($request->input('email', ''));
        $gst_number     = trim($request->input('gst_number', ''));
        $address        = trim($request->input('address', ''));
        $city           = trim($request->input('city', ''));
        $district       = trim($request->input('district', ''));
        $state          = trim($request->input('state', ''));
        $pincode        = trim($request->input('pincode', ''));
        $country        = trim($request->input('country', ''));

        if (!$id || !$supplier_name || !$mobile_number) {
            return response()->json([
                "status" => false,
                "message" => "Supplier Name and Mobile Number are required"
            ]);
        }

        Supplier::where('id', $id)->update([
            'supplier_name' => $supplier_name,
            'mobile_number' => $mobile_number,
            'alt_mobile' => $alt_mobile ?: null,
            'email' => $email ?: null,
            'gst_number' => $gst_number ?: null,
            'address' => $address ?: null,
            'city' => $city ?: null,
            'district' => $district ?: null,
            'state' => $state ?: null,
            'pincode' => $pincode ?: null,
            'country' => $country ?: null
        ]);

        return response()->json([
            "status" => true,
            "message" => "Supplier updated successfully"
        ]);
    }
}
