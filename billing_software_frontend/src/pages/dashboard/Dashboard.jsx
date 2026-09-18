import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell
} from "recharts";
import {
  TrendingUp, TrendingDown, Package, AlertTriangle,
  BarChart2, BarChart3, Wallet, Clock, IndianRupee, Bell, ChevronDown,
  Lock, LogOut, Plus, ReceiptText, PackagePlus, UserPlus, Truck,
  FolderPlus, Building2, CheckCircle2, ArrowUpRight, ShieldCheck,
  AlertCircle, RotateCw, ExternalLink, Calendar, Search, CreditCard,
  Sparkles, Filter, Users, Layers, Activity, ArrowRight, CheckCircle
} from "lucide-react";
import StatCard from "../../components/ui/StatCard";
import StatusBadge from "../../components/ui/StatusBadge";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-xl px-4 py-3 shadow-2xl border border-slate-700/50">
      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
        {label} Billings
      </div>
      <div className="text-base font-bold text-indigo-400 font-display">
        ₹{Number(payload[0].value).toLocaleString("en-IN")}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user?.role === "admin";
  const isCashier = user?.role === "cashier";

  const [showProfile, setShowProfile] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const bellRef = useRef(null);
  const profileRef = useRef(null);

  /* ── Company State ── */
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(
    localStorage.getItem("selected_company_id") || ""
  );

  /* ── Data State ── */
  const [stats, setStats] = useState({ total_sales: 0, total_products: 0, monthly_sales: [] });
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [creditStats, setCreditStats] = useState({
    total_credit_sales: 0,
    total_outstanding: 0,
    overdue_amount: 0,
    today_collection: 0,
  });
  const [creditList, setCreditList] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [unsoldProducts, setUnsoldProducts] = useState([]);
  const [overdueList, setOverdueList] = useState([]);

  /* ── UI & Interactivity State ── */
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [chartTab, setChartTab] = useState("invoices");
  const [chartType, setChartType] = useState("area"); // "area" | "bar"
  const [activeBar, setActiveBar] = useState(null);
  const [tableSearch, setTableSearch] = useState("");

  /* ── Load Companies on Mount ── */
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const adminId = user.role === "cashier" ? user.admin_id : user.id;
        const res = await api.get(
          `/company/get_companies_by_admin?admin_id=${adminId}&role=${user.role}`
        );
        if (res.data.status) {
          setCompanies(res.data.data || []);
          if (!localStorage.getItem("selected_company_id") && res.data.data.length > 0) {
            const firstId = String(res.data.data[0].id);
            setSelectedCompany(firstId);
            localStorage.setItem("selected_company_id", firstId);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadCompanies();
  }, []);

  /* ── Fetch All Dashboard Data when company changes ── */
  useEffect(() => {
    if (!selectedCompany) return;
    fetchAllData(selectedCompany);
  }, [selectedCompany]);

  const fetchAllData = async (companyId) => {
    setLoading(true);
    await Promise.all([
      fetchStats(companyId),
      fetchLowStockProducts(companyId),
      fetchCreditDashboard(companyId),
      fetchRecentInvoices(companyId),
    ]);
    setLoading(false);
  };

  const handleRefresh = async () => {
    if (!selectedCompany) return;
    setIsRefreshing(true);
    await Promise.all([
      fetchAllData(selectedCompany),
      fetchUnsoldProducts(),
      fetchNotifications(),
    ]);
    setTimeout(() => setIsRefreshing(false), 450);
  };

  const fetchStats = async (companyId) => {
    try {
      const [basic, analytics] = await Promise.all([
        api.get(`/dashboard/get_stats?company_id=${companyId}`),
        api.get(`/dashboard/get_analytics?company_id=${companyId}`),
      ]);
      if (basic.data.status && analytics.data.status) {
        setStats({ ...basic.data.data, monthly_sales: analytics.data.data.monthly_sales || [] });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLowStockProducts = async (companyId) => {
    try {
      const res = await api.get(`/product/get?company_id=${companyId}`);
      if (res.data.status) {
        setLowStockProducts(
          res.data.data.filter((p) => p.status === "active" && Number(p.stock) <= 5)
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRecentInvoices = async (companyId) => {
    try {
      const res = await api.get(`/invoice/get_all_invoice?company_id=${companyId}`);
      if (res.data.status) {
        setInvoices(res.data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUnsoldProducts = async () => {
    try {
      const res = await api.get(
        `/dashboard/get_unsold_products_notification?company_id=${selectedCompany}`
      );
      if (res.data.status) {
        setUnsoldProducts(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedCompany) {
      fetchUnsoldProducts();
    }
  }, [selectedCompany]);

  const fetchCreditDashboard = async (companyId) => {
    try {
      const res = await api.get(`/dashboard/get_dashboard?company_id=${companyId}`);
      if (res.data.status) {
        setCreditStats(res.data.cards || {});
        setCreditList(res.data.list || []);
        const overdue = (res.data.list || []).filter((c) => c.status === "Overdue");
        setOverdueList(overdue);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchNotifications = async () => {
    try {
      const adminId = user.role === "cashier" ? user.admin_id : user.id;
      const res = await api.get(
        `/dashboard/get_admin_overdue_notifications?admin_id=${adminId}`
      );
      if (res.data.status) {
        setOverdueList(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  /* ── Company Change Handler ── */
  const handleCompanyChange = (e) => {
    const id = e.target.value;
    setSelectedCompany(id);
    localStorage.setItem("selected_company_id", id);
  };

  /* ── Close Popovers on Click Outside ── */
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest(".notif-bell")) setShowNotif(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Derived Analytics & Performance Metrics ── */
  const activeCompany = companies.find((c) => String(c.id) === String(selectedCompany));

  const totalAlerts = overdueList.length + unsoldProducts.length;

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, []);

  const peakMonth = useMemo(() => {
    if (!stats.monthly_sales || stats.monthly_sales.length === 0) {
      return { month: "N/A", total: 0 };
    }
    return stats.monthly_sales.reduce(
      (max, cur) => (cur.total > max.total ? cur : max),
      { month: "N/A", total: 0 }
    );
  }, [stats.monthly_sales]);

  const activeMonths = useMemo(
    () => (stats.monthly_sales || []).filter((m) => m.total > 0),
    [stats.monthly_sales]
  );

  const avgMonthlyBilling = useMemo(() => {
    if (activeMonths.length === 0) return 0;
    const sum = activeMonths.reduce((acc, cur) => acc + cur.total, 0);
    return Math.round(sum / activeMonths.length);
  }, [activeMonths]);

  const collectionRate = useMemo(() => {
    const total = Number(stats.total_sales) || 0;
    const outstanding = Number(creditStats.total_outstanding) || 0;
    if (total <= 0) return 100;
    const collected = Math.max(0, total - outstanding);
    return Math.min(100, Math.max(0, Math.round((collected / total) * 100)));
  }, [stats.total_sales, creditStats.total_outstanding]);

  const avgTicket = useMemo(() => {
    if (!invoices.length || !stats.total_sales) return 0;
    return Math.round(stats.total_sales / invoices.length);
  }, [invoices.length, stats.total_sales]);

  /* ── Filtered Tables based on search ── */
  const filteredInvoices = useMemo(() => {
    if (!tableSearch.trim()) return invoices.slice(0, 10);
    const q = tableSearch.toLowerCase();
    return invoices
      .filter(
        (inv) =>
          inv.invoice_no?.toLowerCase().includes(q) ||
          inv.customer_name?.toLowerCase().includes(q) ||
          inv.cashier_name?.toLowerCase().includes(q) ||
          inv.payment_method?.toLowerCase().includes(q)
      )
      .slice(0, 15);
  }, [invoices, tableSearch]);

  const filteredCreditList = useMemo(() => {
    if (!tableSearch.trim()) return creditList;
    const q = tableSearch.toLowerCase();
    return creditList.filter((c) => c.customer?.toLowerCase().includes(q));
  }, [creditList, tableSearch]);

  const filteredLowStock = useMemo(() => {
    if (!tableSearch.trim()) return lowStockProducts;
    const q = tableSearch.toLowerCase();
    return lowStockProducts.filter((p) => p.product_name?.toLowerCase().includes(q));
  }, [lowStockProducts, tableSearch]);

  const filteredUnsold = useMemo(() => {
    if (!tableSearch.trim()) return unsoldProducts;
    const q = tableSearch.toLowerCase();
    return unsoldProducts.filter((p) => p.product_name?.toLowerCase().includes(q));
  }, [unsoldProducts, tableSearch]);

  const TAB_DEFS = [
    { key: "invoices", label: "Live Invoices Feed", icon: ReceiptText, count: invoices.length },
    { key: "sales", label: "Monthly Analytics", icon: BarChart2 },
    { key: "outstanding", label: "Receivables & Dues", icon: Wallet, count: creditList.length },
    { key: "lowstock", label: "Low Stock Alert", icon: AlertTriangle, count: lowStockProducts.length },
    { key: "unsold", label: "Dormant Inventory", icon: Package, count: unsoldProducts.length },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* ── 1. EXECUTIVE HEADER & BRANCH TELEMETRY ── */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
            <Activity size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
                Executive Overview
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Business Telemetry
              </span>
              <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-slate-500 bg-slate-100">
                <Calendar size={12} />
                {formattedDate}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Real-time revenue monitoring, billing feeds, collection health, and stock alerts.
            </p>
          </div>
        </div>

        {/* Right Header Toolbar: Company Branch Selector, Sync Button & Notifications */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Branch / Company Selector */}
          <div className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl px-3.5 py-2 transition shadow-inner">
            <Building2 size={16} className="text-indigo-600 flex-shrink-0" />
            <select
              value={selectedCompany}
              onChange={handleCompanyChange}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-2 max-w-[190px] truncate"
            >
              <option value="">Select Branch</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name}
                </option>
              ))}
            </select>
          </div>

          {/* Sync / Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing || !selectedCompany}
            title="Synchronize Live Telemetry"
            className="h-10 px-3 rounded-2xl bg-white border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50 text-slate-700 hover:text-indigo-600 transition flex items-center gap-2 font-bold text-xs cursor-pointer shadow-sm disabled:opacity-50"
          >
            <RotateCw size={15} className={isRefreshing ? "animate-spin text-indigo-600" : ""} />
            <span className="hidden sm:inline">{isRefreshing ? "Syncing..." : "Sync"}</span>
          </button>

          {/* Business Alerts Bell Notification */}
          {isAdmin && (
            <div ref={bellRef} className="relative">
              <button
                type="button"
                onClick={() => setShowNotif((v) => !v)}
                className={`notif-bell w-10 h-10 rounded-2xl border flex items-center justify-center transition cursor-pointer relative shadow-sm ${
                  showNotif
                    ? "bg-indigo-50 border-indigo-200 text-indigo-600 ring-2 ring-indigo-500/20"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
                title="Business Alerts & Receivables"
              >
                <Bell size={17} />
                {totalAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center shadow-md animate-pulse">
                    {totalAlerts}
                  </span>
                )}
              </button>

              {showNotif && (
                <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/30 flex items-center justify-center">
                        <Bell size={14} className="text-indigo-300" />
                      </div>
                      <div>
                        <span className="text-xs font-bold font-display uppercase tracking-wider block">
                          Critical Business Alerts
                        </span>
                        <span className="text-[10px] text-slate-400">Actionable items requiring attention</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-sm">
                      {totalAlerts} pending
                    </span>
                  </div>

                  <div className="max-h-80 overflow-y-auto paysplitx-scrollbar-light divide-y divide-slate-100">
                    {overdueList.length > 0 && (
                      <div>
                        <div className="px-4 py-2.5 bg-rose-50/80 text-[11px] font-bold text-rose-800 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <AlertCircle size={13} className="text-rose-600" />
                            Overdue Customer Balances
                          </span>
                          <span className="text-[10px] bg-rose-200/70 text-rose-900 px-1.5 py-0.2 rounded font-black">
                            {overdueList.length}
                          </span>
                        </div>
                        {overdueList.map((c, i) => (
                          <div
                            key={i}
                            onClick={() => {
                              setShowNotif(false);
                              navigate("/sales/payment-in");
                            }}
                            className="p-3.5 hover:bg-slate-50 flex items-center justify-between cursor-pointer transition"
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-800">{c.customer}</p>
                              <p className="text-[11px] text-rose-600 font-medium">Due: {c.due_date}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-extrabold text-rose-600">
                                ₹{Number(c.outstanding).toLocaleString("en-IN")}
                              </span>
                              <span className="text-[10px] text-indigo-600 block font-semibold hover:underline">
                                Collect →
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {unsoldProducts.length > 0 && (
                      <div>
                        <div className="px-4 py-2.5 bg-amber-50/80 text-[11px] font-bold text-amber-800 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Package size={13} className="text-amber-600" />
                            Dormant / Unsold Inventory
                          </span>
                          <span className="text-[10px] bg-amber-200/70 text-amber-900 px-1.5 py-0.2 rounded font-black">
                            {unsoldProducts.length}
                          </span>
                        </div>
                        {unsoldProducts.map((p, i) => (
                          <div
                            key={i}
                            onClick={() => {
                              setShowNotif(false);
                              navigate("/products");
                            }}
                            className="p-3.5 hover:bg-slate-50 flex items-center justify-between cursor-pointer transition"
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-800">{p.product_name}</p>
                              <p className="text-[11px] text-amber-600">
                                {p.last_sale === "Never Billed" ? "Never billed" : `No billing for ${p.days} days`}
                              </p>
                            </div>
                            <span className="text-[11px] text-indigo-600 font-bold hover:underline">
                              Manage →
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {totalAlerts === 0 && (
                      <div className="p-8 text-center text-slate-400">
                        <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                        <p className="text-xs font-bold text-slate-700">All balances & stock healthy!</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">No immediate alerts requiring action.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Profile dropdown */}
          <div ref={profileRef} className="relative">
            <button
              type="button"
              onClick={() => setShowProfile((v) => !v)}
              className="flex items-center gap-2 h-10 px-3 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 transition cursor-pointer shadow-sm"
            >
              <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <span className="text-xs font-bold text-slate-800 max-w-[90px] truncate hidden sm:inline">
                {user?.name}
              </span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {showProfile && (
              <div className="absolute right-0 top-12 w-52 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 py-1.5">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-800 truncate">{user?.name}</p>
                  <p className="text-[10px] text-indigo-600 font-black uppercase tracking-wider">{user?.role}</p>
                </div>
                {(user.role === "admin" || user.role === "cashier") && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfile(false);
                      navigate("/change-password");
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium transition cursor-pointer"
                  >
                    <Lock size={14} className="text-slate-400" />
                    <span>Change Password</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await api.post("/auth/logout", { id: user.id, role: user.role });
                    } catch (err) {
                      console.error(err);
                    }
                    localStorage.clear();
                    navigate("/");
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-bold border-t border-slate-100 transition cursor-pointer"
                >
                  <LogOut size={14} className="text-rose-500" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {!selectedCompany ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <Building2 size={32} />
          </div>
          <h2 className="text-lg font-bold text-slate-800 font-display">Select a Company Branch</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Choose a business entity from the branch selector above to activate real-time financial tracking and charts.
          </p>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center h-80 gap-3 text-sm font-bold text-indigo-600 bg-white rounded-3xl border border-slate-200/80 shadow-sm">
          <span className="w-7 h-7 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <span>Synchronizing executive telemetry & ledger balances...</span>
        </div>
      ) : (
        <>
          {/* ── 2. FAST ACTION LAUNCHPAD ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <button
              type="button"
              onClick={() => navigate(isCashier ? "/billing" : "/sales/invoices")}
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-white hover:bg-indigo-50/70 border border-slate-200/80 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 transition shadow-sm group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition">
                <ReceiptText size={18} />
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-bold truncate">
                  {isCashier ? "POS Billing" : "Sale Invoices"}
                </p>
                <p className="text-[10px] text-slate-400 truncate">Create & print bill</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate("/customer")}
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-white hover:bg-emerald-50/70 border border-slate-200/80 hover:border-emerald-200 text-slate-700 hover:text-emerald-700 transition shadow-sm group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition">
                <UserPlus size={18} />
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-bold truncate">Add Customer</p>
                <p className="text-[10px] text-slate-400 truncate">Parties & ledger</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate("/products")}
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-white hover:bg-amber-50/70 border border-slate-200/80 hover:border-amber-200 text-slate-700 hover:text-amber-700 transition shadow-sm group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white flex items-center justify-center transition">
                <PackagePlus size={18} />
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-bold truncate">Inventory SKUs</p>
                <p className="text-[10px] text-slate-400 truncate">Products & stocks</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate("/sales/payment-in")}
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-white hover:bg-violet-50/70 border border-slate-200/80 hover:border-violet-200 text-slate-700 hover:text-violet-700 transition shadow-sm group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white flex items-center justify-center transition">
                <IndianRupee size={18} />
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-bold truncate">Payment-In</p>
                <p className="text-[10px] text-slate-400 truncate">Collect customer dues</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate("/reports")}
              className="col-span-2 sm:col-span-1 flex items-center gap-3 p-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 text-slate-700 hover:text-indigo-600 transition shadow-sm group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white flex items-center justify-center transition">
                <BarChart3 size={18} />
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-bold truncate">Financial Hub</p>
                <p className="text-[10px] text-slate-400 truncate">GST & P&L reports</p>
              </div>
            </button>
          </div>

          {/* ── 3. EXECUTIVE 5-METRIC KPI RIBBON ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              title="Total Gross Revenue"
              value={stats.total_sales || 0}
              prefix="₹"
              icon={TrendingUp}
              accent="indigo"
              change={invoices.length > 0 ? `${invoices.length} Bills` : undefined}
              subtitle={avgTicket > 0 ? `Avg ticket ₹${avgTicket.toLocaleString("en-IN")}` : "Lifetime turnover"}
            />
            <StatCard
              title="Today's Collections"
              value={creditStats.today_collection || 0}
              prefix="₹"
              icon={IndianRupee}
              accent="emerald"
              trend="up"
              badge="Cash & UPI"
              subtitle="Daily realization"
            />
            <StatCard
              title="Total Outstanding"
              value={creditStats.total_outstanding || 0}
              prefix="₹"
              icon={Wallet}
              accent="rose"
              badge={`${creditList.length} Parties`}
              subtitle="Customer credit ledger"
            />
            <StatCard
              title="Overdue Receivables"
              value={creditStats.overdue_amount || 0}
              prefix="₹"
              icon={Clock}
              accent="amber"
              badge={overdueList.length > 0 ? `${overdueList.length} Critical` : "Clear"}
              subtitle="Past maturity date"
            />
            <StatCard
              title="Active Inventory"
              value={stats.total_products || 0}
              suffix=" SKUs"
              icon={Package}
              accent="cyan"
              badge={lowStockProducts.length > 0 ? `${lowStockProducts.length} Low` : "Optimal"}
              subtitle={lowStockProducts.length > 0 ? "Requires restock" : "Healthy levels"}
            />
          </div>

          {/* ── 4. DUAL ANALYTICS & CASHFLOW INTELLIGENCE ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Financial Visualization (2 Cols) */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-900 font-display tracking-tight">
                        Revenue Dynamics & Billings
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        FY 2026
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 font-medium">
                      Historical billings trend across the calendar months
                    </p>
                  </div>

                  {/* Chart Style Switcher (Area vs Bar) */}
                  <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/80 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setChartType("area")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        chartType === "area"
                          ? "bg-white text-indigo-600 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Area Curve
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartType("bar")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        chartType === "bar"
                          ? "bg-white text-indigo-600 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Bar Columns
                    </button>
                  </div>
                </div>

                {/* Performance Summary Pill Header */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/60">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Peak Month
                    </span>
                    <span className="text-xs font-extrabold text-slate-800">
                      {peakMonth.month} (₹{peakMonth.total.toLocaleString("en-IN")})
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Monthly Average
                    </span>
                    <span className="text-xs font-extrabold text-indigo-600">
                      ₹{avgMonthlyBilling.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Billing Velocity
                    </span>
                    <span className="text-xs font-extrabold text-emerald-600">
                      {activeMonths.length} Active Periods
                    </span>
                  </div>
                </div>

                {/* Recharts Container */}
                <div className="h-64 sm:h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === "area" ? (
                      <AreaChart data={stats.monthly_sales}>
                        <defs>
                          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) =>
                            `₹${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`
                          }
                        />
                        <Tooltip
                          content={<CustomTooltip />}
                          cursor={{ stroke: "#6366f1", strokeWidth: 1.5, strokeDasharray: "4 4" }}
                        />
                        <Area
                          type="monotone"
                          dataKey="total"
                          stroke="#4f46e5"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#areaGrad)"
                        />
                      </AreaChart>
                    ) : (
                      <BarChart
                        data={stats.monthly_sales}
                        barSize={24}
                        onMouseMove={(s) =>
                          setActiveBar(s.isTooltipActive ? s.activeTooltipIndex : null)
                        }
                        onMouseLeave={() => setActiveBar(null)}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) =>
                            `₹${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`
                          }
                        />
                        <Tooltip
                          content={<CustomTooltip />}
                          cursor={{ fill: "rgba(99, 102, 241, 0.05)", radius: 8 }}
                        />
                        <defs>
                          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4f46e5" stopOpacity={1} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.8} />
                          </linearGradient>
                        </defs>
                        <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                          {stats.monthly_sales.map((_, i) => (
                            <Cell
                              key={i}
                              fill={
                                activeBar === null
                                  ? "url(#barGrad)"
                                  : activeBar === i
                                  ? "#3730a3"
                                  : "#c7d2fe"
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Financial Health & Cashflow Breakdown Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900 font-display tracking-tight">
                      Ledger Health & Flow
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Realization & recovery ratio</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ShieldCheck size={18} />
                  </div>
                </div>

                {/* Circular Efficiency Progress */}
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/60 mb-5 text-center">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Realization Efficiency
                  </span>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-black text-slate-900 font-display">
                      {collectionRate}%
                    </span>
                    <span className="text-xs font-bold text-emerald-600">Collected</span>
                  </div>
                  {/* Visual Progress Bar */}
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden mt-3">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${collectionRate}%` }}
                    />
                  </div>
                </div>

                {/* Breakdown Details */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <div>
                        <span className="text-xs font-bold text-slate-700 block">Today's Inflow</span>
                        <span className="text-[10px] text-slate-400">Cash & instant pay</span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-slate-800">
                      ₹{Number(creditStats.today_collection || 0).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      <div>
                        <span className="text-xs font-bold text-slate-700 block">Credit Billings</span>
                        <span className="text-[10px] text-slate-400">Billed on credit</span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-slate-800">
                      ₹{Number(creditStats.total_credit_sales || 0).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <div>
                        <span className="text-xs font-bold text-slate-700 block">Uncollected Balance</span>
                        <span className="text-[10px] text-slate-400">Pending recovery</span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-rose-600">
                      ₹{Number(creditStats.total_outstanding || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium">
                  {overdueList.length} accounts overdue
                </span>
                <button
                  type="button"
                  onClick={() => navigate("/sales/payment-in")}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition cursor-pointer"
                >
                  <span>Record Inward</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* ── 5. COMMAND CENTER TABBED DATA TABLES ── */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            {/* Header Tabs & Quick Filter */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between p-4 bg-slate-50/70 border-b border-slate-200/80 gap-3">
              <div className="flex items-center gap-2 overflow-x-auto paysplitx-scrollbar-light pb-1 md:pb-0">
                {TAB_DEFS.map((t) => {
                  const active = chartTab === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => {
                        setChartTab(t.key);
                        setTableSearch("");
                      }}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer select-none ${
                        active
                          ? "bg-white text-indigo-600 shadow-sm border border-slate-200/80"
                          : "text-slate-500 hover:text-slate-800 hover:bg-white/60"
                      }`}
                    >
                      <t.icon size={15} />
                      <span>{t.label}</span>
                      {t.count !== undefined && t.count > 0 && (
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                          t.key === "lowstock" || t.key === "unsold"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-indigo-100 text-indigo-700"
                        }`}>
                          {t.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* In-table Search Bar */}
              {chartTab !== "sales" && (
                <div className="relative min-w-[220px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Quick search entries..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-inner"
                  />
                  {tableSearch && (
                    <button
                      type="button"
                      onClick={() => setTableSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Tab Body */}
            <div className="p-5 sm:p-6">
              {/* TAB 1: LIVE INVOICES FEED */}
              {chartTab === "invoices" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 font-display">
                        Recent Billing Transactions
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Latest sales invoices issued from this company branch
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate("/sales/invoices")}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition cursor-pointer"
                    >
                      <span>View All Invoices</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse psx-table">
                      <thead>
                        <tr>
                          <th>Invoice #</th>
                          <th>Customer</th>
                          <th>Date</th>
                          <th>Payment Method</th>
                          <th>Created By</th>
                          <th>Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInvoices.length > 0 ? (
                          filteredInvoices.map((inv) => {
                            const balance = Number(inv.balance_amount) || 0;
                            const isPaid = balance <= 0;
                            return (
                              <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                                <td className="font-mono text-xs font-bold text-indigo-600">
                                  {inv.invoice_no || `INV-${inv.id}`}
                                </td>
                                <td>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-800 text-xs">
                                      {inv.customer_name || "Cash Customer"}
                                    </span>
                                  </div>
                                </td>
                                <td className="text-slate-500 text-xs">
                                  {inv.created_at ? new Date(inv.created_at).toLocaleDateString("en-IN") : "-"}
                                </td>
                                <td>
                                  <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                                    {inv.payment_method || inv.payment_type || "Cash"}
                                  </span>
                                </td>
                                <td className="text-slate-600 text-xs font-medium">
                                  {inv.cashier_name || "Admin"}
                                </td>
                                <td>
                                  <span className="font-black text-slate-900 text-xs">
                                    ₹{Number(inv.total_amount || 0).toLocaleString("en-IN")}
                                  </span>
                                </td>
                                <td>
                                  <StatusBadge
                                    status={isPaid ? "paid" : "pending"}
                                    label={isPaid ? "Fully Paid" : `₹${balance.toLocaleString("en-IN")} Due`}
                                    size="sm"
                                  />
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                              <ReceiptText size={32} className="mx-auto text-slate-300 mb-2" />
                              No billing transactions recorded yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: MONTHLY REVENUE EXPANDED */}
              {chartTab === "sales" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 font-display">
                        Calendar Year Turnover Log
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Monthly aggregated billing totals recorded for FY 2026
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    {stats.monthly_sales.map((m, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-2xl border transition ${
                          m.total > 0
                            ? "bg-indigo-50/40 border-indigo-100"
                            : "bg-slate-50/50 border-slate-200/60"
                        }`}
                      >
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          {m.month}
                        </span>
                        <span className="text-sm font-black text-slate-800 block mt-1">
                          ₹{Number(m.total).toLocaleString("en-IN")}
                        </span>
                        <span className={`text-[10px] font-bold block mt-0.5 ${
                          m.total > 0 ? "text-emerald-600" : "text-slate-400"
                        }`}>
                          {m.total > 0 ? "Recorded" : "Zero"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: RECEIVABLES & DUES */}
              {chartTab === "outstanding" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 font-display">
                        Customer Ledger Balances
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        All active customer accounts with uncollected credit dues
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate("/sales/payment-in")}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition cursor-pointer"
                    >
                      <span>Collect Dues</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse psx-table">
                      <thead>
                        <tr>
                          <th>Customer</th>
                          <th>Outstanding Balance</th>
                          <th>Due Date</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCreditList.length > 0 ? (
                          filteredCreditList.map((c, i) => (
                            <tr key={i} className="hover:bg-slate-50/80 transition">
                              <td className="font-bold text-slate-800 text-xs">{c.customer}</td>
                              <td className="font-black text-rose-600 text-xs">
                                ₹{Number(c.outstanding).toLocaleString("en-IN")}
                              </td>
                              <td className="text-slate-500 text-xs">{c.due_date || "-"}</td>
                              <td>
                                <StatusBadge
                                  status={c.status === "Overdue" ? "overdue" : "pending"}
                                  label={c.status}
                                  size="sm"
                                />
                              </td>
                              <td>
                                <button
                                  type="button"
                                  onClick={() => navigate("/sales/payment-in")}
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition cursor-pointer"
                                >
                                  Collect
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                              <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                              Zero outstanding customer receivables recorded!
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: LOW STOCK INVENTORY */}
              {chartTab === "lowstock" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 font-display">
                        Critical Inventory Replenishment Alert
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Products with stock levels at or below 5 units
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate("/products")}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition cursor-pointer"
                    >
                      <span>Inventory Manager</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse psx-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Product Name</th>
                          <th>Sale Price</th>
                          <th>Available Stock</th>
                          <th>Risk Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLowStock.length > 0 ? (
                          filteredLowStock.map((item, i) => (
                            <tr key={item.id} className="hover:bg-slate-50/80 transition">
                              <td className="font-mono text-slate-400 text-xs">
                                {String(i + 1).padStart(2, "0")}
                              </td>
                              <td>
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                                    <Package size={15} />
                                  </div>
                                  <span className="font-bold text-slate-800 text-xs">
                                    {item.product_name}
                                  </span>
                                </div>
                              </td>
                              <td className="font-bold text-slate-700 text-xs">
                                ₹{Number(item.price).toLocaleString("en-IN")}
                              </td>
                              <td>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                                  {item.stock} left
                                </span>
                              </td>
                              <td>
                                <StatusBadge status="danger" label="Replenish Now" size="sm" />
                              </td>
                              <td>
                                <button
                                  type="button"
                                  onClick={() => navigate("/products")}
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                                >
                                  Update Stock
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                              <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                              All inventory items have sufficient stock levels!
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 5: DORMANT / UNSOLD STOCK */}
              {chartTab === "unsold" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 font-display">
                        Dormant & Non-Moving Inventory
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Products with zero billing for 2+ days or never billed
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate("/products")}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition cursor-pointer"
                    >
                      <span>Manage Products</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse psx-table">
                      <thead>
                        <tr>
                          <th>Product Name</th>
                          <th>Inactivity Period</th>
                          <th>Sales Velocity Status</th>
                          <th>Recommendation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUnsold.length > 0 ? (
                          filteredUnsold.map((p, i) => (
                            <tr key={i} className="hover:bg-slate-50/80 transition">
                              <td className="font-bold text-slate-800 text-xs">{p.product_name}</td>
                              <td className="text-slate-600 text-xs font-medium">
                                {p.last_sale === "Never Billed" ? "Never billed" : `No billing for ${p.days} days`}
                              </td>
                              <td>
                                <StatusBadge
                                  status="warning"
                                  label={p.last_sale === "Never Billed" ? "Unmoved Item" : "Dormant"}
                                  size="sm"
                                />
                              </td>
                              <td className="text-slate-500 text-xs">
                                Consider bundle pricing or promotion
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-12 text-center text-slate-400 text-xs">
                              <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                              Healthy turnover! No dormant inventory detected.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}