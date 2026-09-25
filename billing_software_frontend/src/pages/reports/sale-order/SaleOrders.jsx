import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import api from "../../../services/api";
import { getCurrencySymbol } from "../../../utils/expenseDocument";
import { Calendar, ChevronDown, FileSpreadsheet, Printer, Search, ShoppingBag, DollarSign, Clock, CheckCircle2, AlertCircle, X, BarChart3 } from "lucide-react";
import * as XLSX from "xlsx";
import ReportPagination from "../../../components/reports/ReportPagination";
import { showToast } from "../../../utils/reportToast";
import SaleOrdersAnalytics from "./SaleOrdersAnalytics";

const toInputDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const TODAY = new Date();
const FIRST_OF_MONTH = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);

const fmtDate = (d) => {
  if (!d || d === "-") return "-";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return String(d); }
};

const ORDER_TYPES = [
  { value: "sale_order", label: "Sale Order" },
  { value: "purchase_order", label: "Purchase Order" },
];

const ORDER_STATUSES = [
  { value: "all", label: "All Orders" },
  { value: "open", label: "Open Orders" },
  { value: "pending", label: "Partial Open Orders" },
  { value: "paid", label: "Close Orders" },
];

function matchesStatus(o, filter) {
  if (filter === "all") return true;
  const bal = o.balance;
  const adv = o.advance;
  if (filter === "paid") return bal === 0;
  if (filter === "open") return bal > 0 && adv === 0;
  if (filter === "pending") return bal > 0 && adv > 0;
  return true;
}

export default function SaleOrders() {
  const [fromDate, setFromDate] = useState(() => toInputDate(FIRST_OF_MONTH));
  const [toDate, setToDate] = useState(() => toInputDate(TODAY));
  const [orderType, setOrderType] = useState("sale_order");
  const [orderStatus, setOrderStatus] = useState("all");
  const [partyQuery, setPartyQuery] = useState("");
  const [partyResults, setPartyResults] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);
  const [orders, setOrders] = useState([]);
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
          setOrders(
            data.map((r) => ({
              date: r.created_at,
              orderNo: r.invoice_no || "-",
              name: r.customer_name || "-",
              dueDate: r.due_date || "-",
              status: r.payment_status || "not_paid",
              type: "Sale Order",
              total: parseFloat(r.total_amount) || 0,
              advance: parseFloat(r.paid_amount) || 0,
              balance: parseFloat(r.balance_amount) || 0,
            }))
          );
        } else {
          const params = { company_id: companyId || 0, start_date: fromDate, end_date: toDate };
          if (selectedParty?.id) params.supplier_id = selectedParty.id;
          const res = await api.get("/purchase/get_purchases", { params });
          if (cancelled) return;
          const data = Array.isArray(res?.data?.data) ? res.data.data : [];
          setOrders(
            data.map((r) => {
              const bal = parseFloat(r.balance_amount) || 0;
              const adv = parseFloat(r.paid_amount) || 0;
              let status = "paid";
              if (bal > 0) status = adv > 0 ? "pending" : "not_paid";
              return {
                date: r.purchase_date || r.created_at,
                orderNo: r.purchase_no || "-",
                name: r.supplier_name || "-",
                dueDate: "-",
                status,
                type: "Purchase Order",
                total: parseFloat(r.total_amount) || 0,
                advance: adv,
                balance: bal,
              };
            })
          );
        }
      } catch (err) {
        console.error("Sale order load error", err);
        if (!cancelled) setOrders([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [companyId, fromDate, toDate, orderType, selectedParty]);

  const filteredOrders = useMemo(() => {
    if (orderStatus === "all") return orders;
    return orders.filter((o) => matchesStatus(o, orderStatus));
  }, [orders, orderStatus]);

  const totalAmount = useMemo(
    () => filteredOrders.reduce((s, o) => s + o.total, 0),
    [filteredOrders]
  );
  const totalAdvance = useMemo(
    () => filteredOrders.reduce((s, o) => s + (o.advance || 0), 0),
    [filteredOrders]
  );
  const totalBalance = useMemo(
    () => filteredOrders.reduce((s, o) => s + (o.balance || 0), 0),
    [filteredOrders]
  );

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
    if (!filteredOrders.length) { showToast("No data to export", "warning"); return; }
    const data = filteredOrders.map((o) => ({
      Date: fmtDate(o.date),
      "Order No.": o.orderNo,
      Name: o.name,
      "Due Date": fmtDate(o.dueDate),
      Status: o.status,
      Type: o.type,
      Total: o.total,
      Advance: o.advance,
      Balance: o.balance,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, `Orders_${fromDate}_${toDate}.xlsx`);
  };

  const handlePrint = () => { window.print(); };

  const fmtMoney = (n) =>
    `${symbol}${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const totalRows = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedOrders = filteredOrders.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const getStatusBadge = (status) => {
    if (status === "paid") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" /> Paid
        </span>
      );
    }
    if (status === "pending") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3" /> Partial
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
        <AlertCircle className="w-3 h-3" /> Unpaid
      </span>
    );
  };

  return (
    <div className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 space-y-3.5 max-w-[1600px] mx-auto text-slate-800 font-sans">
      {viewMode === "analytics" ? (
        <SaleOrdersAnalytics
          orders={filteredOrders}
          symbol={symbol}
          fromDate={fromDate}
          toDate={toDate}
          orderType={orderType}
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
                <span>{orderType === "sale_order" ? "Sales Pipeline" : "Procurement"}</span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1 tracking-tight">
                {orderType === "sale_order" ? "Sale Orders Report" : "Purchase Orders Report"}
              </h1>
              <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                Monitor fulfillment stages, advances paid/received, and outstanding order balances
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
          {/* Order Type Selector */}
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

          {/* Order Status Selector */}
          <div ref={statusRef} className="relative">
            <button
              onClick={() => setStatusDropdownOpen((v) => !v)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50/80 text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <span>{ORDER_STATUSES.find((s) => s.value === orderStatus)?.label}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {statusDropdownOpen && (
              <div className="absolute left-0 top-[calc(100%+4px)] min-w-[160px] bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1">
                {ORDER_STATUSES.map((s) => (
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Total Orders</div>
            <div className="text-xl font-black text-slate-800 mt-0.5">{filteredOrders.length}</div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Matching filter criteria</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Total Order Value</div>
            <div className="text-xl font-black text-emerald-600 mt-0.5">{fmtMoney(totalAmount)}</div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Gross contracted sum</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Advance Settled</div>
            <div className="text-xl font-black text-blue-600 mt-0.5">{fmtMoney(totalAdvance)}</div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Deposit / paid upfront</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Balance Pending</div>
            <div className="text-xl font-black text-amber-600 mt-0.5">{fmtMoney(totalBalance)}</div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">To be collected/paid</div>
          </div>
        </div>
      </div>

      {/* Modern Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75">
                <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left">Date</th>
                <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left">Order No.</th>
                <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left">Party Name</th>
                <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left">Due Date</th>
                <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-center">Status</th>
                <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Total Amount</th>
                <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Advance</th>
                <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-slate-400 font-medium">
                    <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading orders...
                  </td>
                </tr>
              ) : pagedOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-slate-400 font-medium">
                    No orders found for the selected period.
                  </td>
                </tr>
              ) : (
                pagedOrders.map((o, idx) => (
                  <tr key={`${o.orderNo}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-600">{fmtDate(o.date)}</td>
                    <td className="px-4 py-3 font-bold text-indigo-600">{o.orderNo}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{o.name}</td>
                    <td className="px-4 py-3 text-slate-500">{fmtDate(o.dueDate)}</td>
                    <td className="px-4 py-3 text-center">{getStatusBadge(o.status)}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{fmtMoney(o.total)}</td>
                    <td className="px-4 py-3 text-right font-medium text-blue-600">{fmtMoney(o.advance)}</td>
                    <td className="px-4 py-3 text-right font-bold text-amber-600">{fmtMoney(o.balance)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && filteredOrders.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50/90 font-bold text-slate-800 text-xs">
                <tr>
                  <td colSpan={5} className="px-4 py-3 uppercase tracking-wider font-extrabold text-slate-900">Total</td>
                  <td className="px-4 py-3 text-right font-extrabold text-slate-900">{fmtMoney(totalAmount)}</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-700">{fmtMoney(totalAdvance)}</td>
                  <td className="px-4 py-3 text-right font-extrabold text-amber-700">{fmtMoney(totalBalance)}</td>
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
