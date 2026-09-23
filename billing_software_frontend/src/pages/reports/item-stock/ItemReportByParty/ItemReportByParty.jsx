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
import ItemReportByPartyAnalytics from "./ItemReportByPartyAnalytics";

const FONT = "'Plus Jakarta Sans', sans-serif";
const INDIGO = "#4338ca";
const NAVY = "#1e1b4b";
const GRAY_TEXT = "#6b7280";
const LIGHT_BORDER = "#e5e7eb";

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

const fmtQty = (n) => Number(n || 0).toLocaleString("en-IN");

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
    `<html><head><title>${title || "Item Report By Party"}</title>
     <style>
       body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:28px;color:#1e1b4b;}
       h2{margin:0 0 4px;font-size:18px;}
       .meta{color:#64748b;font-size:12px;margin-bottom:18px;}
       table{width:100%;border-collapse:collapse;font-size:11px;}
       th,td{border:1px solid #e2e8f0;padding:7px 9px;text-align:left;}
       th{background:#f1f5f9;color:#334155;}
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
export default function ItemReportByParty() {
  const { adminId } = getAuth();

  const [period, setPeriod] = useState("this_month");
  const [{ from: startDate, to: endDate }, setRange] = useState(applyPeriod("this_month"));
  const [companyId, setCompanyId] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [companyName, setCompanyName] = useState("My Company");

  const [parties, setParties] = useState([]);
  const [partyId, setPartyId] = useState(0);
  const [partyRole, setPartyRole] = useState("");
  const [partyName, setPartyName] = useState("All Parties");

  const [query, setQuery] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState("report");

  const [periodOpen, setPeriodOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [partyOpen, setPartyOpen] = useState(false);

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
    setPartyId(0);
    setPartyRole("");
    setPartyName("All Parties");
    setCompanyOpen(false);
  };

  // Load parties (customers + suppliers) for the selected company
  useEffect(() => {
    if (!companyId) return;
    api
      .get("/report/party-statement/parties", { params: { company_id: companyId, admin_id: adminId || 0 } })
      .then((res) => setParties(res.data?.status ? res.data.data || [] : []))
      .catch(() => setParties([]));
  }, [companyId, adminId]);

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
        party_id: partyId,
        role: partyRole,
      };
      api
        .get("/report/item-report-by-party", { params })
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
  }, [companyId, adminId, startDate, endDate, partyId, partyRole]);

  const selectPeriod = (p) => {
    setPeriod(p.value);
    setRange(applyPeriod(p.value));
    setPeriodOpen(false);
  };

  const selectParty = (p) => {
    if (!p) {
      setPartyId(0);
      setPartyRole("");
      setPartyName("All Parties");
    } else {
      setPartyId(Number(p.id));
      setPartyRole(p.role || "");
      setPartyName(p.name || "All Parties");
    }
    setPartyOpen(false);
  };

  // Search filter across item names
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => (r.item_name || "").toLowerCase().includes(q));
  }, [rows, query]);

  // Totals from the currently displayed (filtered) rows
  const totals = useMemo(() => {
    const t = { sale_qty: 0, sale_amt: 0, purchase_qty: 0, purchase_amt: 0 };
    filtered.forEach((r) => {
      t.sale_qty += Number(r.sale_qty || 0);
      t.sale_amt += Number(r.sale_amt || 0);
      t.purchase_qty += Number(r.purchase_qty || 0);
      t.purchase_amt += Number(r.purchase_amt || 0);
    });
    return t;
  }, [filtered]);

  const prettyFrom = startDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const prettyTo = endDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const analyticsRows = useMemo(
    () =>
      (filtered || []).map((r) => ({
        date: "",
        group: r.item_name || "General",
        value: Number(r.sale_amt || 0) + Number(r.purchase_amt || 0),
        count: 1,
      })),
    [filtered]
  );

  const metaLabel = `${prettyFrom} to ${prettyTo}`;

  /* ── Excel export ── */
  const handleExcel = () => {
    try {
      const sheetData = [
        ["Item Report By Party"],
        ["Period", metaLabel],
        ["Company", companyName],
        ["Party", partyName],
        [],
        ["#", "Item Name", "Sale Quantity", "Sale Amount", "Purchase Quantity", "Purchase Amount"],
      ];
      filtered.forEach((r, i) => {
        sheetData.push([
          i + 1, r.item_name || "-",
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
        { wch: 4 }, { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Item Report By Party");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array", bookSST: false });
      saveAs(
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `Item_Report_By_Party_${formatDateISO(startDate)}_to_${formatDateISO(endDate)}.xlsx`
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
          <th class="r">Sale Qty</th><th class="r">Sale Amount</th>
          <th class="r">Purchase Qty</th><th class="r">Purchase Amount</th>
        </tr></thead>
        <tbody>${
          rowsList
            .map(
              (r, i) =>
                `<tr>
                  <td>${i + 1}</td><td>${r.item_name || "-"}</td>
                  <td class="r">${fmtQty(r.sale_qty)}</td><td class="r">${fmtINR(r.sale_amt)}</td>
                  <td class="r">${fmtQty(r.purchase_qty)}</td><td class="r">${fmtINR(r.purchase_amt)}</td>
                </tr>`
            )
            .join("")
        }
        <tr>
          <td colspan="2"><strong>Total</strong></td>
          <td class="r"><strong>${fmtQty(totals.sale_qty)}</strong></td>
          <td class="r"><strong>${fmtINR(totals.sale_amt)}</strong></td>
          <td class="r"><strong>${fmtQty(totals.purchase_qty)}</strong></td>
          <td class="r"><strong>${fmtINR(totals.purchase_amt)}</strong></td>
        </tr>
        </tbody>
      </table>`;

    const el = document.createElement("div");
    el.innerHTML =
      `<h2>Item Report By Party</h2>
       <div class="meta">${metaLabel} &nbsp;|&nbsp; ${companyName} &nbsp;|&nbsp; ${partyName}</div>
       ${buildTable(filtered)}`;
    printElement(el, "Item Report By Party");
  };

  const totalRows = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedRows = filtered.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto text-slate-800 font-sans">
      {viewMode === "analytics" ? (
        <ItemReportByPartyAnalytics
          rows={analyticsRows}
          period={metaLabel}
          onClose={() => setViewMode("report")}
        />
      ) : (
        <>
      {/* Filter Card */}
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-xs border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Period preset dropdown */}
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

          {/* Party dropdown */}
          <div ref={partyRef} className="relative flex flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Party Filter</span>
            <button
              type="button"
              onClick={() => setPartyOpen((v) => !v)}
              className="bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-800 rounded-xl px-3 py-1.5 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 shadow-2xs cursor-pointer inline-flex items-center gap-2 min-w-[170px] justify-between"
            >
              <span className="truncate">{partyName}</span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${partyOpen ? "rotate-180" : ""}`} />
            </button>
            {partyOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1.5 max-h-60 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => selectParty(null)}
                  className={`w-full text-left px-3.5 py-2 text-xs transition-colors ${
                    partyId === 0
                      ? "bg-blue-50 text-blue-700 font-bold"
                      : "text-slate-700 hover:bg-slate-50 font-medium"
                  }`}
                >
                  All Parties
                </button>
                {parties.map((p) => (
                  <button
                    key={p.role + "-" + p.id}
                    type="button"
                    onClick={() => selectParty(p)}
                    className={`w-full text-left px-3.5 py-2 text-xs transition-colors ${
                      String(p.id) === String(partyId)
                        ? "bg-blue-50 text-blue-700 font-bold"
                        : "text-slate-700 hover:bg-slate-50 font-medium"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
                {parties.length === 0 && (
                  <div className="px-3.5 py-2 text-xs text-slate-400">No parties found</div>
                )}
              </div>
            )}
          </div>
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
            disabled={!filtered.length}
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
          <div className="text-xl font-black text-slate-800 tracking-tight mt-1">{filtered.length}</div>
          <div className="text-[11px] font-medium text-slate-400 mt-0.5">Reported Product Lines</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50/60 to-white p-4 rounded-2xl border border-emerald-100/80 shadow-2xs">
          <span className="text-[11px] font-bold tracking-wider text-emerald-700 uppercase">Total Sale Amount</span>
          <div className="text-xl font-black text-emerald-900 tracking-tight mt-1">{fmtINR(totals.sale_amt)}</div>
          <div className="text-[11px] font-medium text-slate-400 mt-0.5">Quantity: {fmtQty(totals.sale_qty)} units</div>
        </div>
        <div className="bg-gradient-to-br from-rose-50/60 to-white p-4 rounded-2xl border border-rose-100/80 shadow-2xs">
          <span className="text-[11px] font-bold tracking-wider text-rose-700 uppercase">Total Purchase Amount</span>
          <div className="text-xl font-black text-rose-900 tracking-tight mt-1">{fmtINR(totals.purchase_amt)}</div>
          <div className="text-[11px] font-medium text-slate-400 mt-0.5">Quantity: {fmtQty(totals.purchase_qty)} units</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50/60 to-white p-4 rounded-2xl border border-blue-100/80 shadow-2xs">
          <span className="text-[11px] font-bold tracking-wider text-blue-700 uppercase">Net Turnover</span>
          <div className="text-xl font-black text-blue-900 tracking-tight mt-1">{fmtINR(totals.sale_amt - totals.purchase_amt)}</div>
          <div className="text-[11px] font-medium text-slate-400 mt-0.5">Sale − Purchase Volume</div>
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
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by item name…"
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
            Showing {filtered.length} items
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75">
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-center w-12">#</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 min-w-[220px]">Item Name</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Sale Quantity</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Sale Amount</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Purchase Quantity</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Purchase Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500 text-xs">
                    Loading item party data…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-rose-600 text-xs font-bold">
                      <AlertCircle size={22} />
                      <span>{error}</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500 text-xs font-medium">
                    No items found matching the selected filters.
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
                    <td className="px-4 py-3 text-xs text-slate-700 text-right tabular-nums font-semibold">
                      {fmtQty(r.sale_qty)}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-right tabular-nums text-emerald-700">
                      {fmtINR(r.sale_amt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700 text-right tabular-nums font-semibold">
                      {fmtQty(r.purchase_qty)}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-right tabular-nums text-rose-700">
                      {fmtINR(r.purchase_amt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50/90 font-bold border-t border-slate-200/80 text-slate-800">
                  <td colSpan={2} className="px-4 py-3 text-xs text-slate-900">Total</td>
                  <td className="px-4 py-3 text-xs text-right tabular-nums text-slate-900">
                    {fmtQty(totals.sale_qty)}
                  </td>
                  <td className="px-4 py-3 text-xs text-right tabular-nums text-emerald-700">
                    {fmtINR(totals.sale_amt)}
                  </td>
                  <td className="px-4 py-3 text-xs text-right tabular-nums text-slate-900">
                    {fmtQty(totals.purchase_qty)}
                  </td>
                  <td className="px-4 py-3 text-xs text-right tabular-nums text-rose-700">
                    {fmtINR(totals.purchase_amt)}
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

const dateRangeBoxStyle = {
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
  width: 130,
};

const dropdownPanelStyle = {
  position: "absolute",
  top: "calc(100% + 6px)",
  left: 0,
  minWidth: 170,
  zIndex: 60,
  background: "#fff",
  border: `1.5px solid #e0e7ff`,
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
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const detailsCardStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 0,
  padding: "12px 16px",
  background: "#fff",
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 10,
  marginBottom: 10,
  fontFamily: FONT,
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