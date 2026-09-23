import { useState, useEffect, useMemo, useRef } from "react";
import {
  BarChart3,
  FileSpreadsheet,
  Printer,
  AlertCircle,
  Calendar,
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../../../services/api";
import ReportPagination from "../../../../components/reports/ReportPagination";
import GSTReportAnalytics from "./GSTReportAnalytics";

const FONT = "'Plus Jakarta Sans', sans-serif";
const INDIGO = "#4338ca";
const NAVY = "#1e1b4b";
const GRAY_TEXT = "#6b7280";
const LIGHT_BORDER = "#e5e7eb";

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
  "₹ " + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

function formatDateDisplay(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function today() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function thirtyDaysAgo() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - 30);
  return d;
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
    `<html><head><title>${title || "GST Tax Report"}</title>
     <style>
       body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:28px;color:#1e1b4b;}
       h2{margin:0 0 4px;font-size:18px;}
       .business{font-size:13px;font-weight:700;color:#334155;}
       .meta{color:#64748b;font-size:12px;margin-bottom:18px;}
       table{width:100%;border-collapse:collapse;font-size:11px;}
       th,td{border:1px solid #e2e8f0;padding:7px 9px;text-align:left;}
       th{background:#f1f5f9;color:#334155;}
       td.r,th.r{text-align:right;}
       .totals{margin-top:18px;font-size:12px;color:#334155;}
       .totals div{display:flex;justify-content:flex-end;gap:10px;padding:3px 0;}
       .totals span:first-child{font-weight:600;}
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
export default function GSTReport() {
  const { adminId } = getAuth();

  const [companyId, setCompanyId] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [companyName, setCompanyName] = useState("My Company");

  const [fromDate, setFromDate] = useState(thirtyDaysAgo());
  const [toDate, setToDate] = useState(today());

  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ tax_in: 0, tax_out: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState("report");

  const [companyOpen, setCompanyOpen] = useState(false);
  const companyRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function onDoc(e) {
      if (companyRef.current && !companyRef.current.contains(e.target)) setCompanyOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Load companies for this admin
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

  // Fetch GST report data
  useEffect(() => {
    if (companyId === null) return undefined;
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      api
        .get("/report/gst-report", {
          params: {
            company_id: companyId,
            admin_id: adminId || 0,
            from_date: formatDateISO(fromDate),
            to_date: formatDateISO(toDate),
          },
        })
        .then((res) => {
          if (!active) return;
          if (res.data?.status) {
            setRows(res.data.data || []);
            setTotals(res.data.totals || { tax_in: 0, tax_out: 0 });
          } else {
            setError(res.data?.message || "Failed to load GST report.");
          }
        })
        .catch(() => { if (active) setError("Failed to load GST report."); })
        .finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => { active = false; clearTimeout(timer); };
  }, [companyId, adminId, fromDate, toDate]);

  const handleDateChange = (setter) => (e) => {
    if (e.target.value) setter(parseDateISO(e.target.value));
  };

  const dateError = useMemo(() => {
    return formatDateISO(fromDate) > formatDateISO(toDate)
      ? "From date cannot be after To date"
      : "";
  }, [fromDate, toDate]);

  /* ── Excel export ── */
  const handleExcel = () => {
    try {
      const sheetData = [
        ["GST Tax Report"],
        ["From", formatDateDisplay(fromDate), "To", formatDateDisplay(toDate)],
        ["Company", companyName],
        [],
        ["Party Name", "Sale Tax", "Purchase / Expense Tax"],
      ];
      rows.forEach((r) => {
        sheetData.push([
          r.party_name,
          fmtINRNum(r.sale_tax),
          fmtINRNum(r.purchase_expense_tax),
        ]);
      });
      sheetData.push([]);
      sheetData.push(["", "Total Tax In", fmtINRNum(totals.tax_in)]);
      sheetData.push(["", "Total Tax Out", fmtINRNum(totals.tax_out)]);

      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws["!cols"] = [{ wch: 24 }, { wch: 16 }, { wch: 22 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "GST Tax Report");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array", bookSST: false });
      saveAs(
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `GST_Tax_Report_${formatDateISO(fromDate)}_to_${formatDateISO(toDate)}.xlsx`
      );
    } catch {
      setError("Excel export failed. Please try again.");
    }
  };

  /* ── Print ── */
  const handlePrint = () => {
    const now = new Date();
    const generated =
      now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
      ", " +
      now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

    const el = document.createElement("div");
    el.innerHTML =
      `<h2>GST Tax Report</h2>
       <div class="business">${companyName}</div>
       <div class="meta">From ${formatDateDisplay(fromDate)} &nbsp;—&nbsp; To ${formatDateDisplay(toDate)} &nbsp;|&nbsp; Generated: ${generated}</div>
       <table>
         <thead><tr>
           <th>Party Name</th><th class="r">Sale Tax</th><th class="r">Purchase / Expense Tax</th>
         </tr></thead>
         <tbody>${
           rows.length > 0
             ? rows.map((r) => `<tr>
                 <td>${r.party_name}</td>
                 <td class="r">${fmtINR(r.sale_tax)}</td>
                 <td class="r">${fmtINR(r.purchase_expense_tax)}</td>
               </tr>`).join("")
             : '<tr><td colspan="3" style="text-align:center;padding:20px;color:#94a3b8;">No GST records found</td></tr>'
         }</tbody>
       </table>
       <div class="totals">
         <div><span>Total Tax In:</span> <span>${fmtINR(totals.tax_in)}</span></div>
         <div><span>Total Tax Out:</span> <span>${fmtINR(totals.tax_out)}</span></div>
       </div>`;
    printElement(el, "GST Tax Report");
  };

  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedRows = rows.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const analyticsRows = useMemo(() => {
    if (!rows.length) return [];
    return rows.map((r) => ({
      date: "",
      group: r.party_name || "",
      value: Number(r.sale_tax || 0) + Number(r.purchase_expense_tax || 0),
      count: 1,
    }));
  }, [rows]);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto text-slate-800 font-sans">
      {viewMode === "analytics" ? (
        <GSTReportAnalytics
          rows={rows}
          period={`${formatDateISO(fromDate)} → ${formatDateISO(toDate)}`}
          onClose={() => setViewMode("report")}
        />
      ) : (
        <>
      {/* Filter Card */}
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-xs border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Between Date Range */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Date Range</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={formatDateISO(fromDate)}
                onChange={handleDateChange(setFromDate)}
                className="bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-800 rounded-xl px-2.5 py-1.5 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 shadow-2xs cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-400">to</span>
              <input
                type="date"
                value={formatDateISO(toDate)}
                onChange={handleDateChange(setToDate)}
                className="bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-800 rounded-xl px-2.5 py-1.5 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 shadow-2xs cursor-pointer"
              />
            </div>
          </div>

          {dateError && (
            <span className="text-xs font-bold text-rose-600 mt-4 sm:mt-0">{dateError}</span>
          )}

          {/* Company */}
          <div ref={companyRef} className="relative flex flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Firm / Company</span>
            <button
              type="button"
              onClick={() => setCompanyOpen((v) => !v)}
              className="bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-800 rounded-xl px-3 py-1.5 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 shadow-2xs cursor-pointer inline-flex items-center gap-2 min-w-[160px] justify-between"
            >
              <span className="truncate">{companyName}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${companyOpen ? "rotate-180" : ""}`}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
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
            title="View Analytics"
            onClick={() => setViewMode("analytics")}
            disabled={!rows.length}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-indigo-200 bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100/80 hover:border-indigo-300 transition-all shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <BarChart3 size={15} className="text-indigo-600" />
            Analytics
          </button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-50/60 to-white p-4 rounded-2xl border border-indigo-100/80 shadow-2xs">
          <span className="text-[11px] font-bold tracking-wider text-indigo-700 uppercase">Active Parties</span>
          <div className="text-xl font-black text-slate-800 tracking-tight mt-1">{rows.length}</div>
          <div className="text-[11px] font-medium text-slate-400 mt-0.5">Tax Invoiced Parties</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50/60 to-white p-4 rounded-2xl border border-emerald-100/80 shadow-2xs">
          <span className="text-[11px] font-bold tracking-wider text-emerald-700 uppercase">Total Tax In (Sales)</span>
          <div className="text-xl font-black text-emerald-900 tracking-tight mt-1">{fmtINR(totals.tax_in)}</div>
          <div className="text-[11px] font-medium text-slate-400 mt-0.5">Collected Output Tax</div>
        </div>
        <div className="bg-gradient-to-br from-amber-50/60 to-white p-4 rounded-2xl border border-amber-100/80 shadow-2xs">
          <span className="text-[11px] font-bold tracking-wider text-amber-700 uppercase">Total Tax Out (Input)</span>
          <div className="text-xl font-black text-amber-900 tracking-tight mt-1">{fmtINR(totals.tax_out)}</div>
          <div className="text-[11px] font-medium text-slate-400 mt-0.5">Paid on Purchases & Expenses</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50/60 to-white p-4 rounded-2xl border border-blue-100/80 shadow-2xs">
          <span className="text-[11px] font-bold tracking-wider text-blue-700 uppercase">Net Tax Balance</span>
          <div className="text-xl font-black text-blue-900 tracking-tight mt-1">{fmtINR(totals.tax_in - totals.tax_out)}</div>
          <div className="text-[11px] font-medium text-slate-400 mt-0.5">Output Tax − Input Tax</div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75">
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Party Name</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Sale Tax</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Purchase / Expense Tax</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center text-slate-500 text-xs">
                    Loading GST records…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-rose-600 text-xs font-bold">
                      <AlertCircle size={22} />
                      <span>{error}</span>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center text-slate-500 text-xs font-medium">
                    No GST records found for this period.
                  </td>
                </tr>
              ) : (
                pagedRows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 text-xs font-bold text-slate-800">{r.party_name}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-emerald-700 text-right tabular-nums">{fmtINR(r.sale_tax)}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-700 text-right tabular-nums">{fmtINR(r.purchase_expense_tax)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50/90 font-bold border-t border-slate-200/80 text-slate-800">
                  <td className="px-4 py-3 text-xs text-slate-900">Total</td>
                  <td className="px-4 py-3 text-xs text-right tabular-nums text-emerald-700">{fmtINR(totals.tax_in)}</td>
                  <td className="px-4 py-3 text-xs text-right tabular-nums text-slate-900">{fmtINR(totals.tax_out)}</td>
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

const totalsContainerStyle = {
  marginTop: 12,
  padding: "12px 16px",
  background: "#f9fafb",
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 8,
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: 6,
};

const totalRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const totalLabelStyle = {
  fontSize: 13,
  fontWeight: 700,
  color: NAVY,
};

const totalValueStyle = {
  fontSize: 14,
  fontWeight: 800,
  color: INDIGO,
  minWidth: 100,
  textAlign: "right",
};
