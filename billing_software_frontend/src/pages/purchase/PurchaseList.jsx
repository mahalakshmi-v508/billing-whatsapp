import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import {
  Pencil, Trash2, Eye, FileSpreadsheet, History, CreditCard, Search,
  Phone, Mail, MapPin, Wallet, Plus, Share2, Building2, CheckCircle2,
  AlertCircle, ShieldAlert, ShoppingCart, ArrowUpRight, X, ChevronRight,
  Filter, Check, UserCheck, Layers, LayoutGrid, Calendar, RefreshCw
} from "lucide-react";
import AddSupplierModal from "../supplier/AddSupplierModal";
import TableActions from "../../components/ui/TableActions";

export default function PurchaseList() {
  const navigate = useNavigate();

  // Core Data States
  const [purchases, setPurchases] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(
    localStorage.getItem("selected_company_id") || ""
  );
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filter & Search States
  const [search, setSearch] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [viewMode, setViewMode] = useState("all"); // "all" (Primary: All Purchase Bills) | "split" (Secondary: By Supplier)
  const [billFilter, setBillFilter] = useState("all"); // "all" | "unpaid" | "paid" | "draft"
  const [supplierFilter, setSupplierFilter] = useState("all"); // "all" | "dues"

  // UI Popovers & Modals
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);

  // Single Bill Payment Modal States
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentPurchase, setPaymentPurchase] = useState(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState("cash");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payNotes, setPayNotes] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Payment History Modal States
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Bulk FIFO Pay Modal States
  const [showBulkPayModal, setShowBulkPayModal] = useState(false);
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkMethod, setBulkMethod] = useState("cash");
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().split("T")[0]);
  const [bulkNotes, setBulkNotes] = useState("");
  const [submittingBulk, setSubmittingBulk] = useState(false);
  const [bulkPreview, setBulkPreview] = useState([]);

  // Currency Formatter
  const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user?.id) {
      setLoading(false);
      return;
    }

    api.get(`/company/get_companies_by_admin?admin_id=${user.id}`)
      .then(res => {
        if (res.data.status) {
          setCompanies(res.data.data);
          const savedId = localStorage.getItem("selected_company_id");
          const activeId = savedId || (res.data.data.length > 0 ? res.data.data[0].id : "");
          if (activeId) {
            setSelectedCompany(activeId);
            fetchPurchasesAndSuppliers(activeId);
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const fetchPurchasesAndSuppliers = async (companyId) => {
    setLoading(true);
    try {
      // Fetch Purchases
      const pRes = await api.get(`/purchase/get_purchases?company_id=${companyId}`);
      let fetchedPurchases = [];
      if (pRes.data.status) {
        fetchedPurchases = pRes.data.data;
        setPurchases(fetchedPurchases);
      }

      // Fetch Suppliers
      const sRes = await api.get(`/supplier/get_all?company_id=${companyId}`);
      if (sRes.data.status) {
        const fetchedSuppliers = sRes.data.data;
        setSuppliers(fetchedSuppliers);

        // Auto-select first supplier if none or invalid
        if (fetchedSuppliers.length > 0) {
          setSelectedSupplier((prev) => {
            if (prev && fetchedSuppliers.some((s) => s.id === prev.id)) {
              return fetchedSuppliers.find((s) => s.id === prev.id);
            }
            return fetchedSuppliers[0];
          });
        } else {
          setSelectedSupplier(null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyChange = (companyId) => {
    setSelectedCompany(companyId);
    localStorage.setItem("selected_company_id", companyId);
    fetchPurchasesAndSuppliers(companyId);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this draft purchase?")) return;
    try {
      const res = await api.post(`/purchase/delete_purchase`, { id });
      if (res.data.status) {
        alert("Purchase draft deleted successfully");
        fetchPurchasesAndSuppliers(selectedCompany);
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting purchase");
    }
  };

  // Open Single Bill Payment dialog
  const openPayModal = (purchase) => {
    setPaymentPurchase(purchase);
    setPayAmount(Number(purchase.balance_amount));
    setPayMethod("cash");
    setPayDate(new Date().toISOString().split("T")[0]);
    setPayNotes("");
    setShowPayModal(true);
  };

  // Submit Single Bill Payment
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
        alert("Payment recorded successfully");
        setShowPayModal(false);
        fetchPurchasesAndSuppliers(selectedCompany);
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

  // Open supplier-level Payment History
  const openSupplierHistoryModal = async (supplier) => {
    setPaymentHistory([]);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/purchase/get_supplier_payments?supplier_id=${supplier.id}`);
      if (res.data.status) {
        setPaymentHistory(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // FIFO distribution preview helper
  const distributePayment = (pendingBills, totalAmount) => {
    let remaining = Number(totalAmount) || 0;
    return pendingBills.map((p) => {
      const bal = Number(p.balance_amount);
      if (remaining <= 0) return { ...p, _applying: 0, _newBalance: bal };
      const applying = Math.min(remaining, bal);
      remaining -= applying;
      return { ...p, _applying: applying, _newBalance: bal - applying };
    });
  };

  // Open Bulk Pay modal
  const openBulkPayModal = () => {
    setBulkAmount("");
    setBulkMethod("cash");
    setBulkDate(new Date().toISOString().split("T")[0]);
    setBulkNotes("");
    setBulkPreview([]);
    setShowBulkPayModal(true);
  };

  // Live preview update on bulk amount change
  const handleBulkAmountChange = (val) => {
    setBulkAmount(val);
    const pendingBills = (supplierBills || []).filter(
      (p) => Number(p.balance_amount) > 0 && p.status === "submitted"
    );
    const sorted = [...pendingBills].sort((a, b) => {
      const da = new Date(a.purchase_date), db = new Date(b.purchase_date);
      return da - db || a.id - b.id;
    });
    setBulkPreview(distributePayment(sorted, val));
  };

  // Submit Bulk Payment
  const submitBulkPayment = async (e) => {
    e.preventDefault();
    if (!bulkAmount || Number(bulkAmount) <= 0) {
      alert("Please enter a valid amount!");
      return;
    }
    if (!selectedSupplier) return;

    setSubmittingBulk(true);
    try {
      const res = await api.post("/purchase/pay_supplier_bulk", {
        supplier_id: selectedSupplier.id,
        amount: Number(bulkAmount),
        payment_method: bulkMethod,
        payment_date: bulkDate,
        notes: bulkNotes
      });
      if (res.data.status) {
        alert(res.data.message);
        setShowBulkPayModal(false);
        fetchPurchasesAndSuppliers(selectedCompany);
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Error recording bulk payment");
    } finally {
      setSubmittingBulk(false);
    }
  };

  // Supplier-specific pending balance helper
  const getSupplierPendingTotal = (supplierId) => {
    return purchases
      .filter((p) => Number(p.supplier_id) === Number(supplierId) && p.status === "submitted")
      .reduce((sum, p) => sum + Number(p.balance_amount || 0), 0);
  };

  // ── Financial Intelligence Calculations (PaySplitX KPI Metrics) ──
  const kpiMetrics = useMemo(() => {
    const totalPurchasesVal = purchases.reduce((acc, p) => acc + Number(p.total_amount || 0), 0);
    const totalPaidVal = purchases.reduce((acc, p) => acc + Number(p.paid_amount || 0), 0);
    const totalPendingVal = purchases
      .filter((p) => p.status === "submitted")
      .reduce((acc, p) => acc + Number(p.balance_amount || 0), 0);

    const pendingBillsCount = purchases.filter(
      (p) => Number(p.balance_amount) > 0 && p.status === "submitted"
    ).length;

    const settledBillsCount = purchases.filter(
      (p) => Number(p.balance_amount) <= 0 && p.status === "submitted"
    ).length;

    const suppliersWithDuesCount = suppliers.filter(
      (s) => getSupplierPendingTotal(s.id) > 0
    ).length;

    return {
      totalPurchasesVal,
      totalPaidVal,
      totalPendingVal,
      pendingBillsCount,
      settledBillsCount,
      suppliersWithDuesCount,
    };
  }, [purchases, suppliers]);

  // Filtered Suppliers for Sidebar
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const name = (s.supplier_name || "").toLowerCase();
      const phone = (s.mobile_number || s.phone || s.alt_mobile || "").toLowerCase();
      const matchesSearch = name.includes(supplierSearch.toLowerCase()) || phone.includes(supplierSearch.toLowerCase());
      if (!matchesSearch) return false;

      if (supplierFilter === "dues") {
        return getSupplierPendingTotal(s.id) > 0;
      }
      return true;
    });
  }, [suppliers, supplierSearch, supplierFilter, purchases]);

  // Current selected supplier's bills
  const supplierBills = useMemo(() => {
    if (!selectedSupplier) return [];
    return purchases.filter((p) => Number(p.supplier_id) === Number(selectedSupplier.id));
  }, [purchases, selectedSupplier]);

  // Filtered bills for selected supplier (or all bills in directory view)
  const filteredBills = useMemo(() => {
    const baseList = viewMode === "split" ? supplierBills : purchases;
    return baseList.filter((p) => {
      const q = search.toLowerCase();
      const billNo = (p.purchase_no || "").toLowerCase();
      const suppName = (p.supplier_name || "").toLowerCase();
      const matchesText = billNo.includes(q) || suppName.includes(q);
      if (!matchesText) return false;

      if (billFilter === "unpaid") return Number(p.balance_amount) > 0 && p.status === "submitted";
      if (billFilter === "paid") return Number(p.balance_amount) <= 0 && p.status === "submitted";
      if (billFilter === "draft") return p.status === "draft";
      return true;
    });
  }, [viewMode, supplierBills, purchases, search, billFilter]);

  const selectedSupplierPendingTotal = selectedSupplier ? getSupplierPendingTotal(selectedSupplier.id) : 0;

  return (
    <div className="space-y-6 min-h-screen bg-[#f8faff] p-4 sm:p-6 lg:p-8 font-sans animate-in fade-in duration-300">
      
      {/* ── 1. PAGE HEADER (PaySplitX Header Design) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-md shadow-indigo-100 ring-2 ring-indigo-50">
              <CreditCard size={20} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-display">
              Supplier Purchases
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
              {purchases.length} Total Bills
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              {suppliers.length} Suppliers
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage procurement bills, vendor accounts, FIFO debt settlements, and supplier ledgers.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => navigate("/purchases/reports")}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
            <span>GST Report</span>
          </button>
          <button
            onClick={() => navigate("/purchases/new")}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white font-semibold text-xs rounded-xl shadow-sm shadow-indigo-200 transition transform active:scale-95 cursor-pointer"
          >
            <Plus size={15} strokeWidth={2.6} />
            <span>Record Purchase Bill</span>
          </button>
        </div>
      </div>

      {/* ── 2. METRIC STAT CARDS (PaySplitX 4-Card Strip) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Purchases Volume */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Purchases</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShoppingCart size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight my-1 font-display">
            ₹{fmt(kpiMetrics.totalPurchasesVal)}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="text-indigo-600 font-bold">{purchases.length}</span>
            <span>recorded purchase bills</span>
          </div>
        </div>

        {/* Paid & Settled Outflow */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Disbursed (Paid)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 tracking-tight my-1 font-display">
            ₹{fmt(kpiMetrics.totalPaidVal)}
          </div>
          <div className="text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">{kpiMetrics.settledBillsCount}</span> fully settled bills
          </div>
        </div>

        {/* Outstanding Payables (Pending Dues) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Payables</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600 tracking-tight my-1 font-display">
            ₹{fmt(kpiMetrics.totalPendingVal)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-rose-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span>{kpiMetrics.pendingBillsCount} bills with outstanding balance</span>
          </div>
        </div>

        {/* Active Suppliers Base */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered Vendors</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Building2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight my-1 font-display">
            {suppliers.length}
          </div>
          <div className="text-[11px] text-slate-500">
            <span className="font-semibold text-amber-600">{kpiMetrics.suppliersWithDuesCount}</span> vendors awaiting settlement
          </div>
        </div>
      </div>

      {/* ── 3. CONTROLS BAR: Firm Selection + View Mode Toggles ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Company Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Firm:</span>
          {companies.map((c) => {
            const isActive = Number(selectedCompany) === Number(c.id);
            return (
              <button
                key={c.id}
                onClick={() => handleCompanyChange(c.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
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

        {/* View Mode Segmented Control */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 self-start md:self-auto">
          <button
            onClick={() => setViewMode("all")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "all"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers size={14} />
            <span>All Purchase Bills ({purchases.length})</span>
          </button>
          <button
            onClick={() => setViewMode("split")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "split"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <LayoutGrid size={14} />
            <span>By Supplier View</span>
          </button>
        </div>
      </div>

      {/* ── 4. MAIN CONTENT VIEW ── */}
      {viewMode === "split" ? (
        /* ── VIEW A: MASTER-DETAIL BY SUPPLIER ── */
        <div className="grid grid-cols-1 lg:grid-cols-[330px_1fr] gap-6 items-start">
          
          {/* LEFT: SUPPLIERS DIRECTORY SIDEBAR */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
            {/* Sidebar Top: Search & Add */}
            <div className="p-3.5 border-b border-slate-100 flex flex-col gap-2.5">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  placeholder="Search supplier by name or phone..."
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white font-medium transition"
                />
                {supplierSearch && (
                  <button
                    onClick={() => setSupplierSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Filter Tabs for Suppliers */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSupplierFilter("all")}
                  className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition text-center cursor-pointer ${
                    supplierFilter === "all"
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      : "text-slate-500 hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  All ({suppliers.length})
                </button>
                <button
                  onClick={() => setSupplierFilter("dues")}
                  className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition text-center cursor-pointer ${
                    supplierFilter === "dues"
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : "text-slate-500 hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  With Dues ({kpiMetrics.suppliersWithDuesCount})
                </button>
              </div>

              <button
                onClick={() => setShowAddSupplierModal(true)}
                className="w-full py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Plus size={14} strokeWidth={2.6} />
                <span>+ Add Supplier</span>
              </button>
            </div>

            {/* Supplier List Items */}
            <div className="max-h-[620px] overflow-y-auto divide-y divide-slate-100">
              {loading ? (
                <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <RefreshCw size={14} className="animate-spin text-indigo-500" />
                  <span>Loading suppliers...</span>
                </div>
              ) : filteredSuppliers.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No suppliers found matching your criteria.
                </div>
              ) : (
                filteredSuppliers.map((s) => {
                  const pt = getSupplierPendingTotal(s.id);
                  const isSelected = selectedSupplier?.id === s.id;
                  const initial = (s.supplier_name || "S").charAt(0).toUpperCase();

                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedSupplier(s);
                        setSearch("");
                      }}
                      className={`p-3.5 cursor-pointer transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? "bg-indigo-50/70 border-l-4 border-indigo-600"
                          : "hover:bg-slate-50 border-l-4 border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                            isSelected
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <div className={`font-bold text-xs truncate ${isSelected ? "text-indigo-900" : "text-slate-800"}`}>
                            {s.supplier_name}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                            <Phone size={10} />
                            <span>{s.mobile_number || s.phone || "No phone"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className={`font-black text-xs ${pt > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                          {pt > 0 ? `₹${fmt(pt)}` : "₹0"}
                        </div>
                        <div className="mt-0.5">
                          {pt > 0 ? (
                            <span className="inline-block px-1.5 py-0.2 bg-rose-50 text-rose-600 border border-rose-200/80 rounded text-[9px] font-black uppercase">
                              Due
                            </span>
                          ) : (
                            <span className="inline-block px-1.5 py-0.2 bg-emerald-50 text-emerald-600 border border-emerald-200/80 rounded text-[9px] font-black uppercase">
                              Clear
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: SELECTED SUPPLIER INVOICES & LEDGER */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
            
            {/* Supplier Executive Header Banner */}
            {selectedSupplier && (
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-black text-lg flex items-center justify-center shadow-sm shrink-0">
                      {(selectedSupplier.supplier_name || "S").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                          {selectedSupplier.supplier_name}
                        </h2>
                        {selectedSupplier.gst_number && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-mono text-[11px] font-bold rounded-md border border-slate-200">
                            GST: {selectedSupplier.gst_number}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1.5">
                        <span className="inline-flex items-center gap-1">
                          <Phone size={12} className="text-slate-400" />
                          <span>{selectedSupplier.mobile_number || selectedSupplier.phone || "N/A"}</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Mail size={12} className="text-slate-400" />
                          <span>{selectedSupplier.email || "N/A"}</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={12} className="text-slate-400" />
                          <span>{selectedSupplier.address || selectedSupplier.city || "No address on file"}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Supplier Action Strip */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => openSupplierHistoryModal(selectedSupplier)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200/80 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition cursor-pointer shadow-xs"
                    >
                      <History size={14} className="text-slate-500" />
                      <span>Payment History</span>
                    </button>

                    {selectedSupplierPendingTotal > 0 && (
                      <button
                        onClick={openBulkPayModal}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold shadow-sm shadow-amber-200 transition cursor-pointer"
                      >
                        <Wallet size={14} />
                        <span>Pay All Pending (₹{fmt(selectedSupplierPendingTotal)})</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Invoices Toolbar */}
            {selectedSupplier && (
              <div className="p-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                <div className="relative flex-1 max-w-sm">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    placeholder="Filter bills by Invoice / Bill #..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white font-medium transition"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Status Segment Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: "all", label: "All Bills" },
                    { id: "unpaid", label: "Unpaid / Due" },
                    { id: "paid", label: "Settled" },
                    { id: "draft", label: "Drafts" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setBillFilter(tab.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        billFilter === tab.id
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          : "text-slate-500 hover:bg-slate-50 border border-transparent"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                  <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md ml-1">
                    {filteredBills.length}
                  </span>
                </div>
              </div>
            )}

            {/* Directory Table */}
            <div className="overflow-x-auto">
              {!selectedSupplier ? (
                <div className="p-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-3">
                    <CreditCard size={28} />
                  </div>
                  <h3 className="font-bold text-sm text-slate-800">No Supplier Selected</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Select a vendor from the sidebar to inspect their purchase history, record payments, and monitor pending balances.
                  </p>
                </div>
              ) : filteredBills.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <FileSpreadsheet size={28} />
                  </div>
                  <h3 className="font-bold text-sm text-slate-800">No Invoices Found</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    No purchase bills match your current search and filter settings.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                      <th className="py-3 px-4">Bill Date</th>
                      <th className="py-3 px-4">Bill No</th>
                      <th className="py-3 px-4 text-right">Total (₹)</th>
                      <th className="py-3 px-4 text-right">Paid (₹)</th>
                      <th className="py-3 px-4 text-right">Pending (₹)</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredBills.map((p) => {
                      const isPaid = Number(p.balance_amount) <= 0;
                      return (
                        <tr key={p.id} className="hover:bg-indigo-50/20 transition-colors text-slate-700">
                          <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                            {p.purchase_date}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                              {p.purchase_no || "N/A"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                            ₹{fmt(p.total_amount)}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-emerald-600 whitespace-nowrap">
                            ₹{fmt(p.paid_amount)}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-black ${
                                isPaid ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              ₹{fmt(p.balance_amount)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                p.status === "submitted"
                                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                  : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  p.status === "submitted" ? "bg-emerald-600" : "bg-amber-600"
                                }`}
                              />
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <TableActions
                              onPrint={() => navigate(p.purchase_no ? `/invoice/${p.purchase_no}` : `/purchases/edit/${p.id}`)}
                              printTitle="Print Bill"
                              shareTransaction={p}
                              shareType="Purchase Bill"
                              onViewInvoice={() => navigate(p.purchase_no ? `/invoice/${p.purchase_no}` : `/purchases/edit/${p.id}`)}
                              viewInvoiceLabel="View Invoice"
                              menuItems={[
                                {
                                  label: "View Invoice",
                                  icon: Eye,
                                  onClick: () => navigate(p.purchase_no ? `/invoice/${p.purchase_no}` : `/purchases/edit/${p.id}`),
                                },
                                {
                                  label: p.status === "draft" ? "Edit Draft" : "View / Edit Bill",
                                  icon: Pencil,
                                  onClick: () => navigate(`/purchases/edit/${p.id}`),
                                },
                                ...(Number(p.balance_amount) > 0
                                  ? [
                                      {
                                        label: "Pay Bill",
                                        icon: CreditCard,
                                        onClick: () => openPayModal(p),
                                      },
                                    ]
                                  : []),
                                { isDivider: true },
                                {
                                  label: "Delete",
                                  icon: Trash2,
                                  isDanger: true,
                                  onClick: () => handleDelete(p.id),
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
          </div>
        </div>
      ) : (
        /* ── VIEW B: ALL PURCHASES FLAT DIRECTORY TABLE ── */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Table Header Filter Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Search by Bill No or Supplier Name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 font-medium transition shadow-xs"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: "all", label: "All Bills" },
                { id: "unpaid", label: "Pending Payment" },
                { id: "paid", label: "Settled" },
                { id: "draft", label: "Drafts" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setBillFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    billFilter === tab.id
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredBills.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <FileSpreadsheet size={28} />
                </div>
                <h3 className="font-bold text-sm text-slate-800">No Purchase Bills Found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  No invoices matched your current search and status filters.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Bill No</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4 text-right">Total (₹)</th>
                    <th className="py-3 px-4 text-right">Paid (₹)</th>
                    <th className="py-3 px-4 text-right">Balance Due (₹)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredBills.map((p) => {
                    const isPaid = Number(p.balance_amount) <= 0;
                    return (
                      <tr key={p.id} className="hover:bg-indigo-50/20 transition-colors text-slate-700">
                        <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                          {p.purchase_date}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                            {p.purchase_no || "N/A"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 font-black flex items-center justify-center text-xs shrink-0">
                              {(p.supplier_name || "S").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{p.supplier_name || "Unknown"}</div>
                              <div className="text-[11px] text-slate-400">{p.mobile_number || p.phone || ""}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                          ₹{fmt(p.total_amount)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-emerald-600 whitespace-nowrap">
                          ₹{fmt(p.paid_amount)}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-black ${
                              isPaid ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            ₹{fmt(p.balance_amount)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              p.status === "submitted"
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                p.status === "submitted" ? "bg-emerald-600" : "bg-amber-600"
                              }`}
                            />
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <TableActions
                            onPrint={() => navigate(p.purchase_no ? `/invoice/${p.purchase_no}` : `/purchases/edit/${p.id}`)}
                            printTitle="Print Bill"
                            shareTransaction={p}
                            shareType="Purchase Bill"
                            onViewInvoice={() => navigate(p.purchase_no ? `/invoice/${p.purchase_no}` : `/purchases/edit/${p.id}`)}
                            viewInvoiceLabel="View Invoice"
                            menuItems={[
                              {
                                label: "View Invoice",
                                icon: Eye,
                                onClick: () => navigate(p.purchase_no ? `/invoice/${p.purchase_no}` : `/purchases/edit/${p.id}`),
                              },
                              {
                                label: p.status === "draft" ? "Edit Draft" : "View / Edit Bill",
                                icon: Pencil,
                                onClick: () => navigate(`/purchases/edit/${p.id}`),
                              },
                              ...(Number(p.balance_amount) > 0
                                ? [
                                    {
                                      label: "Pay Bill",
                                      icon: CreditCard,
                                      onClick: () => openPayModal(p),
                                    },
                                  ]
                                : []),
                              { isDivider: true },
                              {
                                label: "Delete",
                                icon: Trash2,
                                isDanger: true,
                                onClick: () => handleDelete(p.id),
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
        </div>
      )}

      {/* ── 5. TAILWIND MODAL: RECORD SINGLE BILL PAYMENT ── */}
      {showPayModal && paymentPurchase && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200/80 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Record Supplier Payment</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bill No: <span className="font-mono font-bold text-indigo-600">{paymentPurchase.purchase_no || "N/A"}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={submitPayment} className="p-5 space-y-4">
              {/* Balances Summary Card */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Paid Till Now</span>
                  <div className="text-base font-black text-amber-900 mt-0.5">₹{fmt(paymentPurchase.paid_amount)}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">Pending Balance</span>
                  <div className="text-base font-black text-rose-600 mt-0.5">₹{fmt(paymentPurchase.balance_amount)}</div>
                </div>
              </div>

              {/* Pay Amount input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                  Payment Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={Number(paymentPurchase.balance_amount)}
                  min="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-sm font-bold text-slate-900"
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                  Payment Method *
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-xs font-semibold text-slate-700 bg-white"
                >
                  <option value="cash">Cash</option>
                  <option value="online">Online Transfer / Netbanking</option>
                  <option value="upi">UPI Transfer</option>
                  <option value="card">Card Payment</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              {/* Payment Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                  Payment Date *
                </label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-xs font-semibold text-slate-700 bg-white"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                  Notes / Reference
                </label>
                <textarea
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. UTR reference, cheque number..."
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-xs text-slate-700"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-xl font-bold text-xs shadow-sm shadow-emerald-200 transition cursor-pointer"
                >
                  {submittingPayment ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 6. TAILWIND MODAL: SUPPLIER PAYMENT HISTORY ── */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-200/80 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Payment History</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ledger of settlements disbursed to <strong className="text-slate-800">{selectedSupplier?.supplier_name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Summary strip */}
            {!loadingHistory && paymentHistory.length > 0 && (
              <div className="mx-5 mt-4 p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-center gap-6 shrink-0">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Total Settled</span>
                  <div className="text-base font-black text-emerald-800">
                    ₹{fmt(paymentHistory.reduce((s, h) => s + Number(h.amount || 0), 0))}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Transactions</span>
                  <div className="text-base font-black text-slate-700">{paymentHistory.length} payments</div>
                </div>
              </div>
            )}

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 p-5">
              {loadingHistory ? (
                <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw size={14} className="animate-spin text-indigo-500" />
                  <span>Loading payment records...</span>
                </div>
              ) : paymentHistory.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  <div className="text-3xl mb-2">🧾</div>
                  No payment vouchers recorded for this vendor yet.
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="py-2.5 px-3">Bill No</th>
                        <th className="py-2.5 px-3">Invoice Date</th>
                        <th className="py-2.5 px-3">Payment Date</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                        <th className="py-2.5 px-3 text-center">Mode</th>
                        <th className="py-2.5 px-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paymentHistory.map((h) => (
                        <tr key={h.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{h.purchase_no || "N/A"}</td>
                          <td className="py-2.5 px-3 text-slate-500">{h.invoice_date || "-"}</td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium">{h.payment_date}</td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-600">₹{fmt(h.amount)}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                              {h.payment_method}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 truncate max-w-[150px]">{h.notes || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 7. TAILWIND MODAL: BULK FIFO PAYMENT ── */}
      {showBulkPayModal && selectedSupplier && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-200/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 bg-amber-50/60 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Wallet size={18} className="text-amber-600" />
                  <span>Pay All Pending (FIFO Auto-Split)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Payment is distributed oldest-invoice-first for <strong className="text-slate-800">{selectedSupplier.supplier_name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkPayModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 p-5 bg-white border-b border-slate-100 shrink-0">
              <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Total Outstanding</span>
                <div className="text-lg font-black text-rose-600 mt-0.5">₹{fmt(selectedSupplierPendingTotal)}</div>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Pending Invoices</span>
                <div className="text-lg font-black text-emerald-800 mt-0.5">
                  {supplierBills.filter((p) => Number(p.balance_amount) > 0 && p.status === "submitted").length}
                </div>
              </div>
            </div>

            {/* Form + Distribution Preview */}
            <form onSubmit={submitBulkPayment} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                  Payment Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedSupplierPendingTotal}
                  required
                  value={bulkAmount}
                  onChange={(e) => handleBulkAmountChange(e.target.value)}
                  placeholder={`Max: ₹${fmt(selectedSupplierPendingTotal)}`}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-base font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Method</label>
                  <select
                    value={bulkMethod}
                    onChange={(e) => setBulkMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-xs font-semibold text-slate-700 bg-white"
                  >
                    <option value="cash">Cash</option>
                    <option value="online">Online Transfer</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Date</label>
                  <input
                    type="date"
                    value={bulkDate}
                    onChange={(e) => setBulkDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-xs font-semibold text-slate-700 bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Reference / Notes</label>
                <input
                  type="text"
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  placeholder="e.g. Bulk settlement ref..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-xs text-slate-700"
                />
              </div>

              {/* FIFO Allocation Preview Table */}
              {bulkPreview.length > 0 && (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="p-2.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
                    📊 FIFO Settlement Preview (Oldest Invoices Cleared First)
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/50 text-slate-500 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="py-2 px-3">Bill No</th>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3 text-right">Pending</th>
                        <th className="py-2 px-3 text-right">Applying</th>
                        <th className="py-2 px-3 text-right">New Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bulkPreview.map((p) => {
                        const willPay = Number(p._applying) > 0;
                        const fullyClear = Number(p._newBalance) <= 0;
                        return (
                          <tr key={p.id} className={willPay ? (fullyClear ? "bg-emerald-50/50" : "bg-amber-50/40") : ""}>
                            <td className="py-2 px-3 font-bold text-slate-900">{p.purchase_no || "N/A"}</td>
                            <td className="py-2 px-3 text-slate-500">{p.purchase_date}</td>
                            <td className="py-2 px-3 text-right font-semibold text-rose-600">₹{fmt(p.balance_amount)}</td>
                            <td className="py-2 px-3 text-right font-black text-emerald-600">
                              {willPay ? `₹${fmt(p._applying)}` : "—"}
                            </td>
                            <td className="py-2 px-3 text-right font-bold">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] ${
                                  fullyClear ? "bg-emerald-100 text-emerald-800" : (willPay ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600")
                                }`}
                              >
                                {fullyClear ? "✓ Cleared" : `₹${fmt(p._newBalance)}`}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowBulkPayModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBulk || !bulkAmount || Number(bulkAmount) <= 0}
                  className="flex-2 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-bold text-xs shadow-sm shadow-amber-200 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Wallet size={14} />
                  <span>
                    {submittingBulk ? "Processing..." : `Record ₹${bulkAmount ? fmt(Math.min(Number(bulkAmount), selectedSupplierPendingTotal)) : "0"} Payment`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 8. ADD SUPPLIER MODAL ── */}
      <AddSupplierModal
        isOpen={showAddSupplierModal}
        onClose={() => setShowAddSupplierModal(false)}
        companyId={selectedCompany}
        onSupplierAdded={(newSupplier) => {
          fetchPurchasesAndSuppliers(selectedCompany);
          if (newSupplier?.id) {
            setSelectedSupplier(newSupplier);
          }
        }}
      />
    </div>
  );
}
