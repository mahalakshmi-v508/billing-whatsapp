import { Children, useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  Pencil, Search, Phone, MapPin, Download, Wallet,
  CheckCircle, ChevronRight, IndianRupee, X, MessageCircle, History,
  MoreVertical, Eye, Users, UserCheck, AlertCircle, TrendingUp,
  FileText, ArrowUpRight, Filter, ChevronLeft, Building2, Check,
  ShieldAlert, RefreshCw, Plus, CheckCircle2
} from "lucide-react";
import CustomerForm from "./CustomerForm";
import EditCustomer from "./EditCustomer";
import StatusBadge from "../../components/ui/StatusBadge";

/* ─────────────────── helpers ─────────────────── */
const fmt = (n) => Number(n || 0).toLocaleString("en-IN");

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date.replace(" ", "T")).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

/* Smart FIFO distribution */
const distributePayment = (pendingInvoices, totalAmount) => {
  let remaining = Number(totalAmount);
  return pendingInvoices.map((inv) => {
    const bal = Number(inv.balance_amount);
    if (remaining <= 0) return { ...inv, _applying: 0, _newBalance: bal };
    const applying = Math.min(remaining, bal);
    remaining -= applying;
    return { ...inv, _applying: applying, _newBalance: bal - applying };
  });
};

/* ─────────────────── Component ─────────────────── */
export default function CustomerList() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [invoiceHistory, setInvoiceHistory] = useState([]);
  const [allHistory, setAllHistory] = useState([]);
  const [toast, setToast] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  /* Tab Filter: 'all' | 'active' | 'pending' | 'advance' */
  const [filterTab, setFilterTab] = useState("all");

  /* Customer Detail Drawer */
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);

  /* collect popup */
  const [showCollect, setShowCollect] = useState(false);
  const [collectAmount, setCollectAmount] = useState("");
  const [collectMethod, setCollectMethod] = useState("cash");
  const [collectDate, setCollectDate] = useState(new Date().toISOString().split("T")[0]);
  const [collectNotes, setCollectNotes] = useState("");
  const [collecting, setCollecting] = useState(false);
  const [preview, setPreview] = useState([]);

  const [sendingReminder, setSendingReminder] = useState(false);

  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const admin_id = user?.id;

  const [selectedRows, setSelectedRows] = useState([]);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCustomerId, setEditCustomerId] = useState(null);

  // 3-dot menu state
  const [activeMenuId, setActiveMenuId] = useState(null);

  // View customer modal state
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewCustomer, setViewCustomer] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  /* ── toast ── */
  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCustomers = async () => {
    try {
      const res = await api.get(`/customer/get_all_customer?admin_id=${admin_id}`);
      if (res.data.status) {
        setCustomers(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllHistory = async () => {
    try {
      const res = await api.get(`/invoice/get_pending_invoice_history?admin_id=${admin_id}`);
      if (res.data.status) setAllHistory(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCustomerHistory = async (customerId) => {
    try {
      const res = await api.get(`/invoice/get_pending_invoice_history?admin_id=${admin_id}`);
      if (res.data.status) {
        setInvoiceHistory(
          (res.data.data || []).filter(
            (item) => Number(item.customer_id) === Number(customerId)
          )
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchAllHistory();
  }, []);

  /* ── preview recalc ── */
  useEffect(() => {
    const pending = invoiceHistory.filter((i) => Number(i.balance_amount) > 0);
    const sortedPending = [...pending].sort((a, b) => {
      const da = new Date(a.created_at || a.invoice_date || 0);
      const db = new Date(b.created_at || b.invoice_date || 0);
      return da - db || a.id - b.id;
    });
    if (!collectAmount || Number(collectAmount) <= 0) {
      setPreview([]);
      return;
    }
    setPreview(distributePayment(sortedPending, collectAmount));
  }, [collectAmount, invoiceHistory]);

  /* ── derived metrics ── */
  const getCustomerPendingTotal = (customerId) =>
    allHistory
      .filter((i) => Number(i.customer_id) === Number(customerId))
      .reduce((s, i) => s + Number(i.balance_amount || 0), 0);

  const totalOutstandingAll = useMemo(() => {
    return allHistory.reduce((s, i) => s + Number(i.balance_amount || 0), 0);
  }, [allHistory]);

  const customersWithDues = useMemo(() => {
    const setOfIds = new Set(
      allHistory.filter((i) => Number(i.balance_amount || 0) > 0).map((i) => Number(i.customer_id))
    );
    return setOfIds.size;
  }, [allHistory]);

  const customersWithAdvance = useMemo(() => {
    return customers.filter((c) => Number(c.advance_balance || 0) > 0).length;
  }, [customers]);

  const pendingInvoices = (invoiceHistory || []).filter((i) => Number(i.balance_amount) > 0);
  const totalPending = pendingInvoices.reduce((s, i) => s + Number(i.balance_amount), 0);

  /* ── Filtered Customers ── */
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        c.name?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.gst_no?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      const pt = getCustomerPendingTotal(c.id);
      if (filterTab === "pending") return pt > 0;
      if (filterTab === "advance") return Number(c.advance_balance || 0) > 0;
      if (filterTab === "active") return Number(c.status !== "inactive");
      return true;
    });
  }, [customers, search, filterTab, allHistory]);

  /* ── Collect Payment Handler ── */
  const openCollectForCustomer = (cust) => {
    setSelectedCustomer(cust);
    fetchCustomerHistory(cust.id);
    const pt = getCustomerPendingTotal(cust.id);
    setCollectAmount(pt > 0 ? String(pt) : "");
    setShowCollect(true);
  };

  const handleCollect = async (e) => {
    e.preventDefault();
    if (!selectedCustomer || !collectAmount || Number(collectAmount) <= 0) {
      showToast("Please enter a valid collection amount", false);
      return;
    }
    setCollecting(true);
    try {
      const res = await api.post("/invoice/pay_customer_bulk", {
        customer_id: selectedCustomer.id,
        amount: Number(collectAmount),
        payment_method: collectMethod,
        payment_date: collectDate,
        notes: collectNotes,
      });

      if (res.data.status) {
        showToast("Payment collected successfully", true);
        setShowCollect(false);
        setCollectAmount("");
        setPreview([]);
        fetchCustomerHistory(selectedCustomer.id);
        fetchAllHistory();
        fetchCustomers();
      } else {
        showToast(res.data.message || "Failed to collect payment", false);
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Server error, please retry", false);
    } finally {
      setCollecting(false);
    }
  };

  // Open customer payment history modal
  const openCustomerHistoryModal = async (cust) => {
    setSelectedCustomer(cust);
    setPaymentHistory([]);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/invoice/get_customer_payments?customer_id=${cust.id}`);
      if (res.data.status) {
        setPaymentHistory(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Open view customer modal
  const openViewCustomer = async (cust) => {
    setSelectedCustomer(cust);
    setShowViewModal(true);
    setViewCustomer(null);
    setViewLoading(true);
    setActiveMenuId(null);
    try {
      const res = await api.get(`/customer/get_customer_by_id?id=${cust.id}`);
      if (res.data.status) {
        setViewCustomer(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setViewLoading(false);
    }
  };

  // Open Ledger / Drawer
  const openCustomerLedger = (cust) => {
    setSelectedCustomer(cust);
    fetchCustomerHistory(cust.id);
    setShowDetailDrawer(true);
  };

  /* ── Export Excel ── */
  const downloadExcel = () => {
    const source =
      selectedRows.length > 0
        ? filteredCustomers.filter((c) => selectedRows.includes(c.id))
        : filteredCustomers;

    const rows = source.map((c) => {
      const pt = getCustomerPendingTotal(c.id);
      return {
        "Customer Name": c.name || "-",
        "Phone": c.phone || "-",
        "Email": c.email || "-",
        "GSTIN": c.gst_no || "-",
        "PAN": c.pan_number || "-",
        "Pending Balance": pt,
        "Advance Balance": c.advance_balance || 0,
        "Credit Limit": c.credit_limit || 0,
        "Credit Days": c.credit_days || 0,
        "City": c.city || "-",
        "State": c.state || "-",
        "Status": pt > 0 ? "Pending Balance" : "Cleared",
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [24, 16, 24, 18, 16, 16, 16, 14, 12, 16, 16, 16].map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      `customers_directory_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  const sendCustomerReminder = async (cust) => {
    const target = cust || selectedCustomer;
    if (!target) return;
    setSendingReminder(true);
    try {
      const pt = getCustomerPendingTotal(target.id);
      if (pt <= 0) {
        showToast("No pending balance found for this customer", false);
        setSendingReminder(false);
        return;
      }
      const res = await api.post("/whatsapp/send_reminder", {
        phone: target.phone,
        name: target.name,
        amount: pt,
        template_name: "hello_world"
      });
      if (res.data.status) {
        showToast(`WhatsApp balance reminder sent to ${target.name}!`);
      } else {
        showToast(res.data.message || "Failed to send WhatsApp reminder", false);
      }
    } catch (err) {
      console.error(err);
      showToast("Unable to send WhatsApp reminder.", false);
    } finally {
      setSendingReminder(false);
    }
  };

  return (
    <div className="space-y-6 font-sans animate-in fade-in duration-300">
      {/* ── TOAST NOTIFICATION ── */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[99999] px-4 py-3 rounded-xl text-white font-semibold text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-top duration-200 ${toast.ok ? "bg-gradient-to-r from-indigo-600 to-indigo-500" : "bg-gradient-to-r from-rose-600 to-red-600"
            }`}
        >
          {toast.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ── TOP PAGE HEADER (PaySplitX Style) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-display">
              All Customers
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
              {customers.length} Accounts
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage your customer base, track credit health, and monitor revenue receivables.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={downloadExcel}
            className="psx-btn-secondary flex items-center gap-2 px-3.5 py-2 text-xs font-semibold cursor-pointer shadow-xs"
          >
            <Download size={14} className="text-emerald-600" />
            <span>{selectedRows.length > 0 ? `Export (${selectedRows.length})` : "Export Directory"}</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white font-semibold text-xs rounded-xl shadow-glow-brand transition transform active:scale-95 cursor-pointer"
          >
            <Plus size={15} strokeWidth={2.6} />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* ── METRIC STAT CARDS (PaySplitX 4-Card Style) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers */}
        <div className="psx-card p-4 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Customers</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight my-1 font-display">
            {customers.length}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="text-emerald-600 font-bold">+18.2%</span>
            <span>growth this quarter</span>
          </div>
        </div>

        {/* Active Accounts */}
        <div className="psx-card p-4 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Base</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 tracking-tight my-1 font-display">
            {customers.length - customersWithDues}
          </div>
          <div className="text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">100% Cleared</span> accounts
          </div>
        </div>

        {/* Outstanding / Churn Risk */}
        <div className="psx-card p-4 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Credit at Risk</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600 tracking-tight my-1 font-display">
            ₹{fmt(totalOutstandingAll)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-rose-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span>{customersWithDues} accounts with pending dues</span>
          </div>
        </div>

        {/* Advance Balance */}
        <div className="psx-card p-4 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-500" />
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Advance Deposits</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Wallet size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-cyan-700 tracking-tight my-1 font-display">
            {customersWithAdvance} <span className="text-sm font-normal text-slate-500">Parties</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Pre-paid advance wallet balances
          </div>
        </div>
      </div>

      {/* ── SEARCH & FILTER TOOLBAR (PaySplitX Style) ── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filter Segment Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl flex-wrap">
          {[
            { id: "all", label: "All Customers", count: customers.length },
            { id: "pending", label: "With Pending Dues", count: customersWithDues },
            { id: "advance", label: "Advance Balance", count: customersWithAdvance },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${filterTab === tab.id
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
                }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${filterTab === tab.id
                    ? "bg-indigo-50 text-indigo-700"
                    : "bg-slate-200/70 text-slate-600"
                  }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[280px] sm:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, phone, email, GSTIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── CUSTOMER DIRECTORY FULL TABLE (PaySplitX Style) ── */}
      <div className="psx-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse psx-table">
            <thead>
              <tr>
                <th className="w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredCustomers.length > 0 &&
                      selectedRows.length === filteredCustomers.length
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRows(filteredCustomers.map((c) => c.id));
                      } else {
                        setSelectedRows([]);
                      }
                    }}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th>Customer & Contact</th>
                <th>GST / Identification</th>
                <th>Credit Limit</th>
                <th>Advance Balance</th>
                <th>Pending Dues</th>
                <th>Health Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <Users size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No customers found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try searching with a different term or clear filters</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const pt = getCustomerPendingTotal(c.id);
                  const isChecked = selectedRows.includes(c.id);
                  const hasAdvance = Number(c.advance_balance || 0) > 0;
                  const isOverdue = pt > 0;

                  return (
                    <tr
                      key={c.id}
                      className={isChecked ? "bg-indigo-50/40" : ""}
                    >
                      {/* Checkbox */}
                      <td className="text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedRows((prev) =>
                              prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                            );
                          }}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      {/* Customer Info */}
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
                            {c.name?.charAt(0)?.toUpperCase() || "C"}
                          </div>
                          <div>
                            <div
                              onClick={() => openCustomerLedger(c)}
                              className="font-bold text-slate-900 hover:text-indigo-600 text-xs cursor-pointer transition"
                            >
                              {c.name}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              <span>{c.phone || "No phone"}</span>
                              {c.email && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[140px]">{c.email}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* GST / PAN */}
                      <td>
                        {c.gst_no ? (
                          <div className="font-mono text-xs text-slate-800 font-semibold">
                            {c.gst_no}
                          </div>
                        ) : c.pan_number ? (
                          <div className="font-mono text-xs text-slate-600">
                            PAN: {c.pan_number}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Unregistered</span>
                        )}
                        {c.state && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">{c.state}</span>
                        )}
                      </td>

                      {/* Credit Limit */}
                      <td>
                        {Number(c.credit_enabled) === 1 ? (
                          <div>
                            <div className="text-xs font-bold text-slate-800">
                              ₹{fmt(c.credit_limit || 0)}
                            </div>
                            <span className="text-[10px] text-slate-500">
                              {c.credit_days || 0} days term
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Not enabled</span>
                        )}
                      </td>

                      {/* Advance Balance */}
                      <td>
                        {hasAdvance ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ₹{fmt(c.advance_balance)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>

                      {/* Pending Dues */}
                      <td>
                        {pt > 0 ? (
                          <span className="text-xs font-extrabold text-rose-600">
                            ₹{fmt(pt)}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-600">
                            ₹0.00
                          </span>
                        )}
                      </td>

                      {/* Health Status */}
                      <td>
                        {isOverdue ? (
                          <StatusBadge status="danger" label="Pending Dues" size="sm" />
                        ) : hasAdvance ? (
                          <StatusBadge status="info" label="In Advance" size="sm" />
                        ) : (
                          <StatusBadge status="success" label="All Clear" size="sm" />
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* WhatsApp Reminder */}
                          {pt > 0 && (
                            <button
                              onClick={() => sendCustomerReminder(c)}
                              title="Send WhatsApp Reminder"
                              className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition cursor-pointer"
                            >
                              <MessageCircle size={15} />
                            </button>
                          )}

                          {/* Collect Payment */}
                          {pt > 0 && (
                            <button
                              onClick={() => openCollectForCustomer(c)}
                              title="Collect Payment"
                              className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center transition cursor-pointer"
                            >
                              <Wallet size={15} />
                            </button>
                          )}

                          {/* View Ledger */}
                          <button
                            onClick={() => openCustomerLedger(c)}
                            title="View Ledger & Invoices"
                            className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                          >
                            <FileText size={15} />
                          </button>

                          {/* 3-dot menu */}
                          <div className="relative">
                            <button
                              onClick={() => setActiveMenuId(activeMenuId === c.id ? null : c.id)}
                              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                            >
                              <MoreVertical size={15} />
                            </button>

                            {activeMenuId === c.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setActiveMenuId(null)}
                                />
                                <div className="absolute right-0 top-9 w-44 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden py-1 z-50 animate-in fade-in zoom-in-95 duration-100 text-left">
                                  <button
                                    onClick={() => openViewCustomer(c)}
                                    className="w-full px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Eye size={14} className="text-indigo-600" />
                                    <span>Full Profile</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      setEditCustomerId(c.id);
                                      setShowEditModal(true);
                                    }}
                                    className="w-full px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Pencil size={14} className="text-violet-600" />
                                    <span>Edit Details</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      openCustomerHistoryModal(c);
                                    }}
                                    className="w-full px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <History size={14} className="text-teal-600" />
                                    <span>Payment Records</span>
                                  </button>
                                </div>
                              </>
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

      {/* ── CUSTOMER DETAIL SLIDE-OVER DRAWER (PaySplitX Style) ── */}
      {showDetailDrawer && selectedCustomer && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setShowDetailDrawer(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-250">
              {/* Drawer Header */}
              <div className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-start justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white flex items-center justify-center font-bold text-lg shadow-glow-brand">
                    {selectedCustomer.name?.charAt(0)?.toUpperCase() || "C"}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold font-display">{selectedCustomer.name}</h2>
                    <p className="text-xs text-indigo-300 flex items-center gap-2 mt-0.5">
                      <span>{selectedCustomer.phone}</span>
                      {selectedCustomer.city && <span>• {selectedCustomer.city}</span>}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowDetailDrawer(false)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Quick Actions Strip */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-1">
                    <div className="text-[10px] font-bold text-rose-600 uppercase">Pending Due</div>
                    <div className="text-sm font-extrabold text-rose-700">₹{fmt(totalPending)}</div>
                  </div>
                  {Number(selectedCustomer.advance_balance || 0) > 0 && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1">
                      <div className="text-[10px] font-bold text-emerald-600 uppercase">Advance Deposit</div>
                      <div className="text-sm font-extrabold text-emerald-700">₹{fmt(selectedCustomer.advance_balance)}</div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {totalPending > 0 && (
                    <button
                      onClick={() => openCollectForCustomer(selectedCustomer)}
                      className="psx-btn-primary px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-glow-brand"
                    >
                      <Wallet size={14} />
                      <span>Collect Payment</span>
                    </button>
                  )}
                  {totalPending > 0 && (
                    <button
                      onClick={() => sendCustomerReminder(selectedCustomer)}
                      disabled={sendingReminder}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <MessageCircle size={14} />
                      <span>{sendingReminder ? "Sending..." : "WhatsApp"}</span>
                    </button>
                  )}
                  <button
                    onClick={() => openCustomerHistoryModal(selectedCustomer)}
                    className="psx-btn-secondary px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <History size={14} />
                    <span>Records</span>
                  </button>
                </div>
              </div>

              {/* Drawer Body: Invoices Ledger Table */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 paysplitx-scrollbar-light">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 font-display uppercase tracking-wider">
                    Invoice Ledger History
                  </h3>
                  <span className="text-xs text-slate-400">
                    {invoiceHistory.length} Transactions
                  </span>
                </div>

                <div className="psx-table-container">
                  <table className="w-full text-left border-collapse psx-table text-xs">
                    <thead>
                      <tr>
                        <th>Invoice No</th>
                        <th>Date</th>
                        <th>Total</th>
                        <th>Paid</th>
                        <th>Pending</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceHistory.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-slate-400">
                            No billing history found for this customer.
                          </td>
                        </tr>
                      ) : (
                        invoiceHistory.map((inv, idx) => {
                          const isPaid = Number(inv.balance_amount) <= 0;
                          return (
                            <tr key={idx}>
                              <td className="font-mono font-bold text-indigo-600">
                                {inv.invoice_no || "N/A"}
                              </td>
                              <td className="text-slate-500">
                                {formatDate(inv.created_at || inv.due_date)}
                              </td>
                              <td className="font-semibold text-slate-900">
                                ₹{fmt(inv.total_amount)}
                              </td>
                              <td className="font-bold text-emerald-600">
                                ₹{fmt(inv.paid_amount_total)}
                              </td>
                              <td className="font-bold text-rose-600">
                                ₹{fmt(inv.balance_amount)}
                              </td>
                              <td>
                                {isPaid ? (
                                  <StatusBadge status="success" label="Cleared" size="sm" />
                                ) : (
                                  <StatusBadge status="danger" label="Pending" size="sm" />
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── COLLECT PAYMENT MODAL (PaySplitX Style) ── */}
      {showCollect && selectedCustomer && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-blue-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                  <Wallet size={18} className="text-indigo-600" /> Collect Customer Payment
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Distributes oldest-first (FIFO) for <strong>{selectedCustomer.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setShowCollect(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200/60 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Summary */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-4">
              <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-2 flex-1">
                <div className="text-[10px] font-bold text-rose-600 uppercase">Total Pending</div>
                <div className="text-lg font-extrabold text-rose-700">₹{fmt(totalPending)}</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 flex-1">
                <div className="text-[10px] font-bold text-emerald-600 uppercase">Pending Invoices</div>
                <div className="text-lg font-extrabold text-emerald-700">{pendingInvoices.length}</div>
              </div>
            </div>

            {/* Form & Preview */}
            <form onSubmit={handleCollect} className="p-5 overflow-y-auto space-y-4 flex-1 paysplitx-scrollbar-light">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1.5">
                  Amount to Collect (₹) *
                </label>
                <div className="relative">
                  <IndianRupee size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={collectAmount}
                    onChange={(e) => setCollectAmount(e.target.value)}
                    placeholder={`Total Due: ₹${fmt(totalPending)}`}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-bold text-base focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                  />
                </div>

                {/* Quick percentage buttons */}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {[25, 50, 100].map((pct) => {
                    const val = Math.round((totalPending * pct) / 100);
                    return (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setCollectAmount(String(val))}
                        className="py-1 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg cursor-pointer transition"
                      >
                        {pct}% (₹{fmt(val)})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Method & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                    Payment Method
                  </label>
                  <select
                    value={collectMethod}
                    onChange={(e) => setCollectMethod(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    <option value="cash">Cash</option>
                    <option value="online">Online Transfer</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="loyalty">Loyalty</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={collectDate}
                    onChange={(e) => setCollectDate(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                  Notes / Reference
                </label>
                <input
                  type="text"
                  value={collectNotes}
                  onChange={(e) => setCollectNotes(e.target.value)}
                  placeholder="e.g. UTR number, UPI transaction ID"
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              {/* FIFO Distribution Preview */}
              {preview.length > 0 && (
                <div className="psx-table-container text-xs mt-3">
                  <div className="p-2.5 bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                    Distribution Breakdown
                  </div>
                  <table className="w-full text-left border-collapse psx-table">
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Pending</th>
                        <th>Applying</th>
                        <th>New Bal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((p, idx) => {
                        const willPay = Number(p._applying) > 0;
                        const fullyClear = Number(p._newBalance) <= 0;
                        return (
                          <tr key={idx} className={willPay ? (fullyClear ? "bg-emerald-50/40" : "bg-amber-50/40") : ""}>
                            <td className="font-mono font-bold">{p.invoice_no || "N/A"}</td>
                            <td className="text-rose-600 font-semibold">₹{fmt(p.balance_amount)}</td>
                            <td className="font-bold text-emerald-600">{willPay ? `₹${fmt(p._applying)}` : "—"}</td>
                            <td>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${fullyClear ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
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

              {/* Footer CTA */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCollect(false)}
                  className="psx-btn-secondary px-4 py-2 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={collecting}
                  className="psx-btn-primary px-5 py-2 text-xs font-semibold cursor-pointer shadow-glow-brand disabled:opacity-50"
                >
                  {collecting ? "Processing Payment..." : "Confirm Collection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CUSTOMER PAYMENT HISTORY MODAL ── */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display">Payment Transaction Records</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Historical collections for <strong>{selectedCustomer?.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200/60 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 paysplitx-scrollbar-light">
              {loadingHistory ? (
                <div className="py-12 text-center text-indigo-600 font-semibold text-xs">
                  Loading payment transactions...
                </div>
              ) : paymentHistory.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No payment records found for this customer.
                </div>
              ) : (
                <div className="psx-table-container text-xs">
                  <table className="w-full text-left border-collapse psx-table">
                    <thead>
                      <tr>
                        <th>Invoice No</th>
                        <th>Payment Date</th>
                        <th>Amount Paid</th>
                        <th>Method</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.map((h, idx) => (
                        <tr key={idx}>
                          <td className="font-mono font-bold text-indigo-600">{h.invoice_no || "N/A"}</td>
                          <td className="text-slate-500">{formatDate(h.payment_date)}</td>
                          <td className="font-bold text-emerald-600">₹{fmt(h.amount)}</td>
                          <td>
                            <span className="capitalize px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {h.payment_method}
                            </span>
                          </td>
                          <td className="text-slate-500">{h.notes || "-"}</td>
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

      {/* ── VIEW CUSTOMER DETAILS MODAL ── */}
      {showViewModal && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-blue-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display">Customer Master Profile</h3>
                <p className="text-xs text-slate-500 mt-0.5">{viewCustomer?.name || "Loading..."}</p>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200/60 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs paysplitx-scrollbar-light">
              {viewLoading ? (
                <div className="py-12 text-center text-indigo-600 font-semibold">Loading profile...</div>
              ) : viewCustomer ? (
                <>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">Contact Information</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-slate-400">Phone:</span> <strong className="text-slate-800">{viewCustomer.phone}</strong></div>
                      <div><span className="text-slate-400">Email:</span> <strong className="text-slate-800">{viewCustomer.email || "-"}</strong></div>
                      <div><span className="text-slate-400">State:</span> <strong className="text-slate-800">{viewCustomer.state || "-"}</strong></div>
                      <div><span className="text-slate-400">City:</span> <strong className="text-slate-800">{viewCustomer.city || "-"}</strong></div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">GST & Tax Identifiers</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-slate-400">GST Type:</span> <strong className="text-slate-800">{viewCustomer.type || "Regular"}</strong></div>
                      <div><span className="text-slate-400">GSTIN:</span> <strong className="text-slate-800">{viewCustomer.gst_no || "-"}</strong></div>
                      <div><span className="text-slate-400">PAN:</span> <strong className="text-slate-800">{viewCustomer.pan_number || "-"}</strong></div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">Credit & Balance Status</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-slate-400">Credit Limit:</span> <strong className="text-slate-800">₹{fmt(viewCustomer.credit_limit)}</strong></div>
                      <div><span className="text-slate-400">Credit Days:</span> <strong className="text-slate-800">{viewCustomer.credit_days || 0} days</strong></div>
                      <div><span className="text-slate-400">Advance Balance:</span> <strong className="text-emerald-600">₹{fmt(viewCustomer.advance_balance)}</strong></div>
                      <div><span className="text-slate-400">Pending Amount:</span> <strong className="text-rose-600">₹{fmt(viewCustomer.pending_amount)}</strong></div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-slate-400">Failed to load customer profile.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ADD CUSTOMER MODAL ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full">
            <CustomerForm
              onSuccess={() => {
                setShowAddModal(false);
                fetchCustomers();
                fetchAllHistory();
              }}
              onCancel={() => setShowAddModal(false)}
            />
          </div>
        </div>
      )}

      {/* ── EDIT CUSTOMER MODAL ── */}
      {showEditModal && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full">
            <EditCustomer
              customerId={editCustomerId}
              onSuccess={() => {
                setShowEditModal(false);
                fetchCustomers();
                fetchAllHistory();
              }}
              onCancel={() => setShowEditModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}