/*
 * Real user report-usage tracking for the "Frequently Used" dropdown.
 *
 * This module has ZERO hardcoded report names. View counts are persisted on the
 * BACKEND in the `report_views` table (see ReportViewController). The frontend:
 *   - records a view via POST /report/record_view
 *   - fetches frequently used reports via GET /report/frequently_used
 * The returned slugs are matched against the existing report registry
 * (reportNavigation.js) — never the display name.
 *
 * Backend rule: only reports with view_count >= 5 are returned, sorted by
 * view_count desc then last_viewed_at desc.
 */

import api from "../../services/api";
import { reports } from "./reportNavigation";

/** Derive the admin id exactly like the rest of the app sessions. */
function getAdminId() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user?.role === "admin" ? user?.id : user?.admin_id || null;
  } catch {
    return null;
  }
}

/**
 * Record ONE successful view of the report identified by `reportId` (slug).
 * Send-and-forget POST. Callers guard idempotency per page visit (ReportsLayout
 * uses the navigation key so a single page entry = one POST, and thus one
 * view_count increment on the backend).
 */
export async function recordReportView(reportId) {
  if (!reportId) return;
  const adminId = getAdminId();
  if (!adminId) return;
  try {
    await api.post("/report/record_view", {
      admin_id: adminId,
      report_slug: reportId,
    });
  } catch {
    // ignore network / backend failures — a failed view never blocks the page
  }
}

/**
 * "Frequently Used" — fetched from the backend and matched against the report
 * registry. Returns report objects for slugs the backend reports as frequent,
 * sorted by viewCount desc then lastViewedAt desc. Never a manual/predefined
 * list — a report becomes eligible only after the user actually views it 5+ times.
 */
export async function getFrequentlyUsedReports() {
  const adminId = getAdminId();
  if (!adminId) return [];
  try {
    const res = await api.get("/report/frequently_used", {
      params: { admin_id: adminId },
    });
    if (!res.data?.status || !Array.isArray(res.data.data)) return [];

    const bySlug = {};
    res.data.data.forEach((r) => {
      bySlug[r.report_slug] = {
        viewCount: Number(r.view_count) || 0,
        lastViewedAt: r.last_viewed_at ? new Date(r.last_viewed_at).getTime() : 0,
      };
    });

    return reports
      .map((report) => {
        const u = bySlug[report.slug];
        return u ? { ...report, viewCount: u.viewCount, lastViewedAt: u.lastViewedAt } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.viewCount - a.viewCount || b.lastViewedAt - a.lastViewedAt);
  } catch {
    return [];
  }
}
