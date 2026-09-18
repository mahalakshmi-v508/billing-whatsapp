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

const auth = () => {
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
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const periodRange = (period) => {
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
  doc.write(`<html><head><title>Form No. 27EQ</title><style>body{font-family:Arial,sans-serif;padding:22px;color:#1e1b4b}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #dbe2ec;padding:6px}th{background:#f2f4f7}td.r,th.r{text-align:right}.totals{text-align:right;margin-top:16px;line-height:1.8;font-size:11px}</style></head><body>${element.innerHTML}</body></html>`);
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

export default function FormNo27EQ() {
  const { adminId } = auth();
  const initial = periodRange("This Month");
  const [period, setPeriod] = useState("This Month");
  const [fromDate, setFromDate] = useState(initial.from);
  const [toDate, setToDate] = useState(initial.to);
  const [companyId, setCompanyId] = useState(Number(localStorage.getItem("selected_company_id") || 0) || null);
  const [companyName, setCompanyName] = useState("My Company");
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
      .then((res) => {
        const list = res.data?.status ? res.data.data || [] : [];
        setCompanies(list);
        const saved = localStorage.getItem("selected_company_id");
        const chosen = list.find((company) => String(company.id) === String(saved)) || list[0];
        if (chosen) {
          setCompanyId(Number(chosen.id));
          setCompanyName(chosen.company_name || "My Company");
        }
      })
      .catch(() => setError("Failed to load companies."));
  }, [adminId]);

  useEffect(() => {
    if (!companyId) return undefined;
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      api
        .get("/report/form-27eq", {
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
          else setError(res.data?.message || "Failed to load Form No. 27EQ.");
        })
        .catch(() => {
          if (active) setError("Failed to load Form No. 27EQ.");
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
      [row.party_name, row.invoice_no, row.tax_name].some((field) =>
        String(field || "").toLowerCase().includes(value)
      )
    );
  }, [rows, query]);

  const filteredTotals = useMemo(
    () => ({
      sale_with_tcs: filteredRows.reduce((sum, row) => sum + Number(row.total_value || 0), 0),
      tcs: filteredRows.reduce((sum, row) => sum + Number(row.tcs || 0), 0),
    }),
    [filteredRows]
  );

  const totalRows = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedStart = (safePage - 1) * rowsPerPage;
  const pagedRows = filteredRows.slice(pagedStart, pagedStart + rowsPerPage);

  const selectPeriod = (value) => {
    setPeriod(value);
    const range = periodRange(value);
    setFromDate(range.from);
    setToDate(range.to);
  };

  const exportExcel = () => {
    const data = [
      ["Form No. 27EQ (TCS Report)"],
      [`From: ${iso(fromDate)} To: ${iso(toDate)}`],
      [`Company: ${companyName}`],
      [],
      ["#", "Party Name", "Invoice No.", "Total Value", "Amount Received", "Total Tax", "Date", "Tax Name", "Tax %", "Collection", "TCS"],
      ...filteredRows.map((row, index) => [
        index + 1,
        row.party_name,
        row.invoice_no,
        row.total_value,
        row.amount_received,
        row.total_tax,
        row.date,
        row.tax_name,
        row.tax_percent,
        row.collection,
        row.tcs,
      ]),
      [],
      ["", "Total Sale With TCS", filteredTotals.sale_with_tcs],
      ["", "Total TCS", filteredTotals.tcs],
    ];
    const sheet = XLSX.utils.aoa_to_sheet(data);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Form No. 27EQ");
    const buffer = XLSX.write(book, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "Form_No_27EQ.xlsx");
  };

  const print = () => {
    const body = filteredRows
      .map(
        (row, index) =>
          `<tr><td>${index + 1}</td><td>${row.party_name}</td><td>${row.invoice_no}</td><td class="r">${money(row.total_value)}</td><td class="r">${money(row.amount_received)}</td><td class="r">${money(row.total_tax)}</td><td>${row.date}</td><td>${row.tax_name}</td><td class="r">${row.tax_percent}%</td><td class="r">${money(row.collection)}</td><td class="r">${money(row.tcs)}</td></tr>`
      )
      .join("");
    const element = document.createElement("div");
    element.innerHTML = `<h2>Form No. 27EQ</h2><p>From ${iso(fromDate)} To ${iso(toDate)} | ${companyName}</p><table><thead><tr><th>#</th><th>PARTY NAME</th><th>INVOICE NO.</th><th class="r">TOTAL VALUE</th><th class="r">AMOUNT RECEIVED</th><th class="r">TOTAL TAX</th><th>DATE</th><th>TAX NAME</th><th class="r">TAX %</th><th class="r">COLLECTION</th><th class="r">TCS</th></tr></thead><tbody>${body}</tbody></table><div class="totals">Total Sale With TCS: ${money(filteredTotals.sale_with_tcs)}<br/>Total TCS: ${money(filteredTotals.tcs)}</div>`;
    printReport(element);
  };

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
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Form No. 27EQ</h1>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                Tax Collected at Source (TCS) quarterly statement & transaction audit
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
              onChange={(e) => selectPeriod(e.target.value)}
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
              placeholder="Search party, invoice, tax..."
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
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Total Invoices</div>
            <div className="text-xl font-black text-slate-800 mt-0.5">{filteredRows.length}</div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">TCS applicable bills</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Sale with TCS</div>
            <div className="text-xl font-black text-emerald-600 mt-0.5">
              {money(filteredTotals.sale_with_tcs)}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Total eligible value</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
            <Percent className="w-6 h-6 text-violet-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">TCS Collected</div>
            <div className="text-xl font-black text-violet-600 mt-0.5">
              {money(filteredTotals.tcs)}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Form 27EQ tax pool</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
            <Receipt className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Avg TCS Rate</div>
            <div className="text-xl font-black text-amber-600 mt-0.5">
              {filteredRows.length > 0 && filteredTotals.sale_with_tcs > 0
                ? ((filteredTotals.tcs / filteredTotals.sale_with_tcs) * 100).toFixed(2)
                : "0.00"}
              %
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Effective collection %</div>
          </div>
        </div>
      </div>

      {/* Modern Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75">
                {[
                  "#",
                  "PARTY NAME",
                  "INVOICE NO.",
                  "TOTAL VALUE",
                  "AMOUNT RECEIVED",
                  "TOTAL TAX",
                  "DATE",
                  "TAX NAME",
                  "TAX %",
                  "COLLECTION",
                  "TCS",
                ].map((label, index) => (
                  <th
                    key={label}
                    className={`px-3.5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 ${
                      index === 0
                        ? "text-center w-12"
                        : [3, 4, 5, 8, 9, 10].includes(index)
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
                  <td colSpan={11} className="px-4 py-16 text-center text-slate-400 font-medium">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading Form No. 27EQ records...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-rose-500 font-medium">
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
                  <td colSpan={11} className="px-4 py-16 text-center text-slate-400 font-medium">
                    No data is available for Form No. 27EQ.
                    <br />
                    <span className="text-[11px] text-slate-400 mt-1 block">Please try again after making relevant changes.</span>
                  </td>
                </tr>
              ) : (
                pagedRows.map((row, index) => (
                  <tr key={`${row.invoice_no}-${row.date}-${index}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3.5 py-3 text-center font-semibold text-slate-400">{pagedStart + index + 1}</td>
                    <td className="px-3.5 py-3 font-semibold text-slate-800">{row.party_name}</td>
                    <td className="px-3.5 py-3 font-mono font-medium text-slate-600">{row.invoice_no}</td>
                    <td className="px-3.5 py-3 text-right font-semibold text-slate-800">{money(row.total_value)}</td>
                    <td className="px-3.5 py-3 text-right font-medium text-slate-600">{money(row.amount_received)}</td>
                    <td className="px-3.5 py-3 text-right font-medium text-slate-600">{money(row.total_tax)}</td>
                    <td className="px-3.5 py-3 text-slate-500 whitespace-nowrap">{row.date}</td>
                    <td className="px-3.5 py-3 text-slate-700">{row.tax_name}</td>
                    <td className="px-3.5 py-3 text-right font-bold text-slate-600">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                        {row.tax_percent}%
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-right font-medium text-slate-700">{money(row.collection)}</td>
                    <td className="px-3.5 py-3 text-right font-bold text-indigo-600">{money(row.tcs)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && !error && filteredRows.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50/90 font-bold text-slate-800 text-xs">
                <tr>
                  <td colSpan={3} className="px-3.5 py-3.5 uppercase tracking-wider font-extrabold text-slate-900">
                    Total
                  </td>
                  <td className="px-3.5 py-3.5 text-right font-extrabold text-slate-900">{money(filteredTotals.sale_with_tcs)}</td>
                  <td colSpan={6} className="px-3.5 py-3.5"></td>
                  <td className="px-3.5 py-3.5 text-right font-extrabold text-indigo-600">{money(filteredTotals.tcs)}</td>
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
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-950 font-semibold">
        <span>
          Total Sale With TCS: <strong className="text-indigo-900 ml-1">{money(filteredTotals.sale_with_tcs)}</strong>
        </span>
        <span>
          Total TCS: <strong className="text-indigo-900 ml-1">{money(filteredTotals.tcs)}</strong>
        </span>
      </div>
    </div>
  );
}
