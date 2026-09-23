import { useState, useEffect } from "react";
import { Settings, X, Search, RotateCcw } from "lucide-react";

/**
 * Reusable slide-in drawer for customizing table columns.
 */
export default function CommonTableColumnSettings({
  isOpen,
  onClose,
  columns = [],
  visibleColumns = {},
  onToggleColumn,
  onSelectAll,
  onReset,
  title = "Customise Columns",
  subtitle = "Choose visible table fields",
}) {
  const [columnSearch, setColumnSearch] = useState("");

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredColumns = columns.filter((c) =>
    (c.label || c.key || "").toLowerCase().includes(columnSearch.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Settings size={16} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
              <p className="text-[11px] text-slate-400">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Quick Actions & Search */}
        <div className="p-4 border-b border-slate-100 space-y-2.5">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter columns..."
              value={columnSearch}
              onChange={(e) => setColumnSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500 font-medium transition"
            />
          </div>

          <div className="flex items-center justify-between text-[11px]">
            {onSelectAll && (
              <button
                type="button"
                onClick={() => onSelectAll(true)}
                className="text-indigo-600 font-bold hover:underline cursor-pointer"
              >
                Select All
              </button>
            )}
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer font-medium"
              >
                <RotateCcw size={11} />
                <span>Reset Default</span>
              </button>
            )}
          </div>
        </div>

        {/* Columns List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredColumns.map((col) => {
            const Icon = col.icon;
            const isChecked = Boolean(visibleColumns[col.key]);

            return (
              <label
                key={col.key}
                className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                  isChecked
                    ? "bg-indigo-50/40 border-indigo-200 text-slate-900"
                    : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  {Icon && (
                    <div
                      className={`w-7 h-7 rounded-lg ${col.bg || "bg-indigo-50"} ${
                        col.color || "text-indigo-600"
                      } flex items-center justify-center shrink-0`}
                    >
                      <Icon size={14} />
                    </div>
                  )}
                  <div>
                    <span className="font-bold text-xs block">{col.label}</span>
                    {col.desc && <span className="text-[10px] text-slate-400 block">{col.desc}</span>}
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggleColumn && onToggleColumn(col.key)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
              </label>
            );
          })}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/70">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
