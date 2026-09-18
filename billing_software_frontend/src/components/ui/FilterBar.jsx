import React from "react";
import { Filter, RotateCcw } from "lucide-react";

export default function FilterBar({
  children,
  onReset,
  className = "",
}) {
  return (
    <div
      className={`bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-3 ${className}`}
    >
      <div className="flex items-center gap-2.5 flex-wrap flex-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">
          <Filter size={14} className="text-indigo-500" />
          <span>Filters</span>
        </div>
        {children}
      </div>

      {onReset && (
        <button
          onClick={onReset}
          className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition"
        >
          <RotateCcw size={12} />
          <span>Reset</span>
        </button>
      )}
    </div>
  );
}
