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
    open: "bg-blue-50 text-blue-700 border-blue-200",
    in_progress: "bg-purple-50 text-purple-700 border-purple-200",
    waiting_for_customer: "bg-amber-50 text-amber-700 border-amber-200",
    resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    closed: "bg-slate-100 text-slate-700 border-slate-200",
  };

  const priorityBadges = {
    low: "bg-slate-100 text-slate-700 border-slate-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    high: "bg-orange-50 text-orange-700 border-orange-200",
    critical: "bg-red-50 text-red-700 border-red-200 animate-pulse",
  };

  if (viewMode === "analytics") {
    return <HelpdeskDashboard onBack={() => setViewMode("list")} />;
  }

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider">
            <ShieldCheck size={16} />
            Support Helpdesk
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Ticket Management</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {isSupportOrAdmin
              ? "Manage all customer support tickets, status transitions & assignments"
              : "Track your support requests, submit new tickets, and communicate with support"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode("analytics")}
            className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition flex items-center gap-2"
          >
            <BarChart3 size={16} />
            Analytics
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#1f8cff] to-[#4338ca] text-white font-bold text-xs shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:opacity-95 transition flex items-center gap-2"
          >
            <Plus size={18} />
            Create Ticket
          </button>
        </div>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Total Tickets", count: stats.total, key: "all", bg: "bg-indigo-50 border-indigo-100 text-indigo-900", badgeColor: "bg-indigo-600 text-white" },
          { label: "Open", count: stats.open, key: "open", bg: "bg-blue-50 border-blue-100 text-blue-900", badgeColor: "bg-blue-600 text-white" },
          { label: "In Progress", count: stats.in_progress, key: "in_progress", bg: "bg-purple-50 border-purple-100 text-purple-900", badgeColor: "bg-purple-600 text-white" },
          { label: "Waiting Customer", count: stats.waiting_for_customer, key: "waiting_for_customer", bg: "bg-amber-50 border-amber-100 text-amber-900", badgeColor: "bg-amber-600 text-white" },
          { label: "Resolved", count: stats.resolved, key: "resolved", bg: "bg-emerald-50 border-emerald-100 text-emerald-900", badgeColor: "bg-emerald-600 text-white" },
          { label: "Closed", count: stats.closed, key: "closed", bg: "bg-slate-100 border-slate-200 text-slate-900", badgeColor: "bg-slate-700 text-white" },
        ].map((item) => {
          const isSelected = filters.status === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setFilters({ ...filters, status: item.key, page: 1 })}
              className={`p-4 rounded-2xl border text-left transition ${item.bg} ${isSelected ? "ring-2 ring-indigo-600 shadow-md scale-[1.02]" : "hover:opacity-90"
                }`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider block opacity-70">
                {item.label}
              </span>
              <div className="flex items-center justify-between mt-2">
                <span className="text-2xl font-black">{item.count || 0}</span>
                {isSelected && <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-600 text-white">Active</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* SEARCH */}
          <div className="relative lg:col-span-2">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ticket #, subject, description..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-xs outline-none transition"
            />
            {filters.search && (
              <button
                onClick={() => setFilters({ ...filters, search: "", page: 1 })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* PRIORITY FILTER */}
          <div>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value, page: 1 })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 text-xs outline-none bg-white font-medium"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="critical">Critical Priority</option>
            </select>
          </div>

          {/* CATEGORY FILTER */}
          <div>
            <select
              value={filters.category_id}
              onChange={(e) => setFilters({ ...filters, category_id: e.target.value, page: 1 })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 text-xs outline-none bg-white font-medium"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* RESET BUTTON */}
          <div className="flex items-center gap-2">
            <button
              onClick={resetFilters}
              className="w-full px-3 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs transition flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={14} />
              Reset Filters
            </button>
          </div>
        </div>

        {/* DATE RANGE FILTERS */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100 text-xs">
          <span className="font-bold text-gray-500 uppercase tracking-wider">Date Filter:</span>
          <input
            type="date"
            value={filters.start_date}
            onChange={(e) => setFilters({ ...filters, start_date: e.target.value, page: 1 })}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={filters.end_date}
            onChange={(e) => setFilters({ ...filters, end_date: e.target.value, page: 1 })}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none"
          />
        </div>
      </div>

      {/* TICKET DATA TABLE / GRID */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-gray-400">Fetching Support Tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
              <HelpCircle size={28} />
            </div>
            <h4 className="text-base font-bold text-gray-900">No Tickets Found</h4>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              There are no support tickets matching your active search or filter criteria.
            </p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition"
            >
              Create New Ticket
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Ticket #</th>
                  <th className="py-3.5 px-4">Subject</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/60 transition group">
                    <td className="py-4 px-4 font-mono font-bold text-indigo-600">
                      #{t.ticket_no}
                    </td>

                    <td className="py-4 px-4 max-w-xs">
                      <div className="font-bold text-gray-900 group-hover:text-indigo-600 transition truncate">
                        {t.subject}
                      </div>
                      <div className="text-[11px] text-gray-400 truncate">
                        By {t.user?.name || "Customer"} {t.company ? `(${t.company.company_name})` : ""}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className="px-2.5 py-1 rounded-full text-[11px] font-bold border"
                        style={{
                          backgroundColor: `${t.category?.color}15` || "#eef2ff",
                          color: t.category?.color || "#4f46e5",
                          borderColor: `${t.category?.color}40` || "#c7d2fe",
                        }}
                      >
                        {t.category?.name || "General"}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize ${priorityBadges[t.priority]}`}>
                        {t.priority}
                      </span>
                    </td>

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
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize ${statusBadges[t.status]}`}>
                          {t.status.replace(/_/g, " ")}
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-gray-500 text-[11px]">
                      <div>{new Date(t.created_at).toLocaleDateString()}</div>
                      <div className="text-gray-400 text-[10px]">
                        {new Date(t.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => navigate(`/helpdesk/ticket/${t.id}`)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs transition inline-flex items-center gap-1"
                      >
                        <Eye size={14} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION CONTROLS */}
        {pagination.last_page > 1 && (
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500">
              Showing page <strong className="text-gray-900">{pagination.current_page}</strong> of{" "}
              <strong className="text-gray-900">{pagination.last_page}</strong> ({pagination.total} total tickets)
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={pagination.current_page <= 1}
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 font-semibold disabled:opacity-40 transition flex items-center gap-1"
              >
                <ChevronLeft size={14} /> Prev
              </button>

              <button
                disabled={pagination.current_page >= pagination.last_page}
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 font-semibold disabled:opacity-40 transition flex items-center gap-1"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE TICKET MODAL */}
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
