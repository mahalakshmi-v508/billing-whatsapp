import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import * as XLSX from "xlsx";
import {
  Plus,
  Settings,
  ChevronDown,
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
} from "lucide-react";

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

  // Filter states
  const [period, setPeriod] = useState("this_month");
  const [periodOpen, setPeriodOpen] = useState(false);
  const [selectedFirm, setSelectedFirm] = useState("all");
  const [firmOpen, setFirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState("all");
  const [userOpen, setUserOpen] = useState(false);

  // Date range
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Search & view toggles
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Delete modal & action toast
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionToast, setActionToast] = useState(null);

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

  // Convert Date object to YYYY-MM-DD for backend
  const formatYMD = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Compute period dates
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
      case "this_week":
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
        start = new Date(now.setDate(diff));
        end = new Date();
        break;
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

  // Fetch Companies & Cashiers
  useEffect(() => {
    if (!adminId) return;

    api.get(`/company/get_companies_by_admin?admin_id=${adminId}`)
      .then((res) => {
        if (res.data.status) setCompanies(res.data.data);
      })
      .catch(console.error);

    api.post("/cashier/get_cashiers", { company_id: user?.company_id || "" })
      .then((res) => {
        if (res.data.status) setCashiers(res.data.data);
      })
      .catch(console.error);
  }, [adminId, user?.company_id]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Invoices
  const fetchInvoices = async () => {
    if (!adminId) return;
    setLoading(true);
    try {
      let companyIds = [];
      if (selectedFirm === "all") {
        companyIds = companies.map((c) => c.id);
      } else {
        companyIds = [Number(selectedFirm)];
      }

      if (companyIds.length === 0 && companies.length > 0) {
        companyIds = companies.map((c) => c.id);
      }

      let allRows = [];
      if (companyIds.length > 0) {
        const requests = companyIds.map((cid) =>
          api.get("/invoice/get_filtered_invoices", {
            params: {
              company_id: cid,
              from_date: fromDate,
              to_date: toDate,
              payment_method: "all",
              payment_status: "all",
              customer_name: "",
              brand_id: 0,
            },
          })
        );
        const responses = await Promise.all(requests);
        responses.forEach((res) => {
          if (res.data.status) {
            allRows = [...allRows, ...res.data.data];
          }
        });
      } else {
        // Fallback directly to get_invoices
        const res = await api.get("/invoice/get_invoices");
        if (res.data.status) {
          allRows = res.data.data;
        }
      }

      setInvoices(allRows);
    } catch (err) {
      console.error("Failed to load invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [adminId, companies, selectedFirm, fromDate, toDate]);

  // Filtered Invoices (Search + User)
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // User filter
      if (selectedUser !== "all") {
        if (String(inv.created_by || inv.cashier_id) !== String(selectedUser)) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const invoiceNo = String(inv.invoice_no || "").toLowerCase();
        const partyName = String(inv.customer_name || "Cash Sale").toLowerCase();
        const paymentMethod = String(inv.payment_method || "").toLowerCase();
        const amount = String(inv.total_amount || "");
        if (!invoiceNo.includes(q) && !partyName.includes(q) && !paymentMethod.includes(q) && !amount.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [invoices, selectedUser, searchQuery]);

  // Summary Metrics
  const summary = useMemo(() => {
    let total_amount = 0;
    let total_paid = 0;
    let total_pending = 0;

    filteredInvoices.forEach((inv) => {
      total_amount += Number(inv.total_amount || 0);
      total_paid += Number(inv.paid_amount || 0);
      total_pending += Number(inv.balance_amount || 0);
    });

    return { total_amount, total_paid, total_pending };
  }, [filteredInvoices]);

  // Delete Invoice Handler with Stock Rollback
  const handleDeleteInvoice = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await api.post("/invoice/delete_invoice", {
        invoice_no: deleteTarget.invoice_no,
        id: deleteTarget.id,
      });
      if (res.data.status) {
        setInvoices((prev) => prev.filter((inv) => inv.invoice_no !== deleteTarget.invoice_no));
        setActionToast({ msg: "Invoice deleted and stock restored successfully.", ok: true });
        setDeleteTarget(null);
        setTimeout(() => setActionToast(null), 3500);
      } else {
        setActionToast({ msg: res.data.message || "Failed to delete invoice.", ok: false });
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
      Balance: Number(inv.balance_amount || 0),
      Status: Number(inv.balance_amount || 0) === 0 ? "Paid" : "Unpaid",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sale Invoices");
    XLSX.writeFile(wb, `Sale_Invoices_${fromDate || "all"}_to_${toDate || "all"}.xlsx`);
  };

  // Print Table directly
  const handlePrintTable = () => {
    window.print();
  };

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

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* ── 1. TOP HEADER ROW: Title + Add Sale + Settings ── */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200/80">
        {/* Title with dropdown indicator */}
        <div className="flex items-center gap-2 cursor-pointer group select-none">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Sale Invoices</h1>
          <ChevronDown size={18} className="text-slate-500 group-hover:text-slate-800 transition" />
        </div>

        {/* Right Buttons: Add Sale + Settings */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/sales/add")}
            className="flex items-center gap-1.5 px-5 py-2 bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold text-sm rounded-full shadow-sm hover:shadow transition transform active:scale-95 cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.8} />
            <span>Add Sale</span>
          </button>

          <button
            onClick={() => navigate("/credit-settings")}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
            title="Invoice Settings"
          >
            <Settings size={19} />
          </button>
        </div>
      </div>

      {/* ── 2. FILTER ROW: Period, Date Range, Firms, Users ── */}
      <div className="flex flex-wrap items-center gap-2.5 py-4 text-xs">
        <span className="font-semibold text-slate-500 mr-1">Filter by :</span>

        {/* Period Pill Dropdown */}
        <div className="relative">
          <button
            onClick={() => setPeriodOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-50/80 hover:bg-sky-100/70 text-slate-700 font-semibold rounded-full border border-sky-100 transition cursor-pointer"
          >
            <span>{periodLabels[period] || "This Month"}</span>
            <ChevronDown size={14} className={`text-slate-500 transition-transform ${periodOpen ? "rotate-180" : ""}`} />
          </button>

          {periodOpen && (
            <div className="absolute left-0 top-9 w-36 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
              {Object.entries(periodLabels).map(([key, label]) => (
                <div
                  key={key}
                  onClick={() => {
                    setPeriod(key);
                    setPeriodOpen(false);
                    if (key === "custom") setShowDatePicker(true);
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
            {fromDate ? formatDateDMY(fromDate) : "01/08/2026"} To {toDate ? formatDateDMY(toDate) : "31/08/2026"}
          </span>
        </div>

        {/* Custom Date Picker popover */}
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
          </div>
        )}

        {/* Firms Dropdown Pill */}
        <div className="relative">
          <button
            onClick={() => setFirmOpen((v) => !v)}
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
            <div className="absolute left-0 top-9 w-44 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
              <div
                onClick={() => { setSelectedFirm("all"); setFirmOpen(false); }}
                className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition ${
                  selectedFirm === "all" ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                All Firms
              </div>
              {companies.map((c) => (
                <div
                  key={c.id}
                  onClick={() => { setSelectedFirm(c.id); setFirmOpen(false); }}
                  className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition truncate ${
                    String(selectedFirm) === String(c.id)
                      ? "bg-blue-50 text-blue-600 font-bold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {c.company_name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Users Dropdown Pill */}
        <div className="relative">
          <button
            onClick={() => setUserOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-50/80 hover:bg-sky-100/70 text-slate-700 font-semibold rounded-full border border-sky-100 transition cursor-pointer"
          >
            <span>
              {selectedUser === "all"
                ? "All Users"
                : cashiers.find((u) => String(u.id) === String(selectedUser))?.name || "User"}
            </span>
            <ChevronDown size={14} className={`text-slate-500 transition-transform ${userOpen ? "rotate-180" : ""}`} />
          </button>

          {userOpen && (
            <div className="absolute left-0 top-9 w-40 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
              <div
                onClick={() => { setSelectedUser("all"); setUserOpen(false); }}
                className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition ${
                  selectedUser === "all" ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                All Users
              </div>
              {cashiers.map((u) => (
                <div
                  key={u.id}
                  onClick={() => { setSelectedUser(u.id); setUserOpen(false); }}
                  className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition truncate ${
                    String(selectedUser) === String(u.id)
                      ? "bg-blue-50 text-blue-600 font-bold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {u.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Refresh button */}
        <button
          onClick={fetchInvoices}
          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-full transition cursor-pointer ml-auto"
          title="Refresh Invoices"
        >
          <RefreshCw size={15} className={loading ? "animate-spin text-blue-600" : ""} />
        </button>
      </div>

      {/* ── 3. SUMMARY KPI CARD ── */}
      <div className="my-2">
        <div className="bg-white border border-purple-200/90 rounded-2xl p-4 w-72 sm:w-80 shadow-2xs">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Sales Amount</span>
            <div className="flex flex-col items-end">
              <span className="inline-flex items-center text-[11px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                100% ↗
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">vs last month</span>
            </div>
          </div>

          <div className="text-2xl font-black text-slate-900 my-1 tracking-tight">
            ₹ {summary.total_amount.toLocaleString("en-IN")}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100 mt-2">
            <span>
              Received: <strong className="text-slate-800 font-bold">₹ {summary.total_paid.toLocaleString("en-IN")}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              Balance: <strong className="text-slate-800 font-bold">₹ {summary.total_pending.toLocaleString("en-IN")}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* ── 4. TRANSACTIONS SECTION: Header + Action Icons + Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs mt-6 overflow-hidden">
        
        {/* Transactions Section Top Row */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">Transactions</h2>

          {/* Action Icons: Search, Analytics, Excel, Print */}
          <div className="flex items-center gap-2">
            
            {/* Inline Search Bar Toggle */}
            {showSearchInput ? (
              <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full text-xs animate-in fade-in duration-150">
                <Search size={13} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Search invoice, customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="bg-transparent text-xs text-slate-700 outline-none w-44"
                />
                <button
                  onClick={() => { setShowSearchInput(false); setSearchQuery(""); }}
                  className="text-slate-400 hover:text-slate-600 ml-1 text-xs"
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

            {/* Analytics / Chart Icon */}
            <button
              onClick={() => navigate("/dashboard")}
              className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              title="Sales Analytics"
            >
              <BarChart2 size={17} />
            </button>

            {/* Excel (.xls/.xlsx) Badge Export Button */}
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
              onClick={handlePrintTable}
              className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              title="Print Table"
            >
              <Printer size={17} />
            </button>
          </div>
        </div>

        {/* Transactions Table with Vertical Grid Lines */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold select-none">
                <th className="py-3 px-3.5 border-r border-slate-200 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span>Date</span>
                    <Filter size={11} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3.5 border-r border-slate-200 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span>Invoice No</span>
                    <Filter size={11} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span>Party Name</span>
                    <Filter size={11} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3.5 border-r border-slate-200 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span>Transaction</span>
                    <Filter size={11} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3.5 border-r border-slate-200 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span>Payment Type</span>
                    <Filter size={11} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 border-r border-slate-200 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Amount</span>
                    <Filter size={11} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 border-r border-slate-200 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Balance</span>
                    <Filter size={11} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3.5 border-r border-slate-200 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span>Status</span>
                    <Filter size={11} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin text-blue-500 mx-auto mb-2" />
                    <span>Loading Sale Invoices...</span>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-500">No sale invoices found for this period.</p>
                    <p className="text-xs text-slate-400 mt-1">Click &quot;+ Add Sale&quot; to create a new sale invoice.</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv, idx) => {
                  const isPaid = Number(inv.balance_amount || 0) === 0;
                  const isUnpaid = Number(inv.paid_amount || 0) === 0;
                  const isPos = inv.is_pos || inv.source === "pos" || String(inv.payment_method).toLowerCase() === "cash" && !inv.customer_id;
                  const isMenuOpen = activeMenuId === inv.invoice_no;

                  return (
                    <tr
                      key={inv.invoice_no || idx}
                      className="group hover:bg-[#eaedf2] transition-colors duration-150 text-slate-700 cursor-pointer"
                      onClick={() => navigate(`/invoice/${inv.invoice_no}`)}
                    >
                      {/* Date */}
                      <td className="py-3.5 px-3.5 border-r border-slate-200 font-medium group-hover:font-bold text-slate-600 group-hover:text-slate-900 whitespace-nowrap">
                        {formatDateDMY(inv.created_at)}
                      </td>

                      {/* Invoice No */}
                      <td className="py-3.5 px-3.5 border-r border-slate-200 font-medium group-hover:font-bold text-slate-800 group-hover:text-slate-950 text-right whitespace-nowrap">
                        {inv.invoice_no}
                      </td>

                      {/* Party Name */}
                      <td className="py-3.5 px-4 border-r border-slate-200 font-medium group-hover:font-bold text-slate-800 group-hover:text-slate-950 whitespace-nowrap">
                        {inv.customer_name || "Cash Sale"}
                      </td>

                      {/* Transaction */}
                      <td className="py-3.5 px-3.5 border-r border-slate-200 text-slate-600 group-hover:text-slate-900 font-medium group-hover:font-bold whitespace-nowrap">
                        {isPos ? "PoS Sale" : "Sale"}
                      </td>

                      {/* Payment Type */}
                      <td className="py-3.5 px-3.5 border-r border-slate-200 capitalize text-slate-600 group-hover:text-slate-900 font-medium group-hover:font-bold whitespace-nowrap">
                        {inv.payment_method || "Cash"}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 border-r border-slate-200 text-right font-bold text-slate-800 group-hover:text-slate-950 whitespace-nowrap">
                        ₹ {Number(inv.total_amount || 0).toLocaleString("en-IN")}
                      </td>

                      {/* Balance */}
                      <td className="py-3.5 px-4 border-r border-slate-200 text-right font-medium group-hover:font-bold text-slate-600 group-hover:text-slate-950 whitespace-nowrap">
                        ₹ {Number(inv.balance_amount || 0).toLocaleString("en-IN")}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3.5 border-r border-slate-200 whitespace-nowrap">
                        {isPaid ? (
                          <span className="font-bold text-[#10b981]">Paid</span>
                        ) : isUnpaid ? (
                          <span className="font-bold text-[#ef4444]">Unpaid</span>
                        ) : (
                          <span className="font-bold text-[#f59e0b]">Partial</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          
                          {/* Print Icon Button */}
                          <button
                            onClick={() => navigate(`/invoice/${inv.invoice_no}`)}
                            className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition cursor-pointer"
                            title="Print Invoice"
                          >
                            <Printer size={15} />
                          </button>

                          {/* Share Icon Button */}
                          <button
                            onClick={() => navigate(`/invoice/${inv.invoice_no}`)}
                            className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition cursor-pointer"
                            title="Share Invoice"
                          >
                            <Share2 size={15} />
                          </button>

                          {/* 3-Dot More Menu */}
                          <div className="relative">
                            <button
                              onClick={() => setActiveMenuId(isMenuOpen ? null : inv.invoice_no)}
                              className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition cursor-pointer"
                              title="More actions"
                            >
                              <MoreVertical size={15} />
                            </button>

                            {isMenuOpen && (
                              <div
                                ref={menuRef}
                                className="absolute right-0 top-8 w-38 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 text-left animate-in fade-in zoom-in-95 duration-100"
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(null);
                                    navigate(`/sales/edit/${inv.invoice_no}`);
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
                                    navigate(`/invoice/${inv.invoice_no}`);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition text-left cursor-pointer"
                                >
                                  <Eye size={14} />
                                  <span>View Invoice</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(null);
                                    navigate(`/invoice/${inv.invoice_no}`);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 transition text-left cursor-pointer"
                                >
                                  <Printer size={14} className="text-emerald-600" />
                                  <span>Print POS</span>
                                </button>
                                <div className="border-t border-slate-100 my-1" />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(null);
                                    setDeleteTarget(inv);
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
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={22} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Invoice?</h3>
                <p className="text-xs text-slate-500 font-mono">Invoice #{deleteTarget.invoice_no}</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Are you sure you want to permanently delete this invoice?
              <br />
              <span className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1.5 mt-2 inline-block font-medium border border-amber-200">
                ⚠️ Inventory stock for products in this invoice will be automatically restored.
              </span>
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteInvoice}
                className="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md shadow-red-500/20 transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {deleting && <RefreshCw size={14} className="animate-spin" />}
                <span>{deleting ? "Deleting..." : "Yes, Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ACTION FLOATING TOAST NOTIFICATION ── */}
      {actionToast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 28,
            zIndex: 99999,
            minWidth: 320,
            maxWidth: 420,
            background: actionToast.ok ? "#10b981" : "#ef4444",
            color: "#ffffff",
            borderRadius: 6,
            padding: "12px 16px",
            boxShadow: actionToast.ok
              ? "0 6px 20px rgba(16, 185, 129, 0.4)"
              : "0 6px 20px rgba(239, 68, 68, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            animation: "fadeIn 0.2s ease",
          }}
        >
          <span style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.35, color: "#ffffff" }}>
            {actionToast.msg}
          </span>
          <button
            onClick={() => setActionToast(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "#ffffff",
              cursor: "pointer",
              padding: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>
      )}

    </div>
  );
}
