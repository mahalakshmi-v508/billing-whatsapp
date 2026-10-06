import { useCallback, useEffect, useState } from "react";
import {
  X,
  History,
  User,
  Globe,
  ShieldCheck,
  Minus,
  Plus,
  Inbox,
} from "lucide-react";
import { fetchRecordHistory, isAuditEnabled } from "./auditApi";
import { actionStyle, describeChanges, formatTime, roleLabel } from "./auditUi";

/**
 * Per-record History drawer.
 *
 * Mirrors the bill "History" drawer and is intended to be dropped next to a
 * record's other actions, e.g. the Records button in CustomerList. It stays
 * hidden unless the audit log is switched on in Settings.
 */
export default function AuditLogRecordDrawer({ open, onClose, recordType, recordId, recordLabel = "" }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [enabled, setEnabled] = useState(() => isAuditEnabled());

  useEffect(() => {
    const sync = () => setEnabled(isAuditEnabled());
    window.addEventListener("company-settings-updated", sync);
    return () => window.removeEventListener("company-settings-updated", sync);
  }, []);

  const load = useCallback(async () => {
    if (!open || !recordType || !recordId) return;

    setLoading(true);
    setError("");
    try {
      setRows(await fetchRecordHistory(recordType, recordId));
    } catch {
      setError("Could not load the history for this record.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [open, recordType, recordId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!enabled || !open) return null;

  const toggle = (id) => setExpanded((current) => (current === id ? null : id));

  return (
    <div className="fixed inset-0 z-[10500]">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl flex flex-col animate-slide-in-right"
        role="dialog"
        aria-modal="true"
        aria-label={`Audit history${recordLabel ? ` for ${recordLabel}` : ""}`}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-blue-50 flex items-start justify-between gap-3 flex-shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
              <History size={18} className="text-indigo-600" /> Audit History
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {recordLabel ? `${recordType} · ${recordLabel}` : recordType} · {rows.length} entries
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200/60 text-slate-500 flex items-center justify-center cursor-pointer flex-shrink-0"
            aria-label="Close history"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
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
              <p className="text-sm font-bold text-slate-600">No audit logs recorded yet.</p>
              <p className="text-xs text-slate-400 mt-1">
                Changes made to this record will appear here.
              </p>
            </div>
          )}

          {!error && rows.length === 0 && loading && (
            <div className="py-16 text-center text-xs font-semibold text-slate-400">
              Loading history…
            </div>
          )}

          {rows.map((log) => {
            const style = actionStyle(log.action);
            const isOpen = expanded === log.id;
            const hasDiff = Boolean(log.old_values || log.new_values);

            return (
              <div
                key={log.id}
                className="border border-slate-200 rounded-xl overflow-hidden bg-white hover:border-indigo-200 transition"
              >
                <div className="flex gap-3 p-3">
                  <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${style.dot}`} />

                  <div className="flex-1 min-w-0 space-y-1">
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
                        {log.user_role ? ` · ${roleLabel(log.user_role)}` : ""}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck size={11} className="text-slate-400" />
                        {formatTime(log.created_at)} ·{" "}
                        {new Date(log.created_at).toLocaleDateString("en-GB")}
                      </span>
                      {log.ip_address && (
                        <span className="inline-flex items-center gap-1">
                          <Globe size={11} className="text-slate-400" />
                          {log.ip_address}
                        </span>
                      )}
                    </div>

                    {hasDiff && (
                      <button
                        onClick={() => toggle(log.id)}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer inline-flex items-center gap-1 mt-0.5"
                      >
                        {isOpen ? <Minus size={11} /> : <Plus size={11} />}
                        {isOpen ? "Hide details" : "View changes"}
                      </button>
                    )}
                  </div>
                </div>

                {isOpen && hasDiff && (
                  <div className="border-t border-slate-100 bg-slate-50 p-3">
                    {(() => {
                      const diff = describeChanges(log);
                      return (
                        <div className="space-y-2">
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
                                  <span className="text-indigo-400 font-bold flex-shrink-0">•</span>
                                  <span>{sentence}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}