import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, BarChart3, Calendar, ChevronDown, FileSpreadsheet, Package, Printer, RefreshCw, ShoppingCart, TrendingUp } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../../../services/api";
import ReportPagination from "../../../../components/reports/ReportPagination";
import ItemDetailAnalytics from "./ItemDetailAnalytics";

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
  if (!value) return "-";
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
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState("report");
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

  const totalRows = visibleRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedRows = visibleRows.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const totalSaleQty = useMemo(() => visibleRows.reduce((s, r) => s + Number(r.sale_quantity || 0), 0), [visibleRows]);
  const totalPurchaseQty = useMemo(() => visibleRows.reduce((s, r) => s + Number(r.purchase_quantity || 0), 0), [visibleRows]);
  const latestClosingQty = visibleRows.length > 0 ? visibleRows[visibleRows.length - 1].closing_quantity : 0;

  const analyticsRows = useMemo(
    () => {
      if (!companyId || !itemId) return [];
      return (rows || []).map((r) => ({
        date: r.date || "",
        group: selectedItem?.product_name || "General",
        value: Number(r.closing_quantity) || 0,
        count: 1,
      }));
    },
    [companyId, itemId, rows, selectedItem]
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto text-slate-800 font-sans">
      {viewMode === "analytics" ? (
        <ItemDetailAnalytics
          rows={analyticsRows}
          period={`${formatDisplayDate(formatDateISO(startDate))} → ${formatDisplayDate(formatDateISO(endDate))}`}
          onClose={() => setViewMode("report")}
        />
      ) : (
        <>
      {/* Header & Actions Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            <span>Inventory Reports</span>
            <span>•</span>
            <span>Stock Ledger</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            Item Detail Report
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Detailed daily transactional movement, adjustments, and running stock balance
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
            disabled={!visibleRows.length}
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
          {/* Item Autocomplete */}
          <div ref={itemRef} className="relative w-72">
            <div className="relative">
              <input
                value={itemQuery}
                placeholder="Search & select item..."
                onFocus={() => setItemOpen(true)}
                onChange={(event) => {
                  setItemQuery(event.target.value);
                  setItemOpen(true);
                }}
                className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50/80 text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all pr-8"
              />
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {itemOpen && (
              <div className="absolute left-0 top-[calc(100%+4px)] w-full bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto py-1">
                {filteredItems.length ? (
                  filteredItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => selectItem(item)}
                      className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 font-medium cursor-pointer transition-colors block"
                    >
                      {item.product_name || "Unnamed item"}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-slate-400">No items found</div>
                )}
              </div>
            )}
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

          {/* Hide Inactive Dates Checkbox */}
          <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all">
            <input
              type="checkbox"
              checked={hideInactive}
              onChange={(e) => setHideInactive(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
            />
            <span>Hide inactive dates</span>
          </label>
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
            <Package className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Selected Item</div>
            <div className="text-base font-black text-slate-800 mt-0.5 truncate" title={selectedItem?.product_name || "None"}>
              {selectedItem?.product_name || "Select an Item"}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">{visibleRows.length} activity records</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Total Sale Qty</div>
            <div className="text-xl font-black text-emerald-600 mt-0.5">
              {formatQuantity(totalSaleQty)}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Total units dispatched</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Total Purchase Qty</div>
            <div className="text-xl font-black text-blue-600 mt-0.5">
              {formatQuantity(totalPurchaseQty)}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Total units received</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6 text-violet-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Closing Stock Qty</div>
            <div className="text-xl font-black text-violet-600 mt-0.5">
              {formatQuantity(latestClosingQty)}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Ending inventory on hand</div>
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
                    Loading item details...
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
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-4 py-16 text-center text-slate-400 font-medium">
                    No item details found for the selected period.
                  </td>
                </tr>
              ) : (
                pagedRows.map((row, index) => (
                  <tr key={`${row.date}-${row.is_beginning ? "opening" : index}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {formatDisplayDate(row.date)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600">
                      {formatQuantity(row.sale_quantity)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-blue-600">
                      {row.purchase_label || formatQuantity(row.purchase_quantity)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-600">
                      {formatQuantity(row.adjustment_quantity)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-slate-100 text-slate-800">
                        {formatQuantity(row.closing_quantity)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
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
