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
} from "lucide-react";

export default function CreditNoteList() {
  const navigate = useNavigate();
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  const adminId = user?.role === "cashier" ? user?.admin_id : user?.id;

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
  const [activeMenuId, setActiveMenuId] = useState(null);
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
    <div className="p-5 max-w-[1400px] mx-auto min-h-screen space-y-4 font-sans text-slate-800">
      {/* ── 1. TOP FILTER BAR (Matching media_1787843153565.png) ── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        {/* Row 1: Period, Date Range, All Firms, All Users, Excel Report, Print */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Period Selector */}
            <div className="relative">
              <button
                onClick={() => setPeriodOpen(!periodOpen)}
                className="flex items-center gap-2 font-bold text-slate-900 text-sm hover:text-blue-600 transition cursor-pointer"
              >
                <span>{period === "all_time" ? "All Time" : period === "this_month" ? "This Month" : period.replace("_", " ")}</span>
                <ChevronDown size={15} />
              </button>

              {periodOpen && (
                <div className="absolute left-0 mt-1 w-40 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50">
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
                      className={`w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 ${
                        period === p.val ? "text-blue-600 font-bold bg-blue-50/40" : "text-slate-700"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date Range Pill */}
            <div className="flex items-center gap-1.5 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-700 bg-white">
              <span className="text-slate-400 font-medium">Between</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="outline-none text-xs bg-transparent cursor-pointer font-medium"
              />
              <span className="text-slate-400">To</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="outline-none text-xs bg-transparent cursor-pointer font-medium"
              />
            </div>

            {/* ALL FIRMS Dropdown */}
            <div className="relative">
              <button
                onClick={() => setFirmOpen(!firmOpen)}
                className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <span>
                  {selectedFirm === "all"
                    ? "ALL COMPANY"
                    : companies.find((c) => String(c.id) === String(selectedFirm))?.company_name || "FIRM"}
                </span>
                <ChevronDown size={13} />
              </button>

              {firmOpen && (
                <div className="absolute left-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50">
                  <button
                    onClick={() => {
                      setSelectedFirm("all");
                      setFirmOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50"
                  >
                    ALL COMPANY
                  </button>
                  {companies.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedFirm(String(c.id));
                        setFirmOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50"
                    >
                      {c.company_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ALL company Dropdown */}
             <div className="border border-blue-500 ring-1 ring-blue-500/20 rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-slate-800 bg-white font-medium">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-transparent outline-none cursor-pointer text-xs font-semibold"
            >
              <option value="all">All Payment</option>
              <option value="unpaid">Unpaid/ Unused</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid/ Used</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
            
          </div>

          {/* Right Tools: Excel Report & Print */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleExportExcel}
              className="flex flex-col items-center gap-0.5 text-slate-600 hover:text-emerald-700 transition cursor-pointer"
            >
              <FileSpreadsheet size={18} className="text-emerald-600" />
              <span className="text-[10px] font-semibold">Excel Report</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex flex-col items-center gap-0.5 text-slate-600 hover:text-slate-900 transition cursor-pointer"
            >
              <Printer size={18} className="text-slate-600" />
              <span className="text-[10px] font-semibold">Print</span>
            </button>
          </div>
        </div>

       
      </div>

      {/* ── 2. SEARCH & + ADD CREDIT NOTE BAR ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
          />
        </div>

        <button
          onClick={() => navigate("/sales/credit-note/add")}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition cursor-pointer"
        >
          <Plus size={16} />
          <span>Add Credit Note</span>
        </button>
      </div>

      {/* ── 3. TABLE ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60 font-semibold text-slate-600 uppercase text-[10.5px]">
                <th className="py-3 px-3 border-r border-slate-200 w-10 text-center">#</th>
                <th className="py-3 px-3.5 border-r border-slate-200 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span>DATE</span>
                    <Filter size={10} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3.5 border-r border-slate-200 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    <span>REF NO.</span>
                    <Filter size={10} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span>PARTY NAME</span>
                    <Filter size={10} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3.5 border-r border-slate-200 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span>CATEGORY ...</span>
                    <Filter size={10} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3.5 border-r border-slate-200 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span>TYPE</span>
                    <Filter size={10} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 border-r border-slate-200 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    <span>TOTAL</span>
                    <Filter size={10} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 border-r border-slate-200 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    <span>RECEIVE...</span>
                    <Filter size={10} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 border-r border-slate-200 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    <span>BALANCE</span>
                    <Filter size={10} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3.5 border-r border-slate-200 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span>STATUS</span>
                    <Filter size={10} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">PRINT / ...</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-14 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin text-blue-500 mx-auto mb-2" />
                    <span>Loading Credit Notes...</span>
                  </td>
                </tr>
              ) : filteredNotes.length === 0 ? (
                /* ── EMPTY STATE MATCHING media_1787843153565.png ── */
                <tr>
                  <td colSpan={11} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-20 h-20 mb-4 flex items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-slate-300">
                        <FileText size={40} strokeWidth={1.2} />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">No data is available for Credit Note.</p>
                      <p className="text-xs text-slate-400 mt-1">Please try again after making relevant changes.</p>
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
                      className="group hover:bg-[#eaedf2] transition-colors text-slate-700"
                    >
                      <td className="py-3.5 px-3 border-r border-slate-200 text-center font-medium text-slate-500">
                        {seqNo}
                      </td>

                      <td className="py-3.5 px-3.5 border-r border-slate-200 whitespace-nowrap font-medium group-hover:font-bold">
                        {formatDateDMY(n.return_date || n.created_at)}
                      </td>

                      <td className="py-3.5 px-3.5 border-r border-slate-200 text-right font-medium text-slate-800">
                        {n.return_no || n.id}
                      </td>

                      <td className="py-3.5 px-4 border-r border-slate-200 font-medium text-slate-800">
                        {n.customer_name || "Cash Customer"}
                      </td>

                      {/* Category ... */}
                      <td className="py-3.5 px-3.5 border-r border-slate-200 text-slate-400 text-center">
                        -
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-3.5 border-r border-slate-200 text-slate-700 whitespace-nowrap">
                        Credit Note
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 border-r border-slate-200 text-right font-medium text-slate-800 whitespace-nowrap">
                        ₹ {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Received */}
                      <td className="py-3.5 px-4 border-r border-slate-200 text-right font-medium text-slate-800 whitespace-nowrap">
                        ₹ {refund.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Balance */}
                      <td className="py-3.5 px-4 border-r border-slate-200 text-right font-medium text-slate-800 whitespace-nowrap">
                        ₹ {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3.5 border-r border-slate-200 whitespace-nowrap font-medium">
                        {balance <= 0 ? (
                          <span className="text-emerald-600 font-semibold">Paid</span>
                        ) : refund > 0 ? (
                          <span className="text-amber-600 font-semibold">Partial</span>
                        ) : (
                          <span className="text-blue-600 font-semibold">Unpaid</span>
                        )}
                      </td>

                      {/* Actions: Print, Edit, Delete, Share */}
                      <td className="py-3.5 px-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2.5 text-slate-400">
                          {/* Print */}
                          <button
                            onClick={() => window.print()}
                            className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition cursor-pointer"
                            title="Print"
                          >
                            <Printer size={15} />
                          </button>

                          {/* Edit Icon */}
                          <button
                            onClick={() => navigate(`/sales/credit-note/edit/${n.id}`)}
                            className="p-1 rounded hover:bg-blue-50 text-blue-600 hover:text-blue-800 transition cursor-pointer"
                            title="Edit Credit Note"
                          >
                            <Pencil size={15} />
                          </button>

                          {/* Delete Icon */}
                          <button
                            onClick={() => setDeleteTarget(n)}
                            className="p-1 rounded hover:bg-red-50 text-red-500 hover:text-red-700 transition cursor-pointer"
                            title="Delete Credit Note"
                          >
                            <Trash2 size={15} />
                          </button>

                          {/* Share */}
                          <button
                            onClick={() => {}}
                            className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition cursor-pointer"
                            title="Share"
                          >
                            <Share2 size={15} />
                          </button>
                        </div>
                      </td>
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
    </div>
  );
}
