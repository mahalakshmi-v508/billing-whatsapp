import { useState, useRef, useEffect, useMemo } from "react";
import {
  BarChart3,
  ChevronDown,
  Search,
  FileSpreadsheet,
  Printer,
  X,
  AlertCircle,
  Phone,
  UserCheck,
  Building2,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../../../services/api";
import ReportPagination from "../../../../components/reports/ReportPagination";
import PartyWiseProfitLossAnalytics from "./PartyWiseProfitLossAnalytics";
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
    `<html><head><title>${title || "Party Wise Profit And Loss"}</title>
     <style>
       body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:28px;color:#0f172a;}
       h2{margin:0 0 4px;font-size:18px;color:#1e1b4b;}
       .meta{color:#64748b;font-size:12px;margin-bottom:18px;}
       table{width:100%;border-collapse:collapse;font-size:11px;}
       th,td{border:1px solid #e2e8f0;padding:7px 9px;text-align:left;}
       th{background:#f8fafc;color:#475569;font-weight:bold;}
       td.r,th.r{text-align:right;}
       td.profit{color:#15803d;font-weight:700;}
       td.loss{color:#dc2626;font-weight:700;}
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

/* ── Main Component ─────────────────────────────────────────────────── */
export default function PartyWiseProfitLoss() {
  const { adminId } = getAuth();

  const [period, setPeriod] = useState("this_month");
  const [{ from: startDate, to: endDate }, setRange] = useState(applyPeriod("this_month"));
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState(null);
  const [partyId, setPartyId] = useState("all");
  const [parties, setParties] = useState([]);

  const [query, setQuery] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [periodOpen, setPeriodOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [partyOpen, setPartyOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState("report");

  const periodRef = useRef(null);
  const companyRef = useRef(null);
  const partyRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (periodRef.current && !periodRef.current.contains(e.target)) setPeriodOpen(false);
      if (companyRef.current && !companyRef.current.contains(e.target)) setCompanyOpen(false);
      if (partyRef.current && !partyRef.current.contains(e.target)) setPartyOpen(false);
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
        }
      })
      .catch(() => setError("Failed to load companies."));
  }, [adminId]);

  const selectCompany = (c) => {
    setCompanyId(Number(c.id));
    localStorage.setItem("selected_company_id", String(c.id));
    setCompanyOpen(false);
    setPartyId("all");
  };

  // Load parties for party filter
  useEffect(() => {
    if (!adminId) return;
    const params = {
      admin_id: adminId || 0,
      company_id: companyId || 0,
    };
    api
      .get("/report/party-statement/parties", { params })
      .then((res) => {
        if (res.data?.status) {
          setParties(res.data.parties || res.data.data || []);
        }
      })
      .catch(() => {});
  }, [adminId, companyId]);

  const selectPeriod = (p) => {
    setPeriod(p.value);
    setRange(applyPeriod(p.value));
    setPeriodOpen(false);
  };

  // Fetch report on filter change
  useEffect(() => {
    if (companyId === null && !adminId) return;
    const t = setTimeout(() => {
      setLoading(true);
      setError("");
      const params = {
        admin_id: adminId || 0,
        company_id: companyId || 0,
        party_id: partyId === "all" ? 0 : Number(partyId),
        from_date: formatDateISO(startDate),
        to_date: formatDateISO(endDate),
      };
      api
        .get("/report/party-wise-profit-loss", { params })
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
  }, [adminId, companyId, partyId, startDate, endDate]);

  // Search across party name / phone
  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.party_name || "").toLowerCase().includes(q) ||
        (r.phone || "").toLowerCase().includes(q)
    );
  }, [rows, query]);

  const displayed = searched;

  const visibleTotals = useMemo(() => {
    let sale = 0;
    let profit = 0;
    displayed.forEach((r) => {
      sale += Number(r.total_sale_amount || 0);
      profit += Number(r.profit || 0);
    });
    return { sale, profit };
  }, [displayed]);

  const marginPct = visibleTotals.sale > 0 ? (visibleTotals.profit / visibleTotals.sale) * 100 : 0;

  const prettyFrom = startDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const prettyTo = endDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const metaLabel = `${prettyFrom} to ${prettyTo}`;
  const companyLabel =
    companyId !== null && companyId !== undefined
      ? (companies.find((c) => Number(c.id) === Number(companyId))?.company_name || "My Company")
      : "All Companies";
  const partyLabel =
    partyId === "all"
      ? "All Parties"
      : (parties.find((p) => String(p.id) === String(partyId))?.name || "All Parties");

  const totalRows = displayed.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedRows = displayed.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const analyticsRows = useMemo(
    () =>
      (displayed || []).map((r) => ({
        date: "",
        group: r.party_name || "General",
        value: Number(r.profit) || 0,
        count: 1,
      })),
    [displayed]
  );

  /* ── Excel export ── */
  const handleExcel = () => {
    if (rows.length === 0) {
      showToast("No data to export.", "warning");
      return;
    }
    try {
      const sheetData = [
        ["Party Wise Profit And Loss"],
        ["Period", metaLabel],
        ["Company", companyLabel],
        [],
        ["#", "Party Name", "Phone No.", "Total Sale Amount", "Profit (+) / Loss (-)"],
      ];
      displayed.forEach((r, i) => {
        sheetData.push([
          i + 1,
          r.party_name || "-",
          r.phone || "",
          Number(r.total_sale_amount || 0),
          Number(r.profit || 0),
        ]);
      });
      sheetData.push([
        "Total",
        "Total",
        "",
        Number(visibleTotals.sale || 0),
        Number(visibleTotals.profit || 0),
      ]);
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws["!cols"] = [{ wch: 4 }, { wch: 24 }, { wch: 14 }, { wch: 18 }, { wch: 20 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Party Wise Profit And Loss");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array", bookSST: false });
      saveAs(
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `Party_Wise_Profit_And_Loss_${formatDateISO(startDate)}_to_${formatDateISO(endDate)}.xlsx`
      );
      showToast("Excel report downloaded.", "success");
    } catch {
      showToast("Excel export failed. Please try again.", "error");
    }
  };

  /* ── Print ── */
  const handlePrint = () => {
    if (rows.length === 0) {
      showToast("No data to print.", "warning");
      return;
    }
    const buildRows = (rowsList) =>
      rowsList
        .map(
          (r, i) =>
            `<tr>
              <td>${i + 1}</td><td>${r.party_name || "-"}</td><td>${r.phone || "-"}</td>
              <td class="r">${fmtINR(r.total_sale_amount)}</td>
              <td class="r ${Number(r.profit) >= 0 ? "profit" : "loss"}">${fmtINR(r.profit)}</td>
            </tr>`
        )
        .join("");

    const f = document.createElement("div");
    f.innerHTML =
      `<h2>Party Wise Profit And Loss</h2>
       <div class="meta">${metaLabel} &nbsp;|&nbsp; ${companyLabel} &nbsp;|&nbsp; ${partyLabel}</div>
       <table>
         <thead><tr>
           <th>#</th><th>Party Name</th><th>Phone No.</th>
           <th class="r">Total Sale Amount</th>
           <th class="r">Profit (+) / Loss (-)</th>
         </tr></thead>
         <tbody>${buildRows(displayed)}</tbody>
         <tfoot><tr>
           <td colspan="3"><strong>Total</strong></td>
           <td class="r"><strong>${fmtINR(visibleTotals.sale)}</strong></td>
           <td class="r ${visibleTotals.profit >= 0 ? "profit" : "loss"}"><strong>${fmtINR(visibleTotals.profit)}</strong></td>
         </tr></tfoot>
       </table>`;
    printElement(f, "Party Wise Profit And Loss");
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto text-slate-800">
      {viewMode === "analytics" ? (
        <PartyWiseProfitLossAnalytics
          rows={displayed}
          period={`${prettyFrom} → ${prettyTo}`}
          onClose={() => setViewMode("report")}
        />
      ) : (
        <>
      {/* ═══════════════════════════════════════════════════════════════
          1. HEADER & FILTER CONTROLS
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

          {/* Party Filter Dropdown */}
          <div ref={partyRef} className="relative min-w-[180px]">
            <button
              onClick={() => setPartyOpen((v) => !v)}
              className="w-full inline-flex items-center justify-between gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200/80 rounded-xl hover:bg-slate-100 transition shadow-2xs"
            >
              <div className="flex items-center gap-2 truncate">
                <UserCheck size={14} className="text-indigo-600 flex-shrink-0" />
                <span className="truncate">{partyLabel}</span>
              </div>
              <ChevronDown size={14} className={`text-slate-400 transition-transform duration-150 ${partyOpen ? "rotate-180" : ""}`} />
            </button>
            {partyOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto p-1 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => { setPartyId("all"); setPartyOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${
                    partyId === "all" ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  All Parties
                </button>
                {parties.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setPartyId(String(p.id)); setPartyOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors truncate ${
                      String(p.id) === String(partyId) ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {p.name || `Party #${p.id}`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Firm / Company selector */}
          <div ref={companyRef} className="relative min-w-[180px]">
            <button
              onClick={() => setCompanyOpen((v) => !v)}
              className="w-full inline-flex items-center justify-between gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200/80 rounded-xl hover:bg-slate-100 transition shadow-2xs"
            >
              <div className="flex items-center gap-2 truncate">
                <Building2 size={14} className="text-indigo-600 flex-shrink-0" />
                <span className="truncate">{companyLabel}</span>
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
        {/* Parties Count */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Active Parties</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <UserCheck size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-black text-slate-900">{displayed.length}</div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">Parties with transaction history</div>
          </div>
        </div>

        {/* Total Sale Amount */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Total Sale Amount</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-black text-slate-900">{fmtINR(visibleTotals.sale)}</div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">Aggregated party sales</div>
          </div>
        </div>

        {/* Net Profit / Loss */}
        <div className={`bg-white rounded-2xl p-4 border shadow-xs flex flex-col justify-between ${
          visibleTotals.profit >= 0 ? "border-emerald-200/80 bg-emerald-50/10" : "border-rose-200/80 bg-rose-50/10"
        }`}>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Net Profit / Loss</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              visibleTotals.profit >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            }`}>
              {visibleTotals.profit >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            </div>
          </div>
          <div>
            <div className={`text-xl md:text-2xl font-black ${
              visibleTotals.profit >= 0 ? "text-emerald-600" : "text-rose-600"
            }`}>
              {visibleTotals.profit >= 0 ? "+" : ""}{fmtINR(visibleTotals.profit)}
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">Overall party profitability</div>
          </div>
        </div>

        {/* Margin % */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Average Margin</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Percent size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-black text-indigo-600">{marginPct.toFixed(2)}%</div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">Profit margin on party sales</div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          3. REPORT TABLE CARD
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
              placeholder="Search by party name or phone number..."
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
                <th className="px-4 py-3.5">PHONE NO.</th>
                <th className="px-4 py-3.5 text-right">TOTAL SALE AMOUNT</th>
                <th className="px-4 py-3.5 text-right">PROFIT (+) / LOSS (-)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2 font-medium">
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      Loading party profit/loss data...
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-rose-500">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle size={28} className="text-rose-500" />
                      <span className="font-semibold">{error}</span>
                    </div>
                  </td>
                </tr>
              ) : displayed.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <UserCheck size={32} className="text-slate-300" />
                      <div className="text-sm font-bold text-slate-700">No parties found</div>
                      <div className="text-xs text-slate-400">Try adjusting the filter period, selected company or search term.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedRows.map((r, i) => {
                  const profit = Number(r.profit || 0);
                  const isPositive = profit >= 0;
                  return (
                    <tr key={`${r.party_id}-${r.party_name}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 text-center text-slate-400 font-medium">
                        {(safePage - 1) * rowsPerPage + i + 1}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">
                        {r.party_name || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {r.phone ? (
                          <div className="inline-flex items-center gap-1.5">
                            <Phone size={11} className="text-slate-400" />
                            <span>{r.phone}</span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-900 whitespace-nowrap">
                        {fmtINR(r.total_sale_amount)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 font-black ${
                          isPositive ? "text-emerald-600" : "text-rose-600"
                        }`}>
                          {isPositive ? "+" : ""}{fmtINR(profit)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {displayed.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold text-xs text-slate-800">
                  <td colSpan={3} className="px-4 py-3.5 text-slate-600 uppercase tracking-wider text-[11px]">
                    Total
                  </td>
                  <td className="px-4 py-3.5 text-right font-black text-slate-900">
                    {fmtINR(visibleTotals.sale)}
                  </td>
                  <td className={`px-4 py-3.5 text-right font-black ${
                    visibleTotals.profit >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}>
                    {visibleTotals.profit >= 0 ? "+" : ""}{fmtINR(visibleTotals.profit)}
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