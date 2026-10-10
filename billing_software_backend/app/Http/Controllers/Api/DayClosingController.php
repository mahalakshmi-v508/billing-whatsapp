<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

class DayClosingController extends Controller
{
    /**
     * Ensure the day_closings table exists in the database.
     */
    private function ensureTableExists()
    {
        if (!Schema::hasTable('day_closings')) {
            Schema::create('day_closings', function (Blueprint $table) {
                $table->id();
                $table->integer('company_id')->index();
                $table->date('closing_date')->index();
                $table->string('z_report_no', 50)->nullable()->unique();
                $table->timestamp('opened_at')->nullable();
                $table->timestamp('closed_at')->nullable();
                $table->string('cashier_name', 100)->nullable();
                $table->decimal('opening_cash', 12, 2)->default(0);
                $table->decimal('cash_sales', 12, 2)->default(0);
                $table->decimal('upi_sales', 12, 2)->default(0);
                $table->decimal('card_sales', 12, 2)->default(0);
                $table->decimal('bank_sales', 12, 2)->default(0);
                $table->decimal('credit_sales', 12, 2)->default(0);
                $table->decimal('total_sales', 12, 2)->default(0);
                $table->integer('invoices_count')->default(0);
                $table->decimal('cash_refunds', 12, 2)->default(0);
                $table->decimal('cash_expenses', 12, 2)->default(0);
                $table->decimal('expected_cash', 12, 2)->default(0);
                $table->decimal('actual_cash', 12, 2)->default(0);
                $table->decimal('discrepancy', 12, 2)->default(0);
                $table->string('discrepancy_status', 20)->default('exact'); // exact, short, excess
                $table->json('denominations')->nullable();
                $table->text('notes')->nullable();
                $table->string('status', 20)->default('closed');
                $table->timestamps();
            });
        }
    }

    /**
     * Get day closing summary for a given date and company.
     */
    public function summary(Request $request)
    {
        $this->ensureTableExists();

        $company_id = intval($request->input('company_id') ?: $request->query('company_id', 0));
        $date       = trim($request->input('date') ?: $request->query('date', date('Y-m-d')));

        if (!$company_id) {
            $user = auth()->user();
            if ($user && !empty($user->company_id)) {
                $company_id = intval($user->company_id);
            }
        }

        if (!$company_id) {
            $first = DB::table('companies')->where('is_deleted', 0)->first();
            if ($first) {
                $company_id = intval($first->id);
            }
        }

        $company = DB::table('companies')->where('id', $company_id)->first();

        // 1. Invoices on this date
        $invQuery = DB::table('invoices')->where('company_id', $company_id);
        if (Schema::hasColumn('invoices', 'is_deleted')) {
            $invQuery->where('is_deleted', 0);
        }
        $invoices = $invQuery->whereDate('created_at', $date)->get();

        $cashSales   = 0.0;
        $upiSales    = 0.0;
        $cardSales   = 0.0;
        $bankSales   = 0.0;
        $creditSales = 0.0;
        $totalSales  = 0.0;
        $invoicesCount = count($invoices);

        foreach ($invoices as $inv) {
            $paid   = floatval($inv->paid_amount ?? 0);
            $bal    = floatval($inv->balance_amount ?? 0);
            $method = strtolower(trim($inv->payment_method ?? 'cash'));

            $totalSales  += floatval($inv->total_amount ?? 0);
            $creditSales += $bal;

            if (invoices_is_cash($method)) {
                $cashSales += $paid;
            } elseif (invoices_is_upi($method)) {
                $upiSales += $paid;
            } elseif (invoices_is_card($method)) {
                $cardSales += $paid;
            } elseif (invoices_is_bank($method)) {
                $bankSales += $paid;
            } else {
                $cashSales += $paid;
            }
        }

        // 2. Cash Refunds (credit_notes with payment_type cash)
        $cashRefunds = 0.0;
        if (Schema::hasTable('credit_notes')) {
            $cnQuery = DB::table('credit_notes')
                ->where('company_id', $company_id)
                ->whereDate('return_date', $date);
            if (Schema::hasColumn('credit_notes', 'is_deleted')) {
                $cnQuery->where('is_deleted', 0);
            }
            $creditNotes = $cnQuery->get();
            foreach ($creditNotes as $cn) {
                $type = strtolower(trim($cn->payment_type ?? ''));
                if ($type === 'cash') {
                    $cashRefunds += floatval($cn->refund_amount ?? $cn->total_amount ?? 0);
                }
            }
        }

        // 3. Cash Expenses
        $cashExpenses = 0.0;
        if (Schema::hasTable('expenses')) {
            $expQuery = DB::table('expenses')
                ->where('company_id', $company_id)
                ->whereDate('expense_date', $date);
            if (Schema::hasColumn('expenses', 'is_deleted')) {
                $expQuery->where('is_deleted', 0);
            }
            $expenses = $expQuery->get();
            foreach ($expenses as $exp) {
                $method = strtolower(trim($exp->payment_method ?? $exp->payment_type ?? 'cash'));
                if (invoices_is_cash($method)) {
                    $cashExpenses += floatval($exp->amount ?? 0);
                }
            }
        }

        // 4. Check if already closed today
        $existingClosing = DB::table('day_closings')
            ->where('company_id', $company_id)
            ->where('closing_date', $date)
            ->first();

        // 5. Opening Cash: from previous day's closing or default 0
        $openingCash = 0.0;
        if ($existingClosing) {
            $openingCash = floatval($existingClosing->opening_cash);
        } else {
            $prevClosing = DB::table('day_closings')
                ->where('company_id', $company_id)
                ->where('closing_date', '<', $date)
                ->orderBy('closing_date', 'desc')
                ->first();
            if ($prevClosing) {
                $openingCash = floatval($prevClosing->actual_cash);
            }
        }

        $expectedCash = round($openingCash + $cashSales - $cashRefunds - $cashExpenses, 2);

        return response()->json([
            'status'         => true,
            'date'           => $date,
            'company_id'     => $company_id,
            'company_name'   => $company ? $company->company_name : 'Store',
            'opening_cash'   => round($openingCash, 2),
            'cash_sales'     => round($cashSales, 2),
            'upi_sales'      => round($upiSales, 2),
            'card_sales'     => round($cardSales, 2),
            'bank_sales'     => round($bankSales, 2),
            'credit_sales'   => round($creditSales, 2),
            'total_sales'    => round($totalSales, 2),
            'invoices_count' => $invoicesCount,
            'cash_refunds'   => round($cashRefunds, 2),
            'cash_expenses'  => round($cashExpenses, 2),
            'expected_cash'  => $expectedCash,
            'is_closed'      => $existingClosing ? true : false,
            'closing'        => $existingClosing ? [
                'id'                 => $existingClosing->id,
                'z_report_no'        => $existingClosing->z_report_no,
                'cashier_name'       => $existingClosing->cashier_name,
                'opened_at'          => $existingClosing->opened_at,
                'closed_at'          => $existingClosing->closed_at,
                'opening_cash'       => floatval($existingClosing->opening_cash),
                'expected_cash'      => floatval($existingClosing->expected_cash),
                'actual_cash'        => floatval($existingClosing->actual_cash),
                'discrepancy'        => floatval($existingClosing->discrepancy),
                'discrepancy_status' => $existingClosing->discrepancy_status,
                'denominations'      => json_decode($existingClosing->denominations ?? '{}', true),
                'notes'              => $existingClosing->notes,
                'status'             => $existingClosing->status,
            ] : null,
        ]);
    }

    /**
     * Save Day-End Closing & generate Z-Report.
     */
    public function save(Request $request)
    {
        $this->ensureTableExists();

        $company_id   = intval($request->input('company_id', 0));
        $closing_date = trim($request->input('closing_date', date('Y-m-d')));
        $cashier_name = trim($request->input('cashier_name', 'Cashier'));
        $opening_cash = floatval($request->input('opening_cash', 0));
        $actual_cash  = floatval($request->input('actual_cash', 0));
        $denominations= $request->input('denominations', []);
        $notes        = trim($request->input('notes', ''));

        if (!$company_id) {
            $user = auth()->user();
            if ($user && !empty($user->company_id)) {
                $company_id = intval($user->company_id);
            }
        }

        if (!$company_id) {
            return response()->json(['status' => false, 'message' => 'Company ID is required'], 400);
        }

        // Recalculate server-side expected figures
        $summaryReq = new Request(['company_id' => $company_id, 'date' => $closing_date]);
        $summaryJson = $this->summary($summaryReq)->getData(true);

        $cashSales    = floatval($summaryJson['cash_sales'] ?? 0);
        $upiSales     = floatval($summaryJson['upi_sales'] ?? 0);
        $cardSales    = floatval($summaryJson['card_sales'] ?? 0);
        $bankSales    = floatval($summaryJson['bank_sales'] ?? 0);
        $creditSales  = floatval($summaryJson['credit_sales'] ?? 0);
        $totalSales   = floatval($summaryJson['total_sales'] ?? 0);
        $invoicesCount= intval($summaryJson['invoices_count'] ?? 0);
        $cashRefunds  = floatval($summaryJson['cash_refunds'] ?? 0);
        $cashExpenses = floatval($summaryJson['cash_expenses'] ?? 0);

        $expectedCash = round($opening_cash + $cashSales - $cashRefunds - $cashExpenses, 2);
        $discrepancy  = round($actual_cash - $expectedCash, 2);

        $discrepancyStatus = 'exact';
        if ($discrepancy < -0.01) {
            $discrepancyStatus = 'short';
        } elseif ($discrepancy > 0.01) {
            $discrepancyStatus = 'excess';
        }

        // Unique Z-Report Number: Z-YYYYMMDD-{companyId}-{rand}
        $dateCode = str_replace('-', '', $closing_date);
        $existing = DB::table('day_closings')
            ->where('company_id', $company_id)
            ->where('closing_date', $closing_date)
            ->first();

        $zReportNo = $existing ? $existing->z_report_no : "Z-{$dateCode}-" . sprintf('%03d', rand(1, 999));
        $now = date('Y-m-d H:i:s');

        $payload = [
            'company_id'         => $company_id,
            'closing_date'       => $closing_date,
            'z_report_no'        => $zReportNo,
            'opened_at'          => $existing ? $existing->opened_at : "{$closing_date} 09:00:00",
            'closed_at'          => $now,
            'cashier_name'       => $cashier_name,
            'opening_cash'       => $opening_cash,
            'cash_sales'         => $cashSales,
            'upi_sales'          => $upiSales,
            'card_sales'         => $cardSales,
            'bank_sales'         => $bankSales,
            'credit_sales'       => $creditSales,
            'total_sales'        => $totalSales,
            'invoices_count'     => $invoicesCount,
            'cash_refunds'       => $cashRefunds,
            'cash_expenses'      => $cashExpenses,
            'expected_cash'      => $expectedCash,
            'actual_cash'        => $actual_cash,
            'discrepancy'        => $discrepancy,
            'discrepancy_status' => $discrepancyStatus,
            'denominations'      => json_encode($denominations),
            'notes'              => $notes,
            'status'             => 'closed',
            'updated_at'         => $now,
        ];

        if ($existing) {
            DB::table('day_closings')->where('id', $existing->id)->update($payload);
            $id = $existing->id;
        } else {
            $payload['created_at'] = $now;
            $id = DB::table('day_closings')->insertGetId($payload);
        }

        $savedRecord = DB::table('day_closings')->where('id', $id)->first();

        return response()->json([
            'status'  => true,
            'message' => 'Day-End Closing (Z-Report) completed successfully!',
            'data'    => [
                'id'                 => $savedRecord->id,
                'z_report_no'        => $savedRecord->z_report_no,
                'closing_date'       => $savedRecord->closing_date,
                'opened_at'          => $savedRecord->opened_at,
                'closed_at'          => $savedRecord->closed_at,
                'cashier_name'       => $savedRecord->cashier_name,
                'opening_cash'       => floatval($savedRecord->opening_cash),
                'cash_sales'         => floatval($savedRecord->cash_sales),
                'upi_sales'          => floatval($savedRecord->upi_sales),
                'card_sales'         => floatval($savedRecord->card_sales),
                'bank_sales'         => floatval($savedRecord->bank_sales),
                'credit_sales'       => floatval($savedRecord->credit_sales),
                'total_sales'        => floatval($savedRecord->total_sales),
                'invoices_count'     => intval($savedRecord->invoices_count),
                'cash_refunds'       => floatval($savedRecord->cash_refunds),
                'cash_expenses'      => floatval($savedRecord->cash_expenses),
                'expected_cash'      => floatval($savedRecord->expected_cash),
                'actual_cash'        => floatval($savedRecord->actual_cash),
                'discrepancy'        => floatval($savedRecord->discrepancy),
                'discrepancy_status' => $savedRecord->discrepancy_status,
                'denominations'      => json_decode($savedRecord->denominations ?? '{}', true),
                'notes'              => $savedRecord->notes,
                'status'             => $savedRecord->status,
            ],
        ]);
    }

    /**
     * List previous day-end closings history.
     */
    public function history(Request $request)
    {
        $this->ensureTableExists();

        $company_id = intval($request->input('company_id') ?: $request->query('company_id', 0));
        if (!$company_id) {
            $user = auth()->user();
            if ($user && !empty($user->company_id)) {
                $company_id = intval($user->company_id);
            }
        }

        $records = DB::table('day_closings')
            ->where('company_id', $company_id)
            ->orderBy('closing_date', 'desc')
            ->limit(30)
            ->get();

        $formatted = $records->map(function ($r) {
            return [
                'id'                 => $r->id,
                'z_report_no'        => $r->z_report_no,
                'closing_date'       => $r->closing_date,
                'cashier_name'       => $r->cashier_name,
                'opened_at'          => $r->opened_at,
                'closed_at'          => $r->closed_at,
                'opening_cash'       => floatval($r->opening_cash),
                'cash_sales'         => floatval($r->cash_sales),
                'upi_sales'          => floatval($r->upi_sales),
                'card_sales'         => floatval($r->card_sales),
                'bank_sales'         => floatval($r->bank_sales),
                'credit_sales'       => floatval($r->credit_sales),
                'total_sales'        => floatval($r->total_sales),
                'invoices_count'     => intval($r->invoices_count),
                'cash_refunds'       => floatval($r->cash_refunds),
                'cash_expenses'      => floatval($r->cash_expenses),
                'expected_cash'      => floatval($r->expected_cash),
                'actual_cash'        => floatval($r->actual_cash),
                'discrepancy'        => floatval($r->discrepancy),
                'discrepancy_status' => $r->discrepancy_status,
                'denominations'      => json_decode($r->denominations ?? '{}', true),
                'notes'              => $r->notes,
                'status'             => $r->status,
            ];
        });

        return response()->json([
            'status' => true,
            'data'   => $formatted,
        ]);
    }
}

// ── Payment method helpers ──
function invoices_is_cash($method)
{
    return in_array($method, ['cash', 'rokkam', 'cash_drawer']);
}

function invoices_is_upi($method)
{
    return in_array($method, ['upi', 'qr', 'online', 'gpay', 'phonepe', 'paytm', 'bhim']);
}

function invoices_is_card($method)
{
    return in_array($method, ['card', 'debit_card', 'credit_card', 'pos', 'swipe']);
}

function invoices_is_bank($method)
{
    return in_array($method, ['bank', 'bank_transfer', 'neft', 'rtgs', 'imps', 'cheque', 'check']);
}
