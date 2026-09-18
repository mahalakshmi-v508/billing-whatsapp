import React from "react";
import { Search, ChevronLeft, ChevronRight, Inbox } from "lucide-react";

export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = "No records found",
  searchPlaceholder = "Search records...",
  searchValue,
  onSearchChange,
  actions,
  filters,
  pagination,
  onRowClick,
  className = "",
}) {
  return (
    <div className={`psx-table-container ${className}`}>
      {/* Top action / filter toolbar if provided */}
      {(onSearchChange || actions || filters) && (
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white">
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            {onSearchChange && (
              <div className="relative min-w-[240px] max-w-sm flex-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchValue || ""}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
            )}
            {filters}
          </div>

          {actions && (
            <div className="flex items-center gap-2 flex-wrap">{actions}</div>
          )}
        </div>
      )}

      {/* Table content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse psx-table">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`${col.className || ""} ${
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                      ? "text-center"
                      : "text-left"
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx} className="animate-pulse">
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} className="py-4">
                      <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                      <Inbox size={24} className="text-slate-300" />
                    </div>
                    <p className="text-sm font-medium text-slate-600">
                      {emptyMessage}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Try adjusting your filters or search terms
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, rIdx) => (
                <tr
                  key={row.id || rIdx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`transition-colors duration-150 ${
                    onRowClick ? "cursor-pointer" : ""
                  }`}
                >
                  {columns.map((col, cIdx) => (
                    <td
                      key={cIdx}
                      className={`${col.className || ""} ${
                        col.align === "right"
                          ? "text-right"
                          : col.align === "center"
                          ? "text-center"
                          : "text-left"
                      }`}
                    >
                      {typeof col.accessor === "function"
                        ? col.accessor(row, rIdx)
                        : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer if provided */}
      {pagination && (
        <div className="p-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-800">
              {pagination.from || 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-800">
              {pagination.to || data.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-800">
              {pagination.total || data.length}
            </span>{" "}
            results
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={pagination.onPrev}
              disabled={pagination.currentPage <= 1}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>
            <span className="px-3 py-1 font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg">
              {pagination.currentPage || 1}
            </span>
            <button
              onClick={pagination.onNext}
              disabled={pagination.currentPage >= (pagination.totalPages || 1)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
