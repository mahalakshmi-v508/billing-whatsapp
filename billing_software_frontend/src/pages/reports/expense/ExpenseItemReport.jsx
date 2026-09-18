import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import * as XLSX from "xlsx";
import { getCurrencySymbol, parseRowItems } from "../../../utils/expenseDocument";
import { Calendar, ChevronDown, FileSpreadsheet, Plus, Printer, RefreshCw, Search, Package, TrendingUp, DollarSign } from "lucide-react";
import ReportPagination from "../../../components/reports/ReportPagination";
import { showToast } from "../../../utils/reportToast";

const today = () => new Date();
const firstOfMonth = () => new Date(today().getFullYear(), today().getMonth(), 1);
const toInputDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const PERIOD_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This Week" },
  { value: "last_week", label: "Last Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "custom", label: "Custom" },
];

const getPeriodDates = (value) => {
  const current = today();
  const start = new Date(current);
  const end = new Date(current);

  if (value === "yesterday") {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
  } else if (value === "week" || value === "last_week") {
    const day = current.getDay();
    const mondayOffset = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - mondayOffset - (value === "last_week" ? 7 : 0));
    end.setDate(start.getDate() + 6);
  } else if (value === "year") {
    start.setMonth(0, 1);
    end.setMonth(11, 31);
  } else {
    start.setDate(1);
  }

  return { from: toInputDate(start), to: toInputDate(end) };
};

const formatAmount = (symbol, n) =>
  `${symbol}${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatQty = (n) => `${Number(n || 0)}`;

export default function ExpenseItemReport() {
  const navigate = useNavigate();

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  const adminId = user?.role === "cashier" ? user?.admin_id : user?.id;
  const savedCompanyId = localStorage.getItem("selected_company_id") || user?.company_id || 0;

  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState(savedCompanyId || 0);
  const [symbol, setSymbol] = useState("₹");
  const [period, setPeriod] = useState("month");
  const [periodOpen, setPeriodOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [fromDate, setFromDate] = useState(toInputDate(firstOfMonth()));
  const [toDate, setToDate] = useState(toInputDate(today()));
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    let cancelled = false;
    const loadCompanies = async () => {
      try {
        const res = await api.get(`/company/get_companies_by_admin?admin_id=${adminId || 0}&role=${user?.role || "admin"}`);
        if (cancelled) return;
        const list = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : [];
        setCompanies(list);
        if (!savedCompanyId && list.length > 0) {
          setCompanyId(list[0].id);
          localStorage.setItem("selected_company_id", String(list[0].id));
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Company load error", err);
      }
    };
    loadCompanies();
    return () => {
      cancelled = true;
    };
  }, [adminId, user?.role]);

  useEffect(() => {
    let mounted = true;
    getCurrencySymbol(Number(companyId)).then((s) => {
      if (mounted) setSymbol(s || "₹");
    });
    return () => {
      mounted = false;
    };
  }, [companyId]);

  useEffect(() => {
    let cancelled = false;
    const loadExpenses = async () => {
      setLoading(true);
      try {
        const params = {
          company_id: companyId || 0,
          admin_id: adminId || 0,
          from_date: fromDate,
          to_date: toDate,
        };
        const res = await api.get("/expense/list", { params });
        if (cancelled) return;
        setExpenses(Array.isArray(res?.data?.data) ? res.data.data : []);
      } catch (err) {
        console.error("Expense item report load error", err);
        if (!cancelled) setExpenses([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadExpenses();
    return () => {
      cancelled = true;
    };
  }, [companyId, fromDate, toDate]);

  const handlePeriodChange = (value) => {
    setPeriod(value);
    if (value !== "custom") {
      const dates = getPeriodDates(value);
      setFromDate(dates.from);
      setToDate(dates.to);
    }
    setPeriodOpen(false);
  };

  const itemRows = useMemo(() => {
    const rows = [];
    expenses.forEach((expense) => {
      const items = parseRowItems(expense?.items);
      items.forEach((it) => {
        const name = String(it.item_name || it.name || "").trim();
        if (!name) return;
        const quantity = Number(it.quantity ?? it.qty ?? 0);
        const unitPrice = Number(it.unit_price ?? it.price ?? 0);
        const amount = Number(it.amount ?? it.total_amount ?? "") || quantity * unitPrice;
        rows.push({ key: `${expense.id}-${rows.length}`, item_name: name, unit_price: unitPrice, quantity, amount });
      });
    });
    return rows;
  }, [expenses]);

  const displayedRows = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return itemRows;
    return itemRows.filter((r) => r.item_name.toLowerCase().includes(q));
  }, [itemRows, search]);

  const totals = useMemo(() => {
    let quantity = 0;
    let amount = 0;
    displayedRows.forEach((r) => {
      quantity += Number(r.quantity || 0);
      amount += Number(r.amount || 0);
    });
    return { quantity, amount };
  }, [displayedRows]);

  const selectedCompany = useMemo(
    () => companies.find((c) => Number(c.id) === Number(companyId)) || null,
    [companies, companyId]
  );
  const firmLabel = selectedCompany ? selectedCompany.company_name || selectedCompany.name || "Selected Firm" : "All Firms";

  const handleExportExcel = () => {
    if (!displayedRows.length) {
      showToast("No expense item data available to export.", "warning");
      return;
    }
    const data = displayedRows.map((r) => ({
      "Expense Item": r.item_name,
      "Unit Price": Number(r.unit_price || 0),
      Quantity: Number(r.quantity || 0),
      Amount: Number(r.amount || 0),
    }));
    data.push({
      "Expense Item": "Total",
      "Unit Price": "",
      Quantity: totals.quantity,
      Amount: totals.amount,
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expense Item Report");
    XLSX.writeFile(wb, `ExpenseItemReport_${fromDate}_${toDate}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  const totalRows = displayedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedRows = displayedRows.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto text-slate-800 font-sans">
      {/* Header & Export Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            <span>Expenses & Overheads</span>
            <span>•</span>
            <span>Itemized Procurement</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            Expense Item Report
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Audit specific consumables, unit costs, purchase volumes, and line amounts across expense vouchers
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Company Selector */}
          <div className="relative">
            <button
              onClick={() => setCompanyOpen((v) => !v)}
              className="inline-flex items-center justify-between gap-2 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50/80 text-slate-700 hover:bg-slate-100 transition-all cursor-pointer min-w-[160px]"
            >
              <span className="truncate">{firmLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>
            {companyOpen && (
              <div className="absolute right-0 top-[calc(100%+4px)] min-w-[190px] bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1">
                {companies.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCompanyId(c.id);
                      localStorage.setItem("selected_company_id", String(c.id));
                      setCompanyOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 font-medium cursor-pointer transition-colors block"
                  >
                    {c.company_name || c.name || `Firm ${c.id}`}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => navigate("/purchases/expenses/add")}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-emerald-200 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100/80 hover:border-emerald-300 transition-all shadow-2xs cursor-pointer"
            title="Export Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excel</span>
          </button>
          <button
            onClick={handlePrint}
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
            <button
              onClick={() => setPeriodOpen((v) => !v)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50/80 text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <span>{PERIOD_OPTIONS.find((p) => p.value === period)?.label || "Custom"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {periodOpen && (
              <div className="absolute left-0 top-[calc(100%+4px)] min-w-[150px] bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1">
                {PERIOD_OPTIONS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => handlePeriodChange(p.value)}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 font-medium cursor-pointer transition-colors block"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* From Date */}
          <div className="flex items-center gap-2 bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPeriod("custom");
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
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPeriod("custom");
              }}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
            />
          </div>

          {/* Search Input */}
          <div className="relative w-48 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search expense item..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-8 pr-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/80 text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Distinct Items</div>
            <div className="text-xl font-black text-slate-800 mt-0.5">{displayedRows.length}</div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Purchased item lines</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Total Quantity</div>
            <div className="text-xl font-black text-blue-600 mt-0.5">
              {Number(totals.quantity).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Units consumed</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Total Line Cost</div>
            <div className="text-xl font-black text-rose-600 mt-0.5">{formatAmount(symbol, totals.amount)}</div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Net procurement total</div>
          </div>
        </div>
      </div>

      {/* Modern Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75">
                <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left">Expense Item</th>
                <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Unit Price</th>
                <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Quantity</th>
                <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-16 text-center text-slate-400 font-medium">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading expense items...
                  </td>
                </tr>
              ) : displayedRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-16 text-center text-slate-400 font-medium">
                    No expense item records found for the selected period.
                  </td>
                </tr>
              ) : (
                pagedRows.map((r) => (
                  <tr key={r.key} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800">{r.item_name}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-600">{formatAmount(symbol, r.unit_price)}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-600">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                        {formatQty(r.quantity)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-rose-600">{formatAmount(symbol, r.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && displayedRows.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50/90 font-bold text-slate-800 text-xs">
                <tr>
                  <td colSpan={2} className="px-4 py-3 uppercase tracking-wider font-extrabold text-slate-900">Total</td>
                  <td className="px-4 py-3 text-right font-extrabold text-slate-900">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800">
                      {formatQty(totals.quantity)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold text-rose-700">{formatAmount(symbol, totals.amount)}</td>
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
