import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, FileSpreadsheet, Printer, RefreshCw, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../../services/api";
import ReportPagination from "../../../components/reports/ReportPagination";

const FONT = "'Plus Jakarta Sans', sans-serif";
const INDIGO = "#4338ca";
const NAVY = "#1e1b4b";
const GRAY_TEXT = "#64748b";
const LIGHT_BORDER = "#e2e8f0";

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
    `<html><head><title>${title || "Item Wise Profit And Loss"}</title>
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

/* Narrow, Vyapar-style columns (wrapped headers, right-aligned figures).
   minWidth ensures horizontal scroll instead of crushing cells. */
const COLUMNS = [
  { key: "item_name", label: "Item Name", width: 170, min: 150, txt: true, right: false },
  { key: "sale", label: "Sale", width: 92, min: 82, right: true },
  { key: "sale_return", label: "Cr. Note / Sale Return", width: 118, min: 108, right: true },
  { key: "purchase", label: "Purchase", width: 92, min: 82, right: true },
  { key: "purchase_return", label: "Dr. Note / Purchase Return", width: 120, min: 110, right: true },
  { key: "opening_stock", label: "Opening Stock", width: 92, min: 84, right: true },
  { key: "closing_stock", label: "Closing Stock", width: 92, min: 84, right: true },
  { key: "tax_receivable", label: "Tax Receivable", width: 96, min: 86, right: true },
  { key: "tax_payable", label: "Tax Payable", width: 88, min: 80, right: true },
  { key: "mfg_cost", label: "Mfg. Cost", width: 78, min: 72, right: true },
  { key: "consumption_cost", label: "Consumption Cost", width: 96, min: 88, right: true },
  { key: "net_profit", label: "Net Profit/Loss", width: 104, min: 96, right: true },
];

const TABLE_MIN_WIDTH =
  COLUMNS.reduce((sum, c) => sum + c.min, 0) + 40; // + # column

/* ── Main Component ─────────────────────────────────────────────────── */
export default function ItemWiseProfitAndLoss() {
  const { adminId } = getAuth();

  const [period, setPeriod] = useState("this_month");
  const [{ from: startDate, to: endDate }, setRange] = useState(applyPeriod("this_month"));
  const [companyId, setCompanyId] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [companyName, setCompanyName] = useState("My Company");

  const [itemsHavingSale, setItemsHavingSale] = useState(false);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [periodOpen, setPeriodOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);

  const periodRef = useRef(null);
  const companyRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (periodRef.current && !periodRef.current.contains(e.target)) setPeriodOpen(false);
      if (companyRef.current && !companyRef.current.contains(e.target)) setCompanyOpen(false);
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
    setCompanyOpen(false);
  };

  // Fetch report from the backend on any filter change
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
        items_having_sale: itemsHavingSale,
      };
      api
        .get("/report/item-wise-profit-loss", { params })
        .then((res) => {
          if (res.data?.status) {
            setRows(res.data.data || []);
          } else {
            setError(res.data?.message || "Failed to load report.");
          }
        })
        .catch(() => setError("Failed to load report."))
        .finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(t);
  }, [companyId, adminId, startDate, endDate, itemsHavingSale, reloadKey]);

  const selectPeriod = (p) => {
    setPeriod(p.value);
    setRange(applyPeriod(p.value));
    setPeriodOpen(false);
  };

  // Totals from the currently displayed rows
  const shownTotals = useMemo(() => {
    const t = {};
    COLUMNS.forEach((c) => {
      if (!c.txt) t[c.key] = 0;
    });
    rows.forEach((r) => {
      COLUMNS.forEach((c) => {
        if (!c.txt) t[c.key] += Number(r[c.key] || 0);
      });
    });
    return t;
  }, [rows]);

  const prettyFrom = startDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const prettyTo = endDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const metaLabel = `${prettyFrom} to ${prettyTo}${itemsHavingSale ? " (Items Having Sale)" : ""}`;

  /* ── Excel export (all columns, currently displayed rows) ── */
  const handleExcel = () => {
    try {
      const sheetData = [
        ["Item Wise Profit And Loss"],
        ["Period", metaLabel],
        ["Company", companyName],
        [],
        ["#", ...COLUMNS.map((c) => c.label)],
      ];
      rows.forEach((r, i) => {
        sheetData.push([i + 1, ...COLUMNS.map((c) => (c.txt ? r[c.key] || "-" : fmtINRNum(r[c.key])))]);
      });
      sheetData.push(["Total", ...COLUMNS.map((c) => (c.txt ? "Total" : fmtINRNum(shownTotals[c.key] || 0)))]);
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws["!cols"] = [{ wch: 5 }, ...COLUMNS.map((c) => ({ wch: Math.max(13, c.label.length + 3) }))];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Item Wise Profit And Loss");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array", bookSST: false });
      saveAs(
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `Item_Wise_Profit_And_Loss_${formatDateISO(startDate)}_to_${formatDateISO(endDate)}.xlsx`
      );
    } catch {
      setError("Excel export failed. Please try again.");
    }
  };

  /* ── Print ── */
  const handlePrint = () => {
    const th = COLUMNS.map((c) => `<th class="${c.right ? "r" : ""}">${c.label}</th>`).join("");
    const buildRow = (r, i, isTotal) => {
      const cells = COLUMNS.map((c) => {
        if (c.txt) return `<td><strong>${r[c.key] || "-"}</strong></td>`;
        const val = Number(r[c.key] || 0);
        const cls = c.key === "net_profit" ? (val >= 0 ? "g" : "neg") + " r" : "r";
        return `<td class="${cls}"><strong>${fmtINR(val)}</strong></td>`;
      }).join("");
      return `<tr>${isTotal ? `<td class="r"><strong>${i}</strong></td>` : `<td>${i}</td>`}${cells}</tr>`;
    };
    const body =
      rows.map((r, i) => buildRow(r, i + 1, false)).join("") +
      buildRow(
        Object.fromEntries(COLUMNS.map((c) => (c.txt ? [c.key, "Total"] : [c.key, shownTotals[c.key] || 0]))),
        "",
        true
      );

    const el = document.createElement("div");
    el.innerHTML =
      `<h2>Item Wise Profit And Loss</h2>
       <div class="meta">${metaLabel} &nbsp;|&nbsp; ${companyName}</div>
       <table>
         <thead><tr><th class="r">#</th>${th}</tr></thead>
         <tbody>${body}</tbody>
       </table>
       <div class="summary">Total Amount: <span>${fmtINR(shownTotals.net_profit)}</span></div>`;
    printElement(el, "Item Wise Profit And Loss");
  };

  const checkbox = (checked, onChange) => (
    <label style={checkboxLabelStyle}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ width: 15, height: 15, accentColor: INDIGO, cursor: "pointer", margin: 0 }}
      />
      <span>Items Having Sale</span>
    </label>
  );

  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedRows = rows.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto text-slate-800 font-sans">
      {/* Filter Card */}
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-xs border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Period preset */}
          <div ref={periodRef} className="relative flex flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Period</span>
            <button
              type="button"
              onClick={() => setPeriodOpen((v) => !v)}
              className="bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-800 rounded-xl px-3 py-1.5 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 shadow-2xs cursor-pointer inline-flex items-center gap-2 min-w-[130px] justify-between"
            >
              <span className="truncate">{PERIODS.find((p) => p.value === period)?.label || "This Month"}</span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${periodOpen ? "rotate-180" : ""}`} />
            </button>
            {periodOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1.5 overflow-hidden">
                {PERIODS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => selectPeriod(p)}
                    className={`w-full text-left px-3.5 py-2 text-xs transition-colors ${
                      p.value === period
                        ? "bg-blue-50 text-blue-700 font-bold"
                        : "text-slate-700 hover:bg-slate-50 font-medium"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date range */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Between</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={formatDateISO(startDate)}
                onChange={(e) => {
                  setRange({ from: parseDateISO(e.target.value), to: endDate });
                  setPeriod("custom");
                }}
                className="bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-800 rounded-xl px-2.5 py-1.5 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 shadow-2xs cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-400">to</span>
              <input
                type="date"
                value={formatDateISO(endDate)}
                onChange={(e) => {
                  setRange({ from: startDate, to: parseDateISO(e.target.value) });
                  setPeriod("custom");
                }}
                className="bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-800 rounded-xl px-2.5 py-1.5 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 shadow-2xs cursor-pointer"
              />
            </div>
          </div>

          {/* Company dropdown */}
          <div ref={companyRef} className="relative flex flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Firm / Company</span>
            <button
              type="button"
              onClick={() => setCompanyOpen((v) => !v)}
              className="bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-800 rounded-xl px-3 py-1.5 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 shadow-2xs cursor-pointer inline-flex items-center gap-2 min-w-[150px] justify-between"
            >
              <span className="truncate">{companyName}</span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${companyOpen ? "rotate-180" : ""}`} />
            </button>
            {companyOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1.5 overflow-hidden">
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

          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors pt-4 sm:pt-4">
            <input
              type="checkbox"
              checked={itemsHavingSale}
              onChange={(e) => setItemsHavingSale(e.target.checked)}
              className="w-4 h-4 rounded-md text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
            />
            <span>Show Only Items Having Sale</span>
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
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-50/60 to-white p-4 rounded-2xl border border-indigo-100/80 shadow-2xs">
          <span className="text-[11px] font-bold tracking-wider text-indigo-700 uppercase">Total Items</span>
          <div className="text-xl font-black text-slate-800 tracking-tight mt-1">{rows.length}</div>
          <div className="text-[11px] font-medium text-slate-400 mt-0.5">Evaluated Products</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50/60 to-white p-4 rounded-2xl border border-blue-100/80 shadow-2xs">
          <span className="text-[11px] font-bold tracking-wider text-blue-700 uppercase">Total Sale</span>
          <div className="text-xl font-black text-slate-800 tracking-tight mt-1">{fmtINR(shownTotals.sale || 0)}</div>
          <div className="text-[11px] font-medium text-slate-400 mt-0.5">Gross Revenue</div>
        </div>
        <div className="bg-gradient-to-br from-amber-50/60 to-white p-4 rounded-2xl border border-amber-100/80 shadow-2xs">
          <span className="text-[11px] font-bold tracking-wider text-amber-700 uppercase">Total Purchase Cost</span>
          <div className="text-xl font-black text-amber-900 tracking-tight mt-1">{fmtINR(shownTotals.purchase || 0)}</div>
          <div className="text-[11px] font-medium text-slate-400 mt-0.5">Cost of Goods</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50/60 to-white p-4 rounded-2xl border border-emerald-100/80 shadow-2xs">
          <span className="text-[11px] font-bold tracking-wider text-emerald-700 uppercase">Net Profit / Loss</span>
          <div className={`text-xl font-black tracking-tight mt-1 ${Number(shownTotals.net_profit) >= 0 ? "text-emerald-900" : "text-rose-900"}`}>
            {fmtINR(shownTotals.net_profit || 0)}
          </div>
          <div className="text-[11px] font-medium text-slate-400 mt-0.5">Net Item Realization</div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" style={{ minWidth: TABLE_MIN_WIDTH }}>
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75">
                <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-center w-10">#</th>
                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    className={`px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 ${c.right ? "text-right" : "text-left"}`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-slate-500 text-xs">
                    <RefreshCw size={18} className="inline animate-spin mr-2 text-blue-600" />
                    Loading item profit and loss data…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center">
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
                  <td colSpan={13} className="px-4 py-12 text-center text-slate-500 text-xs font-medium">
                    No data available for the selected period.
                  </td>
                </tr>
              ) : (
                pagedRows.map((r, i) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3 py-3 text-xs text-center font-medium text-slate-400">
                      {(safePage - 1) * rowsPerPage + i + 1}
                    </td>
                    {COLUMNS.map((c) => {
                      if (c.txt) {
                        return (
                          <td key={c.key} className="px-3 py-3 text-xs font-bold text-slate-800">
                            {r[c.key] || "-"}
                          </td>
                        );
                      }
                      const val = Number(r[c.key] || 0);
                      const isNet = c.key === "net_profit" && val !== 0;
                      return (
                        <td
                          key={c.key}
                          className={`px-3 py-3 text-xs text-right tabular-nums ${
                            isNet
                              ? val >= 0
                                ? "font-bold text-emerald-700"
                                : "font-bold text-rose-600"
                              : "font-medium text-slate-700"
                          }`}
                        >
                          {fmtINR(val)}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
            {!loading && !error && rows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50/90 font-bold border-t border-slate-200/80 text-slate-800">
                  <td className="px-3 py-3 text-xs text-center"></td>
                  <td className="px-3 py-3 text-xs text-slate-900 font-extrabold">Total</td>
                  {COLUMNS.filter((c) => !c.txt).map((c) => (
                    <td key={c.key} className="px-3 py-3 text-xs text-right tabular-nums text-slate-900 font-extrabold">
                      {fmtINR(shownTotals[c.key] || 0)}
                    </td>
                  ))}
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

const compactDateInputStyle = {
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 6,
  padding: "4px 6px",
  fontSize: 12,
  fontFamily: FONT,
  color: "#334155",
  background: "#fff",
  outline: "none",
  width: 118,
};

const dateFieldStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  whiteSpace: "nowrap",
};

const dateLabelStyle = {
  fontSize: 11,
  color: GRAY_TEXT,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
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
  minWidth: 160,
  zIndex: 60,
  background: "#fff",
  border: `1.5px solid #e0e7ff`,
  borderRadius: 8,
  boxShadow: "0 12px 32px rgba(30,27,75,.12)",
  overflow: "hidden",
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

const detailsSectionStyle = {
  padding: "10px 0",
  borderBottom: `1px solid ${LIGHT_BORDER}`,
  marginBottom: 10,
};

const detailsTitleStyle = {
  fontSize: 10.5,
  fontWeight: 800,
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const filtersLabelStyle = {
  fontSize: 10.5,
  fontWeight: 700,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  minWidth: 44,
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