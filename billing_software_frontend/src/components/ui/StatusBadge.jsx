import React from "react";

const VARIANTS = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200/80 ring-emerald-500/10",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200/80 ring-emerald-500/10",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200/80 ring-emerald-500/10",
  warning: "bg-amber-50 text-amber-700 border-amber-200/80 ring-amber-500/10",
  pending: "bg-amber-50 text-amber-700 border-amber-200/80 ring-amber-500/10",
  partial: "bg-amber-50 text-amber-700 border-amber-200/80 ring-amber-500/10",
  danger: "bg-rose-50 text-rose-700 border-rose-200/80 ring-rose-500/10",
  failed: "bg-rose-50 text-rose-700 border-rose-200/80 ring-rose-500/10",
  overdue: "bg-rose-50 text-rose-700 border-rose-200/80 ring-rose-500/10",
  unpaid: "bg-rose-50 text-rose-700 border-rose-200/80 ring-rose-500/10",
  info: "bg-indigo-50 text-indigo-700 border-indigo-200/80 ring-indigo-500/10",
  primary: "bg-indigo-50 text-indigo-700 border-indigo-200/80 ring-indigo-500/10",
  neutral: "bg-slate-50 text-slate-600 border-slate-200 ring-slate-500/10",
  draft: "bg-slate-100 text-slate-600 border-slate-200 ring-slate-500/10",
  inactive: "bg-slate-100 text-slate-500 border-slate-200 ring-slate-500/10",
};

export default function StatusBadge({ status, label, dot = true, size = "md" }) {
  const norm = String(status || "").toLowerCase().replace(/[\s-_]/g, "");
  
  let key = "neutral";
  if (["paid", "active", "completed", "success", "collected"].includes(norm)) key = "success";
  else if (["pending", "partial", "partiallypaid", "partially_paid", "trial"].includes(norm)) key = "warning";
  else if (["unpaid", "failed", "overdue", "rejected", "danger"].includes(norm)) key = "danger";
  else if (["sent", "info", "open", "in_progress", "inprogress"].includes(norm)) key = "info";

  const styleClass = VARIANTS[key] || VARIANTS.neutral;
  const displayText = label || status || "Unknown";

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[11px]",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  };

  const dotColors = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
    info: "bg-indigo-500",
    neutral: "bg-slate-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ring-1 ${sizeClasses[size]} ${styleClass}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
            dotColors[key] || "bg-slate-400"
          }`}
        />
      )}
      <span className="capitalize">{displayText}</span>
    </span>
  );
}
