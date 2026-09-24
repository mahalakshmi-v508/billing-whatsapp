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
  BarChart3,
  X,
  RefreshCw,
  TrendingUp,
  FileText,
  User,
  IndianRupee,
  Wallet,
  CreditCard,
  CheckCircle2,
  SlidersHorizontal,
  Tag,
} from "lucide-react";
import AddPaymentInModal from "./AddPaymentInModal";
import PaymentInAnalytics from "./PaymentInAnalytics";
import TableActions from "../../../components/ui/TableActions";
import HeaderSettingsButton from "../../../components/HeaderSettingsButton";
import CommonTableColumnSettings from "../../../components/CommonTableColumnSettings";
import useTableColumns from "../../../hooks/useTableColumns";

const DEFAULT_COLUMNS = [
  { key: "date", label: "Date", icon: Calendar, color: "text-indigo-600", bg: "bg-indigo-50", desc: "Payment inward date" },
  { key: "ref_no", label: "Ref. No.", icon: FileText, color: "text-blue-600", bg: "bg-blue-50", desc: "Receipt reference number" },
  { key: "party_name", label: "Party Name", icon: User, color: "text-emerald-600", bg: "bg-emerald-50", desc: "Customer or party" },
  { key: "total_amount", label: "Total Amount", icon: IndianRupee, color: "text-slate-600", bg: "bg-slate-100", desc: "Total invoice/due amount" },
  { key: "received", label: "Received", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", desc: "Settled payment amount" },
  { key: "discount", label: "Discount", icon: Tag, color: "text-amber-600", bg: "bg-amber-50", desc: "Discount given" },
  { key: "balance", label: "Balance", icon: Wallet, color: "text-rose-600", bg: "bg-rose-50", desc: "Remaining credit balance" },
  { key: "payment_type", label: "Payment Type", icon: CreditCard, color: "text-purple-600", bg: "bg-purple-50", desc: "Cash, Bank, UPI, etc." },
  { key: "status", label: "Status", icon: CheckCircle2, color: "text-cyan-600", bg: "bg-cyan-50", desc: "Paid or Partial status" },
  { key: "actions", label: "Actions", icon: SlidersHorizontal, color: "text-slate-600", bg: "bg-slate-100", desc: "Print, Share & More" },
];

export default function PaymentIn() {
  const navigate = useNavigate();
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  const adminId = user?.role === "cashier" ? user?.admin_id : user?.id;

  // Table Column Customization Hook
  const {
    showColumnDrawer,
    setShowColumnDrawer,
    visibleColumns,
    toggleColumn,
    selectAllColumns,
    resetDefaultColumns,
    visibleColumnCount,
  } = useTableColumns("payment_in_columns", DEFAULT_COLUMNS);

  // Data states
  const [payments, setPayments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [cashiers, setCashiers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [period, setPeriod] = useState("this_month");
  const [periodOpen, setPeriodOpen] = useState(false);
  const [selectedFirm, setSelectedFirm] = useState("all");
  const [firmOpen, setFirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState("all");
  const [userOpen, setUserOpen] = useState(false);

  // Date range
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Search & view toggles
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);

  // Modals & toast states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionToast, setActionToast] = useState(null);

  // Analytics view state
  const [viewMode, setViewMode] = useState("report");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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
          const cashRes = await api.get(`/cashier/get_cashier?admin_id=${adminId}`);
          if (cashRes.data.status) {
            setCashiers(cashRes.data.data || []);
          }
        }
      } catch (err) {
        console.error("Error loading companies/cashiers:", err);
      }
    };
    loadMeta();
  }, [adminId, user.role]);

  // Fetch Payment-In Records
  const fetchPayments = async () => {
    if (!adminId) {
      setLoading(false);
      return;
    }
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



  // Filtered Payments List (Show only Payment-In receipts recorded through Add Payment-In)
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

      // User filter
      if (selectedUser !== "all" && item.cashier_id) {
        if (String(item.cashier_id) !== String(selectedUser)) return false;
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
  }, [payments, fromDate, toDate, selectedFirm, selectedUser, searchQuery]);

  // Summary Metrics (Total Amount, Received Amount, Discount Amount, Balance Amount)
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
  }, [searchQuery, selectedFirm, selectedUser, fromDate, toDate, period]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredPayments.length / rowsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPayments = useMemo(() => {
    const start = (safePage - 1) * rowsPerPage;
    return filteredPayments.slice(start, start + rowsPerPage);
  }, [filteredPayments, safePage, rowsPerPage]);

  // Analytics rows (Payment-In grouped by payment method)
  const analyticsRows = useMemo(
    () =>
      filteredPayments.map((p) => ({
        date: p.payment_date || p.created_at || "",
        group: p.payment_method || "Cash",
        value: Number(p.paid_amount || p.total_amount || 0),
        count: 1,
      })),
    [filteredPayments]
  );

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

  return (
    <div className="min-h-screen bg-[#f8faff] p-4 sm:p-6 lg:p-8 space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {viewMode === "analytics" ? (
        <PaymentInAnalytics
          rows={filteredPayments}
          period={`${fromDate || "All"} → ${toDate || "All"}`}
          onClose={() => setViewMode("report")}
        />
      ) : (
        <>
      {/* ── 1. TOP HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 select-none">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-lg shadow-emerald-100 ring-4 ring-emerald-50/50">
            <TrendingUp size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Payment-In</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Record customer inward payments, settle party ledger balances &amp; track inflows
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <HeaderSettingsButton
            onClick={() => setShowColumnDrawer(true)}
            isActive={showColumnDrawer}
          />

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-200 transition-all transform active:scale-95 cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.8} />
            <span>Add Payment-In</span>
          </button>
        </div>
      </div>

      {/* ── 2. METRIC KPI CARDS (PaySplitX 4-Card Strip) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Received */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Received</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1 tracking-tight">
                ₹ {metrics.received.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
              ₹
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>{filteredPayments.length} Total records</span>
            <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
              Inflow Active
            </span>
          </div>
        </div>

        {/* Card 2: Total Voucher Value */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Value</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
                ₹ {metrics.total.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              Tot
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Invoice allocations</span>
            <span className="text-[11px] font-semibold text-slate-600">Aggregate</span>
          </div>
        </div>

        {/* Card 3: Discount Given */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Discounts Given</p>
              <h3 className="text-2xl font-black text-amber-600 mt-1 tracking-tight">
                ₹ {metrics.discount.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              %
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Settlement waivers</span>
            <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              Cash discounts
            </span>
          </div>
        </div>

        {/* Card 4: Remaining Balance */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Balance Pending</p>
              <h3 className="text-2xl font-black text-rose-600 mt-1 tracking-tight">
                ₹ {metrics.balance.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              Bal
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Unsettled invoice credit</span>
            <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
              Due to collect
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. FILTER TOOLBAR ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Filter by:</span>

          {/* Period Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setPeriodOpen(!periodOpen);
                setFirmOpen(false);
                setUserOpen(false);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer"
            >
              <span className="capitalize">{period === "all_time" ? "All Time" : period.replace("_", " ")}</span>
              <ChevronDown size={13} className={`text-slate-400 transition-transform ${periodOpen ? "rotate-180" : ""}`} />
            </button>

            {periodOpen && (
              <div className="absolute left-0 mt-1.5 w-40 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95">
                {[
                  { label: "All Time", val: "all_time" },
                  { label: "Today", val: "today" },
                  { label: "This Week", val: "this_week" },
                  { label: "This Month", val: "this_month" },
                  { label: "This Quarter", val: "this_quarter" },
                  { label: "This Year", val: "this_year" },
                ].map((p) => (
                  <button
                    key={p.val}
                    onClick={() => setPresetDates(p.val)}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer ${
                      period === p.val ? "text-indigo-600 font-bold bg-indigo-50/50" : "text-slate-700"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date Range Pill */}
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition cursor-pointer"
            >
              <Calendar size={13} className="text-slate-400" />
              <span>
                {fromDate && toDate
                  ? `${formatDateDMY(fromDate)} — ${formatDateDMY(toDate)}`
                  : "Custom Date"}
              </span>
            </button>

            {showDatePicker && (
              <div className="absolute left-0 mt-1.5 p-3 bg-white rounded-xl shadow-xl border border-slate-200 z-50 flex items-center gap-2 animate-in fade-in">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none"
                />
                <span className="text-slate-400 font-bold text-xs">to</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none"
                />
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold"
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          {/* All Firms Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setFirmOpen(!firmOpen);
                setPeriodOpen(false);
                setUserOpen(false);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer"
            >
              <span>
                {selectedFirm === "all" ? "All Firms" : companies.find((c) => String(c.id) === String(selectedFirm))?.company_name || "Firm"}
              </span>
              <ChevronDown size={13} className={`text-slate-400 transition-transform ${firmOpen ? "rotate-180" : ""}`} />
            </button>

            {firmOpen && (
              <div className="absolute left-0 mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95">
                <button
                  onClick={() => {
                    setSelectedFirm("all");
                    setFirmOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer ${
                    selectedFirm === "all" ? "text-indigo-600 font-bold bg-indigo-50/50" : "text-slate-700"
                  }`}
                >
                  All Firms
                </button>
                {companies.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedFirm(String(c.id));
                      setFirmOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-slate-50 transition cursor-pointer ${
                      String(selectedFirm) === String(c.id) ? "text-indigo-600 font-bold bg-indigo-50/50" : "text-slate-700"
                    }`}
                  >
                    {c.company_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* All Users Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setUserOpen(!userOpen);
                setPeriodOpen(false);
                setFirmOpen(false);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer"
            >
              <span>
                {selectedUser === "all" ? "All Users" : cashiers.find((c) => String(c.id) === String(selectedUser))?.name || "User"}
              </span>
              <ChevronDown size={13} className={`text-slate-400 transition-transform ${userOpen ? "rotate-180" : ""}`} />
            </button>

            {userOpen && (
              <div className="absolute left-0 mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95">
                <button
                  onClick={() => {
                    setSelectedUser("all");
                    setUserOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer ${
                    selectedUser === "all" ? "text-indigo-600 font-bold bg-indigo-50/50" : "text-slate-700"
                  }`}
                >
                  All Users
                </button>
                {cashiers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setSelectedUser(String(u.id));
                      setUserOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-slate-50 transition cursor-pointer ${
                      String(selectedUser) === String(u.id) ? "text-indigo-600 font-bold bg-indigo-50/50" : "text-slate-700"
                    }`}
                  >
                    {u.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Action Icons: Search + Export + Print */}
        <div className="flex items-center gap-2">
          {showSearchInput ? (
            <div className="flex items-center bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs">
              <Search size={13} className="text-slate-400 mr-1.5" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search party, ref..."
                className="bg-transparent text-xs outline-none text-slate-800 w-36"
              />
              <button
                onClick={() => {
                  setShowSearchInput(false);
                  setSearchQuery("");
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearchInput(true)}
              className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition cursor-pointer"
              title="Search"
            >
              <Search size={14} />
            </button>
          )}

          {/* Analytics */}
          <button
            type="button"
            onClick={() => setViewMode("analytics")}
            disabled={!filteredPayments.length}
            title="Open Analytics"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <BarChart3 size={16} />
            <span>Analytics</span>
          </button>

          {/* Excel Export */}
          <button
            onClick={handleExportExcel}
            className="px-3 h-8 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center gap-1.5 text-emerald-700 hover:bg-emerald-100 font-bold text-xs transition cursor-pointer"
            title="Export to Excel"
          >
            <span>Excel</span>
          </button>

          {/* Print Table */}
          <button
            onClick={() => window.print()}
            className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition cursor-pointer"
            title="Print Transactions"
          >
            <Printer size={14} />
          </button>

          {/* Customise Columns */}
          <HeaderSettingsButton
            variant="table"
            onClick={() => setShowColumnDrawer(true)}
            isActive={showColumnDrawer}
          />
        </div>
      </div>

      {/* ── 4. DIRECTORY TABLE CARD ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-max">
            <thead>
              <tr className="border-b border-slate-200/80 bg-[#fbfcfd] text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                {visibleColumns.date && <th className="py-3.5 px-4">Date</th>}
                {visibleColumns.ref_no && <th className="py-3.5 px-4 text-right">Ref. No.</th>}
                {visibleColumns.party_name && <th className="py-3.5 px-4">Party Name</th>}
                {visibleColumns.total_amount && <th className="py-3.5 px-4 text-right">Total Amount</th>}
                {visibleColumns.received && <th className="py-3.5 px-4 text-right">Received</th>}
                {visibleColumns.discount && <th className="py-3.5 px-4 text-right">Discount</th>}
                {visibleColumns.balance && <th className="py-3.5 px-4 text-right">Balance</th>}
                {visibleColumns.payment_type && <th className="py-3.5 px-4">Payment Type</th>}
                {visibleColumns.status && <th className="py-3.5 px-4 text-center">Status</th>}
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={visibleColumnCount || 10} className="py-14 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin text-indigo-500 mx-auto mb-2" />
                    <span>Loading Payment-In Records...</span>
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnCount || 10} className="py-14 text-center text-slate-400">
                    <p className="font-bold text-slate-700 text-sm">No payment-in transactions found.</p>
                    <p className="text-xs text-slate-400 mt-1">Click &quot;+ Add Payment-In&quot; to record customer payment.</p>
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((p, idx) => {
                  const refNo = p.receipt_no || p.invoice_no || String((safePage - 1) * rowsPerPage + idx + 1);
                  const total = parseFloat(p.total_amount || p.paid_amount || 0);
                  const received = parseFloat(p.paid_amount || 0);
                  const discountAmt = parseFloat(p.discount_amount || 0);
                  const balance = parseFloat(p.balance_amount || 0);
                  const status = balance <= 0 ? "paid" : "partial";

                  return (
                    <tr
                      key={p.id || idx}
                      className="hover:bg-indigo-50/20 transition-colors duration-150 text-slate-700"
                    >
                      {/* Date */}
                      {visibleColumns.date && (
                        <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                          {formatDateDMY(p.payment_date || p.created_at)}
                        </td>
                      )}

                      {/* Ref. no. */}
                      {visibleColumns.ref_no && (
                        <td className="py-3.5 px-4 font-bold text-indigo-600 text-right whitespace-nowrap">
                          #{refNo}
                        </td>
                      )}

                      {/* Party Name */}
                      {visibleColumns.party_name && (
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{p.customer_name || p.name || "Customer"}</div>
                          {p.phone && <div className="text-[10px] text-slate-400 font-normal">{p.phone}</div>}
                        </td>
                      )}

                      {/* Total Amount */}
                      {visibleColumns.total_amount && (
                        <td className="py-3.5 px-4 font-black text-slate-900 text-right whitespace-nowrap">
                          ₹ {total.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                        </td>
                      )}

                      {/* Received */}
                      {visibleColumns.received && (
                        <td className="py-3.5 px-4 font-black text-emerald-600 text-right whitespace-nowrap">
                          ₹ {received.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                        </td>
                      )}

                      {/* Discount */}
                      {visibleColumns.discount && (
                        <td className="py-3.5 px-4 font-bold text-amber-600 text-right whitespace-nowrap">
                          ₹ {discountAmt.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                        </td>
                      )}

                      {/* Balance */}
                      {visibleColumns.balance && (
                        <td className="py-3.5 px-4 font-bold text-rose-600 text-right whitespace-nowrap">
                          ₹ {balance.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                        </td>
                      )}

                      {/* Payment Type */}
                      {visibleColumns.payment_type && (
                        <td className="py-3.5 px-4 capitalize whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                            {p.payment_method || "Cash"}
                          </span>
                        </td>
                      )}

                      {/* Status */}
                      {visibleColumns.status && (
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              status === "paid"
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${status === "paid" ? "bg-emerald-600" : "bg-amber-600"}`} />
                            {status}
                          </span>
                        </td>
                      )}

                      {/* Actions Column */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <TableActions
                          onPrint={() => navigate(`/invoice/${p.invoice_no}`)}
                          printTitle="Print"
                          shareTransaction={p}
                          shareType="Payment-In"
                          onViewInvoice={() => navigate(`/invoice/${p.invoice_no}`)}
                          viewInvoiceLabel="View Invoice"
                          menuItems={[
                            {
                              label: "Edit Invoice",
                              icon: Edit,
                              onClick: () => navigate(`/sales/edit/${p.invoice_no}`),
                            },
                            {
                              label: "View Invoice",
                              icon: Eye,
                              onClick: () => navigate(`/invoice/${p.invoice_no}`),
                            },
                            { isDivider: true },
                            {
                              label: "Delete Voucher",
                              icon: Trash2,
                              isDanger: true,
                              onClick: () => setDeleteTarget(p),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── PAGINATION BAR ── */}
        {filteredPayments.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-200/80 text-xs text-slate-600 bg-white">
            <div className="flex items-center gap-4">
              <span>
                Showing <strong className="font-bold text-slate-900">{(safePage - 1) * rowsPerPage + 1}</strong> to{" "}
                <strong className="font-bold text-slate-900">
                  {Math.min(safePage * rowsPerPage, filteredPayments.length)}
                </strong>{" "}
                of <strong className="font-bold text-slate-900">{filteredPayments.length}</strong> entries
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Rows:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 outline-none"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={safePage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronLeft size={15} />
              </button>
              <div className="px-3 py-1 font-bold text-slate-800">
                {safePage} / {totalPages}
              </div>
              <button
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
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
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
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

            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Are you sure you want to permanently delete this payment transaction?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeletePayment}
                className="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md shadow-red-500/20 transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
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
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 28,
            zIndex: 99999,
            minWidth: 320,
            maxWidth: 420,
            background: actionToast.ok ? "#10b981" : "#ef4444",
            color: "#ffffff",
            borderRadius: 6,
            padding: "12px 16px",
            boxShadow: actionToast.ok
              ? "0 6px 20px rgba(16, 185, 129, 0.4)"
              : "0 6px 20px rgba(239, 68, 68, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            animation: "fadeIn 0.2s ease",
          }}
        >
          <span style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.35, color: "#ffffff" }}>
            {actionToast.msg}
          </span>
          <button
            onClick={() => setActionToast(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "#ffffff",
              cursor: "pointer",
              padding: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* ── 8. COLUMN CUSTOMIZATION DRAWER ── */}
      <CommonTableColumnSettings
        isOpen={showColumnDrawer}
        onClose={() => setShowColumnDrawer(false)}
        columns={DEFAULT_COLUMNS}
        visibleColumns={visibleColumns}
        onToggleColumn={toggleColumn}
        onSelectAll={selectAllColumns}
        onReset={resetDefaultColumns}
      />
   </>
    
  )}
  </div>);
}
