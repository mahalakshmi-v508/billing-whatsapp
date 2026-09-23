import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import api from "../../../services/api";
import { getCurrencySymbol } from "../../../utils/expenseDocument";
import { Calendar, ChevronDown, FileSpreadsheet, Printer, Search, Package, ShoppingCart, DollarSign, X, BarChart3 } from "lucide-react";
import * as XLSX from "xlsx";
import ReportPagination from "../../../components/reports/ReportPagination";
import { showToast } from "../../../utils/reportToast";
import SaleOrderItemAnalytics from "./SaleOrderItemAnalytics";

const toInputDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const TODAY = new Date();
const FIRST_OF_MONTH = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);

const ORDER_TYPES = [
  { value: "sale_order", label: "Sale Order" },
  { value: "purchase_order", label: "Purchase Order" },
];

const STATUSES = [
  { value: "all", label: "All Status" },
  { value: "open", label: "Open Orders" },
  { value: "pending", label: "Partial Open Orders" },
  { value: "paid", label: "Close Orders" },
];

function matchesStatus(line, filter) {
  if (filter === "all") return true;
  const bal = line.balance;
  const adv = line.advance;
  if (filter === "paid") return bal === 0;
  if (filter === "open") return bal > 0 && adv === 0;
  if (filter === "pending") return bal > 0 && adv > 0;
  return true;
}

const parseNum = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

function parseSaleLine(p) {
  const name = p?.product_name || p?.name || p?.item_name || p?.item || "-";
  const qty = parseNum(p?.qty) || parseNum(p?.quantity) || 1;
  const price = parseNum(p?.price) || parseNum(p?.unit_price);
  let amount = parseNum(p?.amount);
  if (!amount) amount = parseNum(p?.total_amount) || parseNum(p?.line_total) || parseNum(p?.total);
  if (!amount) amount = qty * price;
  return { name: String(name), qty, amount };
}

function parsePurchaseLine(it) {
  const name = it?.product_name || it?.name || "-";
  const qty = parseNum(it?.quantity) || 1;
  let amount = parseNum(it?.total_amount) || parseNum(it?.amount);
  if (!amount) amount = qty * parseNum(it?.price);
  return { name: String(name), qty, amount };
}

export default function SaleOrderItem() {
  const [fromDate, setFromDate] = useState(() => toInputDate(FIRST_OF_MONTH));
  const [toDate, setToDate] = useState(() => toInputDate(TODAY));
  const [orderType, setOrderType] = useState("sale_order");
  const [orderStatus, setOrderStatus] = useState("all");
  const [partyQuery, setPartyQuery] = useState("");
  const [partyResults, setPartyResults] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [symbol, setSymbol] = useState("₹");
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState("report");

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  }, []);
  const adminId = user?.admin_id || user?.id || 0;
  const companyId = useMemo(() => {
    const v = localStorage.getItem("selected_company_id");
    return v ? Number(v) : 0;
  }, []);

  const debounceRef = useRef(null);
  const partyWrapRef = useRef(null);
  const typeRef = useRef(null);
  const statusRef = useRef(null);

  useEffect(() => {
    let m = true;
    getCurrencySymbol(companyId).then((s) => { if (m) setSymbol(s || "₹"); });
    return () => { m = false; };
  }, [companyId]);

  const searchParty = useCallback(async (q) => {
    if (!q || q.length < 1) { setPartyResults([]); return; }
    try {
      if (orderType === "sale_order") {
        const res = await api.get(`/customer/customer_search?admin_id=${adminId}&q=${encodeURIComponent(q)}`);
        setPartyResults(Array.isArray(res?.data?.data) ? res.data.data.map((c) => ({ id: c.id, name: c.name, phone: c.phone || "" })) : []);
      } else {
        const res = await api.get(`/supplier/get_all?company_id=${companyId}`);
        const all = Array.isArray(res?.data?.data) ? res.data.data : [];
        setPartyResults(
          all
            .filter((s) => (s.supplier_name || "").toLowerCase().includes(q.toLowerCase()))
            .map((s) => ({ id: s.id, name: s.supplier_name, phone: s.phone || "" }))
            .slice(0, 10)
        );
      }
    } catch { setPartyResults([]); }
  }, [orderType, adminId, companyId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const flat = [];
      try {
        if (orderType === "sale_order") {
          const params = {
            company_id: companyId || 0,
            from_date: fromDate,
            to_date: toDate,
            payment_method: "all",
            payment_status: "all",
            customer_name: selectedParty?.name || "",
            brand_id: 0,
          };
          const res = await api.get("/invoice/get_filtered_invoices", { params });
          if (cancelled) return;
          const data = Array.isArray(res?.data?.data) ? res.data.data : [];
          data.forEach((r) => {
            const bal = parseNum(r.balance_amount);
            const adv = parseNum(r.paid_amount);
            const items = Array.isArray(r.products) ? r.products : [];
            items.forEach((p) => {
              const parsed = parseSaleLine(p);
              flat.push({
                ...parsed,
                balance: bal,
                advance: adv,
                date: r.created_at,
                customer: r.customer_name,
                orderNo: r.invoice_no,
              });
            });
          });
        } else {
          const params = { company_id: companyId || 0, start_date: fromDate, end_date: toDate };
          if (selectedParty?.id) params.supplier_id = selectedParty.id;
          const listRes = await api.get("/purchase/get_purchases", { params });
          if (cancelled) return;
          const list = Array.isArray(listRes?.data?.data) ? listRes.data.data : [];
          const detailResults = await Promise.all(
            list.map((p) =>
              api.get("/purchase/get_purchase_by_id", { params: { id: p.id } }).catch(() => null)
            )
          );
          if (cancelled) return;
          detailResults.forEach((dr, idx) => {
            const p = list[idx];
            if (!dr?.data?.data) return;
            const bal = parseNum(p.balance_amount);
            const adv = parseNum(p.paid_amount);
            const items = Array.isArray(dr.data.data.items) ? dr.data.data.items : [];
            items.forEach((it) => {
              const parsed = parsePurchaseLine(it);
              flat.push({
                ...parsed,
                balance: bal,
                advance: adv,
                date: p.purchase_date || p.created_at,
                customer: p.supplier_name,
                orderNo: p.purchase_no,
              });
            });
          });
        }
        setLines(flat);
      } catch (err) {
        console.error("Sale order item load error", err);
        if (!cancelled) setLines([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [companyId, fromDate, toDate, orderType, selectedParty]);

  const reportedRows = useMemo(() => {
    const statusLines = orderStatus === "all" ? lines : lines.filter((l) => matchesStatus(l, orderStatus));
    const map = new Map();
    statusLines.forEach((l) => {
      const key = l.name.trim().toLowerCase() || l.name;
      if (!map.has(key)) map.set(key, { name: l.name, qty: 0, amount: 0 });
      const entry = map.get(key);
      entry.qty += l.qty;
      entry.amount += l.amount;
    });
    return Array.from(map.values()).sort(
      (a, b) => b.amount - a.amount || String(a.name).localeCompare(String(b.name))
    );
  }, [lines, orderStatus]);

  const totalQty = useMemo(() => reportedRows.reduce((s, r) => s + r.qty, 0), [reportedRows]);
  const totalAmount = useMemo(() => reportedRows.reduce((s, r) => s + r.amount, 0), [reportedRows]);

  useEffect(() => {
    const handler = (e) => {
      if (partyWrapRef.current && !partyWrapRef.current.contains(e.target)) setPartyResults([]);
      if (typeRef.current && !typeRef.current.contains(e.target)) setTypeDropdownOpen(false);
      if (statusRef.current && !statusRef.current.contains(e.target)) setStatusDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handlePartyInput = (e) => {
    const q = e.target.value;
    setPartyQuery(q);
    if (!q) { setPartyResults([]); setSelectedParty(null); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchParty(q), 300);
  };

  const selectParty = (party) => {
    setSelectedParty(party);
    setPartyQuery(party.name);
    setPartyResults([]);
  };

  const clearParty = () => {
    setSelectedParty(null);
    setPartyQuery("");
    setPartyResults([]);
  };

  const handleExportExcel = () => {
    if (!reportedRows.length) { showToast("No data to export", "warning"); return; }
    const data = reportedRows.map((r) => ({
      "Item Name": r.name,
      Quantity: r.qty,
      Amount: r.amount,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Order Items");
    XLSX.writeFile(wb, `OrderItems_${fromDate}_${toDate}.xlsx`);
  };

  const handlePrint = () => { window.print(); };

  const fmtMoney = (n) =>
    `${symbol}${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const totalRows = reportedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedRows = reportedRows.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto text-slate-800 font-sans">
      {viewMode === "analytics" ? (
        <SaleOrderItemAnalytics
          lines={lines}
          reportedRows={reportedRows}
          totalQty={totalQty}
          totalAmount={totalAmount}
          symbol={symbol}
          fromDate={fromDate}
          toDate={toDate}
          orderType={orderType}
          orderStatus={orderStatus}
          onClose={() => setViewMode("report")}
        />
      ) : (
        <>
          {/* Header Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                <span>Orders & Fulfillment</span>
                <span>•</span>
                <span>Itemized Demand</span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1 tracking-tight">
                Order Items Summary
              </h1>
              <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                Aggregated item-level quantities and order amounts across sales and purchase pipelines
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
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
              <button
                type="button"
                onClick={() => setViewMode("analytics")}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-indigo-200 bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100/80 hover:border-indigo-300 transition-all shadow-2xs cursor-pointer"
                title="Open Analytics View"
              >
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <span>Analytics</span>
              </button>
            </div>
          </div>

      {/* Filter Card */}
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-xs border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Order Type */}
          <div ref={typeRef} className="relative">
            <button
              onClick={() => setTypeDropdownOpen((v) => !v)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50/80 text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <span>{ORDER_TYPES.find((t) => t.value === orderType)?.label}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {typeDropdownOpen && (
              <div className="absolute left-0 top-[calc(100%+4px)] min-w-[150px] bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1">
                {ORDER_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => {
                      setOrderType(t.value);
                      setSelectedParty(null);
                      setPartyQuery("");
                      setTypeDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 font-medium cursor-pointer transition-colors block"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status */}
          <div ref={statusRef} className="relative">
            <button
              onClick={() => setStatusDropdownOpen((v) => !v)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50/80 text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <span>{STATUSES.find((s) => s.value === orderStatus)?.label}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {statusDropdownOpen && (
              <div className="absolute left-0 top-[calc(100%+4px)] min-w-[160px] bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1">
                {STATUSES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => {
                      setOrderStatus(s.value);
                      setStatusDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 font-medium cursor-pointer transition-colors block"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Party Search */}
          <div ref={partyWrapRef} className="relative w-56">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder={orderType === "sale_order" ? "Search customer..." : "Search supplier..."}
                value={partyQuery}
                onChange={handlePartyInput}
                className="w-full pl-8 pr-7 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/80 text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              {partyQuery && (
                <button
                  onClick={clearParty}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {partyResults.length > 0 && (
              <div className="absolute left-0 top-[calc(100%+4px)] w-full bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-56 overflow-y-auto py-1">
                {partyResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => selectParty(p)}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer block border-b border-slate-100 last:border-0"
                  >
                    <div className="font-semibold text-slate-800">{p.name}</div>
                    {p.phone && <div className="text-[10px] text-slate-400">{p.phone}</div>}
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
              onChange={(e) => setFromDate(e.target.value)}
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
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
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
            <div className="text-xl font-black text-slate-800 mt-0.5">{reportedRows.length}</div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Unique products ordered</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Total Quantity</div>
            <div className="text-xl font-black text-blue-600 mt-0.5">
              {Number(totalQty).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Total units demanded</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Total Value</div>
            <div className="text-xl font-black text-emerald-600 mt-0.5">{fmtMoney(totalAmount)}</div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Cumulative item amounts</div>
          </div>
        </div>
      </div>

      {/* Modern Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75">
                <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left">Item Name</th>
                <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Quantity</th>
                <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-16 text-center text-slate-400 font-medium">
                    <Package className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading order items...
                  </td>
                </tr>
              ) : pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-16 text-center text-slate-400 font-medium">
                    No items found for the selected orders.
                  </td>
                </tr>
              ) : (
                pagedRows.map((r, idx) => (
                  <tr key={`${r.name}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800">{r.name}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-600">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                        {Number(r.qty).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">{fmtMoney(r.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && reportedRows.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50/90 font-bold text-slate-800 text-xs">
                <tr>
                  <td className="px-4 py-3 uppercase tracking-wider font-extrabold text-slate-900">Total</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800">
                      {Number(totalQty).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold text-emerald-700">{fmtMoney(totalAmount)}</td>
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
