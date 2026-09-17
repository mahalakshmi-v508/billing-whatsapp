import { useState } from "react";
import { Search, Printer, X } from "lucide-react";

export default function TableContainer({
  title,
  badge,
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search...",
  onExportExcel,
  onPrint,
  actions,
  headerRight,
  children,
  className = "",
  showHeader = true,
}) {
  const [showSearchInput, setShowSearchInput] = useState(Boolean(searchQuery));

  const hasHeader =
    showHeader &&
    (title || badge !== undefined || onSearchChange || onExportExcel || onPrint || actions || headerRight);

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden ${className}`}
    >
      {hasHeader && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
          {/* Title & Badge */}
          <div className="flex items-center gap-2.5">
            {title && <h2 className="text-base font-bold text-slate-800 tracking-tight">{title}</h2>}
            {badge !== undefined && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {badge}
              </span>
            )}
          </div>

          {/* Action Tools / Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Inline Search Toggle */}
            {onSearchChange && (
              <>
                {showSearchInput ? (
                  <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full text-xs animate-in fade-in duration-150">
                    <Search size={13} className="text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder={searchPlaceholder}
                      value={searchQuery || ""}
                      onChange={(e) => onSearchChange(e.target.value)}
                      autoFocus
                      className="bg-transparent text-xs text-slate-700 outline-none w-44"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowSearchInput(false);
                        onSearchChange("");
                      }}
                      className="text-slate-400 hover:text-slate-600 ml-1 text-xs cursor-pointer"
                      title="Clear & Close Search"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSearchInput(true)}
                    className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                    title="Search"
                  >
                    <Search size={16} />
                  </button>
                )}
              </>
            )}

            {/* Excel Export Button */}
            {onExportExcel && (
              <button
                type="button"
                onClick={onExportExcel}
                className="w-8 h-8 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                title="Export to Excel (.xlsx)"
              >
                <span className="bg-emerald-600 text-white font-extrabold text-[10px] px-1.5 py-0.5 rounded leading-none shadow-2xs">
                  xls
                </span>
              </button>
            )}

            {/* Print Button */}
            {onPrint && (
              <button
                type="button"
                onClick={onPrint}
                className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                title="Print View"
              >
                <Printer size={16} />
              </button>
            )}

            {/* Custom Action Slots */}
            {actions}
            {headerRight}
          </div>
        </div>
      )}

      {/* Table Container with Horizontal Scroll */}
      <div className="overflow-x-auto w-full">{children}</div>
    </div>
  );
}
