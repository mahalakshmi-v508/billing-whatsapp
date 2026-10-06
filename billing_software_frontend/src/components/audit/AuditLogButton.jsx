import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getAuditSettings } from "./auditApi";

/**
 * The single Audit Log trigger mounted in the app shell header.
 *
 * It lives in the layout rather than on individual pages, so it is available
 * on every screen. Clicking it navigates to the full Audit Log page
 * (/audit-log). Visibility follows the on/off switch in
 * Settings → General → Audit Log.
 */
export default function AuditLogButton({ className = "" }) {
  const navigate = useNavigate();

  // Master switch plus the separate "show button in header" preference.
  const isAuditSettingsOn = () => {
    const settings = getAuditSettings();
    return Boolean(settings.enabled && settings.showHeaderButton);
  };

  const [enabled, setEnabled] = useState(isAuditSettingsOn);

  // settingsApi dispatches this after the settings page saves, so the button
  // appears/disappears without needing a page reload.
  useEffect(() => {
    const sync = () => setEnabled(isAuditSettingsOn());
    window.addEventListener("company-settings-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("company-settings-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!enabled) return null;

  return (
    <button
      type="button"
      onClick={() => navigate("/audit-log")}
      title="Audit Log"
      className={`h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-xs flex items-center gap-2 text-xs font-bold transition cursor-pointer flex-shrink-0 ${className}`}
    >
      <History size={15} className="text-indigo-600" />
      <span className="hidden sm:inline">Audit Log</span>
    </button>
  );
}