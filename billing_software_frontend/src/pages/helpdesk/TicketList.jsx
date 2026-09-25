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

export default function TicketList() {
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
    <div className="p-2 space-y-6 max-w-[1600px] mx-auto text-slate-800 font-sans pb-16">
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
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">Ticket Management</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-[11px] font-bold flex items-center gap-1">
                  <ShieldCheck size={12} /> Support Desk Active
                </span>
                {isSupportOrAdmin && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                    <Zap size={11} /> Admin & SLA Console
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {isSupportOrAdmin
                  ? "Manage customer support requests, service tickets, status transitions & staff assignments."
                  : "Track your active support requests, create new issue tickets, and communicate directly with staff."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setViewMode("analytics")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-white border border-white/15 text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <BarChart3 size={15} className="text-indigo-300" />
              <span>Analytics Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white text-xs font-bold transition shadow-lg shadow-blue-600/30 cursor-pointer"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Create Ticket</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI METRIC SUMMARY CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {[
          { label: "Total Tickets", count: stats.total, key: "all", icon: Layers, bg: "bg-white border-slate-200/80 text-slate-800", countColor: "text-slate-900" },
          { label: "Open", count: stats.open, key: "open", icon: Clock, bg: "bg-white border-blue-200/80 text-blue-900 bg-gradient-to-b from-white to-blue-50/40", countColor: "text-blue-700" },
          { label: "In Progress", count: stats.in_progress, key: "in_progress", icon: RefreshCw, bg: "bg-white border-purple-200/80 text-purple-900 bg-gradient-to-b from-white to-purple-50/40", countColor: "text-purple-700" },
          { label: "Waiting Customer", count: stats.waiting_for_customer, key: "waiting_for_customer", icon: AlertCircle, bg: "bg-white border-amber-200/80 text-amber-900 bg-gradient-to-b from-white to-amber-50/40", countColor: "text-amber-700" },
          { label: "Resolved", count: stats.resolved, key: "resolved", icon: CheckCircle2, bg: "bg-white border-emerald-200/80 text-emerald-900 bg-gradient-to-b from-white to-emerald-50/40", countColor: "text-emerald-700" },
          { label: "Closed", count: stats.closed, key: "closed", icon: ShieldCheck, bg: "bg-white border-slate-200/80 text-slate-700 bg-gradient-to-b from-white to-slate-50/70", countColor: "text-slate-700" },
        ].map((item) => {
          const isSelected = filters.status === item.key;
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilters({ ...filters, status: item.key, page: 1 })}
              className={`p-4 rounded-2xl border text-left transition select-none shadow-2xs cursor-pointer ${item.bg} ${isSelected
                ? "ring-2 ring-indigo-600 shadow-md scale-[1.02] border-indigo-500"
                : "hover:border-indigo-300 hover:shadow-xs"
                }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider block opacity-70">
                  {item.label}
                </span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                  <Icon size={14} />
                </div>
              </div>

              <div className="flex items-baseline justify-between mt-3">
                <span className={`text-2xl font-black tracking-tight ${item.countColor}`}>{item.count || 0}</span>
                {isSelected && (
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-indigo-600 text-white shadow-2xs">
                    Active
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── FILTER & SEARCH CONSOLE ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="relative lg:col-span-4">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ticket #, subject, customer..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => setFilters({ ...filters, search: "", page: 1 })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
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
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="critical">Critical Priority</option>
            </select>
          </div>

          {/* Category Select */}
          <div className="lg:col-span-3">
            <select
              value={filters.category_id}
              onChange={(e) => setFilters({ ...filters, category_id: e.target.value, page: 1 })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            >
              <option value="all">All Categories</option>
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
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${hasActiveFilters
                ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 shadow-2xs"
                : "bg-slate-100 text-slate-400 border border-slate-200 opacity-60 cursor-not-allowed"
                }`}
            >
              <RefreshCw size={13} className={hasActiveFilters ? "text-rose-600" : ""} />
              <span>Reset Filters</span>
            </button>
          </div>
        </div>

        {/* Date Range Sub-Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-2.5 border-t border-slate-100 text-xs">
          <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Calendar size={13} className="text-indigo-600" /> Date Filter:
          </span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value, page: 1 })}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <span className="text-slate-400 font-medium">to</span>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value, page: 1 })}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* ── TICKET DATA TABLE ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-14 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-slate-500">Fetching Support Tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 md:p-16 text-center space-y-3.5 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center border border-indigo-100 shadow-2xs">
              <HelpCircle size={28} />
            </div>
            <h4 className="text-base font-bold text-slate-900">No Support Tickets Found</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              There are no tickets matching your active search, category, or status filter presets.
            </p>
            <div className="pt-2 flex items-center justify-center gap-2.5">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition shadow-sm shadow-indigo-500/20 cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span>Create New Ticket</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-extrabold uppercase text-slate-500 border-b border-slate-200/80">
                  <th className="py-3.5 px-4 pl-5">Ticket #</th>
                  <th className="py-3.5 px-4">Subject & Requester</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 pr-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition group">
                    {/* Ticket # */}
                    <td className="py-4 px-4 pl-5 font-mono font-bold text-indigo-600">
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
                        className="font-bold text-slate-900 group-hover:text-indigo-600 transition truncate cursor-pointer"
                      >
                        {t.subject}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                        <span>By {t.user?.name || "Customer"}</span>
                        {t.company && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold border border-slate-200/60">
                            {t.company.company_name}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-4 px-4">
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
                        {t.category?.name || "General"}
                      </span>
                    </td>

                    {/* Priority */}
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border capitalize shadow-2xs ${priorityBadges[t.priority]}`}>
                        {t.priority}
                      </span>
                    </td>

                    {/* Status / Quick Switch */}
                    <td className="py-4 px-4">
                      {isDeveloper ? (
                        <select
                          value={t.status}
                          onChange={(e) => handleQuickStatusChange(t.id, e.target.value)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize outline-none cursor-pointer ${statusBadges[t.status]}`}
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="waiting_for_customer">Waiting for Customer</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      ) : (
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border capitalize shadow-2xs inline-flex items-center gap-1 ${statusBadges[t.status]}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                          {t.status ? t.status.replace(/_/g, " ") : "Open"}
                        </span>
                      )}
                    </td>

                    {/* Created Date */}
                    <td className="py-4 px-4 text-slate-600 text-[11px]">
                      <div className="font-semibold text-slate-800">{new Date(t.created_at).toLocaleDateString()}</div>
                      <div className="text-slate-400 text-[10px]">
                        {new Date(t.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-4 px-4 pr-5 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/helpdesk/ticket/${t.id}`)}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── PAGINATION CONTROLS ── */}
        {pagination.last_page > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing page <strong className="text-slate-900 font-bold">{pagination.current_page}</strong> of{" "}
              <strong className="text-slate-900 font-bold">{pagination.last_page}</strong> ({pagination.total} total tickets)
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.current_page <= 1}
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold disabled:opacity-40 transition flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft size={14} /> <span>Prev</span>
              </button>

              <button
                type="button"
                disabled={pagination.current_page >= pagination.last_page}
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold disabled:opacity-40 transition flex items-center gap-1 cursor-pointer"
              >
                <span>Next</span> <ChevronRight size={14} />
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
