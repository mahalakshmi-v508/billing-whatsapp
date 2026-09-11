import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, FileSpreadsheet, Printer, RefreshCw, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../../services/api";

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

  return (
    <div style={{ fontFamily: FONT, padding: "2px 0", display: "flex", flexDirection: "column", height: "100%", background: "#fff" }}>
      {/* ═══════════════════════════════════════════════════════════════
          1. TOP BAR — compact From / To dates, checkbox, company, actions
          ═══════════════════════════════════════════════════════════════ */}
      <div style={topBarStyle}>
        {/* Period preset (keeps existing quick-range behaviour) */}
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

        {/* From / To dates */}
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

        {checkbox(itemsHavingSale, (e) => setItemsHavingSale(e.target.checked))}

        {/* Right: company selector + Excel / Print icons */}
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
          2. DETAILS → FILTERS
          ═══════════════════════════════════════════════════════════════ */}
      <div style={detailsSectionStyle}>
        <div style={detailsTitleStyle}>Details</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6 }}>
          <span style={filtersLabelStyle}>Filters</span>
          {checkbox(itemsHavingSale, (e) => setItemsHavingSale(e.target.checked))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          3. REPORT TABLE — one continuous scrollable table
          ═══════════════════════════════════════════════════════════════ */}
      <div style={tableContainerStyle}>
        <div style={{ overflowX: "auto", flex: 1 }}>
          <table style={{ ...tableStyle, minWidth: TABLE_MIN_WIDTH }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 34, minWidth: 34 }}>#</th>
                {COLUMNS.map((c) => (
                  <th key={c.key} style={{ ...thStyle, width: c.width, minWidth: c.min, textAlign: c.right ? "center" : "left" }}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={13} style={emptyCellStyle}>
                    <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Loading...</div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={13} style={emptyCellStyle}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                      <AlertCircle size={24} color="#dc2626" />
                      <div style={{ color: "#dc2626", fontSize: 13, fontWeight: 600 }}>{error}</div>
                      <button
                        onClick={() => setReloadKey((k) => k + 1)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 14px",
                          borderRadius: 6,
                          border: `1px solid ${LIGHT_BORDER}`,
                          background: "#fff",
                          color: INDIGO,
                          fontSize: 12.5,
                          fontWeight: 600,
                          fontFamily: FONT,
                          cursor: "pointer",
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
                  <td colSpan={13} style={emptyCellStyle}>
                    <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No data available</div>
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${LIGHT_BORDER}` }}>
                    <td style={{ ...tdStyle, textAlign: "center", color: GRAY_TEXT }}>{i + 1}</td>
                    {COLUMNS.map((c) => {
                      if (c.txt) {
                        return (
                          <td key={c.key} style={{ ...tdStyle, fontSize: 12.5, fontWeight: 600, color: NAVY }}>
                            {r[c.key] || "-"}
                          </td>
                        );
                      }
                      const val = Number(r[c.key] || 0);
                      const isNet = c.key === "net_profit" && val !== 0;
                      return (
                        <td
                          key={c.key}
                          style={{
                            ...tdStyle,
                            textAlign: "right",
                            fontWeight: 700,
                            color: isNet ? (val >= 0 ? "#15803d" : "#dc2626") : "#334155",
                          }}
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
                <tr>
                  <td style={{ ...tdStyle, background: "#f2f4f7", fontWeight: 700, color: NAVY, fontSize: 12.5, textAlign: "center" }}></td>
                  <td style={{ ...tdStyle, background: "#f2f4f7", fontWeight: 800, color: NAVY, fontSize: 12.5 }}>Total</td>
                  {COLUMNS.filter((c) => !c.txt).map((c) => (
                    <td key={c.key} style={{ ...tdStyle, background: "#f2f4f7", fontWeight: 700, color: NAVY, fontSize: 12.5, textAlign: "right" }}>
                      {fmtINR(shownTotals[c.key] || 0)}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {!loading && !error && rows.length > 0 && (
          <div style={totalAmountBarStyle}>
            Total Amount:&nbsp;
            <span style={{ color: Number(shownTotals.net_profit) >= 0 ? "#15803d" : "#dc2626" }}>
              {fmtINR(shownTotals.net_profit)}
            </span>
          </div>
        )}
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