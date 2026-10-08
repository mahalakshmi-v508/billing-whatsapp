import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Plus,
  BarChart3,
  HelpCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  X,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Headset,
  Sparkles,
  Calendar,
  Tag,
  Building2,
  User,
  ArrowRight,
  Check,
  Zap,
} from "lucide-react";
import api from "../../services/api";
import CreateTicketModal from "./CreateTicketModal";
import HelpdeskDashboard from "./HelpdeskDashboard";
import { useLanguage } from "../../utils/i18n";

export default function TicketList() {
  const { isTamil, t: translate } = useLanguage();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isSupportOrAdmin = ["admin", "superadmin", "support", "developer"].includes(user?.role?.toLowerCase());
  const isDeveloper = user?.role?.toLowerCase() === "developer";

  const [viewMode, setViewMode] = useState("list"); // 'list' or 'analytics'
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Tickets & Stats
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    in_progress: 0,
    waiting_for_customer: 0,
    resolved: 0,
    closed: 0,
  });

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    priority: "all",
    category_id: "all",
    start_date: "",
    end_date: "",
    page: 1,
    per_page: 10,
  });

  const [pagination, setPagination] = useState({
    total: 0,
    per_page: 10,
    current_page: 1,
    last_page: 1,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [filters]);

  const fetchCategories = async () => {
    try {
      const res = await api.get("/ticket/categories");
      if (res.data.status) {
        setCategories(res.data.data || []);
      }
    } catch (err) {
      console.error("Error loading categories", err);
    }
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = {
        user_id: user.id,
        user_role: user.role,
        search: filters.search,
        status: filters.status,
        priority: filters.priority,
        category_id: filters.category_id,
        start_date: filters.start_date,
        end_date: filters.end_date,
        page: filters.page,
        per_page: filters.per_page,
      };

      const res = await api.get("/tickets", {
        params,
        headers: {
          "X-User-Role": user.role,
          "X-User-Id": user.id,
        },
      });

      if (res.data.status) {
        setTickets(res.data.data || []);
        setStats(res.data.stats || {});
        setPagination(res.data.pagination || {});
      }
    } catch (err) {
      console.error("Error fetching tickets", err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStatusChange = async (ticketId, newStatus) => {
    try {
      const res = await api.put(`/tickets/${ticketId}/status`, {
        status: newStatus,
        user_id: user.id,
        user_name: user.name,
        user_role: user.role,
      });
      if (res.data.status) {
        setTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
        );
      }
    } catch (err) {
      alert("Failed to update ticket status.");
    }
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      status: "all",
      priority: "all",
      category_id: "all",
      start_date: "",
      end_date: "",
      page: 1,
      per_page: 10,
    });
  };

  const statusBadges = {
    open: "bg-blue-50 text-blue-700 border-blue-200/90 ring-blue-500/10",
    in_progress: "bg-purple-50 text-purple-700 border-purple-200/90 ring-purple-500/10",
    waiting_for_customer: "bg-amber-50 text-amber-700 border-amber-200/90 ring-amber-500/10",
    resolved: "bg-emerald-50 text-emerald-700 border-emerald-200/90 ring-emerald-500/10",
    closed: "bg-slate-100 text-slate-700 border-slate-200 ring-slate-500/10",
  };

  const priorityBadges = {
    low: "bg-slate-100 text-slate-700 border-slate-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    high: "bg-orange-50 text-orange-700 border-orange-200",
    critical: "bg-rose-50 text-rose-700 border-rose-200 animate-pulse font-extrabold",
  };

  const hasActiveFilters =
    filters.search !== "" ||
    filters.status !== "all" ||
    filters.priority !== "all" ||
    filters.category_id !== "all" ||
    filters.start_date !== "" ||
    filters.end_date !== "";

  if (viewMode === "analytics") {
    return <HelpdeskDashboard onBack={() => setViewMode("list")} />;
  }

  return (
    <div className="p-2 space-y-6 max-w-[1600px] mx-auto text-slate-800 dark:text-slate-100 font-sans pb-16">
      {/* ── TOP HEADER HERO CARD ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 md:p-6 text-white border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 shrink-0">
              <Headset size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                  {isTamil ? "டிக்கெட் மேலாண்மை" : "Ticket Management"}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-[11px] font-bold flex items-center gap-1 shrink-0 whitespace-nowrap">
                  <ShieldCheck size={12} /> {isTamil ? "உதவி மையம் செயலில் உள்ளது" : "Support Desk Active"}
                </span>
                {isSupportOrAdmin && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1 shrink-0 whitespace-nowrap">
                    <Zap size={11} /> {isTamil ? "நிர்வாகி & சேவை மேலாண்மை" : "Admin & SLA Console"}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {isSupportOrAdmin
                  ? (isTamil ? "வாடிக்கையாளர் உதவி கோரிக்கைகள், சேவை டிக்கெட்டுகள், நிலை மாற்றங்கள் மற்றும் பணியாளர் ஒதுக்கீடுகளை நிர்வகிக்கவும்." : "Manage customer support requests, service tickets, status transitions & staff assignments.")
                  : (isTamil ? "உங்கள் உதவி கோரிக்கைகளைக் கண்காணிக்கவும், புதிய டிக்கெட்டுகளை உருவாக்கவும், பணியாளர்களுடன் தொடர்பு கொள்ளவும்." : "Track your active support requests, create new issue tickets, and communicate directly with staff.")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setViewMode("analytics")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-white border border-white/15 text-xs font-bold transition shadow-xs cursor-pointer shrink-0 whitespace-nowrap"
            >
              <BarChart3 size={15} className="text-indigo-300" />
              <span>{isTamil ? "பகுப்பாய்வு" : "Analytics Dashboard"}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white text-xs font-bold transition shadow-md shadow-blue-500/25 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Plus size={16} strokeWidth={2.8} />
              <span>{isTamil ? "+ புதிய டிக்கெட்" : "+ Create Ticket"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI METRIC SUMMARY CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 items-stretch">
        {[
          {
            label: isTamil ? "மொத்த டிக்கெட்டுகள்" : "Total Tickets",
            count: stats.total,
            key: "all",
            icon: Layers,
            bg: "bg-white dark:bg-[#1e293b] border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100",
            countColor: "text-slate-900 dark:text-white",
            iconBg: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100/60 dark:border-indigo-800/40",
            badgeColor: "bg-indigo-600 text-white",
          },
          {
            label: isTamil ? "திறந்தவை" : "Open",
            count: stats.open,
            key: "open",
            icon: Clock,
            bg: "bg-white dark:bg-[#1e293b] border-blue-200/80 dark:border-blue-900/50 text-blue-900 dark:text-blue-200",
            countColor: "text-blue-600 dark:text-blue-400",
            iconBg: "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100/60 dark:border-blue-800/40",
            badgeColor: "bg-blue-600 text-white",
          },
          {
            label: isTamil ? "பரிசீலனையில்" : "In Progress",
            count: stats.in_progress,
            key: "in_progress",
            icon: RefreshCw,
            bg: "bg-white dark:bg-[#1e293b] border-purple-200/80 dark:border-purple-900/50 text-purple-900 dark:text-purple-200",
            countColor: "text-purple-600 dark:text-purple-400",
            iconBg: "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-100/60 dark:border-purple-800/40",
            badgeColor: "bg-purple-600 text-white",
          },
          {
            label: isTamil ? "காத்திருப்பு" : "Waiting Customer",
            count: stats.waiting_for_customer,
            key: "waiting_for_customer",
            icon: AlertCircle,
            bg: "bg-white dark:bg-[#1e293b] border-amber-200/80 dark:border-amber-900/50 text-amber-900 dark:text-amber-200",
            countColor: "text-amber-600 dark:text-amber-400",
            iconBg: "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100/60 dark:border-amber-800/40",
            badgeColor: "bg-amber-600 text-white",
          },
          {
            label: isTamil ? "தீர்க்கப்பட்டது" : "Resolved",
            count: stats.resolved,
            key: "resolved",
            icon: CheckCircle2,
            bg: "bg-white dark:bg-[#1e293b] border-emerald-200/80 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200",
            countColor: "text-emerald-600 dark:text-emerald-400",
            iconBg: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100/60 dark:border-emerald-800/40",
            badgeColor: "bg-emerald-600 text-white",
          },
          {
            label: isTamil ? "மூடப்பட்டது" : "Closed",
            count: stats.closed,
            key: "closed",
            icon: ShieldCheck,
            bg: "bg-white dark:bg-[#1e293b] border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300",
            countColor: "text-slate-600 dark:text-slate-400",
            iconBg: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/40",
            badgeColor: "bg-slate-600 text-white",
          },
        ].map((item) => {
          const isSelected = filters.status === item.key;
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilters({ ...filters, status: item.key, page: 1 })}
              className={`p-3.5 sm:p-4 rounded-2xl border text-left transition select-none shadow-2xs cursor-pointer flex flex-col justify-between ${item.bg} ${isSelected
                ? "ring-2 ring-indigo-500 shadow-md scale-[1.02] border-indigo-500 dark:border-indigo-400"
                : "hover:border-indigo-300 dark:hover:border-slate-700 hover:shadow-xs"
                }`}
            >
              <div className="flex items-start justify-between gap-1.5 min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider block text-slate-500 dark:text-slate-400 truncate min-w-0 flex-1">
                  {item.label}
                </span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-indigo-600 text-white" : item.iconBg}`}>
                  <Icon size={14} />
                </div>
              </div>

              <div className="flex items-baseline justify-between mt-2.5 min-w-0">
                <span className={`text-2xl font-black tracking-tight ${item.countColor}`}>{item.count || 0}</span>
                {isSelected && (
                  <span className="text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-md bg-indigo-600 text-white shadow-2xs shrink-0 whitespace-nowrap">
                    {isTamil ? "தேர்வு" : "Active"}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── FILTER & SEARCH CONSOLE ── */}
      <div className="bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="relative lg:col-span-4">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder={isTamil ? "டிக்கெட் #, தலைப்பு, வாடிக்கையாளர் தேடுக..." : "Search by ticket #, subject, customer..."}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => setFilters({ ...filters, search: "", page: 1 })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Priority Select */}
          <div className="lg:col-span-3">
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value, page: 1 })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition cursor-pointer"
            >
              <option value="all">{isTamil ? "அனைத்து முன்னுரிமைகள்" : "All Priorities"}</option>
              <option value="low">{isTamil ? "குறைந்த முன்னுரிமை" : "Low Priority"}</option>
              <option value="medium">{isTamil ? "நடுத்தர முன்னுரிமை" : "Medium Priority"}</option>
              <option value="high">{isTamil ? "உயர் முன்னுரிமை" : "High Priority"}</option>
              <option value="critical">{isTamil ? "அவசர முன்னுரிமை" : "Critical Priority"}</option>
            </select>
          </div>

          {/* Category Select */}
          <div className="lg:col-span-3">
            <select
              value={filters.category_id}
              onChange={(e) => setFilters({ ...filters, category_id: e.target.value, page: 1 })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition cursor-pointer"
            >
              <option value="all">{isTamil ? "அனைத்து பிரிவுகள்" : "All Categories"}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          <div className="lg:col-span-2 flex items-center">
            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${hasActiveFilters
                ? "bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 shadow-2xs"
                : "bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700/60 opacity-60 cursor-not-allowed"
                }`}
            >
              <RefreshCw size={13} className={hasActiveFilters ? "text-rose-600 dark:text-rose-400 shrink-0" : "shrink-0"} />
              <span className="truncate">{isTamil ? "மீட்டமை" : "Reset Filters"}</span>
            </button>
          </div>
        </div>

        {/* Date Range Sub-Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5 shrink-0 whitespace-nowrap">
            <Calendar size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0" /> {isTamil ? "தேதி வடிகட்டி:" : "Date Filter:"}
          </span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value, page: 1 })}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="text-slate-400 font-medium shrink-0">{isTamil ? "வரை" : "to"}</span>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value, page: 1 })}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* ── TICKET DATA TABLE ── */}
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-14 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{isTamil ? "டிக்கெட்டுகள் ஏற்றப்படுகின்றன..." : "Fetching Support Tickets..."}</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 md:p-16 text-center space-y-3.5 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center border border-indigo-100 dark:border-indigo-800 shadow-2xs">
              <HelpCircle size={28} />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              {isTamil ? "டிக்கெட்டுகள் எதுவும் காணப்படவில்லை" : "No Support Tickets Found"}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {isTamil
                ? "உங்கள் தேடல் அல்லது வடிகட்டலுக்கு ஏற்ற ஆதரவு டிக்கெட்டுகள் எதுவும் இல்லை."
                : "There are no tickets matching your active search, category, or status filter presets."}
            </p>
            <div className="pt-2 flex items-center justify-center gap-2.5">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                >
                  {isTamil ? "வடிகட்டல்களை நீக்கு" : "Clear Filters"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition shadow-sm shadow-indigo-500/20 cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span>{isTamil ? "+ புதிய டிக்கெட்" : "Create New Ticket"}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-max">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/80 text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
                  <th className="py-3.5 px-4 pl-5 whitespace-nowrap">{isTamil ? "டிக்கெட் எண்" : "Ticket #"}</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">{isTamil ? "தலைப்பு & கோரிக்கையாளர்" : "Subject & Requester"}</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">{isTamil ? "பிரிவு" : "Category"}</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">{isTamil ? "முன்னுரிமை" : "Priority"}</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">{isTamil ? "நிலை" : "Status"}</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">{isTamil ? "உருவாக்கிய தேதி" : "Created Date"}</th>
                  <th className="py-3.5 px-4 pr-5 text-right whitespace-nowrap sticky right-0 bg-slate-50 dark:bg-slate-900 z-10">{isTamil ? "செயல்" : "Action"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {tickets.map((t) => {
                  const statusMapTa = {
                    open: "திறந்தது",
                    in_progress: "பரிசீலனையில்",
                    waiting_for_customer: "காத்திருப்பு",
                    resolved: "தீர்க்கப்பட்டது",
                    closed: "மூடப்பட்டது",
                  };
                  const priorityMapTa = {
                    low: "குறைந்த",
                    medium: "நடுத்தர",
                    high: "உயர்",
                    critical: "அவசரம்",
                  };

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition group">
                      {/* Ticket # */}
                      <td className="py-4 px-4 pl-5 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => navigate(`/helpdesk/ticket/${t.id}`)}
                          className="hover:underline cursor-pointer text-left inline-flex items-center gap-1"
                        >
                          #{t.ticket_no}
                        </button>
                      </td>

                      {/* Subject & Requester */}
                      <td className="py-4 px-4 max-w-xs sm:max-w-sm">
                        <div
                          onClick={() => navigate(`/helpdesk/ticket/${t.id}`)}
                          className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition truncate cursor-pointer"
                        >
                          {t.subject}
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                          <span>{isTamil ? `கோரியவர்: ${t.user?.name || "வாடிக்கையாளர்"}` : `By ${t.user?.name || "Customer"}`}</span>
                          {t.company && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold border border-slate-200/60 dark:border-slate-700/60 shrink-0">
                              {t.company.company_name}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className="px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-2xs inline-flex items-center gap-1"
                          style={{
                            backgroundColor: `${t.category?.color}15` || "#eef2ff",
                            color: t.category?.color || "#4f46e5",
                            borderColor: `${t.category?.color}40` || "#c7d2fe",
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: t.category?.color || "#4f46e5" }}
                          />
                          {t.category?.name || (isTamil ? "பொதுவானது" : "General")}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border capitalize shadow-2xs ${priorityBadges[t.priority]}`}>
                          {isTamil ? (priorityMapTa[t.priority] || t.priority) : t.priority}
                        </span>
                      </td>

                      {/* Status / Quick Switch */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {isDeveloper ? (
                          <select
                            value={t.status}
                            onChange={(e) => handleQuickStatusChange(t.id, e.target.value)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize outline-none cursor-pointer ${statusBadges[t.status]}`}
                          >
                            <option value="open">{isTamil ? "திறந்தது" : "Open"}</option>
                            <option value="in_progress">{isTamil ? "பரிசீலனையில்" : "In Progress"}</option>
                            <option value="waiting_for_customer">{isTamil ? "காத்திருப்பு" : "Waiting for Customer"}</option>
                            <option value="resolved">{isTamil ? "தீர்க்கப்பட்டது" : "Resolved"}</option>
                            <option value="closed">{isTamil ? "மூடப்பட்டது" : "Closed"}</option>
                          </select>
                        ) : (
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border capitalize shadow-2xs inline-flex items-center gap-1 ${statusBadges[t.status]}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                            {isTamil ? (statusMapTa[t.status] || t.status) : (t.status ? t.status.replace(/_/g, " ") : "Open")}
                          </span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="py-4 px-4 text-slate-600 dark:text-slate-400 text-[11px] whitespace-nowrap">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{new Date(t.created_at).toLocaleDateString()}</div>
                        <div className="text-slate-400 dark:text-slate-500 text-[10px]">
                          {new Date(t.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-4 px-4 pr-5 text-right whitespace-nowrap sticky right-0 bg-white dark:bg-[#1e293b] group-hover:bg-slate-50 dark:group-hover:bg-slate-800/80 transition z-10">
                        <button
                          type="button"
                          onClick={() => navigate(`/helpdesk/ticket/${t.id}`)}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100/80 dark:border-indigo-800/60 font-bold text-xs transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Eye size={13} />
                          <span>{isTamil ? "பார்வை" : "View"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── PAGINATION CONTROLS ── */}
        {pagination.last_page > 1 && (
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <span>
              {isTamil ? (
                <>
                  பக்கம் <strong className="text-slate-900 dark:text-white font-bold">{pagination.current_page}</strong> /{" "}
                  <strong className="text-slate-900 dark:text-white font-bold">{pagination.last_page}</strong> ({pagination.total} மொத்த டிக்கெட்டுகள்)
                </>
              ) : (
                <>
                  Showing page <strong className="text-slate-900 dark:text-white font-bold">{pagination.current_page}</strong> of{" "}
                  <strong className="text-slate-900 dark:text-white font-bold">{pagination.last_page}</strong> ({pagination.total} total tickets)
                </>
              )}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.current_page <= 1}
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold disabled:opacity-40 transition flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft size={14} /> <span>{isTamil ? "முந்தைய" : "Prev"}</span>
              </button>

              <button
                type="button"
                disabled={pagination.current_page >= pagination.last_page}
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold disabled:opacity-40 transition flex items-center gap-1 cursor-pointer"
              >
                <span>{isTamil ? "அடுத்த" : "Next"}</span> <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── CREATE TICKET MODAL ── */}
      <CreateTicketModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onTicketCreated={() => {
          fetchTickets();
        }}
      />
    </div>
  );
}
