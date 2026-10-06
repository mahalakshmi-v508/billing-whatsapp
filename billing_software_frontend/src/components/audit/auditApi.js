import api from "../../services/api";

/** Mirrors the settings key the backend reads (audit_log.enabled). */
export const AUDIT_SETTINGS_KEY = "audit_log";

export const DEFAULT_AUDIT_SETTINGS = {
  enabled: true,
  showHeaderButton: true,
  showPerRecordHistory: true,
  logDeletes: true,
  logReads: false,
  retentionDays: 0, // 0 = keep forever
};

function getCompanyId() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user?.company_id) return user.company_id;
    const selected = localStorage.getItem("selected_company_id");
    if (selected && /^\d+$/.test(selected)) return Number(selected);
  } catch {
    /* ignore */
  }
  return null;
}

function readSettings() {
  try {
    const raw = localStorage.getItem("company_settings_cache");
    if (!raw) return { ...DEFAULT_AUDIT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_AUDIT_SETTINGS, ...(parsed?.[AUDIT_SETTINGS_KEY] || {}) };
  } catch {
    return { ...DEFAULT_AUDIT_SETTINGS };
  }
}

/**
 * Live audit settings for the current company.
 *
 * The company_settings JSON blob is already mirrored into localStorage by
 * settingsApi, so this reads synchronously and re-reads whenever the settings
 * page saves. That keeps the header button's visibility in sync with the
 * on/off toggle without an extra request on every page.
 */
export function getAuditSettings() {
  return readSettings();
}

export function isAuditEnabled() {
  return Boolean(readSettings().enabled);
}

function companyParams(extra = {}) {
  const companyId = getCompanyId();
  return { company_id: companyId, ...extra };
}

/** Paginated audit trail with optional filters. */
export async function fetchAuditLogs(params = {}) {
  const companyId = getCompanyId();
  if (!companyId) return { rows: [], meta: { current_page: 1, last_page: 1, total: 0 } };

  const res = await api.get("/audit-log/list", {
    params: companyParams({ per_page: 25, ...params }),
  });

  return {
    rows: res.data?.data || [],
    meta: res.data?.meta || { current_page: 1, last_page: 1, total: 0 },
  };
}

/** Distinct modules / actions / users for the filter dropdowns. */
export async function fetchAuditFilters() {
  const companyId = getCompanyId();
  if (!companyId) return { modules: [], actions: [], users: [], record_types: [] };

  const res = await api.get("/audit-log/filters", { params: companyParams() });
  return res.data?.data || { modules: [], actions: [], users: [], record_types: [] };
}

/** Headline counters (total / today / this week). */
export async function fetchAuditSummary() {
  const companyId = getCompanyId();
  if (!companyId) return null;

  const res = await api.get("/audit-log/summary", { params: companyParams() });
  return res.data?.data || null;
}

/** Trail for one specific record, powering per-row History buttons. */
export async function fetchRecordHistory(recordType, recordId, limit = 50) {
  const companyId = getCompanyId();
  if (!companyId || !recordType || !recordId) return [];

  const res = await api.get("/audit-log/for-record", {
    params: companyParams({ record_type: recordType, record_id: recordId, limit }),
  });
  return res.data?.data || [];
}

/** Purge the trail (optionally only entries older than a date). */
export async function clearAuditLogs(before = null) {
  const companyId = getCompanyId();
  if (!companyId) return { status: false };

  const res = await api.post("/audit-log/clear", { company_id: companyId, before });
  return res.data;
}

/** Flatten the current filter set into CSV for export. */
export function logsToCsv(rows) {
  const headers = [
    "Date",
    "User",
    "Role",
    "Module",
    "Action",
    "Description",
    "Record",
    "Record Id",
    "IP Address",
    "Endpoint",
  ];

  const escape = (value) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const lines = [headers.join(",")];
  rows.forEach((row) => {
    lines.push(
      [
        row.created_at,
        row.user_name,
        row.user_role,
        row.module,
        row.action,
        row.description,
        row.record_label,
        row.record_id,
        row.ip_address,
        row.endpoint,
      ]
        .map(escape)
        .join(",")
    );
  });

  return lines.join("\n");
}