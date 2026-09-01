<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReportView;
use Illuminate\Http\Request;

class ReportViewController extends Controller
{
    /**
     * Record ONE report view for the given admin + report slug.
     * Increments view_count and updates last_viewed_at.
     */
    public function recordView(Request $request)
    {
        $adminId = intval($request->input('admin_id', 0));
        $slug    = trim((string) $request->input('report_slug', ''));

        if ($adminId <= 0 || $slug === '') {
            return response()->json(['status' => false, 'message' => 'admin_id and report_slug are required']);
        }

        $row = ReportView::where('admin_id', $adminId)
            ->where('report_slug', $slug)
            ->first();

        if ($row) {
            $row->view_count += 1;
            $row->last_viewed_at = now();
            $row->save();
        } else {
            ReportView::create([
                'admin_id'       => $adminId,
                'report_slug'    => $slug,
                'view_count'     => 1,
                'last_viewed_at' => now(),
            ]);
        }

        return response()->json(['status' => true]);
    }

    /**
     * Frequently Used reports for the given admin: only reports with
     * view_count >= 5, sorted by view_count desc then last_viewed_at desc.
     * Returns slugs + counts; the frontend matches them to its report registry.
     */
    public function getFrequentlyUsed(Request $request)
    {
        $adminId = intval($request->input('admin_id') ?: $request->query('admin_id', 0));

        if ($adminId <= 0) {
            return response()->json(['status' => true, 'data' => []]);
        }

        $items = ReportView::where('admin_id', $adminId)
            ->where('view_count', '>=', 5)
            ->orderByDesc('view_count')
            ->orderByDesc('last_viewed_at')
            ->get(['report_slug', 'view_count', 'last_viewed_at']);

        return response()->json([
            'status' => true,
            'data'   => $items,
        ]);
    }
}
