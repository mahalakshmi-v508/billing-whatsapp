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
  Share2,
  Edit,
  Eye,
} from "lucide-react";
import ShareTransactionPopover from "../../../components/ShareTransactionPopover";

export default function DebitNoteList() {
  const navigate = useNavigate();
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  const adminId = user?.role === "cashier" ? user?.admin_id : user?.id;

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

  // Date range
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Search & Actions
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [activeShareId, setActiveShareId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionToast, setActionToast] = useState(null);

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
    setPresetDates("this_month");

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
    <div className="min-h-screen bg-[#f8faff] p-4 sm:p-6 lg:p-8 space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* ── 1. TOP HEADER: Title + Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 select-none">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-100 ring-4 ring-purple-50/50">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Purchase Return / Debit Notes
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manage returned merchandise, supplier debit adjustments, and refund settlements
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate("/purchases/debit-note/add")}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-purple-200 transition-all transform active:scale-95 cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.8} />
            <span>Create Debit Note</span>
          </button>
        </div>
      </div>

      {/* ── 2. METRIC KPI CARDS (PaySplitX 4-Card Strip matching Credit Notes) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Return Value */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Return Value</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
                ₹ {totals.totalAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
              ₹
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>{filteredNotes.length} Total Debit Notes</span>
            <span className="text-[11px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
              Vendor Returns
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
                ₹ {totals.refundAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              Paid
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Cash / Ledger Recovery</span>
            <span className="text-[11px] font-semibold text-emerald-600">
              {totals.totalAmt > 0 ? `${Math.round((totals.refundAmt / totals.totalAmt) * 100)}%` : "0%"} settled
            </span>
          </div>
        </div>

        {/* Card 3: Pending Refund Balance */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Balance</p>
              <h3 className="text-2xl font-black text-amber-600 mt-1 tracking-tight">
                ₹ {totals.balanceAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              Bal
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Supplier debit balance</span>
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
                      period === p.val ? "text-purple-600 font-bold bg-purple-50/50" : "text-slate-700"
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
                    selectedFirm === "all" ? "text-purple-600 font-bold bg-purple-50/50" : "text-slate-700"
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
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer"
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
              <div className="absolute left-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 max-h-56 overflow-y-auto z-50 animate-in fade-in zoom-in-95">
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
                        String(selectedSupplier) === String(s.id) ? "text-purple-600 font-bold bg-purple-50/50" : "text-slate-700"
                      }`}
                    >
                      {sName}
                    </button>
                  );
                })}
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
              <option value="unpaid">Unpaid / Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid / Settled</option>
              <option value="cash">Mode: Cash</option>
              <option value="online">Mode: Online</option>
              <option value="upi">Mode: UPI</option>
              <option value="cheque">Mode: Cheque</option>
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
              placeholder="Search debit notes..."
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
        </div>
      </div>

      {/* ── 4. DIRECTORY TABLE CARD ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-max">
            <thead>
              <tr className="border-b border-slate-200/80 bg-[#fbfcfd] text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                <th className="py-3.5 px-4 text-center w-12">#</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">Return No.</th>
                <th className="py-3.5 px-4">Party Name</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4 text-right">Total</th>
                <th className="py-3.5 px-4 text-right">Refunded</th>
                <th className="py-3.5 px-4 text-right">Balance</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-14 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin text-purple-600 mx-auto mb-2" />
                    <span>Loading Debit Notes...</span>
                  </td>
                </tr>
              ) : filteredNotes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 mb-4 flex items-center justify-center rounded-2xl bg-purple-50 text-purple-400">
                        <FileText size={32} strokeWidth={1.5} />
                      </div>
                      <p className="text-sm font-bold text-slate-700">No debit notes found.</p>
                      <p className="text-xs text-slate-400 mt-1">Create a new debit note to record purchase returns.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedNotes.map((n, idx) => {
                  const seqNo = (safePage - 1) * rowsPerPage + idx + 1;
                  const isMenuOpen = activeMenuId === n.id;
                  const total = parseFloat(n.total_amount || 0);
                  const refund = parseFloat(n.refund_amount || 0);
                  const balance = parseFloat(n.balance_amount || 0);

                  return (
                    <tr
                      key={n.id || idx}
                      className="hover:bg-purple-50/20 transition-colors text-slate-700"
                    >
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-400">
                        {seqNo}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                        {formatDateDMY(n.return_date || n.created_at)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-purple-600 whitespace-nowrap">
                        #{n.return_no || n.id}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{n.supplier_name || "Supplier"}</div>
                        {n.supplier_phone && <div className="text-[10px] text-slate-400 font-normal">{n.supplier_phone}</div>}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                          Debit Note
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                        ₹ {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-emerald-600 whitespace-nowrap">
                        ₹ {refund.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-purple-600 whitespace-nowrap">
                        ₹ {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            balance <= 0
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                              : refund > 0
                              ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                              : "bg-purple-50 text-purple-700 ring-1 ring-purple-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              balance <= 0 ? "bg-emerald-600" : refund > 0 ? "bg-amber-600" : "bg-purple-600"
                            }`}
                          />
                          {balance <= 0 ? "Paid" : refund > 0 ? "Partial" : "Unpaid"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 text-slate-400">
                          {/* Print POS / Preview */}
                          <button
                            onClick={() => navigate(`/invoice/${n.return_no || n.id}`)}
                            className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition cursor-pointer"
                            title="Print / View Invoice"
                          >
                            <Printer size={15} />
                          </button>

                          {/* Share Popover */}
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveShareId(activeShareId === n.id ? null : n.id);
                              }}
                              className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                              title="Share"
                            >
                              <Share2 size={15} />
                            </button>
                            <ShareTransactionPopover
                              isOpen={activeShareId === n.id}
                              onClose={() => setActiveShareId(null)}
                              transaction={n}
                              type="Debit Note"
                            />
                          </div>

                          {/* 3-Dot More Menu */}
                          <div className="relative">
                            <button
                              onClick={() => setActiveMenuId(isMenuOpen ? null : n.id)}
                              className={`w-8 h-8 flex items-center justify-center rounded-lg transition cursor-pointer ${
                                isMenuOpen ? "text-purple-600 bg-purple-50" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                              }`}
                              title="More actions"
                            >
                              <MoreVertical size={15} />
                            </button>

                            {isMenuOpen && (
                              <div
                                ref={menuRef}
                                className="absolute right-0 top-9 w-40 bg-white rounded-2xl shadow-2xl border border-slate-100 py-1.5 z-50 text-left animate-in fade-in zoom-in-95 duration-100"
                              >
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    navigate(`/purchases/debit-note/edit/${n.id}`);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-600 transition text-left cursor-pointer"
                                >
                                  <Edit size={14} className="text-purple-600" />
                                  <span>Edit Details</span>
                                </button>
                                <button
                                  onClick={() => {
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
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    setDeleteTarget(n);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition text-left cursor-pointer"
                                >
                                  <Trash2 size={14} className="text-rose-600" />
                                  <span>Delete Voucher</span>
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
                  <option value={100}>100</option>
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

              <span className="px-3 py-1 bg-purple-600 text-white font-bold rounded-lg text-xs">
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

      {/* ── 5. BOTTOM SUMMARY BAR ── */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between text-xs font-bold">
        <div className="text-slate-700">
          Total Amount:{" "}
          <span className="text-purple-600 font-extrabold text-sm ml-1">
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
    </div>
  );
}
