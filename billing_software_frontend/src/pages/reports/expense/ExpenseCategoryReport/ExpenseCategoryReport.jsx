import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../../services/api";
import * as XLSX from "xlsx";
import { getCurrencySymbol } from "../../../../utils/expenseDocument";
import { Calendar, FileSpreadsheet, Plus, Printer, RefreshCw, Layers, TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import ReportPagination from "../../../../components/reports/ReportPagination";
import ExpenseCategoryReportAnalytics from "./ExpenseCategoryReportAnalytics";
import { showToast } from "../../../../utils/reportToast";

const today = () => new Date();
const firstOfMonth = () => new Date(today().getFullYear(), today().getMonth(), 1);
const toInputDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const formatAmount = (symbol, n) =>
  `${symbol}${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ExpenseCategoryReport() {
  const navigate = useNavigate();

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  const adminId = user?.role === "cashier" ? user?.admin_id : user?.id;
  const savedCompanyId = localStorage.getItem("selected_company_id") || user?.company_id || 0;

  const [companyId] = useState(savedCompanyId || 0);
  const [symbol, setSymbol] = useState("₹");
  const [fromDate, setFromDate] = useState(toInputDate(firstOfMonth()));
  const [toDate, setToDate] = useState(toInputDate(today()));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState("report");

  useEffect(() => {
    let mounted = true;
    getCurrencySymbol(Number(companyId)).then((s) => {
      if (mounted) setSymbol(s || "₹");
    });
    return () => {
      mounted = false;
    };
  }, [companyId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get("/expense/categories", {
          params: {
            company_id: companyId || 0,
            admin_id: adminId || 0,
            from_date: fromDate,
            to_date: toDate,
          },
        });
        if (cancelled) return;
        const list = Array.isArray(res?.data?.data) ? res.data.data : [];
        setRows(list);
      } catch (err) {
        console.error("Expense category report load error", err);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [companyId, adminId, fromDate, toDate, reloadKey]);

  const reportRows = useMemo(() => {
    return rows
      .filter((r) => Number(r.total_amount) > 0)
      .sort((a, b) => Number(b.total_amount) - Number(a.total_amount) || String(a.name || "").localeCompare(String(b.name || "")));
  }, [rows]);

  const totalAmount = useMemo(() => reportRows.reduce((sum, r) => sum + Number(r.total_amount || 0), 0), [reportRows]);

  const analyticsRows = useMemo(
    () =>
      (reportRows || []).map((r) => ({
        date: "",
        group: r.name || "General",
        value: Number(r.total_amount) || 0,
        count: 1,
      })),
    [reportRows]
  );

  const handleExportExcel = () => {
    if (!reportRows.length) {
      showToast("No expense data available to export.", "warning");
      return;
    }
    const data = reportRows.map((r) => ({
      "Expense Category": r.name || "-",
      "Category Type": r.type || "Direct Expense",
      Amount: Number(r.total_amount || 0),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expense Category Report");
    XLSX.writeFile(wb, `ExpenseCategoryReport_${fromDate}_${toDate}.xlsx`);
  };

  const handlePrint = () => {
    const styleId = "expense-category-report-print-style";
    const existing = document.getElementById(styleId);
    if (existing) existing.remove();
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @media print {
        body * { visibility: hidden !important; }
        #expense-cat-print-area, #expense-cat-print-area * { visibility: visible !important; }
        #expense-cat-print-area {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 10mm !important;
          background: #ffffff !important;
          box-shadow: none !important;
          border: none !important;
        }
        .ecr-no-print { display: none !important; }
      }
    `;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => document.getElementById(styleId)?.remove(), 300);
  };

  const totalRows = reportRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedRows = reportRows.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  return (
    <div className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 space-y-3.5 max-w-[1600px] mx-auto text-slate-800 font-sans">
      {viewMode === "analytics" ? (
        <ExpenseCategoryReportAnalytics
          rows={reportRows}
          period={`${fromDate || "All"} → ${toDate || "All"}`}
          onClose={() => setViewMode("report")}
        />
      ) : (
        <>
      {/* Header & Export Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            <span>Expenses & Overheads</span>
            <span>•</span>
            <span>Category Spending</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            Expense Category Report
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Breakdown of corporate spending categorized into direct and indirect business overheads
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => navigate("/purchases/expenses/add")}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("analytics")}
            disabled={!reportRows.length}
            title="Open Analytics"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <BarChart3 size={16} />
            <span>Analytics</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-emerald-200 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100/80 hover:border-emerald-300 transition-all shadow-2xs cursor-pointer"
            title="Export Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excel</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs cursor-pointer"
            title="Print Report"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-xs border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* From Date */}
          <div className="flex items-center gap-2 bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
            />
          </div>

          {/* To Date */}
          <div className="flex items-center gap-2 bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
            />
          </div>
        </div>

        <button
          onClick={() => setReloadKey((k) => k + 1)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl transition-all cursor-pointer ml-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Categories</div>
            <div className="text-xl font-black text-slate-800 mt-0.5">{reportRows.length}</div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Active spending channels</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Total Expense</div>
            <div className="text-xl font-black text-rose-600 mt-0.5">{formatAmount(symbol, totalAmount)}</div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Cumulative period outlays</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Avg / Category</div>
            <div className="text-xl font-black text-blue-600 mt-0.5">
              {formatAmount(symbol, reportRows.length ? totalAmount / reportRows.length : 0)}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Mean category expenditure</div>
          </div>
        </div>
      </div>

      {/* Modern Data Table */}
      <div id="expense-cat-print-area" className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75">
                <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left">Expense Category</th>
                <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left">Category Type</th>
                <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-16 text-center text-slate-400 font-medium">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading categories...
                  </td>
                </tr>
              ) : reportRows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-16 text-center text-slate-400 font-medium">
                    No expense records found for the selected date range.
                  </td>
                </tr>
              ) : (
                pagedRows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800">{r.name || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {r.type || "Direct Expense"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-rose-600">
                      {formatAmount(symbol, r.total_amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && reportRows.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50/90 font-bold text-slate-800 text-xs">
                <tr>
                  <td colSpan={2} className="px-4 py-3 uppercase tracking-wider font-extrabold text-slate-900">Total Expense</td>
                  <td className="px-4 py-3 text-right font-extrabold text-rose-700">{formatAmount(symbol, totalAmount)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="ecr-no-print">
          <ReportPagination
            total={totalRows}
            page={safePage}
            rowsPerPage={rowsPerPage}
            onPageChange={setPage}
            onRowsPerPageChange={(v) => { setRowsPerPage(v); setPage(1); }}
          />
        </div>
      </div>

      </>
      )}
    </div>
  );
}
