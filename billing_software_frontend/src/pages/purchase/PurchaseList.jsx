import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import {
  FileSpreadsheet,
  Printer,
  Search,
  Plus,
  MoreVertical,
  Share2,
  Eye,
  Trash2,
  CreditCard,
  History,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  RefreshCw,
  TrendingUp,
  Clock,
  Building2,
  SlidersHorizontal,
  CheckCircle2,
  Receipt,
  ArrowUpRight
} from "lucide-react";
import * as XLSX from "xlsx";

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

export default function PurchaseList() {
  const navigate = useNavigate();

  // Data States
  const [purchases, setPurchases] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(
    localStorage.getItem("selected_company_id") || ""
  );
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [period, setPeriod] = useState("this_month");
  const [periodOpen, setPeriodOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedFirm, setSelectedFirm] = useState("all");
  const [firmOpen, setFirmOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // Modals
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentPurchase, setPaymentPurchase] = useState(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState("cash");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payNotes, setPayNotes] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistorySupplier, setSelectedHistorySupplier] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Date Formatting Helper
  const formatYMD = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatDateDMY = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
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
      case "this_week": {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
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
      setStartDate(formatYMD(start));
      setEndDate(formatYMD(end));
    } else {
      setStartDate("");
      setEndDate("");
    }
  }, [period]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutside = () => {
      setActiveMenuId(null);
      setPeriodOpen(false);
      setFirmOpen(false);
    };
    window.addEventListener("click", handleOutside);
    return () => window.removeEventListener("click", handleOutside);
  }, []);

  // Initial Companies Load
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.id) return;

    api.get(`/company/get_companies_by_admin?admin_id=${user.id}`)
      .then((res) => {
        if (res.data.status) {
          setCompanies(res.data.data);
          const savedId = localStorage.getItem("selected_company_id");
          if (savedId) {
            setSelectedCompany(savedId);
            setSelectedFirm(savedId);
            fetchPurchasesAndSuppliers(savedId);
          } else if (res.data.data.length > 0) {
            setSelectedFirm("all");
            fetchPurchasesAndSuppliers("all", res.data.data);
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  // Fetch Purchases (supports 'all' companies or specific company)
  const fetchPurchasesAndSuppliers = async (firmId = selectedFirm, companyList = companies) => {
    setLoading(true);
    try {
      let companyIds = [];
      if (firmId === "all" || firmId === "ALL") {
        companyIds = (companyList.length > 0 ? companyList : companies).map((c) => c.id);
      } else {
        companyIds = [Number(firmId)];
      }

      if (companyIds.length === 0 && (companyList.length > 0 || companies.length > 0)) {
        companyIds = (companyList.length > 0 ? companyList : companies).map((c) => c.id);
      }

      if (companyIds.length > 0) {
        const purchaseRequests = companyIds.map((cid) =>
          api.get(`/purchase/get_purchases?company_id=${cid}`)
        );
        const supplierRequests = companyIds.map((cid) =>
          api.get(`/supplier/get_all?company_id=${cid}`)
        );

        const [pResponses, sResponses] = await Promise.all([
          Promise.all(purchaseRequests),
          Promise.all(supplierRequests)
        ]);

        let allPurchases = [];
        pResponses.forEach((res) => {
          if (res.data.status && Array.isArray(res.data.data)) {
            allPurchases = [...allPurchases, ...res.data.data];
          }
        });

        let allSuppliers = [];
        sResponses.forEach((res) => {
          if (res.data.status && Array.isArray(res.data.data)) {
            allSuppliers = [...allSuppliers, ...res.data.data];
          }
        });

        // Deduplicate
        const uniquePurchases = Array.from(new Map(allPurchases.map((p) => [p.id, p])).values());
        uniquePurchases.sort(
          (a, b) => new Date(b.purchase_date || b.created_at) - new Date(a.purchase_date || a.created_at)
        );

        const uniqueSuppliers = Array.from(new Map(allSuppliers.map((s) => [s.id, s])).values());

        setPurchases(uniquePurchases);
        setSuppliers(uniqueSuppliers);
      } else {
        setPurchases([]);
        setSuppliers([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFirmChange = (firmId) => {
    setSelectedFirm(firmId);
    if (firmId !== "all" && firmId !== "ALL") {
      setSelectedCompany(firmId);
      localStorage.setItem("selected_company_id", firmId);
    }
    fetchPurchasesAndSuppliers(firmId);
  };

  // Filtered Purchases by Date & Search
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      // Date filter
      if (startDate && p.purchase_date < startDate) return false;
      if (endDate && p.purchase_date > endDate) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const no = (p.purchase_no || "").toLowerCase();
        const party = (p.supplier_name || "").toLowerCase();
        const type = (p.payment_type || "").toLowerCase();
        if (!no.includes(q) && !party.includes(q) && !type.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [purchases, startDate, endDate, searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, searchQuery, selectedFirm, period]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredPurchases.length / rowsPerPage) || 1;
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedPurchases = useMemo(() => {
    const start = (safePage - 1) * rowsPerPage;
    return filteredPurchases.slice(start, start + rowsPerPage);
  }, [filteredPurchases, safePage, rowsPerPage]);

  // Math summary bar metrics
  const { totalPaid, totalUnpaid, grandTotal, settleRate } = useMemo(() => {
    let paid = 0;
    let unpaid = 0;
    let total = 0;
    filteredPurchases.forEach((p) => {
      const pTotal = Number(p.total_amount) || 0;
      const pPaid = Number(p.paid_amount) || 0;
      const pBal = Number(p.balance_amount) || 0;
      paid += pPaid;
      unpaid += pBal;
      total += pTotal;
    });
    const rate = total > 0 ? Math.round((paid / total) * 100) : 100;
    return { totalPaid: paid, totalUnpaid: unpaid, grandTotal: total, settleRate: rate };
  }, [filteredPurchases]);

  // Delete draft
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this purchase draft?")) return;
    try {
      const res = await api.post(`/purchase/delete_purchase`, { id });
      if (res.data.status) {
        alert("Purchase draft deleted successfully");
        fetchPurchasesAndSuppliers(selectedFirm);
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting purchase");
    }
  };

  // Payment dialog
  const openPayModal = (purchase) => {
    setPaymentPurchase(purchase);
    setPayAmount(Number(purchase.balance_amount));
    setPayMethod("cash");
    setPayDate(new Date().toISOString().split("T")[0]);
    setPayNotes("");
    setShowPayModal(true);
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    if (payAmount <= 0) {
      alert("Please enter a valid amount!");
      return;
    }
    if (payAmount > Number(paymentPurchase.balance_amount)) {
      alert(`Payment amount cannot exceed pending balance of ₹${paymentPurchase.balance_amount}`);
      return;
    }
    setSubmittingPayment(true);
    try {
      const res = await api.post("/purchase/pay_purchase", {
        purchase_id: paymentPurchase.id,
        amount: payAmount,
        payment_method: payMethod,
        payment_date: payDate,
        notes: payNotes
      });
      if (res.data.status) {
        alert(res.data.message);
        setShowPayModal(false);
        fetchPurchasesAndSuppliers(selectedFirm);
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Error recording payment");
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Supplier History Ledger Modal
  const openSupplierHistoryModal = async (supplierId, supplierName) => {
    setSelectedHistorySupplier({ id: supplierId, name: supplierName });
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/purchase/get_supplier_payments?supplier_id=${supplierId}`);
      if (res.data.status) {
        setPaymentHistory(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Helper number format
  const fmt = (n) =>
    Number(n || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });

  // Excel Export
  const exportToExcel = () => {
    if (filteredPurchases.length === 0) {
      alert("No data to export");
      return;
    }

    const data = filteredPurchases.map((p, idx) => ({
      "Sl No": idx + 1,
      "Date": formatDateDMY(p.purchase_date),
      "Invoice No": p.purchase_no || "N/A",
      "Party Name": p.supplier_name || "Unknown",
      "Payment Type": p.payment_type || "Cash",
      "Sub Total (₹)": Number(p.sub_total || 0),
      "GST Total (₹)": Number(p.gst_total || 0),
      "Total Amount (₹)": Number(p.total_amount || 0),
      "Paid Amount (₹)": Number(p.paid_amount || 0),
      "Balance Due (₹)": Number(p.balance_amount || 0),
      "Status": Number(p.balance_amount) <= 0 ? "Paid" : Number(p.paid_amount) > 0 ? "Partial" : "Unpaid"
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Purchase Bills");
    XLSX.writeFile(workbook, `Purchase_Bills_${startDate || "All"}_${endDate || "All"}.xlsx`);
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1520px] mx-auto min-h-screen space-y-5 bg-[#f8fafc] font-sans text-slate-800">
      
      {/* ── 1. EXECUTIVE COMMAND HEADER ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-rose-400 text-white flex items-center justify-center shadow-md shadow-rose-500/20 shrink-0">
            <Receipt size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Purchase Invoices</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {filteredPurchases.length} bills
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Vendor procurement registry, bill payment settlements and invoice tracking
            </p>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => fetchPurchasesAndSuppliers(selectedFirm)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
            title="Refresh Data"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-blue-600" : "text-slate-500"} />
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
            onClick={() => navigate("/purchases/new")}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-500/25 transition active:scale-95 cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.8} />
            <span>+ Add Purchase</span>
          </button>
        </div>
      </div>

      {/* ── 2. SEGMENTED FINANCIAL INTELLIGENCE STRIP ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Metric 1: Total Purchases */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Total Purchases
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1.5 tracking-tight">
                ₹ {fmt(grandTotal)}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Procurement Volume</span>
            <span className="font-bold text-slate-800">{filteredPurchases.length} Invoices</span>
          </div>
        </div>

        {/* Metric 2: Settled & Paid */}
        <div className="bg-white rounded-2xl border border-emerald-200/80 p-4 shadow-xs relative overflow-hidden flex flex-col justify-between bg-gradient-to-br from-white to-emerald-50/20">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Settled / Paid
              </span>
              <div className="text-2xl font-black text-emerald-900 mt-1.5 tracking-tight">
                ₹ {fmt(totalPaid)}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-emerald-100">
            <div className="flex items-center justify-between text-xs font-semibold mb-1">
              <span className="text-emerald-700">Settlement Ratio</span>
              <span className="text-emerald-800 font-bold">{settleRate}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-emerald-100 overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(settleRate, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Metric 3: Outstanding Balance Due */}
        <div className="bg-white rounded-2xl border border-rose-200/80 p-4 shadow-xs relative overflow-hidden flex flex-col justify-between bg-gradient-to-br from-white to-rose-50/20">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Outstanding Balance Due
              </span>
              <div className="text-2xl font-black text-rose-900 mt-1.5 tracking-tight">
                ₹ {fmt(totalUnpaid)}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-100/70 text-rose-700 flex items-center justify-center">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-rose-100 flex items-center justify-between text-xs">
            <span className="text-rose-700 font-medium">Pending Vendor Payables</span>
            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px]">
              {totalUnpaid > 0 ? "Requires Action" : "All Clear"}
            </span>
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
                      period === key ? "bg-rose-50 text-rose-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{label}</span>
                    {period === key && <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />}
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
              {startDate ? formatDateDMY(startDate) : "01/09/2026"} - {endDate ? formatDateDMY(endDate) : "30/09/2026"}
            </span>
          </button>

          {/* Date Picker Range Popover */}
          {showDatePicker && (
            <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-xl border border-rose-300 shadow-sm">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPeriod("custom");
                }}
                className="text-xs text-slate-700 outline-none bg-transparent cursor-pointer font-medium"
              />
              <span className="text-slate-400 text-xs font-bold">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
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
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer"
            >
              <Building2 size={13} className="text-slate-500" />
              <span>
                {selectedFirm === "all" || selectedFirm === "ALL"
                  ? "All Firms"
                  : companies.find((c) => String(c.id) === String(selectedFirm))?.company_name || "Firm"}
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
                    handleFirmChange("all");
                    setFirmOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer flex items-center justify-between ${
                    selectedFirm === "all" || selectedFirm === "ALL" ? "bg-rose-50 text-rose-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>All Firms</span>
                  {(selectedFirm === "all" || selectedFirm === "ALL") && <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />}
                </button>
                {companies.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      handleFirmChange(c.id);
                      setFirmOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer truncate ${
                      String(selectedFirm) === String(c.id) ? "bg-rose-50 text-rose-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {c.company_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Global Search Input */}
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice no, supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
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
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Invoice Register</h2>
            <span className="text-[11px] font-bold text-slate-400">({filteredPurchases.length} records)</span>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-500 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 border-r border-slate-200/70 whitespace-nowrap">Date</th>
                <th className="py-3 px-4 border-r border-slate-200/70 whitespace-nowrap">Invoice #</th>
                <th className="py-3 px-5 border-r border-slate-200/70 whitespace-nowrap">Supplier / Party</th>
                <th className="py-3 px-4 border-r border-slate-200/70 whitespace-nowrap">Payment Mode</th>
                <th className="py-3 px-5 border-r border-slate-200/70 text-right whitespace-nowrap">Bill Amount</th>
                <th className="py-3 px-5 border-r border-slate-200/70 text-right whitespace-nowrap">Balance Due</th>
                <th className="py-3 px-4 border-r border-slate-200/70 text-center whitespace-nowrap">Settlement Status</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin text-rose-500 mx-auto mb-2.5" />
                    <span className="font-bold text-slate-600">Loading procurement vouchers...</span>
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                      <FileText size={24} />
                    </div>
                    <p className="font-extrabold text-slate-700 text-sm">No Purchase Bills Found</p>
                    <p className="text-xs text-slate-400 mt-1">There are no purchase vouchers matching your active filter criteria.</p>
                    <button
                      onClick={() => navigate("/purchases/new")}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer transition active:scale-95"
                    >
                      <Plus size={14} /> Create Purchase Bill
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedPurchases.map((p, idx) => {
                  const balance = Number(p.balance_amount) || 0;
                  const paid = Number(p.paid_amount) || 0;
                  const isPaid = balance <= 0;
                  const isPartial = balance > 0 && paid > 0;
                  const isDraft = p.status === "draft";
                  const isMenuOpen = activeMenuId === p.id;

                  return (
                    <tr
                      key={p.id || idx}
                      className="group hover:bg-rose-50/30 transition-colors duration-150 text-slate-700"
                    >
                      {/* DATE */}
                      <td className="py-3.5 px-4 border-r border-slate-200/70 whitespace-nowrap text-slate-600 group-hover:text-slate-900 font-semibold">
                        {formatDateDMY(p.purchase_date)}
                      </td>

                      {/* INVOICE NO */}
                      <td className="py-3.5 px-4 border-r border-slate-200/70 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {p.purchase_no ? `#${p.purchase_no}` : `-`}
                        </span>
                      </td>

                      {/* PARTY NAME */}
                      <td className="py-3.5 px-5 border-r border-slate-200/70 whitespace-nowrap">
                        <div
                          onClick={() => openSupplierHistoryModal(p.supplier_id, p.supplier_name)}
                          className="font-bold text-slate-900 hover:text-rose-600 transition cursor-pointer flex items-center gap-1.5"
                          title="Click to view supplier ledger history"
                        >
                          <span>{p.supplier_name || "Unknown Party"}</span>
                          <ArrowUpRight size={13} className="text-slate-400 group-hover:text-rose-500 opacity-0 group-hover:opacity-100 transition" />
                        </div>
                      </td>

                      {/* PAYMENT TYPE */}
                      <td className="py-3.5 px-4 border-r border-slate-200/70 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200 uppercase">
                          {p.payment_type || "Cash"}
                        </span>
                      </td>

                      {/* AMOUNT */}
                      <td className="py-3.5 px-5 border-r border-slate-200/70 font-extrabold text-slate-900 text-right whitespace-nowrap">
                        ₹ {fmt(p.total_amount)}
                      </td>

                      {/* BALANCE DUE */}
                      <td className={`py-3.5 px-5 border-r border-slate-200/70 font-bold text-right whitespace-nowrap ${
                        balance > 0 ? "text-rose-600" : "text-emerald-700"
                      }`}>
                        ₹ {fmt(balance)}
                      </td>

                      {/* STATUS */}
                      <td className="py-3.5 px-4 border-r border-slate-200/70 text-center whitespace-nowrap font-bold">
                        {isDraft ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            Draft
                          </span>
                        ) : isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Paid
                          </span>
                        ) : isPartial ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Partial
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Unpaid
                          </span>
                        )}
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

                          {/* Share Icon */}
                          <button
                            onClick={() => alert(`Share Voucher for Invoice ${p.purchase_no || p.id} via WhatsApp/PDF`)}
                            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Share via WhatsApp"
                          >
                            <Share2 size={14} />
                          </button>

                          {/* 3-Dots More Menu */}
                          <div className="relative">
                            <button
                              onClick={() => setActiveMenuId(isMenuOpen ? null : p.id)}
                              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                              title="More actions"
                            >
                              <MoreVertical size={15} />
                            </button>

                            {isMenuOpen && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 text-left animate-in fade-in zoom-in-95 duration-100"
                              >
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    navigate(`/purchases/edit/${p.id}`);
                                  }}
                                  className="w-full px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <Eye size={14} className="text-blue-600" />
                                  <span>View / Edit</span>
                                </button>

                                {p.status === "submitted" && Number(p.balance_amount) > 0 && (
                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      openPayModal(p);
                                    }}
                                    className="w-full px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <CreditCard size={14} className="text-emerald-600" />
                                    <span>Record Payment</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    openSupplierHistoryModal(p.supplier_id, p.supplier_name);
                                  }}
                                  className="w-full px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <History size={14} className="text-indigo-600" />
                                  <span>Payment History</span>
                                </button>

                                {p.status === "draft" && (
                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      handleDelete(p.id);
                                    }}
                                    className="w-full px-3.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer border-t border-slate-100 mt-1 pt-1.5"
                                  >
                                    <Trash2 size={14} />
                                    <span>Delete Draft</span>
                                  </button>
                                )}
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
        {filteredPurchases.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-200 text-xs text-slate-600 bg-white">
            <div className="flex items-center gap-4">
              <span>
                Showing <strong className="font-semibold text-slate-800">{(safePage - 1) * rowsPerPage + 1}</strong> to{" "}
                <strong className="font-semibold text-slate-800">{Math.min(safePage * rowsPerPage, filteredPurchases.length)}</strong> of{" "}
                <strong className="font-semibold text-slate-800">{filteredPurchases.length}</strong> invoices
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Rows:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white text-slate-700 outline-none focus:border-rose-500 cursor-pointer"
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
                          ? "bg-rose-600 text-white shadow-xs"
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

      {/* ── MODAL 1: RECORD SINGLE INVOICE PAYMENT ── */}
      {showPayModal && paymentPurchase && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setShowPayModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Record Vendor Payment</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Settle pending purchase invoice</p>
                </div>
              </div>
              <button
                onClick={() => setShowPayModal(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Bill Info Banner */}
            <div className="p-6 pb-0">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Supplier:</span>
                  <span className="font-bold text-slate-900">{paymentPurchase.supplier_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Invoice Number:</span>
                  <span className="font-mono font-bold text-slate-900">{paymentPurchase.purchase_no || `#${paymentPurchase.id}`}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="text-rose-600 font-bold">Pending Balance:</span>
                  <span className="text-rose-600 font-black text-sm">₹ {fmt(paymentPurchase.balance_amount)}</span>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={submitPayment} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={Number(paymentPurchase.balance_amount)}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-black text-slate-900 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Method *
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-slate-800 text-xs outline-none focus:border-emerald-600 transition bg-white"
                >
                  <option value="cash">Cash</option>
                  <option value="online">Online / Netbanking</option>
                  <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 font-semibold text-xs outline-none focus:border-emerald-600 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notes / Reference Remarks
                </label>
                <input
                  type="text"
                  placeholder="Optional reference / transaction notes"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 text-xs outline-none focus:border-emerald-600 transition"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition cursor-pointer disabled:opacity-50"
                >
                  {submittingPayment ? "Recording..." : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: SUPPLIER PAYMENT HISTORY / LEDGER ── */}
      {showHistoryModal && selectedHistorySupplier && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setShowHistoryModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
                  <History size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Supplier Payment Ledger</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Party: <b className="text-slate-800">{selectedHistorySupplier.name}</b></p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content List */}
            <div className="p-6 flex-1 overflow-y-auto">
              {loadingHistory ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <RefreshCw size={20} className="animate-spin text-indigo-600 mx-auto mb-2" />
                  <span>Loading payment records...</span>
                </div>
              ) : paymentHistory.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <p className="font-bold text-slate-700 text-sm">No Payment Transactions Recorded</p>
                  <p className="text-slate-400 mt-1">No payments found for this supplier yet.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-[11px] uppercase">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Invoice #</th>
                        <th className="py-2.5 px-3">Method</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                        <th className="py-2.5 px-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {paymentHistory.map((h, i) => (
                        <tr key={h.id || i} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-semibold">{formatDateDMY(h.payment_date)}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{h.purchase_no || `#${h.purchase_id}`}</td>
                          <td className="py-2.5 px-3 uppercase text-[10px] font-bold text-slate-600">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">{h.payment_method}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-700">₹ {fmt(h.amount)}</td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px]">{h.notes || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-1.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}