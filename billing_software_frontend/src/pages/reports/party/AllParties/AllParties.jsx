import { useState, useRef, useEffect, useMemo } from "react";
import {
  BarChart3,
  ChevronDown,
  Search,
  FileSpreadsheet,
  Printer,
  X,
  AlertCircle,
  Users,
  Building2,
  Calendar,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Mail,
  Phone,
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../../../services/api";
import ReportPagination from "../../../../components/reports/ReportPagination";
import AllPartiesAnalytics from "./AllPartiesAnalytics";
import { showToast } from "../../../../utils/reportToast";

const PARTY_TYPES = [
  { label: "All Parties", value: "all" },
  { label: "Receivable", value: "receivable" },
  { label: "Payable", value: "payable" },
];

const COLUMNS = [
  { key: "index", label: "#", width: "50px", align: "center" },
  { key: "name", label: "PARTY NAME", width: "220px" },
  { key: "type", label: "PARTY TYPE", width: "130px" },
  { key: "email", label: "EMAIL", width: "200px" },
  { key: "phone", label: "PHONE NO.", width: "140px" },
  { key: "receivable", label: "RECEIVABLE BAL", width: "160px", align: "right" },
  { key: "payable", label: "PAYABLE BAL", width: "160px", align: "right" },
  { key: "creditLimit", label: "CREDIT LIMIT", width: "140px", align: "right" },
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
    `<html><head><title>${title || "All Parties"}</title>
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
export default function AllParties() {
  const { adminId } = getAuth();
  const [companyId, setCompanyId] = useState(null);

  const [dateFilter, setDateFilter] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [endDate, setEndDate] = useState(() => new Date());
  const [partyType, setPartyType] = useState("all");
  const [typeOpen, setTypeOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState("report");

  const typeRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (typeRef.current && !typeRef.current.contains(e.target)) setTypeOpen(false);
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
        const saved = localStorage.getItem("selected_company_id");
        const match = saved ? list.find((c) => String(c.id) === String(saved)) : null;
        if (match) {
          setCompanyId(Number(match.id));
        } else if (list.length === 1) {
          setCompanyId(Number(list[0].id));
        } else {
          setCompanyId(null);
        }
      })
      .catch(() => setError("Failed to load companies."));
  }, [adminId]);

  // Fetch parties
  useEffect(() => {
    if (companyId === null) return;
    const t = setTimeout(() => {
      setLoading(true);
      setError("");
      const params = {
        company_id: companyId,
        admin_id: adminId || 0,
      };
      if (dateFilter) {
        params.from_date = formatDateISO(startDate);
        params.to_date = formatDateISO(endDate);
      }
      api
        .get("/report/party-statement/parties", { params })
        .then((res) => {
          if (res.data?.status) {
            setParties(res.data.data || []);
          } else {
            setError(res.data?.message || "Failed to load parties.");
          }
        })
        .catch(() => setError("Failed to load parties."))
        .finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(t);
  }, [companyId, adminId, dateFilter, startDate, endDate]);

  // Filter by party type + search query
  const filtered = useMemo(() => {
    let list = [...parties];
    if (partyType === "receivable") {
      list = list.filter((p) => Number(p.receivable) > 0);
    } else if (partyType === "payable") {
      list = list.filter((p) => Number(p.payable) > 0);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q) ||
        (p.phone || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [parties, partyType, query]);

  // Totals for KPI cards
  const kpiTotals = useMemo(() => {
    let totalReceivable = 0;
    let totalPayable = 0;
    filtered.forEach((p) => {
      totalReceivable += Number(p.receivable || 0);
      totalPayable += Number(p.payable || 0);
    });
    return {
      totalReceivable,
      totalPayable,
      net: totalReceivable - totalPayable,
    };
  }, [filtered]);

  const prettyFrom = startDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const prettyTo = endDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const totalRows = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedRows = filtered.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const analyticsRows = useMemo(
    () =>
      (filtered || []).map((p) => ({
        date: "",
        group: p.name || "General",
        value: Number(p.receivable) || 0,
        count: 1,
      })),
    [filtered]
  );

  const handleSelectType = (v) => {
    setPartyType(v);
    setTypeOpen(false);
  };

  /* ── Excel export ── */
  const handleExcel = () => {
    try {
      const sheetData = [
        ["All Parties"],
        ["Period", dateFilter ? `${prettyFrom} to ${prettyTo}` : "All time"],
        [],
        ["#", "Party Name", "Party Type", "Email", "Phone No.", "Receivable Balance", "Payable Balance", "Credit Limit"],
      ];
      filtered.forEach((p, i) => {
        sheetData.push([
          i + 1, p.name || "", p.group || "", p.email || "", p.phone || "",
          fmtINRNum(p.receivable), fmtINRNum(p.payable), fmtINRNum(p.credit_limit),
        ]);
      });
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws["!cols"] = [
        { wch: 4 }, { wch: 22 }, { wch: 14 }, { wch: 26 }, { wch: 14 },
        { wch: 18 }, { wch: 18 }, { wch: 14 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "All Parties");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array", bookSST: false });
      saveAs(
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `All_Parties_${dateFilter ? `${formatDateISO(startDate)}_to_${formatDateISO(endDate)}` : "All_Time"}.xlsx`
      );
      showToast("Excel exported successfully.", "success");
    } catch {
      setError("Excel export failed. Please try again.");
    }
  };

  /* ── Print ── */
  const handlePrint = () => {
    const buildTable = (rows) =>
      `<table>
        <thead><tr>
          <th>#</th><th>Party Name</th><th>Party Type</th><th>Email</th><th>Phone No.</th>
          <th class="r">Receivable</th><th class="r">Payable</th><th class="r">Credit Limit</th>
        </tr></thead>
        <tbody>${
          rows.map(
            (p, i) =>
              `<tr>
                <td>${i + 1}</td><td>${p.name || "-"}</td><td>${p.group || "-"}</td>
                <td>${p.email || "-"}</td><td>${p.phone || "-"}</td>
                <td class="r">${fmtINR(p.receivable)}</td><td class="r">${fmtINR(p.payable)}</td>
                <td class="r">${fmtINR(p.credit_limit)}</td>
              </tr>`
          ).join("")
        }</tbody>
      </table>`;

    const el = document.createElement("div");
    el.innerHTML =
      `<h2>All Parties</h2>
       <div class="meta">${dateFilter ? `${prettyFrom} to ${prettyTo}` : "All time"} &nbsp;|&nbsp; ${filtered.length} party(ies)</div>
       ${buildTable(filtered)}`;
    printElement(el, "All Parties");
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto text-slate-800">
      {viewMode === "analytics" ? (
        <AllPartiesAnalytics
          rows={filtered}
          period={dateFilter ? `${prettyFrom} → ${prettyTo}` : "All time"}
          onClose={() => setViewMode("report")}
        />
      ) : (
        <>
      {/* ═══════════════════════════════════════════════════════════════
          1. TOP FILTER BAR
          ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-xs border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Filter Toggle */}
          <label className="inline-flex items-center gap-2.5 px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl cursor-pointer hover:bg-slate-100 transition select-none shadow-2xs">
            <input
              type="checkbox"
              checked={dateFilter}
              onChange={(e) => setDateFilter(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-700">Filter By Date</span>
          </label>

          {/* Date range (shown only when dateFilter is true) */}
          {dateFilter && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 shadow-2xs animate-in fade-in duration-100">
              <Calendar size={13} className="text-indigo-600" />
              <span className="text-xs font-semibold text-slate-500">Between</span>
              <input
                type="date"
                value={formatDateISO(startDate)}
                onChange={(e) => setStartDate(parseDateISO(e.target.value))}
                className="bg-transparent border-0 text-xs font-bold text-slate-800 p-0 focus:ring-0 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-400">To</span>
              <input
                type="date"
                value={formatDateISO(endDate)}
                onChange={(e) => setEndDate(parseDateISO(e.target.value))}
                className="bg-transparent border-0 text-xs font-bold text-slate-800 p-0 focus:ring-0 cursor-pointer"
              />
            </div>
          )}

          {/* Party Type Dropdown */}
          <div ref={typeRef} className="relative min-w-[160px]">
            <button
              onClick={() => setTypeOpen((v) => !v)}
              className="w-full inline-flex items-center justify-between gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200/80 rounded-xl hover:bg-slate-100 transition shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <Users size={14} className="text-indigo-600 flex-shrink-0" />
                <span>{PARTY_TYPES.find((t) => t.value === partyType)?.label || "All Parties"}</span>
              </div>
              <ChevronDown size={14} className={`text-slate-400 transition-transform duration-150 ${typeOpen ? "rotate-180" : ""}`} />
            </button>
            {typeOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100">
                {PARTY_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => handleSelectType(t.value)}
                    className={`w-full text-left px-3.5 py-2 text-xs transition-colors ${
                      t.value === partyType
                        ? "bg-indigo-50 text-indigo-700 font-bold"
                        : "text-slate-700 hover:bg-slate-50 font-medium"
                    }`}
                  >
                    {t.label}
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
        {/* Total Parties */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Total Parties</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-black text-slate-900">{filtered.length}</div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">Customers & suppliers</div>
          </div>
        </div>

        {/* Total Receivable */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Total Receivable</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-black text-emerald-600">{fmtINR(kpiTotals.totalReceivable)}</div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">Amount to receive</div>
          </div>
        </div>

        {/* Total Payable */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Total Payable</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-black text-rose-600">{fmtINR(kpiTotals.totalPayable)}</div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">Amount to pay out</div>
          </div>
        </div>

        {/* Net Outstanding */}
        <div className="bg-white rounded-2xl p-4 border border-indigo-100 shadow-xs flex flex-col justify-between bg-gradient-to-br from-white via-indigo-50/20 to-indigo-50/40">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-900">Net Balance</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Wallet size={16} />
            </div>
          </div>
          <div>
            <div className={`text-xl md:text-2xl font-black ${kpiTotals.net >= 0 ? "text-indigo-600" : "text-rose-600"}`}>
              {fmtINR(kpiTotals.net)}
            </div>
            <div className="text-[10px] text-indigo-500 font-semibold mt-0.5">
              Receivable vs Payable difference
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          3. PARTIES DATA TABLE CARD
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
              placeholder="Search by party name, email or phone..."
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
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    style={{ width: col.width }}
                    className={`px-4 py-3.5 ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="py-16 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2 font-medium">
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      Loading parties ledger...
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="py-16 text-center text-rose-500">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle size={28} className="text-rose-500" />
                      <span className="font-semibold">{error}</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Users size={32} className="text-slate-300" />
                      <div className="text-sm font-bold text-slate-700">No parties found</div>
                      <div className="text-xs text-slate-400">Try adjusting your filters or search keywords.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedRows.map((p, i) => (
                  <tr key={`${p.id}-${i}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 text-center text-slate-400 font-medium">
                      {(safePage - 1) * rowsPerPage + i + 1}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">
                      {p.name || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase border bg-slate-50 text-slate-700 border-slate-200">
                        {p.group || "General"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {p.email ? (
                        <div className="inline-flex items-center gap-1.5">
                          <Mail size={12} className="text-slate-400" />
                          <span>{p.email}</span>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {p.phone ? (
                        <div className="inline-flex items-center gap-1.5">
                          <Phone size={12} className="text-slate-400" />
                          <span>{p.phone}</span>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-emerald-600 whitespace-nowrap">
                      {fmtINR(p.receivable)}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-rose-600 whitespace-nowrap">
                      {fmtINR(p.payable)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-700 whitespace-nowrap">
                      {fmtINR(p.credit_limit)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold text-xs text-slate-800">
                  <td colSpan={5} className="px-4 py-3.5 text-slate-600 uppercase tracking-wider text-[11px]">
                    Total ({filtered.length} Parties)
                  </td>
                  <td className="px-4 py-3.5 text-right font-black text-emerald-600">
                    {fmtINR(kpiTotals.totalReceivable)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-black text-rose-600">
                    {fmtINR(kpiTotals.totalPayable)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-slate-400">-</td>
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
