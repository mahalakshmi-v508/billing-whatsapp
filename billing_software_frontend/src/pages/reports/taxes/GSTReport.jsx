import { useState, useEffect, useMemo, useRef } from "react";
import {
  FileSpreadsheet,
  Printer,
  AlertCircle,
  Calendar,
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../../services/api";

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
    if (companyId === null) return;
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
        if (res.data?.status) {
          setRows(res.data.data || []);
          setTotals(res.data.totals || { tax_in: 0, tax_out: 0 });
        } else {
          setError(res.data?.message || "Failed to load GST report.");
        }
      })
      .catch(() => setError("Failed to load GST report."))
      .finally(() => setLoading(false));
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

  return (
    <div style={{ fontFamily: FONT, padding: "6px 2px", display: "flex", flexDirection: "column", height: "100%" }}>
      {/* ═══════════════════════════════════════════════════════════════
          HEADER ROW: Date Filters + Company + Actions
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
        {/* From Date */}
        <div style={dateBoxStyle}>
          <Calendar size={14} color={GRAY_TEXT} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: GRAY_TEXT, fontWeight: 500 }}>From:</span>
          <input
            type="date"
            value={formatDateISO(fromDate)}
            onChange={handleDateChange(setFromDate)}
            style={dateInputStyle}
          />
        </div>

        {/* To Date */}
        <div style={dateBoxStyle}>
          <Calendar size={14} color={GRAY_TEXT} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: GRAY_TEXT, fontWeight: 500 }}>To:</span>
          <input
            type="date"
            value={formatDateISO(toDate)}
            onChange={handleDateChange(setToDate)}
            style={dateInputStyle}
          />
        </div>

        {dateError && (
          <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 600 }}>{dateError}</span>
        )}

        {/* Company */}
        <div ref={companyRef} style={{ position: "relative" }}>
          <button onClick={() => setCompanyOpen((v) => !v)} style={selectBtnStyle}>
            <span style={{ fontWeight: 600, color: NAVY }}>{companyName}</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: companyOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          {companyOpen && (
            <div style={dropdownPanelStyle}>
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

        {/* RIGHT: Actions */}
        <div style={{ display: "flex", gap: 8, marginLeft: "auto", alignItems: "center" }}>
          <button onClick={handleExcel} style={actionBtnStyle} title="Export to Excel">
            <FileSpreadsheet size={18} color={INDIGO} />
            <span style={{ fontSize: 11, color: NAVY, fontWeight: 600 }}>Excel</span>
          </button>
          <button onClick={handlePrint} style={actionBtnStyle} title="Print Report">
            <Printer size={18} color={INDIGO} />
            <span style={{ fontSize: 11, color: NAVY, fontWeight: 600 }}>Print</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          REPORT TITLE
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{ fontSize: 17, fontWeight: 800, color: NAVY, marginBottom: 10 }}>
        GST TAX REPORT
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          GST TABLE
          ═══════════════════════════════════════════════════════════════ */}
      <div style={tableContainerStyle}>
        <div style={{ overflowX: "auto", flex: 1 }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: "40%", minWidth: 180 }}>Party Name</th>
                <th style={{ ...thStyle, width: "30%", minWidth: 120, textAlign: "right" }}>Sale Tax</th>
                <th style={{ ...thStyle, width: "30%", minWidth: 160, textAlign: "right" }}>Purchase / Expense Tax</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} style={emptyCellStyle}>
                    <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Loading…</div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={3} style={emptyCellStyle}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <AlertCircle size={26} color="#dc2626" />
                      <div style={{ color: "#dc2626", fontSize: 13, fontWeight: 600 }}>{error}</div>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={3} style={emptyCellStyle}>
                    <div style={{ textAlign: "center", color: "#9ca3af" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, marginBottom: 4 }}>No GST records found</div>
                      <div style={{ fontSize: 12 }}>Try adjusting the date range.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${LIGHT_BORDER}` }}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: NAVY }}>{r.party_name}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{fmtINR(r.sale_tax)}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{fmtINR(r.purchase_expense_tax)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          BOTTOM TOTALS
          ═══════════════════════════════════════════════════════════════ */}
      <div style={totalsContainerStyle}>
        <div style={totalRowStyle}>
          <span style={totalLabelStyle}>Total Tax In:</span>
          <span style={totalValueStyle}>{fmtINR(totals.tax_in)}</span>
        </div>
        <div style={totalRowStyle}>
          <span style={totalLabelStyle}>Total Tax Out:</span>
          <span style={totalValueStyle}>{fmtINR(totals.tax_out)}</span>
        </div>
      </div>
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
