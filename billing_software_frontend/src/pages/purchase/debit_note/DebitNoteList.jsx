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
  Pencil,
  Eye,
  CornerUpLeft,
  CheckCircle2,
  ShieldAlert,
  Calculator,
  Building2,
} from "lucide-react";
import TableActions from "../../../components/ui/TableActions";
import HeaderSettingsButton from "../../../components/HeaderSettingsButton";
import CommonTableColumnSettings from "../../../components/CommonTableColumnSettings";
import { useTableColumns } from "../../../hooks/useTableColumns";

const DEFAULT_DEBIT_NOTE_COLUMNS = [
  { id: "seq", label: "#", defaultVisible: true },
  { id: "date", label: "Date", defaultVisible: true },
  { id: "return_no", label: "Return No.", defaultVisible: true },
  { id: "party_name", label: "Party Name", defaultVisible: true, fixed: true },
  { id: "type", label: "Type", defaultVisible: true },
  { id: "total", label: "Total", defaultVisible: true },
  { id: "refunded", label: "Refunded", defaultVisible: true },
  { id: "balance", label: "Balance", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "actions", label: "Actions", defaultVisible: true, fixed: true },
];

export default function DebitNoteList() {
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
    isColumnVisible
  } = useTableColumns(DEFAULT_DEBIT_NOTE_COLUMNS, "debit_note_table_columns_v1");

  // Data states
  const [debitNotes, setDebitNotes] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [period, setPeriod] = useState("all_time");
  const [periodOpen, setPeriodOpen] = useState(false);
  const [selectedFirm, setSelectedFirm] = useState("all");
  const [selectedSupplier, setSelectedSupplier] = useState("all");
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState("all");

  // Date range
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

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

  // Currency Format Helper
  const fmt = (val) =>
    parseFloat(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Preset Date Helper
  const setPresetDates = (type) => {
    if (type === "custom") {
      setPeriod("custom");
      setPeriodOpen(false);
      return;
    }

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

    const fmt = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    setFromDate(fmt(from));
    setToDate(fmt(to));
    setPeriod(type);
    setPeriodOpen(false);
  };

  // Initial setup: preset dates, companies, and suppliers
  useEffect(() => {
    setPresetDates("all_time");

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
      let dateParam = "";
      if (fromDate) dateParam += `&from_date=${fromDate}`;
      if (toDate) dateParam += `&to_date=${toDate}`;
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

  // Close menus on outside click


  // Filtered List
  const filteredNotes = useMemo(() => {
    return debitNotes.filter((item) => {
      // Date filter
      if (item.return_date) {
        const itemDate = item.return_date.split("T")[0];
        if (fromDate && itemDate < fromDate) return false;
        if (toDate && itemDate > toDate) return false;
      }

      // Firm filter
      if (selectedFirm !== "all" && item.company_id) {
        if (String(item.company_id) !== String(selectedFirm)) return false;
      }

      // Supplier filter
      if (selectedSupplier !== "all" && item.supplier_id) {
        if (String(item.supplier_id) !== String(selectedSupplier)) return false;
      }

      // Payment filter
      if (paymentFilter !== "all") {
        const bal = parseFloat(item.balance_amount || 0);
        const ref = parseFloat(item.refund_amount || 0);
        if (paymentFilter === "unpaid" && !(bal > 0 && ref === 0)) return false;
        if (paymentFilter === "partial" && !(bal > 0 && ref > 0)) return false;
        if (paymentFilter === "paid" && !(bal <= 0)) return false;
        if (paymentFilter === "cash" && (item.payment_type || "").toLowerCase() !== "cash") return false;
        if (paymentFilter === "online" && (item.payment_type || "").toLowerCase() !== "online") return false;
        if (paymentFilter === "upi" && (item.payment_type || "").toLowerCase() !== "upi") return false;
        if (paymentFilter === "cheque" && (item.payment_type || "").toLowerCase() !== "cheque") return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const refNo = String(item.return_no || item.id || "").toLowerCase();
        const partyName = String(item.supplier_name || "").toLowerCase();
        const partyPhone = String(item.supplier_phone || "").toLowerCase();
        const total = String(item.total_amount || "");
        if (!refNo.includes(q) && !partyName.includes(q) && !partyPhone.includes(q) && !total.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [debitNotes, fromDate, toDate, selectedFirm, selectedSupplier, paymentFilter, searchQuery]);

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

  // KPI Metrics (presentation only)
  const kpiMetrics = useMemo(() => {
    let settledCount = 0;
    let pendingCount = 0;
    let partialCount = 0;
    const pendingSuppliers = new Set();

    filteredNotes.forEach((n) => {
      const bal = parseFloat(n.balance_amount || 0);
      const ref = parseFloat(n.refund_amount || 0);
      if (bal <= 0) settledCount += 1;
      else if (ref > 0) partialCount += 1;
      else pendingCount += 1;

      if (bal > 0) {
        const key = String(n.supplier_id || n.supplier_name || "");
        if (key) pendingSuppliers.add(key);
      }
    });

    return {
      settledCount,
      pendingCount,
      partialCount,
      suppliersWithPending: pendingSuppliers.size,
      avgReturn: filteredNotes.length > 0 ? totals.totalAmt / filteredNotes.length : 0,
    };
  }, [filteredNotes, totals.totalAmt]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedFirm, selectedSupplier, fromDate, toDate, period, paymentFilter]);

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
      "Party Name": n.supplier_name || "Supplier",
      Type: "Debit Note",
      "Payment Mode": n.payment_type || "Cash",
      Total: parseFloat(n.total_amount || 0),
      Refunded: parseFloat(n.refund_amount || 0),
      Balance: parseFloat(n.balance_amount || 0),
      Status: parseFloat(n.balance_amount || 0) <= 0 ? "Paid" : (parseFloat(n.refund_amount || 0) > 0 ? "Partial" : "Unpaid"),
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Debit Note");
    XLSX.writeFile(workbook, `Purchase_Return_DebitNote_Report_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // Delete Action
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await api.post("/debit_note/delete", { id: deleteTarget.id });
      if (res.data?.status) {
        setDebitNotes((prev) => prev.filter((d) => d.id !== deleteTarget.id));
        setActionToast({ msg: "Debit note deleted and supplier balance adjusted.", ok: true });
        setDeleteTarget(null);
        setTimeout(() => setActionToast(null), 3500);
      } else {
        setActionToast({ msg: res.data?.message || "Failed to delete debit note.", ok: false });
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
    <div className="space-y-6 min-h-screen bg-[#f8faff] p-4 sm:p-6 lg:p-8 font-sans animate-in fade-in duration-300">

      {/* ── 1. PAGE HEADER (PaySplitX Header Design) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-md shadow-indigo-100 ring-2 ring-indigo-50">
              <CornerUpLeft size={20} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-display">
              Purchase Return / Debit Notes
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
              {filteredNotes.length} Total Notes
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              {suppliers.length} Suppliers
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage returned merchandise, supplier debit adjustments, and refund settlements.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm rounded-xl shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet size={16} className="text-emerald-600" />
            <span>Excel Report</span>
          </button>
          <button
            onClick={() => navigate("/purchases/debit-note/add")}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-200 transition-all transform active:scale-95 cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.8} />
            <span>Create Debit Note</span>
          </button>
        </div>
      </div>

      {/* ── 2. METRIC STAT CARDS (PaySplitX 5-Card Strip) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Total Return Value */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Returns</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CornerUpLeft size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight my-1 font-display">
            ₹{fmt(totals.totalAmt)}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="text-indigo-600 font-bold">{filteredNotes.length}</span>
            <span>debit notes in range</span>
          </div>
        </div>

        {/* Refunded / Settled */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Refunded (Settled)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 tracking-tight my-1 font-display">
            ₹{fmt(totals.refundAmt)}
          </div>
          <div className="text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">{kpiMetrics.settledCount}</span> fully settled notes
          </div>
        </div>

        {/* Pending Refund Balance */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Refunds</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600 tracking-tight my-1 font-display">
            ₹{fmt(totals.balanceAmt)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-rose-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span>{kpiMetrics.pendingCount + kpiMetrics.partialCount} notes awaiting refund</span>
          </div>
        </div>

        {/* Average Return Size */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average Return</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calculator size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 tracking-tight my-1 font-display">
            ₹{fmt(kpiMetrics.avgReturn)}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="text-amber-600 font-bold">{kpiMetrics.partialCount}</span>
            <span>partially settled</span>
          </div>
        </div>

        {/* Registered Suppliers Base */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-1 bg-slate-500" />
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered Suppliers</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Building2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight my-1 font-display">
            {suppliers.length}
          </div>
          <div className="text-[11px] text-slate-500">
            <span className="font-semibold text-amber-600">{kpiMetrics.suppliersWithPending}</span> awaiting settlement
          </div>
        </div>
      </div>

      {/* ── 3. CONTROLS BAR: Firm Selection + Date / Supplier Filters ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Company Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Firm:</span>
          <button
            onClick={() => setSelectedFirm("all")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedFirm === "all"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200 ring-2 ring-indigo-600/20"
                : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span>🏢</span>
            <span>All Companies</span>
          </button>
          {companies.map((c) => {
            const isActive = String(selectedFirm) === String(c.id);
            return (
              <button
                key={c.id}
                onClick={() => setSelectedFirm(String(c.id))}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${isActive
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200 ring-2 ring-indigo-600/20"
                  : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                  }`}
              >
                <span>🏢</span>
                <span>{c.company_name}</span>
              </button>
            );
          })}
        </div>

        {/* Period, Date Range, Supplier, Payment Mode */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period Selector */}
          <div className="relative">
            <button
              onClick={() => setPeriodOpen(!periodOpen)}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-slate-700 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
            >
              <Calendar size={13} className="text-slate-400" />
              <span>
                {period === "all_time"
                  ? "All Time"
                  : period === "custom"
                    ? "Custom Range"
                    : period === "this_month"
                      ? "This Month"
                      : period.replace("_", " ")}
              </span>
              <ChevronDown size={13} className={`text-slate-400 transition-transform ${periodOpen ? "rotate-180" : ""}`} />
            </button>

            {periodOpen && (
              <div className="absolute right-0 mt-1.5 w-40 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95">
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
          <div className="flex items-center gap-1.5 border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 text-xs">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPeriod(e.target.value || toDate ? "custom" : "all_time");
                setCurrentPage(1);
              }}
              className="outline-none text-xs bg-transparent cursor-pointer font-semibold text-slate-700"
            />
            <span className="text-slate-400 font-bold">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPeriod(fromDate || e.target.value ? "custom" : "all_time");
                setCurrentPage(1);
              }}
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
                  ? "All Store"
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
                    selectedFirm === "all" ? "text-purple-600 font-bold bg-purple-50/50" : "text-slate-700"
                  }`}
                >
                  All Store
                </button>
                {companies.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedFirm(String(c.id));
                      setFirmOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-slate-50 transition cursor-pointer ${
                      String(selectedFirm) === String(c.id) ? "text-purple-600 font-bold bg-purple-50/50" : "text-slate-700"
                    }`}
                  >
                    {c.company_name}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Suppliers Dropdown */}
          <div className="relative">
            <button
              onClick={() => setSupplierOpen(!supplierOpen)}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-slate-700 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
            >
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
              <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 max-h-56 overflow-y-auto z-50 animate-in fade-in zoom-in-95">
                <button
                  onClick={() => {
                    setSelectedSupplier("all");
                    setSupplierOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer ${
                    selectedSupplier === "all" ? "text-indigo-600 font-bold bg-indigo-50/50" : "text-slate-700"
                  }`}
                >
                  All Suppliers
                </button>
                {suppliers.map((s) => {
                  const sName = s.supplier_name || s.name || `Supplier #${s.id}`;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedSupplier(String(s.id));
                        setSupplierOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-slate-50 transition cursor-pointer truncate ${
                        String(selectedSupplier) === String(s.id) ? "text-indigo-600 font-bold bg-indigo-50/50" : "text-slate-700"
                      }`}
                    >
                      {sName}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payment Mode / Status Select */}
          <div className="flex items-center border border-slate-200 rounded-xl bg-white">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-transparent outline-none cursor-pointer text-xs font-bold text-slate-700 px-3 py-2"
            >
              <option value="all">All Payment</option>
              <option value="unpaid">Unpaid / Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid / Settled</option>
              <option value="cash">Mode: Cash</option>
              <option value="online">Mode: Online</option>
              <option value="upi">Mode: UPI</option>
              <option value="cheque">Mode: Cheque</option>
            </select>
          </div>

          <button
            onClick={() => window.print()}
            className="w-8 h-8 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition cursor-pointer"
            title="Print List"
          >
            <Printer size={14} />
          </button>
        </div>
      </div>

      {/* ── 4. DIRECTORY TABLE CARD ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Header Filter Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Return No or Supplier Name..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 font-medium transition shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: "all", label: "All Notes" },
              { id: "unpaid", label: "Pending Refund" },
              { id: "partial", label: "Partially Settled" },
              { id: "paid", label: "Settled" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPaymentFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  paymentFilter === tab.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
            <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md ml-1">
              {filteredNotes.length}
            </span>
            <HeaderSettingsButton onClick={openSettings} variant="table" />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-16 text-center">
              <RefreshCw size={26} className="animate-spin text-indigo-500 mx-auto mb-3" />
              <h3 className="font-bold text-sm text-slate-800">Loading Debit Notes</h3>
              <p className="text-xs text-slate-400 mt-1">Fetching supplier returns for the selected period.</p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <FileText size={28} />
              </div>
              <h3 className="font-bold text-sm text-slate-800">No Debit Notes Found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No purchase returns matched your current search and filter settings.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                {isColumnVisible("seq") && <th className="py-3 px-4 text-center w-12">#</th>}
                {isColumnVisible("date") && <th className="py-3 px-4">Date</th>}
                {isColumnVisible("return_no") && <th className="py-3 px-4 text-right">Return No</th>}
                {isColumnVisible("party_name") && <th className="py-3 px-4">Supplier</th>}
                {isColumnVisible("type") && <th className="py-3 px-4">Type</th>}
                {isColumnVisible("total") && <th className="py-3 px-4 text-right">Total (₹)</th>}
                {isColumnVisible("refunded") && <th className="py-3 px-4 text-right">Refunded (₹)</th>}
                {isColumnVisible("balance") && <th className="py-3 px-4 text-right">Balance Due (₹)</th>}
                {isColumnVisible("status") && <th className="py-3 px-4 text-center">Status</th>}
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium">
              {paginatedNotes.map((n, idx) => {
                  const seqNo = (safePage - 1) * rowsPerPage + idx + 1;
                  const total = parseFloat(n.total_amount || 0);
                  const refund = parseFloat(n.refund_amount || 0);
                  const balance = parseFloat(n.balance_amount || 0);

                  return (
                    <tr
                      key={n.id || idx}
                      className="hover:bg-indigo-50/20 transition-colors text-slate-700"
                    >
                      {isColumnVisible("seq") && (
                        <td className="py-3.5 px-4 text-center font-semibold text-slate-400">
                          {seqNo}
                        </td>
                      )}

                      {isColumnVisible("date") && (
                        <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                          {formatDateDMY(n.return_date || n.created_at)}
                        </td>
                      )}

                      {isColumnVisible("return_no") && (
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                            {n.return_no || n.id}
                          </span>
                        </td>
                      )}

                      {isColumnVisible("party_name") && (
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 font-black flex items-center justify-center text-xs shrink-0">
                              {(n.supplier_name || "S").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{n.supplier_name || "Supplier"}</div>
                              <div className="text-[11px] text-slate-400">{n.supplier_phone || ""}</div>
                            </div>
                          </div>
                        </td>
                      )}

                      {isColumnVisible("type") && (
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-black bg-slate-100 text-slate-600 border border-slate-200">
                            Debit Note
                          </span>
                        </td>
                      )}

                      {isColumnVisible("total") && (
                        <td className="py-3.5 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                          ₹{fmt(total)}
                        </td>
                      )}

                      {isColumnVisible("refunded") && (
                        <td className="py-3.5 px-4 text-right font-black text-emerald-600 whitespace-nowrap">
                          ₹{fmt(refund)}
                        </td>
                      )}

                      {isColumnVisible("balance") && (
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-black ${balance <= 0
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                          >
                            ₹{fmt(balance)}
                          </span>
                        </td>
                      )}

                      {isColumnVisible("status") && (
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
                          shareType="Debit Note"
                          onViewInvoice={() => navigate(`/invoice/${n.return_no || n.id}`)}
                          viewInvoiceLabel="View Invoice"
                          menuItems={[
                            {
                              label: "Edit Details",
                              icon: Pencil,
                              onClick: () => navigate(`/purchases/debit-note/edit/${n.id}`),
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
                })}
            </tbody>
            </table>
          )}
        </div>

        {/* ── PAGINATION BAR ── */}
        {filteredNotes.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-100 text-xs text-slate-600 bg-white">
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
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold outline-none cursor-pointer"
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
                disabled={safePage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
              >
                <ChevronLeft size={15} />
              </button>

              <span className="px-3 py-1 bg-indigo-600 text-white font-bold rounded-lg text-xs">
                {safePage}
              </span>

              <button
                disabled={safePage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 5. BOTTOM SUMMARY BAR ── */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between text-xs font-bold">
        <div className="text-slate-700">
          Total Amount:{" "}
          <span className="text-indigo-600 font-extrabold text-sm ml-1">
            ₹{fmt(totals.totalAmt)}
          </span>
        </div>

        <div className="text-slate-700">
          Refunded:{" "}
          <span className="text-emerald-600 font-extrabold text-sm ml-1">
            ₹{fmt(totals.refundAmt)}
          </span>
        </div>

        <div className="text-slate-700">
          Balance:{" "}
          <span className={`font-extrabold text-sm ml-1 ${totals.balanceAmt > 0 ? "text-rose-600" : "text-slate-900"}`}>
            ₹{fmt(totals.balanceAmt)}
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
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={22} className="text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Debit Note?</h3>
                <p className="text-xs text-slate-500 font-mono">Return #{deleteTarget.return_no || deleteTarget.id}</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              Deleting this debit note will revert the supplier ledger adjustment and remove the return voucher permanently.
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
                className="px-5 py-2 text-sm font-bold text-white bg-rose-600 rounded-xl disabled:opacity-50 flex items-center gap-2"
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

      {/* ── 5. TABLE COLUMN CUSTOMIZATION DRAWER ── */}
      <CommonTableColumnSettings
        isOpen={isSettingsOpen}
        onClose={closeSettings}
        columns={tableColumns}
        onToggleColumn={toggleColumn}
        onResetColumns={resetColumns}
        title="Customize Debit Notes Columns"
      />
    </div>
  );
}
