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
  FileText,
  MoreVertical,
  Pencil,
  Settings,
  TrendingUp,
  Edit3,
  SlidersHorizontal,
  Building2,
  Truck,
  RotateCcw,
  Receipt,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  Clock,
  CircleDot
} from "lucide-react";

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
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);

  // Search & view toggles
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionToast, setActionToast] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const periodLabels = {
    all_time: "All Time",
    today: "Today",
    yesterday: "Yesterday",
    this_week: "This Week",
    this_month: "This Month",
    this_quarter: "This Quarter",
    this_year: "This Year",
    custom: "Custom Date"
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

  // Pagination calculation
  const totalPages = Math.ceil(filteredDebitNotes.length / rowsPerPage) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredDebitNotes.slice(start, start + rowsPerPage);
  }, [filteredDebitNotes, currentPage, rowsPerPage]);

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

  const refundRate = totalAmount > 0 ? Math.round((totalRefund / totalAmount) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 max-w-[1520px] mx-auto min-h-screen space-y-4 bg-[#f8fafc] font-sans text-slate-800">
      
      {/* Toast Alert */}
      {actionToast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold transition-all flex items-center gap-2.5 backdrop-blur-md animate-in slide-in-from-top-3 duration-200 ${
          actionToast.ok ? "bg-emerald-500/90 text-white border-emerald-400" : "bg-rose-500/90 text-white border-rose-400"
        }`}>
          {actionToast.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{actionToast.msg}</span>
        </div>
      )}

      {/* ── 1. EXECUTIVE COMMAND HEADER ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
            <RotateCcw size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Purchase Return & Debit Notes</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {filteredDebitNotes.length} notes
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Manage returned items, supplier debit adjustments, and refund settlements
            </p>
          </div>
        </div>

        {/* Header Action Tools */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchDebitNotes}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
            title="Refresh Data"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-purple-600" : "text-slate-500"} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportExcel}
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
            onClick={() => navigate("/purchases/debit-note/add")}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-500/25 transition active:scale-95 cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.8} />
            <span>+ Add Debit Note</span>
          </button>
        </div>
      </div>

      {/* ── 2. SEGMENTED FINANCIAL INTELLIGENCE STRIP (3 KPIs) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* KPI 1: Total Return Amount */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Total Return Value
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <RotateCcw size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              ₹ {fmtCurrency(totalAmount)}
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 font-semibold">
              <span className="text-purple-600 font-bold">{filteredDebitNotes.length}</span> returns processed
            </div>
          </div>
          <div className="w-full bg-purple-100 h-1.5 rounded-full mt-4 overflow-hidden">
            <div className="bg-purple-600 h-full rounded-full w-full" />
          </div>
        </div>

        {/* KPI 2: Refund / Settled Amount */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
              Refunded & Settled
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
              ₹ {fmtCurrency(totalRefund)}
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 font-semibold">
              <span className="text-emerald-700 font-bold">{refundRate}%</span> recovery rate
            </div>
          </div>
          <div className="w-full bg-emerald-100 h-1.5 rounded-full mt-4 overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, refundRate))}%` }}
            />
          </div>
        </div>

        {/* KPI 3: Pending Balance Due */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-600">
              Pending Refund Balance
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl sm:text-3xl font-black tracking-tight ${totalBalance > 0 ? "text-rose-600" : "text-slate-900"}`}>
              ₹ {fmtCurrency(totalBalance)}
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 font-semibold">
              <span>{totalBalance > 0 ? "Awaiting supplier credit note / cash refund" : "All returns fully settled"}</span>
            </div>
          </div>
          <div className="w-full bg-rose-100 h-1.5 rounded-full mt-4 overflow-hidden">
            <div
              className="bg-rose-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${totalAmount > 0 ? Math.min(100, (totalBalance / totalAmount) * 100) : 0}%` }}
            />
          </div>
        </div>

      </div>

      {/* ── 3. SEGMENTED FILTER BAR ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        
        {/* Left Filter Pill Group */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <span className="font-extrabold text-slate-500 flex items-center gap-1.5 mr-1 uppercase text-[11px] tracking-wider">
            <SlidersHorizontal size={13} />
            <span>Filters</span>
          </span>

          {/* Period Dropdown Pill */}
          <div data-dropdown-container className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPeriodOpen((v) => !v);
                setFirmOpen(false);
                setSupplierOpen(false);
                setPaymentFilterOpen(false);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 font-bold text-slate-700 transition cursor-pointer shadow-2xs"
            >
              <Calendar size={13} className="text-slate-400" />
              <span>{periodLabels[period] || "This Month"}</span>
              <ChevronDown size={13} className={`text-slate-400 transition-transform ${periodOpen ? "rotate-180" : ""}`} />
            </button>

            {periodOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
              >
                {Object.entries(periodLabels).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setPeriod(key);
                      setPeriodOpen(false);
                      if (key === "custom") {
                        setShowDatePickerModal(true);
                      } else {
                        setPresetDates(key);
                      }
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold transition cursor-pointer flex items-center justify-between ${
                      period === key ? "bg-purple-50 text-purple-700 font-bold" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{label}</span>
                    {period === key && <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date Picker Button */}
          <button
            onClick={() => setShowDatePickerModal((v) => !v)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 font-bold text-slate-700 transition cursor-pointer shadow-2xs"
          >
            <Calendar size={13} className="text-purple-600" />
            <span>
              {fromDate ? formatDateDMY(fromDate) : "01/09/2026"} - {toDate ? formatDateDMY(toDate) : "30/09/2026"}
            </span>
          </button>

          {/* Date Range Modal Popover */}
          {showDatePickerModal && (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-purple-300 shadow-md">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPeriod("custom");
                }}
                className="text-xs text-slate-700 font-bold outline-none bg-transparent cursor-pointer"
              />
              <span className="text-slate-400 text-xs font-bold">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPeriod("custom");
                }}
                className="text-xs text-slate-700 font-bold outline-none bg-transparent cursor-pointer"
              />
            </div>
          )}

          {/* Firm Selector Pill */}
          <div data-dropdown-container className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFirmOpen((v) => !v);
                setPeriodOpen(false);
                setSupplierOpen(false);
                setPaymentFilterOpen(false);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 font-bold text-slate-700 transition cursor-pointer shadow-2xs"
            >
              <Building2 size={13} className="text-slate-400" />
              <span>
                {selectedFirm === "all"
                  ? "All Firms"
                  : companies.find((c) => String(c.id) === String(selectedFirm))?.company_name || "Firm"}
              </span>
              <ChevronDown size={13} className={`text-slate-400 transition-transform ${firmOpen ? "rotate-180" : ""}`} />
            </button>

            {firmOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 max-h-56 overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-100"
              >
                <button
                  onClick={() => {
                    setSelectedFirm("all");
                    setFirmOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs font-semibold transition cursor-pointer flex items-center justify-between ${
                    selectedFirm === "all" ? "bg-purple-50 text-purple-700 font-bold" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>All Firms</span>
                  {selectedFirm === "all" && <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />}
                </button>
                {companies.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedFirm(c.id);
                      setFirmOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold transition cursor-pointer truncate ${
                      String(selectedFirm) === String(c.id) ? "bg-purple-50 text-purple-700 font-bold" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {c.company_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Supplier Selector Pill */}
          <div data-dropdown-container className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSupplierOpen((v) => !v);
                setPeriodOpen(false);
                setFirmOpen(false);
                setPaymentFilterOpen(false);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 font-bold text-slate-700 transition cursor-pointer shadow-2xs"
            >
              <Truck size={13} className="text-slate-400" />
              <span>
                {selectedSupplier === "all"
                  ? "All Suppliers"
                  : suppliers.find((s) => String(s.id) === String(selectedSupplier))?.supplier_name ||
                    suppliers.find((s) => String(s.id) === String(selectedSupplier))?.name ||
                    "Supplier"}
              </span>
              <ChevronDown size={13} className={`text-slate-400 transition-transform ${supplierOpen ? "rotate-180" : ""}`} />
            </button>

            {supplierOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-full mt-1.5 w-60 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 max-h-56 overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-100"
              >
                <button
                  onClick={() => {
                    setSelectedSupplier("all");
                    setSupplierOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs font-semibold transition cursor-pointer flex items-center justify-between ${
                    selectedSupplier === "all" ? "bg-purple-50 text-purple-700 font-bold" : "text-slate-700 hover:bg-slate-50"
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
                      className={`w-full text-left px-3.5 py-2 text-xs font-semibold transition cursor-pointer truncate ${
                        isSelected ? "bg-purple-50 text-purple-700 font-bold" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {sName}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payment Filter Pill */}
          <div data-dropdown-container className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPaymentFilterOpen((v) => !v);
                setPeriodOpen(false);
                setFirmOpen(false);
                setSupplierOpen(false);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 font-bold text-slate-700 transition cursor-pointer shadow-2xs"
            >
              <span>
                {paymentFilter === "all"
                  ? "All Payment Modes"
                  : paymentFilter === "cash"
                  ? "Cash"
                  : paymentFilter === "online"
                  ? "Online"
                  : paymentFilter === "upi"
                  ? "UPI"
                  : paymentFilter === "cheque"
                  ? "Cheque"
                  : "Credit"}
              </span>
              <ChevronDown size={13} className={`text-slate-400 transition-transform ${paymentFilterOpen ? "rotate-180" : ""}`} />
            </button>

            {paymentFilterOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
              >
                {[
                  { key: "all", label: "All Payment Modes" },
                  { key: "cash", label: "Cash" },
                  { key: "online", label: "Online" },
                  { key: "upi", label: "UPI" },
                  { key: "cheque", label: "Cheque" },
                  { key: "credit", label: "Credit" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      setPaymentFilter(item.key);
                      setPaymentFilterOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold transition cursor-pointer flex items-center justify-between ${
                      paymentFilter === item.key ? "bg-purple-50 text-purple-700 font-bold" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{item.label}</span>
                    {paymentFilter === item.key && <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Global Search Input */}
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search ref #, party, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition shadow-2xs"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── 4. MODERN TWO-TIER DATA TABLE ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-500 text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4 border-r border-slate-200/70 whitespace-nowrap">#</th>
                <th className="py-3.5 px-4 border-r border-slate-200/70 whitespace-nowrap">Date</th>
                <th className="py-3.5 px-4 border-r border-slate-200/70 whitespace-nowrap">Ref No</th>
                <th className="py-3.5 px-5 border-r border-slate-200/70 whitespace-nowrap">Supplier / Party</th>
                <th className="py-3.5 px-4 border-r border-slate-200/70 whitespace-nowrap">Mode</th>
                <th className="py-3.5 px-5 border-r border-slate-200/70 text-right whitespace-nowrap">Total Return</th>
                <th className="py-3.5 px-5 border-r border-slate-200/70 text-right whitespace-nowrap">Received / Refund</th>
                <th className="py-3.5 px-5 border-r border-slate-200/70 text-right whitespace-nowrap">Balance Due</th>
                <th className="py-3.5 px-4 border-r border-slate-200/70 text-center whitespace-nowrap">Status</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-14 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin text-purple-600 mx-auto mb-2" />
                    <span className="font-semibold text-xs">Loading debit note transactions...</span>
                  </td>
                </tr>
              ) : filteredDebitNotes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-400">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                      <RotateCcw size={26} />
                    </div>
                    <p className="font-extrabold text-slate-800 text-sm">No Debit Notes Found</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      No purchase returns match your filter criteria. Record a new return to manage vendor adjustments.
                    </p>
                    <button
                      onClick={() => navigate("/purchases/debit-note/add")}
                      className="mt-4 inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer active:scale-95"
                    >
                      <Plus size={15} /> + Add Debit Note
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedList.map((item, idx) => {
                  const globalIdx = (currentPage - 1) * rowsPerPage + idx + 1;
                  const isMenuOpen = activeMenuId === item.id;
                  const isPaid = Number(item.balance_amount || 0) <= 0;

                  return (
                    <tr
                      key={item.id || idx}
                      className="group hover:bg-purple-50/30 transition-colors duration-150 text-slate-700"
                    >
                      {/* S.NO */}
                      <td className="py-3.5 px-4 border-r border-slate-200/70 text-slate-400 font-semibold whitespace-nowrap">
                        {globalIdx}
                      </td>

                      {/* DATE */}
                      <td className="py-3.5 px-4 border-r border-slate-200/70 whitespace-nowrap text-slate-600 font-semibold">
                        {formatDateDMY(item.return_date)}
                      </td>

                      {/* REF NO */}
                      <td className="py-3.5 px-4 border-r border-slate-200/70 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                          #{item.return_no || item.id}
                        </span>
                      </td>

                      {/* SUPPLIER NAME */}
                      <td className="py-3.5 px-5 border-r border-slate-200/70 whitespace-nowrap">
                        <div className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                          {item.supplier_name || "-"}
                        </div>
                        {item.supplier_phone && (
                          <div className="text-[10px] text-slate-400 font-medium">{item.supplier_phone}</div>
                        )}
                      </td>

                      {/* PAYMENT TYPE */}
                      <td className="py-3.5 px-4 border-r border-slate-200/70 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200 uppercase">
                          {item.payment_type || "Cash"}
                        </span>
                      </td>

                      {/* TOTAL AMOUNT */}
                      <td className="py-3.5 px-5 border-r border-slate-200/70 font-extrabold text-slate-900 text-right whitespace-nowrap">
                        ₹ {fmtCurrency(item.total_amount)}
                      </td>

                      {/* REFUND / RECEIVED AMOUNT */}
                      <td className="py-3.5 px-5 border-r border-slate-200/70 font-bold text-emerald-700 text-right whitespace-nowrap">
                        ₹ {fmtCurrency(item.refund_amount)}
                      </td>

                      {/* BALANCE AMOUNT */}
                      <td className={`py-3.5 px-5 border-r border-slate-200/70 font-bold text-right whitespace-nowrap ${
                        Number(item.balance_amount || 0) > 0 ? "text-rose-600" : "text-slate-600"
                      }`}>
                        ₹ {fmtCurrency(item.balance_amount)}
                      </td>

                      {/* STATUS */}
                      <td className="py-3.5 px-4 border-r border-slate-200/70 text-center whitespace-nowrap font-bold">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Settled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Pending
                          </span>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => navigate(`/purchases/debit-note/edit/${item.id}`)}
                            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Edit Debit Note"
                          >
                            <Pencil size={14} />
                          </button>

                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Delete Debit Note"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-slate-200 flex justify-between items-center bg-slate-50/70 text-xs">
            <span className="text-slate-500 font-medium">
              Showing Page <b className="text-slate-800">{currentPage}</b> of <b className="text-slate-800">{totalPages}</b> ({filteredDebitNotes.length} total)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white disabled:opacity-40 font-bold hover:bg-slate-100 text-slate-700 transition cursor-pointer shadow-2xs"
              >
                Previous
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white disabled:opacity-40 font-bold hover:bg-slate-100 text-slate-700 transition cursor-pointer shadow-2xs"
              >
                Next
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
              Are you sure you want to delete Debit Note <b>#{deleteTarget.return_no || deleteTarget.id}</b> for supplier <b>{deleteTarget.supplier_name || "-"}</b> with amount <b>₹{fmtCurrency(deleteTarget.total_amount)}</b>?
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

    </div>
  );
}
