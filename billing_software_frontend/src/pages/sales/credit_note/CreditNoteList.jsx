import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import * as XLSX from "xlsx";
import {
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Search,
  Printer,
  Filter,
  Trash2,
  Eye,
  AlertTriangle,
  X,
  RefreshCw,
  MoreVertical,
  Share2,
  Edit,
  DollarSign,
  Layers,
  SlidersHorizontal,
  CheckCircle2,
  User,
  FileText,
} from "lucide-react";
import ShareTransactionPopover from "../../../components/ShareTransactionPopover";
import HeaderSettingsButton from "../../../components/HeaderSettingsButton";
import CommonTableColumnSettings from "../../../components/CommonTableColumnSettings";
import useTableColumns from "../../../hooks/useTableColumns";

const DEFAULT_COLUMNS = [
  { key: "date", label: "Date", icon: Calendar, color: "text-blue-600", bg: "bg-blue-50", desc: "Credit note return date" },
  { key: "return_no", label: "Return No", icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50", desc: "Credit note / return number" },
  { key: "party_name", label: "Party Name", icon: User, color: "text-violet-600", bg: "bg-violet-50", desc: "Customer or party name" },
  { key: "type", label: "Type", icon: Layers, color: "text-purple-600", bg: "bg-purple-50", desc: "Transaction type" },
  { key: "total", label: "Total", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50", desc: "Total credit note value" },
  { key: "refund", label: "Refund", icon: DollarSign, color: "text-teal-600", bg: "bg-teal-50", desc: "Refunded amount" },
  { key: "balance", label: "Balance", icon: DollarSign, color: "text-rose-600", bg: "bg-rose-50", desc: "Remaining balance" },
  { key: "status", label: "Status", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", desc: "Settlement status (Paid / Partial / Unpaid)" },
  { key: "actions", label: "Actions", icon: SlidersHorizontal, color: "text-slate-600", bg: "bg-slate-100", desc: "View, Print, Share, Delete" },
];

const PERIOD_LABELS = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This Week",
  this_month: "This Month",
  last_month: "Last Month",
  this_year: "This Year",
  all_time: "All Time",
  custom: "Custom",
};

export default function CreditNoteList() {
  const navigate = useNavigate();
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  const adminId = user?.role === "cashier" ? user?.admin_id : user?.id;

  // Data states
  const [creditNotes, setCreditNotes] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [period, setPeriod] = useState("this_month");
  const [periodOpen, setPeriodOpen] = useState(false);
  const [selectedFirm, setSelectedFirm] = useState("all");
  const [firmOpen, setFirmOpen] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [paymentOpen, setPaymentOpen] = useState(false);

  // Date range
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Search & Actions
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [activeShareId, setActiveShareId] = useState(null);
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
  } = useTableColumns("credit_note_columns", DEFAULT_COLUMNS);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const menuRef = useRef(null);

  // Format Helper: DD/MM/YYYY
  const formatDateDMY = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatYMD = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // Preset Date Helper
  const setPresetDates = (type) => {
    if (type === "all_time" || type === "all") {
      setFromDate("");
      setToDate("");
      setPeriod("all_time");
      setPeriodOpen(false);
      return;
    }

    const now = new Date();
    let from = new Date();
    let to = new Date();

    if (type === "today") {
      from = now;
      to = now;
    } else if (type === "yesterday") {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    } else if (type === "this_week") {
      const day = now.getDay() || 7;
      from.setDate(now.getDate() - day + 1);
      to = now;
    } else if (type === "this_month") {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (type === "last_month") {
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (type === "this_year") {
      from = new Date(now.getFullYear(), 0, 1);
      to = new Date(now.getFullYear(), 11, 31);
    }

    setFromDate(formatYMD(from));
    setToDate(formatYMD(to));
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
        console.error(err);
      }
    };
    loadMeta();
  }, [adminId, user.role]);

  // Fetch Credit Notes
  const fetchCreditNotes = async () => {
    if (!adminId) return;
    setLoading(true);
    try {
      const res = await api.get(`/credit_note/list?admin_id=${adminId}`);
      if (res.data.status) {
        setCreditNotes(res.data.data || []);
      } else {
        setCreditNotes([]);
      }
    } catch (err) {
      console.error("Error loading credit notes:", err);
      setCreditNotes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditNotes();
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

  // Filtered List
  const filteredNotes = useMemo(() => {
    return creditNotes.filter((item) => {
      // Date filter
      if (fromDate && toDate && item.return_date) {
        const itemDate = item.return_date.split("T")[0];
        if (itemDate < fromDate || itemDate > toDate) return false;
      }

      // Firm filter
      if (selectedFirm !== "all" && item.company_id) {
        if (String(item.company_id) !== String(selectedFirm)) return false;
      }

      // Payment filter
      if (paymentFilter !== "all") {
        const bal = parseFloat(item.balance_amount || 0);
        const ref = parseFloat(item.refund_amount || 0);
        if (paymentFilter === "unpaid" && !(bal > 0 && ref === 0)) return false;
        if (paymentFilter === "partial" && !(bal > 0 && ref > 0)) return false;
        if (paymentFilter === "paid" && !(bal <= 0)) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const refNo = String(item.return_no || item.id || "").toLowerCase();
        const partyName = String(item.customer_name || "").toLowerCase();
        const invNo = String(item.invoice_no || "").toLowerCase();
        const total = String(item.total_amount || "");
        if (!refNo.includes(q) && !partyName.includes(q) && !invNo.includes(q) && !total.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [creditNotes, fromDate, toDate, selectedFirm, paymentFilter, searchQuery]);

  // Summary Totals
  const totals = useMemo(() => {
    let totalAmt = 0;
    let balanceAmt = 0;
    let refundAmt = 0;
    filteredNotes.forEach((n) => {
      totalAmt += parseFloat(n.total_amount || 0);
      balanceAmt += parseFloat(n.balance_amount || 0);
      refundAmt += parseFloat(n.refund_amount || 0);
    });
    return { totalAmt, balanceAmt, refundAmt };
  }, [filteredNotes]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedFirm, fromDate, toDate, period, paymentFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredNotes.length / rowsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedNotes = useMemo(() => {
    const start = (safePage - 1) * rowsPerPage;
    return filteredNotes.slice(start, start + rowsPerPage);
  }, [filteredNotes, safePage, rowsPerPage]);

  // Excel Export
  const handleExportExcel = () => {
    if (filteredNotes.length === 0) {
      alert("No data available to export.");
      return;
    }
    const data = filteredNotes.map((n, idx) => ({
      "#": idx + 1,
      Date: formatDateDMY(n.return_date || n.created_at),
      "Return No": n.return_no || n.id,
      "Party Name": n.customer_name || "Cash Customer",
      Type: "Credit Note",
      Total: parseFloat(n.total_amount || 0),
      Received: parseFloat(n.refund_amount || 0),
      Balance: parseFloat(n.balance_amount || 0),
      Status: parseFloat(n.balance_amount || 0) <= 0 ? "Paid" : (parseFloat(n.refund_amount || 0) > 0 ? "Partial" : "Unpaid"),
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Credit_Notes");
    XLSX.writeFile(workbook, `Credit_Note_Report_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // Delete Credit Note
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await api.post("/credit_note/delete", { id: deleteTarget.id });
      if (res.data.status) {
        setCreditNotes((prev) => prev.filter((n) => n.id !== deleteTarget.id));
        setActionToast("Credit note deleted and inventory stock restored.");
        setDeleteTarget(null);
        setTimeout(() => setActionToast(null), 3500);
      } else {
        setActionToast(res.data.message || "Failed to delete credit note.");
        setTimeout(() => setActionToast(null), 3500);
      }
    } catch (err) {
      console.error(err);
      setActionToast(err.response?.data?.message || "Error deleting credit note.");
      setTimeout(() => setActionToast(null), 3500);
    } finally {
      setDeleting(false);
    }
  };

  const paymentFilterLabels = {
    all: "All Payment",
    unpaid: "Unpaid / Unused",
    partial: "Partial",
    paid: "Paid / Used",
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* ── 1. TOP HEADER: Title + Add Credit Note ── */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-2 select-none">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Sale Return (Credit Note)</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/sales/credit-note/add")}
            className="app-btn-primary h-9 px-4 rounded-xl text-sm font-semibold shadow-sm cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add Credit Note</span>
          </button>

          <HeaderSettingsButton
            variant="list"
            onClick={() => setShowColumnDrawer(true)}
            isActive={showColumnDrawer}
          />
        </div>
      </div>

      {/* ── 2. FILTER ROW: Period, Date Range, Firms, Payment Status ── */}
      <div className="flex flex-wrap items-center gap-2.5 py-4 text-xs">
        <span className="font-semibold text-slate-500 mr-1">Filter by :</span>

        {/* Period Pill Dropdown */}
        <div className="relative">
          <button
            onClick={() => setPeriodOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-50/80 hover:bg-sky-100/70 text-slate-700 font-semibold rounded-full border border-sky-100 transition cursor-pointer"
          >
            <span>{PERIOD_LABELS[period] || "This Month"}</span>
            <ChevronDown size={14} className={`text-slate-500 transition-transform ${periodOpen ? "rotate-180" : ""}`} />
          </button>

          {periodOpen && (
            <div className="absolute left-0 top-9 w-36 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
              {Object.entries(PERIOD_LABELS).map(([key, label]) => (
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

        {/* Payment Status Dropdown Pill */}
        <div className="relative">
          <button
            onClick={() => setPaymentOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-50/80 hover:bg-sky-100/70 text-slate-700 font-semibold rounded-full border border-sky-100 transition cursor-pointer"
          >
            <span>{paymentFilterLabels[paymentFilter] || "All Payment"}</span>
            <ChevronDown size={14} className={`text-slate-500 transition-transform ${paymentOpen ? "rotate-180" : ""}`} />
          </button>

          {paymentOpen && (
            <div className="absolute left-0 top-9 w-40 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
              {Object.entries(paymentFilterLabels).map(([key, label]) => (
                <div
                  key={key}
                  onClick={() => { setPaymentFilter(key); setPaymentOpen(false); }}
                  className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition ${
                    paymentFilter === key ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Refresh button */}
        <button
          onClick={fetchCreditNotes}
          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-full transition cursor-pointer ml-auto"
          title="Refresh Credit Notes"
        >
          <RefreshCw size={15} className={loading ? "animate-spin text-blue-600" : ""} />
        </button>
      </div>

      {/* ── 3. SUMMARY KPI CARD ── */}
      <div className="my-2">
        <div className="bg-white border border-purple-200/90 rounded-2xl p-4 w-72 sm:w-80 shadow-2xs">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Return Value</span>
            <div className="flex flex-col items-end">
              <span className="inline-flex items-center text-[11px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                100% ↗
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">vs last month</span>
            </div>
          </div>

          <div className="text-2xl font-black text-slate-900 my-1 tracking-tight">
            ₹ {totals.totalAmt.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100 mt-2">
            <span>
              Refunded: <strong className="text-slate-800 font-bold">₹ {totals.refundAmt.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              Balance: <strong className="text-slate-800 font-bold">₹ {totals.balanceAmt.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
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
                  placeholder="Search return no, customer..."
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
                {visibleColumns.return_no && (
                  <th className="py-3 px-3.5 border-r border-slate-200 whitespace-nowrap">
                    Return No
                  </th>
                )}
                {visibleColumns.party_name && (
                  <th className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">
                    Party Name
                  </th>
                )}
                {visibleColumns.type && (
                  <th className="py-3 px-3.5 border-r border-slate-200 whitespace-nowrap">
                    Type
                  </th>
                )}
                {visibleColumns.total && (
                  <th className="py-3 px-4 border-r border-slate-200 text-right whitespace-nowrap">
                    Total
                  </th>
                )}
                {visibleColumns.refund && (
                  <th className="py-3 px-4 border-r border-slate-200 text-right whitespace-nowrap">
                    Refund
                  </th>
                )}
                {visibleColumns.balance && (
                  <th className="py-3 px-4 border-r border-slate-200 text-right whitespace-nowrap">
                    Balance
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
                    <span>Loading Credit Notes...</span>
                  </td>
                </tr>
              ) : filteredNotes.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnCount || 1} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-500">No credit notes found for this period.</p>
                    <p className="text-xs text-slate-400 mt-1">Click &quot;+ Add Credit Note&quot; to record a customer sale return.</p>
                  </td>
                </tr>
              ) : (
                paginatedNotes.map((n, idx) => {
                  const total = parseFloat(n.total_amount || 0);
                  const refund = parseFloat(n.refund_amount || 0);
                  const balance = parseFloat(n.balance_amount || 0);
                  const isPaid = balance <= 0;
                  const isPartial = balance > 0 && refund > 0;
                  const isMenuOpen = activeMenuId === n.id;

                  return (
                    <tr
                      key={n.id || idx}
                      className="group hover:bg-[#eaedf2] transition-colors duration-150 text-slate-700 cursor-pointer"
                      onClick={() => navigate(`/invoice/${n.return_no || n.id}`)}
                    >
                      {/* Date */}
                      {visibleColumns.date && (
                        <td className="py-3.5 px-3.5 border-r border-slate-200 font-medium group-hover:font-bold text-slate-600 group-hover:text-slate-900 whitespace-nowrap">
                          {formatDateDMY(n.return_date || n.created_at)}
                        </td>
                      )}

                      {/* Return No */}
                      {visibleColumns.return_no && (
                        <td className="py-3.5 px-3.5 border-r border-slate-200 font-medium group-hover:font-bold text-blue-600 group-hover:text-blue-800 whitespace-nowrap">
                          {n.return_no || n.id}
                        </td>
                      )}

                      {/* Party Name */}
                      {visibleColumns.party_name && (
                        <td className="py-3.5 px-4 border-r border-slate-200 font-medium group-hover:font-bold text-slate-800 group-hover:text-slate-950 whitespace-nowrap">
                          {n.customer_name || "Cash Customer"}
                        </td>
                      )}

                      {/* Type */}
                      {visibleColumns.type && (
                        <td className="py-3.5 px-3.5 border-r border-slate-200 text-slate-600 group-hover:text-slate-900 font-medium whitespace-nowrap">
                          Credit Note
                        </td>
                      )}

                      {/* Total */}
                      {visibleColumns.total && (
                        <td className="py-3.5 px-4 border-r border-slate-200 text-right font-bold text-slate-900 whitespace-nowrap">
                          ₹ {total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      )}

                      {/* Refund */}
                      {visibleColumns.refund && (
                        <td className="py-3.5 px-4 border-r border-slate-200 text-right font-medium text-slate-800 whitespace-nowrap">
                          ₹ {refund.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      )}

                      {/* Balance */}
                      {visibleColumns.balance && (
                        <td className="py-3.5 px-4 border-r border-slate-200 text-right font-bold text-rose-600 whitespace-nowrap">
                          ₹ {balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      )}

                      {/* Status */}
                      {visibleColumns.status && (
                        <td className="py-3.5 px-3.5 border-r border-slate-200 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wide border ${
                              isPaid
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : isPartial
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {isPaid ? "Paid" : isPartial ? "Partial" : "Unpaid"}
                          </span>
                        </td>
                      )}

                      {/* Actions */}
                      {visibleColumns.actions && (
                        <td className="py-3.5 px-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            {/* Print Icon Button */}
                            <button
                              onClick={() => navigate(`/invoice/${n.return_no || n.id}`)}
                              className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition cursor-pointer"
                              title="Print / View Invoice"
                            >
                              <Printer size={15} />
                            </button>

                            {/* Share with Popover */}
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveShareId(activeShareId === n.id ? null : n.id);
                                }}
                                className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition cursor-pointer"
                                title="Share"
                              >
                                <Share2 size={15} />
                              </button>
                              <ShareTransactionPopover
                                isOpen={activeShareId === n.id}
                                onClose={() => setActiveShareId(null)}
                                transaction={n}
                                type="Credit Note"
                              />
                            </div>

                            {/* 3-Dot More Menu */}
                            <div className="relative">
                              <button
                                onClick={() => setActiveMenuId(isMenuOpen ? null : n.id)}
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
                                      navigate(`/sales/credit-note/edit/${n.id}`);
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
                                      navigate(`/invoice/${n.return_no || n.id}`);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition text-left cursor-pointer"
                                  >
                                    <Eye size={14} className="text-slate-600" />
                                    <span>View Receipt</span>
                                  </button>
                                  <div className="border-t border-slate-100 my-1" />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMenuId(null);
                                      setDeleteTarget(n);
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
          {filteredNotes.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-200 text-xs text-slate-600 bg-white">
              <div className="flex items-center gap-4">
                <span>
                  Showing <strong className="font-semibold text-slate-800">{(safePage - 1) * rowsPerPage + 1}</strong> to{" "}
                  <strong className="font-semibold text-slate-800">
                    {Math.min(safePage * rowsPerPage, filteredNotes.length)}
                  </strong>{" "}
                  of <strong className="font-semibold text-slate-800">{filteredNotes.length}</strong> credit notes
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
                    <option value={100}>100</option>
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

      {/* ── DELETE MODAL ── */}
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
                <h3 className="text-base font-bold text-slate-900">Delete Credit Note?</h3>
                <p className="text-xs text-slate-500 font-mono">Return #{deleteTarget.return_no || deleteTarget.id}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-5 bg-slate-50 p-3 rounded-xl border border-slate-100">
              Deleting this credit note will revert the inventory stock and re-adjust customer debt balance.
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
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {deleting && <RefreshCw size={14} className="animate-spin" />}
                <span>{deleting ? "Deleting..." : "Yes, Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ACTION TOAST ── */}
      {actionToast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[99999] px-4 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-200">
          {actionToast}
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
        subtitle="Show or hide columns in Credit Note table"
      />
    </div>
  );
}
