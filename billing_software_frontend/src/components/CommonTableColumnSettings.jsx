import { useState, useMemo } from "react";
import {
  Settings,
  X,
  Search,
  RotateCcw,
  Check,
  GripVertical,
  SlidersHorizontal,
} from "lucide-react";

/**
 * CommonTableColumnSettings
 *
 * Universal slide-out drawer for managing table column visibility across all pages.
 *
 * Props:
 * - isOpen (boolean): Controls visibility of the drawer
 * - onClose (function): Callback when closing the drawer
 * - columns (Array): Array of column objects:
 *     [{ key, label, icon?, color?, bg?, desc? }]
 * - visibleColumns (Object): Map of { [key]: boolean }
 * - onToggleColumn (function): (key: string) => void
 * - onSelectAll (function): (val: boolean) => void
 * - onReset (function): () => void
 * - title (string, optional): Drawer title (defaults to "Table Columns")
 * - subtitle (string, optional): Drawer subtitle (defaults to "Show or hide columns in your list")
 */
export default function CommonTableColumnSettings({
  isOpen,
  onClose,
  columns = [],
  visibleColumns = {},
  onToggleColumn,
  onSelectAll,
  onReset,
  title = "Table Columns",
  subtitle = "Show or hide columns in your list",
}) {
  const [columnSearch, setColumnSearch] = useState("");

  const filteredColumns = useMemo(() => {
    if (!columnSearch.trim()) return columns;
    const q = columnSearch.toLowerCase();
    return columns.filter(
      (col) =>
        col.label?.toLowerCase().includes(q) ||
        col.key?.toLowerCase().includes(q) ||
        col.desc?.toLowerCase().includes(q)
    );
  }, [columns, columnSearch]);

  const visibleCount = useMemo(() => {
    return columns.filter((col) => visibleColumns[col.key] !== false).length;
  }, [columns, visibleColumns]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Subtle Backdrop with blur */}
      <div
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-[400px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-250 ease-out border-l border-slate-200">
          
          {/* 1. Header */}
          <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between bg-gradient-to-b from-slate-50/80 to-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
                <Settings size={19} strokeWidth={2.2} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                  {title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {subtitle}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100/80 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer flex-shrink-0"
              title="Close panel"
            >
              <X size={16} strokeWidth={2.4} />
            </button>
          </div>

          {/* 2. Search & Controls Bar */}
          <div className="px-6 py-3.5 border-b border-slate-100 bg-slate-50/40 space-y-3">
            {/* Search input */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter columns..."
                value={columnSearch}
                onChange={(e) => setColumnSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white text-xs text-slate-800 placeholder:text-slate-400 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none transition shadow-2xs"
              />
              {columnSearch && (
                <button
                  onClick={() => setColumnSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs w-4 h-4 flex items-center justify-center rounded-full hover:bg-slate-100 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Visible count badge + Quick actions */}
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-100/80">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                {visibleCount} of {columns.length} visible
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSelectAll && onSelectAll(true)}
                  className="text-[11px] font-semibold text-slate-600 hover:text-emerald-600 hover:bg-white px-2 py-0.5 rounded transition cursor-pointer"
                >
                  Show all
                </button>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={() => onSelectAll && onSelectAll(false)}
                  className="text-[11px] font-semibold text-slate-600 hover:text-red-600 hover:bg-white px-2 py-0.5 rounded transition cursor-pointer"
                >
                  Hide all
                </button>
                {onReset && (
                  <>
                    <span className="text-slate-300">·</span>
                    <button
                      type="button"
                      onClick={onReset}
                      className="text-[11px] font-semibold text-slate-600 hover:text-indigo-600 hover:bg-white px-2 py-0.5 rounded transition cursor-pointer flex items-center gap-1"
                      title="Reset to default visibility"
                    >
                      <RotateCcw size={10} />
                      <span>Reset</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 3. Column List Items */}
          <div className="flex-1 overflow-y-auto px-6 py-3.5 space-y-2 scrollbar-thin scrollbar-thumb-slate-200">
            {filteredColumns.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No column matching &quot;{columnSearch}&quot;
              </div>
            ) : (
              filteredColumns.map((col) => {
                const isChecked = visibleColumns[col.key] !== false;
                const IconComponent = col.icon || SlidersHorizontal;
                const colorClass = col.color || "text-blue-600";
                const bgClass = col.bg || "bg-blue-50";

                return (
                  <div
                    key={col.key}
                    onClick={() => onToggleColumn && onToggleColumn(col.key)}
                    className={`group flex items-center justify-between p-2.5 px-3 rounded-xl border transition-all duration-150 cursor-pointer select-none ${
                      isChecked
                        ? "bg-white border-slate-200 shadow-2xs hover:border-blue-300 hover:shadow-xs"
                        : "bg-slate-50/70 border-slate-200/60 opacity-60 hover:opacity-90 hover:bg-slate-50"
                    }`}
                  >
                    {/* Left: Drag dots + Icon + Label & Desc */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <GripVertical
                        size={13}
                        className="text-slate-300 group-hover:text-slate-400 transition flex-shrink-0"
                      />

                      <div
                        className={`w-8 h-8 rounded-lg ${bgClass} ${colorClass} flex items-center justify-center flex-shrink-0 shadow-2xs`}
                      >
                        <IconComponent size={15} strokeWidth={2.2} />
                      </div>

                      <div className="min-w-0">
                        <div
                          className={`text-xs tracking-tight ${
                            isChecked
                              ? "font-bold text-slate-800"
                              : "font-medium text-slate-600"
                          }`}
                        >
                          {col.label}
                        </div>
                        {col.desc && (
                          <div className="text-[10.5px] text-slate-400 truncate">
                            {col.desc}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Modern iOS Toggle Switch */}
                    <div
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out flex-shrink-0 ${
                        isChecked ? "app-toggle-active" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          isChecked ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 4. Drawer Footer */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-brand-600 font-semibold">
              <Check size={14} strokeWidth={2.5} />
              <span className="text-[11px]">Saved automatically</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="app-btn-primary px-6 py-2 text-xs font-bold rounded-xl transition transform active:scale-95 cursor-pointer"
            >
              Done
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
