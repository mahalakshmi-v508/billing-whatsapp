import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Percent,
  Printer,
  Receipt,
  RefreshCw,
  Search,
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../../services/api";
import ReportPagination from "../../../components/reports/ReportPagination";

const PERIODS = ["This Month", "Last Month", "Last 30 Days", "This Year", "All Time"];

const getAuth = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return { adminId: user?.role === "admin" ? user.id : user?.admin_id || null };
  } catch {
    return { adminId: null };
  }
};

const iso = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const parse = (value) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const rangeFor = (period) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "This Month") return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: today };
  if (period === "Last Month") return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 0) };
  if (period === "Last 30 Days") {
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    return { from, to: today };
  }
  if (period === "This Year") return { from: new Date(now.getFullYear(), 0, 1), to: today };
  return { from: new Date(2000, 0, 1), to: today };
};

function printReport(element) {
  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, { position: "fixed", width: 0, height: 0, border: 0, visibility: "hidden" });
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`<html><head><title>TDS Payable</title><style>body{font-family:Arial,sans-serif;padding:22px;color:#1e1b4b}table{width:100%;border-collapse:collapse;font-size:9px}th,td{border:1px solid #dbe2ec;padding:6px}th{background:#f2f4f7}td.r,th.r{text-align:right}.totals{text-align:right;margin-top:16px;line-height:1.8;font-size:11px}</style></head><body>${element.innerHTML}</body></html>`);
  doc.close();
  const win = iframe.contentWindow;
  const fire = () => {
    try {
      win.focus();
      win.print();
    } finally {
      setTimeout(() => iframe.remove(), 1500);
    }
  };
  if (doc.readyState === "complete") fire();
  else win.addEventListener("load", fire);
}

export default function TDSPayable() {
  const { adminId } = getAuth();
  const initial = rangeFor("This Month");
  const [period, setPeriod] = useState("This Month");
  const [fromDate, setFromDate] = useState(initial.from);
  const [toDate, setToDate] = useState(initial.to);
  const [companyId, setCompanyId] = useState(Number(localStorage.getItem("selected_company_id") || 0) || null);
  const [companyName, setCompanyName] = useState("ALL FIRMS");
  const [companies, setCompanies] = useState([]);
  const [companyOpen, setCompanyOpen] = useState(false);
  const companyRef = useRef(null);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const close = (event) => {
      if (companyRef.current && !companyRef.current.contains(event.target)) setCompanyOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (!adminId) return;
    api
      .get(`/company/get_companies_by_admin?admin_id=${adminId}`)
      .then((res) => setCompanies(res.data?.status ? res.data.data || [] : []))
      .catch(() => setError("Failed to load companies."));
  }, [adminId]);

  useEffect(() => {
    if (!companyId && companyId !== 0) return undefined;
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      api
        .get("/report/tds-payable", {
          params: {
            company_id: companyId,
            admin_id: adminId || 0,
            from_date: iso(fromDate),
            to_date: iso(toDate),
          },
        })
        .then((res) => {
          if (!active) return;
          if (res.data?.status) setRows(res.data.data || []);
          else setError(res.data?.message || "Failed to load TDS Payable.");
        })
        .catch(() => {
          if (active) setError("Failed to load TDS Payable.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [companyId, adminId, fromDate, toDate, reloadKey]);

  const filteredRows = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return rows;
    return rows.filter((row) =>
      [row.party_name, row.bill_no, row.tax_name, row.tax_section, row.collection_code].some((field) =>
        String(field || "").toLowerCase().includes(value)
      )
    );
  }, [rows, query]);

  const totals = useMemo(
    () => ({
      totalAmount: filteredRows.reduce((sum, row) => sum + Number(row.total_amount || 0), 0),
      taxableAmount: filteredRows.reduce((sum, row) => sum + Number(row.taxable_amount || 0), 0),
      tdsPayable: filteredRows.reduce((sum, row) => sum + Number(row.tds_payable || 0), 0),
    }),
    [filteredRows]
  );

  const totalRows = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedStart = (safePage - 1) * rowsPerPage;
  const pagedRows = filteredRows.slice(pagedStart, pagedStart + rowsPerPage);

  const exportExcel = () => {
    const data = [
      ["TDS Payable"],
      [`From: ${iso(fromDate)} To: ${iso(toDate)}`],
      [`Company: ${companyName}`],
      [],
      ["#", "Party Name", "Transaction Type", "Bill No", "Total Amount", "Taxable Amount", "TDS Payable", "Date of Deduction", "Tax Name", "Tax Section", "Collection Code", "TDS Rate (%)"],
      ...filteredRows.map((row, index) => [
        index + 1,
        row.party_name,
        row.transaction_type,
        row.bill_no,
        row.total_amount,
        row.taxable_amount,
        row.tds_payable,
        row.date_of_deduction,
        row.tax_name,
        row.tax_section,
        row.collection_code,
        row.tds_rate,
      ]),
      [],
      ["", "Total Amount", totals.totalAmount],
      ["", "Taxable Amount", totals.taxableAmount],
      ["", "Total TDS Payable", totals.tdsPayable],
    ];
    const sheet = XLSX.utils.aoa_to_sheet(data);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "TDS Payable");
    const buffer = XLSX.write(book, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "TDS_Payable.xlsx");
  };

  const print = () => {
    const body = filteredRows
      .map(
        (row, index) =>
          `<tr><td>${index + 1}</td><td>${row.party_name}</td><td>${row.transaction_type}</td><td>${row.bill_no}</td><td class="r">${money(row.total_amount)}</td><td class="r">${money(row.taxable_amount)}</td><td class="r">${money(row.tds_payable)}</td><td>${row.date_of_deduction}</td><td>${row.tax_name}</td><td>${row.tax_section}</td><td>${row.collection_code}</td><td class="r">${row.tds_rate}%</td></tr>`
      )
      .join("");
    const element = document.createElement("div");
    element.innerHTML = `<h2>TDS Payable</h2><p>From ${iso(fromDate)} To ${iso(toDate)} | ${companyName}</p><table><thead><tr><th>#</th><th>PARTY NAME</th><th>TRANSACTION TYPE</th><th>BILL NO</th><th class="r">TOTAL AMOUNT</th><th class="r">TAXABLE AMOUNT</th><th class="r">TDS PAYABLE</th><th>DATE OF DEDUCTION</th><th>TAX NAME</th><th>TAX SECTION</th><th>COLLECTION CODE</th><th class="r">TDS RATE (%)</th></tr></thead><tbody>${body}</tbody></table><div class="totals">Total TDS Payable: ${money(totals.tdsPayable)}</div>`;
    printReport(element);
  };

  const labels = [
    "#",
    "PARTY NAME",
    "TRANSACTION TYPE",
    "BILL NO",
    "TOTAL AMOUNT",
    "TAXABLE AMOUNT",
    "TDS PAYABLE",
    "DATE OF DEDUCTION",
    "TAX NAME",
    "TAX SECTION",
    "COLLECTION CODE",
    "TDS RATE (%)",
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto text-slate-800 font-sans">
      {/* Header Card */}
      <div className="bg-white rounded-2xl p-5 md:p-6 shadow-xs border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">TDS Payable</h1>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                Tax Deducted at Source payable liability on contractor & supplier payments
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={exportExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-emerald-200 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100/80 hover:border-emerald-300 transition-all shadow-2xs cursor-pointer"
            title="Export to Excel"
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
          {/* Period selector */}
          <div className="relative">
            <select
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value);
                const range = rangeFor(e.target.value);
                setFromDate(range.from);
                setToDate(range.to);
              }}
              className="appearance-none bg-slate-50/80 border border-slate-200 rounded-xl pl-3.5 pr-9 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100/70 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer shadow-2xs"
            >
              {PERIODS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
              {period === "Custom" && <option value="Custom">Custom</option>}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* From Date */}
          <div className="flex items-center gap-2 bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">From:</span>
            <input
              type="date"
              value={iso(fromDate)}
              onChange={(e) => {
                setFromDate(parse(e.target.value));
                setPeriod("Custom");
              }}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
            />
          </div>

          {/* To Date */}
          <div className="flex items-center gap-2 bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">To:</span>
            <input
              type="date"
              value={iso(toDate)}
              onChange={(e) => {
                setToDate(parse(e.target.value));
                setPeriod("Custom");
              }}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
            />
          </div>

          {/* Company Selector */}
          <div ref={companyRef} className="relative">
            <button
              onClick={() => setCompanyOpen((v) => !v)}
              className="appearance-none bg-slate-50/80 border border-slate-200 rounded-xl pl-3.5 pr-8 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100/70 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer shadow-2xs inline-flex items-center gap-2 min-w-[150px] justify-between"
            >
              <span className="truncate">{companyName}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>
            {companyOpen && (
              <div className="absolute top-full left-0 mt-1.5 min-w-[200px] bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1.5 overflow-hidden">
                <button
                  onClick={() => {
                    setCompanyId(0);
                    setCompanyName("ALL FIRMS");
                    setCompanyOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs transition-colors ${
                    companyId === 0
                      ? "bg-indigo-50 text-indigo-700 font-bold"
                      : "text-slate-700 hover:bg-slate-50 font-medium"
                  }`}
                >
                  ALL FIRMS
                </button>
                {companies.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => {
                      setCompanyId(Number(company.id));
                      setCompanyName(company.company_name || "My Company");
                      setCompanyOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs transition-colors ${
                      Number(company.id) === Number(companyId)
                        ? "bg-indigo-50 text-indigo-700 font-bold"
                        : "text-slate-700 hover:bg-slate-50 font-medium"
                    }`}
                  >
                    {company.company_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Search Input & Refresh */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search party, bill, code..."
              className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
            />
          </div>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl transition-all cursor-pointer shrink-0"
            title="Reload data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
            <Receipt className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Total Records</div>
            <div className="text-xl font-black text-slate-800 mt-0.5">{filteredRows.length}</div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Deduction transactions</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Total Gross Amount</div>
            <div className="text-xl font-black text-emerald-600 mt-0.5">
              {money(totals.totalAmount)}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Gross invoice value</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
            <Percent className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">TDS Payable</div>
            <div className="text-xl font-black text-rose-600 mt-0.5">
              {money(totals.tdsPayable)}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Tax liability to remit</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
            <Receipt className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Taxable Amount</div>
            <div className="text-xl font-black text-amber-600 mt-0.5">
              {money(totals.taxableAmount)}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Net base subject to TDS</div>
          </div>
        </div>
      </div>

      {/* Modern Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75">
                {labels.map((label, index) => (
                  <th
                    key={label}
                    className={`px-3.5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 ${
                      index === 0
                        ? "text-center w-12"
                        : [4, 5, 6, 11].includes(index)
                        ? "text-right"
                        : "text-left"
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
                  <td colSpan={12} className="px-4 py-16 text-center text-slate-400 font-medium">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading TDS Payable records...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-rose-500 font-medium">
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
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-16 text-center text-slate-400 font-medium">
                    No Data Available!
                    <br />
                    <span className="text-[11px] text-slate-400 mt-1 block">Please try again after making relevant changes.</span>
                  </td>
                </tr>
              ) : (
                pagedRows.map((row, index) => (
                  <tr key={`${row.bill_no}-${row.date_of_deduction}-${index}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3.5 py-3 text-center font-semibold text-slate-400">{pagedStart + index + 1}</td>
                    <td className="px-3.5 py-3 font-semibold text-slate-800">{row.party_name}</td>
                    <td className="px-3.5 py-3 text-slate-600">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                        {row.transaction_type}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 font-mono font-medium text-slate-600">{row.bill_no}</td>
                    <td className="px-3.5 py-3 text-right font-semibold text-slate-800">{money(row.total_amount)}</td>
                    <td className="px-3.5 py-3 text-right font-medium text-slate-600">{money(row.taxable_amount)}</td>
                    <td className="px-3.5 py-3 text-right font-bold text-rose-600">{money(row.tds_payable)}</td>
                    <td className="px-3.5 py-3 text-slate-500 whitespace-nowrap">{row.date_of_deduction}</td>
                    <td className="px-3.5 py-3 text-slate-700">{row.tax_name}</td>
                    <td className="px-3.5 py-3 text-slate-600 font-mono text-[11px]">{row.tax_section}</td>
                    <td className="px-3.5 py-3 text-slate-600 font-mono text-[11px]">{row.collection_code}</td>
                    <td className="px-3.5 py-3 text-right font-bold text-slate-600">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                        {row.tds_rate}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && !error && filteredRows.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50/90 font-bold text-slate-800 text-xs">
                <tr>
                  <td colSpan={4} className="px-3.5 py-3.5 uppercase tracking-wider font-extrabold text-slate-900">
                    Total
                  </td>
                  <td className="px-3.5 py-3.5 text-right font-extrabold text-slate-900">{money(totals.totalAmount)}</td>
                  <td className="px-3.5 py-3.5 text-right font-extrabold text-slate-900">{money(totals.taxableAmount)}</td>
                  <td className="px-3.5 py-3.5 text-right font-extrabold text-rose-600">{money(totals.tdsPayable)}</td>
                  <td colSpan={5} className="px-3.5 py-3.5"></td>
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

      {/* Summary Footer */}
      <div className="flex flex-wrap items-center justify-end gap-4 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-950 font-semibold">
        <span>
          Total TDS Payable: <strong className="text-rose-700 ml-1 text-sm">{money(totals.tdsPayable)}</strong>
        </span>
      </div>
    </div>
  );
}
