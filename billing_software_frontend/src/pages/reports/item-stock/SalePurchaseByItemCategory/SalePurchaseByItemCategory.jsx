import { useEffect, useState, useMemo } from "react";
import { AlertCircle, BarChart3, Calendar, FileSpreadsheet, Printer, RefreshCw, Users, Layers, TrendingUp, ShoppingCart } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../../../services/api";
import ReportPagination from "../../../../components/reports/ReportPagination";
import SalePurchaseByItemCategoryAnalytics from "./SalePurchaseByItemCategoryAnalytics";

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
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState("report");

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

  const analyticsRows = useMemo(
    () =>
      (rows || []).map((r) => ({
        date: "",
        group: r.item_category || "General",
        value: Number(r.total_sale_amount || 0) + Number(r.total_purchase_amount || 0),
        count: 1,
      })),
    [rows]
  );

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

  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedRows = rows.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto text-slate-800 font-sans">
      {viewMode === "analytics" ? (
        <SalePurchaseByItemCategoryAnalytics
          rows={analyticsRows}
          period={`Party: ${party.label} | ${formatDisplayDate(formatDateISO(startDate))} → ${formatDisplayDate(formatDateISO(endDate))}`}
          onClose={() => setViewMode("report")}
        />
      ) : (
        <>
      {/* Header & Export Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            <span>Inventory Reports</span>
            <span>•</span>
            <span>Category Performance</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            Sale / Purchase by Item Category
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Category-level analysis of sales volume, purchase quantities, and transaction values
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExcel}
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
          <button
            type="button"
            onClick={() => setViewMode("analytics")}
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
          {/* Party Filter */}
          <div className="flex items-center gap-2 bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
            <Users className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Party:</span>
            <select
              value={`${party.type}:${party.id}`}
              onChange={(event) => {
                const [type, id] = event.target.value.split(":");
                const selected = parties.find((option) => option.type === type && String(option.id) === id);
                setParty(selected || { id: 0, type: "", label: "All Parties" });
              }}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer max-w-[200px]"
            >
              <option value=":0">All Parties</option>
              {parties.map((option) => (
                <option key={`${option.type}-${option.id}`} value={`${option.type}:${option.id}`}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div className="flex items-center gap-2 bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">From:</span>
            <input
              type="date"
              value={formatDateISO(startDate)}
              onChange={(event) => setRange({ from: parseDateISO(event.target.value), to: endDate })}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
            />
          </div>

          {/* To Date */}
          <div className="flex items-center gap-2 bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">To:</span>
            <input
              type="date"
              value={formatDateISO(endDate)}
              onChange={(event) => setRange({ from: startDate, to: parseDateISO(event.target.value) })}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
            />
          </div>
        </div>

        <button
          onClick={() => setReloadKey((key) => key + 1)}
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
            <Layers className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Categories</div>
            <div className="text-xl font-black text-slate-800 mt-0.5">{rows.length}</div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Active item groups</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Total Sale Amount</div>
            <div className="text-xl font-black text-emerald-600 mt-0.5">
              {formatCurrency(totals.total_sale_amount)}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">
              Qty: {formatQuantity(totals.sale_quantity)}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-6 h-6 text-violet-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Total Purchase Amount</div>
            <div className="text-xl font-black text-violet-600 mt-0.5">
              {formatCurrency(totals.total_purchase_amount)}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">
              Qty: {formatQuantity(totals.purchase_quantity)}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Gross Margin Volume</div>
            <div className="text-xl font-black text-slate-800 mt-0.5">
              {formatCurrency((totals.total_sale_amount || 0) - (totals.total_purchase_amount || 0))}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Sale vs purchase difference</div>
          </div>
        </div>
      </div>

      {/* Modern Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75">
                {COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    className={`px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 ${
                      column.right ? "text-right" : "text-left"
                    }`}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-4 py-16 text-center text-slate-400 font-medium">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading category report...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-4 py-12 text-center text-rose-500 font-medium">
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
                  <td colSpan={COLUMNS.length} className="px-4 py-16 text-center text-slate-400 font-medium">
                    No data available for the selected filters.
                  </td>
                </tr>
              ) : (
                pagedRows.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {row.item_category || "Uncategorized"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-600">
                      {formatQuantity(row.sale_quantity)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">
                      {formatCurrency(row.total_sale_amount)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-600">
                      {formatQuantity(row.purchase_quantity)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-violet-600">
                      {formatCurrency(row.total_purchase_amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && !error && rows.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50/90 font-bold text-slate-800 text-xs">
                <tr>
                  <td className="px-4 py-3 uppercase tracking-wider font-extrabold text-slate-900">Total</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">{formatQuantity(totals.sale_quantity)}</td>
                  <td className="px-4 py-3 text-right font-extrabold text-emerald-700">{formatCurrency(totals.total_sale_amount)}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">{formatQuantity(totals.purchase_quantity)}</td>
                  <td className="px-4 py-3 text-right font-extrabold text-violet-700">{formatCurrency(totals.total_purchase_amount)}</td>
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
</>
      )}
    </div>
  );
}
