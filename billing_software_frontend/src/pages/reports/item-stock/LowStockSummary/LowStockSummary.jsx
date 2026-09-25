import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, FileSpreadsheet, Printer, RefreshCw, AlertCircle, BarChart3 } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../../../services/api";
import ReportPagination from "../../../../components/reports/ReportPagination";
import LowStockSummaryAnalytics from "./LowStockSummaryAnalytics";

const FONT = "'Plus Jakarta Sans', sans-serif";
const INDIGO = "#4338ca";
const NAVY = "#1e1b4b";
const GRAY_TEXT = "#64748b";
const LIGHT_BORDER = "#e2e8f0";

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
const fmtQty = (n) =>
  Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

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
    `<html><head><title>${title || "Low Stock Summary"}</title>
     <style>
       *{box-sizing:border-box;}
       body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:22px;color:#1e1b4b;}
       h2{margin:0 0 4px;font-size:17px;}
       .meta{color:#64748b;font-size:11.5px;margin-bottom:16px;}
       .summary{margin-top:10px;text-align:right;font-size:12px;font-weight:700;color:#1e1b4b;}
       table{width:100%;border-collapse:collapse;font-size:10.5px;}
       th,td{border:1px solid #dbe2ec;padding:6px 7px;text-align:left;vertical-align:middle;}
       th{background:#f2f4f7;color:#334155;white-space:normal;line-height:1.25;}
       td.r,th.r{text-align:right;}
       tfoot td{background:#f2f4f7;font-weight:700;border-top:2px solid #94a3b8;}
     </style></head>
     <body>${element.innerHTML}</body></html>`
  );
  doc.close();
  const win = iframe.contentWindow;
  const fire = () => { try { win.focus(); win.print(); } finally { setTimeout(() => iframe.remove(), 1500); } };
  if (doc.readyState === "complete") fire();
  else win.addEventListener("load", fire);
}

const COLUMNS = [
  { key: "item_name", label: "Item Name", right: false },
  { key: "minimum_stock_qty", label: "Minimum Stock Qty", right: true },
  { key: "stock_qty", label: "Stock Qty", right: true },
  { key: "stock_value", label: "Stock Value", right: true },
];

const TABLE_MIN_WIDTH = 520;

/* ── Main Component ─────────────────────────────────────────────────── */
export default function LowStockSummary() {
  const { adminId } = getAuth();

  const [companyId, setCompanyId] = useState(null);
  const [companyName, setCompanyName] = useState("My Company");

  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(0);
  const [showInStock, setShowInStock] = useState(false);
  const [catOpen, setCatOpen] = useState(false);

  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ stock_qty: 0, stock_value: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState("report");

  const catRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (catRef.current && !catRef.current.contains(e.target)) setCatOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Resolve the firm silently (saved / single company), no visible firm control.
  useEffect(() => {
    if (!adminId) return;
    api
      .get(`/company/get_companies_by_admin?admin_id=${adminId}`)
      .then((res) => {
        if (!res.data?.status) return;
        const list = res.data.data || [];
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

  // All Categories dropdown — real categories from the DB/API.
  useEffect(() => {
    if (companyId === null) return;
    api
      .get(`/category/get_all`, { params: { company_id: companyId } })
      .then((res) => {
        if (res.data?.status) setCategories(res.data.data || []);
      })
      .catch(() => {});
  }, [companyId]);

  // Fetch the report on any filter change.
  useEffect(() => {
    if (companyId === null) return;
    const t = setTimeout(() => {
      setLoading(true);
      setError("");
      const params = {
        company_id: companyId,
        admin_id: adminId || 0,
        category_id: categoryId,
        show_in_stock: showInStock,
      };
      api
        .get("/report/low-stock-summary", { params })
        .then((res) => {
          if (res.data?.status) {
            setRows(res.data.data || []);
            setTotals(res.data.totals || { stock_qty: 0, stock_value: 0 });
          } else {
            setError(res.data?.message || "Failed to load report.");
          }
        })
        .catch(() => setError("Failed to load report."))
        .finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(t);
  }, [companyId, adminId, categoryId, showInStock, reloadKey]);

  const selectedCategory = categories.find((c) => Number(c.id) === Number(categoryId));

  const analyticsRows = useMemo(
    () =>
      (rows || []).map((r) => ({
        date: "",
        group: r.item_name || "General",
        value: Number(r.stock_value) || 0,
        count: 1,
      })),
    [rows]
  );

  /* ── Excel export (only the 4 report columns) ── */
  const handleExcel = () => {
    try {
      const metaLabel = `Category: ${selectedCategory?.name || "All Categories"} | Show items in stock: ${showInStock ? "Yes" : "No"}`;
      const sheetData = [
        ["Low Stock Summary"],
        [metaLabel],
        [],
        COLUMNS.map((c) => c.label),
      ];
      rows.forEach((r) => {
        sheetData.push([
          r.item_name,
          fmtQty(r.minimum_stock_qty),
          fmtQty(r.stock_qty),
          fmtINR(r.stock_value),
        ]);
      });
      sheetData.push(["Total", "", fmtQty(totals.stock_qty), fmtINR(totals.stock_value)]);
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws["!cols"] = COLUMNS.map((c) => ({ wch: c.right ? 16 : 28 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Low Stock Summary");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array", bookSST: false });
      saveAs(
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        "Low_Stock_Summary.xlsx"
      );
    } catch {
      setError("Excel export failed. Please try again.");
    }
  };

  /* ── Print ── */
  const handlePrint = () => {
    const th = COLUMNS.map((c) => `<th class="${c.right ? "r" : ""}">${c.label}</th>`).join("");
    const buildRow = (r) => {
      const cells = COLUMNS.map((c) => {
        if (c.key === "item_name") return `<td><strong>${r.item_name || "-"}</strong></td>`;
        if (c.key === "stock_value") return `<td class="r"><strong>${fmtINR(r.stock_value)}</strong></td>`;
        return `<td class="r"><strong>${fmtQty(r[c.key] || 0)}</strong></td>`;
      }).join("");
      return `<tr>${cells}</tr>`;
    };
    const body =
      rows.map((r) => buildRow(r)).join("") +
      (rows.length
        ? buildRow(
            {
              item_name: "Total",
              minimum_stock_qty: "",
              stock_qty: totals.stock_qty,
              stock_value: totals.stock_value,
            }
          )
        : "");

    const metaLabel = `Category: ${selectedCategory?.name || "All Categories"} | Show items in stock: ${showInStock ? "Yes" : "No"} | ${companyName}`;
    const el = document.createElement("div");
    el.innerHTML =
      `<h2>Low Stock Summary</h2>
       <div class="meta">${metaLabel}</div>
       <table>
         <thead><tr>${th}</tr></thead>
         <tbody>${body}</tbody>
       </table>
       <div class="summary">Total Amount: <span>${fmtINR(totals.stock_value)}</span></div>`;
    printElement(el, "Low Stock Summary");
  };

  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedRows = rows.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  return (
    <div className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 space-y-3.5 max-w-[1600px] mx-auto text-slate-800 font-sans">
      {viewMode === "analytics" ? (
        <LowStockSummaryAnalytics
          rows={analyticsRows}
          period={`Category: ${selectedCategory?.name || "All Categories"} • ${showInStock ? "In Stock" : "All Items"}`}
          onClose={() => setViewMode("report")}
        />
      ) : (
        <>
      <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1 tracking-tight">Low Stock Summary</h1>
      {/* Filter Card */}
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-xs border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Category Dropdown */}
          <div ref={catRef} className="relative flex flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Category</span>
            <button
              type="button"
              onClick={() => setCatOpen((v) => !v)}
              className="bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-800 rounded-xl px-3 py-1.5 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 shadow-2xs cursor-pointer inline-flex items-center gap-2 min-w-[160px] justify-between"
            >
              <span className="truncate">{selectedCategory?.name || "All Categories"}</span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${catOpen ? "rotate-180" : ""}`} />
            </button>
            {catOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1.5 max-h-60 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => { setCategoryId(0); setCatOpen(false); }}
                  className={`w-full text-left px-3.5 py-2 text-xs transition-colors ${
                    Number(categoryId) === 0
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
                    onClick={() => { setCategoryId(Number(c.id)); setCatOpen(false); }}
                    className={`w-full text-left px-3.5 py-2 text-xs transition-colors ${
                      Number(c.id) === Number(categoryId)
                        ? "bg-blue-50 text-blue-700 font-bold"
                        : "text-slate-700 hover:bg-slate-50 font-medium"
                    }`}
                  >
                    {c.name || "Category"}
                  </button>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors pt-4 sm:pt-4">
            <input
              type="checkbox"
              checked={showInStock}
              onChange={(e) => setShowInStock(e.target.checked)}
              className="w-4 h-4 rounded-md text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
            />
            <span>Show Items in Stock</span>
          </label>

          {loading && (
            <RefreshCw size={15} className="animate-spin text-blue-600 ml-2" />
          )}
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
            onClick={() => setViewMode("analytics")}
            disabled={!rows.length}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <BarChart3 size={16} />
            Analytics
          </button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-rose-50/60 to-white p-4 rounded-2xl border border-rose-100/80 shadow-2xs">
          <span className="text-[11px] font-bold tracking-wider text-rose-700 uppercase">Low Stock Products</span>
          <div className="text-xl font-black text-rose-900 tracking-tight mt-1">{rows.length}</div>
          <div className="text-[11px] font-medium text-slate-400 mt-0.5">Below Minimum Threshold</div>
        </div>
        <div className="bg-gradient-to-br from-amber-50/60 to-white p-4 rounded-2xl border border-amber-100/80 shadow-2xs">
          <span className="text-[11px] font-bold tracking-wider text-amber-700 uppercase">Total Stock Quantity</span>
          <div className="text-xl font-black text-amber-900 tracking-tight mt-1">{fmtQty(totals.stock_qty)}</div>
          <div className="text-[11px] font-medium text-slate-400 mt-0.5">Remaining Units Across Items</div>
        </div>
        <div className="bg-gradient-to-br from-indigo-50/60 to-white p-4 rounded-2xl border border-indigo-100/80 shadow-2xs">
          <span className="text-[11px] font-bold tracking-wider text-indigo-700 uppercase">Total Stock Value</span>
          <div className="text-xl font-black text-indigo-900 tracking-tight mt-1">{fmtINR(totals.stock_value)}</div>
          <div className="text-[11px] font-medium text-slate-400 mt-0.5">Estimated Inventory Value</div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75">
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-center w-12">#</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Item Name</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Minimum Stock Qty</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Stock Qty</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Stock Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500 text-xs">
                    <RefreshCw size={18} className="inline animate-spin mr-2 text-blue-600" />
                    Loading low stock items…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-rose-600 text-xs font-bold">
                      <AlertCircle size={22} />
                      <span>{error}</span>
                      <button
                        type="button"
                        onClick={() => setReloadKey((k) => k + 1)}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                      >
                        <RefreshCw size={12} />
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500 text-xs font-medium">
                    No low stock items found.
                  </td>
                </tr>
              ) : (
                pagedRows.map((r, i) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 text-xs text-center font-medium text-slate-400">
                      {(safePage - 1) * rowsPerPage + i + 1}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-800">
                      {r.item_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 text-right tabular-nums font-semibold">
                      {fmtQty(r.minimum_stock_qty)}
                    </td>
                    <td className="px-4 py-3 text-xs text-rose-600 text-right tabular-nums font-bold">
                      {fmtQty(r.stock_qty)}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-900 text-right tabular-nums">
                      {fmtINR(r.stock_value)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && !error && rows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50/90 font-bold border-t border-slate-200/80 text-slate-800">
                  <td className="px-4 py-3 text-xs text-center" colSpan={2}>Total</td>
                  <td className="px-4 py-3 text-xs text-right tabular-nums text-slate-400">—</td>
                  <td className="px-4 py-3 text-xs text-right tabular-nums text-rose-600">
                    {fmtQty(totals.stock_qty)}
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
          total={totalRows}
          page={safePage}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={(v) => { setRowsPerPage(v); setPage(1); }}
        />
      </div>
      </>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   STYLES — compact accounting-report look (Vyapar style)
   ═════════════════════════════════════════════════════════════════════ */

const topBarStyle = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
  padding: "8px 0",
  borderBottom: `1px solid ${LIGHT_BORDER}`,
};

const filtersLabelStyle = {
  fontSize: 10.5,
  fontWeight: 700,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  minWidth: 44,
};

const compactSelectBtnStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 10px",
  background: "#fff",
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 6,
  cursor: "pointer",
  fontFamily: FONT,
  whiteSpace: "nowrap",
};

const checkboxLabelStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12.5,
  fontWeight: 600,
  color: NAVY,
  whiteSpace: "nowrap",
  cursor: "pointer",
  userSelect: "none",
  fontFamily: FONT,
};

const circleBtnStyle = {
  width: 32,
  height: 32,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#fff",
  border: `1px solid ${LIGHT_BORDER}`,
  cursor: "pointer",
  flexShrink: 0,
};

const dropdownPanelStyle = {
  position: "absolute",
  top: "calc(100% + 5px)",
  left: 0,
  minWidth: 170,
  maxHeight: 280,
  overflowY: "auto",
  zIndex: 60,
  background: "#fff",
  border: `1.5px solid #e0e7ff`,
  borderRadius: 8,
  boxShadow: "0 12px 32px rgba(30,27,75,.12)",
  fontFamily: FONT,
};

const dropdownItemStyle = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "7px 12px",
  background: "transparent",
  border: "none",
  fontSize: 12.5,
  fontFamily: FONT,
  cursor: "pointer",
  transition: "background .1s",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const tableContainerStyle = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 6,
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
  padding: "7px 8px",
  fontSize: 10,
  fontWeight: 700,
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  background: "#f2f4f7",
  borderRight: `1px solid ${LIGHT_BORDER}`,
  borderBottom: `1px solid ${LIGHT_BORDER}`,
  whiteSpace: "normal",
  lineHeight: 1.3,
  userSelect: "none",
  position: "sticky",
  top: 0,
  zIndex: 2,
  verticalAlign: "middle",
};

const emptyCellStyle = {
  padding: "70px 24px",
  textAlign: "center",
  verticalAlign: "middle",
};

const tdStyle = {
  padding: "6px 8px",
  borderBottom: `1px solid ${LIGHT_BORDER}`,
  borderRight: `1px solid ${LIGHT_BORDER}`,
  fontSize: 12,
  color: "#334155",
  verticalAlign: "middle",
};

const totalAmountBarStyle = {
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  padding: "8px 14px",
  background: "#fff",
  borderTop: `1px solid ${LIGHT_BORDER}`,
  fontSize: 13,
  fontWeight: 800,
  color: NAVY,
};