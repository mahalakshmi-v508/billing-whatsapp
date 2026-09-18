import { useEffect, useState, useMemo } from "react";
import { AlertCircle, FileSpreadsheet, Printer, RefreshCw, Layers, Package, TrendingUp, Search } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../../services/api";
import ReportPagination from "../../../components/reports/ReportPagination";

const COLUMNS = [
  { key: "item_category", label: "Item Category", right: false },
  { key: "stock_quantity", label: "Stock Quantity", right: true },
  { key: "stock_value", label: "Stock Value", right: true },
];

function getAuth() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return { adminId: user?.role === "admin" ? user?.id : user?.admin_id || null };
  } catch {
    return { adminId: null };
  }
}

function formatQuantity(value) {
  return Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function printElement(element) {
  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, { position: "fixed", width: 0, height: 0, border: 0, visibility: "hidden" });
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`<html><head><title>STOCK SUMMARY BY ITEM CATEGORY</title><style>
    *{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:0;padding:22px;color:#1e1b4b}
    h2{margin:0 0 16px;font-size:17px}table{width:100%;border-collapse:collapse;font-size:11px}
    th,td{border:1px solid #dbe2ec;padding:7px 8px;text-align:left}th{background:#f2f4f7;color:#334155}
    td.r,th.r{text-align:right}tfoot td{background:#f2f4f7;font-weight:700;border-top:2px solid #94a3b8}
  </style></head><body>${element.innerHTML}</body></html>`);
  doc.close();
  const win = iframe.contentWindow;
  const print = () => { try { win.focus(); win.print(); } finally { setTimeout(() => iframe.remove(), 1500); } };
  if (doc.readyState === "complete") print();
  else win.addEventListener("load", print);
}

export default function StockSummaryByItemCategory() {
  const { adminId } = getAuth();
  const [companyId, setCompanyId] = useState(Number(localStorage.getItem("selected_company_id") || 0) || null);
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ stock_quantity: 0, stock_value: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    if (!adminId) return;
    api.get(`/company/get_companies_by_admin?admin_id=${adminId}`).then((res) => {
      const list = res.data?.status ? res.data.data || [] : [];
      const saved = localStorage.getItem("selected_company_id");
      const chosen = list.find((company) => String(company.id) === String(saved)) || list[0];
      if (chosen) setCompanyId(Number(chosen.id));
    }).catch(() => setError("Failed to load company."));
  }, [adminId]);

  useEffect(() => {
    if (!companyId) return undefined;
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      api.get("/report/stock-summary-by-item-category", { params: { company_id: companyId, admin_id: adminId || 0 } }).then((res) => {
        if (!active) return;
        if (res.data?.status) {
          setRows(res.data.data || []);
          setTotals(res.data.totals || { stock_quantity: 0, stock_value: 0 });
        } else {
          setError(res.data?.message || "Failed to load report.");
        }
      }).catch(() => {
        if (active) setError("Failed to load report.");
      }).finally(() => {
        if (active) setLoading(false);
      });
    }, 0);
    return () => { active = false; clearTimeout(timer); };
  }, [companyId, adminId, reloadKey]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => (r.item_category || "").toLowerCase().includes(q));
  }, [rows, search]);

  const handleExcel = () => {
    const sheetData = [
      ["STOCK SUMMARY BY ITEM CATEGORY"],
      [],
      COLUMNS.map((column) => column.label),
      ...filteredRows.map((row) => [row.item_category, row.stock_quantity || 0, row.stock_value || 0]),
      ["Total", totals.stock_quantity || 0, totals.stock_value || 0],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    worksheet["!cols"] = [{ wch: 28 }, { wch: 18 }, { wch: 18 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Summary");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "Stock_Summary_By_Item_Category.xlsx");
  };

  const handlePrint = () => {
    const body = filteredRows.map((row) => `<tr><td>${row.item_category || "Uncategorized"}</td><td class="r">${formatQuantity(row.stock_quantity)}</td><td class="r">${formatCurrency(row.stock_value)}</td></tr>`).join("");
    const element = document.createElement("div");
    element.innerHTML = `<h2>STOCK SUMMARY BY ITEM CATEGORY</h2><table><thead><tr>${COLUMNS.map((column) => `<th class="${column.right ? "r" : ""}">${column.label}</th>`).join("")}</tr></thead><tbody>${body}</tbody><tfoot><tr><td>Total</td><td class="r">${formatQuantity(totals.stock_quantity)}</td><td class="r">${formatCurrency(totals.stock_value)}</td></tr></tfoot></table>`;
    printElement(element);
  };

  const totalRows = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedRows = filteredRows.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto text-slate-800 font-sans">
      {/* Header & Actions Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            <span>Inventory Reports</span>
            <span>•</span>
            <span>Stock Valuation</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            Stock Summary by Item Category
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Aggregated valuation and physical stock volume grouped across item categories
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExcel}
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

      {/* Toolbar / Search Card */}
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-xs border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search category..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 font-medium"
          />
        </div>

        <button
          onClick={() => setReloadKey((k) => k + 1)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl transition-all cursor-pointer ml-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Summary Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Categories</div>
            <div className="text-xl font-black text-slate-800 mt-0.5">{rows.length}</div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Categorized groupings</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Total Stock Quantity</div>
            <div className="text-xl font-black text-blue-600 mt-0.5">
              {formatQuantity(totals.stock_quantity)}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Units in inventory</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Total Stock Value</div>
            <div className="text-xl font-black text-emerald-600 mt-0.5">
              {formatCurrency(totals.stock_value)}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Estimated inventory value</div>
          </div>
        </div>
      </div>

      {/* Modern Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75">
                {COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    className={`px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 ${
                      column.right ? "text-right" : "text-left"
                    }`}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-4 py-16 text-center text-slate-400 font-medium">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading stock summary...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-4 py-12 text-center text-rose-500 font-medium">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-6 h-6 text-rose-500" />
                      <span>{error}</span>
                      <button
                        onClick={() => setReloadKey((k) => k + 1)}
                        className="px-3 py-1 bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-4 py-16 text-center text-slate-400 font-medium">
                    No stock data available.
                  </td>
                </tr>
              ) : (
                pagedRows.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {row.item_category || "Uncategorized"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-600">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                        {formatQuantity(row.stock_quantity)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">
                      {formatCurrency(row.stock_value)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && !error && filteredRows.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50/90 font-bold text-slate-800 text-xs">
                <tr>
                  <td className="px-4 py-3 uppercase tracking-wider font-extrabold text-slate-900">Total</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800">
                      {formatQuantity(totals.stock_quantity)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold text-emerald-700">{formatCurrency(totals.stock_value)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <ReportPagination
          total={totalRows}
          page={safePage}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={(v) => {
            setRowsPerPage(v);
            setPage(1);
          }}
        />
      </div>
    </div>
  );
}
