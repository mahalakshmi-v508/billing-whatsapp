<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Services\AuditLogger;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    /**
     * Exclude pages the company hid from the Audit Log, matching on the stored
     * module label case-insensitively. Hidden modules are removed from the
     * query entirely (NOT IN), so they never reach the list, filter options,
     * search, pagination totals or the summary counters.
     *
     * COALESCE keeps legacy rows with a NULL module visible instead of letting
     * SQL's three-valued logic silently drop them.
     */
    private function applyHiddenModules($query, array $hidden)
    {
        if ($hidden === []) {
            return $query;
        }
        $placeholders = implode(',', array_fill(0, count($hidden), '?'));
        return $query->whereRaw("COALESCE(LOWER(module), '') NOT IN ({$placeholders})", $hidden);
    }

    /**
     * Paginated, filterable audit trail for the History drawer and the
     * full-page report.
     *
     * Supported filters: company_id, module, action, user_id, from, to, search,
     * record_type, record_id, per_page, page.
     */
    public function index(Request $request)
    {
        $company_id = $request->input('company_id') ?: $request->query('company_id', 0);
        if (!$company_id) {
            return response()->json(['status' => false, 'message' => 'Company ID required']);
        }

        try {
            $query = AuditLog::where('company_id', $company_id);

            // Pages the company hid from the Audit Log never show up here.
            $hidden = AuditLogger::hiddenModules($company_id);
            $query = $this->applyHiddenModules($query, $hidden);

            $module = $request->query('module');
            if ($module && $module !== 'all') {
                $query->where('module', $module);
            }

            $action = $request->query('action');
            if ($action && $action !== 'all') {
                $query->where('action', $action);
            }

            $user_id = $request->query('user_id');
            if ($user_id && $user_id !== 'all') {
                $query->where('user_id', (int) $user_id);
            }

            $record_type = $request->query('record_type');
            if ($record_type && $record_type !== 'all') {
                $query->where('record_type', $record_type);
            }

            $record_id = $request->query('record_id');
            if ($record_id !== null && $record_id !== '' && $record_id !== 'all') {
                $query->where('record_id', (int) $record_id);
            }

            $from = $request->query('from');
            if ($from) {
                $query->whereDate('created_at', '>=', $from);
            }

            $to = $request->query('to');
            if ($to) {
                $query->whereDate('created_at', '<=', $to);
            }

            $search = trim((string) $request->query('search', ''));
            if ($search !== '') {
                $query->where(function ($q) use ($search) {
                    $q->where('description', 'like', "%{$search}%")
                        ->orWhere('record_label', 'like', "%{$search}%")
                        ->orWhere('user_name', 'like', "%{$search}%")
                        ->orWhere('endpoint', 'like', "%{$search}%");
                });
            }

            $per_page = min(max((int) $request->query('per_page', 25), 1), 200);

            $logs = $query->orderBy('id', 'desc')
                ->paginate($per_page);

            // Filters stay on the links so the UI can page without losing state.
            $logs->appends($request->query());

            return response()->json([
                'status' => true,
                'data' => $logs->items(),
                'meta' => [
                    'current_page' => $logs->currentPage(),
                    'last_page' => $logs->lastPage(),
                    'per_page' => $logs->perPage(),
                    'total' => $logs->total(),
                    'from' => $logs->firstItem(),
                    'to' => $logs->lastItem(),
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Distinct modules / actions / users present in the trail, used to populate
     * the filter dropdowns without shipping a hard-coded list.
     */
    public function filters(Request $request)
    {
        $company_id = $request->input('company_id') ?: $request->query('company_id', 0);
        if (!$company_id) {
            return response()->json(['status' => false, 'message' => 'Company ID required']);
        }

        try {
            $hidden = AuditLogger::hiddenModules($company_id);
            $base = function () use ($company_id, $hidden) {
                return $this->applyHiddenModules(
                    AuditLog::where('company_id', $company_id),
                    $hidden
                );
            };

            return response()->json([
                'status' => true,
                'data' => [
                    'modules' => $base()->select('module')->distinct()->orderBy('module')->pluck('module'),
                    'actions' => $base()->select('action')->distinct()->orderBy('action')->pluck('action'),
                    'users' => $base()->select('user_id', 'user_name', 'user_role')
                        ->distinct()
                        ->orderBy('user_name')
                        ->get(),
                    'record_types' => $base()->whereNotNull('record_type')
                        ->select('record_type')->distinct()->orderBy('record_type')->pluck('record_type'),
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Headline counters for the top of the History drawer.
     */
    public function summary(Request $request)
    {
        $company_id = $request->input('company_id') ?: $request->query('company_id', 0);
        if (!$company_id) {
            return response()->json(['status' => false, 'message' => 'Company ID required']);
        }

        try {
            $hidden = AuditLogger::hiddenModules($company_id);
            $base = fn () => $this->applyHiddenModules(
                AuditLog::where('company_id', $company_id),
                $hidden
            );

            $today = now()->startOfDay();
            $week = now()->subDays(7);

            $total = $this->applyHiddenModules(AuditLog::where('company_id', $company_id), $hidden);
            $todayQ = $this->applyHiddenModules(
                AuditLog::where('company_id', $company_id)->where('created_at', '>=', $today),
                $hidden
            );
            $weekQ = $this->applyHiddenModules(
                AuditLog::where('company_id', $company_id)->where('created_at', '>=', $week),
                $hidden
            );
            $byAction = $this->applyHiddenModules(AuditLog::where('company_id', $company_id), $hidden);

            return response()->json([
                'status' => true,
                'data' => [
                    'total' => $total->count(),
                    'today' => $todayQ->count(),
                    'week' => $weekQ->count(),
                    'by_action' => $byAction
                        ->select('action')
                        ->selectRaw('COUNT(*) as total')
                        ->groupBy('action')
                        ->pluck('total', 'action'),
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Full trail for one record - powers the "History" button on a specific
     * customer / invoice row.
     */
    public function forRecord(Request $request)
    {
        $company_id = $request->input('company_id') ?: $request->query('company_id', 0);
        $record_type = $request->query('record_type');
        $record_id = $request->query('record_id');

        if (!$company_id || !$record_type || !$record_id) {
            return response()->json([
                'status' => false,
                'message' => 'company_id, record_type and record_id are required',
            ]);
        }

        try {
            $logs = AuditLog::where('company_id', $company_id)
                ->where('record_type', $record_type)
                ->where('record_id', (int) $record_id);

            $hidden = AuditLogger::hiddenModules($company_id);
            $logs = $this->applyHiddenModules($logs, $hidden);

            $logs = $logs->orderBy('id', 'desc')
                ->limit((int) $request->query('limit', 100))
                ->get();

            return response()->json(['status' => true, 'data' => $logs]);
        } catch (\Throwable $e) {
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Purge the trail for a company (or older than N days when `before` is given).
     */
    public function clear(Request $request)
    {
        $company_id = $request->input('company_id') ?: $request->query('company_id', 0);
        if (!$company_id) {
            return response()->json(['status' => false, 'message' => 'Company ID required']);
        }

        try {
            $query = AuditLog::where('company_id', $company_id);

            $before = $request->input('before');
            if ($before) {
                $query->whereDate('created_at', '<', $before);
            }

            $deleted = $query->delete();

            // The purge itself is an auditable action - keep a copy of it.
            $actor = AuditLogger::actor($request);
            AuditLogger::record($request, [
                'user_id'      => $actor['user_id'],
                'user_name'    => $actor['user_name'],
                'user_role'    => $actor['user_role'],
                'module'       => 'Audit Log',
                'action'       => 'delete',
                'record_type'  => 'AuditLog',
                'record_label' => $before ? "entries before {$before}" : 'all entries',
            ], null, ['deleted_count' => $deleted]);

            return response()->json(['status' => true, 'message' => "{$deleted} entries removed"]);
        } catch (\Throwable $e) {
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }
}