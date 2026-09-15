import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { ChevronDown, FileSpreadsheet, Printer, RefreshCw, AlertCircle, X, Search, User, FileText, Wallet, TrendingUp, Loader2 } from "lucide-react";
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
    <div style={{ fontFamily: FONT, padding: "2px 0", display: "flex", flexDirection: "column", height: "100%", background: "#fff" }}>
      <ToastPortal toasts={toasts} remove={remove} />

      {/* ═══════════════════════════════════════════════════════════════
          1. TOP BAR — period, From / To dates, company, actions
          ═══════════════════════════════════════════════════════════════ */}
      <div style={topBarStyle}>
        <div ref={periodRef} style={{ position: "relative", flexShrink: 0 }}>
          <button onClick={() => setPeriodOpen((v) => !v)} style={compactSelectBtnStyle}>
            <span style={{ fontWeight: 600, color: NAVY, fontSize: 12.5 }}>
              {PERIODS.find((p) => p.value === period)?.label || "This Month"}
            </span>
            <ChevronDown size={14} style={{ color: "#94a3b8", transform: periodOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
          </button>
          {periodOpen && (
            <div style={dropdownPanelStyle}>
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => selectPeriod(p)}
                  style={{
                    ...dropdownItemStyle,
                    background: p.value === period ? "#eef2ff" : "transparent",
                    color: p.value === period ? INDIGO : "#334155",
                    fontWeight: p.value === period ? 700 : 500,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={dateFieldStyle}>
          <span style={dateLabelStyle}>From</span>
          <input
            type="date"
            value={formatDateISO(startDate)}
            onChange={(e) => { setRange({ from: parseDateISO(e.target.value), to: endDate }); setPeriod("custom"); }}
            style={compactDateInputStyle}
          />
        </div>
        <div style={dateFieldStyle}>
          <span style={dateLabelStyle}>To</span>
          <input
            type="date"
            value={formatDateISO(endDate)}
            onChange={(e) => { setRange({ from: startDate, to: parseDateISO(e.target.value) }); setPeriod("custom"); }}
            style={compactDateInputStyle}
          />
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", marginLeft: "auto", flexShrink: 0 }}>
          <div ref={companyRef} style={{ position: "relative" }}>
            <button onClick={() => setCompanyOpen((v) => !v)} style={compactSelectBtnStyle} title="Firm">
              <span style={{ fontWeight: 600, color: NAVY, fontSize: 12.5 }}>{companyName}</span>
              <ChevronDown size={14} style={{ color: "#94a3b8", transform: companyOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
            </button>
            {companyOpen && (
              <div style={{ ...dropdownPanelStyle, right: 0, left: "auto" }}>
                {companies.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectCompany(c)}
                    style={{
                      ...dropdownItemStyle,
                      background: Number(c.id) === Number(companyId) ? "#eef2ff" : "transparent",
                      color: Number(c.id) === Number(companyId) ? INDIGO : "#334155",
                      fontWeight: Number(c.id) === Number(companyId) ? 700 : 500,
                    }}
                  >
                    {c.company_name || "My Company"}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={handleExcel} title="Excel Report" style={circleBtnStyle}>
            <FileSpreadsheet size={16} color={INDIGO} />
          </button>
          <button onClick={handlePrint} title="Print" style={circleBtnStyle}>
            <Printer size={16} color={INDIGO} />
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          2. REPORT HEADING + PARTY FILTER
          ═══════════════════════════════════════════════════════════════ */}
      <div style={headingSectionStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <TrendingUp size={16} color={INDIGO} />
          <div style={headingTitleStyle}>Profit On Sale Invoices</div>
        </div>
        <div style={headingMetaStyle}>
          {metaLabel} &nbsp;|&nbsp; {companyName} &nbsp;|&nbsp; Party: {selectedParty ? selectedParty.name : "All"}
        </div>
      </div>

      {/* Party filter */}
      <div style={detailsSectionStyle}>
        <div style={detailsTitleStyle}>Party Filter</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
          <div ref={partyRef} style={{ position: "relative", minWidth: 220, maxWidth: 340 }}>
            <button onClick={() => setPartyOpen((v) => !v)} style={partyBtnStyle}>
              <User size={14} color={selectedParty ? INDIGO : "#94a3b8"} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: selectedParty ? NAVY : "#94a3b8", fontWeight: selectedParty ? 600 : 400, flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selectedParty ? selectedParty.name : "Select Party (All Customers)"}
              </span>
              {selectedParty ? (
                <button
                  onClick={(e) => { e.stopPropagation(); clearParty(); }}
                  title="Clear party filter"
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0, display: "flex", flexShrink: 0 }}
                >
                  <X size={14} />
                </button>
              ) : (
                <ChevronDown size={15} style={{ color: "#94a3b8", transform: partyOpen ? "rotate(180deg)" : "none", transition: "transform .15s", flexShrink: 0 }} />
              )}
            </button>
            {partyOpen && (
              <div style={{ ...dropdownPanelStyle, minWidth: 260, padding: 8 }}>
                <div style={{ position: "relative", marginBottom: 6 }}>
                  <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input
                    autoFocus
                    value={partyQuery}
                    onChange={(e) => setPartyQuery(e.target.value)}
                    placeholder="Search party..."
                    style={{
                      width: "100%", padding: "7px 10px 7px 28px", border: `1px solid ${LIGHT_BORDER}`,
                      borderRadius: 6, fontSize: 12.5, fontFamily: FONT, outline: "none", color: "#334155",
                    }}
                  />
                </div>
                <div style={{ maxHeight: 230, overflowY: "auto" }}>
                  <button
                    onClick={clearParty}
                    style={{
                      ...dropdownItemStyle,
                      background: !selectedParty ? "#eef2ff" : "transparent",
                      color: !selectedParty ? INDIGO : "#334155",
                      fontWeight: !selectedParty ? 700 : 500,
                      display: "flex", alignItems: "center", gap: 8,
                    }}
                  >
                    <User size={13} style={{ flexShrink: 0 }} />
                    All Parties
                  </button>
                  {filteredParties.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => selectParty(p)}
                      style={{
                        ...dropdownItemStyle,
                        background: selectedParty?.id === p.id ? "#eef2ff" : "transparent",
                        color: selectedParty?.id === p.id ? INDIGO : "#334155",
                        fontWeight: selectedParty?.id === p.id ? 700 : 500,
                      }}
                    >
                      {p.name}
                    </button>
                  ))}
                  {filteredParties.length === 0 && (
                    <div style={{ padding: "10px 12px", fontSize: 12, color: "#94a3b8", textAlign: "center" }}>
                      No parties found.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {selectedParty && (
            <span style={{ fontSize: 11.5, color: INDIGO, background: "#eef2ff", padding: "3px 10px", borderRadius: 20, fontWeight: 700 }}>
              Showing only "{selectedParty.name}"
            </span>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          3. REPORT TABLE
          ═══════════════════════════════════════════════════════════════ */}
      <div style={tableContainerStyle}>
        <div style={{ overflowX: "auto", flex: 1 }}>
          <table style={{ ...tableStyle, minWidth: 720 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 34, minWidth: 34, textAlign: "center" }}>#</th>
                <th style={{ ...thStyle, width: 100, minWidth: 90 }}>Date</th>
                <th style={{ ...thStyle, width: 130, minWidth: 110 }}>Invoice No</th>
                <th style={{ ...thStyle, minWidth: 140 }}>Party</th>
                <th style={{ ...thStyle, width: 140, minWidth: 120, textAlign: "right" }}>Total Sale Amount</th>
                <th style={{ ...thStyle, width: 150, minWidth: 130, textAlign: "right" }}>Profit (+)/Loss (-)</th>
                <th style={{ ...thStyle, width: 90, minWidth: 80, textAlign: "center" }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={emptyCellStyle}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                      <Loader2 size={26} color={INDIGO} style={{ animation: "bwp-spin 1s linear infinite" }} />
                      <div style={{ color: "#9ca3af", fontSize: 13 }}>Loading invoice-wise profit...</div>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} style={emptyCellStyle}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                      <AlertCircle size={24} color="#dc2626" />
                      <div style={{ color: "#dc2626", fontSize: 13, fontWeight: 600, textAlign: "center", maxWidth: 420 }}>{error}</div>
                      <button
                        onClick={reload}
                        style={{
                          display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 6,
                          border: `1px solid ${LIGHT_BORDER}`, background: "#fff", color: INDIGO,
                          fontSize: 12.5, fontWeight: 600, fontFamily: FONT, cursor: "pointer",
                        }}
                      >
                        <RefreshCw size={13} />
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={emptyCellStyle}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                      <FileText size={26} color="#c7d2fe" />
                      <div style={{ color: "#9ca3af", fontSize: 13, fontWeight: 600 }}>
                        No sale invoices found for the selected filters.
                      </div>
                      <div style={{ color: "#cbd5e1", fontSize: 12 }}>Try adjusting the date range or party filter.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedRows.map((r, i) => {
                  const profit = Number(r.profit || 0);
                  const profitColor = profit > 0 ? "#15803d" : profit < 0 ? "#dc2626" : "#334155";
                  return (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${LIGHT_BORDER}` }}>
                      <td style={{ ...tdStyle, textAlign: "center", color: GRAY_TEXT }}>{i + 1}</td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{fmtDate(r.invoice_date)}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: NAVY, whiteSpace: "nowrap" }}>{r.invoice_no || "-"}</td>
                      <td style={{ ...tdStyle, fontWeight: 600, color: "#334155" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <User size={13} color="#94a3b8" style={{ flexShrink: 0 }} />
                          <span>{r.party || "-"}</span>
                        </div>
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>{fmtINR(r.total_sale_amount)}</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800, color: profitColor, whiteSpace: "nowrap" }}>
                        {profit >= 0 ? "+" : "-"}{fmtINR(Math.abs(profit))}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <button
                          onClick={() => setDetailRow(r)}
                          style={{
                            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4,
                            padding: "4px 10px", borderRadius: 6, border: `1px solid #c7d2fe`, background: "#eef2ff",
                            color: INDIGO, fontSize: 12, fontWeight: 700, fontFamily: FONT, cursor: "pointer",
                          }}
                        >
                          Show
                          <span style={{ fontSize: 13, lineHeight: 1 }}>&gt;</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {!loading && !error && rows.length > 0 && (
              <tfoot>
                <tr>
                  <td style={{ ...tdStyle, background: "#f2f4f7", fontWeight: 800, color: NAVY, fontSize: 12.5, textAlign: "center" }}></td>
                  <td style={{ ...tdStyle, background: "#f2f4f7", fontWeight: 800, color: NAVY, fontSize: 12.5, textAlign: "center", textTransform: "uppercase", letterSpacing: ".04em" }} colSpan={3}>
                    Total
                  </td>
                  <td style={{ ...tdStyle, background: "#f2f4f7", fontWeight: 800, color: NAVY, fontSize: 12.5, textAlign: "right" }}>
                    {fmtINR(summary.total_sale_amount)}
                  </td>
                  <td style={{ ...tdStyle, background: "#f2f4f7", fontWeight: 800, fontSize: 12.5, textAlign: "right", color: Number(summary.total_profit) >= 0 ? "#15803d" : "#dc2626" }}>
                    {Number(summary.total_profit) >= 0 ? "+" : "-"}{fmtINR(Math.abs(Number(summary.total_profit)))}
                  </td>
                  <td style={{ ...tdStyle, background: "#f2f4f7" }}></td>
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

      {/* ═══════════════════════════════════════════════════════════════
          4. SUMMARY SECTION
          ═══════════════════════════════════════════════════════════════ */}
      {!loading && !error && rows.length > 0 && (
        <div style={summarySectionStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Wallet size={15} color={INDIGO} />
            <div style={{ fontSize: 12.5, fontWeight: 800, color: NAVY, textTransform: "uppercase", letterSpacing: ".06em" }}>Summary</div>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginTop: 6 }}>
            <div style={summaryChipStyle}>
              <span style={{ color: GRAY_TEXT }}>Total Sale Amount</span>
              <span style={{ fontWeight: 800, color: NAVY }}>{fmtINR(summary.total_sale_amount)}</span>
            </div>
            <div style={{ ...summaryChipStyle, background: Number(summary.total_profit) >= 0 ? "#f0fdf4" : "#fef2f2" }}>
              <span style={{ color: GRAY_TEXT }}>Total Profit(+)/Loss(-)</span>
              <span style={{ fontWeight: 800, color: Number(summary.total_profit) >= 0 ? "#15803d" : "#dc2626" }}>
                {Number(summary.total_profit) >= 0 ? "+" : "-"}{fmtINR(Math.abs(Number(summary.total_profit)))}
              </span>
            </div>
            <div style={summaryChipStyle}>
              <span style={{ color: GRAY_TEXT }}>Invoices</span>
              <span style={{ fontWeight: 800, color: NAVY }}>{summary.invoice_count}</span>
            </div>
          </div>
        </div>
      )}

      {/* Loader animation keyframes */}
      <style>{`@keyframes bwp-spin { to { transform: rotate(360deg); } }`}</style>

      {detailRow && <BillWiseDetailModal row={detailRow} onClose={() => setDetailRow(null)} />}
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