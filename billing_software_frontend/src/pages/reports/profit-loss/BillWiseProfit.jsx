import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  ChevronDown,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  AlertCircle,
  X,
  Search,
  User,
  FileText,
  Wallet,
  TrendingUp,
  Loader2,
  Calendar,
  Building2,
  Percent,
  ArrowUpRight,
  ArrowDownLeft,
  BarChart3,
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../../services/api";
import ReportPagination from "../../../components/reports/ReportPagination";
import ReportAnalyticsView from "../../../components/reports/ReportAnalyticsView";

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

const fmtPct = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";

function formatDateISO(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateISO(s) {
  if (!s) s = "2000-01-01";
  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  return Number.isNaN(date.getTime()) ? new Date(2000, 0, 1) : date;
}

function fmtDate(s) {
  if (!s) return "-";
  const [y, m, d] = String(s).split("-").map(Number);
  if (!y || !m || !d) return s;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
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
    `<html><head><title>${title || "Bill Wise Profit"}</title>
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

/* ── Toast hook (same local pattern used across the app pages) ───────── */
function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((type, title, msg) => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { id, type, title, msg }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  }, []);
  const remove = useCallback((id) => setToasts((p) => p.filter((t) => t.id !== id)), []);
  return { toasts, show, remove };
}

function ToastPortal({ toasts, remove }) {
  return (
    <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10, pointerEvents: "none" }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          display: "flex", alignItems: "flex-start", gap: 10, minWidth: 250, maxWidth: 340,
          background: "#fff", border: `1.5px solid ${t.type === "error" ? "#fecaca" : t.type === "success" ? "#bbf7d0" : "#fde68a"}`,
          borderRadius: 10, padding: "10px 12px", boxShadow: "0 14px 36px rgba(30,27,75,.14)",
          fontFamily: FONT, pointerEvents: "auto",
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 800, color: "#fff",
            background: t.type === "error" ? "#dc2626" : t.type === "success" ? "#16a34a" : "#d97706",
          }}>
            {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "!"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: NAVY }}>{t.title}</div>
            {t.msg && <div style={{ fontSize: 11.5, color: GRAY_TEXT, marginTop: 2 }}>{t.msg}</div>}
          </div>
          <button onClick={() => remove(t.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 13, padding: 0, flexShrink: 0 }}>✕</button>
        </div>
      ))}
    </div>
  );
}

/* ── Invoice details modal ──────────────────────────────────────────── */
function BillWiseDetailModal({ row, onClose }) {
  if (!row) return null;
  const lines = row.details || [];
  const profit = Number(row.profit || 0);
  const profitColor = profit > 0 ? "#15803d" : profit < 0 ? "#dc2626" : "#64748b";
  const profitBg = profit > 0 ? "#f0fdf4" : profit < 0 ? "#fef2f2" : "#f8fafc";
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1100, background: "rgba(30,27,75,.45)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: FONT,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 720, maxHeight: "92vh", display: "flex", flexDirection: "column",
          background: "#fff", borderRadius: 16, boxShadow: "0 24px 64px rgba(30,27,75,.28)", overflow: "hidden",
        }}
      >
        {/* Modal header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: `1px solid ${LIGHT_BORDER}`, background: "#f8fafc" }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,#1f8cff,#4338ca)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
            <FileText size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: NAVY }}>Invoice {row.invoice_no || `#${row.id}`}</div>
            <div style={{ fontSize: 11.5, color: GRAY_TEXT }}>{fmtDate(row.invoice_date)} &nbsp;•&nbsp; {row.party || "Customer"}</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4, display: "flex" }}>
            <X size={18} />
          </button>
        </div>

        {/* Modal body — line items */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 18px" }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>
            Bill Details
          </div>
          <div style={{ overflowX: "auto", border: `1px solid ${LIGHT_BORDER}`, borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
              <thead>
                <tr>
                  {["Product", "Qty", "Sale Price", "Discount", "GST %", "Tax", "Line Total", "Cost", "Profit/Loss"].map((h) => (
                    <th key={h} style={{ ...thStyle, textAlign: h !== "Product" ? "right" : "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((ln, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${LIGHT_BORDER}` }}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: NAVY }}>
                      <div>{ln.product_name || "Item"}</div>
                      {ln.product_id ? <div style={{ fontSize: 10.5, color: "#94a3b8" }}>#{ln.product_id}</div> : null}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{Number(ln.qty || 0).toLocaleString("en-IN")}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{fmtINR(ln.price)}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{fmtINR(ln.discount)}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{Number(ln.gst_percentage || 0)}%</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{fmtINR(ln.tax_amount)}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>{fmtINR(ln.amount)}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{fmtINR(ln.cost_amount)}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: Number(ln.profit || 0) >= 0 ? "#15803d" : "#dc2626" }}>
                      {fmtINR(ln.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Invoice totals */}
          <div style={{ marginTop: 14, border: `1px solid ${LIGHT_BORDER}`, borderRadius: 8, overflow: "hidden" }}>
            {[
              ["Sub Total", Number(row.sub_total || 0)],
              ["GST / Tax", Number(row.gst_total || 0)],
              ["Discount", Number(row.discount_total || 0)],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderBottom: `1px solid ${LIGHT_BORDER}`, fontSize: 12.5, color: "#334155" }}>
                <span style={{ color: GRAY_TEXT }}>{label}</span>
                <span style={{ fontWeight: 700 }}>{fmtINR(value)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "#f8fafc", fontSize: 13.5, fontWeight: 800, color: NAVY }}>
              <span>Total Sale Amount</span>
              <span>{fmtINR(row.total_sale_amount)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderTop: `1px solid ${LIGHT_BORDER}`, fontSize: 12.5, color: "#334155" }}>
              <span style={{ color: GRAY_TEXT }}>Total Cost Value</span>
              <span style={{ fontWeight: 700 }}>{fmtINR(row.cost_total)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderTop: `1px solid ${LIGHT_BORDER}`, fontSize: 12.5, color: "#334155" }}>
              <span style={{ color: GRAY_TEXT }}>Profit %</span>
              <span style={{ fontWeight: 700 }}>{fmtPct(row.profit_percent)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "11px 12px", background: profitBg, fontSize: 14, fontWeight: 800, color: profitColor, borderTop: `2px solid ${LIGHT_BORDER}` }}>
              <span>Final Profit / Loss</span>
              <span>{fmtINR(row.profit)}</span>
            </div>
          </div>
        </div>

        {/* Modal footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 18px", borderTop: `1px solid ${LIGHT_BORDER}`, background: "#f8fafc" }}>
          <button onClick={onClose} style={{ ...modalBtnStyle }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────────── */
export default function BillWiseProfit() {
  const { adminId } = getAuth();

  const [period, setPeriod] = useState("this_month");
  const [{ from: startDate, to: endDate }, setRange] = useState(applyPeriod("this_month"));
  const [companyId, setCompanyId] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [companyName, setCompanyName] = useState("My Company");

  const [parties, setParties] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null); // { id, name }
  const [partyQuery, setPartyQuery] = useState("");
  const [partyOpen, setPartyOpen] = useState(false);

  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ invoice_count: 0, total_sale_amount: 0, total_cost: 0, total_profit: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [detailRow, setDetailRow] = useState(null); // invoice row open in the modal
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [periodOpen, setPeriodOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);

  const periodRef = useRef(null);
  const companyRef = useRef(null);
  const partyRef = useRef(null);

  const { toasts, show, remove } = useToast();

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
      .catch(() => show("error", "Failed to load companies.", "Please try again."));
  }, [adminId, show]);

  // Load parties (customers) for the party filter
  useEffect(() => {
    if (!adminId) return;
    api
      .get(`/customer/get_all_customer?admin_id=${adminId}`)
      .then((res) => {
        if (!res.data?.status) return;
        const list = (res.data.data || [])
          .map((c) => ({ id: c.id, name: (c.name || "").toString().trim() || `Customer #${c.id}` }))
          .filter((c) => c.id);
        setParties(list);
      })
      .catch(() => show("error", "Failed to load parties.", "Party filter may be unavailable."));
  }, [adminId, show]);

  const selectCompany = (c) => {
    setCompanyId(Number(c.id));
    setCompanyName(c.company_name || "My Company");
    setCompanyOpen(false);
  };

  const selectParty = (p) => {
    setSelectedParty(p);
    setPartyOpen(false);
    setPartyQuery("");
  };

  const clearParty = () => {
    setSelectedParty(null);
    setPartyOpen(false);
    setPartyQuery("");
  };

  const filteredParties = useMemo(
    () =>
      parties.filter(
        (p) => !partyQuery || p.name.toLowerCase().includes(partyQuery.toLowerCase())
      ),
    [parties, partyQuery]
  );

  // Fetch report on any filter change
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
        party_id: selectedParty ? selectedParty.id : 0,
      };
      api
        .get("/report/bill-wise-profit", { params })
        .then((res) => {
          if (res.data?.status) {
            setRows(res.data.data || []);
            setSummary(res.data.summary || { invoice_count: 0, total_sale_amount: 0, total_cost: 0, total_profit: 0 });
          } else {
            const msg = res.data?.message || res.data?.errors || "Failed to load report.";
            setError(typeof msg === "string" ? msg : "Failed to load report.");
            if (typeof msg === "string") show("error", "Report failed", msg);
          }
        })
        .catch((err) => {
          const msg = err?.response?.data?.message || "Failed to load report.";
          setError(msg);
          show("error", "Report failed", msg);
        })
        .finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(t);
  }, [companyId, adminId, startDate, endDate, selectedParty, reloadKey, show]);

  const selectPeriod = (p) => {
    setPeriod(p.value);
    setRange(applyPeriod(p.value));
    setPeriodOpen(false);
  };

  const prettyFrom = startDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const prettyTo = endDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const metaLabel = `${prettyFrom} to ${prettyTo}`;

  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedRows = rows.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const analyticsRows = useMemo(
    () =>
      (rows || []).map((r) => ({
        date: r.invoice_date || "",
        group: r.party || r.invoice_no || "General",
        value: Number(r.profit) || 0,
        count: 1,
      })),
    [rows]
  );

  /* ── Excel export ── */
  const handleExcel = () => {
    try {
      const headers = ["Date", "Invoice No.", "Party", "Total Sale Amount", "Profit(+)/Loss(-)", "Profit %"];
      const sheetData = [
        ["Bill Wise Profit"],
        ["Period", metaLabel],
        ["Company", companyName],
        ["Party", selectedParty ? selectedParty.name : "All Parties"],
        [],
        headers,
      ];
      rows.forEach((r) => {
        sheetData.push([
          fmtDate(r.invoice_date),
          r.invoice_no || "",
          r.party || "",
          Number(r.total_sale_amount || 0),
          Number(r.profit || 0),
          Number(r.profit_percent || 0),
        ]);
      });
      sheetData.push([
        "Total",
        "",
        "",
        Number(summary.total_sale_amount || 0),
        Number(summary.total_profit || 0),
        "",
      ]);
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws["!cols"] = headers.map((h) => ({ wch: Math.max(12, h.length + 4) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Bill Wise Profit");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array", bookSST: false });
      saveAs(
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `Bill_Wise_Profit_${formatDateISO(startDate)}_to_${formatDateISO(endDate)}.xlsx`
      );
      show("success", "Report exported", `Excel exported for ${rows.length} invoice(s).`);
    } catch {
      show("error", "Excel export failed.", "Please try again.");
    }
  };

  /* ── Print ── */
  const handlePrint = () => {
    const buildRow = (r, i, isTotal) => {
      const profit = Number(r.profit || 0);
      const pCls = profit >= 0 ? "g" : "neg";
      if (isTotal) {
        return `<tr>
          <td><strong>Total</strong></td><td></td><td></td>
          <td class="r"><strong>${fmtINR(r.total_sale_amount)}</strong></td>
          <td class="r ${pCls}"><strong>${fmtINR(r.profit)}</strong></td>
          <td></td>
        </tr>`;
      }
      return `<tr>
        <td>${fmtDate(r.invoice_date)}</td>
        <td><strong>${r.invoice_no || "-"}</strong></td>
        <td>${r.party || "-"}</td>
        <td class="r">${fmtINR(r.total_sale_amount)}</td>
        <td class="r ${pCls}"><strong>${fmtINR(r.profit)}</strong></td>
        <td class="r">${fmtPct(r.profit_percent)}</td>
      </tr>`;
    };
    const body =
      rows.map((r, i) => buildRow(r, i + 1, false)).join("") +
      buildRow(
        { total_sale_amount: summary.total_sale_amount, profit: summary.total_profit },
        "",
        true
      );

    const el = document.createElement("div");
    el.innerHTML =
      `<h2>Bill Wise Profit</h2>
       <div class="meta">${metaLabel} &nbsp;|&nbsp; ${companyName} &nbsp;|&nbsp; Party: ${selectedParty ? selectedParty.name : "All"}</div>
       <table>
         <thead><tr>
           <th>Date</th><th>Invoice No</th><th>Party</th>
           <th class="r">Total Sale Amount</th><th class="r">Profit(+)/Loss(-)</th><th class="r">Profit %</th>
         </tr></thead>
         <tbody>${body}</tbody>
       </table>
       <div class="summary">Total Profit(+)/Loss(-): <span>${fmtINR(summary.total_profit)}</span></div>`;
    printElement(el, "Bill Wise Profit");
  };

  /* ── Reload ── */
  const reload = () => {
    setReloadKey((k) => k + 1);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto text-slate-800">
      <ToastPortal toasts={toasts} remove={remove} />

      {/* ── HEADER & TITLE ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
            Bill-Wise Profit &amp; Loss
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Analyze gross sales, individual bill profitability, and margin performance
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setAnalyticsOpen(true)}
            disabled={!rows.length}
            title="Open Analytics"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <BarChart3 size={16} />
            <span>Analytics</span>
          </button>
          <button
            onClick={handleExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
          >
            <FileSpreadsheet size={15} />
            <span>Excel Report</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
          >
            <Printer size={15} />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* ── CONTROLS & FILTER CARD ── */}
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-xs border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Period Dropdown */}
          <div ref={periodRef} className="relative">
            <button
              onClick={() => setPeriodOpen((v) => !v)}
              className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 hover:bg-slate-100/50 transition cursor-pointer text-xs font-bold text-slate-800"
            >
              <span className="text-[11px] font-bold text-slate-400 uppercase">Period:</span>
              <span>{PERIODS.find((p) => p.value === period)?.label || "This Month"}</span>
              <ChevronDown
                size={14}
                className={`text-slate-400 transition-transform ${periodOpen ? "rotate-180" : ""}`}
              />
            </button>
            {periodOpen && (
              <div className="absolute left-0 top-[calc(100%+6px)] z-40 w-44 bg-white border border-slate-200 rounded-xl shadow-xl p-1">
                {PERIODS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => selectPeriod(p)}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg transition cursor-pointer ${
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

          {/* From Date */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 hover:bg-slate-100/50 transition">
            <Calendar size={14} className="text-slate-400 shrink-0" />
            <span className="text-[11px] font-bold text-slate-400 uppercase">From:</span>
            <input
              type="date"
              value={formatDateISO(startDate)}
              onChange={(e) => {
                setRange({ from: parseDateISO(e.target.value), to: endDate });
                setPeriod("custom");
              }}
              className="border-none outline-none text-xs font-bold text-slate-800 bg-transparent cursor-pointer"
            />
          </div>

          {/* To Date */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 hover:bg-slate-100/50 transition">
            <Calendar size={14} className="text-slate-400 shrink-0" />
            <span className="text-[11px] font-bold text-slate-400 uppercase">To:</span>
            <input
              type="date"
              value={formatDateISO(endDate)}
              onChange={(e) => {
                setRange({ from: startDate, to: parseDateISO(e.target.value) });
                setPeriod("custom");
              }}
              className="border-none outline-none text-xs font-bold text-slate-800 bg-transparent cursor-pointer"
            />
          </div>

          {/* Party Filter Selector */}
          <div ref={partyRef} className="relative min-w-[220px]">
            <button
              onClick={() => setPartyOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 hover:bg-slate-100/50 transition cursor-pointer text-xs font-bold text-slate-800"
            >
              <div className="flex items-center gap-2 truncate">
                <User size={14} className={selectedParty ? "text-indigo-600" : "text-slate-400"} />
                <span className="truncate">
                  {selectedParty ? selectedParty.name : "All Parties / Customers"}
                </span>
              </div>
              {selectedParty ? (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    clearParty();
                  }}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X size={14} />
                </div>
              ) : (
                <ChevronDown
                  size={14}
                  className={`text-slate-400 transition-transform ${partyOpen ? "rotate-180" : ""}`}
                />
              )}
            </button>

            {partyOpen && (
              <div className="absolute left-0 top-[calc(100%+6px)] z-40 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-2">
                <div className="relative mb-2">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    autoFocus
                    value={partyQuery}
                    onChange={(e) => setPartyQuery(e.target.value)}
                    placeholder="Search party..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>
                <div className="max-h-56 overflow-y-auto space-y-0.5">
                  <button
                    onClick={clearParty}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition cursor-pointer ${
                      !selectedParty
                        ? "bg-indigo-50 text-indigo-700 font-bold"
                        : "text-slate-700 hover:bg-slate-50 font-medium"
                    }`}
                  >
                    <User size={13} />
                    <span>All Parties</span>
                  </button>
                  {filteredParties.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => selectParty(p)}
                      className={`w-full text-left px-3 py-2 text-xs rounded-lg transition cursor-pointer truncate ${
                        selectedParty?.id === p.id
                          ? "bg-indigo-50 text-indigo-700 font-bold"
                          : "text-slate-700 hover:bg-slate-50 font-medium"
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                  {filteredParties.length === 0 && (
                    <div className="p-3 text-center text-xs text-slate-400">No parties found.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Firm / Company Selector */}
        <div ref={companyRef} className="relative shrink-0">
          <button
            onClick={() => setCompanyOpen((v) => !v)}
            className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 hover:bg-slate-100/50 transition cursor-pointer text-xs font-bold text-slate-800"
          >
            <Building2 size={15} className="text-slate-400" />
            <span className="text-[11px] font-bold text-slate-400 uppercase">Firm:</span>
            <span>{companyName}</span>
            <ChevronDown
              size={14}
              className={`text-slate-400 transition-transform ${companyOpen ? "rotate-180" : ""}`}
            />
          </button>
          {companyOpen && (
            <div className="absolute right-0 top-[calc(100%+6px)] z-40 w-56 bg-white border border-slate-200 rounded-xl shadow-xl p-1">
              {companies.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectCompany(c)}
                  className={`w-full text-left px-3 py-2 text-xs rounded-lg transition cursor-pointer truncate ${
                    Number(c.id) === Number(companyId)
                      ? "bg-indigo-50 text-indigo-700 font-bold"
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

      {/* ── 4 MODERN KPI CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Invoices Billed
            </div>
            <div className="text-xl md:text-2xl font-extrabold text-slate-800 mt-1">
              {summary.invoice_count ?? rows.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Total Sales Records</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <FileText size={24} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Total Sale Amount
            </div>
            <div className="text-xl md:text-2xl font-extrabold text-slate-800 mt-1">
              {fmtINR(summary.total_sale_amount)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Gross Billing Revenue</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Net Profit / Loss
            </div>
            <div
              className={`text-xl md:text-2xl font-extrabold mt-1 ${
                Number(summary.total_profit) >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {Number(summary.total_profit) >= 0 ? "+" : "-"}
              {fmtINR(Math.abs(Number(summary.total_profit)))}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Total Realized Margin</div>
          </div>
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              Number(summary.total_profit) >= 0
                ? "bg-emerald-50 text-emerald-600"
                : "bg-rose-50 text-rose-600"
            }`}
          >
            <Wallet size={24} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Average Margin
            </div>
            <div className="text-xl md:text-2xl font-extrabold text-amber-600 mt-1">
              {summary.total_sale_amount > 0
                ? fmtPct((summary.total_profit / summary.total_sale_amount) * 100)
                : "0.00%"}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Profit vs Sale Ratio</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Percent size={24} />
          </div>
        </div>
      </div>

      {/* ── TABLE CARD ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3.5 text-center w-12">#</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Invoice No</th>
                <th className="px-4 py-3.5">Party</th>
                <th className="px-4 py-3.5 text-right">Total Sale Amount</th>
                <th className="px-4 py-3.5 text-right">Profit (+)/Loss (-)</th>
                <th className="px-4 py-3.5 text-center w-24">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={26} className="text-indigo-600 animate-spin" />
                      <div className="text-xs text-slate-400 font-medium">
                        Loading invoice-wise profit...
                      </div>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2.5">
                      <AlertCircle size={26} className="text-rose-500" />
                      <div className="text-xs font-bold text-rose-600 max-w-md">{error}</div>
                      <button
                        onClick={reload}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-indigo-600 text-xs font-bold transition cursor-pointer"
                      >
                        <RefreshCw size={13} />
                        <span>Retry</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FileText size={28} className="text-slate-300" />
                      <div className="text-xs font-bold text-slate-500">
                        No sale invoices found for the selected filters.
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Try adjusting the date range or party filter.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedRows.map((r, i) => {
                  const profit = Number(r.profit || 0);
                  const isPos = profit >= 0;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5 text-center text-slate-400 font-medium">
                        {(safePage - 1) * rowsPerPage + i + 1}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 font-medium">
                        {fmtDate(r.invoice_date)}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-800 whitespace-nowrap">
                        {r.invoice_no || "-"}
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 font-medium">
                        <div className="flex items-center gap-2">
                          <User size={13} className="text-slate-400 shrink-0" />
                          <span>{r.party || "-"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-extrabold text-slate-800 whitespace-nowrap">
                        {fmtINR(r.total_sale_amount)}
                      </td>
                      <td
                        className={`px-4 py-3.5 text-right font-extrabold whitespace-nowrap ${
                          isPos ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {isPos ? "+" : "-"}
                        {fmtINR(Math.abs(profit))}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => setDetailRow(r)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition cursor-pointer"
                        >
                          <span>Show</span>
                          <span className="text-[10px]">&gt;</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {!loading && !error && rows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50/90 font-bold border-t-2 border-slate-200 text-xs text-slate-800">
                  <td className="px-4 py-3.5"></td>
                  <td className="px-4 py-3.5 uppercase tracking-wider text-slate-500 font-bold" colSpan={3}>
                    Total
                  </td>
                  <td className="px-4 py-3.5 text-right font-extrabold text-slate-900">
                    {fmtINR(summary.total_sale_amount)}
                  </td>
                  <td
                    className={`px-4 py-3.5 text-right font-extrabold ${
                      Number(summary.total_profit) >= 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {Number(summary.total_profit) >= 0 ? "+" : "-"}
                    {fmtINR(Math.abs(Number(summary.total_profit)))}
                  </td>
                  <td className="px-4 py-3.5"></td>
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
          onRowsPerPageChange={(v) => {
            setRowsPerPage(v);
            setPage(1);
          }}
        />
      </div>

      {detailRow && <BillWiseDetailModal row={detailRow} onClose={() => setDetailRow(null)} />}

      {analyticsOpen && (
        <ReportAnalyticsView
          title="Bill-Wise Profit Analytics"
          subtitle={`${analyticsRows.length} records`}
          rows={analyticsRows}
          symbol="₹"
          groupLabel="Customers"
          onClose={() => setAnalyticsOpen(false)}
        />
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   STYLES — compact accounting-report look (matches the Reports section)
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

const headingSectionStyle = {
  padding: "12px 2px 4px",
};

const headingTitleStyle = {
  fontSize: 15,
  fontWeight: 800,
  color: NAVY,
  textTransform: "uppercase",
  letterSpacing: ".04em",
};

const headingMetaStyle = {
  fontSize: 11.5,
  color: GRAY_TEXT,
  marginTop: 4,
};

const detailsSectionStyle = {
  padding: "8px 2px",
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

const partyBtnStyle = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  width: "100%",
  padding: "6px 10px",
  background: "#fff",
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 6,
  cursor: "pointer",
  fontFamily: FONT,
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

const summarySectionStyle = {
  marginTop: 10,
  padding: "10px 14px",
  background: "#f8fafc",
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 8,
};

const summaryChipStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  minWidth: 170,
  padding: "8px 12px",
  background: "#fff",
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 8,
  fontSize: 11.5,
};

const modalBtnStyle = {
  padding: "7px 16px",
  borderRadius: 8,
  border: `1px solid ${LIGHT_BORDER}`,
  background: "#fff",
  color: NAVY,
  fontSize: 12.5,
  fontWeight: 700,
  fontFamily: FONT,
  cursor: "pointer",
};