import { useState, useRef, useEffect, useMemo } from "react";
import {
  BarChart3,
  ChevronDown,
  Search,
  FileSpreadsheet,
  Printer,
  Filter,
  X,
  AlertCircle,
  Building2,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  Wallet,
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../../services/api";
import ReportPagination from "../../../components/reports/ReportPagination";
import ReportAnalyticsView from "../../../components/reports/ReportAnalyticsView";
import { showToast } from "../../../utils/reportToast";

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
  if (period === "this_month") return { from: new Date(t.getFullYear(), t.getMonth(), 1), to: t };
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
  if (period === "this_year") return { from: new Date(t.getFullYear(), 0, 1), to: t };
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
    `<html><head><title>${title || "Sale Purchase By Party"}</title>
     <style>
       body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:28px;color:#0f172a;}
       h2{margin:0 0 4px;font-size:18px;color:#1e1b4b;}
       .meta{color:#64748b;font-size:12px;margin-bottom:18px;}
       table{width:100%;border-collapse:collapse;font-size:11px;}
       th,td{border:1px solid #e2e8f0;padding:7px 9px;text-align:left;}
       th{background:#f8fafc;color:#475569;font-weight:bold;}
       td.r,th.r{text-align:right;}
       td.sale{color:#15803d;font-weight:700;}
       td.purchase{color:#dc2626;font-weight:700;}
       tfoot td{background:#f8fafc;font-weight:700;}
     </style></head>
     <body>${element.innerHTML}</body></html>`
  );
  doc.close();
  const win = iframe.contentWindow;
  const fire = () => { try { win.focus(); win.print(); } finally { setTimeout(() => iframe.remove(), 1500); } };
  if (doc.readyState === "complete") fire();
  else win.addEventListener("load", fire);
}

const COL_KEY = {
  "PARTY NAME": "name",
  "SALE AMOUNT": "sale_amount",
  "PURCHASE AMOUNT": "purchase_amount",
};

/* ── Main Component ─────────────────────────────────────────────────── */
export default function SalePurchaseByParty() {
  const { adminId } = getAuth();

  const [period, setPeriod] = useState("this_month");
  const [{ from: startDate, to: endDate }, setRange] = useState(applyPeriod("this_month"));
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState(null);
  const [firm, setFirm] = useState("all");

  const [query, setQuery] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [periodOpen, setPeriodOpen] = useState(false);
  const [firmOpen, setFirmOpen] = useState(false);
  const [openFilter, setOpenFilter] = useState("");
  const [colFilters, setColFilters] = useState({});

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  const periodRef = useRef(null);
  const firmRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (periodRef.current && !periodRef.current.contains(e.target)) setPeriodOpen(false);
      if (firmRef.current && !firmRef.current.contains(e.target)) setFirmOpen(false);
      if (!e.target.closest("[data-col-filter]")) setOpenFilter("");
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
        if (match) {
          setFirm(String(match.id));
          setCompanyId(Number(match.id));
        }
      })
      .catch(() => setError("Failed to load firms."));
  }, [adminId]);

  const selectFirm = (val) => {
    setFirm(val);
    setCompanyId(val === "all" ? null : Number(val));
    setFirmOpen(false);
    if (val !== "all" && val !== null) {
      const c = companies.find((x) => String(x.id) === String(val));
      if (c) localStorage.setItem("selected_company_id", String(c.id));
    }
  };

  // Fetch report on filter change
  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      setError("");
      const params = {
        admin_id: adminId || 0,
        company_id: companyId || 0,
        from_date: formatDateISO(startDate),
        to_date: formatDateISO(endDate),
      };
      api
        .get("/report/sale-purchase-by-party", { params })
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
  }, [adminId, companyId, startDate, endDate]);

  const selectPeriod = (p) => {
    setPeriod(p.value);
    setRange(applyPeriod(p.value));
    setPeriodOpen(false);
  };

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => (r.name || "").toLowerCase().includes(q));
  }, [rows, query]);

  const displayed = useMemo(() => {
    if (!colFilters || !Object.keys(colFilters).some((k) => colFilters[k]?.trim())) return searched;
    return searched.filter((row) => {
      for (const col of Object.keys(colFilters)) {
        const fv = (colFilters[col] || "").trim().toLowerCase();
        if (!fv) continue;
        const field = COL_KEY[col];
        const cell = String(field ? row[field] : row[col] ?? "");
        if (!cell.toLowerCase().includes(fv)) return false;
      }
      return true;
    });
  }, [searched, colFilters]);

  const visibleTotals = useMemo(() => {
    let sale = 0;
    let purchase = 0;
    displayed.forEach((r) => {
      sale += Number(r.sale_amount || 0);
      purchase += Number(r.purchase_amount || 0);
    });
    return { sale, purchase, net: sale - purchase };
  }, [displayed]);

  const clickFilterIcon = (col) => setOpenFilter((cur) => (cur === col ? "" : col));

  const prettyFrom = startDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const prettyTo = endDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const metaLabel = `${prettyFrom} to ${prettyTo}`;
  const firmLabel = firm === "all" ? "All Firms" : (companies.find((c) => String(c.id) === String(firm))?.company_name || "All Firms");

  const totalRows = displayed.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedRows = displayed.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const analyticsRows = useMemo(
    () =>
      (displayed || []).map((r) => ({
        date: "",
        group: r.name || "General",
        value: Number(r.sale_amount) || 0,
        count: 1,
      })),
    [displayed]
  );

  /* ── Excel export ── */
  const handleExcel = () => {
    try {
      const sheetData = [
        ["Sale Purchase By Party"],
        ["Period", metaLabel],
        ["Firm", firmLabel],
        [],
        ["#", "Party Name", "Sale Amount", "Purchase Amount"],
      ];
      displayed.forEach((r, i) => {
        sheetData.push([
          i + 1, r.name || "",
          Number(r.sale_amount || 0), Number(r.purchase_amount || 0),
        ]);
      });
      sheetData.push([
        "Total", "Total",
        Number(visibleTotals.sale || 0), Number(visibleTotals.purchase || 0),
      ]);
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws["!cols"] = [{ wch: 4 }, { wch: 22 }, { wch: 14 }, { wch: 16 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sale Purchase By Party");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array", bookSST: false });
      saveAs(
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `Sale_Purchase_By_Party_${formatDateISO(startDate)}_to_${formatDateISO(endDate)}.xlsx`
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
          <th class="r sale">Sale Amount</th>
          <th class="r purchase">Purchase Amount</th>
        </tr></thead>
        <tbody>${
          rowsList
            .map(
              (r, i) =>
                `<tr>
                  <td>${i + 1}</td><td>${r.name || "-"}</td>
                  <td class="r sale">${fmtINR(r.sale_amount)}</td>
                  <td class="r purchase">${fmtINR(r.purchase_amount)}</td>
                </tr>`
            )
            .join("")
        }
        <tr>
          <td colspan="2"><strong>Total</strong></td>
          <td class="r sale"><strong>${fmtINR(visibleTotals.sale)}</strong></td>
          <td class="r purchase"><strong>${fmtINR(visibleTotals.purchase)}</strong></td>
        </tr>
        </tbody>
      </table>`;

    const el = document.createElement("div");
    el.innerHTML =
      `<h2>Sale Purchase By Party</h2>
       <div class="meta">${metaLabel} &nbsp;|&nbsp; ${firmLabel}</div>
       ${buildTable(displayed)}`;
    printElement(el, "Sale Purchase By Party");
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto text-slate-800">
      {/* ═══════════════════════════════════════════════════════════════
          1. HEADER & FILTER BAR
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

          {/* Firm dropdown */}
          <div ref={firmRef} className="relative min-w-[180px]">
            <button
              onClick={() => setFirmOpen((v) => !v)}
              className="w-full inline-flex items-center justify-between gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200/80 rounded-xl hover:bg-slate-100 transition shadow-2xs"
            >
              <div className="flex items-center gap-2 truncate">
                <Building2 size={14} className="text-indigo-600 flex-shrink-0" />
                <span className="truncate">{firmLabel}</span>
              </div>
              <ChevronDown size={14} className={`text-slate-400 transition-transform duration-150 ${firmOpen ? "rotate-180" : ""}`} />
            </button>
            {firmOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto p-1 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => selectFirm("all")}
                  className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${
                    firm === "all" ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  All Firms
                </button>
                {companies.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectFirm(String(c.id))}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors truncate ${
                      String(firm) === String(c.id) ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {c.company_name}
                  </button>
                ))}
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
            onClick={() => setAnalyticsOpen(true)}
            disabled={!displayed.length}
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
        {/* Parties */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Active Parties</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-black text-slate-900">{displayed.length}</div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">Parties with sales/purchases</div>
          </div>
        </div>

        {/* Total Sale */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Total Sale Amount</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-black text-emerald-600">{fmtINR(visibleTotals.sale)}</div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">Total party billings</div>
          </div>
        </div>

        {/* Total Purchase */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Total Purchase Amount</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-black text-rose-600">{fmtINR(visibleTotals.purchase)}</div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">Total party vendor costs</div>
          </div>
        </div>

        {/* Net Differential */}
        <div className="bg-white rounded-2xl p-4 border border-indigo-100 shadow-xs flex flex-col justify-between bg-gradient-to-br from-white via-indigo-50/20 to-indigo-50/40">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-900">Net Volume</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Wallet size={16} />
            </div>
          </div>
          <div>
            <div className={`text-xl md:text-2xl font-black ${visibleTotals.net >= 0 ? "text-indigo-600" : "text-rose-600"}`}>
              {visibleTotals.net >= 0 ? "+" : ""}{fmtINR(visibleTotals.net)}
            </div>
            <div className="text-[10px] text-indigo-500 font-semibold mt-0.5">
              Net Sales minus Purchases
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          3. DATA TABLE CARD
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
                <th className="px-4 py-3.5">
                  <div className="inline-flex items-center gap-1.5">
                    <span>PARTY NAME</span>
                    <div className="relative" data-col-filter>
                      <button
                        onClick={() => clickFilterIcon("PARTY NAME")}
                        className={`transition ${openFilter === "PARTY NAME" || colFilters["PARTY NAME"] ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}
                      >
                        <Filter size={12} />
                      </button>
                      {openFilter === "PARTY NAME" && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 normal-case tracking-normal">
                          <input
                            type="text"
                            autoFocus
                            value={colFilters["PARTY NAME"] || ""}
                            onChange={(e) => setColFilters({ ...colFilters, "PARTY NAME": e.target.value })}
                            placeholder="Filter party..."
                            className="w-full text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3.5 text-right">
                  <div className="inline-flex items-center justify-end w-full gap-1.5">
                    <span>SALE AMOUNT</span>
                    <div className="relative" data-col-filter>
                      <button
                        onClick={() => clickFilterIcon("SALE AMOUNT")}
                        className={`transition ${openFilter === "SALE AMOUNT" || colFilters["SALE AMOUNT"] ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}
                      >
                        <Filter size={12} />
                      </button>
                      {openFilter === "SALE AMOUNT" && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 normal-case tracking-normal">
                          <input
                            type="text"
                            autoFocus
                            value={colFilters["SALE AMOUNT"] || ""}
                            onChange={(e) => setColFilters({ ...colFilters, "SALE AMOUNT": e.target.value })}
                            placeholder="Filter sale..."
                            className="w-full text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3.5 text-right">
                  <div className="inline-flex items-center justify-end w-full gap-1.5">
                    <span>PURCHASE AMOUNT</span>
                    <div className="relative" data-col-filter>
                      <button
                        onClick={() => clickFilterIcon("PURCHASE AMOUNT")}
                        className={`transition ${openFilter === "PURCHASE AMOUNT" || colFilters["PURCHASE AMOUNT"] ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}
                      >
                        <Filter size={12} />
                      </button>
                      {openFilter === "PURCHASE AMOUNT" && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 normal-case tracking-normal">
                          <input
                            type="text"
                            autoFocus
                            value={colFilters["PURCHASE AMOUNT"] || ""}
                            onChange={(e) => setColFilters({ ...colFilters, "PURCHASE AMOUNT": e.target.value })}
                            placeholder="Filter purchase..."
                            className="w-full text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2 font-medium">
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      Loading sale and purchase report...
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-rose-500">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle size={28} className="text-rose-500" />
                      <span className="font-semibold">{error}</span>
                    </div>
                  </td>
                </tr>
              ) : displayed.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Users size={32} className="text-slate-300" />
                      <div className="text-sm font-bold text-slate-700">No records found</div>
                      <div className="text-xs text-slate-400">Try adjusting your date range or search keyword.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedRows.map((r, i) => (
                  <tr key={`${r.id || i}-${r.name}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 text-center text-slate-400 font-medium">
                      {(safePage - 1) * rowsPerPage + i + 1}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">
                      {r.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-emerald-600 whitespace-nowrap">
                      {fmtINR(r.sale_amount)}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-rose-600 whitespace-nowrap">
                      {fmtINR(r.purchase_amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {displayed.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold text-xs text-slate-800">
                  <td colSpan={2} className="px-4 py-3.5 text-slate-600 uppercase tracking-wider text-[11px]">
                    Total ({displayed.length} Parties)
                  </td>
                  <td className="px-4 py-3.5 text-right font-black text-emerald-600">
                    {fmtINR(visibleTotals.sale)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-black text-rose-600">
                    {fmtINR(visibleTotals.purchase)}
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

      {analyticsOpen && (
        <ReportAnalyticsView
          title="Sale Purchase By Party Analytics"
          subtitle={`${prettyFrom} → ${prettyTo} · ${analyticsRows.length} records`}
          rows={analyticsRows}
          symbol="₹"
          groupLabel="Parties"
          onClose={() => setAnalyticsOpen(false)}
        />
      )}
    </div>
  );
}
