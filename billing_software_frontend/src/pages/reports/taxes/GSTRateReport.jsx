import { useEffect, useRef, useState } from "react";
import { ChevronDown, FileSpreadsheet, Printer, RefreshCw, AlertCircle, Calendar, Receipt, TrendingUp, ShoppingBag, DollarSign } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../../services/api";
import ReportPagination from "../../../components/reports/ReportPagination";

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
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
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

  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedRows = rows.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const netTax = (totals.tax_in || 0) - (totals.tax_out || 0);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto text-slate-800 font-sans">
      {/* Header & Export Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            <span>Taxation Reports</span>
            <span>•</span>
            <span>GST Slab Analysis</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            GST Tax Rate Report
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Breakdown of taxable sales, input tax credit (ITC), and tax collections per rate bracket
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Company Selector */}
          <div ref={companyRef} className="relative">
            <button
              onClick={() => setCompanyOpen((v) => !v)}
              className="inline-flex items-center justify-between gap-2 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50/80 text-slate-700 hover:bg-slate-100 transition-all cursor-pointer min-w-[160px]"
            >
              <span className="truncate">{companyName}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>
            {companyOpen && (
              <div className="absolute right-0 top-[calc(100%+4px)] min-w-[190px] bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1">
                {companies.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => {
                      setCompanyId(Number(company.id));
                      setCompanyName(company.company_name || "My Company");
                      setCompanyOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 font-medium cursor-pointer transition-colors block"
                  >
                    {company.company_name || "My Company"}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={exportExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-emerald-200 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100/80 hover:border-emerald-300 transition-all shadow-2xs cursor-pointer"
            title="Export Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excel</span>
          </button>
          <button
            onClick={print}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs cursor-pointer"
            title="Print Report"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-xs border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* From Date */}
          <div className="flex items-center gap-2 bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">From:</span>
            <input
              type="date"
              value={formatDate(fromDate)}
              onChange={(event) => setFromDate(parseDate(event.target.value))}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
            />
          </div>

          {/* To Date */}
          <div className="flex items-center gap-2 bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">To:</span>
            <input
              type="date"
              value={formatDate(toDate)}
              onChange={(event) => setToDate(parseDate(event.target.value))}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
            />
          </div>
        </div>

        <button
          onClick={() => setReloadKey((k) => k + 1)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl transition-all cursor-pointer ml-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
            <Receipt className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Tax Slabs</div>
            <div className="text-xl font-black text-slate-800 mt-0.5">{rows.length}</div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Active rate groups</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Total Tax In</div>
            <div className="text-xl font-black text-emerald-600 mt-0.5">
              {money(totals.tax_in)}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Collected on sales</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Total Tax Out</div>
            <div className="text-xl font-black text-blue-600 mt-0.5">
              {money(totals.tax_out)}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Paid on purchase/expenses</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Net Tax Payable</div>
            <div className={`text-xl font-black mt-0.5 ${netTax >= 0 ? "text-slate-800" : "text-emerald-600"}`}>
              {money(netTax)}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Tax In minus Tax Out</div>
          </div>
        </div>
      </div>

      {/* Modern Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75">
                {["Tax Name", "Tax Percent", "Taxable Sale Amount", "Tax In", "Taxable Purchase/Expense Amount", "Tax Out"].map((label, index) => (
                  <th
                    key={label}
                    className={`px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 ${
                      index === 0 ? "text-left" : "text-right"
                    }`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-slate-400 font-medium">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading GST rate report...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-rose-500 font-medium">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-6 h-6 text-rose-500" />
                      <span>{error}</span>
                      <button
                        onClick={() => setReloadKey((k) => k + 1)}
                        className="px-3 py-1 bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-slate-400 font-medium">
                    No GST rate data available.
                  </td>
                </tr>
              ) : (
                pagedRows.map((row) => (
                  <tr key={`${row.tax_percent}-${row.tax_name}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800">{row.tax_name}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-600">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                        {row.tax_percent}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">{money(row.taxable_sale_amount)}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">{money(row.tax_in)}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">{money(row.taxable_purchase_expense_amount)}</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-600">{money(row.tax_out)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && !error && rows.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50/90 font-bold text-slate-800 text-xs">
                <tr>
                  <td colSpan={3} className="px-4 py-3 uppercase tracking-wider font-extrabold text-slate-900">Total</td>
                  <td className="px-4 py-3 text-right font-extrabold text-emerald-700">{money(totals.tax_in)}</td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-right font-extrabold text-blue-700">{money(totals.tax_out)}</td>
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
          onRowsPerPageChange={(v) => {
            setRowsPerPage(v);
            setPage(1);
          }}
        />
      </div>
    </div>
  );
}
