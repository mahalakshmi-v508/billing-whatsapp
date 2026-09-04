import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import * as XLSX from "xlsx";
import {
  Plus,
  ChevronDown,
  Calendar,
  Search,
  Printer,
  FileSpreadsheet,
  MoreVertical,
  Trash2,
  Edit3,
  AlertTriangle,
  X,
  RefreshCw,
  TrendingUp,
  Building2,
  Truck,
  SlidersHorizontal,
  CheckCircle2,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Wallet
} from "lucide-react";
import AddPaymentOutModal from "./AddPaymentOutModal";

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
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Modals & toast states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

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
    <div className="p-4 sm:p-6 max-w-[1520px] mx-auto min-h-screen space-y-5 bg-[#f8fafc] font-sans text-slate-800">
      
      {/* ── 1. EXECUTIVE COMMAND HEADER ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
            <ArrowDownRight size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Payment-Out Ledger</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {filteredPayments.length} vouchers
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Vendor cash/bank payment disbursements, settlement receipts and ledger adjustments
            </p>
          </div>
        </div>

        {/* Toolbar Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchPaymentOuts}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
            title="Refresh Data"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-purple-600" : "text-slate-500"} />
            <span>Refresh</span>
          </button>

          <button
            onClick={exportToExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
            title="Export Excel"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
            title="Print View"
          >
            <Printer size={14} className="text-slate-500" />
            <span>Print</span>
          </button>

          {/* Primary CTA */}
          <button
            onClick={() => {
              setEditingPayment(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-500/25 transition active:scale-95 cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.8} />
            <span>+ Add Payment-Out</span>
          </button>
        </div>
      </div>

      {/* ── 2. SEGMENTED FINANCIAL INTELLIGENCE STRIP ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Metric 1: Total Payment Out */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                Total Disbursed
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1.5 tracking-tight">
                ₹ {fmt(metrics.total)}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Wallet size={20} />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Supplier Payouts</span>
            <span className="font-bold text-slate-800">{filteredPayments.length} Transactions</span>
          </div>
        </div>

        {/* Metric 2: Paid To Vendors */}
        <div className="bg-white rounded-2xl border border-emerald-200/80 p-4 shadow-xs relative overflow-hidden flex flex-col justify-between bg-gradient-to-br from-white to-emerald-50/20">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Vendor Clearance
              </span>
              <div className="text-2xl font-black text-emerald-900 mt-1.5 tracking-tight">
                ₹ {fmt(metrics.paid)}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-emerald-100 flex items-center justify-between text-xs">
            <span className="text-emerald-700 font-semibold">Settlement Status</span>
            <span className="font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full text-[11px]">100% Cleared</span>
          </div>
        </div>

        {/* Metric 3: Average Payout Size */}
        <div className="bg-white rounded-2xl border border-indigo-200/80 p-4 shadow-xs relative overflow-hidden flex flex-col justify-between bg-gradient-to-br from-white to-indigo-50/20">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                Avg. Payout Voucher
              </span>
              <div className="text-2xl font-black text-indigo-900 mt-1.5 tracking-tight">
                ₹ {fmt(filteredPayments.length > 0 ? metrics.total / filteredPayments.length : 0)}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-100/70 text-indigo-700 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-indigo-100 flex items-center justify-between text-xs">
            <span className="text-indigo-700 font-medium">Recorded Across</span>
            <span className="font-bold text-indigo-800">{new Set(filteredPayments.map(p => p.supplier_id)).size} Suppliers</span>
          </div>
        </div>

      </div>

      {/* ── 3. FILTER & SEARCH CONTROL TOOLBAR ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Left Filter Pill Group */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mr-1">
            <SlidersHorizontal size={14} className="text-slate-400" />
            <span>Filters:</span>
          </span>

          {/* Period Selector */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPeriodOpen((v) => !v);
                setFirmOpen(false);
                setSupplierOpen(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer"
            >
              <span>{periodLabels[period] || "This Month"}</span>
              <ChevronDown size={13} className={`text-slate-500 transition-transform duration-200 ${periodOpen ? "rotate-180" : ""}`} />
            </button>

            {periodOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
              >
                {Object.entries(periodLabels).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setPeriod(key);
                      setPeriodOpen(false);
                      if (key === "custom") setShowDatePicker(true);
                    }}
                    className={`w-full text-left px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer flex items-center justify-between ${
                      period === key ? "bg-purple-50 text-purple-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{label}</span>
                    {period === key && <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date Range Display Button */}
          <button
            onClick={() => setShowDatePicker((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-semibold text-xs transition cursor-pointer"
          >
            <Calendar size={13} className="text-slate-500" />
            <span>
              {fromDate ? formatDateDMY(fromDate) : "01/09/2026"} - {toDate ? formatDateDMY(toDate) : "30/09/2026"}
            </span>
          </button>

          {/* Date Picker Range Popover */}
          {showDatePicker && (
            <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-xl border border-purple-300 shadow-sm">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPeriod("custom");
                }}
                className="text-xs text-slate-700 outline-none bg-transparent cursor-pointer font-medium"
              />
              <span className="text-slate-400 text-xs font-bold">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPeriod("custom");
                }}
                className="text-xs text-slate-700 outline-none bg-transparent cursor-pointer font-medium"
              />
            </div>
          )}

          {/* Firm Selector */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFirmOpen((v) => !v);
                setPeriodOpen(false);
                setSupplierOpen(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer"
            >
              <Building2 size={13} className="text-slate-500" />
              <span>
                {selectedCompany === "all"
                  ? "All Firms"
                  : companies.find((c) => String(c.id) === String(selectedCompany))?.company_name || "Firm"}
              </span>
              <ChevronDown size={13} className={`text-slate-500 transition-transform duration-200 ${firmOpen ? "rotate-180" : ""}`} />
            </button>

            {firmOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 max-h-56 overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-100"
              >
                <button
                  onClick={() => {
                    setSelectedCompany("all");
                    setFirmOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer flex items-center justify-between ${
                    selectedCompany === "all" ? "bg-purple-50 text-purple-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>All Firms</span>
                  {selectedCompany === "all" && <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />}
                </button>
                {companies.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCompany(c.id);
                      setFirmOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer truncate ${
                      String(selectedCompany) === String(c.id) ? "bg-purple-50 text-purple-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {c.company_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Supplier Selector */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSupplierOpen((v) => !v);
                setPeriodOpen(false);
                setFirmOpen(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer"
            >
              <Truck size={13} className="text-slate-500" />
              <span>
                {selectedSupplier === "all"
                  ? "All Suppliers"
                  : suppliers.find((s) => String(s.id) === String(selectedSupplier))?.supplier_name ||
                    suppliers.find((s) => String(s.id) === String(selectedSupplier))?.name ||
                    "Supplier"}
              </span>
              <ChevronDown size={13} className={`text-slate-500 transition-transform duration-200 ${supplierOpen ? "rotate-180" : ""}`} />
            </button>

            {supplierOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 max-h-56 overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-100"
              >
                <button
                  onClick={() => {
                    setSelectedSupplier("all");
                    setSupplierOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer flex items-center justify-between ${
                    selectedSupplier === "all" ? "bg-purple-50 text-purple-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>All Suppliers</span>
                  {selectedSupplier === "all" && <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />}
                </button>
                {suppliers.map((s) => {
                  const sName = s.supplier_name || s.name || `Supplier #${s.id}`;
                  const isSelected = String(selectedSupplier) === String(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedSupplier(s.id);
                        setSupplierOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer truncate ${
                        isSelected ? "bg-purple-50 text-purple-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {sName}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Global Search Input */}
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search ref, supplier, amount..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── 4. MODERN SAAS TRANSACTION DATA TABLE ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        
        {/* Table Header Bar */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Payment-Out Register</h2>
            <span className="text-[11px] font-bold text-slate-400">({filteredPayments.length} records)</span>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-500 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 border-r border-slate-200/70 whitespace-nowrap">Date</th>
                <th className="py-3 px-4 border-r border-slate-200/70 whitespace-nowrap">Ref / Receipt #</th>
                <th className="py-3 px-5 border-r border-slate-200/70 whitespace-nowrap">Supplier / Party</th>
                <th className="py-3 px-4 border-r border-slate-200/70 whitespace-nowrap">Payment Mode</th>
                <th className="py-3 px-5 border-r border-slate-200/70 text-right whitespace-nowrap">Total Amount</th>
                <th className="py-3 px-5 border-r border-slate-200/70 text-right whitespace-nowrap">Paid Amount</th>
                <th className="py-3 px-4 border-r border-slate-200/70 text-center whitespace-nowrap">Status</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin text-purple-600 mx-auto mb-2.5" />
                    <span className="font-bold text-slate-600">Loading payout records...</span>
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                      <AlertTriangle size={24} />
                    </div>
                    <p className="font-extrabold text-slate-700 text-sm">No Payment Vouchers Found</p>
                    <p className="text-xs text-slate-400 mt-1">There are no payment-out records matching your active filters.</p>
                    <button
                      onClick={() => {
                        setEditingPayment(null);
                        setIsAddModalOpen(true);
                      }}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer transition active:scale-95"
                    >
                      <Plus size={14} /> Record Payment-Out
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((p, idx) => {
                  const isMenuOpen = activeMenuId === p.id;

                  return (
                    <tr
                      key={p.id || idx}
                      className="group hover:bg-purple-50/30 transition-colors duration-150 text-slate-700"
                    >
                      {/* DATE */}
                      <td className="py-3.5 px-4 border-r border-slate-200/70 whitespace-nowrap text-slate-600 group-hover:text-slate-900 font-semibold">
                        {formatDateDMY(p.payment_date)}
                      </td>

                      {/* REF NO */}
                      <td className="py-3.5 px-4 border-r border-slate-200/70 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {p.receipt_no ? `#${p.receipt_no}` : `#REC-${p.id}`}
                        </span>
                      </td>

                      {/* PARTY NAME */}
                      <td className="py-3.5 px-5 border-r border-slate-200/70 whitespace-nowrap font-bold text-slate-900">
                        <span>{p.supplier_name || "Unknown Party"}</span>
                      </td>

                      {/* PAYMENT TYPE */}
                      <td className="py-3.5 px-4 border-r border-slate-200/70 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200 uppercase">
                          {p.payment_method || "Cash"}
                        </span>
                      </td>

                      {/* TOTAL AMOUNT */}
                      <td className="py-3.5 px-5 border-r border-slate-200/70 font-extrabold text-slate-900 text-right whitespace-nowrap">
                        ₹ {fmt(p.amount)}
                      </td>

                      {/* PAID */}
                      <td className="py-3.5 px-5 border-r border-slate-200/70 font-extrabold text-emerald-700 text-right whitespace-nowrap">
                        ₹ {fmt(p.amount)}
                      </td>

                      {/* STATUS */}
                      <td className="py-3.5 px-4 border-r border-slate-200/70 text-center whitespace-nowrap font-bold">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Paid
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {/* Print POS */}
                          <button
                            onClick={() => window.print()}
                            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Print Voucher"
                          >
                            <Printer size={14} />
                          </button>

                          {/* 3-Dots More Menu */}
                          <div className="relative">
                            <button
                              onClick={() => setActiveMenuId(isMenuOpen ? null : p.id)}
                              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                              title="More options"
                            >
                              <MoreVertical size={15} />
                            </button>

                            {isMenuOpen && (
                              <div
                                ref={menuRef}
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 text-left animate-in fade-in zoom-in-95 duration-100"
                              >
                                <button
                                  onClick={() => {
                                    setEditingPayment(p);
                                    setIsAddModalOpen(true);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <Edit3 size={14} className="text-blue-600" />
                                  <span>Edit</span>
                                </button>

                                <button
                                  onClick={() => handleDeletePayment(p.id)}
                                  className="w-full px-3.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer border-t border-slate-100 mt-1 pt-1.5"
                                >
                                  <Trash2 size={14} />
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
        </div>
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

    </div>
  );
}
