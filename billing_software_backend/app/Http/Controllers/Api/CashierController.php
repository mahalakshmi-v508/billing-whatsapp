<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\CashierRequest;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class CashierController extends Controller
{
    public function deleteCashier(Request $request)
    {
        $id = $request->input('id');
        User::where('id', $id)->where('role', 'cashier')->delete();

        return response()->json(["status" => true]);
    }

    public function getCashiers(Request $request)
    {
        $admin_id = intval($request->input('admin_id') ?: $request->query('admin_id', 0));
        $cashiers = User::where('role', 'cashier')
            ->when($admin_id > 0, fn($q) => $q->where('admin_id', $admin_id))
            ->select('id', 'name', 'email', 'status')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            "status" => true,
            "data"   => $cashiers
        ]);
    }

    public function getCashierById(Request $request)
    {
        $id = intval($request->input('id') ?: $request->query('id', 0));
        $cashier = User::where('id', $id)->where('role', 'cashier')->first();

        if (!$cashier) {
            return response()->json([
                "status" => false,
                "message" => "Cashier not found"
            ]);
        }

        return response()->json([
            "status" => true,
            "data"   => $cashier
        ]);
    }

    public function toggleStatusCashier(Request $request)
    {
        $id     = intval($request->input('id', 0));
        $status = $request->input('status', '');

        if (!$id || !$status) {
            return response()->json([
                "status" => false,
                "success" => false,
                "message" => "Invalid data"
            ]);
        }

        $cashier = User::where('id', $id)->where('role', 'cashier')->first();
        if ($cashier) {
            $cashier->update(['status' => $status]);
            return response()->json([
                "status" => true,
                "success" => true,
                "message" => "Status updated"
            ]);
        }

        return response()->json([
            "status" => false,
            "success" => false,
            "message" => "Cashier not found"
        ]);
    }

    public function updateCashier(Request $request)
    {
        $id       = intval($request->input('id', 0));
        $name     = trim($request->input('name', ''));
        $email    = trim($request->input('email', ''));
        $password = trim($request->input('password', ''));

        if (!$id || !$name || !$email) {
            return response()->json([
                "status" => false,
                "message" => "Required fields missing"
            ]);
        }

        $check = User::where('email', $email)->where('id', '!=', $id)->exists();
        if ($check) {
            return response()->json([
                "status" => false,
                "message" => "Email already exists"
            ]);
        }

        $cashier = User::where('id', $id)->where('role', 'cashier')->first();
        if (!$cashier) {
            return response()->json([
                "status" => false,
                "message" => "Cashier not found"
            ]);
        }

        $updateData = [
            'name' => $name,
            'email' => $email
        ];

        if (!empty($password)) {
            $updateData['password'] = Hash::make($password);
        }

        $cashier->update($updateData);

        return response()->json([
            "status" => true,
            "message" => "Cashier updated successfully"
        ]);
    }

    // ── CASHIER REQUESTS ──

    public function approveCashierRequest(Request $request)
    {
        $id = intval($request->input('id', 0));
        if (!$id) {
            return response()->json([
                "status" => false,
                "message" => "Invalid request"
            ]);
        }

        $cashierReq = CashierRequest::find($id);
        if (!$cashierReq) {
            return response()->json([
                "status" => false,
                "message" => "Request not found"
            ]);
        }

        DB::beginTransaction();
        try {
            $name = $cashierReq->name ?: ($cashierReq->cashier_name ?? '');
            $email = $cashierReq->email ?: ($cashierReq->cashier_email ?? '');
            $password = $cashierReq->password ?: ($cashierReq->cashier_password ?? '');
            $admin_id = $cashierReq->admin_id ?: ($cashierReq->requested_by ?? null);
            $company_id = $cashierReq->company_id ?: null;

            User::create([
                'name' => $name,
                'email' => $email,
                'password' => $password,
                'role' => 'cashier',
                'admin_id' => $admin_id,
                'company_id' => $company_id
            ]);

            $cashierReq->update(['status' => 'approved']);

            DB::commit();
            return response()->json([
                "status" => true,
                "message" => "Cashier approved successfully"
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                "status" => false,
                "message" => $e->getMessage()
            ]);
        }
    }

    public function getCashierRequests()
    {
        $requests = DB::table('cashier_requests as cr')
            ->leftJoin('companies as c', 'c.id', '=', 'cr.company_id')
            ->leftJoin('users as u', function ($join) {
                $join->on('u.id', '=', 'cr.requested_by')
                     ->orOn('u.id', '=', 'cr.admin_id');
            })
            ->select(
                'cr.*',
                'c.company_name as company_name',
                DB::raw('COALESCE(u.name, "Administrator") as requested_user'),
                DB::raw('COALESCE(cr.name, cr.cashier_name) as name'),
                DB::raw('COALESCE(cr.email, cr.cashier_email) as email')
            )
            ->where('cr.status', 'pending')
            ->orderBy('cr.id', 'desc')
            ->get();

        return response()->json([
            "status" => true,
            "data" => $requests
        ]);
    }

    public function rejectCashierRequest(Request $request)
    {
        $id = intval($request->input('id', 0));
        if (!$id) {
            return response()->json([
                "status" => false,
                "message" => "Invalid request"
            ]);
        }

        CashierRequest::where('id', $id)->update(['status' => 'rejected']);

        return response()->json([
            "status" => true,
            "message" => "Request rejected successfully"
        ]);
    }
}
