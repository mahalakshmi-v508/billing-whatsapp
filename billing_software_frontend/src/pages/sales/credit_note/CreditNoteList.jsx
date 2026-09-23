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
  FileSpreadsheet,
  Filter,
  Trash2,
  Eye,
  AlertTriangle,
  X,
  RefreshCw,
  FileText,
  MoreVertical,
  Share2,
  Pencil,
  Edit,
  Hash,
  User,
  ArrowLeftRight,
  IndianRupee,
  CheckCircle2,
  Wallet,
  SlidersHorizontal,
} from "lucide-react";
import TableActions from "../../../components/ui/TableActions";
import HeaderSettingsButton from "../../../components/HeaderSettingsButton";
import CommonTableColumnSettings from "../../../components/CommonTableColumnSettings";
import useTableColumns from "../../../hooks/useTableColumns";

const DEFAULT_COLUMNS = [
  { key: "index", label: "#", icon: Hash, color: "text-slate-600", bg: "bg-slate-100", desc: "Index sequence number" },
  { key: "date", label: "Date", icon: Calendar, color: "text-indigo-600", bg: "bg-indigo-50", desc: "Credit note date" },
  { key: "return_no", label: "Return No.", icon: FileText, color: "text-blue-600", bg: "bg-blue-50", desc: "Unique credit note voucher number" },
  { key: "party_name", label: "Party Name", icon: User, color: "text-emerald-600", bg: "bg-emerald-50", desc: "Customer or party" },
  { key: "type", label: "Type", icon: ArrowLeftRight, color: "text-purple-600", bg: "bg-purple-50", desc: "Sales Return or Credit adjustment" },
  { key: "total", label: "Total", icon: IndianRupee, color: "text-slate-600", bg: "bg-slate-100", desc: "Total return value" },
  { key: "refunded", label: "Refunded", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", desc: "Settled / refunded amount" },
  { key: "balance", label: "Balance", icon: Wallet, color: "text-rose-600", bg: "bg-rose-50", desc: "Remaining credit balance" },
  { key: "status", label: "Status", icon: CheckCircle2, color: "text-cyan-600", bg: "bg-cyan-50", desc: "Credit note status" },
  { key: "actions", label: "Actions", icon: SlidersHorizontal, color: "text-slate-600", bg: "bg-slate-100", desc: "Print, Share & More" },
];

export default function CreditNoteList() {
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
  } = useTableColumns("credit_note_columns", DEFAULT_COLUMNS);

  // Data states
  const [creditNotes, setCreditNotes] = useState([]);
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

  const [docType, setDocType] = useState("credit_note");
  const [paymentFilter, setPaymentFilter] = useState("all");

  // Date range
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Search & Actions
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionToast, setActionToast] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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

  // Initial Load: Companies & Cashiers
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
        console.error(err);
      }
    };
    loadMeta();
  }, [adminId, user.role]);

  // Fetch Credit Notes
  const fetchCreditNotes = async () => {
    if (!adminId) {
      setLoading(false);
      return;
    }
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

      // User filter
      if (selectedUser !== "all" && item.cashier_id) {
        if (String(item.cashier_id) !== String(selectedUser)) return false;
      }

      // Payment filter (matching media_1787845504680.png)
      if (paymentFilter !== "all") {
        const bal = parseFloat(item.balance_amount || 0);
        const ref = parseFloat(item.refund_amount || 0);
        if (paymentFilter === "unpaid" && !(bal > 0 && ref === 0)) return false;
        if (paymentFilter === "partial" && !(bal > 0 && ref > 0)) return false;
        if (paymentFilter === "paid" && !(bal <= 0)) return false;
        if (paymentFilter === "cancelled" && item.is_deleted !== 1) return false;
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
  }, [creditNotes, fromDate, toDate, selectedFirm, selectedUser, paymentFilter, searchQuery]);

  // Summary Totals
  const totals = useMemo(() => {
    let totalAmt = 0;
    let balanceAmt = 0;
    filteredNotes.forEach((n) => {
      totalAmt += parseFloat(n.total_amount || 0);
      balanceAmt += parseFloat(n.balance_amount || 0);
    });
    return { totalAmt, balanceAmt };
  }, [filteredNotes]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedFirm, selectedUser, fromDate, toDate, period, paymentFilter]);

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
      "Ref. no.": n.return_no || n.id,
      "Party Name": n.customer_name || "Cash Customer",
      Type: "Credit Note",
      Total: parseFloat(n.total_amount || 0),
      Received: parseFloat(n.refund_amount || 0),
      Balance: parseFloat(n.balance_amount || 0),
      Status: parseFloat(n.balance_amount || 0) <= 0 ? "Paid" : (parseFloat(n.refund_amount || 0) > 0 ? "Partial" : "Unpaid"),
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Credit Note");
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
        setActionToast({ msg: "Credit note deleted and inventory stock restored.", ok: true });
        setDeleteTarget(null);
        setTimeout(() => setActionToast(null), 3500);
      } else {
        setActionToast({ msg: res.data.message || "Failed to delete credit note.", ok: false });
        setTimeout(() => setActionToast(null), 3500);
      }
    } catch (err) {
      console.error(err);
      setActionToast({ msg: err.response?.data?.message || "Error deleting credit note.", ok: false });
      setTimeout(() => setActionToast(null), 3500);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faff] p-4 sm:p-6 lg:p-8 space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* ── 1. TOP HEADER: Title + Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 select-none">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-lg shadow-rose-100 ring-4 ring-rose-50/50">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Sale Return / Credit Notes
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manage merchandise returns, credit adjustments, and refund vouchers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <HeaderSettingsButton
            onClick={() => setShowColumnDrawer(true)}
            isActive={showColumnDrawer}
          />

          <button
            onClick={() => navigate("/sales/credit-note/add")}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-200 transition-all transform active:scale-95 cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.8} />
            <span>Create Credit Note</span>
          </button>
        </div>
      </div>

      {/* ── 2. METRIC KPI CARDS (PaySplitX 4-Card Strip) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Return Value */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Return Value</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
                ₹ {totals.totalAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-black">
              ₹
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>{filteredNotes.length} Total Credit Notes</span>
            <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
              Merchandise Returns
            </span>
          </div>
        </div>

        {/* Card 2: Refund / Paid */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Refunded / Settled</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1 tracking-tight">
                ₹ {(totals.totalAmt - totals.balanceAmt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              Paid
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Cash / Ledger Settle</span>
            <span className="text-[11px] font-semibold text-emerald-600">
              {totals.totalAmt > 0 ? `${Math.round(((totals.totalAmt - totals.balanceAmt) / totals.totalAmt) * 100)}%` : "0%"} settled
            </span>
          </div>
        </div>

        {/* Card 3: Unadjusted Balance */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Unadjusted Credit</p>
              <h3 className="text-2xl font-black text-amber-600 mt-1 tracking-tight">
                ₹ {totals.balanceAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              Bal
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Available customer credit</span>
            <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              Pending offset
            </span>
          </div>
        </div>

        {/* Card 4: Average Return Size */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Average Return</p>
              <h3 className="text-2xl font-black text-indigo-600 mt-1 tracking-tight">
                ₹ {filteredNotes.length > 0 ? (totals.totalAmt / filteredNotes.length).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              Avg
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Per return transaction</span>
            <span className="text-[11px] font-semibold text-slate-600">Active period</span>
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
              onClick={() => setPeriodOpen(!periodOpen)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer"
            >
              <span>{period === "all_time" ? "All Time" : period === "this_month" ? "This Month" : period.replace("_", " ")}</span>
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

          {/* Date Range Picker */}
          <div className="flex items-center gap-1.5 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 bg-slate-50 text-xs">
            <Calendar size={13} className="text-slate-400" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="outline-none text-xs bg-transparent cursor-pointer font-semibold text-slate-700"
            />
            <span className="text-slate-400 font-bold">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="outline-none text-xs bg-transparent cursor-pointer font-semibold text-slate-700"
            />
          </div>

          {/* ALL FIRMS Dropdown */}
          <div className="relative">
            <button
              onClick={() => setFirmOpen(!firmOpen)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer"
            >
              <span>
                {selectedFirm === "all"
                  ? "All Companies"
                  : companies.find((c) => String(c.id) === String(selectedFirm))?.company_name || "Company"}
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
                  All Companies
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

          {/* Payment Status Dropdown */}
          <div className="border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 text-xs font-bold text-slate-700">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-transparent outline-none cursor-pointer text-xs font-semibold text-slate-700"
            >
              <option value="all">All Payment</option>
              <option value="unpaid">Unpaid / Unused</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid / Settled</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Right Tools: Search + Excel Report & Print */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search credit notes..."
              className="bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none w-44 font-medium"
            />
          </div>

          <button
            onClick={handleExportExcel}
            className="px-3 h-8 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center gap-1.5 text-emerald-700 hover:bg-emerald-100 font-bold text-xs transition cursor-pointer"
            title="Export to Excel"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>Excel</span>
          </button>

          <button
            onClick={() => window.print()}
            className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition cursor-pointer"
            title="Print List"
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
                {visibleColumns.index && <th className="py-3.5 px-4 text-center w-12">#</th>}
                {visibleColumns.date && <th className="py-3.5 px-4">Date</th>}
                {visibleColumns.return_no && <th className="py-3.5 px-4 text-right">Return No.</th>}
                {visibleColumns.party_name && <th className="py-3.5 px-4">Party Name</th>}
                {visibleColumns.type && <th className="py-3.5 px-4">Type</th>}
                {visibleColumns.total && <th className="py-3.5 px-4 text-right">Total</th>}
                {visibleColumns.refunded && <th className="py-3.5 px-4 text-right">Refunded</th>}
                {visibleColumns.balance && <th className="py-3.5 px-4 text-right">Balance</th>}
                {visibleColumns.status && <th className="py-3.5 px-4 text-center">Status</th>}
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={visibleColumnCount || 10} className="py-14 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin text-rose-500 mx-auto mb-2" />
                    <span>Loading Credit Notes...</span>
                  </td>
                </tr>
              ) : filteredNotes.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnCount || 10} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 mb-4 flex items-center justify-center rounded-2xl bg-rose-50 text-rose-400">
                        <FileText size={32} strokeWidth={1.5} />
                      </div>
                      <p className="text-sm font-bold text-slate-700">No credit notes found.</p>
                      <p className="text-xs text-slate-400 mt-1">Create a new credit note to record customer returns.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedNotes.map((n, idx) => {
                  const seqNo = (safePage - 1) * rowsPerPage + idx + 1;
                  const total = parseFloat(n.total_amount || 0);
                  const refund = parseFloat(n.refund_amount || 0);
                  const balance = parseFloat(n.balance_amount || 0);

                  return (
                    <tr
                      key={n.id || idx}
                      className="hover:bg-rose-50/20 transition-colors text-slate-700"
                    >
                      {visibleColumns.index && (
                        <td className="py-3.5 px-4 text-center font-semibold text-slate-400">
                          {seqNo}
                        </td>
                      )}

                      {visibleColumns.date && (
                        <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                          {formatDateDMY(n.return_date || n.created_at)}
                        </td>
                      )}

                      {visibleColumns.return_no && (
                        <td className="py-3.5 px-4 text-right font-bold text-rose-600 whitespace-nowrap">
                          #{n.return_no || n.id}
                        </td>
                      )}

                      {visibleColumns.party_name && (
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{n.customer_name || "Cash Customer"}</div>
                          {n.customer_phone && <div className="text-[10px] text-slate-400 font-normal">{n.customer_phone}</div>}
                        </td>
                      )}

                      {visibleColumns.type && (
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                            Credit Note
                          </span>
                        </td>
                      )}

                      {visibleColumns.total && (
                        <td className="py-3.5 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                          ₹ {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      )}

                      {visibleColumns.refunded && (
                        <td className="py-3.5 px-4 text-right font-black text-emerald-600 whitespace-nowrap">
                          ₹ {refund.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      )}

                      {visibleColumns.balance && (
                        <td className="py-3.5 px-4 text-right font-black text-rose-600 whitespace-nowrap">
                          ₹ {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      )}

                      {visibleColumns.status && (
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              balance <= 0
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                : refund > 0
                                ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                                : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                balance <= 0 ? "bg-emerald-600" : refund > 0 ? "bg-amber-600" : "bg-rose-600"
                              }`}
                            />
                            {balance <= 0 ? "Paid" : refund > 0 ? "Partial" : "Unpaid"}
                          </span>
                        </td>
                      )}

                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <TableActions
                          onPrint={() => navigate(`/invoice/${n.return_no || n.id}`)}
                          printTitle="Print"
                          shareTransaction={n}
                          shareType="Credit Note"
                          onViewInvoice={() => navigate(`/invoice/${n.return_no || n.id}`)}
                          viewInvoiceLabel="View Invoice"
                          menuItems={[
                            {
                              label: "Edit Details",
                              icon: Edit,
                              onClick: () => navigate(`/sales/credit-note/edit/${n.id}`),
                            },
                            {
                              label: "View Invoice",
                              icon: Eye,
                              onClick: () => navigate(`/invoice/${n.return_no || n.id}`),
                            },
                            { isDivider: true },
                            {
                              label: "Delete Voucher",
                              icon: Trash2,
                              isDanger: true,
                              onClick: () => setDeleteTarget(n),
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
          {filteredNotes.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-200 text-xs text-slate-600 bg-white">
              <div className="flex items-center gap-4">
                <span>
                  Showing <strong>{(safePage - 1) * rowsPerPage + 1}</strong> to{" "}
                  <strong>{Math.min(safePage * rowsPerPage, filteredNotes.length)}</strong> of{" "}
                  <strong>{filteredNotes.length}</strong> entries
                </span>
                <div className="flex items-center gap-1.5">
                  <span>Rows:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-slate-300 rounded px-1.5 py-0.5 text-xs"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40"
                >
                  <ChevronLeft size={15} />
                </button>

                <span className="px-3 py-1 bg-blue-600 text-white font-bold rounded-lg text-xs">
                  {safePage}
                </span>

                <button
                  disabled={safePage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>

      {/* ── 4. BOTTOM SUMMARY BAR (Matching media_1787845504680.png) ── */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between text-xs font-bold">
        <div className="text-slate-700">
          Total Amount:{" "}
          <span className="text-teal-600 font-extrabold text-sm ml-1">
            ₹ {totals.totalAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="text-slate-700">
          Balance:{" "}
          <span className="text-slate-900 font-extrabold text-sm ml-1">
            ₹ {totals.balanceAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* ── DELETE MODAL ── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200"
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

            <p className="text-sm text-slate-600 mb-4">
              Deleting this credit note will revert the inventory stock and re-adjust customer debt balance.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                disabled={deleting}
                onClick={handleDelete}
                className="px-5 py-2 text-sm font-bold text-white bg-red-600 rounded-xl disabled:opacity-50 flex items-center gap-2"
              >
                {deleting && <RefreshCw size={14} className="animate-spin" />}
                <span>Yes, Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ACTION TOAST ── */}
      {actionToast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 28,
            zIndex: 99999,
            minWidth: 320,
            background: actionToast.ok ? "#10b981" : "#ef4444",
            color: "#ffffff",
            borderRadius: 6,
            padding: "12px 16px",
            boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 500 }}>{actionToast.msg}</span>
          <button onClick={() => setActionToast(null)} className="text-white">
            <X size={15} />
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
    </div>
  );
}
