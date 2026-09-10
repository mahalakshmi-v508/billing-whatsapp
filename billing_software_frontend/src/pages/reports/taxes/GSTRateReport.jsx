import { useEffect, useRef, useState } from "react";
import { ChevronDown, FileSpreadsheet, Printer, RefreshCw, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../../services/api";

const FONT = "'Plus Jakarta Sans', sans-serif";
const INDIGO = "#4338ca";
const NAVY = "#1e1b4b";
const GRAY_TEXT = "#64748b";
const BORDER = "#e2e8f0";

const getAuth = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return { adminId: user?.role === "admin" ? user?.id : user?.admin_id || null };
  } catch { return { adminId: null }; }
};
const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const parseDate = (value) => { const [year, month, day] = value.split("-").map(Number); return new Date(year, month - 1, day); };
const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function printReport(element) {
  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, { position: "fixed", width: 0, height: 0, border: 0, visibility: "hidden" });
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`<html><head><title>GST TAX RATE REPORT</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#1e1b4b}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #dbe2ec;padding:7px 8px}th{background:#f2f4f7}td.r,th.r{text-align:right}.totals{margin-top:18px;text-align:right;font-size:12px;line-height:1.8}</style></head><body>${element.innerHTML}</body></html>`);
  doc.close();
  const win = iframe.contentWindow;
  const fire = () => { try { win.focus(); win.print(); } finally { setTimeout(() => iframe.remove(), 1500); } };
  if (doc.readyState === "complete") fire(); else win.addEventListener("load", fire);
}

export default function GSTRateReport() {
  const { adminId } = getAuth();
  const today = new Date();
  const [fromDate, setFromDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [toDate, setToDate] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const [companyId, setCompanyId] = useState(Number(localStorage.getItem("selected_company_id") || 0) || null);
  const [companyName, setCompanyName] = useState("My Company");
  const [companies, setCompanies] = useState([]);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ tax_in: 0, tax_out: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const companyRef = useRef(null);

  useEffect(() => {
    const close = (event) => { if (companyRef.current && !companyRef.current.contains(event.target)) setCompanyOpen(false); };
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
    if (!companyId) return undefined;
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      api.get("/report/gst-rate-report", { params: { company_id: companyId, admin_id: adminId || 0, from_date: formatDate(fromDate), to_date: formatDate(toDate) } }).then((res) => {
        if (!active) return;
        if (res.data?.status) { setRows(res.data.data || []); setTotals(res.data.totals || { tax_in: 0, tax_out: 0 }); }
        else setError(res.data?.message || "Failed to load GST rate report.");
      }).catch(() => { if (active) setError("Failed to load GST rate report."); }).finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => { active = false; clearTimeout(timer); };
  }, [companyId, adminId, fromDate, toDate, reloadKey]);

  const exportExcel = () => {
    const data = [["GST TAX RATE REPORT"], ["From", formatDate(fromDate), "To", formatDate(toDate)], ["Company", companyName], [], ["Tax Name", "Tax Percent", "Taxable Sale Amount", "Tax In", "Taxable Purchase/Expense Amount", "Tax Out"], ...rows.map((row) => [row.tax_name, row.tax_percent, row.taxable_sale_amount, row.tax_in, row.taxable_purchase_expense_amount, row.tax_out])];
    const sheet = XLSX.utils.aoa_to_sheet(data);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "GST Tax Rate Report");
    const buffer = XLSX.write(book, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "GST_Tax_Rate_Report.xlsx");
  };

  const print = () => {
    const body = rows.map((row) => `<tr><td>${row.tax_name}</td><td class="r">${row.tax_percent}%</td><td class="r">${money(row.taxable_sale_amount)}</td><td class="r">${money(row.tax_in)}</td><td class="r">${money(row.taxable_purchase_expense_amount)}</td><td class="r">${money(row.tax_out)}</td></tr>`).join("");
    const element = document.createElement("div");
    element.innerHTML = `<h2>GST TAX RATE REPORT</h2><p>From ${formatDate(fromDate)} To ${formatDate(toDate)}</p><table><thead><tr><th>Tax Name</th><th class="r">Tax Percent</th><th class="r">Taxable Sale Amount</th><th class="r">Tax In</th><th class="r">Taxable Purchase/Expense Amount</th><th class="r">Tax Out</th></tr></thead><tbody>${body}</tbody></table><div class="totals">Total Tax In: ${money(totals.tax_in)}<br/>Total Tax Out: ${money(totals.tax_out)}</div>`;
    printReport(element);
  };

  return <div style={pageStyle}>
    <div style={topBarStyle}>
      <div style={dateFieldStyle}><span>From</span><input type="date" value={formatDate(fromDate)} onChange={(event) => setFromDate(parseDate(event.target.value))} style={dateInputStyle} /></div>
      <div style={dateFieldStyle}><span>To</span><input type="date" value={formatDate(toDate)} onChange={(event) => setToDate(parseDate(event.target.value))} style={dateInputStyle} /></div>
      <div ref={companyRef} style={{ ...companyWrapStyle, marginLeft: "auto" }}><button onClick={() => setCompanyOpen((value) => !value)} style={companyButtonStyle}>{companyName}<ChevronDown size={14} color="#94a3b8" /></button>{companyOpen && <div style={dropdownStyle}>{companies.map((company) => <button key={company.id} onClick={() => { setCompanyId(Number(company.id)); setCompanyName(company.company_name || "My Company"); setCompanyOpen(false); }} style={dropdownItemStyle}>{company.company_name || "My Company"}</button>)}</div>}</div>
      <button onClick={exportExcel} title="Excel Report" style={actionStyle}><FileSpreadsheet size={17} color={INDIGO} /></button><button onClick={print} title="Print" style={actionStyle}><Printer size={17} color={INDIGO} /></button>
    </div>
    <div style={titleStyle}>GST TAX RATE REPORT</div>
    <div style={tableWrapStyle}><div style={scrollStyle}><table style={tableStyle}><thead><tr>{["Tax Name", "Tax Percent", "Taxable Sale Amount", "Tax In", "Taxable Purchase/Expense Amount", "Tax Out"].map((label, index) => <th key={label} style={{ ...thStyle, textAlign: index === 0 ? "left" : "right" }}>{label}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={6} style={emptyStyle}>Loading...</td></tr> : error ? <tr><td colSpan={6} style={emptyStyle}><div style={errorStyle}><AlertCircle size={22} color="#dc2626" /><span>{error}</span><button onClick={() => setReloadKey((key) => key + 1)} style={retryStyle}><RefreshCw size={13} /> Retry</button></div></td></tr> : rows.map((row) => <tr key={`${row.tax_percent}-${row.tax_name}`}><td style={tdStyle}>{row.tax_name}</td><td style={{ ...tdStyle, textAlign: "right" }}>{row.tax_percent}%</td><td style={{ ...tdStyle, textAlign: "right" }}>{money(row.taxable_sale_amount)}</td><td style={{ ...tdStyle, textAlign: "right" }}>{money(row.tax_in)}</td><td style={{ ...tdStyle, textAlign: "right" }}>{money(row.taxable_purchase_expense_amount)}</td><td style={{ ...tdStyle, textAlign: "right" }}>{money(row.tax_out)}</td></tr>)}</tbody></table></div></div>
    <div style={totalsStyle}><span>Total Tax In: <strong>{money(totals.tax_in)}</strong></span><span>Total Tax Out: <strong>{money(totals.tax_out)}</strong></span></div>
  </div>;
}

const pageStyle = { fontFamily: FONT, padding: "2px 0", minHeight: "100%", background: "#fff", color: NAVY };
const topBarStyle = { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "8px 0", borderBottom: `1px solid ${BORDER}` };
const dateFieldStyle = { display: "flex", alignItems: "center", gap: 6, color: GRAY_TEXT, fontSize: 12, whiteSpace: "nowrap" };
const dateInputStyle = { width: 122, padding: "6px 7px", border: `1px solid ${BORDER}`, borderRadius: 5, color: NAVY, fontFamily: FONT, fontSize: 12, outline: "none" };
const companyWrapStyle = { position: "relative" };
const companyButtonStyle = { width: 190, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "7px 10px", border: `1px solid ${BORDER}`, borderRadius: 5, background: "#fff", color: NAVY, fontFamily: FONT, fontSize: 12, cursor: "pointer" };
const dropdownStyle = { position: "absolute", right: 0, top: "calc(100% + 4px)", minWidth: 190, zIndex: 10, background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 5, boxShadow: "0 8px 20px rgba(30,27,75,.12)" };
const dropdownItemStyle = { display: "block", width: "100%", padding: "8px 10px", textAlign: "left", border: 0, background: "#fff", color: NAVY, fontFamily: FONT, fontSize: 12, cursor: "pointer" };
const actionStyle = { width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${BORDER}`, background: "#fff", cursor: "pointer" };
const titleStyle = { padding: "14px 0 10px", fontSize: 14, fontWeight: 700 };
const tableWrapStyle = { border: `1px solid ${BORDER}`, overflow: "hidden", background: "#fff" };
const scrollStyle = { overflowX: "auto", padding: "0 14px" };
const tableStyle = { width: "100%", minWidth: 940, borderCollapse: "collapse", tableLayout: "fixed" };
const thStyle = { padding: "8px", background: "#f2f4f7", borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, color: "#475569", fontSize: 11.5, fontWeight: 700, lineHeight: 1.25 };
const tdStyle = { padding: "7px 8px", borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, fontSize: 13, color: NAVY };
const emptyStyle = { height: 450, textAlign: "center", color: "#94a3b8", fontSize: 13 };
const errorStyle = { display: "flex", flexDirection: "column", alignItems: "center", gap: 10 };
const retryStyle = { display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", border: `1px solid ${BORDER}`, borderRadius: 5, background: "#fff", color: INDIGO, cursor: "pointer" };
const totalsStyle = { display: "flex", justifyContent: "flex-end", gap: 90, padding: "10px 0", color: "#0f9f95", fontSize: 13, borderTop: `1px solid ${BORDER}` };

