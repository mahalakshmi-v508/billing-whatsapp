import { useState, useRef, useEffect, useMemo } from "react";
import { BarChart3, Calendar, ChevronDown, ChevronRight, Search, Printer, FileSpreadsheet, RefreshCw, AlertCircle, TrendingUp, Layers, ShoppingCart, Percent } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../../services/api";
import ReportPagination from "../../../components/reports/ReportPagination";
import ReportAnalyticsView from "../../../components/reports/ReportAnalyticsView";

const PERIODS = [
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
  { label: "Last 30 Days", value: "last_30_days" },
  { label: "This Year", value: "this_year" },
  { label: "All Time", value: "all_time" },
];

const ITEM_STATUSES = [
  { label: "All Items", value: "all" },
  { label: "Active Items", value: "active" },
  { label: "Inactive Items", value: "inactive" },
];

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
    `<html><head><title>${title || "Item Category Wise Profit And Loss"}</title>
     <style>
       *{box-sizing:border-box;}
       body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:22px;color:#1e1b4b;}
       h2{margin:0 0 4px;font-size:17px;}
       .meta{color:#64748b;font-size:11.5px;margin-bottom:16px;}
       .summary{margin-top:10px;text-align:right;font-size:12px;font-weight:700;color:#1e1b4b;}
       .summary span{color:#15803d;}
       table{width:100%;border-collapse:collapse;font-size:10.5px;}
       th,td{border:1px solid #dbe2ec;padding:6px 7px;text-align:left;vertical-align:middle;}
       th{background:#f2f4f7;color:#334155;white-space:normal;line-height:1.25;}
       td.r,th.r{text-align:right;}
       td.g,th.g{color:#15803d;font-weight:600;}
       td.neg{color:#dc2626;font-weight:600;}
       td.child{color:#475569;}
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
  { key: "name", label: "Category Name", txt: true },
  { key: "sale", label: "Sale" },
  { key: "sale_return", label: "Cr. Note / Sale Return" },
  { key: "purchase", label: "Purchase" },
  { key: "purchase_return", label: "Dr. Note / Purchase Return" },
  { key: "opening_stock", label: "Opening Stock" },
  { key: "closing_stock", label: "Closing Stock" },
  { key: "tax_receivable", label: "Tax Receivable" },
  { key: "tax_payable", label: "Tax Payable" },
  { key: "mfg_cost", label: "Mfg. Cost" },
  { key: "consumption_cost", label: "Consumption Cost" },
  { key: "net_profit", label: "Net Profit/Loss" },
];

export default function ItemCategoryWiseProfitAndLoss() {
  const { adminId } = getAuth();
  const [period, setPeriod] = useState("this_month");
  const [{ from: startDate, to: endDate }, setRange] = useState(applyPeriod("this_month"));

  const [companyId, setCompanyId] = useState(null);
  const [companyName, setCompanyName] = useState("My Company");

  const [itemStatus, setItemStatus] = useState("active");
  const [query, setQuery] = useState("");

  const [rows, setRows] = useState([]);
  const [expanded, setExpanded] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  const [periodOpen, setPeriodOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const periodRef = useRef(null);
  const statusRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (periodRef.current && !periodRef.current.contains(e.target)) setPeriodOpen(false);
      if (statusRef.current && !statusRef.current.contains(e.target)) setStatusOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

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
      api
        .get("/report/item-category-wise-profit-loss", { params })
        .then((res) => {
          if (res.data?.status) {
            const list = res.data.data || [];
            setRows(list);
            setExpanded(new Set(list.filter((p) => (p.children || []).length > 0).map((p) => String(p.id))));
          } else {
            setError(res.data?.message || "Failed to load report.");
          }
        })
        .catch(() => setError("Failed to load report."))
        .finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(t);
  }, [companyId, adminId, startDate, endDate, reloadKey]);

  const selectPeriod = (p) => {
    setPeriod(p.value);
    setRange(applyPeriod(p.value));
    setPeriodOpen(false);
  };

  const selectStatus = (value) => {
    setItemStatus(value);
    setStatusOpen(false);
  };

  const toggleExpanded = (id) => {
    const key = String(id);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = () => {
    setExpanded(new Set(rows.filter((p) => (p.children || []).length > 0).map((p) => String(p.id))));
  };

  const collapseAll = () => {
    setExpanded(new Set());
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows
      .map((p) => {
        if (p.name.toLowerCase().includes(q)) return { ...p, children: p.children || [] };
        const matchedChildren = (p.children || []).filter((c) => String(c.name).toLowerCase().includes(q));
        if (matchedChildren.length > 0) return { ...p, children: matchedChildren };
        return null;
      })
      .filter(Boolean);
  }, [rows, query]);

  const displayRows = useMemo(() => {
    const list = [];
    visible.forEach((p) => {
      list.push({ ...p, depth: 0, isChild: false });
      if (expanded.has(String(p.id))) {
        (p.children || []).forEach((c) => list.push({ ...c, depth: 1, isChild: true }));
      }
    });
    return list;
  }, [visible, expanded]);

  const shownTotals = useMemo(() => {
    const t = {};
    COLUMNS.forEach((c) => { if (!c.txt) t[c.key] = 0; });
    visible.forEach((p) => {
      COLUMNS.forEach((c) => {
        if (!c.txt) t[c.key] += Number(p[c.key] || 0);
      });
    });
    return t;
  }, [visible]);

  const analyticsRows = useMemo(
    () =>
      (visible || []).map((r) => ({
        date: "",
        group: r.name || "General",
        value: Number(r.net_profit) || 0,
        count: 1,
      })),
    [visible]
  );

  const prettyFrom = startDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const prettyTo = endDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const statusLabel = ITEM_STATUSES.find((s) => s.value === itemStatus)?.label || "Active Items";
  const metaLabel = `${prettyFrom} to ${prettyTo} | ${companyName} | ${statusLabel}`;

  const totalPages = Math.max(1, Math.ceil(displayRows.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedRows = displayRows.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const handleExcel = () => {
    try {
      const sheetData = [
        ["Item Category Wise Profit And Loss"],
        ["Period", metaLabel],
        [],
        COLUMNS.map((c) => c.label),
      ];
      displayRows.forEach((r) => {
        sheetData.push(
          COLUMNS.map((c) => {
            if (c.txt) return (r.isChild ? "    " : "") + (r[c.key] || "-");
            return Number(r[c.key] || 0);
          })
        );
      });
      sheetData.push(
        COLUMNS.map((c) => {
          if (c.txt) return "Total";
          return Number(shownTotals[c.key] || 0);
        })
      );
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws["!cols"] = COLUMNS.map((c) => ({ wch: c.txt ? 28 : 16 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Profit & Loss");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array", bookSST: false });
      saveAs(
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `Item_Category_Wise_Profit_Loss_${formatDateISO(startDate)}_to_${formatDateISO(endDate)}.xlsx`
      );
    } catch {
      setError("Excel export failed. Please try again.");
    }
  };

  const handlePrint = () => {
    const th = COLUMNS.map((c) => `<th class="${c.txt ? "" : "r"}">${c.label}</th>`).join("");
    const buildRow = (r, isChild) => {
      const cells = COLUMNS.map((c) => {
        if (c.txt) {
          const prefix = isChild ? "&nbsp;&nbsp;&nbsp;&bull;&nbsp;" : "";
          return `<td class="${isChild ? "child" : ""}">${prefix}${r[c.key] || "-"}</td>`;
        }
        const val = Number(r[c.key] || 0);
        const cls = c.key === "net_profit" ? (val >= 0 ? "r g" : "r neg") : "r";
        return `<td class="${cls}">${fmtINR(val)}</td>`;
      }).join("");
      return `<tr>${cells}</tr>`;
    };
    const body =
      displayRows.map((r) => buildRow(r, r.isChild)).join("") +
      (displayRows.length
        ? `<tr>${COLUMNS.map((c) => {
            if (c.txt) return "<td><strong>Total</strong></td>";
            const val = Number(shownTotals[c.key] || 0);
            const cls = c.key === "net_profit" ? (val >= 0 ? "r g" : "r neg") : "r";
            return `<td class="${cls}"><strong>${fmtINR(val)}</strong></td>`;
          }).join("")}</tr>`
        : "");

    const el = document.createElement("div");
    el.innerHTML =
      `<h2>Item Category Wise Profit And Loss</h2>
       <div class="meta">${metaLabel}</div>
       <table>
         <thead><tr>${th}</tr></thead>
         <tbody>${body}</tbody>
       </table>
       <div class="summary">Net Profit / Loss: <span>${fmtINR(shownTotals.net_profit)}</span></div>`;
    printElement(el, "Item Category Wise Profit And Loss");
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto text-slate-800 font-sans">
      {/* Header & Export Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            <span>Financial & P&L</span>
            <span>•</span>
            <span>Category Profitability</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            Item Category Wise Profit & Loss
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Hierarchical margins, direct costs, tax obligations, and net profit per product category
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
          <button
            type="button"
            onClick={() => setAnalyticsOpen(true)}
            disabled={!visible.length}
            title="Open Analytics"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <BarChart3 size={16} />
            <span>Analytics</span>
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-xs border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Period selector */}
          <div ref={periodRef} className="relative">
            <button
              onClick={() => setPeriodOpen((v) => !v)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50/80 text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <span>{PERIODS.find((p) => p.value === period)?.label || "Custom"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {periodOpen && (
              <div className="absolute left-0 top-[calc(100%+4px)] min-w-[150px] bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1">
                {PERIODS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => selectPeriod(p)}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 font-medium cursor-pointer transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* From Date */}
          <div className="flex items-center gap-2 bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">From:</span>
            <input
              type="date"
              value={formatDateISO(startDate)}
              onChange={(e) => {
                setRange({ from: parseDateISO(e.target.value), to: endDate });
                setPeriod("custom");
              }}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
            />
          </div>

          {/* To Date */}
          <div className="flex items-center gap-2 bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">To:</span>
            <input
              type="date"
              value={formatDateISO(endDate)}
              onChange={(e) => {
                setRange({ from: startDate, to: parseDateISO(e.target.value) });
                setPeriod("custom");
              }}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
            />
          </div>

          {/* Status Dropdown */}
          <div ref={statusRef} className="relative">
            <button
              onClick={() => setStatusOpen((v) => !v)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50/80 text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <span>{ITEM_STATUSES.find((s) => s.value === itemStatus)?.label || "Active Items"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {statusOpen && (
              <div className="absolute left-0 top-[calc(100%+4px)] min-w-[150px] bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1">
                {ITEM_STATUSES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => selectStatus(s.value)}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 font-medium cursor-pointer transition-colors"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative w-48 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search category / item..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              className="w-full pl-8 pr-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/80 text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={expandAll}
            className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
            title="Expand all categories"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
            title="Collapse all categories"
          >
            Collapse All
          </button>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Categories</div>
            <div className="text-xl font-black text-slate-800 mt-0.5">{visible.length}</div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Top-level categories</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Total Sales</div>
            <div className="text-xl font-black text-emerald-600 mt-0.5">
              {fmtINR(shownTotals.sale)}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Gross turnover value</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Total Purchase</div>
            <div className="text-xl font-black text-blue-600 mt-0.5">
              {fmtINR(shownTotals.purchase)}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Direct item acquisitions</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
            shownTotals.net_profit >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"
          }`}>
            <Percent className={`w-6 h-6 ${shownTotals.net_profit >= 0 ? "text-emerald-600" : "text-rose-600"}`} />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Net Profit / Loss</div>
            <div className={`text-xl font-black mt-0.5 ${
              shownTotals.net_profit >= 0 ? "text-emerald-600" : "text-rose-600"
            }`}>
              {fmtINR(shownTotals.net_profit)}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Category aggregate margin</div>
          </div>
        </div>
      </div>

      {/* Modern Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left min-w-[1100px]">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75">
                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    className={`px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 ${
                      c.txt ? "text-left" : "text-right"
                    }`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-4 py-16 text-center text-slate-400 font-medium">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading category P&L...
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
              ) : displayRows.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-4 py-16 text-center text-slate-400 font-medium">
                    No category data available.
                  </td>
                </tr>
              ) : (
                pagedRows.map((r) => {
                  const hasChildren = (r.children || []).length > 0;
                  const isExp = expanded.has(String(r.id));
                  const profit = Number(r.net_profit || 0);

                  return (
                    <tr
                      key={`${r.id}-${r.isChild ? "child" : "parent"}`}
                      className={`transition-colors ${
                        r.isChild
                          ? "bg-slate-50/40 hover:bg-slate-100/60 text-slate-600"
                          : "hover:bg-slate-50/80 font-medium text-slate-800"
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5" style={{ paddingLeft: r.isChild ? "20px" : "0px" }}>
                          {!r.isChild && hasChildren && (
                            <button
                              onClick={() => toggleExpanded(r.id)}
                              className="p-1 rounded hover:bg-slate-200/80 text-slate-500 transition-colors cursor-pointer"
                            >
                              {isExp ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          {!r.isChild && !hasChildren && <span className="w-5.5 inline-block" />}
                          {r.isChild && <span className="text-slate-400 text-xs font-mono">&bull;</span>}
                          <span className={r.isChild ? "text-slate-600 font-medium" : "font-bold text-slate-900"}>
                            {r.name || "-"}
                          </span>
                          {!r.isChild && hasChildren && (
                            <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                              {r.children.length}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-slate-700">{fmtINRNum(r.sale)}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-rose-600">{fmtINRNum(r.sale_return)}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-slate-700">{fmtINRNum(r.purchase)}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-emerald-600">{fmtINRNum(r.purchase_return)}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-slate-600">{fmtINRNum(r.opening_stock)}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-slate-600">{fmtINRNum(r.closing_stock)}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-slate-600">{fmtINRNum(r.tax_receivable)}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-slate-600">{fmtINRNum(r.tax_payable)}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-slate-600">{fmtINRNum(r.mfg_cost)}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-slate-600">{fmtINRNum(r.consumption_cost)}</td>
                      <td className={`px-3 py-2.5 text-right font-bold ${
                        profit >= 0 ? "text-emerald-700 bg-emerald-50/40" : "text-rose-700 bg-rose-50/40"
                      }`}>
                        {fmtINR(profit)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {!loading && !error && displayRows.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50/90 font-bold text-slate-800 text-xs">
                <tr>
                  <td className="px-3 py-3 uppercase tracking-wider font-extrabold text-slate-900">Total</td>
                  <td className="px-3 py-3 text-right font-bold text-slate-900">{fmtINRNum(shownTotals.sale)}</td>
                  <td className="px-3 py-3 text-right font-bold text-rose-700">{fmtINRNum(shownTotals.sale_return)}</td>
                  <td className="px-3 py-3 text-right font-bold text-slate-900">{fmtINRNum(shownTotals.purchase)}</td>
                  <td className="px-3 py-3 text-right font-bold text-emerald-700">{fmtINRNum(shownTotals.purchase_return)}</td>
                  <td className="px-3 py-3 text-right font-bold text-slate-800">{fmtINRNum(shownTotals.opening_stock)}</td>
                  <td className="px-3 py-3 text-right font-bold text-slate-800">{fmtINRNum(shownTotals.closing_stock)}</td>
                  <td className="px-3 py-3 text-right font-bold text-slate-800">{fmtINRNum(shownTotals.tax_receivable)}</td>
                  <td className="px-3 py-3 text-right font-bold text-slate-800">{fmtINRNum(shownTotals.tax_payable)}</td>
                  <td className="px-3 py-3 text-right font-bold text-slate-800">{fmtINRNum(shownTotals.mfg_cost)}</td>
                  <td className="px-3 py-3 text-right font-bold text-slate-800">{fmtINRNum(shownTotals.consumption_cost)}</td>
                  <td className={`px-3 py-3 text-right font-extrabold ${
                    shownTotals.net_profit >= 0 ? "text-emerald-800 bg-emerald-100/50" : "text-rose-800 bg-rose-100/50"
                  }`}>
                    {fmtINR(shownTotals.net_profit)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <ReportPagination
          total={displayRows.length}
          page={safePage}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={(v) => {
            setRowsPerPage(v);
            setPage(1);
          }}
        />
      </div>
      {analyticsOpen && (
        <ReportAnalyticsView
          title="Item Category Wise Profit & Loss Analytics"
          subtitle={`${analyticsRows.length} records`}
          rows={analyticsRows}
          symbol="₹"
          groupLabel="Categories"
          onClose={() => setAnalyticsOpen(false)}
        />
      )}
    </div>
  );
}
