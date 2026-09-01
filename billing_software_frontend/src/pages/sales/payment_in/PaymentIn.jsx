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
  TrendingUp,
} from "lucide-react";
import AddPaymentInModal from "./AddPaymentInModal";

export default function PaymentIn() {
  const navigate = useNavigate();
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  const adminId = user?.role === "cashier" ? user?.admin_id : user?.id;

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
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Modals & toast states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionToast, setActionToast] = useState(null);

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
    if (!adminId) return;
    setLoading(true);
    try {
      const res = await api.get(`/invoice/get_pending_invoice_history?admin_id=${adminId}`);
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

  // Filtered Payments List (Option B: Only show credit payment receipts; exclude direct cash sales)
  const filteredPayments = useMemo(() => {
    return payments.filter((item) => {
      // 1. Exclude direct counter cash sales (which belong in Sale Invoices)
      const isDirectCashSale = String(item.payment_type || "").toLowerCase() === "cash";
      if (isDirectCashSale) return false;

      // 2. Only show credit transactions where money was actually received
      const receivedAmt = parseFloat(item.paid_amount ?? item.paid_amount_total ?? 0);
      if (receivedAmt <= 0) return false;

      // Date range filter
      if (fromDate && toDate && item.created_at) {
        const itemDate = item.created_at.split("T")[0].split(" ")[0];
        if (itemDate < fromDate || itemDate > toDate) return false;
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
        const refNo = String(item.id || item.invoice_no || "").toLowerCase();
        const partyName = String(item.customer_name || "").toLowerCase();
        const paymentType = String(item.payment_method || "").toLowerCase();
        const total = String(item.total_amount || "");
        const received = String(item.paid_amount || item.paid_amount_total || "");
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

  // Summary Metrics (Total Amount, Received Amount, Balance Amount)
  const metrics = useMemo(() => {
    let total = 0;
    let received = 0;
    let balance = 0;
    filteredPayments.forEach((p) => {
      const tot = parseFloat(p.total_amount || 0);
      const rec = parseFloat(p.paid_amount || p.paid_amount_total || 0);
      const bal = parseFloat(p.balance_amount !== undefined ? p.balance_amount : Math.max(0, tot - rec));
      total += tot;
      received += rec;
      balance += bal;
    });
    return { total, received, balance };
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

  // Excel Export
  const handleExportExcel = () => {
    if (filteredPayments.length === 0) {
      alert("No data available to export.");
      return;
    }
    const data = filteredPayments.map((p, idx) => ({
      Date: formatDateDMY(p.created_at),
      "Ref. no.": idx + 1,
      "Party Name": p.customer_name || "Cash Customer",
      "Total Amount": parseFloat(p.total_amount || 0),
      Received: parseFloat(p.paid_amount || p.paid_amount_total || 0),
      Balance: parseFloat(p.balance_amount !== undefined ? p.balance_amount : Math.max(0, parseFloat(p.total_amount || 0) - parseFloat(p.paid_amount || p.paid_amount_total || 0))),
      "Payment Type": p.payment_method || "Cash",
      Status: (parseFloat(p.balance_amount !== undefined ? p.balance_amount : Math.max(0, parseFloat(p.total_amount || 0) - parseFloat(p.paid_amount || p.paid_amount_total || 0))) <= 0) ? "Paid" : "Partial",
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
      const res = await api.post("/invoice/delete_invoice", {
        invoice_no: deleteTarget.invoice_no,
        id: deleteTarget.id,
      });
      if (res.data.status) {
        setPayments((prev) => prev.filter((p) => p.id !== deleteTarget.id));
        setActionToast({ msg: "Payment record deleted successfully.", ok: true });
        setDeleteTarget(null);
        setTimeout(() => setActionToast(null), 3500);
      } else {
        setActionToast({ msg: res.data.message || "Failed to delete record.", ok: false });
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
    <div className="p-5 max-w-[1400px] mx-auto min-h-screen space-y-4">
      {/* ── 1. TOP HEADER (Payment-In ⌵ | + Add Payment-In | Settings) ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 cursor-pointer">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Payment-In</h1>
          <ChevronDown size={18} className="text-slate-600 mt-0.5" />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs rounded-full shadow-sm shadow-rose-500/30 transition cursor-pointer"
          >
            <Plus size={15} strokeWidth={2.6} />
            <span>Add Payment-In</span>
          </button>

          <button
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition cursor-pointer"
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* ── 2. FILTER BAR (Matching media_1787829087014.png) ── */}
      <div className="flex flex-wrap items-center gap-3 py-1 text-xs">
        <span className="font-semibold text-slate-500 mr-1">Filter by :</span>

        {/* Period Selector (e.g. This Month) */}
        <div className="relative">
          <button
            onClick={() => {
              setPeriodOpen(!periodOpen);
              setFirmOpen(false);
              setUserOpen(false);
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-50/70 hover:bg-blue-100/70 text-blue-700 font-semibold rounded-full border border-blue-200/60 transition cursor-pointer"
          >
            <span className="capitalize">{period.replace("_", " ")}</span>
            <ChevronDown size={13} />
          </button>

          {periodOpen && (
            <div className="absolute left-0 mt-1 w-40 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50 animate-in fade-in zoom-in-95">
              {[
                { label: "Today", val: "today" },
                { label: "This Week", val: "this_week" },
                { label: "This Month", val: "this_month" },
                { label: "This Quarter", val: "this_quarter" },
                { label: "This Year", val: "this_year" },
              ].map((p) => (
                <button
                  key={p.val}
                  onClick={() => setPresetDates(p.val)}
                  className={`w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 transition cursor-pointer ${
                    period === p.val ? "text-blue-600 font-bold bg-blue-50/40" : "text-slate-700"
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
            className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-50/70 hover:bg-blue-100/70 text-blue-700 font-semibold rounded-full border border-blue-200/60 transition cursor-pointer"
          >
            <Calendar size={13} className="text-blue-600" />
            <span>
              {formatDateDMY(fromDate)} To {formatDateDMY(toDate)}
            </span>
          </button>

          {showDatePicker && (
            <div className="absolute left-0 mt-1 p-3 bg-white rounded-xl shadow-xl border border-slate-100 z-50 flex items-center gap-2 animate-in fade-in">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="border border-slate-200 rounded px-2 py-1 text-xs"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="border border-slate-200 rounded px-2 py-1 text-xs"
              />
              <button
                onClick={() => setShowDatePicker(false)}
                className="px-2.5 py-1 bg-blue-600 text-white rounded text-xs font-bold"
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
            className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-50/70 hover:bg-blue-100/70 text-blue-700 font-semibold rounded-full border border-blue-200/60 transition cursor-pointer"
          >
            <span>
              {selectedFirm === "all" ? "All Firms" : companies.find((c) => String(c.id) === String(selectedFirm))?.company_name || "Firm"}
            </span>
            <ChevronDown size={13} />
          </button>

          {firmOpen && (
            <div className="absolute left-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50 animate-in fade-in zoom-in-95">
              <button
                onClick={() => {
                  setSelectedFirm("all");
                  setFirmOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 transition cursor-pointer ${
                  selectedFirm === "all" ? "text-blue-600 font-bold bg-blue-50/40" : "text-slate-700"
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
                  className={`w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 transition cursor-pointer ${
                    String(selectedFirm) === String(c.id) ? "text-blue-600 font-bold bg-blue-50/40" : "text-slate-700"
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
            className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-50/70 hover:bg-blue-100/70 text-blue-700 font-semibold rounded-full border border-blue-200/60 transition cursor-pointer"
          >
            <span>
              {selectedUser === "all" ? "All Users" : cashiers.find((c) => String(c.id) === String(selectedUser))?.name || "User"}
            </span>
            <ChevronDown size={13} />
          </button>

          {userOpen && (
            <div className="absolute left-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50 animate-in fade-in zoom-in-95">
              <button
                onClick={() => {
                  setSelectedUser("all");
                  setUserOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 transition cursor-pointer ${
                  selectedUser === "all" ? "text-blue-600 font-bold bg-blue-50/40" : "text-slate-700"
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
                  className={`w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 transition cursor-pointer ${
                    String(selectedUser) === String(u.id) ? "text-blue-600 font-bold bg-blue-50/40" : "text-slate-700"
                  }`}
                >
                  {u.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 3. METRIC CARD (Matching media_1787829087014.png) ── */}
      <div className="pt-2">
        <div className="w-80 rounded-2xl border border-purple-200/80 bg-purple-50/20 p-4 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 block">Total Amount</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                ₹ {metrics.total.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </div>
            </div>

            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-bold">
              <span>100%</span>
              <TrendingUp size={12} />
              <span className="text-[10px] text-slate-400 font-normal ml-0.5">vs last month</span>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-purple-100 flex items-center justify-between text-xs font-semibold text-slate-600">
            <div>
              Received:{" "}
              <strong className="text-emerald-700 font-bold">
                ₹ {metrics.received.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </strong>
            </div>
            <div>
              Balance:{" "}
              <strong className="text-red-600 font-bold">
                ₹ {metrics.balance.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. TRANSACTIONS CARD ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Card Header: Title & Utility Icons */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Transactions</h2>

          <div className="flex items-center gap-2">
            {/* Search Input Toggle */}
            {showSearchInput ? (
              <div className="flex items-center bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs">
                <Search size={13} className="text-slate-400 mr-1.5" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by party, ref..."
                  className="bg-transparent text-xs outline-none text-slate-800 w-36"
                />
                <button
                  onClick={() => {
                    setShowSearchInput(false);
                    setSearchQuery("");
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSearchInput(true)}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition cursor-pointer"
                title="Search"
              >
                <Search size={14} />
              </button>
            )}

            {/* Excel Export Button */}
            <button
              onClick={handleExportExcel}
              className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 hover:bg-emerald-100 font-bold text-xs transition cursor-pointer"
              title="Export to Excel"
            >
              xls
            </button>

            {/* Print Table Button */}
            <button
              onClick={() => window.print()}
              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition cursor-pointer"
              title="Print Transactions"
            >
              <Printer size={14} />
            </button>
          </div>
        </div>

        {/* ── TABLE ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60 font-semibold text-slate-600">
                <th className="py-3 px-3.5 border-r border-slate-200 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span>Date</span>
                    <Filter size={11} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3.5 border-r border-slate-200 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Ref. no.</span>
                    <Filter size={11} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span>Party Name</span>
                    <Filter size={11} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 border-r border-slate-200 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Total Amount</span>
                    <Filter size={11} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 border-r border-slate-200 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Received</span>
                    <Filter size={11} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 border-r border-slate-200 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Balance</span>
                    <Filter size={11} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3.5 border-r border-slate-200 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span>Payment Type</span>
                    <Filter size={11} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3.5 border-r border-slate-200 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span>Status</span>
                    <Filter size={11} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin text-blue-500 mx-auto mb-2" />
                    <span>Loading Payment-In Records...</span>
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-500">No payment-in transactions found.</p>
                    <p className="text-xs text-slate-400 mt-1">Click &quot;+ Add Payment-In&quot; to record customer credit payment.</p>
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((p, idx) => {
                  const refNo = (safePage - 1) * rowsPerPage + idx + 1;
                  const total = parseFloat(p.total_amount || 0);
                  const received = parseFloat(p.paid_amount || p.paid_amount_total || 0);
                  const balance = parseFloat(p.balance_amount !== undefined ? p.balance_amount : Math.max(0, total - received));
                  const status = balance <= 0 ? "paid" : "partial";
                  const isMenuOpen = activeMenuId === p.id;

                  return (
                    <tr
                      key={p.id || idx}
                      className="group hover:bg-[#eaedf2] transition-colors duration-150 text-slate-700 cursor-pointer"
                      onClick={() => navigate(`/invoice/${p.invoice_no}`)}
                    >
                      {/* Date */}
                      <td className="py-3.5 px-3.5 border-r border-slate-200 font-medium group-hover:font-bold text-slate-600 group-hover:text-slate-900 whitespace-nowrap">
                        {formatDateDMY(p.created_at)}
                      </td>

                      {/* Ref. no. */}
                      <td className="py-3.5 px-3.5 border-r border-slate-200 font-medium group-hover:font-bold text-slate-800 group-hover:text-slate-950 text-right whitespace-nowrap">
                        {refNo}
                      </td>

                      {/* Party Name */}
                      <td className="py-3.5 px-4 border-r border-slate-200 font-medium group-hover:font-bold text-slate-800 group-hover:text-slate-950 whitespace-nowrap">
                        {p.customer_name || "Cash Customer"}
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4 border-r border-slate-200 font-medium group-hover:font-bold text-slate-900 text-right whitespace-nowrap">
                        ₹ {total.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                      </td>

                      {/* Received */}
                      <td className="py-3.5 px-4 border-r border-slate-200 font-medium group-hover:font-bold text-slate-900 text-right whitespace-nowrap">
                        ₹ {received.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                      </td>

                      {/* Balance */}
                      <td className="py-3.5 px-4 border-r border-slate-200 font-medium group-hover:font-bold text-red-600 group-hover:text-red-700 text-right whitespace-nowrap">
                        ₹ {balance.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                      </td>

                      {/* Payment Type */}
                      <td className="py-3.5 px-3.5 border-r border-slate-200 capitalize text-slate-600 group-hover:text-slate-900 font-medium group-hover:font-bold whitespace-nowrap">
                        {p.payment_method || "Cash"}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3.5 border-r border-slate-200 whitespace-nowrap font-bold">
                        {status === "paid" ? (
                          <span className="text-emerald-700">Paid</span>
                        ) : (
                          <span className="text-amber-600 font-bold">Partial</span>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="py-3.5 px-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5 text-slate-400">
                          {/* Print POS */}
                          <button
                            onClick={() => navigate(`/invoice/${p.invoice_no}`)}
                            className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition cursor-pointer"
                            title="Print"
                          >
                            <Printer size={15} />
                          </button>

                          {/* Share Icon */}
                          <button
                            onClick={() => navigate(`/invoice/${p.invoice_no}`)}
                            className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition cursor-pointer"
                            title="Share"
                          >
                            <Share2 size={15} />
                          </button>

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
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    navigate(`/sales/edit/${p.invoice_no}`);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition text-left cursor-pointer"
                                >
                                  <Edit size={14} className="text-blue-600" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => {
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
                                  onClick={() => {
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
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* ── PAGINATION BAR (Matching Sale Invoices) ── */}
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
                            ? "bg-blue-600 text-white font-bold shadow-sm"
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
    </div>
  );
}
