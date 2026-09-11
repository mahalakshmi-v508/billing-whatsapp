import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ChevronDown, FileSpreadsheet, Printer, RefreshCw } from "lucide-react";
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

function getAuth() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return { adminId: user?.role === "admin" ? user?.id : user?.admin_id || null };
  } catch {
    return { adminId: null };
  }
}

function dateRange(period) {
  const now = new Date();
  const current = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "this_month") return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: current };
  if (period === "last_month") return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 0) };
  if (period === "last_30_days") { const from = new Date(current); from.setDate(from.getDate() - 29); return { from, to: current }; }
  if (period === "this_year") return { from: new Date(now.getFullYear(), 0, 1), to: current };
  return { from: new Date(2000, 0, 1), to: current };
}

const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const parseDate = (value) => { const [year, month, day] = value.split("-").map(Number); return new Date(year, month - 1, day); };
const displayDate = (value) => { const [year, month, day] = value.split("-"); return `${day}/${month}/${year}`; };
const number = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function printReport(element) {
  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, { position: "fixed", width: 0, height: 0, border: 0, visibility: "hidden" });
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`<html><head><title>Item Wise Discount</title><style>body{font-family:Arial,sans-serif;padding:22px;color:#1e1b4b}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #dbe2ec;padding:6px 8px}th{background:#f2f4f7}td.r,th.r{text-align:right}td.c,th.c{text-align:center}</style></head><body>${element.innerHTML}</body></html>`);
  doc.close();
  const win = iframe.contentWindow;
  const fire = () => { try { win.focus(); win.print(); } finally { setTimeout(() => iframe.remove(), 1500); } };
  if (doc.readyState === "complete") fire(); else win.addEventListener("load", fire);
}

export default function ItemWiseDiscount() {
  const { adminId } = getAuth();
  const [{ from: startDate, to: endDate }, setRange] = useState(dateRange("this_month"));
  const [period, setPeriod] = useState("this_month");
  const [companyId, setCompanyId] = useState(Number(localStorage.getItem("selected_company_id") || 0) || null);
  const [companyName, setCompanyName] = useState("My Company");
  const [companies, setCompanies] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [itemName, setItemName] = useState("");
  const [categoryId, setCategoryId] = useState(0);
  const [subcategoryId, setSubcategoryId] = useState(0);
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const periodRef = useRef(null);
  const companyRef = useRef(null);

  useEffect(() => {
    const close = (event) => {
      if (periodRef.current && !periodRef.current.contains(event.target)) setPeriodOpen(false);
      if (companyRef.current && !companyRef.current.contains(event.target)) setCompanyOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (!adminId) return;
    api.get(`/company/get_companies_by_admin?admin_id=${adminId}`).then((res) => {
      const list = res.data?.status ? res.data.data || [] : [];
      setCompanies(list);
      const saved = localStorage.getItem("selected_company_id");
      const chosen = list.find((company) => String(company.id) === String(saved)) || list[0];
      if (chosen) { setCompanyId(Number(chosen.id)); setCompanyName(chosen.company_name || "My Company"); }
    }).catch(() => setError("Failed to load companies."));
  }, [adminId]);

  useEffect(() => {
    if (!companyId) return;
    Promise.all([
      api.get("/product/get", { params: { company_id: companyId } }),
      api.get("/category/get_all", { params: { company_id: companyId } }),
      api.get("/subcategory/get_all", { params: { company_id: companyId } }),
    ]).then(([productResponse, categoryResponse, subcategoryResponse]) => {
      setProducts(productResponse.data?.status ? productResponse.data.data || [] : []);
      setCategories(categoryResponse.data?.status ? categoryResponse.data.data || [] : []);
      setSubcategories(subcategoryResponse.data?.status ? subcategoryResponse.data.data || [] : []);
    }).catch(() => setError("Failed to load item filters."));
  }, [companyId]);

  const matchingProducts = useMemo(() => products.filter((product) => !itemName || String(product.product_name || "").toLowerCase().includes(itemName.toLowerCase())), [products, itemName]);

  useEffect(() => {
    if (!companyId) return undefined;
    const params = { company_id: companyId, admin_id: adminId || 0, from_date: formatDate(startDate), to_date: formatDate(endDate), item_name: itemName, category_id: categoryId, subcategory_id: subcategoryId };
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      api.get("/report/item-wise-discount", { params }).then((res) => {
        if (!active) return;
        if (res.data?.status) { setRows(res.data.data || []); setTotals(res.data.totals || {}); } else setError(res.data?.message || "Failed to load report.");
      }).catch(() => { if (active) setError("Failed to load report."); }).finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => { active = false; clearTimeout(timer); };
  }, [companyId, adminId, startDate, endDate, itemName, categoryId, subcategoryId, reloadKey]);

  const exportExcel = () => {
    const data = [["Item Wise Discount"], [`Period: ${displayDate(formatDate(startDate))} to ${displayDate(formatDate(endDate))}`], [`Company: ${companyName}`], [], ["#", "ITEM NAME", "TOTAL QTY SOLD", "TOTAL SALE AMOUNT", "TOTAL DISC. AMOUNT", "AVG. DISC. (%)", "Details"], ...rows.map((row, index) => [index + 1, row.item_name, row.total_qty_sold, row.total_sale_amount, row.total_discount_amount, row.avg_discount_percent, ""])];
    const sheet = XLSX.utils.aoa_to_sheet(data);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Item Wise Discount");
    const buffer = XLSX.write(book, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "Item_Wise_Discount.xlsx");
  };

  const print = () => {
    const body = rows.map((row, index) => `<tr><td class="c">${index + 1}</td><td>${row.item_name || "-"}</td><td class="r">${number(row.total_qty_sold)}</td><td class="r">${money(row.total_sale_amount)}</td><td class="r">${money(row.total_discount_amount)}</td><td class="r">${number(row.avg_discount_percent)}%</td><td class="c"></td></tr>`).join("");
    const element = document.createElement("div");
    element.innerHTML = `<h2>Item Wise Discount</h2><table><thead><tr><th class="c">#</th><th>ITEM NAME</th><th class="r">TOTAL QTY SOLD</th><th class="r">TOTAL SALE AMOUNT</th><th class="r">TOTAL DISC. AMOUNT</th><th class="r">AVG. DISC. (%)</th><th class="c">Details</th></tr></thead><tbody>${body}</tbody></table><p><strong>Summary</strong></p><p>Total Sale Amount: ${money(totals.total_sale_amount)}</p><p>Total Discount amount: ${money(totals.total_discount_amount)}</p>`;
    printReport(element);
  };

  return (
    <div style={pageStyle}>
      <div style={topBarStyle}>
        <div ref={periodRef} style={menuWrapperStyle}><button onClick={() => setPeriodOpen((value) => !value)} style={periodButtonStyle}>{PERIODS.find((option) => option.value === period)?.label || "This Month"}<ChevronDown size={14} color="#94a3b8" /></button>{periodOpen && <div style={dropdownStyle}>{PERIODS.map((option) => <button key={option.value} onClick={() => { setPeriod(option.value); setRange(dateRange(option.value)); setPeriodOpen(false); }} style={dropdownItemStyle}>{option.label}</button>)}</div>}</div>
        <span style={betweenStyle}>Between</span>
        <div style={dateFieldStyle}><input type="date" value={formatDate(startDate)} onChange={(event) => { setRange({ from: parseDate(event.target.value), to: endDate }); setPeriod("custom"); }} style={dateInputStyle} /><span style={toLabelStyle}>To</span><input type="date" value={formatDate(endDate)} onChange={(event) => { setRange({ from: startDate, to: parseDate(event.target.value) }); setPeriod("custom"); }} style={dateInputStyle} /></div>
        <div ref={companyRef} style={{ ...menuWrapperStyle, marginLeft: "auto" }}><button onClick={() => setCompanyOpen((value) => !value)} style={companyButtonStyle}>{companyName}<ChevronDown size={14} color="#94a3b8" /></button>{companyOpen && <div style={{ ...dropdownStyle, right: 0, left: "auto", minWidth: 190 }}>{companies.map((company) => <button key={company.id} onClick={() => { setCompanyId(Number(company.id)); setCompanyName(company.company_name || "My Company"); setCompanyOpen(false); }} style={dropdownItemStyle}>{company.company_name || "My Company"}</button>)}</div>}</div>
        <button onClick={exportExcel} title="Excel Report" style={circleButtonStyle}><FileSpreadsheet size={16} color={INDIGO} /></button><button onClick={print} title="Print" style={circleButtonStyle}><Printer size={16} color={INDIGO} /></button>
      </div>
      <div style={headingStyle}>Item Wise Discount</div>
      <div style={itemFilterStyle}><span style={filterLabelStyle}>ITEM NAME</span><input value={itemName} onChange={(event) => setItemName(event.target.value)} placeholder="Item name" style={filterInputStyle} /><select value={categoryId} onChange={(event) => setCategoryId(Number(event.target.value))} style={filterSelectStyle}><option value={0}>All Categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><select value={subcategoryId} onChange={(event) => setSubcategoryId(Number(event.target.value))} style={filterSelectStyle}><option value={0}>All Subcategories</option>{subcategories.map((subcategory) => <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>)}</select></div>
      {itemName && matchingProducts.length === 0 && <div style={filterHintStyle}>No matching items found.</div>}
      <div style={tableContainerStyle}><div style={tableScrollStyle}><table style={tableStyle}><thead><tr><th style={{ ...thStyle, textAlign: "center", width: 42 }}>#</th><th style={thStyle}>ITEM NAME</th><th style={{ ...thStyle, textAlign: "right" }}>TOTAL QTY SOLD</th><th style={{ ...thStyle, textAlign: "right" }}>TOTAL SALE AMOUNT</th><th style={{ ...thStyle, textAlign: "right" }}>TOTAL DISC. AMOUNT</th><th style={{ ...thStyle, textAlign: "right" }}>AVG. DISC. (%)</th><th style={{ ...thStyle, textAlign: "center", width: 84 }}>Details</th></tr></thead><tbody>{loading ? <tr><td colSpan={7} style={emptyCellStyle}>Loading...</td></tr> : error ? <tr><td colSpan={7} style={emptyCellStyle}><div style={errorStyle}><AlertCircle size={22} color="#dc2626" /><span>{error}</span><button onClick={() => setReloadKey((key) => key + 1)} style={retryStyle}><RefreshCw size={13} /> Retry</button></div></td></tr> : rows.length === 0 ? <tr><td colSpan={7} style={emptyCellStyle}>No Items</td></tr> : rows.map((row, index) => <tr key={row.id}><td style={{ ...tdStyle, textAlign: "center", color: GRAY_TEXT }}>{index + 1}</td><td style={{ ...tdStyle, fontWeight: 600 }}>{row.item_name || "-"}</td><td style={{ ...tdStyle, textAlign: "right" }}>{number(row.total_qty_sold)}</td><td style={{ ...tdStyle, textAlign: "right" }}>{money(row.total_sale_amount)}</td><td style={{ ...tdStyle, textAlign: "right" }}>{money(row.total_discount_amount)}</td><td style={{ ...tdStyle, textAlign: "right" }}>{number(row.avg_discount_percent)}%</td><td style={{ ...tdStyle, textAlign: "center" }}></td></tr>)}</tbody></table></div></div>
      <div style={summaryStyle}><div style={summaryTitleStyle}>Summary</div><div>Total Sale Amount: <strong>{money(totals.total_sale_amount)}</strong></div><div>Total Discount amount: <strong>{money(totals.total_discount_amount)}</strong></div></div>
    </div>
  );
}

const pageStyle = { fontFamily: FONT, padding: "2px 0", display: "flex", flexDirection: "column", minHeight: "100%", background: "#fff" };
const topBarStyle = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "8px 0", borderBottom: `1px solid ${LIGHT_BORDER}` };
const menuWrapperStyle = { position: "relative", flexShrink: 0 };
const periodButtonStyle = { display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", border: 0, background: "transparent", fontFamily: FONT, fontSize: 16, fontWeight: 700, color: NAVY, cursor: "pointer" };
const companyButtonStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, width: 190, padding: "7px 10px", border: `1px solid ${LIGHT_BORDER}`, borderRadius: 5, background: "#fff", fontFamily: FONT, fontSize: 12, color: NAVY, cursor: "pointer" };
const dropdownStyle = { position: "absolute", top: "calc(100% + 4px)", left: 0, minWidth: 150, maxHeight: 240, overflowY: "auto", zIndex: 20, border: `1px solid ${LIGHT_BORDER}`, borderRadius: 6, background: "#fff", boxShadow: "0 8px 22px rgba(30,27,75,.12)" };
const dropdownItemStyle = { display: "block", width: "100%", padding: "8px 10px", border: 0, background: "#fff", color: NAVY, fontFamily: FONT, fontSize: 12, textAlign: "left", cursor: "pointer" };
const betweenStyle = { padding: "7px 9px", background: "#b8b8b8", color: "#fff", fontSize: 12, fontWeight: 700 };
const dateFieldStyle = { display: "flex", alignItems: "center", gap: 6 };
const dateInputStyle = { width: 124, padding: "6px 7px", border: `1px solid ${LIGHT_BORDER}`, borderRadius: 4, color: NAVY, fontFamily: FONT, fontSize: 12, outline: "none" };
const toLabelStyle = { color: GRAY_TEXT, fontSize: 12 };
const circleButtonStyle = { width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${LIGHT_BORDER}`, background: "#fff", cursor: "pointer", flexShrink: 0 };
const headingStyle = { padding: "16px 0 10px", color: NAVY, fontSize: 15, fontWeight: 700 };
const itemFilterStyle = { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", paddingBottom: 10 };
const filterLabelStyle = { color: GRAY_TEXT, fontSize: 11, fontWeight: 700 };
const filterInputStyle = { width: 118, padding: "5px 8px", border: `1px solid ${LIGHT_BORDER}`, borderRadius: 3, fontFamily: FONT, fontSize: 12, color: NAVY, outline: "none" };
const filterSelectStyle = { minWidth: 118, padding: "5px 8px", border: `1px solid ${LIGHT_BORDER}`, borderRadius: 3, background: "#fff", fontFamily: FONT, fontSize: 12, color: NAVY, outline: "none" };
const filterHintStyle = { color: "#94a3b8", fontSize: 11, marginBottom: 8 };
const tableContainerStyle = { display: "flex", flexDirection: "column", border: `1px solid ${LIGHT_BORDER}`, borderRadius: 5, overflow: "hidden", background: "#fff", minHeight: 300 };
const tableScrollStyle = { overflowX: "auto", padding: "0 14px" };
const tableStyle = { width: "100%", minWidth: 900, borderCollapse: "collapse", tableLayout: "fixed", fontFamily: FONT };
const thStyle = { padding: "8px", background: "#f2f4f7", borderRight: `1px solid ${LIGHT_BORDER}`, borderBottom: `1px solid ${LIGHT_BORDER}`, color: "#475569", fontSize: 11.5, fontWeight: 700, whiteSpace: "normal", lineHeight: 1.25 };
const tdStyle = { padding: "7px 8px", borderRight: `1px solid ${LIGHT_BORDER}`, borderBottom: `1px solid ${LIGHT_BORDER}`, color: NAVY, fontSize: 13, verticalAlign: "middle" };
const emptyCellStyle = { height: 250, textAlign: "center", color: "#64748b", fontSize: 13 };
const errorStyle = { display: "flex", flexDirection: "column", alignItems: "center", gap: 10 };
const retryStyle = { display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", border: `1px solid ${LIGHT_BORDER}`, borderRadius: 5, background: "#fff", color: INDIGO, fontFamily: FONT, fontSize: 12, cursor: "pointer" };
const summaryStyle = { paddingTop: 18, paddingBottom: 12, color: NAVY, fontSize: 13, lineHeight: 1.8 };
const summaryTitleStyle = { fontWeight: 800, fontSize: 14, marginBottom: 2 };

