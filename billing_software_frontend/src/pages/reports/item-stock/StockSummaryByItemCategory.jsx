import { useEffect, useState } from "react";
import { AlertCircle, FileSpreadsheet, Printer, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../../services/api";

const FONT = "'Plus Jakarta Sans', sans-serif";
const INDIGO = "#4338ca";
const NAVY = "#1e1b4b";
const LIGHT_BORDER = "#e2e8f0";

const COLUMNS = [
  { key: "item_category", label: "Item Category", right: false },
  { key: "stock_quantity", label: "Stock Quantity", right: true },
  { key: "stock_value", label: "Stock Value", right: true },
];

function getAuth() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return { adminId: user?.role === "admin" ? user?.id : user?.admin_id || null };
  } catch {
    return { adminId: null };
  }
}

function formatQuantity(value) {
  return Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function printElement(element) {
  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, { position: "fixed", width: 0, height: 0, border: 0, visibility: "hidden" });
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`<html><head><title>STOCK SUMMARY BY ITEM CATEGORY</title><style>
    *{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:0;padding:22px;color:#1e1b4b}
    h2{margin:0 0 16px;font-size:17px}table{width:100%;border-collapse:collapse;font-size:11px}
    th,td{border:1px solid #dbe2ec;padding:7px 8px;text-align:left}th{background:#f2f4f7;color:#334155}
    td.r,th.r{text-align:right}tfoot td{background:#f2f4f7;font-weight:700;border-top:2px solid #94a3b8}
  </style></head><body>${element.innerHTML}</body></html>`);
  doc.close();
  const win = iframe.contentWindow;
  const print = () => { try { win.focus(); win.print(); } finally { setTimeout(() => iframe.remove(), 1500); } };
  if (doc.readyState === "complete") print();
  else win.addEventListener("load", print);
}

export default function StockSummaryByItemCategory() {
  const { adminId } = getAuth();
  const [companyId, setCompanyId] = useState(Number(localStorage.getItem("selected_company_id") || 0) || null);
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ stock_quantity: 0, stock_value: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!adminId) return;
    api.get(`/company/get_companies_by_admin?admin_id=${adminId}`).then((res) => {
      const list = res.data?.status ? res.data.data || [] : [];
      const saved = localStorage.getItem("selected_company_id");
      const chosen = list.find((company) => String(company.id) === String(saved)) || list[0];
      if (chosen) setCompanyId(Number(chosen.id));
    }).catch(() => setError("Failed to load company."));
  }, [adminId]);

  useEffect(() => {
    if (!companyId) return undefined;
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      api.get("/report/stock-summary-by-item-category", { params: { company_id: companyId, admin_id: adminId || 0 } }).then((res) => {
        if (!active) return;
        if (res.data?.status) {
          setRows(res.data.data || []);
          setTotals(res.data.totals || { stock_quantity: 0, stock_value: 0 });
        } else {
          setError(res.data?.message || "Failed to load report.");
        }
      }).catch(() => {
        if (active) setError("Failed to load report.");
      }).finally(() => {
        if (active) setLoading(false);
      });
    }, 0);
    return () => { active = false; clearTimeout(timer); };
  }, [companyId, adminId, reloadKey]);

  const handleExcel = () => {
    const sheetData = [
      ["STOCK SUMMARY BY ITEM CATEGORY"],
      [],
      COLUMNS.map((column) => column.label),
      ...rows.map((row) => [row.item_category, row.stock_quantity || 0, row.stock_value || 0]),
      ["Total", totals.stock_quantity || 0, totals.stock_value || 0],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    worksheet["!cols"] = [{ wch: 28 }, { wch: 18 }, { wch: 18 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Summary");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "Stock_Summary_By_Item_Category.xlsx");
  };

  const handlePrint = () => {
    const body = rows.map((row) => `<tr><td>${row.item_category || "Uncategorized"}</td><td class="r">${formatQuantity(row.stock_quantity)}</td><td class="r">${formatCurrency(row.stock_value)}</td></tr>`).join("");
    const element = document.createElement("div");
    element.innerHTML = `<h2>STOCK SUMMARY BY ITEM CATEGORY</h2><table><thead><tr>${COLUMNS.map((column) => `<th class="${column.right ? "r" : ""}">${column.label}</th>`).join("")}</tr></thead><tbody>${body}</tbody><tfoot><tr><td>Total</td><td class="r">${formatQuantity(totals.stock_quantity)}</td><td class="r">${formatCurrency(totals.stock_value)}</td></tr></tfoot></table>`;
    printElement(element);
  };

  return (
    <div style={pageStyle}>
      <div style={topBarStyle}>
        <div style={actionsStyle}>
          <button onClick={handleExcel} title="Excel Report" style={circleButtonStyle}><FileSpreadsheet size={16} color={INDIGO} /></button>
          <button onClick={handlePrint} title="Print" style={circleButtonStyle}><Printer size={16} color={INDIGO} /></button>
        </div>
      </div>
      <div style={reportHeadingStyle}>STOCK SUMMARY BY ITEM CATEGORY</div>
      <div style={tableContainerStyle}>
        <div style={tableScrollStyle}>
          <table style={tableStyle}>
            <thead><tr>{COLUMNS.map((column) => <th key={column.key} style={{ ...thStyle, textAlign: column.right ? "right" : "left" }}>{column.label}</th>)}</tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={COLUMNS.length} style={emptyCellStyle}>Loading...</td></tr> : error ? <tr><td colSpan={COLUMNS.length} style={emptyCellStyle}><div style={errorStyle}><AlertCircle size={22} color="#dc2626" /><span>{error}</span><button onClick={() => setReloadKey((key) => key + 1)} style={retryStyle}><RefreshCw size={13} /> Retry</button></div></td></tr> : rows.length === 0 ? <tr><td colSpan={COLUMNS.length} style={emptyCellStyle}>No stock data available.</td></tr> : rows.map((row) => <tr key={row.id}><td style={tdStyle}>{row.item_category || "Uncategorized"}</td><td style={{ ...tdStyle, textAlign: "right" }}>{formatQuantity(row.stock_quantity)}</td><td style={{ ...tdStyle, textAlign: "right" }}>{formatCurrency(row.stock_value)}</td></tr>)}
            </tbody>
            {!loading && !error && rows.length > 0 && <tfoot><tr><td style={totalCellStyle}>Total</td><td style={totalNumberStyle}>{formatQuantity(totals.stock_quantity)}</td><td style={totalNumberStyle}>{formatCurrency(totals.stock_value)}</td></tr></tfoot>}
          </table>
        </div>
      </div>
    </div>
  );
}

const pageStyle = { fontFamily: FONT, padding: "2px 0", display: "flex", flexDirection: "column", height: "100%", background: "#fff" };
const topBarStyle = { display: "flex", justifyContent: "flex-end", padding: "8px 0", borderBottom: `1px solid ${LIGHT_BORDER}` };
const actionsStyle = { display: "flex", gap: 10, alignItems: "center", marginRight: 2 };
const circleButtonStyle = { width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", border: `1px solid ${LIGHT_BORDER}`, cursor: "pointer", flexShrink: 0 };
const reportHeadingStyle = { padding: "14px 0 10px", fontSize: 14, fontWeight: 800, color: NAVY, letterSpacing: "0.04em" };
const tableContainerStyle = { flex: 1, display: "flex", flexDirection: "column", marginTop: 2, border: `1px solid ${LIGHT_BORDER}`, borderRadius: 6, overflow: "hidden", background: "#fff", minHeight: 0 };
const tableScrollStyle = { overflowX: "auto", flex: 1, padding: "0 14px" };
const tableStyle = { width: "100%", minWidth: 620, borderCollapse: "collapse", fontFamily: FONT, tableLayout: "fixed" };
const thStyle = { padding: "8px", fontSize: 12.5, fontWeight: 700, color: "#475569", background: "#f2f4f7", borderRight: `1px solid ${LIGHT_BORDER}`, borderBottom: `1px solid ${LIGHT_BORDER}`, whiteSpace: "normal", lineHeight: 1.3, verticalAlign: "middle" };
const tdStyle = { padding: "7px 8px", borderBottom: `1px solid ${LIGHT_BORDER}`, borderRight: `1px solid ${LIGHT_BORDER}`, fontSize: 14, color: NAVY, verticalAlign: "middle" };
const totalCellStyle = { ...tdStyle, background: "#f2f4f7", fontWeight: 800 };
const totalNumberStyle = { ...totalCellStyle, textAlign: "right" };
const emptyCellStyle = { padding: "70px 24px", textAlign: "center", color: "#9ca3af", fontSize: 13 };
const errorStyle = { display: "flex", flexDirection: "column", alignItems: "center", gap: 10 };
const retryStyle = { display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 6, border: `1px solid ${LIGHT_BORDER}`, background: "#fff", color: INDIGO, fontSize: 12.5, fontWeight: 600, fontFamily: FONT, cursor: "pointer" };

