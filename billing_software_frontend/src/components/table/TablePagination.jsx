import { ChevronLeft, ChevronRight } from "lucide-react";

export default function TablePagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  rowsPerPage = 15,
  onPageChange,
  onRowsPerPageChange,
  itemLabel = "entries",
  rowsOptions = [10, 15, 25, 50, 100],
  className = "",
}) {
  if (totalItems <= 0) return null;

  const safePage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));
  const startItem = (safePage - 1) * rowsPerPage + 1;
  const endItem = Math.min(safePage * rowsPerPage, totalItems);

  // Generate numbered pages with smart ellipsis
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && arr[i - 1] !== p - 1) acc.push("...");
      acc.push(p);
      return acc;
    }, []);

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-200 text-xs text-slate-600 bg-white ${className}`}
    >
      {/* Range Info & Rows selector */}
      <div className="flex items-center gap-4 flex-wrap">
        <span>
          Showing <strong className="font-semibold text-slate-800">{startItem}</strong> to{" "}
          <strong className="font-semibold text-slate-800">{endItem}</strong> of{" "}
          <strong className="font-semibold text-slate-800">{totalItems}</strong> {itemLabel}
        </span>

        {onRowsPerPageChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Rows:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
              className="border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white text-slate-700 outline-none focus:border-blue-500 cursor-pointer font-medium"
            >
              {rowsOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Pagination page navigation buttons */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={safePage === 1}
          onClick={() => onPageChange && onPageChange(Math.max(1, safePage - 1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          title="Previous Page"
        >
          <ChevronLeft size={15} />
        </button>

        {pageNumbers.map((item, i) =>
          item === "..." ? (
            <span key={`dots-${i}`} className="px-2 text-slate-400 font-bold select-none">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange && onPageChange(item)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg font-medium text-xs transition cursor-pointer ${
                safePage === item
                  ? "bg-blue-600 text-white font-bold shadow-sm"
                  : "border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          disabled={safePage === totalPages}
          onClick={() => onPageChange && onPageChange(Math.min(totalPages, safePage + 1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          title="Next Page"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
