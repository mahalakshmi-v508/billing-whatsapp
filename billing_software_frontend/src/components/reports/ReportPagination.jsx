import { ChevronLeft, ChevronRight } from "lucide-react";

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];

/**
 * Modernized PaySplitX Pagination Bar for all reports
 */
export default function ReportPagination({
  total,
  page,
  rowsPerPage = 10,
  onPageChange,
  onRowsPerPageChange,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
}) {
  if (!total || total <= 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = (safePage - 1) * rowsPerPage + 1;
  const to = Math.min(safePage * rowsPerPage, total);

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap px-5 py-3.5 bg-slate-50/80 border-t border-slate-200/80 text-xs text-slate-500 font-medium">
      <div className="flex items-center gap-4 flex-wrap">
        <span>
          Showing <strong className="font-bold text-slate-800">{from}</strong> to{" "}
          <strong className="font-bold text-slate-800">{to}</strong> of{" "}
          <strong className="font-bold text-slate-800">{total}</strong> entries
        </span>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-normal">Rows per page:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => onRowsPerPageChange && onRowsPerPageChange(Number(e.target.value))}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition cursor-pointer"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          title="Previous page"
          disabled={safePage <= 1}
          onClick={() => onPageChange && onPageChange(safePage - 1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 active:scale-95 transition shadow-2xs cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-white disabled:active:scale-100"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="min-w-[32px] h-8 px-2 flex items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-xs select-none">
          {safePage} / {totalPages}
        </div>
        <button
          type="button"
          title="Next page"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange && onPageChange(safePage + 1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 active:scale-95 transition shadow-2xs cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-white disabled:active:scale-100"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}