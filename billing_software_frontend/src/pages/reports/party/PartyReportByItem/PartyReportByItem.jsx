import { useState, useRef, useEffect, useMemo } from "react";
import {
  BarChart3,
  ChevronDown,
  Search,
  FileSpreadsheet,
  Printer,
  X,
  AlertCircle,
  Building2,
  Calendar,
  Layers,
  Package,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  ShoppingCart,
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../../../services/api";
import ReportPagination from "../../../../components/reports/ReportPagination";
import PartyReportByItemAnalytics from "./PartyReportByItemAnalytics";
import { showToast } from "../../../../utils/reportToast";

const PERIODS = [
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
  { label: "Last 30 Days", value: "last_30_days" },
  { label: "This Year", value: "this_year" },
  { label: "All Time", value: "all_time" },
];

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
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateISO(s) {
  if (!s) return new Date();
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function today() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function applyPeriod(period) {
  const t = today();
  if (period === "this_month") {
    return { from: new Date(t.getFullYear(), t.getMonth(), 1), to: t };
  }
  if (period === "last_month") {
    const first = new Date(t.getFullYear(), t.getMonth() - 1, 1);
    const last = new Date(t.getFullYear(), t.getMonth(), 0);
    return { from: first, to: last };
  }
  if (period === "last_30_days") {
    const from = new Date(t);
    from.setDate(from.getDate() - 29);
    return { from, to: t };
  }
  if (period === "this_year") {
    return { from: new Date(t.getFullYear(), 0, 1), to: t };
  }
  return { from: new Date(2000, 0, 1), to: t };
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
    `<html><head><title>${title || "Party Report By Item"}</title>
     <style>
       body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:28px;color:#0f172a;}
       h2{margin:0 0 4px;font-size:18px;color:#1e1b4b;}
       .meta{color:#64748b;font-size:12px;margin-bottom:18px;}
       table{width:100%;border-collapse:collapse;font-size:11px;}
       th,td{border:1px solid #e2e8f0;padding:7px 9px;text-align:left;}
       th{background:#f8fafc;color:#475569;font-weight:bold;}
       td.r,th.r{text-align:right;}
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
export default function PartyReportByItem() {
  const { adminId } = getAuth();

  const [period, setPeriod] = useState("this_month");
  const [{ from: startDate, to: endDate }, setRange] = useState(applyPeriod("this_month"));
  const [companyId, setCompanyId] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [companyName, setCompanyName] = useState("My Company");

  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(0);
  const [items, setItems] = useState([]);
  const [itemId, setItemId] = useState(0);

  const [query, setQuery] = useState("");
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ sale_qty: 0, sale_amt: 0, purchase_qty: 0, purchase_amt: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [periodOpen, setPeriodOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState("report");

  const periodRef = useRef(null);
  const companyRef = useRef(null);
  const catRef = useRef(null);
  const itemRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (periodRef.current && !periodRef.current.contains(e.target)) setPeriodOpen(false);
      if (companyRef.current && !companyRef.current.contains(e.target)) setCompanyOpen(false);
      if (catRef.current && !catRef.current.contains(e.target)) setCatOpen(false);
      if (itemRef.current && !itemRef.current.contains(e.target)) setItemOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Load companies
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
    setItemId(0);
    setCompanyOpen(false);
  };

  // Load categories
  useEffect(() => {
    if (!companyId) return;
    api
      .get(`/category/get_active_category?company_id=${companyId}`)
      .then((res) => setCategories(res.data?.status ? res.data.data || [] : []))
      .catch(() => setCategories([]));
  }, [companyId]);

  // Load products
  useEffect(() => {
    if (!companyId) return;
    api
      .get(`/product/get?company_id=${companyId}`)
      .then((res) => setItems(res.data?.status ? res.data.data || [] : []))
      .catch(() => setItems([]));
  }, [companyId]);

  const categoryItems = useMemo(() => {
    if (categoryId === 0) return items;
    return items.filter((it) => Number(it.category_id) === Number(categoryId));
  }, [items, categoryId]);

  const selectedCatLabel = useMemo(
    () => categories.find((c) => Number(c.id) === Number(categoryId))?.name || "All Categories",
    [categories, categoryId]
  );
  const selectedItemLabel = useMemo(
    () => (itemId === 0 ? "All Items" : categoryItems.find((it) => Number(it.id) === Number(itemId))?.product_name || "All Items"),
    [categoryItems, itemId]
  );

  // Fetch report data
  useEffect(() => {
    if (companyId === null) return;
    const t = setTimeout(() => {
      setLoading(true);
      setError("");
      const params = {
        company_id: companyId,
        admin_id: adminId || 0,
        from_date: formatDateISO(startDate),
        to_date: formatDateISO(endDate),
      };
      if (categoryId > 0) params.category_id = categoryId;
      if (itemId > 0) params.item_id = itemId;
      api
        .get("/report/party-report-by-item", { params })
        .then((res) => {
          if (res.data?.status) {
            setRows(res.data.data || []);
            setTotals(
              res.data.totals || { sale_qty: 0, sale_amt: 0, purchase_qty: 0, purchase_amt: 0 }
            );
          } else {
            setError(res.data?.message || "Failed to load report.");
          }
        })
        .catch(() => setError("Failed to load report."))
        .finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(t);
  }, [companyId, adminId, startDate, endDate, categoryId, itemId]);

  const selectPeriod = (p) => {
    setPeriod(p.value);
    setRange(applyPeriod(p.value));
    setPeriodOpen(false);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => (r.name || "").toLowerCase().includes(q));
  }, [rows, query]);

  const prettyFrom = startDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const prettyTo = endDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const metaLabel = `${prettyFrom} to ${prettyTo}`;

  const totalRows = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedRows = filtered.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const analyticsRows = useMemo(
    () =>
      (filtered || []).map((r) => ({
        date: "",
        group: r.name || "General",
        value: Number(r.sale_amt) || 0,
        count: 1,
      })),
    [filtered]
  );

  /* ── Excel export ── */
  const handleExcel = () => {
    try {
      const sheetData = [
        ["Party Report By Item"],
        ["Period", metaLabel],
        ["Company", companyName],
        ["Category", selectedCatLabel],
        ["Item", itemId === 0 ? "All Items" : selectedItemLabel],
        [],
        ["#", "Party Name", "Sale Quantity", "Sale Amount", "Purchase Quantity", "Purchase Amount"],
      ];
      filtered.forEach((r, i) => {
        sheetData.push([
          i + 1, r.name || "",
          Number(r.sale_qty || 0), fmtINRNum(r.sale_amt),
          Number(r.purchase_qty || 0), fmtINRNum(r.purchase_amt),
        ]);
      });
      sheetData.push([
        "Total", "Total",
        Number(totals.sale_qty || 0), fmtINRNum(totals.sale_amt),
        Number(totals.purchase_qty || 0), fmtINRNum(totals.purchase_amt),
      ]);
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws["!cols"] = [
        { wch: 4 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Party Report By Item");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array", bookSST: false });
      saveAs(
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `Party_Report_By_Item_${formatDateISO(startDate)}_to_${formatDateISO(endDate)}.xlsx`
      );
      showToast("Excel exported successfully.", "success");
    } catch {
      setError("Excel export failed. Please try again.");
    }
  };

  /* ── Print ── */
  const handlePrint = () => {
    const buildTable = (rowsList) =>
      `<table>
        <thead><tr>
          <th>#</th><th>Party Name</th>
          <th class="r">Sale Qty</th><th class="r">Sale Amount</th>
          <th class="r">Purchase Qty</th><th class="r">Purchase Amount</th>
        </tr></thead>
        <tbody>${
          rowsList
            .map(
              (r, i) =>
                `<tr>
                  <td>${i + 1}</td><td>${r.name || "-"}</td>
                  <td class="r">${Number(r.sale_qty || 0)}</td><td class="r">${fmtINR(r.sale_amt)}</td>
                  <td class="r">${Number(r.purchase_qty || 0)}</td><td class="r">${fmtINR(r.purchase_amt)}</td>
                </tr>`
            )
            .join("")
        }
        <tr>
          <td colspan="2"><strong>Total</strong></td>
          <td class="r"><strong>${Number(totals.sale_qty || 0)}</strong></td>
          <td class="r"><strong>${fmtINR(totals.sale_amt)}</strong></td>
          <td class="r"><strong>${Number(totals.purchase_qty || 0)}</strong></td>
          <td class="r"><strong>${fmtINR(totals.purchase_amt)}</strong></td>
        </tr>
        </tbody>
      </table>`;

    const el = document.createElement("div");
    el.innerHTML =
      `<h2>Party Report By Item</h2>
       <div class="meta">${metaLabel} &nbsp;|&nbsp; ${companyName} &nbsp;|&nbsp; ${selectedCatLabel} &nbsp;|&nbsp; ${itemId === 0 ? "All Items" : selectedItemLabel}</div>
       ${buildTable(filtered)}`;
    printElement(el, "Party Report By Item");
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto text-slate-800">
      {viewMode === "analytics" ? (
        <PartyReportByItemAnalytics
          rows={filtered}
          period={`${prettyFrom} → ${prettyTo}`}
          onClose={() => setViewMode("report")}
        />
      ) : (
        <>
      {/* ═══════════════════════════════════════════════════════════════
          1. HEADER CONTROLS (Period, Dates, Firm, Category, Item, Actions)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-xs border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Period selector */}
          <div ref={periodRef} className="relative">
            <button
              onClick={() => setPeriodOpen((v) => !v)}
              className="inline-flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200/80 rounded-xl hover:bg-slate-100 transition shadow-2xs"
            >
              <Calendar size={14} className="text-indigo-600" />
              <span>{PERIODS.find((p) => p.value === period)?.label || "This Month"}</span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform duration-150 ${periodOpen ? "rotate-180" : ""}`} />
            </button>
            {periodOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100">
                {PERIODS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => selectPeriod(p)}
                    className={`w-full text-left px-3.5 py-2 text-xs transition-colors ${
                      p.value === period
                        ? "bg-indigo-50 text-indigo-700 font-bold"
                        : "text-slate-700 hover:bg-slate-50 font-medium"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date range inputs */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">Between</span>
            <input
              type="date"
              value={formatDateISO(startDate)}
              onChange={(e) => { setRange({ from: parseDateISO(e.target.value), to: endDate }); setPeriod("custom"); }}
              className="bg-transparent border-0 text-xs font-bold text-slate-800 p-0 focus:ring-0 cursor-pointer"
            />
            <span className="text-xs font-semibold text-slate-400">To</span>
            <input
              type="date"
              value={formatDateISO(endDate)}
              onChange={(e) => { setRange({ from: startDate, to: parseDateISO(e.target.value) }); setPeriod("custom"); }}
              className="bg-transparent border-0 text-xs font-bold text-slate-800 p-0 focus:ring-0 cursor-pointer"
            />
          </div>

          {/* Company dropdown */}
          <div ref={companyRef} className="relative min-w-[160px]">
            <button
              onClick={() => setCompanyOpen((v) => !v)}
              className="w-full inline-flex items-center justify-between gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200/80 rounded-xl hover:bg-slate-100 transition shadow-2xs"
            >
              <div className="flex items-center gap-2 truncate">
                <Building2 size={14} className="text-indigo-600 flex-shrink-0" />
                <span className="truncate">{companyName}</span>
              </div>
              <ChevronDown size={14} className={`text-slate-400 transition-transform duration-150 ${companyOpen ? "rotate-180" : ""}`} />
            </button>
            {companyOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto p-1 animate-in fade-in zoom-in-95 duration-100">
                {companies.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectCompany(c)}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors truncate ${
                      Number(c.id) === Number(companyId) ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {c.company_name || "My Company"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Categories dropdown */}
          <div ref={catRef} className="relative min-w-[150px]">
            <button
              onClick={() => setCatOpen((v) => !v)}
              className="w-full inline-flex items-center justify-between gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200/80 rounded-xl hover:bg-slate-100 transition shadow-2xs"
            >
              <div className="flex items-center gap-2 truncate">
                <Layers size={14} className="text-indigo-600 flex-shrink-0" />
                <span className="truncate">{selectedCatLabel}</span>
              </div>
              <ChevronDown size={14} className={`text-slate-400 transition-transform duration-150 ${catOpen ? "rotate-180" : ""}`} />
            </button>
            {catOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto p-1 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => { setCategoryId(0); setCatOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${
                    categoryId === 0 ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  All Categories
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setCategoryId(Number(c.id)); setItemId(0); setCatOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors truncate ${
                      Number(c.id) === Number(categoryId) ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Item dropdown */}
          <div ref={itemRef} className="relative min-w-[160px]">
            <button
              onClick={() => setItemOpen((v) => !v)}
              className="w-full inline-flex items-center justify-between gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200/80 rounded-xl hover:bg-slate-100 transition shadow-2xs"
            >
              <div className="flex items-center gap-2 truncate">
                <Package size={14} className="text-indigo-600 flex-shrink-0" />
                <span className="truncate">{selectedItemLabel}</span>
              </div>
              <ChevronDown size={14} className={`text-slate-400 transition-transform duration-150 ${itemOpen ? "rotate-180" : ""}`} />
            </button>
            {itemOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto p-1 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => { setItemId(0); setItemOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${
                    itemId === 0 ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  All Items
                </button>
                {categoryItems.map((it) => (
                  <button
                    key={it.id}
                    onClick={() => { setItemId(Number(it.id)); setItemOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors truncate ${
                      Number(it.id) === Number(itemId) ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {it.product_name}
                  </button>
                ))}
                {categoryItems.length === 0 && (
                  <div className="p-3 text-center text-slate-400 text-xs font-medium">No items found</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-emerald-200 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100/80 transition-all shadow-2xs"
          >
            <FileSpreadsheet size={15} />
            <span>Excel</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all shadow-2xs"
          >
            <Printer size={15} />
            <span>Print</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("analytics")}
            disabled={!filtered.length}
            title="Open Analytics"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <BarChart3 size={16} />
            <span>Analytics</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          2. KPI SUMMARY CARDS RIBBON
          ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sale Qty */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Sale Quantity</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingBag size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-black text-slate-900">{Number(totals.sale_qty || 0).toLocaleString()}</div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">Total units sold to parties</div>
          </div>
        </div>

        {/* Sale Amount */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Sale Amount</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-black text-emerald-600">{fmtINR(totals.sale_amt)}</div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">Revenue from party sales</div>
          </div>
        </div>

        {/* Purchase Qty */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Purchase Quantity</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShoppingCart size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-black text-slate-900">{Number(totals.purchase_qty || 0).toLocaleString()}</div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">Total units purchased from parties</div>
          </div>
        </div>

        {/* Purchase Amount */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Purchase Amount</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-black text-rose-600">{fmtINR(totals.purchase_amt)}</div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">Expenses on party purchases</div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          3. PARTY REPORT DATA TABLE
          ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        {/* Table Search Bar */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by party name..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3.5 w-12 text-center">#</th>
                <th className="px-4 py-3.5">PARTY NAME</th>
                <th className="px-4 py-3.5 text-right">SALE QTY</th>
                <th className="px-4 py-3.5 text-right">SALE AMOUNT</th>
                <th className="px-4 py-3.5 text-right">PURCHASE QTY</th>
                <th className="px-4 py-3.5 text-right">PURCHASE AMOUNT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2 font-medium">
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      Loading report by item...
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-rose-500">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle size={28} className="text-rose-500" />
                      <span className="font-semibold">{error}</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Package size={32} className="text-slate-300" />
                      <div className="text-sm font-bold text-slate-700">No party records found</div>
                      <div className="text-xs text-slate-400">Try selecting a different item, category or date range.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedRows.map((r, i) => (
                  <tr key={`${r.party_id || i}-${r.name}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 text-center text-slate-400 font-medium">
                      {(safePage - 1) * rowsPerPage + i + 1}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">
                      {r.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">
                      {Number(r.sale_qty || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-emerald-600 whitespace-nowrap">
                      {fmtINR(r.sale_amt)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">
                      {Number(r.purchase_qty || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-rose-600 whitespace-nowrap">
                      {fmtINR(r.purchase_amt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold text-xs text-slate-800">
                  <td colSpan={2} className="px-4 py-3.5 text-slate-600 uppercase tracking-wider text-[11px]">
                    Total
                  </td>
                  <td className="px-4 py-3.5 text-right font-black text-slate-900">
                    {Number(totals.sale_qty || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right font-black text-emerald-600">
                    {fmtINR(totals.sale_amt)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-black text-slate-900">
                    {Number(totals.purchase_qty || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right font-black text-rose-600">
                    {fmtINR(totals.purchase_amt)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Universal Pagination */}
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
