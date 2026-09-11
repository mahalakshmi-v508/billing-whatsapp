import { useEffect, useState } from "react";
import { AlertCircle, Calendar, FileSpreadsheet, Printer, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../../services/api";

const FONT = "'Plus Jakarta Sans', sans-serif";
const INDIGO = "#4338ca";
const NAVY = "#1e1b4b";
const GRAY_TEXT = "#64748b";
const LIGHT_BORDER = "#e2e8f0";

const COLUMNS = [
  { key: "item_category", label: "Item Category", right: false },
  { key: "sale_quantity", label: "Sale Quantity", right: true },
  { key: "total_sale_amount", label: "Total Sale Amount", right: true },
  { key: "purchase_quantity", label: "Purchase Quantity", right: true },
  { key: "total_purchase_amount", label: "Total Purchase Amount", right: true },
];

function getAuth() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return { adminId: user?.role === "admin" ? user?.id : user?.admin_id || null };
  } catch {
    return { adminId: null };
  }
}

function formatDateISO(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateISO(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function defaultRange() {
  const today = new Date();
  return {
    from: new Date(today.getFullYear(), today.getMonth(), 1),
    to: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
  };
}

function formatDisplayDate(value) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
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
  doc.write(`<html><head><title>Sale/Purchase Report By Item Category</title><style>
    *{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:0;padding:22px;color:#1e1b4b}
    h2{margin:0 0 16px;font-size:17px}table{width:100%;border-collapse:collapse;font-size:11px}
    th,td{border:1px solid #dbe2ec;padding:6px 8px;text-align:left}th{background:#f2f4f7;color:#334155}
    td.r,th.r{text-align:right}tfoot td{background:#f2f4f7;font-weight:700;border-top:2px solid #94a3b8}
  </style></head><body>${element.innerHTML}</body></html>`);
  doc.close();
  const win = iframe.contentWindow;
  const print = () => { try { win.focus(); win.print(); } finally { setTimeout(() => iframe.remove(), 1500); } };
  if (doc.readyState === "complete") print();
  else win.addEventListener("load", print);
}

export default function SalePurchaseByItemCategory() {
  const { adminId } = getAuth();
  const initialCompanyId = Number(localStorage.getItem("selected_company_id") || 0) || null;
  const [{ from: startDate, to: endDate }, setRange] = useState(defaultRange);
  const [companyId, setCompanyId] = useState(initialCompanyId);
  const [parties, setParties] = useState([]);
  const [party, setParty] = useState({ id: 0, type: "", label: "All Parties" });
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({});
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
    if (!companyId) return;
    Promise.all([
      api.get("/customer/get_all_customer", { params: { admin_id: adminId || 0 } }),
      api.get("/supplier/get_all", { params: { company_id: companyId } }),
    ]).then(([customerResponse, supplierResponse]) => {
      const customers = customerResponse.data?.status ? customerResponse.data.data || [] : [];
      const suppliers = supplierResponse.data?.status ? supplierResponse.data.data || [] : [];
      setParties([
        ...customers.map((customer) => ({ id: Number(customer.id), type: "customer", label: customer.name || customer.customer_name || "Customer" })),
        ...suppliers.map((supplier) => ({ id: Number(supplier.id), type: "supplier", label: supplier.supplier_name || supplier.name || "Supplier" })),
      ]);
    }).catch(() => setError("Failed to load parties."));
  }, [companyId, adminId]);

  useEffect(() => {
    if (!companyId) return undefined;
    const params = {
      company_id: companyId,
      admin_id: adminId || 0,
      from_date: formatDateISO(startDate),
      to_date: formatDateISO(endDate),
      party_id: party.id,
      party_type: party.type,
    };
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      api.get("/report/sale-purchase-by-item-category", { params }).then((res) => {
        if (!active) return;
        if (res.data?.status) {
          setRows(res.data.data || []);
          setTotals(res.data.totals || {});
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
  }, [companyId, adminId, startDate, endDate, party, reloadKey]);

  const handleExcel = () => {
    const data = [
      ["SALE/PURCHASE REPORT BY ITEM CATEGORY"],
      [`Party: ${party.label} | From: ${formatDisplayDate(formatDateISO(startDate))} | To: ${formatDisplayDate(formatDateISO(endDate))}`],
      [],
      COLUMNS.map((column) => column.label),
      ...rows.map((row) => [row.item_category, row.sale_quantity || 0, row.total_sale_amount || 0, row.purchase_quantity || 0, row.total_purchase_amount || 0]),
      ["Total", totals.sale_quantity || 0, totals.total_sale_amount || 0, totals.purchase_quantity || 0, totals.total_purchase_amount || 0],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    worksheet["!cols"] = [{ wch: 24 }, { wch: 18 }, { wch: 20 }, { wch: 21 }, { wch: 23 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Category Report");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "Sale_Purchase_By_Item_Category.xlsx");
  };

  const handlePrint = () => {
    const body = rows.map((row) => `<tr><td>${row.item_category || "Uncategorized"}</td><td class="r">${formatQuantity(row.sale_quantity)}</td><td class="r">${formatCurrency(row.total_sale_amount)}</td><td class="r">${formatQuantity(row.purchase_quantity)}</td><td class="r">${formatCurrency(row.total_purchase_amount)}</td></tr>`).join("");
    const element = document.createElement("div");
    element.innerHTML = `<h2>SALE/PURCHASE REPORT BY ITEM CATEGORY</h2><table><thead><tr>${COLUMNS.map((column) => `<th class="${column.right ? "r" : ""}">${column.label}</th>`).join("")}</tr></thead><tbody>${body}</tbody><tfoot><tr><td>Total</td><td class="r">${formatQuantity(totals.sale_quantity)}</td><td class="r">${formatCurrency(totals.total_sale_amount)}</td><td class="r">${formatQuantity(totals.purchase_quantity)}</td><td class="r">${formatCurrency(totals.total_purchase_amount)}</td></tr></tfoot></table>`;
    printElement(element);
  };

  return (
    <div style={pageStyle}>
      <div style={topBarStyle}>
        <div style={partyFieldStyle}><span style={labelStyle}>Party name</span><select value={`${party.type}:${party.id}`} onChange={(event) => { const [type, id] = event.target.value.split(":"); const selected = parties.find((option) => option.type === type && String(option.id) === id); setParty(selected || { id: 0, type: "", label: "All Parties" }); }} style={selectStyle}><option value=":0">All Parties</option>{parties.map((option) => <option key={`${option.type}-${option.id}`} value={`${option.type}:${option.id}`}>{option.label}</option>)}</select></div>
        <div style={dateFieldStyle}><span style={labelStyle}>From</span><Calendar size={13} color="#94a3b8" /><input type="date" value={formatDateISO(startDate)} onChange={(event) => setRange({ from: parseDateISO(event.target.value), to: endDate })} style={dateInputStyle} /></div>
        <div style={dateFieldStyle}><span style={labelStyle}>To</span><Calendar size={13} color="#94a3b8" /><input type="date" value={formatDateISO(endDate)} onChange={(event) => setRange({ from: startDate, to: parseDateISO(event.target.value) })} style={dateInputStyle} /></div>
        <div style={actionsStyle}><button onClick={handleExcel} title="Excel Report" style={circleButtonStyle}><FileSpreadsheet size={16} color={INDIGO} /></button><button onClick={handlePrint} title="Print" style={circleButtonStyle}><Printer size={16} color={INDIGO} /></button></div>
      </div>

      <div style={reportHeadingStyle}>SALE/PURCHASE REPORT BY ITEM CATEGORY</div>

      <div style={tableContainerStyle}><div style={tableScrollStyle}><table style={tableStyle}><thead><tr>{COLUMNS.map((column) => <th key={column.key} style={{ ...thStyle, textAlign: column.right ? "right" : "left" }}>{column.label}</th>)}</tr></thead><tbody>
        {loading ? <tr><td colSpan={COLUMNS.length} style={emptyCellStyle}>Loading...</td></tr> : error ? <tr><td colSpan={COLUMNS.length} style={emptyCellStyle}><div style={errorStyle}><AlertCircle size={22} color="#dc2626" /><span>{error}</span><button onClick={() => setReloadKey((key) => key + 1)} style={retryStyle}><RefreshCw size={13} /> Retry</button></div></td></tr> : rows.length === 0 ? <tr><td colSpan={COLUMNS.length} style={emptyCellStyle}>No data available for the selected filters.</td></tr> : rows.map((row) => <tr key={row.id}><td style={tdStyle}>{row.item_category || "Uncategorized"}</td><td style={{ ...tdStyle, textAlign: "right" }}>{formatQuantity(row.sale_quantity)}</td><td style={{ ...tdStyle, textAlign: "right" }}>{formatCurrency(row.total_sale_amount)}</td><td style={{ ...tdStyle, textAlign: "right" }}>{formatQuantity(row.purchase_quantity)}</td><td style={{ ...tdStyle, textAlign: "right" }}>{formatCurrency(row.total_purchase_amount)}</td></tr>)}
      </tbody>{!loading && !error && rows.length > 0 && <tfoot><tr><td style={totalCellStyle}>Total</td><td style={totalNumberStyle}>{formatQuantity(totals.sale_quantity)}</td><td style={totalNumberStyle}>{formatCurrency(totals.total_sale_amount)}</td><td style={totalNumberStyle}>{formatQuantity(totals.purchase_quantity)}</td><td style={totalNumberStyle}>{formatCurrency(totals.total_purchase_amount)}</td></tr></tfoot>}</table></div></div>
    </div>
  );
}

const pageStyle = { fontFamily: FONT, padding: "2px 0", display: "flex", flexDirection: "column", height: "100%", background: "#fff" };
const topBarStyle = { display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", padding: "8px 0", borderBottom: `1px solid ${LIGHT_BORDER}` };
const partyFieldStyle = { display: "flex", alignItems: "center", gap: 7, minWidth: 220 };
const dateFieldStyle = { display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" };
const labelStyle = { fontSize: 11, color: GRAY_TEXT, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" };
const selectStyle = { width: 150, border: `1px solid ${LIGHT_BORDER}`, borderRadius: 6, padding: "5px 8px", fontSize: 12, fontFamily: FONT, color: NAVY, background: "#fff", outline: "none" };
const dateInputStyle = { border: `1px solid ${LIGHT_BORDER}`, borderRadius: 6, padding: "4px 6px", fontSize: 12, fontFamily: FONT, color: "#334155", background: "#fff", outline: "none", width: 122 };
const actionsStyle = { display: "flex", gap: 10, alignItems: "center", marginLeft: "auto", flexShrink: 0 };
const circleButtonStyle = { width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", border: `1px solid ${LIGHT_BORDER}`, cursor: "pointer", flexShrink: 0 };
const reportHeadingStyle = { padding: "14px 0 10px", fontSize: 14, fontWeight: 800, color: NAVY, letterSpacing: "0.04em" };
const tableContainerStyle = { flex: 1, display: "flex", flexDirection: "column", marginTop: 2, border: `1px solid ${LIGHT_BORDER}`, borderRadius: 6, overflow: "hidden", background: "#fff", minHeight: 0 };
const tableScrollStyle = { overflowX: "auto", flex: 1, padding: "0 14px" };
const tableStyle = { width: "100%", minWidth: 820, borderCollapse: "collapse", fontFamily: FONT, tableLayout: "fixed" };
const thStyle = { padding: "8px", fontSize: 12.5, fontWeight: 700, color: "#475569", background: "#f2f4f7", borderRight: `1px solid ${LIGHT_BORDER}`, borderBottom: `1px solid ${LIGHT_BORDER}`, whiteSpace: "normal", lineHeight: 1.3, verticalAlign: "middle" };
const tdStyle = { padding: "7px 8px", borderBottom: `1px solid ${LIGHT_BORDER}`, borderRight: `1px solid ${LIGHT_BORDER}`, fontSize: 14, color: NAVY, verticalAlign: "middle" };
const totalCellStyle = { ...tdStyle, background: "#f2f4f7", fontWeight: 800 };
const totalNumberStyle = { ...totalCellStyle, textAlign: "right" };
const emptyCellStyle = { padding: "70px 24px", textAlign: "center", color: "#9ca3af", fontSize: 13 };
const errorStyle = { display: "flex", flexDirection: "column", alignItems: "center", gap: 10 };
const retryStyle = { display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 6, border: `1px solid ${LIGHT_BORDER}`, background: "#fff", color: INDIGO, fontSize: 12.5, fontWeight: 600, fontFamily: FONT, cursor: "pointer" };

