import { useState, useRef, useEffect, useMemo } from "react";
import {
  ChevronDown,
  Search,
  FileSpreadsheet,
  Printer,
  X,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../../../services/api";
import ReportPagination from "../../../../components/reports/ReportPagination";
import StockSummaryAnalytics from "./StockSummaryAnalytics";

const FONT = "'Plus Jakarta Sans', sans-serif";
const INDIGO = "#4338ca";
const NAVY = "#1e1b4b";
const GRAY_TEXT = "#6b7280";
const LIGHT_BORDER = "#e5e7eb";
const PAGE_SIZE = 15;

/* ── Helpers ─────────────────────────────────────────────────────────── */
function getAuth() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return { adminId: user?.role === "admin" ? user?.id : user?.admin_id || null };
  } catch {
    return { adminId: null };
  }
}

const fmtINR = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtINRNum = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function formatDateISO(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateISO(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function today() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Print a DOM node without leaving the app (hidden iframe). */
function printElement(element, title) {
  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, {
    position: "fixed", width: "0", height: "0",
    border: "0", visibility: "hidden", right: "0", bottom: "0",
  });
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(
    `<html><head><title>${title || "Stock Summary"}</title>
     <style>
       body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:28px;color:#1e1b4b;}
       h2{margin:0 0 4px;font-size:18px;}
       .business{font-size:13px;font-weight:700;color:#334155;}
       .meta{color:#64748b;font-size:12px;margin-bottom:18px;}
       table{width:100%;border-collapse:collapse;font-size:11px;}
       th,td{border:1px solid #e2e8f0;padding:7px 9px;text-align:left;}
       th{background:#f1f5f9;color:#334155;}
       td.r,th.r{text-align:right;}
       .short{color:#dc2626;font-weight:700;}
     </style></head>
     <body>${element.innerHTML}</body></html>`
  );
  doc.close();
  const win = iframe.contentWindow;
  const fire = () => { try { win.focus(); win.print(); } finally { setTimeout(() => iframe.remove(), 1500); } };
  if (doc.readyState === "complete") fire();
  else win.addEventListener("load", fire);
}

/* ── Main Component ─────────────────────────────────────────────────── */
export default function StockSummary() {
  const { adminId } = getAuth();

  const [companyId, setCompanyId] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [companyName, setCompanyName] = useState("My Company");

  const [asOf, setAsOf] = useState(today());
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(0);
  const [showInStock, setShowInStock] = useState(false);
  const [query, setQuery] = useState("");

  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ stock_qty: 0, available_qty: 0, reserved_qty: 0, stock_value: 0 });
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("report");

  const [companyOpen, setCompanyOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);

  const companyRef = useRef(null);
  const catRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (companyRef.current && !companyRef.current.contains(e.target)) setCompanyOpen(false);
      if (catRef.current && !catRef.current.contains(e.target)) setCatOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Load companies for this admin, default to saved / single company
  useEffect(() => {
    if (!adminId) return;
    api
      .get(`/company/get_companies_by_admin?admin_id=${adminId}`)
      .then((res) => {
        if (!res.data?.status) return;
        const list = res.data.data || [];
        setCompanies(list);
        const saved = localStorage.getItem("selected_company_id");
        const match = saved ? list.find((c) => String(c.id) === String(saved)) : null;
        const chosen = match || list[0] || null;
        if (chosen) {
          setCompanyId(Number(chosen.id));
          setCompanyName(chosen.company_name || "My Company");
        }
      })
      .catch(() => setError("Failed to load companies."));
  }, [adminId]);

  const selectCompany = (c) => {
    setCompanyId(Number(c.id));
    setCompanyName(c.company_name || "My Company");
    setCategoryId(0);
    setPage(1);
    setCompanyOpen(false);
  };

  // Load categories for the selected company
  useEffect(() => {
    if (!companyId) return;
    api
      .get(`/category/get_active_category?company_id=${companyId}`)
      .then((res) => setCategories(res.data?.status ? res.data.data || [] : []))
      .catch(() => setCategories([]));
  }, [companyId]);

  const selectedCatLabel = useMemo(
    () => categories.find((c) => Number(c.id) === Number(categoryId))?.name || "All Categories",
    [categories, categoryId]
  );

  // Fetch report from the backend on any filter change (server-side search debounced)
  useEffect(() => {
    if (companyId === null) return;
    const t = setTimeout(() => {
      setLoading(true);
      setError("");
      const params = {
        company_id: companyId,
        admin_id: adminId || 0,
        as_of_date: formatDateISO(asOf),
        show_in_stock: showInStock,
        search: query.trim(),
        page,
        limit: PAGE_SIZE,
      };
      if (categoryId > 0) params.category_id = categoryId;
      api
        .get("/report/stock-summary", { params })
        .then((res) => {
          if (res.data?.status) {
            setRows(res.data.data || []);
            setTotals(
              res.data.totals || { stock_qty: 0, available_qty: 0, reserved_qty: 0, stock_value: 0 }
            );
            setTotalCount(res.data.total || 0);
          } else {
            setError(res.data?.message || "Failed to load report.");
          }
        })
        .catch(() => setError("Failed to load report."))
        .finally(() => setLoading(false));
    }, query.trim() ? 350 : 0);
    return () => clearTimeout(t);
  }, [companyId, adminId, asOf, categoryId, showInStock, query, page]);

  const selectCategory = (id) => {
    setCategoryId(id);
    setPage(1);
    setCatOpen(false);
  };

  const prettyAsOf = asOf.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const [analyticsRows, setAnalyticsRows] = useState([]);

  const openAnalytics = () => {
    setViewMode("analytics");
    api
      .get("/report/stock-summary", {
        params: {
          company_id: companyId,
          admin_id: adminId || 0,
          as_of_date: formatDateISO(asOf),
          show_in_stock: showInStock,
          search: query.trim(),
          category_id: categoryId > 0 ? categoryId : undefined,
          limit: 0,
        },
      })
      .then((res) => {
        if (res.data?.status) {
          setAnalyticsRows(
            (res.data.data || []).map((r) => ({
              date: "",
              group: r.item_name || "General",
              value: Number(r.stock_value) || 0,
              count: 1,
            }))
          );
        } else {
          setAnalyticsRows([]);
        }
      })
      .catch(() => setAnalyticsRows([]));
  };

  /* ── Stock status helpers ── */
  const stockColor = (qty) => {
    if (qty < 0) return "#dc2626";
    if (qty === 0) return "#b45309";
    return "#334155";
  };
  const stockWeight = (qty) => (qty < 0 ? 800 : qty === 0 ? 600 : 600);

  /* ── Excel export (respects current filters) ── */
  const handleExcel = () => {
    try {
      const sheetData = [
        ["Stock Summary"],
        ["As of Date", prettyAsOf],
        ["Company", companyName],
        ["Category", selectedCatLabel],
        ["Show Items in Stock", showInStock ? "Yes" : "No"],
        [],
        ["S.No", "Item Name", "Sale Price", "Purchase Price", "Stock Qty", "Available Qty For Sale", "Reserved Qty", "Stock Value"],
      ];
      rows.forEach((r, i) => {
        sheetData.push([
          (page - 1) * PAGE_SIZE + i + 1, r.item_name || "",
          fmtINRNum(r.sale_price), fmtINRNum(r.purchase_price),
          Number(r.stock_qty || 0), Number(r.available_qty || 0),
          Number(r.reserved_qty || 0), fmtINRNum(r.stock_value),
        ]);
      });
      sheetData.push([
        "Total", "Total", "", "",
        Number(totals.stock_qty || 0), Number(totals.available_qty || 0),
        Number(totals.reserved_qty || 0), fmtINRNum(totals.stock_value),
      ]);
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws["!cols"] = [
        { wch: 5 }, { wch: 24 }, { wch: 12 }, { wch: 14 },
        { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 14 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Stock Summary");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array", bookSST: false });
      saveAs(
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `Stock_Summary_${formatDateISO(asOf)}.xlsx`
      );
    } catch {
      setError("Excel export failed. Please try again.");
    }
  };

  /* ── Print ── */
  const handlePrint = () => {
    const buildTable = (rowsList) =>
      `<table>
        <thead><tr>
          <th>#</th><th>Item Name</th>
          <th class="r">Sale Price</th><th class="r">Purchase Price</th>
          <th class="r">Stock Qty</th><th class="r">Available Qty For Sale</th>
          <th class="r">Reserved Qty</th><th class="r">Stock Value</th>
        </tr></thead>
        <tbody>${
          rowsList
            .map(
              (r, i) => {
                const qty = Number(r.stock_qty || 0);
                return `<tr>
                  <td>${(page - 1) * PAGE_SIZE + i + 1}</td><td>${r.item_name || "-"}</td>
                  <td class="r">${fmtINR(r.sale_price)}</td><td class="r">${fmtINR(r.purchase_price)}</td>
                  <td class="r${qty < 0 ? " short" : ""}">${qty}</td>
                  <td class="r">${Number(r.available_qty || 0)}</td>
                  <td class="r">${Number(r.reserved_qty || 0)}</td>
                  <td class="r">${fmtINR(r.stock_value)}</td>
                </tr>`;
              }
            )
            .join("")
        }
        <tr>
          <td colspan="2"><strong>Total</strong></td>
          <td class="r"></td><td class="r"></td>
          <td class="r"><strong>${Number(totals.stock_qty || 0)}</strong></td>
          <td class="r"><strong>${Number(totals.available_qty || 0)}</strong></td>
          <td class="r"><strong>${Number(totals.reserved_qty || 0)}</strong></td>
          <td class="r"><strong>${fmtINR(totals.stock_value)}</strong></td>
        </tr>
        </tbody>
      </table>`;

    const now = new Date();
    const generated =
      now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
      ", " +
      now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

    const el = document.createElement("div");
    el.innerHTML =
      `<h2>Stock Summary</h2>
       <div class="business">${companyName}</div>
       <div class="meta">As of ${prettyAsOf} &nbsp;|&nbsp; Category: ${selectedCatLabel} &nbsp;|&nbsp; Show Items in Stock: ${showInStock ? "Yes" : "No"} &nbsp;|&nbsp; Generated: ${generated}</div>
       ${buildTable(rows)}`;
    printElement(el, "Stock Summary");
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto text-slate-800 font-sans">
      {viewMode === "analytics" ? (
        <StockSummaryAnalytics
          rows={analyticsRows}
          period={`As of ${prettyAsOf}`}
          onClose={() => setViewMode("report")}
        />
      ) : (
        <>
      {/* Filter Card */}
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-xs border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">As Of Date</span>
            <input
              type="date"
              value={formatDateISO(asOf)}
              onChange={(e) => {
                if (e.target.value) setAsOf(parseDateISO(e.target.value));
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-800 rounded-xl px-3 py-1.5 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 shadow-2xs cursor-pointer"
            />
          </div>

          {/* Company */}
          <div ref={companyRef} className="relative flex flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Firm / Company</span>
            <button
              type="button"
              onClick={() => setCompanyOpen((v) => !v)}
              className="bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-800 rounded-xl px-3 py-1.5 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 shadow-2xs cursor-pointer inline-flex items-center gap-2 min-w-[160px] justify-between"
            >
              <span className="truncate">{companyName}</span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${companyOpen ? "rotate-180" : ""}`} />
            </button>
            {companyOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1.5 overflow-hidden">
                {companies.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectCompany(c)}
                    className={`w-full text-left px-3.5 py-2 text-xs transition-colors ${
                      Number(c.id) === Number(companyId)
                        ? "bg-blue-50 text-blue-700 font-bold"
                        : "text-slate-700 hover:bg-slate-50 font-medium"
                    }`}
                  >
                    {c.company_name || "My Company"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Categories */}
          <div ref={catRef} className="relative flex flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Category</span>
            <button
              type="button"
              onClick={() => setCatOpen((v) => !v)}
              className="bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-800 rounded-xl px-3 py-1.5 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 shadow-2xs cursor-pointer inline-flex items-center gap-2 min-w-[160px] justify-between"
            >
              <span className="truncate">{selectedCatLabel}</span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${catOpen ? "rotate-180" : ""}`} />
            </button>
            {catOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1.5 max-h-64 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => selectCategory(0)}
                  className={`w-full text-left px-3.5 py-2 text-xs transition-colors ${
                    categoryId === 0
                      ? "bg-blue-50 text-blue-700 font-bold"
                      : "text-slate-700 hover:bg-slate-50 font-medium"
                  }`}
                >
                  All Categories
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectCategory(Number(c.id))}
                    className={`w-full text-left px-3.5 py-2 text-xs transition-colors ${
                      Number(c.id) === Number(categoryId)
                        ? "bg-blue-50 text-blue-700 font-bold"
                        : "text-slate-700 hover:bg-slate-50 font-medium"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
                {categories.length === 0 && (
                  <div className="px-3.5 py-2 text-xs text-slate-400">No categories found</div>
                )}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors pt-4 sm:pt-4">
            <input
              type="checkbox"
              checked={showInStock}
              onChange={(e) => {
                setShowInStock(e.target.checked);
                setPage(1);
              }}
              className="w-4 h-4 rounded-md text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
            />
            <span>Show Items in Stock</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Export Excel"
            onClick={handleExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-emerald-200 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100/80 hover:border-emerald-300 transition-all shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
            Excel
          </button>
          <button
            type="button"
            title="Print"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs cursor-pointer"
          >
            <Printer size={15} className="text-slate-600" />
            Print
          </button>
          <button
            type="button"
            title="Open Analytics"
            onClick={openAnalytics}
            disabled={!rows.length}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <BarChart3 size={16} />
            Analytics
          </button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-50/60 to-white p-4 rounded-2xl border border-indigo-100/80 shadow-2xs">
          <span className="text-[11px] font-bold tracking-wider text-indigo-700 uppercase">Total Items</span>
          <div className="text-xl font-black text-slate-800 tracking-tight mt-1">{totalCount}</div>
          <div className="text-[11px] font-medium text-slate-400 mt-0.5">Tracked Inventory Lines</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50/60 to-white p-4 rounded-2xl border border-blue-100/80 shadow-2xs">
          <span className="text-[11px] font-bold tracking-wider text-blue-700 uppercase">Stock Quantity</span>
          <div className="text-xl font-black text-slate-800 tracking-tight mt-1">{Number(totals.stock_qty || 0)}</div>
          <div className="text-[11px] font-medium text-slate-400 mt-0.5">Physical Units On-Hand</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50/60 to-white p-4 rounded-2xl border border-emerald-100/80 shadow-2xs">
          <span className="text-[11px] font-bold tracking-wider text-emerald-700 uppercase">Available For Sale</span>
          <div className="text-xl font-black text-emerald-900 tracking-tight mt-1">{Number(totals.available_qty || 0)}</div>
          <div className="text-[11px] font-medium text-slate-400 mt-0.5">Reserved: {Number(totals.reserved_qty || 0)}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50/60 to-white p-4 rounded-2xl border border-purple-100/80 shadow-2xs">
          <span className="text-[11px] font-bold tracking-wider text-purple-700 uppercase">Total Stock Value</span>
          <div className="text-xl font-black text-purple-900 tracking-tight mt-1">{fmtINR(totals.stock_value)}</div>
          <div className="text-[11px] font-medium text-slate-400 mt-0.5">Current Inventory Valuation</div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        {/* Table Search Header */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="relative min-w-[260px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by item name, SKU or barcode…"
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ×
              </button>
            )}
          </div>
          <div className="text-xs font-semibold text-slate-500">
            Showing {rows.length} of {totalCount} items
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75">
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-center w-12">S.No</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 min-w-[200px]">Item Name</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Sale Price</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Purchase Price</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Stock Qty</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Available Qty</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Reserved Qty</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Stock Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500 text-xs">
                    Loading inventory data…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-rose-600 text-xs font-bold">
                      <AlertCircle size={22} />
                      <span>{error}</span>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500 text-xs font-medium">
                    No items found matching the selected filters.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => {
                  const qty = Number(r.stock_qty || 0);
                  const avail = Number(r.available_qty || 0);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 text-xs text-center font-medium text-slate-400">
                        {(page - 1) * PAGE_SIZE + i + 1}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-800">
                        {r.item_name || "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700 text-right tabular-nums">
                        {fmtINR(r.sale_price)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700 text-right tabular-nums">
                        {fmtINR(r.purchase_price)}
                      </td>
                      <td className={`px-4 py-3 text-xs text-right tabular-nums font-bold ${qty <= 0 ? "text-rose-600" : "text-slate-800"}`}>
                        {qty}
                      </td>
                      <td className={`px-4 py-3 text-xs text-right tabular-nums font-semibold ${avail < 0 ? "text-rose-600" : "text-emerald-700"}`}>
                        {avail}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 text-right tabular-nums">
                        {Number(r.reserved_qty || 0)}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-900 text-right tabular-nums">
                        {fmtINR(r.stock_value)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50/90 font-bold border-t border-slate-200/80 text-slate-800">
                  <td colSpan={4} className="px-4 py-3 text-xs text-slate-900">Total</td>
                  <td className="px-4 py-3 text-xs text-right tabular-nums text-slate-900">
                    {Number(totals.stock_qty || 0)}
                  </td>
                  <td className="px-4 py-3 text-xs text-right tabular-nums text-slate-900">
                    {Number(totals.available_qty || 0)}
                  </td>
                  <td className="px-4 py-3 text-xs text-right tabular-nums text-slate-900">
                    {Number(totals.reserved_qty || 0)}
                  </td>
                  <td className="px-4 py-3 text-xs text-right tabular-nums text-slate-900">
                    {fmtINR(totals.stock_value)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <ReportPagination
          total={totalCount}
          page={page}
          rowsPerPage={PAGE_SIZE}
          pageSizeOptions={[PAGE_SIZE]}
          onPageChange={setPage}
          onRowsPerPageChange={() => setPage(1)}
        />
      </div>
      </>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   STYLES
   ═════════════════════════════════════════════════════════════════════ */

const selectBtnStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 14px",
  background: "#fff",
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 8,
  cursor: "pointer",
  fontFamily: FONT,
  whiteSpace: "nowrap",
};

const actionBtnStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 2,
  padding: "6px 14px",
  background: "transparent",
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 8,
  cursor: "pointer",
  fontFamily: FONT,
  whiteSpace: "nowrap",
};

const dateBoxStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  background: "#f9fafb",
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 8,
  whiteSpace: "nowrap",
};

const dateInputStyle = {
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 6,
  padding: "5px 8px",
  fontSize: 13,
  fontFamily: FONT,
  color: "#334155",
  background: "#fff",
  outline: "none",
  width: 137,
};

const dropdownPanelStyle = {
  position: "absolute",
  top: "calc(100% + 6px)",
  left: 0,
  minWidth: 170,
  zIndex: 60,
  background: "#fff",
  border: "1.5px solid #e0e7ff",
  borderRadius: 10,
  boxShadow: "0 12px 32px rgba(30,27,75,.12)",
  overflow: "hidden",
  fontFamily: FONT,
};

const dropdownItemStyle = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "8px 14px",
  background: "transparent",
  border: "none",
  fontSize: 13,
  fontFamily: FONT,
  cursor: "pointer",
  transition: "background .1s",
  whiteSpace: "nowrap",
};

const searchInputStyle = {
  width: "100%",
  padding: "10px 36px 10px 38px",
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 8,
  fontSize: 13,
  fontFamily: FONT,
  color: "#334155",
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
};

const tableContainerStyle = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 8,
  overflow: "hidden",
  background: "#fff",
  minHeight: 0,
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontFamily: FONT,
  tableLayout: "fixed",
};

const thStyle = {
  padding: "10px 12px",
  fontSize: 11,
  fontWeight: 700,
  color: GRAY_TEXT,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  textAlign: "left",
  background: "#f9fafb",
  borderRight: `1px solid ${LIGHT_BORDER}`,
  borderBottom: `1px solid ${LIGHT_BORDER}`,
  whiteSpace: "nowrap",
  userSelect: "none",
  position: "sticky",
  top: 0,
  zIndex: 2,
};

const emptyCellStyle = {
  padding: "80px 24px",
  textAlign: "center",
  verticalAlign: "middle",
};

const tdStyle = {
  padding: "10px 12px",
  borderBottom: `1px solid ${LIGHT_BORDER}`,
  fontSize: 12.5,
  color: "#334155",
  verticalAlign: "middle",
};
