import { useSyncExternalStore } from "react";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { getReportToasts, subscribeReportToast } from "../../utils/reportToast";

const KIND_ICON = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
};

const KIND_BG = {
  success: "linear-gradient(135deg,#16a34a,#22c55e)",
  error: "linear-gradient(135deg,#dc2626,#ef4444)",
  warning: "linear-gradient(135deg,#d97706,#f59e0b)",
};

const toastStyle = {
  position: "fixed",
  top: 20,
  right: 20,
  zIndex: 99999,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  pointerEvents: "none",
};

const itemStyle = {
  pointerEvents: "auto",
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "12px 16px",
  borderRadius: 12,
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  boxShadow: "0 10px 30px rgba(15,23,42,.22)",
  minWidth: 260,
  maxWidth: 380,
  animation: "reportToastIn .28s ease both",
};

/**
 * Shared toast host for the Reports section. Mounted once in ReportsLayout.
 * Renders toasts pushed via showToast() from src/utils/reportToast.js.
 */
export default function ReportToaster() {
  const toasts = useSyncExternalStore(subscribeReportToast, getReportToasts);

  return (
    <>
      <style>
        {`@keyframes reportToastIn { from { opacity: 0; transform: translateX(120%); } to { opacity: 1; transform: none; } }`}
      </style>
      {toasts.length > 0 && (
        <div style={toastStyle}>
          {toasts.map((t) => {
            const Icon = KIND_ICON[t.kind] || CheckCircle2;
            return (
              <div key={t.id} style={{ ...itemStyle, background: KIND_BG[t.kind] || KIND_BG.success }}>
                <Icon size={17} style={{ flexShrink: 0 }} />
                <span>{t.message}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}