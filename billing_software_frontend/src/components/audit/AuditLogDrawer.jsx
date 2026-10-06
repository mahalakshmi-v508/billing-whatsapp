import { useCallback, useEffect, useMemo, useState } from "react";
import {
  X,
  History,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  User,
  Globe,
  FileText,
  Download,
  ShieldCheck,
  Inbox,
} from "lucide-react";
import { fetchAuditLogs, fetchAuditFilters, fetchAuditSummary, logsToCsv } from "./auditApi";
import { actionStyle, describeChanges, formatTime, groupByDay, roleLabel } from "./auditUi";

/**
 * Right-side Audit History drawer.
 *
 * Styling intentionally mirrors the bill "History" drawer (slide-in panel, header
 * with count, scrollable body, footer pager) so the two read as the same surface.
 */
export default function AuditLogDrawer({ open, onClose, initialModule = "" }) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [filters, setFilters] = useState({ modules: [], actions: [], users: [] });
  const [summary, setSummary] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [module, setModule] = useState(initialModule || "all");
  const [action, setAction] = useState("all");
  const [userId, setUserId] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const query = useMemo(
    () => ({
      module: module === "all" ? "" : module,
      action: action === "all" ? "" : action,
      user_id: userId === "all" ? "" : userId,
      from,
      to,
      search,
      page,
      per_page: 25,
    }),
    [module, action, userId, from, to, search, page]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { rows: data, meta: pageMeta } = await fetchAuditLogs(query);
      setRows(data);
      setMeta(pageMeta);
    } catch {
      setError("Could not load the audit trail. Please try again.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (!open) return;
    load();
  }, [open, load]);

  // Escape closes the drawer, matching the existing modal behaviour.
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    fetchAuditFilters()
      .then(setFilters)
      .catch(() => setFilters({ modules: [], actions: [], users: [] }));

    fetchAuditSummary()
      .then(setSummary)
      .catch(() => setSummary(null));
  }, [open]);

  // A different page (e.g. from the Invoice list) may preset the module filter.
  useEffect(() => {
    setModule(initialModule || "all");
    setPage(1);
  }, [initialModule]);

  // Debounce free-text search so typing does not fire a request per keystroke.
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => setPage(1), 350);
    return () => clearTimeout(timer);
  }, [search, open]);

  const handleExport = () => {
    const csv = logsToCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setModule("all");
    setAction("all");
    setUserId("all");
    setFrom("");
    setTo("");
    setSearch("");
    setPage(1);
  };

  const activeFilterCount = [module, action, userId, from, to, search].filter(
    (value) => value && value !== "all"
  ).length;

  const dayGroups = groupByDay(rows);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10500]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col animate-slide-in-right"
        role="dialog"
        aria-modal="true"
        aria-label="Audit log history"
      >
        {/* ── Header ── */}
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-blue-50 flex items-start justify-between gap-3 flex-shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
              <History size={18} className="text-indigo-600" /> Audit Log
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Every create, edit, delete and status change across all modules
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleExport}
              disabled={rows.length === 0}
              title="Export current page as CSV"
              className="w-8 h-8 rounded-lg hover:bg-white/80 text-slate-500 hover:text-indigo-600 flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <Download size={15} />
            </button>
            <button
              onClick={load}
              disabled={loading}
              title="Refresh"
              className="w-8 h-8 rounded-lg hover:bg-white/80 text-slate-500 hover:text-indigo-600 flex items-center justify-center cursor-pointer disabled:opacity-40 transition"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-slate-200/60 text-slate-500 flex items-center justify-center cursor-pointer"
              aria-label="Close audit log"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Counters ── */}
        {summary && (
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 grid grid-cols-3 gap-3 flex-shrink-0">
            {[
              { label: "Today", value: summary.today, tone: "text-indigo-600" },
              { label: "Last 7 Days", value: summary.week, tone: "text-blue-600" },
              { label: "All Time", value: summary.total, tone: "text-slate-900" },
            ].map((card) => (
              <div key={card.label} className="bg-white border border-slate-200 rounded-xl px-3 py-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  {card.label}
                </div>
                <div className={`text-base font-extrabold ${card.tone}`}>{card.value ?? 0}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Search + filters ── */}
        <div className="px-5 py-3 border-b border-slate-100 space-y-2.5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search actions, records or users…"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
              />
            </div>
            <button
              onClick={() => setShowFilters((value) => !value)}
              title="Filters"
              className={`relative h-9 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition ${
                showFilters || activeFilterCount
                  ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Filter size={14} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown
                size={13}
                className={`transition-transform ${showFilters ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              <select
                value={module}
                onChange={(e) => {
                  setModule(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">All Modules</option>
                {filters.modules.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <select
                value={action}
                onChange={(e) => {
                  setAction(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">All Actions</option>
                {filters.actions.map((item) => (
                  <option key={item} value={item}>
                    {String(item).replace(/_/g, " ")}
                  </option>
                ))}
              </select>

              <select
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">All Users</option>
                {filters.users.map((item) => (
                  <option key={item.user_id ?? item.user_name} value={item.user_id ?? ""}>
                    {item.user_name || "Unknown"}
                    {item.user_role ? ` (${roleLabel(item.user_role)})` : ""}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />

              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 cursor-pointer transition"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Timeline ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          {!error && rows.length === 0 && !loading && (
            <div className="py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-300 flex items-center justify-center mx-auto mb-3">
                <Inbox size={24} />
              </div>
              <p className="text-sm font-bold text-slate-600">No audit entries found</p>
              <p className="text-xs text-slate-400 mt-1">
                Actions you perform across the app will be recorded here.
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {!error && rows.length === 0 && loading && (
            <div className="py-16 text-center text-xs font-semibold text-slate-400">
              Loading audit trail…
            </div>
          )}

          {dayGroups.map((group) => (
            <div key={group.key} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {group.key}
                </span>
                <span className="flex-1 h-px bg-slate-100" />
                <span className="text-[10px] font-bold text-slate-300">{group.rows.length}</span>
              </div>

              {group.rows.map((log) => {
                const style = actionStyle(log.action);
                return (
                  <div
                    key={log.id}
                    className="group flex gap-3 bg-white border border-slate-200 rounded-xl p-3 hover:border-indigo-200 hover:shadow-sm transition"
                  >
                    {/* Action marker */}
                    <div className="flex flex-col items-center pt-0.5 flex-shrink-0">
                      <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                      <span className="text-[10px] font-semibold text-slate-400 mt-1">
                        {formatTime(log.created_at)}
                      </span>
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold text-slate-800 leading-snug">
                          {log.description || `${log.module} ${log.action}`}
                        </p>
                        <span
                          className={`inline-flex items-center shrink-0 text-[10px] font-bold border rounded-full px-2 py-0.5 ${style.chip}`}
                        >
                          {style.label}
                        </span>
                      </div>

                      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <User size={11} className="text-slate-400" />
                          {log.user_name || "System User"}
                          {log.user_role ? (
                            <span className="text-slate-400">· {roleLabel(log.user_role)}</span>
                          ) : null}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <ShieldCheck size={11} className="text-slate-400" />
                          {log.module}
                        </span>
                        {log.record_label && (
                          <span className="inline-flex items-center gap-1 min-w-0">
                            <FileText size={11} className="text-slate-400" />
                            <span className="font-semibold text-slate-600 truncate max-w-[10rem]">
                              {log.record_label}
                            </span>
                            {log.record_type && (
                              <span className="text-slate-400 truncate">{log.record_type}</span>
                            )}
                          </span>
                        )}
                        {log.ip_address && (
                          <span className="inline-flex items-center gap-1">
                            <Globe size={11} className="text-slate-400" />
                            {log.ip_address}
                          </span>
                        )}
                      </div>

                      {log.endpoint && (
                        <p className="font-mono text-[10px] text-slate-400 truncate">
                          {log.endpoint}
                        </p>
                      )}

                      {/* Before/after snapshot - for deletes this is the whole story */}
                      {(log.old_values || log.new_values) && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpanded((current) => (current === log.id ? null : log.id))
                          }
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer flex items-center gap-1"
                        >
                          <ChevronDown
                            size={11}
                            className={`transition-transform ${
                              expanded === log.id ? "rotate-180" : ""
                            }`}
                          />
                          {expanded === log.id ? "Hide details" : "View details"}
                        </button>
                      )}

                      {expanded === log.id &&
                        (() => {
                          const diff = describeChanges(log);
                          return (
                            <div className="pt-0.5 space-y-2">
                              <p className="text-[11px] font-semibold text-indigo-700 leading-snug">
                                {diff.intro}
                              </p>

                              {diff.sentences.length > 0 && (
                                <ul className="space-y-1">
                                  {diff.sentences.map((sentence, i) => (
                                    <li
                                      key={i}
                                      className="flex gap-1.5 text-[11px] text-slate-600 leading-relaxed"
                                    >
                                      <span className="text-indigo-400 font-bold flex-shrink-0">
                                        •
                                      </span>
                                      <span>{sentence}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          );
                        })()}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* ── Footer pager ── */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between flex-shrink-0">
          <span className="text-[11px] font-semibold text-slate-500">
            {meta.total > 0
              ? `${meta.from ?? 0}–${meta.to ?? 0} of ${meta.total} entries`
              : "No entries"}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={meta.current_page <= 1 || loading}
              className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition"
              aria-label="Previous page"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-[11px] font-bold text-slate-600 px-1">
              {meta.current_page} / {Math.max(1, meta.last_page)}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
              disabled={meta.current_page >= meta.last_page || loading}
              className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition"
              aria-label="Next page"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}