export default function TableStatusBadge({
  status = "",
  variant,
  label,
  dot = false,
  className = "",
}) {
  const normStatus = String(status || "").toLowerCase().trim();

  // Determine semantic tone
  let tone = "neutral";
  if (
    variant === "success" ||
    ["paid", "settled", "active", "completed", "success", "resolved", "approved", "ok", "submitted"].includes(
      normStatus
    )
  ) {
    tone = "success";
  } else if (
    variant === "danger" ||
    ["unpaid", "inactive", "danger", "cancelled", "rejected", "overdue", "out", "out of stock", "expired"].includes(
      normStatus
    )
  ) {
    tone = "danger";
  } else if (
    variant === "warning" ||
    ["partial", "pending", "warning", "draft", "low", "low stock", "in_progress", "waiting_for_customer", "open"].includes(
      normStatus
    )
  ) {
    tone = "warning";
  } else if (
    variant === "info" ||
    ["info", "in transporter", "in_transit", "processing"].includes(normStatus)
  ) {
    tone = "info";
  }

  const toneClasses = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
  };

  const dotClasses = {
    success: "bg-emerald-500",
    danger: "bg-rose-500",
    warning: "bg-amber-500",
    info: "bg-blue-500",
    neutral: "bg-slate-400",
  };

  const displayLabel = label || status || "-";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wide border ${
        toneClasses[tone] || toneClasses.neutral
      } ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${dotClasses[tone] || dotClasses.neutral}`}
        />
      )}
      <span>{displayLabel}</span>
    </span>
  );
}
