import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, BarChart3, Calendar, ChevronDown, FileSpreadsheet, Percent, Printer, RefreshCw, ShoppingCart, Tag, TrendingUp } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../../services/api";
import ReportPagination from "../../../components/reports/ReportPagination";
import ReportAnalyticsView from "../../../components/reports/ReportAnalyticsView";

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
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
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

  const analyticsRows = useMemo(
    () =>
      (rows || []).map((r) => ({
        date: "",
        group: r.item_name || "General",
        value: Number(r.total_discount_amount) || 0,
        count: 1,
      })),
    [rows]
  );

  const exportExcel = () => {
    const data = [["Item Wise Discount"], [`Period: ${displayDate(formatDate(startDate))} to ${displayDate(formatDate(endDate))}`], [`Company: ${companyName}`], [], ["#", "ITEM NAME", "TOTAL QTY SOLD", "TOTAL SALE AMOUNT", "TOTAL DISC. AMOUNT", "AVG. DISC. (%)"], ...rows.map((row, index) => [index + 1, row.item_name, row.total_qty_sold, row.total_sale_amount, row.total_discount_amount, row.avg_discount_percent])];
    const sheet = XLSX.utils.aoa_to_sheet(data);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Item Wise Discount");
    const buffer = XLSX.write(book, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "Item_Wise_Discount.xlsx");
  };

  const print = () => {
    const body = rows.map((row, index) => `<tr><td class="c">${index + 1}</td><td>${row.item_name || "-"}</td><td class="r">${number(row.total_qty_sold)}</td><td class="r">${money(row.total_sale_amount)}</td><td class="r">${money(row.total_discount_amount)}</td><td class="r">${number(row.avg_discount_percent)}%</td></tr>`).join("");
    const element = document.createElement("div");
    element.innerHTML = `<h2>Item Wise Discount</h2><table><thead><tr><th class="c">#</th><th>ITEM NAME</th><th class="r">TOTAL QTY SOLD</th><th class="r">TOTAL SALE AMOUNT</th><th class="r">TOTAL DISC. AMOUNT</th><th class="r">AVG. DISC. (%)</th></tr></thead><tbody>${body}</tbody></table><p><strong>Summary</strong></p><p>Total Sale Amount: ${money(totals.total_sale_amount)}</p><p>Total Discount amount: ${money(totals.total_discount_amount)}</p>`;
    printReport(element);
  };

  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedRows = rows.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto text-slate-800 font-sans">
      {/* Header & Export Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            <span>Sales Reports</span>
            <span>•</span>
            <span>Discounts & Concessions</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            Item Wise Discount
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Audit total discounts offered per item, sales value, and average discount percentages
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
              <div className="absolute right-0 top-[calc(100%+4px)] min-w-[200px] bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1 max-h-56 overflow-y-auto">
                {companies.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCompanyId(Number(c.id));
                      setCompanyName(c.company_name || "My Company");
                      setCompanyOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 font-medium cursor-pointer transition-colors"
                  >
                    {c.company_name || "My Company"}
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
          <button
            type="button"
            onClick={() => setAnalyticsOpen(true)}
            disabled={!rows.length}
            title="Open Analytics"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <BarChart3 size={16} />
            <span>Analytics</span>
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-xs border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Period selector */}
          <div ref={periodRef} className="relative">
            <button
              onClick={() => setPeriodOpen((v) => !v)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50/80 text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <span>{PERIODS.find((p) => p.value === period)?.label || "Custom"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {periodOpen && (
              <div className="absolute left-0 top-[calc(100%+4px)] min-w-[150px] bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1">
                {PERIODS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => {
                      setPeriod(p.value);
                      setRange(dateRange(p.value));
                      setPeriodOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 font-medium cursor-pointer transition-colors"
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
              value={formatDate(startDate)}
              onChange={(e) => {
                setRange({ from: parseDate(e.target.value), to: endDate });
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
              value={formatDate(endDate)}
              onChange={(e) => {
                setRange({ from: startDate, to: parseDate(e.target.value) });
                setPeriod("custom");
              }}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
            />
          </div>

          {/* Item Name Input */}
          <input
            type="text"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="Filter item name..."
            className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/80 text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-40"
          />

          {/* Category */}
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(Number(e.target.value))}
            className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/80 text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
          >
            <option value={0}>All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Subcategory */}
          <select
            value={subcategoryId}
            onChange={(e) => setSubcategoryId(Number(e.target.value))}
            className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/80 text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
          >
            <option value={0}>All Subcategories</option>
            {subcategories.map((sc) => (
              <option key={sc.id} value={sc.id}>{sc.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setReloadKey((k) => k + 1)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl transition-all cursor-pointer ml-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Summary Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
            <Tag className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Discounted Items</div>
            <div className="text-xl font-black text-slate-800 mt-0.5">{rows.length}</div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Products with discounts</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Total Qty Sold</div>
            <div className="text-xl font-black text-blue-600 mt-0.5">
              {number(rows.reduce((sum, r) => sum + Number(r.total_qty_sold || 0), 0))}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Units sold in period</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Total Sale Amount</div>
            <div className="text-xl font-black text-emerald-600 mt-0.5">
              {money(totals.total_sale_amount)}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Gross sales value</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
            <Percent className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Total Discount Given</div>
            <div className="text-xl font-black text-rose-600 mt-0.5">
              {money(totals.total_discount_amount)}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Net concessions granted</div>
          </div>
        </div>
      </div>

      {/* Modern Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75">
                <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-center w-12">#</th>
                <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left">Item Name</th>
                <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Total Qty Sold</th>
                <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Total Sale Amount</th>
                <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Total Disc. Amount</th>
                <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Avg. Disc. (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-slate-400 font-medium">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading discount report...
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
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-slate-400 font-medium">
                    No items with discounts found for the selected filters.
                  </td>
                </tr>
              ) : (
                pagedRows.map((row, index) => (
                  <tr key={row.id || index} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 text-center text-slate-400 font-medium">
                      {(safePage - 1) * rowsPerPage + index + 1}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {row.item_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-600">
                      {number(row.total_qty_sold)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                      {money(row.total_sale_amount)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-rose-600">
                      {money(row.total_discount_amount)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-700">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-rose-50 border border-rose-100 text-rose-700">
                        {number(row.avg_discount_percent)}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && !error && rows.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50/90 font-bold text-slate-800 text-xs">
                <tr>
                  <td colSpan={3} className="px-4 py-3 uppercase tracking-wider font-extrabold text-slate-900">Total</td>
                  <td className="px-4 py-3 text-right font-extrabold text-slate-900">{money(totals.total_sale_amount)}</td>
                  <td className="px-4 py-3 text-right font-extrabold text-rose-700">{money(totals.total_discount_amount)}</td>
                  <td className="px-4 py-3"></td>
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
      {analyticsOpen && (
        <ReportAnalyticsView
          title="Item Wise Discount Analytics"
          subtitle={`${analyticsRows.length} records`}
          rows={analyticsRows}
          symbol="₹"
          groupLabel="Items"
          onClose={() => setAnalyticsOpen(false)}
        />
      )}
    </div>
  );
}
