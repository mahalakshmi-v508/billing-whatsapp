import { useState, useRef, useEffect } from "react";
import { ChevronDown, FileSpreadsheet, Printer, RefreshCw, AlertCircle } from "lucide-react";
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
    `<html><head><title>${title || "Low Stock Summary"}</title>
     <style>
       *{box-sizing:border-box;}
       body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:22px;color:#1e1b4b;}
       h2{margin:0 0 4px;font-size:17px;}
       .meta{color:#64748b;font-size:11.5px;margin-bottom:16px;}
       .summary{margin-top:10px;text-align:right;font-size:12px;font-weight:700;color:#1e1b4b;}
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
  { key: "item_name", label: "Item Name", right: false },
  { key: "minimum_stock_qty", label: "Minimum Stock Qty", right: true },
  { key: "stock_qty", label: "Stock Qty", right: true },
  { key: "stock_value", label: "Stock Value", right: true },
];

const TABLE_MIN_WIDTH = 520;

/* ── Main Component ─────────────────────────────────────────────────── */
export default function LowStockSummary() {
  const { adminId } = getAuth();

  const [companyId, setCompanyId] = useState(null);
  const [companyName, setCompanyName] = useState("My Company");

  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(0);
  const [showInStock, setShowInStock] = useState(false);
  const [catOpen, setCatOpen] = useState(false);

  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ stock_qty: 0, stock_value: 0 });
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
        category_id: categoryId,
        show_in_stock: showInStock,
      };
      api
        .get("/report/low-stock-summary", { params })
        .then((res) => {
          if (res.data?.status) {
            setRows(res.data.data || []);
            setTotals(res.data.totals || { stock_qty: 0, stock_value: 0 });
          } else {
            setError(res.data?.message || "Failed to load report.");
          }
        })
        .catch(() => setError("Failed to load report."))
        .finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(t);
  }, [companyId, adminId, categoryId, showInStock, reloadKey]);

  const selectedCategory = categories.find((c) => Number(c.id) === Number(categoryId));

  /* ── Excel export (only the 4 report columns) ── */
  const handleExcel = () => {
    try {
      const metaLabel = `Category: ${selectedCategory?.name || "All Categories"} | Show items in stock: ${showInStock ? "Yes" : "No"}`;
      const sheetData = [
        ["Low Stock Summary"],
        [metaLabel],
        [],
        COLUMNS.map((c) => c.label),
      ];
      rows.forEach((r) => {
        sheetData.push([
          r.item_name,
          fmtQty(r.minimum_stock_qty),
          fmtQty(r.stock_qty),
          fmtINR(r.stock_value),
        ]);
      });
      sheetData.push(["Total", "", fmtQty(totals.stock_qty), fmtINR(totals.stock_value)]);
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws["!cols"] = COLUMNS.map((c) => ({ wch: c.right ? 16 : 28 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Low Stock Summary");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array", bookSST: false });
      saveAs(
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        "Low_Stock_Summary.xlsx"
      );
    } catch {
      setError("Excel export failed. Please try again.");
    }
  };

  /* ── Print ── */
  const handlePrint = () => {
    const th = COLUMNS.map((c) => `<th class="${c.right ? "r" : ""}">${c.label}</th>`).join("");
    const buildRow = (r) => {
      const cells = COLUMNS.map((c) => {
        if (c.key === "item_name") return `<td><strong>${r.item_name || "-"}</strong></td>`;
        if (c.key === "stock_value") return `<td class="r"><strong>${fmtINR(r.stock_value)}</strong></td>`;
        return `<td class="r"><strong>${fmtQty(r[c.key] || 0)}</strong></td>`;
      }).join("");
      return `<tr>${cells}</tr>`;
    };
    const body =
      rows.map((r) => buildRow(r)).join("") +
      (rows.length
        ? buildRow(
            {
              item_name: "Total",
              minimum_stock_qty: "",
              stock_qty: totals.stock_qty,
              stock_value: totals.stock_value,
            }
          )
        : "");

    const metaLabel = `Category: ${selectedCategory?.name || "All Categories"} | Show items in stock: ${showInStock ? "Yes" : "No"} | ${companyName}`;
    const el = document.createElement("div");
    el.innerHTML =
      `<h2>Low Stock Summary</h2>
       <div class="meta">${metaLabel}</div>
       <table>
         <thead><tr>${th}</tr></thead>
         <tbody>${body}</tbody>
       </table>
       <div class="summary">Total Amount: <span>${fmtINR(totals.stock_value)}</span></div>`;
    printElement(el, "Low Stock Summary");
  };

  return (
    <div style={{ fontFamily: FONT, padding: "2px 0", display: "flex", flexDirection: "column", height: "100%", background: "#fff" }}>
      {/* ═══════════════════════════════════════════════════════════════
          1. TOP BAR — FILTERS, All Categories, Show items in stock, icons
          ═══════════════════════════════════════════════════════════════ */}
      <div style={topBarStyle}>
        <span style={filtersLabelStyle}>Filters</span>

        {/* All Categories dropdown */}
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

        {/* Show items in stock */}
        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            checked={showInStock}
            onChange={(e) => setShowInStock(e.target.checked)}
            style={{ width: 15, height: 15, accentColor: INDIGO, cursor: "pointer", margin: 0 }}
          />
          <span>Show items in stock</span>
        </label>

        {/* Right: Excel / Print icons */}
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
          2. REPORT TABLE — one table, exactly 4 columns
          ═══════════════════════════════════════════════════════════════ */}
      <div style={tableContainerStyle}>
        <div style={{ overflowX: "auto", flex: 1 }}>
          <table style={{ ...tableStyle, minWidth: TABLE_MIN_WIDTH }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 38, minWidth: 38 }}>#</th>
                {COLUMNS.map((c) => (
                  <th key={c.key} style={{ ...thStyle, textAlign: c.right ? "right" : "left" }}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={emptyCellStyle}>
                    <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Loading...</div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} style={emptyCellStyle}>
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
                  <td colSpan={5} style={emptyCellStyle}>
                    <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No low stock items found</div>
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${LIGHT_BORDER}` }}>
                    <td style={{ ...tdStyle, textAlign: "center", color: GRAY_TEXT }}>{i + 1}</td>
                    <td style={{ ...tdStyle, fontSize: 12.5, fontWeight: 600, color: NAVY }}>{r.item_name || "-"}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "#334155" }}>
                      {fmtQty(r.minimum_stock_qty)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "#334155" }}>
                      {fmtQty(r.stock_qty)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "#334155" }}>
                      {fmtINR(r.stock_value)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && !error && rows.length > 0 && (
              <tfoot>
                <tr>
                  <td style={{ ...tdStyle, background: "#f2f4f7", fontWeight: 700, color: NAVY, fontSize: 12.5, textAlign: "center" }}></td>
                  <td style={{ ...tdStyle, background: "#f2f4f7", fontWeight: 800, color: NAVY, fontSize: 12.5 }}>Total</td>
                  <td style={{ ...tdStyle, background: "#f2f4f7", fontWeight: 700, color: NAVY, fontSize: 12.5, textAlign: "right" }}></td>
                  <td style={{ ...tdStyle, background: "#f2f4f7", fontWeight: 700, color: NAVY, fontSize: 12.5, textAlign: "right" }}>
                    {fmtQty(totals.stock_qty)}
                  </td>
                  <td style={{ ...tdStyle, background: "#f2f4f7", fontWeight: 700, color: NAVY, fontSize: 12.5, textAlign: "right" }}>
                    {fmtINR(totals.stock_value)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {!loading && !error && rows.length > 0 && (
          <div style={totalAmountBarStyle}>
            Total Amount:&nbsp;<span style={{ color: INDIGO }}>{fmtINR(totals.stock_value)}</span>
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

const filtersLabelStyle = {
  fontSize: 10.5,
  fontWeight: 700,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  minWidth: 44,
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