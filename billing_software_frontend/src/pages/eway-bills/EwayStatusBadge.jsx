import React from "react";
import { CheckCircle2, Clock, AlertTriangle, XCircle, AlertCircle } from "lucide-react";

export default function EwayStatusBadge({ status, size = "md" }) {
  const configs = {
    Active: {
      tone: "bg-emerald-50 text-emerald-700 border-emerald-200/80 ring-emerald-500/10",
      dot: "bg-emerald-500",
      icon: CheckCircle2,
      label: "Active",
    },
    "Expiring Soon": {
      tone: "bg-amber-50 text-amber-700 border-amber-200/80 ring-amber-500/10 animate-pulse",
      dot: "bg-amber-500",
      icon: Clock,
      label: "Expiring Soon",
    },
    Expired: {
      tone: "bg-slate-100 text-slate-600 border-slate-200 ring-slate-500/10",
      dot: "bg-slate-400",
      icon: AlertTriangle,
      label: "Expired",
    },
    Cancelled: {
      tone: "bg-rose-50 text-rose-700 border-rose-200/80 ring-rose-500/10",
      dot: "bg-rose-500",
      icon: XCircle,
      label: "Cancelled",
    },
    Failed: {
      tone: "bg-red-50 text-red-700 border-red-200/80 ring-red-500/10",
      dot: "bg-red-500",
      icon: AlertCircle,
      label: "Failed",
    },
  };

  const current = configs[status] || {
    tone: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
    icon: CheckCircle2,
    label: status || "Unknown",
  };

  const Icon = current.icon;

  const sizeClasses =
    size === "sm"
      ? "text-[10px] px-2 py-0.5 gap-1"
      : size === "lg"
      ? "text-xs px-3 py-1 gap-1.5 font-extrabold"
      : "text-[11px] px-2.5 py-0.5 gap-1.5 font-bold";

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-2xs select-none tracking-tight ${current.tone} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
      <Icon size={size === "sm" ? 10 : 12} />
      <span>{current.label}</span>
    </span>
  );
}
