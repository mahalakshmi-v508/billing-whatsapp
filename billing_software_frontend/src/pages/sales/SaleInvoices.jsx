import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import * as XLSX from "xlsx";
import {
  Plus,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Search,
  BarChart2,
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
  FileSpreadsheet,
  FileText,
  User,
  ArrowLeftRight,
  CreditCard,
  IndianRupee,
  Wallet,
  CheckCircle2,
  SlidersHorizontal,
  GripVertical,
  RotateCcw,
  Check,
  Truck,
  TrendingUp,
  Receipt,
  ArrowUpRight
} from "lucide-react";
import ShareTransactionPopover from "../../components/ShareTransactionPopover";
import StatusBadge from "../../components/ui/StatusBadge";
import TableActions from "../../components/ui/TableActions";

// Table columns list for customization drawer with rich icons and colors
const DEFAULT_COLUMNS = [
  { key: "date", label: "Date", icon: Calendar, color: "text-indigo-600", bg: "bg-indigo-50", desc: "Invoice creation date" },
  { key: "invoice_no", label: "Invoice No", icon: FileText, color: "text-blue-600", bg: "bg-blue-50", desc: "Unique bill number" },
  { key: "party_name", label: "Party Name", icon: User, color: "text-emerald-600", bg: "bg-emerald-50", desc: "Customer or party" },
  { key: "transaction", label: "Transaction", icon: ArrowLeftRight, color: "text-purple-600", bg: "bg-purple-50", desc: "Sale or PoS type" },
  { key: "payment_type", label: "Payment Type", icon: CreditCard, color: "text-amber-600", bg: "bg-amber-50", desc: "Cash, UPI, Credit, etc." },
  { key: "amount", label: "Amount", icon: IndianRupee, color: "text-teal-600", bg: "bg-teal-50", desc: "Total invoice value" },
  { key: "balance", label: "Balance", icon: Wallet, color: "text-rose-600", bg: "bg-rose-50", desc: "Remaining credit due" },
  { key: "status", label: "Status", icon: CheckCircle2, color: "text-cyan-600", bg: "bg-cyan-50", desc: "Paid, Unpaid or Partial" },
  { key: "actions", label: "Actions", icon: SlidersHorizontal, color: "text-slate-600", bg: "bg-slate-100", desc: "Print, View & Delete" },
];

const periodLabels = {
  all_time: "All Time",
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This Week",
  this_month: "This Month",
  last_month: "Last Month",
  this_year: "This Year",
  custom: "Custom Range",
};

export default function SaleInvoices() {
  const navigate = useNavigate();

  // User & Admin session
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  const adminId = user?.role === "admin" ? user?.id : user?.admin_id;

  // Data states
  const [invoices, setInvoices] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [cashiers, setCashiers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Column Customization Drawer state & persistence
  const [showColumnDrawer, setShowColumnDrawer] = useState(false);
  const [columnSearch, setColumnSearch] = useState("");
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem("sale_invoice_columns");
      if (saved) {
        const parsed = JSON.parse(saved);
        return DEFAULT_COLUMNS.reduce((acc, col) => ({
          ...acc,
          [col.key]: parsed[col.key] !== undefined ? parsed[col.key] : true,
        }), {});
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_COLUMNS.reduce((acc, col) => ({ ...acc, [col.key]: true }), {});
  });

  const toggleColumn = (key) => {
    setVisibleColumns((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("sale_invoice_columns", JSON.stringify(next));
      return next;
    });
  };

  const selectAllColumns = (val) => {
    const next = DEFAULT_COLUMNS.reduce((acc, col) => ({ ...acc, [col.key]: val }), {});
    setVisibleColumns(next);
    localStorage.setItem("sale_invoice_columns", JSON.stringify(next));
  };

  const resetDefaultColumns = () => {
    const next = DEFAULT_COLUMNS.reduce((acc, col) => ({ ...acc, [col.key]: true }), {});
    setVisibleColumns(next);
    localStorage.setItem("sale_invoice_columns", JSON.stringify(next));
  };

  const visibleColumnCount = DEFAULT_COLUMNS.filter((col) => visibleColumns[col.key]).length || 1;

  // Filter states
  const [period, setPeriod] = useState("this_month");
  const [periodOpen, setPeriodOpen] = useState(false);
  const [selectedFirm, setSelectedFirm] = useState("all");
  const [firmOpen, setFirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState("all");
  const [userOpen, setUserOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "paid" | "unpaid" | "partial"

  // Date range
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Search & view toggles
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [activeShareId, setActiveShareId] = useState(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionToast, setActionToast] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const menuRef = useRef(null);

  // Helper: Format DD/MM/YYYY
  const formatDateDMY = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleString("en-IN", { month: "short" });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Preset Date Helper
  const setPresetDates = (type) => {
    const now = new Date();
    let from = new Date();
    let to = new Date();

    if (type === "all_time") {
      setFromDate("");
      setToDate("");
      setPeriod("all_time");
      setPeriodOpen(false);
      return;
    }

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

    const fmtYMD = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    setFromDate(fmtYMD(from));
    setToDate(fmtYMD(to));
    setPeriod(type);
    setPeriodOpen(false);
  };

  // Initial date calculation
  useEffect(() => {
    setPresetDates("this_month");
  }, []);

  // Fetch Invoices
  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/invoice/get_all_invoices?admin_id=${adminId || 0}`);
      if (res.data?.status) {
        setInvoices(res.data.data || []);
      } else {
        setInvoices([]);
      }
    } catch (err) {
      console.error(err);
      try {
        const fallbackRes = await api.get(`/invoice/get_all_invoice?admin_id=${adminId || 0}`);
        if (fallbackRes.data?.status) {
          setInvoices(fallbackRes.data.data || []);
        } else {
          setInvoices([]);
        }
      } catch (fallbackErr) {
        console.error(fallbackErr);
        setInvoices([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch Companies
  const fetchCompanies = async () => {
    if (!adminId) return;
    try {
      const res = await api.get(`/company/get_companies_by_admin?admin_id=${adminId}`);
      if (res.data?.status) {
        setCompanies(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Cashiers
  const fetchCashiers = async () => {
    if (!adminId) return;
    try {
      const res = await api.get(`/cashier/get_all_cashier?admin_id=${adminId}`);
      if (res.data?.status) {
        setCashiers(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
      try {
        const postRes = await api.post("/cashier/get_cashiers", { admin_id: adminId });
        if (postRes.data?.status) {
          setCashiers(postRes.data.data || []);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchCompanies();
    fetchCashiers();
  }, [adminId]);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
      setPeriodOpen(false);
      setFirmOpen(false);
      setUserOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Filtered Invoices List
  const filteredInvoices = useMemo(() => {
    return invoices.filter((item) => {
      // Date filter
      if (fromDate && toDate && item.created_at) {
        const itemDate = item.created_at.split("T")[0].split(" ")[0];
        if (itemDate < fromDate || itemDate > toDate) return false;
      }

      // Company/Firm filter
      if (selectedFirm !== "all" && item.company_id) {
        if (String(item.company_id) !== String(selectedFirm)) return false;
      }

      // Cashier/User filter
      if (selectedUser !== "all") {
        if (String(item.cashier_id) !== String(selectedUser)) return false;
      }

      // Status tab filter
      if (statusFilter !== "all") {
        const bal = Number(item.balance_amount || 0);
        const paid = Number(item.paid_amount || 0);
        if (statusFilter === "paid" && bal > 0) return false;
        if (statusFilter === "unpaid" && (bal <= 0 || paid > 0)) return false;
        if (statusFilter === "partial" && (bal <= 0 || paid <= 0)) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const invoiceNo = String(item.invoice_no || "").toLowerCase();
        const customer = String(item.customer_name || "").toLowerCase();
        const phone = String(item.customer_phone || "").toLowerCase();
        const paymentType = String(item.payment_method || "").toLowerCase();
        if (!invoiceNo.includes(q) && !customer.includes(q) && !phone.includes(q) && !paymentType.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [invoices, fromDate, toDate, selectedFirm, selectedUser, statusFilter, searchQuery]);

  // Financial KPIs (Matching EstimateQuotation 4-card structure)
  const summary = useMemo(() => {
    let total_amount = 0;
    let total_paid = 0;
    let total_pending = 0;
    let paidCount = 0;

    filteredInvoices.forEach((inv) => {
      const tot = Number(inv.total_amount || 0);
      const bal = Number(inv.balance_amount || 0);
      const pd = Number(inv.paid_amount || 0);

      total_amount += tot;
      total_paid += pd;
      total_pending += bal;
      if (bal <= 0) paidCount++;
    });

    return { total_amount, total_paid, total_pending, paidCount };
  }, [filteredInvoices]);

  // % change vs last month calculation
  const pctChange = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastMonthTotal = invoices.reduce((acc, inv) => {
      if (!inv.created_at) return acc;
      const d = new Date(inv.created_at);
      return d >= start && d <= end ? acc + Number(inv.total_amount || 0) : acc;
    }, 0);
    return lastMonthTotal > 0 ? ((summary.total_amount - lastMonthTotal) / lastMonthTotal) * 100 : 0;
  }, [invoices, summary.total_amount]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedInvoices = useMemo(() => {
    const start = (safePage - 1) * rowsPerPage;
    return filteredInvoices.slice(start, start + rowsPerPage);
  }, [filteredInvoices, safePage, rowsPerPage]);

  // Delete Invoice Handler
  const handleDeleteInvoice = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await api.post("/invoice/delete_invoice", {
        invoice_no: deleteTarget.invoice_no,
        id: deleteTarget.id,
      });
      if (res.data?.status) {
        setInvoices((prev) => prev.filter((inv) => inv.invoice_no !== deleteTarget.invoice_no));
        setActionToast({ msg: "Invoice deleted and stock restored successfully.", ok: true });
        setDeleteTarget(null);
        setTimeout(() => setActionToast(null), 3500);
      } else {
        setActionToast({ msg: res.data?.message || "Failed to delete invoice.", ok: false });
        setTimeout(() => setActionToast(null), 3500);
      }
    } catch (err) {
      console.error(err);
      setActionToast({ msg: err.response?.data?.message || "Error deleting invoice.", ok: false });
      setTimeout(() => setActionToast(null), 3500);
    } finally {
      setDeleting(false);
    }
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (filteredInvoices.length === 0) {
      alert("No data available to export.");
      return;
    }

    const data = filteredInvoices.map((inv) => ({
      Date: formatDateDMY(inv.created_at),
      "Invoice No": inv.invoice_no,
      "Party Name": inv.customer_name || "Cash Sale",
      Transaction: inv.is_pos ? "PoS Sale" : "Sale",
      "Payment Type": inv.payment_method || "Cash",
      Amount: Number(inv.total_amount || 0),
      Paid: Number(inv.paid_amount || 0),
      Balance: Number(inv.balance_amount || 0),
      Status: Number(inv.balance_amount || 0) === 0 ? "Paid" : "Unpaid",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sale Invoices");
    XLSX.writeFile(wb, `Sale_Invoices_${fromDate || "all"}_to_${toDate || "all"}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-[#f8faff] p-4 sm:p-6 lg:p-8 space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* ── 1. TOP HEADER: Matching EstimateQuotation ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 select-none">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-lg shadow-indigo-100 ring-4 ring-indigo-50/50 shrink-0">
            <Receipt size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Sales Invoices &amp; Billing
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                {filteredInvoices.length} Invoices
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manage, track, print, and share all sales invoices, PoS bills, and receivables
            </p>
          </div>
        </div>

        {/* Header CTA Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowColumnDrawer(true)}
            className={`h-10 px-3.5 rounded-xl border flex items-center gap-2 text-xs font-semibold transition cursor-pointer ${
              showColumnDrawer
                ? "bg-indigo-50 border-indigo-200 text-indigo-600 ring-2 ring-indigo-500/20"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-xs"
            }`}
            title="Customise Table Columns"
          >
            <Settings size={15} />
            <span className="hidden sm:inline">Columns</span>
          </button>

          <button
            onClick={() => navigate("/sales/add")}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-200 transition-all transform active:scale-95 cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.8} />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* ── 2. METRIC KPI CARDS (Matching EstimateQuotation 4-Card Strip) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Sales Invoiced */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Invoiced</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
                ₹ {summary.total_amount.toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
              ₹
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>{filteredInvoices.length} Total invoices</span>
            <span className={`inline-flex items-center gap-1 font-bold ${pctChange >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
              {pctChange.toFixed(0)}% <TrendingUp size={13} />
            </span>
          </div>
        </div>

        {/* Card 2: Payments Collected */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Payments Collected</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1 tracking-tight">
                ₹ {summary.total_paid.toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Cleared receipts</span>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {summary.total_amount > 0 ? `${Math.round((summary.total_paid / summary.total_amount) * 100)}%` : "0%"} rate
            </span>
          </div>
        </div>

        {/* Card 3: Pending Receivables */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Receivables</p>
              <h3 className="text-2xl font-black text-rose-600 mt-1 tracking-tight">
                ₹ {summary.total_pending.toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Wallet size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Outstanding credit</span>
            <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
              Due to collect
            </span>
          </div>
        </div>

        {/* Card 4: Average Invoice Size */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-violet-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Average Invoice</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
                ₹ {filteredInvoices.length > 0 ? Math.round(summary.total_amount / filteredInvoices.length).toLocaleString("en-IN") : 0}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
              Avg
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Per ticket size</span>
            <span className="text-[11px] font-semibold text-slate-600">Active period</span>
          </div>
        </div>
      </div>

      {/* ── 3. FILTER TOOLBAR & DATE SELECTORS (Matching EstimateQuotation) ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Filter by:</span>

          {/* Period Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setPeriodOpen(!periodOpen);
                setFirmOpen(false);
                setUserOpen(false);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer"
            >
              <span className="capitalize">{periodLabels[period] || "This Month"}</span>
              <ChevronDown size={13} className={`text-slate-400 transition-transform ${periodOpen ? "rotate-180" : ""}`} />
            </button>

            {periodOpen && (
              <div className="absolute left-0 mt-1.5 w-40 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95">
                {Object.entries(periodLabels).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => {
                      if (key === "custom") {
                        setPeriod("custom");
                        setPeriodOpen(false);
                        setShowDatePicker(true);
                      } else {
                        setPresetDates(key);
                      }
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer ${
                      period === key ? "text-indigo-600 font-bold bg-indigo-50/50" : "text-slate-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Firm / Company Dropdown */}
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
                {selectedFirm === "all"
                  ? "All Branches"
                  : companies.find((c) => String(c.id) === String(selectedFirm))?.company_name || "Branch"}
              </span>
              <ChevronDown size={13} className={`text-slate-400 transition-transform ${firmOpen ? "rotate-180" : ""}`} />
            </button>

            {firmOpen && (
              <div className="absolute left-0 mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 max-h-56 overflow-y-auto">
                <button
                  onClick={() => { setSelectedFirm("all"); setFirmOpen(false); }}
                  className={`w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer ${
                    selectedFirm === "all" ? "text-indigo-600 font-bold bg-indigo-50/50" : "text-slate-700"
                  }`}
                >
                  🏢 All Branches
                </button>
                {companies.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedFirm(c.id); setFirmOpen(false); }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 transition truncate cursor-pointer ${
                      String(selectedFirm) === String(c.id) ? "text-indigo-600 font-bold bg-indigo-50/50" : "text-slate-700"
                    }`}
                  >
                    🏢 {c.company_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cashier / User Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setUserOpen(!userOpen);
                setPeriodOpen(false);
                setFirmOpen(false);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer"
            >
              <User size={13} className="text-slate-500" />
              <span>
                {selectedUser === "all"
                  ? "All Users"
                  : cashiers.find((u) => String(u.id) === String(selectedUser))?.name || "User"}
              </span>
              <ChevronDown size={13} className={`text-slate-400 transition-transform ${userOpen ? "rotate-180" : ""}`} />
            </button>

            {userOpen && (
              <div className="absolute left-0 mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 max-h-56 overflow-y-auto">
                <button
                  onClick={() => { setSelectedUser("all"); setUserOpen(false); }}
                  className={`w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer ${
                    selectedUser === "all" ? "text-indigo-600 font-bold bg-indigo-50/50" : "text-slate-700"
                  }`}
                >
                  All Users
                </button>
                {cashiers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => { setSelectedUser(u.id); setUserOpen(false); }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 transition truncate cursor-pointer ${
                      String(selectedUser) === String(u.id) ? "text-indigo-600 font-bold bg-indigo-50/50" : "text-slate-700"
                    }`}
                  >
                    {u.name || u.email}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Custom Date Range Picker */}
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                fromDate && toDate
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              <Calendar size={13} className="text-slate-500" />
              <span>{fromDate && toDate ? `${formatDateDMY(fromDate)} - ${formatDateDMY(toDate)}` : "Date Range"}</span>
            </button>

            {showDatePicker && (
              <div className="absolute left-0 mt-2 p-4 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 w-72 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-800">Select Custom Range</span>
                  <button onClick={() => setShowDatePicker(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X size={14} />
                  </button>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">From Date</label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">To Date</label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setFromDate("");
                      setToDate("");
                      setShowDatePicker(false);
                    }}
                    className="px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => {
                      setPeriod("custom");
                      setShowDatePicker(false);
                    }}
                    className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex items-center gap-2">
          {/* Status Segment Tabs */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            {[
              { id: "all", label: "All" },
              { id: "paid", label: "Paid" },
              { id: "unpaid", label: "Unpaid" },
              { id: "partial", label: "Partial" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === tab.id
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Toggle / Input */}
          <div className="relative">
            {showSearchInput ? (
              <div className="flex items-center bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1 transition-all">
                <Search size={14} className="text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Search invoice, customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-xs text-slate-800 outline-none w-36 sm:w-48 font-medium"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setShowSearchInput(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 ml-1 cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSearchInput(true)}
                className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer"
                title="Search invoices"
              >
                <Search size={14} />
              </button>
            )}
          </div>

          <button
            onClick={handleExportExcel}
            className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer"
            title="Export to Excel (.xlsx)"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
          </button>

          <button
            onClick={() => window.print()}
            className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer"
            title="Print List"
          >
            <Printer size={15} />
          </button>

          <button
            onClick={fetchInvoices}
            className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer"
            title="Refresh List"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-indigo-600" : ""} />
          </button>
        </div>
      </div>

      {/* ── 4. DIRECTORY TABLE CARD (Matching EstimateQuotation) ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <Receipt size={32} />
            </div>
            <h3 className="text-base font-bold text-slate-800">No sale invoices found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mb-6">
              There are no sale invoices matching the selected filters or date range.
            </p>
            <button
              onClick={() => navigate("/sales/add")}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-100 transition hover:from-indigo-700 hover:to-indigo-800 cursor-pointer"
            >
              <Plus size={16} strokeWidth={2.8} />
              <span>Create New Invoice</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-max">
              <thead>
                <tr className="border-b border-slate-200/80 bg-[#fbfcfd] text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                  {visibleColumns.date && <th className="py-3.5 px-4">Date</th>}
                  {visibleColumns.invoice_no && <th className="py-3.5 px-4">Invoice No</th>}
                  {visibleColumns.party_name && <th className="py-3.5 px-4">Customer</th>}
                  {visibleColumns.transaction && <th className="py-3.5 px-4">Type</th>}
                  {visibleColumns.payment_type && <th className="py-3.5 px-4">Payment</th>}
                  {visibleColumns.amount && <th className="py-3.5 px-4 text-right">Amount</th>}
                  {visibleColumns.balance && <th className="py-3.5 px-4 text-right">Balance</th>}
                  {visibleColumns.status && <th className="py-3.5 px-4 text-center">Status</th>}
                  {visibleColumns.actions && <th className="py-3.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedInvoices.map((inv, idx) => {
                  const isPaid = Number(inv.balance_amount || 0) === 0;
                  const isUnpaid = Number(inv.paid_amount || 0) === 0;
                  const isPos = inv.is_pos || inv.source === "pos" || (String(inv.payment_method).toLowerCase() === "cash" && !inv.customer_id);
                  const isMenuOpen = activeMenuId === inv.invoice_no;
                  const initial = (inv.customer_name || "C").charAt(0).toUpperCase();

                  return (
                    <tr
                      key={inv.invoice_no || idx}
                      className="hover:bg-indigo-50/20 transition-colors text-slate-700 cursor-pointer"
                      onClick={() => navigate(`/invoice/${inv.invoice_no}`)}
                    >
                      {/* Date */}
                      {visibleColumns.date && (
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          {formatDateDMY(inv.created_at)}
                        </td>
                      )}

                      {/* Invoice No */}
                      {visibleColumns.invoice_no && (
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            #{inv.invoice_no}
                          </span>
                        </td>
                      )}

                      {/* Customer / Party with Avatar */}
                      {visibleColumns.party_name && (
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                              {initial}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{inv.customer_name || "Cash Sale"}</div>
                              {inv.customer_phone && <div className="text-[11px] text-slate-400 font-normal">{inv.customer_phone}</div>}
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Transaction Type */}
                      {visibleColumns.transaction && (
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isPos ? "bg-purple-50 text-purple-700 border border-purple-200" : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {isPos ? "PoS Sale" : "Sale"}
                          </span>
                        </td>
                      )}

                      {/* Payment Type */}
                      {visibleColumns.payment_type && (
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                            {inv.payment_method || "Cash"}
                          </span>
                        </td>
                      )}

                      {/* Amount */}
                      {visibleColumns.amount && (
                        <td className="py-3.5 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                          ₹ {Number(inv.total_amount || 0).toLocaleString("en-IN")}
                        </td>
                      )}

                      {/* Balance */}
                      {visibleColumns.balance && (
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black ${
                              isPaid ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            ₹ {Number(inv.balance_amount || 0).toLocaleString("en-IN")}
                          </span>
                        </td>
                      )}

                      {/* Status Badge */}
                      {visibleColumns.status && (
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <StatusBadge
                            status={isPaid ? "success" : isUnpaid ? "danger" : "warning"}
                            label={isPaid ? "Paid" : isUnpaid ? "Unpaid" : "Partial"}
                            size="sm"
                          />
                        </td>
                      )}

                      {/* Actions */}
                      {visibleColumns.actions && (
                        <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <TableActions
                            onPrint={() => navigate(`/invoice/${inv.invoice_no}`)}
                            printTitle="Print Invoice"
                            shareTransaction={inv}
                            shareType="Invoice"
                            onViewInvoice={() => navigate(`/invoice/${inv.invoice_no}`)}
                            viewInvoiceLabel="View Invoice"
                            menuItems={[
                              {
                                label: "Edit",
                                icon: Edit,
                                onClick: () => navigate(`/sales/edit/${inv.invoice_no}`),
                              },
                              {
                                label: "View Invoice",
                                icon: Eye,
                                onClick: () => navigate(`/invoice/${inv.invoice_no}`),
                              },
                              {
                                label: "Print POS",
                                icon: Printer,
                                onClick: () => navigate(`/invoice/${inv.invoice_no}`),
                              },
                              {
                                label: "Generate E-Way Bill",
                                icon: Truck,
                                onClick: () =>
                                  navigate(
                                    `/e-way/generate?invoice_id=${inv.id || ""}&invoice_no=${encodeURIComponent(inv.invoice_no || "")}`
                                  ),
                              },
                              { isDivider: true },
                              {
                                label: "Delete",
                                icon: Trash2,
                                isDanger: true,
                                onClick: () => setDeleteTarget(inv),
                              },
                            ]}
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── 5. PAGINATION BAR (Matching EstimateQuotation) ── */}
        {filteredInvoices.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-100 text-xs text-slate-500 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <span>
                Showing <strong className="font-semibold text-slate-800">{(safePage - 1) * rowsPerPage + 1}</strong> -{" "}
                <strong className="font-semibold text-slate-800">{Math.min(safePage * rowsPerPage, filteredInvoices.length)}</strong> of{" "}
                <strong className="font-semibold text-slate-800">{filteredInvoices.length}</strong> invoices
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Rows:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white text-slate-700 outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
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
                          ? "bg-indigo-600 text-white font-bold shadow-xs"
                          : "border border-slate-200 text-slate-700 hover:bg-slate-100 bg-white"
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
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                title="Next Page"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

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
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={22} className="text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Invoice?</h3>
                <p className="text-xs text-slate-500 font-mono">Invoice #{deleteTarget.invoice_no}</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Are you sure you want to permanently delete this invoice?
              <br />
              <span className="text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5 mt-2 inline-block font-medium border border-amber-200">
                ⚠️ Inventory stock for products in this invoice will be automatically restored.
              </span>
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
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
                onClick={handleDeleteInvoice}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-200 transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {deleting && <RefreshCw size={13} className="animate-spin" />}
                <span>{deleting ? "Deleting..." : "Yes, Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. ACTION TOAST NOTIFICATION ── */}
      {actionToast && (
        <div
          className={`fixed bottom-6 right-6 z-[99999] px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 animate-in slide-in-from-bottom duration-200 ${
            actionToast.ok
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <span>{actionToast.msg}</span>
        </div>
      )}

      {/* ── 8. COLUMN CUSTOMIZATION DRAWER ── */}
      {showColumnDrawer && (
        <div
          className="fixed inset-0 z-[99999] flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150 font-sans"
          onClick={() => setShowColumnDrawer(false)}
        >
          <div
            className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Settings size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Customise Columns</h3>
                  <p className="text-[11px] text-slate-400">Choose visible table fields</p>
                </div>
              </div>
              <button
                onClick={() => setShowColumnDrawer(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Quick Actions & Search */}
            <div className="p-4 border-b border-slate-100 space-y-2.5">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter columns..."
                  value={columnSearch}
                  onChange={(e) => setColumnSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500 font-medium transition"
                />
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <button
                  onClick={() => selectAllColumns(true)}
                  className="text-indigo-600 font-bold hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <button
                  onClick={resetDefaultColumns}
                  className="text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer font-medium"
                >
                  <RotateCcw size={11} />
                  <span>Reset Default</span>
                </button>
              </div>
            </div>

            {/* Columns List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {DEFAULT_COLUMNS.filter((c) =>
                c.label.toLowerCase().includes(columnSearch.toLowerCase())
              ).map((col) => {
                const Icon = col.icon;
                const isChecked = Boolean(visibleColumns[col.key]);

                return (
                  <label
                    key={col.key}
                    className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                      isChecked
                        ? "bg-indigo-50/40 border-indigo-200 text-slate-900"
                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg ${col.bg} ${col.color} flex items-center justify-center shrink-0`}>
                        <Icon size={14} />
                      </div>
                      <div>
                        <span className="font-bold text-xs block">{col.label}</span>
                        <span className="text-[10px] text-slate-400 block">{col.desc}</span>
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleColumn(col.key)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                  </label>
                );
              })}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/70">
              <button
                onClick={() => setShowColumnDrawer(false)}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
