import React from "react";
import { Truck, Plus, Search, FileText } from "lucide-react";

export default function EwayEmptyState({
  title = "No E-Way Bills Found",
  description = "Generated E-Way Bills will automatically appear here for real-time tracking.",
  actionLabel = "Generate E-Way Bill",
  onAction,
  icon: Icon = Truck,
}) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 md:p-14 text-center flex flex-col items-center justify-center max-w-xl mx-auto shadow-2xs">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4 shadow-2xs">
        <Icon size={26} strokeWidth={2} />
      </div>
      <h3 className="text-base font-bold text-slate-800 tracking-tight">{title}</h3>
      <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">{description}</p>

      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold transition shadow-sm shadow-blue-500/20 cursor-pointer"
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}
