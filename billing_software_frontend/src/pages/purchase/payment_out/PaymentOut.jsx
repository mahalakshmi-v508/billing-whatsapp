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
  MoreVertical,
  Trash2,
  Edit,
  Eye,
  Share2,
  AlertTriangle,
  RefreshCw,
  SlidersHorizontal,
  Filter,
  Settings,
  ArrowDownRight,
  FileText,
  User,
  CreditCard,
  DollarSign,
  CheckCircle2,
} from "lucide-react";
import AddPaymentOutModal from "./AddPaymentOutModal";
import ShareTransactionPopover from "../../../components/ShareTransactionPopover";
import HeaderSettingsButton from "../../../components/HeaderSettingsButton";
import CommonTableColumnSettings from "../../../components/CommonTableColumnSettings";
import useTableColumns from "../../../hooks/useTableColumns";

const DEFAULT_COLUMNS = [
  { key: "date", label: "Date", icon: Calendar, color: "text-blue-600", bg: "bg-blue-50", desc: "Payment voucher date" },
  { key: "ref_no", label: "Ref No", icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50", desc: "Payment reference number" },
  { key: "party_name", label: "Party Name", icon: User, color: "text-violet-600", bg: "bg-violet-50", desc: "Supplier / Party name" },
  { key: "payment_type", label: "Payment Type", icon: CreditCard, color: "text-purple-600", bg: "bg-purple-50", desc: "Payment mode (Cash, Bank, etc.)" },
  { key: "total_amount", label: "Total Amount", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50", desc: "Total invoice or voucher amount" },
  { key: "paid", label: "Paid", icon: DollarSign, color: "text-teal-600", bg: "bg-teal-50", desc: "Amount paid out" },
  { key: "status", label: "Status", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", desc: "Payment status" },
  { key: "actions", label: "Action", icon: SlidersHorizontal, color: "text-slate-600", bg: "bg-slate-100", desc: "View, Print, Share, Delete" },
];

const periodLabels = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This Week",
  this_month: "This Month",
  last_month: "Last Month",
  this_year: "This Year",
  all_time: "All Time",
  custom: "Custom",
};

export default function PaymentOut() {
  const navigate = useNavigate();
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  const adminId = user?.role === "cashier" ? user?.admin_id : user?.id;

  // Data states
  const [payments, setPayments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(
    localStorage.getItem("selected_company_id") || "all"
  );
  const [loading, setLoading] = useState(true);

  // Filter states
  const [period, setPeriod] = useState("this_month");
  const [periodOpen, setPeriodOpen] = useState(false);
  const [firmOpen, setFirmOpen] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState("all");
  const [suppliers, setSuppliers] = useState([]);

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
  const [editingPayment, setEditingPayment] = useState(null);
  const [deleting, setDeleting] = useState(false);

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
  } = useTableColumns("payment_out_columns", DEFAULT_COLUMNS);

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
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const fmt = (n) =>
    Number(n || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });

  // Calculate preset period dates
  useEffect(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (period) {
      case "today":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "yesterday":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        break;
      case "this_week": {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(now.setDate(diff));
        end = new Date();
        break;
      }
      case "this_month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "last_month":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "this_year":
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      case "all_time":
        start = null;
        end = null;
        break;
      default:
        return;
    }

    if (start && end) {
      setFromDate(formatYMD(start));
      setToDate(formatYMD(end));
    } else {
      setFromDate("");
      setToDate("");
    }
  }, [period]);

  const setPresetDates = (key) => {
    setPeriod(key);
    setPeriodOpen(false);
    if (key === "custom") setShowDatePicker(true);
  };

  // Load Companies
  useEffect(() => {
    if (adminId) {
      api.get(`/company/get_companies_by_admin?admin_id=${adminId}`)
        .then((res) => {
          if (res.data.status) {
            setCompanies(res.data.data || []);
          }
        })
        .catch(console.error);
    }
  }, [adminId]);

  // Load Suppliers
  useEffect(() => {
    const compParam = selectedCompany !== "all" ? `?company_id=${selectedCompany}` : "";
    api.get(`/supplier/get_all${compParam}`)
      .then((res) => {
        if (res.data.status) {
          setSuppliers(res.data.data || []);
        }
      })
      .catch(console.error);
  }, [selectedCompany, adminId]);

  // Fetch Payment-Out Records
  const fetchPaymentOuts = async () => {
    setLoading(true);
    try {
      const compParam = selectedCompany !== "all" ? `&company_id=${selectedCompany}` : "";
      const dateParam = fromDate && toDate ? `&from_date=${fromDate}&to_date=${toDate}` : "";
      const res = await api.get(`/purchase/get_payment_outs?admin_id=${adminId || 0}${compParam}${dateParam}`);
      if (res.data.status) {
        setPayments(res.data.data || []);
      } else {
        setPayments([]);
      }
    } catch (err) {
      console.error("Error fetching payment-outs:", err);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentOuts();
  }, [selectedCompany, fromDate, toDate, adminId]);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
      setPeriodOpen(false);
      setFirmOpen(false);
      setSupplierOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Filtered Payments List
  const filteredPayments = useMemo(() => {
    return payments.filter((item) => {
      // Date range filter
      if (fromDate && toDate && item.payment_date) {
        const itemDate = item.payment_date.split("T")[0].split(" ")[0];
        if (itemDate < fromDate || itemDate > toDate) return false;
      }

      // Firm filter
      if (selectedCompany !== "all" && item.company_id) {
        if (String(item.company_id) !== String(selectedCompany)) return false;
      }

      // Supplier filter
      if (selectedSupplier !== "all") {
        if (String(item.supplier_id) !== String(selectedSupplier)) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const refNo = String(item.receipt_no || item.id || "").toLowerCase();
        const partyName = String(item.supplier_name || "").toLowerCase();
        const paymentType = String(item.payment_method || "").toLowerCase();
        const total = String(item.amount || "");
        if (
          !refNo.includes(q) &&
          !partyName.includes(q) &&
          !paymentType.includes(q) &&
          !total.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [payments, fromDate, toDate, selectedCompany, selectedSupplier, searchQuery]);

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [fromDate, toDate, selectedCompany, selectedSupplier, searchQuery, period]);

  // Summary Metrics (Total Amount, Paid Amount)
  const metrics = useMemo(() => {
    let total = 0;
    let paid = 0;
    filteredPayments.forEach((p) => {
      const amt = parseFloat(p.amount || 0);
      total += amt;
      paid += amt;
    });
    return { total, paid };
  }, [filteredPayments]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredPayments.length / rowsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPayments = useMemo(() => {
    const start = (safePage - 1) * rowsPerPage;
    return filteredPayments.slice(start, start + rowsPerPage);
  }, [filteredPayments, safePage, rowsPerPage]);

  // Export to Excel
  const exportToExcel = () => {
    if (filteredPayments.length === 0) {
      alert("No payment-out data to export.");
      return;
    }
    const data = filteredPayments.map((p) => ({
      "Date": formatDateDMY(p.payment_date),
      "Ref No.": p.receipt_no || `REC-${p.id}`,
      "Party Name": p.supplier_name || "Unknown Party",
      "Total Amount": parseFloat(p.amount || 0),
      "Paid": parseFloat(p.amount || 0),
      "Payment Type": p.payment_method || "Cash",
      "Status": "Paid",
      "Notes": p.notes || ""
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payment-Out");
    XLSX.writeFile(wb, `Payment_Out_Report_${fromDate || "all"}.xlsx`);
  };

  // Delete Handler
  const handleDeletePayment = async (id) => {
    if (!window.confirm("Are you sure you want to delete this payment-out record? Purchase invoice balance will be restored.")) {
      return;
    }
    setDeleting(true);
    try {
      const res = await api.post("/purchase/delete_payment_out", { id });
      if (res.data.status) {
        fetchPaymentOuts();
      } else {
        alert(res.data.message || "Failed to delete payment-out.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting payment-out.");
    } finally {
      setDeleting(false);
      setActiveMenuId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* ── 1. TOP HEADER: Title + Add Payment-Out + Settings ── */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-2 select-none">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Payment-Out</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditingPayment(null);
              setIsAddModalOpen(true);
            }}
            className="app-btn-primary h-9 px-4 rounded-xl text-sm font-semibold shadow-sm cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add Payment-Out</span>
          </button>

          <HeaderSettingsButton variant="list" onClick={() => setShowColumnDrawer(true)} />
        </div>
      </div>

      {/* ── 2. FILTER ROW: Period, Date Range, Firms, Suppliers ── */}
      <div className="flex flex-wrap items-center gap-2.5 py-4 text-xs">
        <span className="font-semibold text-slate-500 mr-1">Filter by :</span>

        {/* Period Pill Dropdown */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPeriodOpen((v) => !v);
              setFirmOpen(false);
              setSupplierOpen(false);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-50/80 hover:bg-sky-100/70 text-slate-700 font-semibold rounded-full border border-sky-100 transition cursor-pointer"
          >
            <span>{periodLabels[period] || "This Month"}</span>
            <ChevronDown size={14} className={`text-slate-500 transition-transform ${periodOpen ? "rotate-180" : ""}`} />
          </button>

          {periodOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute left-0 top-9 w-36 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100"
            >
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
              onChange={(e) => {
                setFromDate(e.target.value);
                setPeriod("custom");
              }}
              className="text-xs text-slate-700 outline-none cursor-pointer"
            />
            <span className="text-slate-400">To</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPeriod("custom");
              }}
              className="text-xs text-slate-700 outline-none cursor-pointer"
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
            onClick={(e) => {
              e.stopPropagation();
              setFirmOpen((v) => !v);
              setPeriodOpen(false);
              setSupplierOpen(false);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-50/80 hover:bg-sky-100/70 text-slate-700 font-semibold rounded-full border border-sky-100 transition cursor-pointer"
          >
            <span>
              {selectedCompany === "all"
                ? "All Firms"
                : companies.find((c) => String(c.id) === String(selectedCompany))?.company_name || "Firm"}
            </span>
            <ChevronDown size={14} className={`text-slate-500 transition-transform ${firmOpen ? "rotate-180" : ""}`} />
          </button>

          {firmOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute left-0 top-9 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 max-h-56 overflow-y-auto z-40 animate-in fade-in zoom-in-95 duration-100"
            >
              <div
                onClick={() => { setSelectedCompany("all"); setFirmOpen(false); }}
                className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition ${
                  selectedCompany === "all" ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                All Firms
              </div>
              {companies.map((c) => (
                <div
                  key={c.id}
                  onClick={() => { setSelectedCompany(String(c.id)); setFirmOpen(false); }}
                  className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition truncate ${
                    String(selectedCompany) === String(c.id) ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {c.company_name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Suppliers Dropdown Pill */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSupplierOpen((v) => !v);
              setPeriodOpen(false);
              setFirmOpen(false);
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
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute left-0 top-9 w-52 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 max-h-56 overflow-y-auto z-40 animate-in fade-in zoom-in-95 duration-100"
            >
              <div
                onClick={() => { setSelectedSupplier("all"); setSupplierOpen(false); }}
                className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition ${
                  selectedSupplier === "all" ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                All Suppliers
              </div>
              {suppliers.map((s) => {
                const sName = s.supplier_name || s.name || `Supplier #${s.id}`;
                const isSelected = String(selectedSupplier) === String(s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => { setSelectedSupplier(String(s.id)); setSupplierOpen(false); }}
                    className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition truncate ${
                      isSelected ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {sName}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Refresh button */}
        <button
          onClick={fetchPaymentOuts}
          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-full transition cursor-pointer ml-auto"
          title="Refresh Payment Records"
        >
          <RefreshCw size={15} className={loading ? "animate-spin text-blue-600" : ""} />
        </button>
      </div>

      {/* ── 3. SUMMARY CARD (Standardized Sale Invoice style) ── */}
      <div className="my-2">
        <div className="bg-white border border-purple-200/90 rounded-2xl p-4 w-72 sm:w-80 shadow-2xs">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Payment-Out</span>
            <div className="flex flex-col items-end">
              <span className="inline-flex items-center text-[11px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                100% ↗
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">vs last month</span>
            </div>
          </div>

          <div className="text-2xl font-black text-slate-900 my-1 tracking-tight">
            ₹ {fmt(metrics.total)}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100 mt-2">
            <span>
              Paid to Vendors: <strong className="text-slate-800 font-bold">₹ {fmt(metrics.paid)}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              Vouchers: <strong className="text-slate-800 font-bold">{filteredPayments.length}</strong>
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
                  placeholder="Search ref, supplier, amount..."
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
              onClick={exportToExcel}
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
                {visibleColumns.payment_type && (
                  <th className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">
                    Payment Type
                  </th>
                )}
                {visibleColumns.total_amount && (
                  <th className="py-3 px-4 border-r border-slate-200 text-right whitespace-nowrap">
                    Total Amount
                  </th>
                )}
                {visibleColumns.paid && (
                  <th className="py-3 px-4 border-r border-slate-200 text-right whitespace-nowrap">
                    Paid
                  </th>
                )}
                {visibleColumns.status && (
                  <th className="py-3 px-3 border-r border-slate-200 text-center whitespace-nowrap">
                    Status
                  </th>
                )}
                {visibleColumns.actions && (
                  <th className="py-3 px-3 text-center whitespace-nowrap w-24">Action</th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={visibleColumnCount || 1} className="text-center py-12 text-slate-400">
                    <RefreshCw size={24} className="animate-spin text-blue-600 mx-auto mb-2" />
                    <span>Loading payment records...</span>
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnCount || 1} className="text-center py-12 text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                      <AlertTriangle size={24} />
                    </div>
                    <p className="font-semibold text-slate-600">No payment vouchers found</p>
                    <p className="text-xs text-slate-400 mt-0.5">There are no payment-out records matching your active filters.</p>
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((p, idx) => {
                  const isMenuOpen = activeMenuId === p.id;

                  return (
                    <tr
                      key={p.id || idx}
                      className="group hover:bg-[#eaedf2] transition-colors duration-150 text-slate-700 cursor-pointer"
                    >
                      {/* Date */}
                      {visibleColumns.date && (
                        <td className="py-3 px-3.5 border-r border-slate-200 whitespace-nowrap font-medium text-slate-600 group-hover:text-slate-900">
                          {formatDateDMY(p.payment_date)}
                        </td>
                      )}

                      {/* Ref No */}
                      {visibleColumns.ref_no && (
                        <td className="py-3 px-3.5 border-r border-slate-200 whitespace-nowrap font-medium text-slate-800">
                          {p.receipt_no ? `#${p.receipt_no}` : `#REC-${p.id}`}
                        </td>
                      )}

                      {/* Party Name */}
                      {visibleColumns.party_name && (
                        <td className="py-3 px-4 border-r border-slate-200 whitespace-nowrap font-medium text-slate-800">
                          {p.supplier_name || "Unknown Party"}
                        </td>
                      )}

                      {/* Payment Type */}
                      {visibleColumns.payment_type && (
                        <td className="py-3 px-4 border-r border-slate-200 whitespace-nowrap text-slate-600 font-medium">
                          {p.payment_method || "Cash"}
                        </td>
                      )}

                      {/* Total Amount */}
                      {visibleColumns.total_amount && (
                        <td className="py-3 px-4 border-r border-slate-200 text-right whitespace-nowrap font-medium text-slate-800">
                          ₹ {fmt(p.amount)}
                        </td>
                      )}

                      {/* Paid */}
                      {visibleColumns.paid && (
                        <td className="py-3 px-4 border-r border-slate-200 text-right whitespace-nowrap font-semibold text-emerald-600">
                          ₹ {fmt(p.amount)}
                        </td>
                      )}

                      {/* Status */}
                      {visibleColumns.status && (
                        <td className="py-3 px-3 border-r border-slate-200 text-center whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wide border bg-emerald-50 text-emerald-700 border-emerald-200">
                            Paid
                          </span>
                        </td>
                      )}

                      {/* Action */}
                      {visibleColumns.actions && (
                        <td className="py-3 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1 text-slate-400">
                          {/* Print / View */}
                          <button
                            onClick={() => navigate(`/invoice/${p.receipt_no || p.id}`)}
                            className="p-1 hover:text-blue-600 hover:bg-slate-200/60 rounded transition cursor-pointer"
                            title="Print Receipt"
                          >
                            <Printer size={15} />
                          </button>

                          {/* Share Popover */}
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveShareId(activeShareId === p.id ? null : p.id);
                              }}
                              className="p-1 hover:text-blue-600 hover:bg-slate-200/60 rounded transition cursor-pointer"
                              title="Share"
                            >
                              <Share2 size={15} />
                            </button>
                            <ShareTransactionPopover
                              isOpen={activeShareId === p.id}
                              onClose={() => setActiveShareId(null)}
                              transaction={p}
                              type="Payment-Out"
                            />
                          </div>

                          {/* 3-Dot More Menu */}
                          <div className="relative">
                            <button
                              onClick={() => setActiveMenuId(isMenuOpen ? null : p.id)}
                              className="p-1 hover:text-slate-700 hover:bg-slate-200/60 rounded transition cursor-pointer"
                              title="More Options"
                            >
                              <MoreVertical size={15} />
                            </button>

                            {isMenuOpen && (
                              <div
                                ref={menuRef}
                                className="absolute right-0 top-7 w-36 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-40 text-left animate-in fade-in zoom-in-95 duration-100"
                              >
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    setEditingPayment(p);
                                    setIsAddModalOpen(true);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
                                >
                                  <Edit size={13} className="text-blue-600" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    navigate(`/invoice/${p.receipt_no || p.id}`);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
                                >
                                  <Eye size={13} className="text-slate-500" />
                                  <span>View Receipt</span>
                                </button>
                                <div className="border-t border-slate-100 my-1" />
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    handleDeletePayment(p.id);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 cursor-pointer font-medium"
                                >
                                  <Trash2 size={13} />
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
        {filteredPayments.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-200 text-xs text-slate-600 bg-white">
            <div className="flex items-center gap-4">
              <span>
                Showing <strong className="font-semibold text-slate-800">{(safePage - 1) * rowsPerPage + 1}</strong> to{" "}
                <strong className="font-semibold text-slate-800">{Math.min(safePage * rowsPerPage, filteredPayments.length)}</strong> of{" "}
                <strong className="font-semibold text-slate-800">{filteredPayments.length}</strong> payments
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
                          ? "app-pagination-active"
                          : "border border-slate-200 text-slate-600 hover:bg-slate-50"
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

      {/* ── 5. ADD / EDIT PAYMENT-OUT MODAL ── */}
      <AddPaymentOutModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingPayment(null);
        }}
        onSuccess={fetchPaymentOuts}
        editPayment={editingPayment}
      />

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
        subtitle="Show or hide table columns in payment out list"
      />
    </div>
  );
}
