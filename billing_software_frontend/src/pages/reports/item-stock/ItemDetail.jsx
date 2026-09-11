import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Calendar, ChevronDown, FileSpreadsheet, Printer, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../../services/api";

const FONT = "'Plus Jakarta Sans', sans-serif";
const INDIGO = "#4338ca";
const NAVY = "#1e1b4b";
const GRAY_TEXT = "#64748b";
const LIGHT_BORDER = "#e2e8f0";

const COLUMNS = [
  { key: "date", label: "Date", right: false },
  { key: "sale_quantity", label: "Sale Quantity", right: true },
  { key: "purchase_quantity", label: "Purchase Quantity", right: true },
  { key: "adjustment_quantity", label: "Adjustment Quantity", right: true },
  { key: "closing_quantity", label: "Closing Quantity", right: true },
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

function printElement(element) {
  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, { position: "fixed", width: 0, height: 0, border: 0, visibility: "hidden" });
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`<html><head><title>Item Detail</title><style>
    *{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:0;padding:22px;color:#1e1b4b}
    h2{margin:0 0 4px;font-size:17px}.meta{color:#64748b;font-size:11.5px;margin-bottom:16px}
    table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #dbe2ec;padding:6px 8px;text-align:left}
    th{background:#f2f4f7;color:#334155}td.r,th.r{text-align:right}
  </style></head><body>${element.innerHTML}</body></html>`);
  doc.close();
  const win = iframe.contentWindow;
  const print = () => { try { win.focus(); win.print(); } finally { setTimeout(() => iframe.remove(), 1500); } };
  if (doc.readyState === "complete") print();
  else win.addEventListener("load", print);
}

export default function ItemDetail() {
  const { adminId } = getAuth();
  const initialCompanyId = Number(localStorage.getItem("selected_company_id") || 0) || null;
  const [{ from: startDate, to: endDate }, setRange] = useState(defaultRange);
  const [companyId, setCompanyId] = useState(initialCompanyId);
  const [items, setItems] = useState([]);
  const [itemId, setItemId] = useState(null);
  const [itemQuery, setItemQuery] = useState("");
  const [itemOpen, setItemOpen] = useState(false);
  const [hideInactive, setHideInactive] = useState(true);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const itemRef = useRef(null);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (itemRef.current && !itemRef.current.contains(event.target)) setItemOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  useEffect(() => {
    if (!adminId) return;
    api.get(`/company/get_companies_by_admin?admin_id=${adminId}`).then((res) => {
      const list = res.data?.status ? res.data.data || [] : [];
      const savedId = localStorage.getItem("selected_company_id");
      const chosen = list.find((company) => String(company.id) === String(savedId)) || list[0];
      if (chosen) setCompanyId(Number(chosen.id));
    }).catch(() => setError("Failed to load company."));
  }, [adminId]);

  useEffect(() => {
    if (!companyId) return;
    api.get("/product/get", { params: { company_id: companyId, admin_id: adminId || 0 } }).then((res) => {
      const list = res.data?.status ? res.data.data || [] : [];
      setItems(list);
      setItemId((current) => current && list.some((item) => Number(item.id) === Number(current)) ? current : Number(list[0]?.id) || null);
      setItemQuery((current) => current || list[0]?.product_name || "");
    }).catch(() => setError("Failed to load items."));
  }, [companyId, adminId]);

  const selectedItem = items.find((item) => Number(item.id) === Number(itemId));
  const filteredItems = useMemo(() => {
    const query = itemQuery.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => String(item.product_name || "").toLowerCase().includes(query));
  }, [items, itemQuery]);

  useEffect(() => {
    if (!companyId || !itemId) {
      return undefined;
    }
    const params = {
      company_id: companyId,
      admin_id: adminId || 0,
      item_id: itemId,
      from_date: formatDateISO(startDate),
      to_date: formatDateISO(endDate),
      hide_inactive_dates: hideInactive,
    };
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      api.get("/report/item-detail", { params }).then((res) => {
        if (!active) return;
        if (res.data?.status) setRows(res.data.data || []);
        else setError(res.data?.message || "Failed to load item details.");
      }).catch(() => {
        if (active) setError("Failed to load item details.");
      }).finally(() => {
        if (active) setLoading(false);
      });
    }, 0);
    return () => { active = false; clearTimeout(timer); };
  }, [companyId, adminId, itemId, startDate, endDate, hideInactive, reloadKey]);

  const selectItem = (item) => {
    setItemId(Number(item.id));
    setItemQuery(item.product_name || "");
    setItemOpen(false);
  };

  const visibleRows = companyId && itemId ? rows : [];

  const handleExcel = () => {
    const sheetData = [
      ["Item Detail"],
      [`Item: ${selectedItem?.product_name || "-"} | From: ${formatDisplayDate(formatDateISO(startDate))} | To: ${formatDisplayDate(formatDateISO(endDate))}`],
      [],
      COLUMNS.map((column) => column.label),
      ...visibleRows.map((row) => [
        formatDisplayDate(row.date),
        row.sale_quantity || 0,
        row.purchase_label || row.purchase_quantity || 0,
        row.adjustment_quantity || 0,
        row.closing_quantity || 0,
      ]),
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    worksheet["!cols"] = [{ wch: 16 }, { wch: 18 }, { wch: 20 }, { wch: 22 }, { wch: 18 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Item Detail");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "Item_Detail.xlsx");
  };

  const handlePrint = () => {
    const tableRows = visibleRows.map((row) => `<tr>
      <td>${formatDisplayDate(row.date)}</td><td class="r">${formatQuantity(row.sale_quantity)}</td>
      <td class="r">${row.purchase_label || formatQuantity(row.purchase_quantity)}</td>
      <td class="r">${formatQuantity(row.adjustment_quantity)}</td><td class="r">${formatQuantity(row.closing_quantity)}</td>
    </tr>`).join("");
    const element = document.createElement("div");
    element.innerHTML = `<h2>Item Detail</h2><div class="meta">Item: ${selectedItem?.product_name || "-"} | From: ${formatDisplayDate(formatDateISO(startDate))} | To: ${formatDisplayDate(formatDateISO(endDate))}</div><table><thead><tr>${COLUMNS.map((column) => `<th class="${column.right ? "r" : ""}">${column.label}</th>`).join("")}</tr></thead><tbody>${tableRows}</tbody></table>`;
    printElement(element);
  };

  return (
    <div style={pageStyle}>
      <div style={topBarStyle}>
        <div style={dateFieldStyle}><span style={dateLabelStyle}>From</span><Calendar size={13} color="#94a3b8" /><input type="date" value={formatDateISO(startDate)} onChange={(event) => setRange({ from: parseDateISO(event.target.value), to: endDate })} style={dateInputStyle} /></div>
        <div style={dateFieldStyle}><span style={dateLabelStyle}>To</span><Calendar size={13} color="#94a3b8" /><input type="date" value={formatDateISO(endDate)} onChange={(event) => setRange({ from: startDate, to: parseDateISO(event.target.value) })} style={dateInputStyle} /></div>
        <div style={actionsStyle}>
          <button onClick={handleExcel} title="Excel Report" style={circleButtonStyle}><FileSpreadsheet size={16} color={INDIGO} /></button>
          <button onClick={handlePrint} title="Print" style={circleButtonStyle}><Printer size={16} color={INDIGO} /></button>
        </div>
      </div>

      <div style={detailsStyle}>
        <div style={detailsTitleStyle}>Details</div>
        <div style={filtersStyle}>
          <span style={filterLabelStyle}>Item name</span>
          <div ref={itemRef} style={itemPickerStyle}>
            <input value={itemQuery} placeholder="Select item" onFocus={() => setItemOpen(true)} onChange={(event) => { setItemQuery(event.target.value); setItemOpen(true); }} style={itemInputStyle} />
            <ChevronDown size={14} color="#94a3b8" style={itemChevronStyle} />
            {itemOpen && <div style={itemMenuStyle}>{filteredItems.length ? filteredItems.map((item) => <button key={item.id} onClick={() => selectItem(item)} style={itemOptionStyle}>{item.product_name || "Unnamed item"}</button>) : <div style={noItemsStyle}>No items found</div>}</div>}
          </div>
          <label style={checkboxLabelStyle}><input type="checkbox" checked={hideInactive} onChange={(event) => setHideInactive(event.target.checked)} /> Hide inactive dates</label>
        </div>
      </div>

      <div style={tableContainerStyle}>
        <div style={tableScrollStyle}>
          <table style={tableStyle}>
            <thead><tr>{COLUMNS.map((column) => <th key={column.key} style={{ ...thStyle, textAlign: column.right ? "right" : "left" }}>{column.label}</th>)}</tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={COLUMNS.length} style={emptyCellStyle}>Loading...</td></tr> : error ? <tr><td colSpan={COLUMNS.length} style={emptyCellStyle}><div style={errorStyle}><AlertCircle size={22} color="#dc2626" /><span>{error}</span><button onClick={() => setReloadKey((key) => key + 1)} style={retryStyle}><RefreshCw size={13} /> Retry</button></div></td></tr> : visibleRows.length === 0 ? <tr><td colSpan={COLUMNS.length} style={emptyCellStyle}>No item details found for the selected period.</td></tr> : visibleRows.map((row, index) => <tr key={`${row.date}-${row.is_beginning ? "opening" : index}`}><td style={tdStyle}>{formatDisplayDate(row.date)}</td><td style={{ ...tdStyle, textAlign: "right" }}>{formatQuantity(row.sale_quantity)}</td><td style={{ ...tdStyle, textAlign: "right" }}>{row.purchase_label || formatQuantity(row.purchase_quantity)}</td><td style={{ ...tdStyle, textAlign: "right" }}>{formatQuantity(row.adjustment_quantity)}</td><td style={{ ...tdStyle, textAlign: "right" }}>{formatQuantity(row.closing_quantity)}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const pageStyle = { fontFamily: FONT, padding: "2px 0", display: "flex", flexDirection: "column", height: "100%", background: "#fff" };
const topBarStyle = { display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", padding: "8px 0", borderBottom: `1px solid ${LIGHT_BORDER}` };
const dateFieldStyle = { display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" };
const dateLabelStyle = { fontSize: 11, color: GRAY_TEXT, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" };
const dateInputStyle = { border: `1px solid ${LIGHT_BORDER}`, borderRadius: 6, padding: "4px 6px", fontSize: 12, fontFamily: FONT, color: "#334155", background: "#fff", outline: "none", width: 122 };
const actionsStyle = { display: "flex", gap: 10, alignItems: "center", marginLeft: "auto", flexShrink: 0 };
const circleButtonStyle = { width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", border: `1px solid ${LIGHT_BORDER}`, cursor: "pointer", flexShrink: 0 };
const detailsStyle = { padding: "10px 0", borderBottom: `1px solid ${LIGHT_BORDER}`, marginBottom: 10 };
const detailsTitleStyle = { fontSize: 14, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" };
const filtersStyle = { display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" };
const filterLabelStyle = { fontSize: 12.5, fontWeight: 600, color: "#334155", whiteSpace: "nowrap" };
const itemPickerStyle = { position: "relative", width: 260, flexShrink: 0 };
const itemInputStyle = { width: "100%", padding: "7px 30px 7px 10px", border: `1px solid ${LIGHT_BORDER}`, borderRadius: 6, fontFamily: FONT, fontSize: 13, color: NAVY, outline: "none", background: "#fff" };
const itemChevronStyle = { position: "absolute", right: 9, top: 9, pointerEvents: "none" };
const itemMenuStyle = { position: "absolute", top: "calc(100% + 5px)", left: 0, right: 0, maxHeight: 240, overflowY: "auto", zIndex: 10, background: "#fff", border: `1px solid ${LIGHT_BORDER}`, borderRadius: 6, boxShadow: "0 8px 24px rgba(30,27,75,.12)" };
const itemOptionStyle = { display: "block", width: "100%", padding: "8px 10px", textAlign: "left", border: 0, background: "#fff", color: NAVY, fontFamily: FONT, fontSize: 12.5, cursor: "pointer" };
const noItemsStyle = { padding: "9px 10px", color: "#94a3b8", fontSize: 12.5 };
const checkboxLabelStyle = { display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#334155", whiteSpace: "nowrap", cursor: "pointer" };
const tableContainerStyle = { flex: 1, display: "flex", flexDirection: "column", marginTop: 8, border: `1px solid ${LIGHT_BORDER}`, borderRadius: 6, overflow: "hidden", background: "#fff", minHeight: 0 };
const tableScrollStyle = { overflowX: "auto", flex: 1, padding: "0 14px" };
const tableStyle = { width: "100%", minWidth: 760, borderCollapse: "collapse", fontFamily: FONT, tableLayout: "fixed" };
const thStyle = { padding: "7px 8px", fontSize: 12.5, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.03em", background: "#f2f4f7", borderRight: `1px solid ${LIGHT_BORDER}`, borderBottom: `1px solid ${LIGHT_BORDER}`, whiteSpace: "normal", lineHeight: 1.3, position: "sticky", top: 0, zIndex: 2, verticalAlign: "middle" };
const tdStyle = { padding: "6px 8px", borderBottom: `1px solid ${LIGHT_BORDER}`, borderRight: `1px solid ${LIGHT_BORDER}`, fontSize: 14, color: NAVY, verticalAlign: "middle" };
const emptyCellStyle = { padding: "70px 24px", textAlign: "center", color: "#9ca3af", fontSize: 13 };
const errorStyle = { display: "flex", flexDirection: "column", alignItems: "center", gap: 10 };
const retryStyle = { display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 6, border: `1px solid ${LIGHT_BORDER}`, background: "#fff", color: INDIGO, fontSize: 12.5, fontWeight: 600, fontFamily: FONT, cursor: "pointer" };

