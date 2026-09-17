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
  Trash2,
  AlertTriangle,
  X,
  RefreshCw,
  MoreVertical,
  Settings,
  SlidersHorizontal,
  Building2,
  Truck,
  RotateCcw,
  Share2,
  Edit,
  Eye,
  Filter,
  CheckCircle2,
  FileText,
  User,
  CreditCard,
  DollarSign,
  Layers,
} from "lucide-react";
import ShareTransactionPopover from "../../../components/ShareTransactionPopover";
import HeaderSettingsButton from "../../../components/HeaderSettingsButton";
import CommonTableColumnSettings from "../../../components/CommonTableColumnSettings";
import useTableColumns from "../../../hooks/useTableColumns";

const DEFAULT_COLUMNS = [
  { key: "index", label: "#", icon: Layers, color: "text-slate-600", bg: "bg-slate-100", desc: "Row index" },
  { key: "date", label: "Date", icon: Calendar, color: "text-blue-600", bg: "bg-blue-50", desc: "Debit note return date" },
  { key: "ref_no", label: "Ref No", icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50", desc: "Return reference number" },
  { key: "supplier", label: "Supplier / Party", icon: User, color: "text-violet-600", bg: "bg-violet-50", desc: "Supplier / Party name" },
  { key: "payment_mode", label: "Payment Mode", icon: CreditCard, color: "text-purple-600", bg: "bg-purple-50", desc: "Refund payment method" },
  { key: "total_return", label: "Total Return", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50", desc: "Total return value" },
  { key: "refund", label: "Refund", icon: DollarSign, color: "text-teal-600", bg: "bg-teal-50", desc: "Refund received" },
  { key: "balance", label: "Balance", icon: DollarSign, color: "text-rose-600", bg: "bg-rose-50", desc: "Balance remaining" },
  { key: "status", label: "Status", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", desc: "Settlement status" },
  { key: "actions", label: "Actions", icon: SlidersHorizontal, color: "text-slate-600", bg: "bg-slate-100", desc: "View, Print, Share, Delete" },
];

export default function DebitNoteList() {
  const navigate = useNavigate();
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  const adminId = user?.role === "cashier" ? user?.admin_id : user?.id;
  const companyId = user?.company_id || localStorage.getItem("selected_company_id") || 0;

  // Data states
  const [debitNotes, setDebitNotes] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [period, setPeriod] = useState("this_month");
  const [periodOpen, setPeriodOpen] = useState(false);
  const [selectedFirm, setSelectedFirm] = useState("all");
  const [firmOpen, setFirmOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState("all");
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [paymentFilterOpen, setPaymentFilterOpen] = useState(false);

  // Date range
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Search & view toggles
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [activeShareId, setActiveShareId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionToast, setActionToast] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // Column customization drawer state & persistence
  const {
    visibleColumns,
    toggleColumn,
    selectAllColumns,
    resetDefaultColumns,
    showColumnDrawer,
    setShowColumnDrawer,
    visibleColumnCount,
  } = useTableColumns("debit_note_columns", DEFAULT_COLUMNS);

  const PERIOD_LABELS = {
    all_time: "All Time",
    today: "Today",
    yesterday: "Yesterday",
    this_week: "This Week",
    this_month: "This Month",
    this_quarter: "This Quarter",
    this_year: "This Year",
    custom: "Custom Date"
  };

  const PAYMENT_FILTER_LABELS = {
    all: "All Payment Modes",
    cash: "Cash",
    online: "Online",
    upi: "UPI",
    cheque: "Cheque",
    credit: "Credit"
  };

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
      return;
    }

    const now = new Date();
    let from = new Date();
    let to = new Date();

    if (type === "today") {
      from = now;
      to = now;
    } else if (type === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      from = y;
      to = y;
    } else if (type === "this_week") {
      const day = now.getDay() || 7;
      from.setDate(now.getDate() - day + 1);
      to = new Date();
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

    const fmt = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    setFromDate(fmt(from));
    setToDate(fmt(to));
  };

  useEffect(() => {
    setPresetDates("this_month");
  }, []);

  // Fetch Companies
  useEffect(() => {
    if (adminId) {
      api.get(`/company/get_companies_by_admin?admin_id=${adminId}`)
        .then((res) => {
          if (res.data?.status) {
            setCompanies(res.data.data || []);
          }
        })
        .catch(console.error);
    }
  }, [adminId]);

  // Fetch Suppliers
  useEffect(() => {
    const compParam = selectedFirm !== "all" ? `?company_id=${selectedFirm}` : "";
    api.get(`/supplier/get_all${compParam}`)
      .then((res) => {
        if (res.data?.status) {
          setSuppliers(res.data.data || []);
        }
      })
      .catch(console.error);
  }, [selectedFirm, adminId]);

  // Fetch Debit Notes
  const fetchDebitNotes = async () => {
    setLoading(true);
    try {
      const compParam = selectedFirm !== "all" ? `&company_id=${selectedFirm}` : "";
      const supParam = selectedSupplier !== "all" ? `&supplier_id=${selectedSupplier}` : "";
      const dateParam = fromDate && toDate ? `&from_date=${fromDate}&to_date=${toDate}` : "";
      const res = await api.get(`/debit_note/list?admin_id=${adminId || 0}${compParam}${supParam}${dateParam}`);
      if (res.data?.status) {
        setDebitNotes(res.data.data || []);
      } else {
        setDebitNotes([]);
      }
    } catch (err) {
      console.error("Error fetching debit notes:", err);
      setDebitNotes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebitNotes();
  }, [selectedFirm, selectedSupplier, fromDate, toDate, adminId]);

  // Close menus on outside click safely
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (e.target.closest("[data-dropdown-container]")) {
        return;
      }
      setActiveMenuId(null);
      setPeriodOpen(false);
      setFirmOpen(false);
      setSupplierOpen(false);
      setPaymentFilterOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Filtered Debit Notes
  const filteredDebitNotes = useMemo(() => {
    return debitNotes.filter((item) => {
      // Date filter
      if (fromDate && toDate && item.return_date) {
        const itemDate = item.return_date.split("T")[0];
        if (itemDate < fromDate || itemDate > toDate) return false;
      }

      // Firm filter
      if (selectedFirm !== "all" && item.company_id) {
        if (String(item.company_id) !== String(selectedFirm)) return false;
      }

      // Supplier filter
      if (selectedSupplier !== "all" && item.supplier_id) {
        if (String(item.supplier_id) !== String(selectedSupplier)) return false;
      }

      // Payment Type filter
      if (paymentFilter !== "all") {
        const pType = (item.payment_type || "").toLowerCase();
        if (pType !== paymentFilter.toLowerCase()) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const refNo = String(item.return_no || item.id || "").toLowerCase();
        const partyName = String(item.supplier_name || "").toLowerCase();
        const partyPhone = String(item.supplier_phone || "").toLowerCase();
        const total = String(item.total_amount || "");
        if (
          !refNo.includes(q) &&
          !partyName.includes(q) &&
          !partyPhone.includes(q) &&
          !total.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [debitNotes, fromDate, toDate, selectedFirm, selectedSupplier, paymentFilter, searchQuery]);

  // Summary Metrics
  const { totalAmount, totalRefund, totalBalance } = useMemo(() => {
    let tot = 0;
    let ref = 0;
    let bal = 0;
    filteredDebitNotes.forEach((item) => {
      tot += parseFloat(item.total_amount || 0);
      ref += parseFloat(item.refund_amount || 0);
      bal += parseFloat(item.balance_amount || 0);
    });
    return { totalAmount: tot, totalRefund: ref, totalBalance: bal };
  }, [filteredDebitNotes]);

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [fromDate, toDate, selectedFirm, selectedSupplier, paymentFilter, searchQuery, period]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredDebitNotes.length / rowsPerPage) || 1;
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedList = useMemo(() => {
    const start = (safePage - 1) * rowsPerPage;
    return filteredDebitNotes.slice(start, start + rowsPerPage);
  }, [filteredDebitNotes, safePage, rowsPerPage]);

  const fmtCurrency = (n) =>
    Number(n || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredDebitNotes.length === 0) {
      alert("No data available to export.");
      return;
    }
    const data = filteredDebitNotes.map((item, idx) => ({
      "#": idx + 1,
      "Date": formatDateDMY(item.return_date),
      "Ref No.": item.return_no || item.id,
      "Party Name": item.supplier_name || "-",
      "Phone": item.supplier_phone || "-",
      "Payment Type": item.payment_type || "Cash",
      "Total Amount": parseFloat(item.total_amount || 0),
      "Received/Refund": parseFloat(item.refund_amount || 0),
      "Balance": parseFloat(item.balance_amount || 0),
      "Status": Number(item.balance_amount || 0) <= 0 ? "Settled" : "Unpaid"
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Purchase Return");
    XLSX.writeFile(wb, `Purchase_Return_DebitNotes_${fromDate || "all"}.xlsx`);
  };

  // Delete Action
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await api.post("/debit_note/delete", { id: deleteTarget.id });
      if (res.data?.status) {
        setDebitNotes((prev) => prev.filter((d) => d.id !== deleteTarget.id));
        setActionToast({ msg: "Debit Note deleted successfully.", ok: true });
        setDeleteTarget(null);
        setTimeout(() => setActionToast(null), 3500);
      } else {
        setActionToast({ msg: res.data?.message || "Failed to delete.", ok: false });
        setTimeout(() => setActionToast(null), 3500);
      }
    } catch (err) {
      console.error(err);
      setActionToast({ msg: "Error deleting debit note.", ok: false });
      setTimeout(() => setActionToast(null), 3500);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Toast Alert */}
      {actionToast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold transition-all flex items-center gap-2.5 backdrop-blur-md animate-in slide-in-from-top-3 duration-200 ${
            actionToast.ok
              ? "bg-emerald-500/90 text-white border-emerald-400"
              : "bg-rose-500/90 text-white border-rose-400"
          }`}
        >
          {actionToast.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{actionToast.msg}</span>
        </div>
      )}

      {/* ── 1. TOP HEADER: Title + Add Debit Note ── */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-2 select-none">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Purchase Return (Debit Note)</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/purchases/debit-note/add")}
            className="app-btn-primary h-9 px-4 rounded-xl text-sm font-semibold shadow-sm cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add Debit Note</span>
          </button>

          <HeaderSettingsButton variant="list" onClick={() => setShowColumnDrawer(true)} />
        </div>
      </div>

      {/* ── 2. FILTER ROW: Period, Date Range, Firms, Supplier, Payment Mode ── */}
      <div className="flex flex-wrap items-center gap-2.5 py-4 text-xs">
        <span className="font-semibold text-slate-500 mr-1">Filter by :</span>

        {/* Period Pill Dropdown */}
        <div data-dropdown-container className="relative">
          <button
            onClick={() => {
              setPeriodOpen((v) => !v);
              setFirmOpen(false);
              setSupplierOpen(false);
              setPaymentFilterOpen(false);
            }}
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
                  onClick={() => {
                    setPeriod(key);
                    setPeriodOpen(false);
                    if (key === "custom") {
                      setShowDatePicker(true);
                    } else {
                      setPresetDates(key);
                    }
                  }}
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
              onChange={(e) => {
                setFromDate(e.target.value);
                setPeriod("custom");
              }}
              className="text-xs text-slate-700 outline-none"
            />
            <span className="text-slate-400">To</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPeriod("custom");
              }}
              className="text-xs text-slate-700 outline-none"
            />
            <button
              onClick={() => setShowDatePicker(false)}
              className="px-2.5 py-1 bg-blue-600 text-white rounded-full text-xs font-bold"
            >
              Apply
            </button>
          </div>
        )}

        {/* Firms Dropdown Pill */}
        <div data-dropdown-container className="relative">
          <button
            onClick={() => {
              setFirmOpen((v) => !v);
              setPeriodOpen(false);
              setSupplierOpen(false);
              setPaymentFilterOpen(false);
            }}
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
            <div className="absolute left-0 top-9 w-44 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100 max-h-56 overflow-y-auto">
              <div
                onClick={() => {
                  setSelectedFirm("all");
                  setFirmOpen(false);
                }}
                className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition ${
                  selectedFirm === "all" ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                All Firms
              </div>
              {companies.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedFirm(String(c.id));
                    setFirmOpen(false);
                  }}
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

        {/* Supplier Dropdown Pill */}
        <div data-dropdown-container className="relative">
          <button
            onClick={() => {
              setSupplierOpen((v) => !v);
              setPeriodOpen(false);
              setFirmOpen(false);
              setPaymentFilterOpen(false);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-50/80 hover:bg-sky-100/70 text-slate-700 font-semibold rounded-full border border-sky-100 transition cursor-pointer"
          >
            <span>
              {selectedSupplier === "all"
                ? "All Suppliers"
                : suppliers.find((s) => String(s.id) === String(selectedSupplier))?.supplier_name ||
                  suppliers.find((s) => String(s.id) === String(selectedSupplier))?.name ||
                  "Supplier"}
            </span>
            <ChevronDown size={14} className={`text-slate-500 transition-transform ${supplierOpen ? "rotate-180" : ""}`} />
          </button>

          {supplierOpen && (
            <div className="absolute left-0 top-9 w-60 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100 max-h-56 overflow-y-auto">
              <div
                onClick={() => {
                  setSelectedSupplier("all");
                  setSupplierOpen(false);
                }}
                className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition ${
                  selectedSupplier === "all" ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                All Suppliers
              </div>
              {suppliers.map((s) => {
                const sName = s.supplier_name || s.name || `Supplier #${s.id}`;
                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedSupplier(String(s.id));
                      setSupplierOpen(false);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition truncate ${
                      String(selectedSupplier) === String(s.id) ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {sName}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payment Filter Dropdown Pill */}
        <div data-dropdown-container className="relative">
          <button
            onClick={() => {
              setPaymentFilterOpen((v) => !v);
              setPeriodOpen(false);
              setFirmOpen(false);
              setSupplierOpen(false);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-50/80 hover:bg-sky-100/70 text-slate-700 font-semibold rounded-full border border-sky-100 transition cursor-pointer"
          >
            <span>{PAYMENT_FILTER_LABELS[paymentFilter] || "All Payment Modes"}</span>
            <ChevronDown size={14} className={`text-slate-500 transition-transform ${paymentFilterOpen ? "rotate-180" : ""}`} />
          </button>

          {paymentFilterOpen && (
            <div className="absolute left-0 top-9 w-44 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
              {Object.entries(PAYMENT_FILTER_LABELS).map(([key, label]) => (
                <div
                  key={key}
                  onClick={() => {
                    setPaymentFilter(key);
                    setPaymentFilterOpen(false);
                  }}
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
          onClick={fetchDebitNotes}
          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-full transition cursor-pointer ml-auto"
          title="Refresh Debit Notes"
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
            ₹ {fmtCurrency(totalAmount)}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100 mt-2">
            <span>
              Refunded: <strong className="text-slate-800 font-bold">₹ {fmtCurrency(totalRefund)}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              Balance: <strong className="text-slate-800 font-bold">₹ {fmtCurrency(totalBalance)}</strong>
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
                  placeholder="Search ref #, party, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="bg-transparent text-xs text-slate-700 outline-none w-44"
                />
                <button
                  onClick={() => {
                    setShowSearchInput(false);
                    setSearchQuery("");
                  }}
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
                {visibleColumns.index && (
                  <th className="py-3 px-3.5 border-r border-slate-200 whitespace-nowrap">
                    #
                  </th>
                )}
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
                {visibleColumns.supplier && (
                  <th className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">
                    Supplier / Party
                  </th>
                )}
                {visibleColumns.payment_mode && (
                  <th className="py-3 px-3.5 border-r border-slate-200 whitespace-nowrap">
                    Payment Mode
                  </th>
                )}
                {visibleColumns.total_return && (
                  <th className="py-3 px-4 border-r border-slate-200 text-right whitespace-nowrap">
                    Total Return
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
                    <span>Loading Debit Notes...</span>
                  </td>
                </tr>
              ) : filteredDebitNotes.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnCount || 1} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-500">No debit notes found for this period.</p>
                    <p className="text-xs text-slate-400 mt-1">Click &quot;+ Add Debit Note&quot; to record a supplier purchase return.</p>
                  </td>
                </tr>
              ) : (
                paginatedList.map((item, idx) => {
                  const globalIdx = (safePage - 1) * rowsPerPage + idx + 1;
                  const total = parseFloat(item.total_amount || 0);
                  const refund = parseFloat(item.refund_amount || 0);
                  const balance = parseFloat(item.balance_amount || 0);
                  const isPaid = balance <= 0;
                  const isPartial = balance > 0 && refund > 0;
                  const isMenuOpen = activeMenuId === item.id;

                  return (
                    <tr
                      key={item.id || idx}
                      className="group hover:bg-[#eaedf2] transition-colors duration-150 text-slate-700 cursor-pointer"
                      onClick={() => navigate(`/invoice/${item.return_no || item.id}`)}
                    >
                      {/* S.NO */}
                      {visibleColumns.index && (
                        <td className="py-3.5 px-3.5 border-r border-slate-200 font-medium group-hover:font-bold text-slate-500 whitespace-nowrap">
                          {globalIdx}
                        </td>
                      )}

                      {/* Date */}
                      {visibleColumns.date && (
                        <td className="py-3.5 px-3.5 border-r border-slate-200 font-medium group-hover:font-bold text-slate-600 group-hover:text-slate-900 whitespace-nowrap">
                          {formatDateDMY(item.return_date || item.created_at)}
                        </td>
                      )}

                      {/* Ref No */}
                      {visibleColumns.ref_no && (
                        <td className="py-3.5 px-3.5 border-r border-slate-200 font-medium group-hover:font-bold text-blue-600 group-hover:text-blue-800 whitespace-nowrap">
                          {item.return_no || item.id}
                        </td>
                      )}

                      {/* Party Name */}
                      {visibleColumns.supplier && (
                        <td className="py-3.5 px-4 border-r border-slate-200 font-medium group-hover:font-bold text-slate-800 group-hover:text-slate-950 whitespace-nowrap">
                          <div>{item.supplier_name || "-"}</div>
                          {item.supplier_phone && (
                            <div className="text-[10px] text-slate-400 font-normal">{item.supplier_phone}</div>
                          )}
                        </td>
                      )}

                      {/* Payment Mode */}
                      {visibleColumns.payment_mode && (
                        <td className="py-3.5 px-3.5 border-r border-slate-200 text-slate-600 group-hover:text-slate-900 font-medium whitespace-nowrap uppercase">
                          {item.payment_type || "Cash"}
                        </td>
                      )}

                      {/* Total */}
                      {visibleColumns.total_return && (
                        <td className="py-3.5 px-4 border-r border-slate-200 text-right font-bold text-slate-900 whitespace-nowrap">
                          ₹ {fmtCurrency(total)}
                        </td>
                      )}

                      {/* Refund */}
                      {visibleColumns.refund && (
                        <td className="py-3.5 px-4 border-r border-slate-200 text-right font-medium text-slate-800 whitespace-nowrap">
                          ₹ {fmtCurrency(refund)}
                        </td>
                      )}

                      {/* Balance */}
                      {visibleColumns.balance && (
                        <td className="py-3.5 px-4 border-r border-slate-200 text-right font-bold text-rose-600 whitespace-nowrap">
                          ₹ {fmtCurrency(balance)}
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
                            {isPaid ? "Settled" : isPartial ? "Partial" : "Unpaid"}
                          </span>
                        </td>
                      )}

                      {/* Actions */}
                      {visibleColumns.actions && (
                        <td className="py-3.5 px-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                          {/* Print Icon Button */}
                          <button
                            onClick={() => navigate(`/invoice/${item.return_no || item.id}`)}
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
                                setActiveShareId(activeShareId === item.id ? null : item.id);
                              }}
                              className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition cursor-pointer"
                              title="Share"
                            >
                              <Share2 size={15} />
                            </button>
                            <ShareTransactionPopover
                              isOpen={activeShareId === item.id}
                              onClose={() => setActiveShareId(null)}
                              transaction={item}
                              type="Debit Note"
                            />
                          </div>

                          {/* 3-Dot More Menu */}
                          <div data-dropdown-container className="relative">
                            <button
                              onClick={() => setActiveMenuId(isMenuOpen ? null : item.id)}
                              className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition cursor-pointer"
                              title="More actions"
                            >
                              <MoreVertical size={15} />
                            </button>

                            {isMenuOpen && (
                              <div className="absolute right-0 top-8 w-36 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 text-left animate-in fade-in zoom-in-95 duration-100">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(null);
                                    navigate(`/purchases/debit-note/edit/${item.id}`);
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
                                    navigate(`/invoice/${item.return_no || item.id}`);
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
                                    setDeleteTarget(item);
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
        </div>

        {/* ── PAGINATION BAR ── */}
        {filteredDebitNotes.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-200 text-xs text-slate-600 bg-white">
            <div className="flex items-center gap-4">
              <span>
                Showing <strong className="font-semibold text-slate-800">{(safePage - 1) * rowsPerPage + 1}</strong> to{" "}
                <strong className="font-semibold text-slate-800">
                  {Math.min(safePage * rowsPerPage, filteredDebitNotes.length)}
                </strong>{" "}
                of <strong className="font-semibold text-slate-800">{filteredDebitNotes.length}</strong> debit notes
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
                  <option value={15}>15</option>
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

      {/* ── MODAL: DELETE CONFIRMATION ── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-sans"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-rose-200 bg-rose-50/70 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-900">Delete Debit Note</h3>
                <p className="text-[11px] text-rose-600 font-medium">This action will remove the record permanently</p>
              </div>
            </div>

            <div className="p-6 text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete Debit Note <b>#{deleteTarget.return_no || deleteTarget.id}</b> for supplier{" "}
              <b>{deleteTarget.supplier_name || "-"}</b> with amount <b>₹{fmtCurrency(deleteTarget.total_amount)}</b>?
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/25 transition cursor-pointer disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Note"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Column Customization Drawer */}
      <CommonTableColumnSettings
        isOpen={showColumnDrawer}
        onClose={() => setShowColumnDrawer(false)}
        columns={DEFAULT_COLUMNS}
        visibleColumns={visibleColumns}
        onToggleColumn={toggleColumn}
        onSelectAll={selectAllColumns}
        onReset={resetDefaultColumns}
        title="Customise Columns"
        subtitle="Show or hide table columns in debit notes"
      />
    </div>
  );
}
