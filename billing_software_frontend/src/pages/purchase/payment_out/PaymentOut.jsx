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
  MoreVertical,
  Trash2,
  Edit,
  Eye,
  Share2,
  AlertTriangle,
  X,
  RefreshCw,
  TrendingDown,
  Building2,
  Truck,
  CheckCircle2,
  Wallet,
  DollarSign,
  BarChart3
} from "lucide-react";
import AddPaymentOutModal from "./AddPaymentOutModal";
import TableActions from "../../../components/ui/TableActions";
import HeaderSettingsButton from "../../../components/HeaderSettingsButton";
import CommonTableColumnSettings from "../../../components/CommonTableColumnSettings";
import { useTableColumns } from "../../../hooks/useTableColumns";

const DEFAULT_PAYMENT_OUT_COLUMNS = [
  { id: "date", label: "Date", defaultVisible: true },
  { id: "ref_no", label: "Ref No.", defaultVisible: true },
  { id: "party_name", label: "Party Name", defaultVisible: true, fixed: true },
  { id: "payment_type", label: "Payment Type", defaultVisible: true },
  { id: "total_amount", label: "Total Amount", defaultVisible: true },
  { id: "paid_amount", label: "Paid Amount", defaultVisible: true },
  { id: "balance", label: "Balance", defaultVisible: true },
  { id: "actions", label: "Actions", defaultVisible: true, fixed: true },
];

export default function PaymentOut() {
  const navigate = useNavigate();
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  const adminId = user?.role === "cashier" ? user?.admin_id : user?.id;

  const {
    columns: tableColumns,
    isOpen: isSettingsOpen,
    openSettings,
    closeSettings,
    toggleColumn,
    resetColumns,
    isColumnVisible,
    visibleColumnCount
  } = useTableColumns(DEFAULT_PAYMENT_OUT_COLUMNS, "payment_out_table_columns_v1");

  // Data states
  const [payments, setPayments] = useState([]);
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

  // Date range
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Search & view toggles
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);

  // Modals & toast states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
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
      const q = Math.floor(now.getMonth() / 3);
      from = new Date(now.getFullYear(), q * 3, 1);
      to = new Date(now.getFullYear(), q * 3 + 3, 0);
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

  // Fetch Companies
  useEffect(() => {
    if (!adminId) return;
    api
      .get(`/company/get_companies_by_admin?admin_id=${adminId}`)
      .then((res) => {
        if (res.data?.status) {
          setCompanies(res.data.data || []);
        }
      })
      .catch(console.error);
  }, [adminId]);

  // Fetch Suppliers
  useEffect(() => {
    const compParam = selectedFirm !== "all" ? `?company_id=${selectedFirm}` : "";
    api
      .get(`/supplier/get_all${compParam}`)
      .then((res) => {
        if (res.data?.status) {
          setSuppliers(res.data.data || []);
        }
      })
      .catch(console.error);
  }, [selectedFirm]);

  // Fetch Payment-Out records
  const fetchPaymentOuts = async () => {
    setLoading(true);
    try {
      const compParam = selectedFirm !== "all" ? `&company_id=${selectedFirm}` : "";
      const dateParam = fromDate && toDate ? `&from_date=${fromDate}&to_date=${toDate}` : "";
      const res = await api.get(`/purchase/get_payment_outs?admin_id=${adminId || 0}${compParam}${dateParam}`);
      if (res.data?.status) {
        setPayments(res.data.data || []);
      } else {
        setPayments([]);
      }
    } catch (err) {
      console.error("Error loading payment outs:", err);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentOuts();
  }, [selectedFirm, fromDate, toDate, adminId]);

  // Close filter dropdowns on outside click
  useEffect(() => {
    const handleOutside = () => {
      setPeriodOpen(false);
      setFirmOpen(false);
      setSupplierOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter((item) => {
      // Date filter
      if (fromDate && toDate && item.payment_date) {
        const itemDate = item.payment_date.split("T")[0].split(" ")[0];
        if (itemDate < fromDate || itemDate > toDate) return false;
      }

      // Firm filter
      if (selectedFirm !== "all" && item.company_id) {
        if (String(item.company_id) !== String(selectedFirm)) return false;
      }

      // Supplier filter
      if (selectedSupplier !== "all") {
        if (String(item.supplier_id) !== String(selectedSupplier)) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const refNo = String(item.receipt_no || item.id || "").toLowerCase();
        const party = String(item.supplier_name || "").toLowerCase();
        const notes = String(item.notes || "").toLowerCase();
        if (!refNo.includes(q) && !party.includes(q) && !notes.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [payments, fromDate, toDate, selectedFirm, selectedSupplier, searchQuery]);

  // Financial Metrics (PaySplitX 4-KPIs matching Payment In)
  const metrics = useMemo(() => {
    return filteredPayments.reduce(
      (acc, p) => {
        const amt = parseFloat(p.amount || p.total_amount || 0);
        const pd = parseFloat(p.paid_amount || p.amount || 0);
        const disc = parseFloat(p.discount_amount || 0);
        const bal = parseFloat(p.balance_amount || 0);

        acc.total += amt;
        acc.paid += pd;
        acc.discount += disc;
        acc.balance += bal;
        return acc;
      },
      { total: 0, paid: 0, discount: 0, balance: 0 }
    );
  }, [filteredPayments]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedPayments = useMemo(() => {
    const start = (safePage - 1) * rowsPerPage;
    return filteredPayments.slice(start, start + rowsPerPage);
  }, [filteredPayments, safePage, rowsPerPage]);

  // Analytics rows (Payment-Out grouped by party)
  const analyticsRows = useMemo(
    () =>
      filteredPayments.map((p) => ({
        date: p.payment_date || "",
        group: p.supplier_name || "Unknown Party",
        value: Number(p.paid_amount || p.amount || 0),
        count: 1,
      })),
    [filteredPayments]
  );

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
      "Total Amount": parseFloat(p.amount || p.total_amount || 0),
      "Paid Amount": parseFloat(p.paid_amount || p.amount || 0),
      "Payment Type": p.payment_method || "Cash",
      "Status": "Paid",
      "Notes": p.notes || ""
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payment-Out");
    XLSX.writeFile(wb, `Payment_Out_Report_${fromDate || "all"}.xlsx`);
  };

  // Delete Voucher Handler
  const handleDeletePayment = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await api.post("/purchase/delete_payment_out", {
        id: deleteTarget.id,
      });
      if (res.data?.status) {
        setPayments((prev) => prev.filter((p) => p.id !== deleteTarget.id));
        setActionToast({ msg: "Payment-Out voucher deleted successfully.", ok: true });
        setDeleteTarget(null);
        setTimeout(() => setActionToast(null), 3500);
      } else {
        setActionToast({ msg: res.data?.message || "Failed to delete voucher.", ok: false });
        setTimeout(() => setActionToast(null), 3500);
      }
    } catch (err) {
      console.error(err);
      setActionToast({ msg: err.response?.data?.message || "Error deleting payment.", ok: false });
      setTimeout(() => setActionToast(null), 3500);
    } finally {
      setDeleting(false);
      setActiveMenuId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faff] p-4 sm:p-6 lg:p-8 space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {viewMode === "analytics" ? (
        <PaymentOutAnalytics
          rows={filteredPayments}
          period={`${fromDate || "All"} → ${toDate || "All"}`}
          onClose={() => setViewMode("report")}
        />
      ) : (
        <>
      {/* ── 1. TOP HEADER (Matching Payment In) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 select-none">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-100 ring-4 ring-purple-50/50">
            <TrendingDown size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Payment-Out</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Record vendor outward payments, settle supplier ledger balances &amp; track disbursements
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setEditingPayment(null);
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-200 transition-all transform active:scale-95 cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.8} />
            <span>Add Payment-Out</span>
          </button>
        </div>
      </div>

      {/* ── 2. METRIC KPI CARDS (PaySplitX 4-Card Strip matching Payment In) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Disbursed / Paid */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Disbursed</p>
              <h3 className="text-2xl font-black text-purple-600 mt-1 tracking-tight">
                ₹ {metrics.paid.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
              ₹
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>{filteredPayments.length} Total records</span>
            <span className="inline-flex items-center gap-1 font-bold text-purple-600">
              Outflow Active
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
            <span>Bill disbursements</span>
            <span className="text-[11px] font-semibold text-slate-600">Aggregate</span>
          </div>
        </div>

        {/* Card 3: Discounts Received */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Discounts Received</p>
              <h3 className="text-2xl font-black text-amber-600 mt-1 tracking-tight">
                ₹ {metrics.discount.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              %
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Vendor waivers</span>
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
            <span>Unsettled invoice debt</span>
            <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
              Due to pay
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. FILTER TOOLBAR (Matching Payment In) ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Filter by:</span>

          {/* Period Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setPeriodOpen(!periodOpen);
                setFirmOpen(false);
                setSupplierOpen(false);
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
                      period === p.val ? "text-purple-600 font-bold bg-purple-50/50" : "text-slate-700"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Firm / Company Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setFirmOpen(!firmOpen);
                setPeriodOpen(false);
                setSupplierOpen(false);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer"
            >
              <span>
                {selectedFirm === "all"
                  ? "All Firms"
                  : companies.find((c) => String(c.id) === String(selectedFirm))?.company_name || "Firm"}
              </span>
              <ChevronDown size={13} className={`text-slate-400 transition-transform ${firmOpen ? "rotate-180" : ""}`} />
            </button>

            {firmOpen && (
              <div className="absolute left-0 mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 max-h-56 overflow-y-auto">
                <button
                  onClick={() => {
                    setSelectedFirm("all");
                    setFirmOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer ${
                    selectedFirm === "all" ? "text-purple-600 font-bold bg-purple-50/50" : "text-slate-700"
                  }`}
                >
                  🏢 All Firms
                </button>
                {companies.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedFirm(c.id);
                      setFirmOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 transition truncate cursor-pointer ${
                      String(selectedFirm) === String(c.id) ? "text-purple-600 font-bold bg-purple-50/50" : "text-slate-700"
                    }`}
                  >
                    🏢 {c.company_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Supplier Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setSupplierOpen(!supplierOpen);
                setPeriodOpen(false);
                setFirmOpen(false);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer"
            >
              <Truck size={13} className="text-slate-500" />
              <span>
                {selectedSupplier === "all"
                  ? "All Suppliers"
                  : suppliers.find((s) => String(s.id) === String(selectedSupplier))?.supplier_name || "Supplier"}
              </span>
              <ChevronDown size={13} className={`text-slate-400 transition-transform ${supplierOpen ? "rotate-180" : ""}`} />
            </button>

            {supplierOpen && (
              <div className="absolute left-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 max-h-56 overflow-y-auto">
                <button
                  onClick={() => {
                    setSelectedSupplier("all");
                    setSupplierOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer ${
                    selectedSupplier === "all" ? "text-purple-600 font-bold bg-purple-50/50" : "text-slate-700"
                  }`}
                >
                  All Suppliers
                </button>
                {suppliers.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedSupplier(s.id);
                      setSupplierOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 transition truncate cursor-pointer ${
                      String(selectedSupplier) === String(s.id) ? "text-purple-600 font-bold bg-purple-50/50" : "text-slate-700"
                    }`}
                  >
                    {s.supplier_name || s.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date Picker Range Button */}
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                fromDate && toDate
                  ? "bg-purple-50 text-purple-700 border-purple-200"
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
                    className="px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
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
          {/* Search Toggle / Input */}
          <div className="relative">
            {showSearchInput ? (
              <div className="flex items-center bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1 transition-all">
                <Search size={14} className="text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Search receipt, party..."
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
                title="Search records"
              >
                <Search size={14} />
              </button>
            )}
          </div>

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

          <button
            onClick={exportToExcel}
            className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer"
            title="Export Excel"
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

          <HeaderSettingsButton onClick={openSettings} variant="table" />
        </div>
      </div>

      {/* ── 4. DIRECTORY TABLE (Matching Payment In) ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 min-w-max">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-200/80 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                {isColumnVisible("date") && <th className="py-3.5 px-4 font-bold">Date</th>}
                {isColumnVisible("ref_no") && <th className="py-3.5 px-4 font-bold">Ref No.</th>}
                {isColumnVisible("party_name") && <th className="py-3.5 px-4 font-bold">Party Name</th>}
                {isColumnVisible("payment_type") && <th className="py-3.5 px-4 font-bold">Payment Type</th>}
                {isColumnVisible("total_amount") && <th className="py-3.5 px-4 font-bold text-right">Total Amount</th>}
                {isColumnVisible("paid_amount") && <th className="py-3.5 px-4 font-bold text-right">Paid Amount</th>}
                {isColumnVisible("balance") && <th className="py-3.5 px-4 font-bold text-right">Balance</th>}
                <th className="py-3.5 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={visibleColumnCount || 8} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={24} className="animate-spin text-purple-600" />
                      <span className="text-xs font-semibold">Loading payment-out vouchers...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedPayments.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnCount || 8} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Wallet size={32} className="text-slate-300" />
                      <span className="text-sm font-bold text-slate-700 mt-2">No Payment-Out records found</span>
                      <span className="text-xs text-slate-400">Try adjusting your filters or date range</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((p) => {
                  const paymentMethod = (p.payment_method || "cash").toUpperCase();
                  const total = parseFloat(p.amount || p.total_amount || 0);
                  const paid = parseFloat(p.paid_amount || p.amount || 0);
                  const bal = parseFloat(p.balance_amount || 0);

                  return (
                    <tr key={p.id} className="hover:bg-purple-50/20 transition-colors">
                      {/* Date */}
                      {isColumnVisible("date") && (
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          {formatDateDMY(p.payment_date)}
                        </td>
                      )}

                      {/* Ref No */}
                      {isColumnVisible("ref_no") && (
                        <td className="py-3.5 px-4 font-mono font-bold text-purple-600 whitespace-nowrap">
                          {p.receipt_no || `PAY-${p.id}`}
                        </td>
                      )}

                      {/* Party Name with Avatar */}
                      {isColumnVisible("party_name") && (
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                              {(p.supplier_name || "P").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block">{p.supplier_name || "Unknown Party"}</span>
                              {p.notes && <span className="text-[11px] text-slate-400 truncate block max-w-xs">{p.notes}</span>}
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Payment Type Badge */}
                      {isColumnVisible("payment_type") && (
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              paymentMethod === "CASH"
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                : paymentMethod === "UPI"
                                ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                                : paymentMethod === "CHEQUE"
                                ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                                : "bg-purple-50 text-purple-700 ring-1 ring-purple-200"
                            }`}
                          >
                            {paymentMethod}
                          </span>
                        </td>
                      )}

                      {/* Total Amount */}
                      {isColumnVisible("total_amount") && (
                        <td className="py-3.5 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                          ₹ {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      )}

                      {/* Paid Amount */}
                      {isColumnVisible("paid_amount") && (
                        <td className="py-3.5 px-4 text-right font-black text-emerald-600 whitespace-nowrap">
                          ₹ {paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      )}

                      {/* Balance */}
                      {isColumnVisible("balance") && (
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black ${
                              bal <= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            ₹ {bal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                      )}

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <TableActions
                          onPrint={() => navigate(`/invoice/${p.receipt_no || p.id}`)}
                          printTitle="Print"
                          shareTransaction={p}
                          shareType="Payment-Out"
                          onViewInvoice={() => navigate(`/invoice/${p.receipt_no || p.id}`)}
                          viewInvoiceLabel="View Invoice"
                          menuItems={[
                            {
                              label: "Edit",
                              icon: Edit,
                              onClick: () => {
                                setEditingPayment(p);
                                setIsAddModalOpen(true);
                              },
                            },
                            {
                              label: "View Invoice",
                              icon: Eye,
                              onClick: () => navigate(`/invoice/${p.receipt_no || p.id}`),
                            },
                            { isDivider: true },
                            {
                              label: "Delete",
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

        {/* ── 5. PAGINATION BAR (Matching Payment In) ── */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-bold outline-none cursor-pointer"
            >
              {[10, 20, 50, 100].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
            <span className="ml-2 font-medium">
              Showing {(safePage - 1) * rowsPerPage + 1} -{" "}
              {Math.min(safePage * rowsPerPage, filteredPayments.length)} of {filteredPayments.length} entries
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safePage <= 1}
              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="px-3 py-1 font-bold text-slate-800">
              {safePage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safePage >= totalPages}
              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 6. DELETE CONFIRMATION MODAL (Matching Payment In) ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Payment-Out Voucher</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete voucher{" "}
                <strong className="text-slate-800">{deleteTarget.receipt_no || `PAY-${deleteTarget.id}`}</strong>?
                Linked invoice debt balances will be restored.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePayment}
                disabled={deleting}
                className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-200 transition cursor-pointer disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Voucher"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. TOAST NOTIFICATION ── */}
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

      {/* ── 8. ADD/EDIT PAYMENT OUT MODAL ── */}
      <AddPaymentOutModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingPayment(null);
        }}
        onSuccess={() => {
          fetchPaymentOuts();
        }}
        editPayment={editingPayment}
      />

      {/* ── 9. TABLE COLUMN CUSTOMIZATION DRAWER ── */}
      <CommonTableColumnSettings
        isOpen={isSettingsOpen}
        onClose={closeSettings}
        columns={tableColumns}
        onToggleColumn={toggleColumn}
        onResetColumns={resetColumns}
        title="Customize Payment-Out Columns"
      />
    </div>
  );
}
