import { useState, useRef, useEffect } from "react";
import { ChevronDown, Calendar, FileSpreadsheet, Printer, RefreshCw, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../../services/api";

const FONT = "'Plus Jakarta Sans', sans-serif";
const INDIGO = "#4338ca";
const NAVY = "#1e1b4b";
const GRAY_TEXT = "#64748b";
const LIGHT_BORDER = "#e2e8f0";

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
const fmtQty = (n) =>
  Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

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

// Project default date range for reports: 1st of current month → today.
function defaultRange() {
  const t = new Date();
  return { from: new Date(t.getFullYear(), t.getMonth(), 1), to: new Date(t.getFullYear(), t.getMonth(), t.getDate()) };
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
    `<html><head><title>${title || "Stock Detail"}</title>
     <style>
       *{box-sizing:border-box;}
       body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:22px;color:#1e1b4b;}
       h2{margin:0 0 4px;font-size:17px;}
       .meta{color:#64748b;font-size:11.5px;margin-bottom:16px;}
       table{width:100%;border-collapse:collapse;font-size:10.5px;}
       th,td{border:1px solid #dbe2ec;padding:6px 7px;text-align:left;vertical-align:middle;}
       th{background:#f2f4f7;color:#334155;white-space:normal;line-height:1.25;}
       td.r,th.r{text-align:right;}
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

const COLUMNS = [
  { key: "item_name", label: "Item Name", qty: false, money: false },
  { key: "beginning_qty", label: "Beginning Quantity", qty: true, money: false },
  { key: "quantity_in", label: "Quantity In", qty: true, money: false },
  { key: "purchase_amount", label: "Purchase Amount", qty: false, money: true },
  { key: "quantity_out", label: "Quantity Out", qty: true, money: false },
  { key: "sale_amount", label: "Sale Amount", qty: false, money: true },
  { key: "closing_qty", label: "Closing Quantity", qty: true, money: false },
];

const TABLE_MIN_WIDTH = 820;

/* ── Main Component ─────────────────────────────────────────────────── */
export default function StockDetail() {
  const { adminId } = getAuth();

  const [{ from: startDate, to: endDate }, setRange] = useState(defaultRange);
  const [companyId, setCompanyId] = useState(null);
  const [companyName, setCompanyName] = useState("My Company");

  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(0);
  const [catOpen, setCatOpen] = useState(false);

  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const catRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (catRef.current && !catRef.current.contains(e.target)) setCatOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Resolve the firm silently (saved / single company), no visible firm control.
  useEffect(() => {
    if (!adminId) return;
    api
      .get(`/company/get_companies_by_admin?admin_id=${adminId}`)
      .then((res) => {
        if (!res.data?.status) return;
        const list = res.data.data || [];
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

  // All Categories dropdown — real categories from the DB/API.
  useEffect(() => {
    if (companyId === null) return;
    api
      .get(`/category/get_all`, { params: { company_id: companyId } })
      .then((res) => {
        if (res.data?.status) setCategories(res.data.data || []);
      })
      .catch(() => {});
  }, [companyId]);

  // Fetch the report on any filter change.
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
        category_id: categoryId,
      };
      api
        .get("/report/stock-detail", { params })
        .then((res) => {
          if (res.data?.status) {
            setRows(res.data.data || []);
            setTotals(res.data.totals || {});
          } else {
            setError(res.data?.message || "Failed to load report.");
          }
        })
        .catch(() => setError("Failed to load report."))
        .finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(t);
  }, [companyId, adminId, startDate, endDate, categoryId, reloadKey]);

  const selectedCategory = categories.find((c) => Number(c.id) === Number(categoryId));
  const prettyFrom = startDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const prettyTo = endDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  /* ── Excel export (only the 7 report columns) ── */
  const handleExcel = () => {
    try {
      const sheetData = [
        ["Stock Detail"],
        [`From: ${prettyFrom}  |  To: ${prettyTo}  |  Category: ${selectedCategory?.name || "All Categories"}`],
        [],
        COLUMNS.map((c) => c.label),
      ];
      rows.forEach((r) => {
        sheetData.push(
          COLUMNS.map((c) =>
            c.key === "item_name" ? r[c.key] || "-" : c.money ? fmtINR(r[c.key]) : fmtQty(r[c.key])
          )
        );
      });
      sheetData.push(
        COLUMNS.map((c) =>
          c.key === "item_name" ? "Total" : c.money ? fmtINR(totals[c.key]) : fmtQty(totals[c.key])
        )
      );
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws["!cols"] = COLUMNS.map((c) => ({ wch: c.key === "item_name" ? 30 : 16 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Stock Detail");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array", bookSST: false });
      saveAs(
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `Stock_Detail_${formatDateISO(startDate)}_to_${formatDateISO(endDate)}.xlsx`
      );
    } catch {
      setError("Excel export failed. Please try again.");
    }
  };

  /* ── Print ── */
  const handlePrint = () => {
    const th = COLUMNS.map((c) => `<th class="${c.qty || c.money ? "r" : ""}">${c.label}</th>`).join("");
    const buildRow = (r) => {
      const cells = COLUMNS.map((c) => {
        if (c.key === "item_name") return `<td><strong>${r[c.key] || "-"}</strong></td>`;
        const val = c.money ? fmtINR(r[c.key]) : fmtQty(r[c.key]);
        return `<td class="r"><strong>${val}</strong></td>`;
      }).join("");
      return `<tr>${cells}</tr>`;
    };
    const body =
      rows.map((r) => buildRow(r)).join("") +
      (rows.length ? buildRow(totals) : "");

    const el = document.createElement("div");
    el.innerHTML =
      `<h2>Stock Detail</h2>
       <div class="meta">From: ${prettyFrom} &nbsp;|&nbsp; To: ${prettyTo} &nbsp;|&nbsp; Filter by Item Category: ${selectedCategory?.name || "All Categories"} &nbsp;|&nbsp; ${companyName}</div>
       <table>
         <thead><tr>${th}</tr></thead>
         <tbody>${body}</tbody>
       </table>`;
    printElement(el, "Stock Detail");
  };

  return (
    <div style={{ fontFamily: FONT, padding: "2px 0", display: "flex", flexDirection: "column", height: "100%", background: "#fff" }}>
      {/* ═══════════════════════════════════════════════════════════════
          1. TOP BAR — From / To dates, Excel / Print icons
          ═══════════════════════════════════════════════════════════════ */}
      <div style={topBarStyle}>
        <div style={dateFieldStyle}>
          <span style={dateLabelStyle}>From</span>
          <Calendar size={13} style={{ color: "#94a3b8" }} />
          <input
            type="date"
            value={formatDateISO(startDate)}
            onChange={(e) => setRange({ from: parseDateISO(e.target.value), to: endDate })}
            style={compactDateInputStyle}
          />
        </div>
        <div style={dateFieldStyle}>
          <span style={dateLabelStyle}>To</span>
          <Calendar size={13} style={{ color: "#94a3b8" }} />
          <input
            type="date"
            value={formatDateISO(endDate)}
            onChange={(e) => setRange({ from: startDate, to: parseDateISO(e.target.value) })}
            style={compactDateInputStyle}
          />
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", marginLeft: "auto", flexShrink: 0 }}>
          <button onClick={handleExcel} title="Excel Report" style={circleBtnStyle}>
            <FileSpreadsheet size={16} color={INDIGO} />
          </button>
          <button onClick={handlePrint} title="Print" style={circleBtnStyle}>
            <Printer size={16} color={INDIGO} />
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          2. DETAILS — Filter by Item Category
          ═══════════════════════════════════════════════════════════════ */}
      <div style={detailsSectionStyle}>
        <div style={detailsTitleStyle}>Details</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
          <span style={filtersLabelStyle}>Filter by Item Category</span>
          <div ref={catRef} style={{ position: "relative", flexShrink: 0 }}>
            <button onClick={() => setCatOpen((v) => !v)} style={compactSelectBtnStyle}>
              <span style={{ fontWeight: 600, color: NAVY, fontSize: 12.5 }}>
                {selectedCategory?.name || "All Categories"}
              </span>
              <ChevronDown size={14} style={{ color: "#94a3b8", transform: catOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
            </button>
            {catOpen && (
              <div style={dropdownPanelStyle}>
                <button
                  onClick={() => { setCategoryId(0); setCatOpen(false); }}
                  style={{
                    ...dropdownItemStyle,
                    background: Number(categoryId) === 0 ? "#eef2ff" : "transparent",
                    color: Number(categoryId) === 0 ? INDIGO : "#334155",
                    fontWeight: Number(categoryId) === 0 ? 700 : 500,
                  }}
                >
                  All Categories
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setCategoryId(Number(c.id)); setCatOpen(false); }}
                    style={{
                      ...dropdownItemStyle,
                      background: Number(c.id) === Number(categoryId) ? "#eef2ff" : "transparent",
                      color: Number(c.id) === Number(categoryId) ? INDIGO : "#334155",
                      fontWeight: Number(c.id) === Number(categoryId) ? 700 : 500,
                    }}
                  >
                    {c.name || "Category"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          3. REPORT TABLE — one table, exactly 7 columns
          ═══════════════════════════════════════════════════════════════ */}
      <div style={tableContainerStyle}>
        <div style={{ overflowX: "auto", flex: 1, padding: "0 14px" }}>
          <table style={{ ...tableStyle, minWidth: TABLE_MIN_WIDTH }}>
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th key={c.key} style={{ ...thStyle, textAlign: c.qty || c.money ? "right" : "left" }}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={COLUMNS.length} style={emptyCellStyle}>
                    <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Loading...</div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={COLUMNS.length} style={emptyCellStyle}>
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
                  <td colSpan={COLUMNS.length} style={emptyCellStyle}>
                    <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No stock details found</div>
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${LIGHT_BORDER}` }}>
                    <td style={{ ...tdStyle, fontSize: 14, fontWeight: 600, color: NAVY }}>{r.item_name || "-"}</td>
                    {COLUMNS.slice(1).map((c) => (
                      <td key={c.key} style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: c.money ? "#334155" : "#475569" }}>
                        {c.money ? fmtINR(r[c.key]) : fmtQty(r[c.key])}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
            {!loading && !error && rows.length > 0 && (
              <tfoot>
                <tr>
                  {COLUMNS.map((c) => (
                    <td key={c.key} style={{ ...tdStyle, background: "#f2f4f7", fontWeight: 800, color: NAVY, fontSize: 14, textAlign: c.qty || c.money ? "right" : "left" }}>
                      {c.key === "item_name" ? "Total" : c.money ? fmtINR(totals[c.key]) : fmtQty(totals[c.key])}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   STYLES — compact accounting-report look (Vyapar style)
   ═════════════════════════════════════════════════════════════════════ */

const topBarStyle = {
  display: "flex",
  gap: 16,
  alignItems: "center",
  flexWrap: "wrap",
  padding: "8px 0",
  borderBottom: `1px solid ${LIGHT_BORDER}`,
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

const compactDateInputStyle = {
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 6,
  padding: "4px 6px",
  fontSize: 12,
  fontFamily: FONT,
  color: "#334155",
  background: "#fff",
  outline: "none",
  width: 122,
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
  fontSize: 11.5,
  fontWeight: 600,
  color: "#334155",
  whiteSpace: "nowrap",
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

const dropdownPanelStyle = {
  position: "absolute",
  top: "calc(100% + 5px)",
  left: 0,
  minWidth: 170,
  maxHeight: 280,
  overflowY: "auto",
  zIndex: 60,
  background: "#fff",
  border: `1.5px solid #e0e7ff`,
  borderRadius: 8,
  boxShadow: "0 12px 32px rgba(30,27,75,.12)",
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

const tableContainerStyle = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  marginTop: 8,
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
  fontSize: 12.5,
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
  fontSize: 14,
  color: "#334155",
  verticalAlign: "middle",
};