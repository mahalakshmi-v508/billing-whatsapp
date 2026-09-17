import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import * as XLSX from "xlsx";
import {
  Plus,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Search,
  Printer,
  Share2,
  MoreVertical,
  Filter,
  Eye,
  Trash2,
  Edit,
  AlertTriangle,
  X,
  RefreshCw,
  DollarSign,
  CreditCard,
  Percent,
  SlidersHorizontal,
  CheckCircle2,
  User,
  FileText,
} from "lucide-react";
import AddPaymentInModal from "./AddPaymentInModal";
import ShareTransactionPopover from "../../../components/ShareTransactionPopover";
import HeaderSettingsButton from "../../../components/HeaderSettingsButton";
import CommonTableColumnSettings from "../../../components/CommonTableColumnSettings";
import useTableColumns from "../../../hooks/useTableColumns";

const DEFAULT_COLUMNS = [
  { key: "date", label: "Date", icon: Calendar, color: "text-blue-600", bg: "bg-blue-50", desc: "Payment receipt date" },
  { key: "ref_no", label: "Ref No", icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50", desc: "Reference / receipt number" },
  { key: "party_name", label: "Party Name", icon: User, color: "text-violet-600", bg: "bg-violet-50", desc: "Customer or party name" },
  { key: "total_amount", label: "Total Amount", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50", desc: "Total invoice or voucher amount" },
  { key: "received", label: "Received", icon: DollarSign, color: "text-teal-600", bg: "bg-teal-50", desc: "Amount paid/received" },
  { key: "discount", label: "Discount", icon: Percent, color: "text-amber-600", bg: "bg-amber-50", desc: "Discount amount" },
  { key: "balance", label: "Balance", icon: DollarSign, color: "text-rose-600", bg: "bg-rose-50", desc: "Remaining balance" },
  { key: "payment_type", label: "Payment Type", icon: CreditCard, color: "text-purple-600", bg: "bg-purple-50", desc: "Mode of payment (Cash, Bank, etc.)" },
  { key: "status", label: "Status", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", desc: "Payment status (Paid / Partial)" },
  { key: "actions", label: "Actions", icon: SlidersHorizontal, color: "text-slate-600", bg: "bg-slate-100", desc: "View, Print, Share, Delete" },
];

export default function PaymentIn() {
  const navigate = useNavigate();
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  const adminId = user?.role === "cashier" ? user?.admin_id : user?.id;

  // Data states
  const [payments, setPayments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [period, setPeriod] = useState("this_month");
  const [periodOpen, setPeriodOpen] = useState(false);
  const [selectedFirm, setSelectedFirm] = useState("all");
  const [firmOpen, setFirmOpen] = useState(false);

  // Date range
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Search & view toggles
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [activeShareId, setActiveShareId] = useState(null);

  // Modals & toast states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionToast, setActionToast] = useState(null);

  // Column Customization Drawer state & persistence
  const {
    visibleColumns,
    toggleColumn,
    selectAllColumns,
    resetDefaultColumns,
    showColumnDrawer,
    setShowColumnDrawer,
    visibleColumnCount,
  } = useTableColumns("payment_in_columns", DEFAULT_COLUMNS);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const menuRef = useRef(null);

  // Helper: Format DD/MM/YYYY
  const formatDateDMY = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Preset Date Helper
  const setPresetDates = (type) => {
    const now = new Date();
    let from = new Date();
    let to = new Date();

    if (type === "all_time" || type === "all") {
      setFromDate("");
      setToDate("");
      setPeriod("all_time");
      setPeriodOpen(false);
      return;
    }

    if (type === "today") {
      from = now;
      to = now;
    } else if (type === "this_week") {
      const day = now.getDay() || 7;
      from.setDate(now.getDate() - day + 1);
      to = now;
    } else if (type === "this_month") {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (type === "this_quarter") {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      from = new Date(now.getFullYear(), qMonth, 1);
      to = new Date(now.getFullYear(), qMonth + 3, 0);
    } else if (type === "this_year") {
      from = new Date(now.getFullYear(), 0, 1);
      to = new Date(now.getFullYear(), 11, 31);
    }

    const fmt = (d) => d.toISOString().split("T")[0];
    setFromDate(fmt(from));
    setToDate(fmt(to));
    setPeriod(type);
    setPeriodOpen(false);
  };

  // Initial Load: Companies & Date Range
  useEffect(() => {
    setPresetDates("this_month");

    const loadMeta = async () => {
      try {
        if (adminId) {
          const compRes = await api.get(`/company/get_companies_by_admin?admin_id=${adminId}&role=${user.role}`);
          if (compRes.data.status) {
            setCompanies(compRes.data.data || []);
          }
        }
      } catch (err) {
        console.error("Error loading companies:", err);
      }
    };
    loadMeta();
  }, [adminId, user.role]);

  // Fetch Payment-In Records
  const fetchPayments = async () => {
    if (!adminId) return;
    setLoading(true);
    try {
      const res = await api.get(`/invoice/get_payment_ins?admin_id=${adminId}`);
      if (res.data.status) {
        setPayments(res.data.data || []);
      } else {
        setPayments([]);
      }
    } catch (err) {
      console.error("Error loading payment-in records:", err);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [adminId]);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Filtered Payments List
  const filteredPayments = useMemo(() => {
    return payments.filter((item) => {
      // Date range filter
      if (fromDate && toDate) {
        const itemDate = (item.payment_date || item.created_at || "").split("T")[0].split(" ")[0];
        if (itemDate && (itemDate < fromDate || itemDate > toDate)) return false;
      }

      // Firm filter
      if (selectedFirm !== "all" && item.company_id) {
        if (String(item.company_id) !== String(selectedFirm)) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const refNo = String(item.receipt_no || item.invoice_no || item.id || "").toLowerCase();
        const partyName = String(item.customer_name || item.name || "").toLowerCase();
        const paymentType = String(item.payment_method || "").toLowerCase();
        const total = String(item.total_amount || "");
        const received = String(item.paid_amount || "");
        if (
          !refNo.includes(q) &&
          !partyName.includes(q) &&
          !paymentType.includes(q) &&
          !total.includes(q) &&
          !received.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [payments, fromDate, toDate, selectedFirm, searchQuery]);

  // Summary Metrics
  const metrics = useMemo(() => {
    let total = 0;
    let received = 0;
    let discount = 0;
    let balance = 0;
    filteredPayments.forEach((p) => {
      const tot = parseFloat(p.total_amount || p.paid_amount || 0);
      const rec = parseFloat(p.paid_amount || 0);
      const disc = parseFloat(p.discount_amount || 0);
      const bal = parseFloat(p.balance_amount || 0);
      total += tot;
      received += rec;
      discount += disc;
      balance += bal;
    });
    return { total, received, discount, balance };
  }, [filteredPayments]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedFirm, fromDate, toDate, period]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredPayments.length / rowsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPayments = useMemo(() => {
    const start = (safePage - 1) * rowsPerPage;
    return filteredPayments.slice(start, start + rowsPerPage);
  }, [filteredPayments, safePage, rowsPerPage]);

  // Excel Export
  const handleExportExcel = () => {
    if (filteredPayments.length === 0) {
      alert("No data available to export.");
      return;
    }
    const data = filteredPayments.map((p, idx) => ({
      Date: formatDateDMY(p.payment_date || p.created_at),
      "Receipt No": p.receipt_no || p.invoice_no || `#${idx + 1}`,
      "Party Name": p.customer_name || p.name || "Customer",
      "Total Amount": parseFloat(p.total_amount || p.paid_amount || 0),
      Received: parseFloat(p.paid_amount || 0),
      Discount: parseFloat(p.discount_amount || 0),
      Balance: parseFloat(p.balance_amount || 0),
      "Payment Type": p.payment_method || "Cash",
      Status: parseFloat(p.balance_amount || 0) <= 0 ? "Paid" : "Partial",
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payment-In");
    XLSX.writeFile(workbook, `Payment_In_Report_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // Delete Payment Record
  const handleDeletePayment = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await api.post("/invoice/delete_payment_in", {
        id: deleteTarget.id,
      });
      if (res.data.status) {
        setPayments((prev) => prev.filter((p) => p.id !== deleteTarget.id));
        setActionToast({ msg: "Payment-In voucher deleted successfully.", ok: true });
        setDeleteTarget(null);
        setTimeout(() => setActionToast(null), 3500);
      } else {
        setActionToast({ msg: res.data.message || "Failed to delete voucher.", ok: false });
        setTimeout(() => setActionToast(null), 3500);
      }
    } catch (err) {
      console.error(err);
      setActionToast({ msg: err.response?.data?.message || "Error deleting payment.", ok: false });
      setTimeout(() => setActionToast(null), 3500);
    } finally {
      setDeleting(false);
    }
  };

  const periodLabels = {
    today: "Today",
    this_week: "This Week",
    this_month: "This Month",
    this_quarter: "This Quarter",
    this_year: "This Year",
    all_time: "All Time",
    custom: "Custom",
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* ── 1. TOP HEADER: Title + Add Payment-In + Settings ── */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-2 select-none">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Payment-In</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="app-btn-primary h-9 px-4 rounded-xl text-sm font-semibold shadow-sm cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add Payment-In</span>
          </button>

          <HeaderSettingsButton
            variant="list"
            onClick={() => setShowColumnDrawer(true)}
            isActive={showColumnDrawer}
          />
        </div>
      </div>

      {/* ── 2. FILTER ROW: Period, Date Range, Firms (All Users removed) ── */}
      <div className="flex flex-wrap items-center gap-2.5 py-4 text-xs">
        <span className="font-semibold text-slate-500 mr-1">Filter by :</span>

        {/* Period Pill Dropdown */}
        <div className="relative">
          <button
            onClick={() => setPeriodOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-50/80 hover:bg-sky-100/70 text-slate-700 font-semibold rounded-full border border-sky-100 transition cursor-pointer"
          >
            <span>{periodLabels[period] || "This Month"}</span>
            <ChevronDown size={14} className={`text-slate-500 transition-transform ${periodOpen ? "rotate-180" : ""}`} />
          </button>

          {periodOpen && (
            <div className="absolute left-0 top-9 w-36 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
              {Object.entries(periodLabels).map(([key, label]) => (
                <div
                  key={key}
                  onClick={() => setPresetDates(key)}
                  className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition ${
                    period === key ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Date Range Pill Display */}
        <div
          onClick={() => setShowDatePicker((v) => !v)}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-sky-50/50 hover:bg-sky-100/50 text-slate-700 font-medium rounded-full border border-sky-100/80 transition cursor-pointer select-none"
        >
          <Calendar size={14} className="text-slate-500" />
          <span>
            {fromDate && toDate ? `${formatDateDMY(fromDate)} To ${formatDateDMY(toDate)}` : "All Time"}
          </span>
        </div>

        {/* Custom Date Picker Popover */}
        {showDatePicker && (
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm text-xs">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="text-xs text-slate-700 outline-none"
            />
            <span className="text-slate-400">To</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="text-xs text-slate-700 outline-none"
            />
            <button
              onClick={() => setShowDatePicker(false)}
              className="app-btn-primary px-2.5 py-1 rounded-full text-xs font-bold"
            >
              Apply
            </button>
          </div>
        )}

        {/* Firms Dropdown Pill */}
        <div className="relative">
          <button
            onClick={() => setFirmOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-50/80 hover:bg-sky-100/70 text-slate-700 font-semibold rounded-full border border-sky-100 transition cursor-pointer"
          >
            <span>
              {selectedFirm === "all"
                ? "All Firms"
                : companies.find((c) => String(c.id) === String(selectedFirm))?.company_name || "Firm"}
            </span>
            <ChevronDown size={14} className={`text-slate-500 transition-transform ${firmOpen ? "rotate-180" : ""}`} />
          </button>

          {firmOpen && (
            <div className="absolute left-0 top-9 w-44 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
              <div
                onClick={() => { setSelectedFirm("all"); setFirmOpen(false); }}
                className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition ${
                  selectedFirm === "all" ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                All Firms
              </div>
              {companies.map((c) => (
                <div
                  key={c.id}
                  onClick={() => { setSelectedFirm(String(c.id)); setFirmOpen(false); }}
                  className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition truncate ${
                    String(selectedFirm) === String(c.id) ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {c.company_name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Refresh button */}
        <button
          onClick={fetchPayments}
          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-full transition cursor-pointer ml-auto"
          title="Refresh Payment Records"
        >
          <RefreshCw size={15} className={loading ? "animate-spin text-blue-600" : ""} />
        </button>
      </div>

      {/* ── 3. SUMMARY KPI CARD (Standardized) ── */}
      <div className="my-2">
        <div className="bg-white border border-purple-200/90 rounded-2xl p-4 w-72 sm:w-80 shadow-2xs">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Amount Received</span>
            <div className="flex flex-col items-end">
              <span className="inline-flex items-center text-[11px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                100% ↗
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">vs last month</span>
            </div>
          </div>

          <div className="text-2xl font-black text-slate-900 my-1 tracking-tight">
            ₹ {metrics.received.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100 mt-2">
            <span>
              Total: <strong className="text-slate-800 font-bold">₹ {metrics.total.toLocaleString("en-IN", { minimumFractionDigits: 0 })}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              Balance: <strong className="text-slate-800 font-bold">₹ {metrics.balance.toLocaleString("en-IN", { minimumFractionDigits: 0 })}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* ── 4. TRANSACTIONS SECTION: Header + Action Icons + Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs mt-6 overflow-hidden">
        {/* Top Row */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">Transactions</h2>

          <div className="flex items-center gap-2">
            {/* Inline Search Toggle */}
            {showSearchInput ? (
              <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full text-xs animate-in fade-in duration-150">
                <Search size={13} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Search receipt, customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="bg-transparent text-xs text-slate-700 outline-none w-44"
                />
                <button
                  onClick={() => { setShowSearchInput(false); setSearchQuery(""); }}
                  className="text-slate-400 hover:text-slate-600 ml-1 text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSearchInput(true)}
                className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                title="Search Transactions"
              >
                <Search size={17} />
              </button>
            )}

            {/* Excel Export Button */}
            <button
              onClick={handleExportExcel}
              className="w-8 h-8 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
              title="Export to Excel (.xlsx)"
            >
              <span className="bg-emerald-600 text-white font-extrabold text-[10px] px-1.5 py-0.5 rounded leading-none shadow-2xs">
                xls
              </span>
            </button>

            {/* Print Button */}
            <button
              onClick={() => window.print()}
              className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              title="Print Transactions"
            >
              <Printer size={17} />
            </button>
          </div>
        </div>

        {/* Table with Vertical Grid Lines */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold select-none">
                {visibleColumns.date && (
                  <th className="py-3 px-3.5 border-r border-slate-200 whitespace-nowrap">
                    Date
                  </th>
                )}
                {visibleColumns.ref_no && (
                  <th className="py-3 px-3.5 border-r border-slate-200 whitespace-nowrap">
                    Ref No
                  </th>
                )}
                {visibleColumns.party_name && (
                  <th className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">
                    Party Name
                  </th>
                )}
                {visibleColumns.total_amount && (
                  <th className="py-3 px-4 border-r border-slate-200 text-right whitespace-nowrap">
                    Total Amount
                  </th>
                )}
                {visibleColumns.received && (
                  <th className="py-3 px-4 border-r border-slate-200 text-right whitespace-nowrap">
                    Received
                  </th>
                )}
                {visibleColumns.discount && (
                  <th className="py-3 px-4 border-r border-slate-200 text-right whitespace-nowrap">
                    Discount
                  </th>
                )}
                {visibleColumns.balance && (
                  <th className="py-3 px-4 border-r border-slate-200 text-right whitespace-nowrap">
                    Balance
                  </th>
                )}
                {visibleColumns.payment_type && (
                  <th className="py-3 px-3.5 border-r border-slate-200 whitespace-nowrap">
                    Payment Type
                  </th>
                )}
                {visibleColumns.status && (
                  <th className="py-3 px-3.5 border-r border-slate-200 whitespace-nowrap">
                    Status
                  </th>
                )}
                {visibleColumns.actions && (
                  <th className="py-3 px-3.5 text-center whitespace-nowrap">Actions</th>
                )}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={visibleColumnCount || 1} className="py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin text-blue-500 mx-auto mb-2" />
                    <span>Loading Payment-In Records...</span>
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnCount || 1} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-500">No payment-in transactions found.</p>
                    <p className="text-xs text-slate-400 mt-1">Click &quot;+ Add Payment-In&quot; to record customer credit payment.</p>
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((p, idx) => {
                  const refNo = p.receipt_no || p.invoice_no || String((safePage - 1) * rowsPerPage + idx + 1);
                  const total = parseFloat(p.total_amount || p.paid_amount || 0);
                  const received = parseFloat(p.paid_amount || 0);
                  const discountAmt = parseFloat(p.discount_amount || 0);
                  const balance = parseFloat(p.balance_amount || 0);
                  const isPaid = balance <= 0;
                  const isMenuOpen = activeMenuId === p.id;

                  return (
                    <tr
                      key={p.id || idx}
                      className="group hover:bg-[#eaedf2] transition-colors duration-150 text-slate-700 cursor-pointer"
                      onClick={() => navigate(`/invoice/${p.invoice_no}`)}
                    >
                      {/* Date */}
                      {visibleColumns.date && (
                        <td className="py-3.5 px-3.5 border-r border-slate-200 font-medium group-hover:font-bold text-slate-600 group-hover:text-slate-900 whitespace-nowrap">
                          {formatDateDMY(p.payment_date || p.created_at)}
                        </td>
                      )}

                      {/* Ref. no. */}
                      {visibleColumns.ref_no && (
                        <td className="py-3.5 px-3.5 border-r border-slate-200 font-medium group-hover:font-bold text-slate-800 group-hover:text-slate-950 whitespace-nowrap">
                          #{refNo}
                        </td>
                      )}

                      {/* Party Name */}
                      {visibleColumns.party_name && (
                        <td className="py-3.5 px-4 border-r border-slate-200 font-medium group-hover:font-bold text-slate-800 group-hover:text-slate-950 whitespace-nowrap">
                          {p.customer_name || p.name || "Customer"}
                        </td>
                      )}

                      {/* Total Amount */}
                      {visibleColumns.total_amount && (
                        <td className="py-3.5 px-4 border-r border-slate-200 font-medium group-hover:font-bold text-slate-900 text-right whitespace-nowrap">
                          ₹ {total.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                        </td>
                      )}

                      {/* Received */}
                      {visibleColumns.received && (
                        <td className="py-3.5 px-4 border-r border-slate-200 font-medium group-hover:font-bold text-slate-900 text-right whitespace-nowrap">
                          ₹ {received.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                        </td>
                      )}

                      {/* Discount */}
                      {visibleColumns.discount && (
                        <td className="py-3.5 px-4 border-r border-slate-200 font-medium group-hover:font-bold text-amber-600 group-hover:text-amber-700 text-right whitespace-nowrap">
                          ₹ {discountAmt.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                        </td>
                      )}

                      {/* Balance */}
                      {visibleColumns.balance && (
                        <td className="py-3.5 px-4 border-r border-slate-200 font-medium group-hover:font-bold text-red-600 group-hover:text-red-700 text-right whitespace-nowrap">
                          ₹ {balance.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                        </td>
                      )}

                      {/* Payment Type */}
                      {visibleColumns.payment_type && (
                        <td className="py-3.5 px-3.5 border-r border-slate-200 capitalize text-slate-600 group-hover:text-slate-900 font-medium whitespace-nowrap">
                          {p.payment_method || "Cash"}
                        </td>
                      )}

                      {/* Status */}
                      {visibleColumns.status && (
                        <td className="py-3.5 px-3.5 border-r border-slate-200 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wide border ${
                              isPaid
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {isPaid ? "Paid" : "Partial"}
                          </span>
                        </td>
                      )}

                      {/* Actions */}
                      {visibleColumns.actions && (
                        <td className="py-3.5 px-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            {/* Print Icon Button */}
                            <button
                              onClick={() => navigate(`/invoice/${p.invoice_no}`)}
                              className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition cursor-pointer"
                              title="Print Receipt"
                            >
                              <Printer size={15} />
                            </button>

                            {/* Share with Popover */}
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveShareId(activeShareId === p.id ? null : p.id);
                                }}
                                className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition cursor-pointer"
                                title="Share"
                              >
                                <Share2 size={15} />
                              </button>
                              <ShareTransactionPopover
                                isOpen={activeShareId === p.id}
                                onClose={() => setActiveShareId(null)}
                                transaction={p}
                                type="Payment-In"
                              />
                            </div>

                            {/* 3-Dot More Menu */}
                            <div className="relative">
                              <button
                                onClick={() => setActiveMenuId(isMenuOpen ? null : p.id)}
                                className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition cursor-pointer"
                                title="More actions"
                              >
                                <MoreVertical size={15} />
                              </button>

                              {isMenuOpen && (
                                <div
                                  ref={menuRef}
                                  className="absolute right-0 top-8 w-36 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 text-left animate-in fade-in zoom-in-95 duration-100"
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMenuId(null);
                                      navigate(`/sales/edit/${p.invoice_no}`);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition text-left cursor-pointer"
                                  >
                                    <Edit size={14} className="text-blue-600" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMenuId(null);
                                      navigate(`/invoice/${p.invoice_no}`);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition text-left cursor-pointer"
                                  >
                                    <Eye size={14} />
                                    <span>View Receipt</span>
                                  </button>
                                  <div className="border-t border-slate-100 my-1" />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMenuId(null);
                                      setDeleteTarget(p);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition text-left cursor-pointer"
                                  >
                                    <Trash2 size={14} className="text-red-600" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* ── PAGINATION BAR ── */}
          {filteredPayments.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-200 text-xs text-slate-600 bg-white">
              <div className="flex items-center gap-4">
                <span>
                  Showing <strong className="font-semibold text-slate-800">{(safePage - 1) * rowsPerPage + 1}</strong> to{" "}
                  <strong className="font-semibold text-slate-800">
                    {Math.min(safePage * rowsPerPage, filteredPayments.length)}
                  </strong>{" "}
                  of <strong className="font-semibold text-slate-800">{filteredPayments.length}</strong> entries
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Rows:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft size={15} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .reduce((acc, p, i, arr) => {
                    if (i > 0 && arr[i - 1] !== p - 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, i) =>
                    item === "..." ? (
                      <span key={`dots-${i}`} className="px-2 text-slate-400 font-bold">
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setCurrentPage(item)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg font-medium text-xs transition cursor-pointer ${
                            safePage === item
                              ? "app-pagination-active"
                              : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}

                <button
                  type="button"
                  disabled={safePage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 5. ADD PAYMENT-IN MODAL ── */}
      <AddPaymentInModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          fetchPayments();
          setActionToast({ msg: "Payment-In recorded successfully.", ok: true });
          setTimeout(() => setActionToast(null), 3500);
        }}
      />

      {/* ── 6. DELETE CONFIRMATION MODAL ── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={22} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Payment Record?</h3>
                <p className="text-xs text-slate-500 font-mono">Invoice #{deleteTarget.invoice_no}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-5 bg-slate-50 p-3 rounded-xl border border-slate-100">
              Are you sure you want to permanently delete this payment transaction?
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeletePayment}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {deleting && <RefreshCw size={14} className="animate-spin" />}
                <span>{deleting ? "Deleting..." : "Yes, Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. ACTION FLOATING TOAST NOTIFICATION ── */}
      {actionToast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[99999] px-4 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-200">
          {actionToast.msg}
        </div>
      )}

      {/* Table Column Customizer Drawer */}
      <CommonTableColumnSettings
        isOpen={showColumnDrawer}
        onClose={() => setShowColumnDrawer(false)}
        columns={DEFAULT_COLUMNS}
        visibleColumns={visibleColumns}
        onToggleColumn={toggleColumn}
        onSelectAll={selectAllColumns}
        onReset={resetDefaultColumns}
        title="Customise Columns"
        subtitle="Show or hide columns in Payment-In table"
      />
    </div>
  );
}
