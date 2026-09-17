import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  BarChart3,
  HelpCircle,
  Eye,
  RefreshCw,
  X,
  ShieldCheck,
} from "lucide-react";
import api from "../../services/api";
import CreateTicketModal from "./CreateTicketModal";
import HelpdeskDashboard from "./HelpdeskDashboard";
import {
  TableContainer,
  Table,
  Thead,
  Th,
  Tbody,
  Tr,
  Td,
  TablePagination,
  TableEmptyState,
  TableLoadingState,
  TableStatusBadge,
} from "../../components/table";

export default function TicketList() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isSupportOrAdmin = ["admin", "superadmin", "support", "developer"].includes(
    user?.role?.toLowerCase()
  );
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

  const getStatusVariant = (status) => {
    switch (status) {
      case "open":
        return "info";
      case "in_progress":
        return "primary";
      case "waiting_for_customer":
        return "warning";
      case "resolved":
        return "success";
      case "closed":
        return "default";
      default:
        return "default";
    }
  };

  const getPriorityVariant = (priority) => {
    switch (priority) {
      case "critical":
        return "danger";
      case "high":
        return "warning";
      case "medium":
        return "info";
      case "low":
      default:
        return "default";
    }
  };

  if (viewMode === "analytics") {
    return <HelpdeskDashboard onBack={() => setViewMode("list")} />;
  }

  return (
    <div className="space-y-5 pb-16 max-w-7xl mx-auto">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider">
            <ShieldCheck size={16} />
            Support Helpdesk
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Ticket Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isSupportOrAdmin
              ? "Manage all customer support tickets, status transitions & assignments"
              : "Track your support requests, submit new tickets, and communicate with support"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode("analytics")}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition flex items-center gap-2"
          >
            <BarChart3 size={16} />
            Analytics
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm hover:shadow transition flex items-center gap-2"
          >
            <Plus size={16} />
            Create Ticket
          </button>
        </div>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Tickets", count: stats.total, key: "all", bg: "bg-blue-50/70 border-blue-200 text-blue-900", badgeColor: "bg-blue-600 text-white" },
          { label: "Open", count: stats.open, key: "open", bg: "bg-sky-50/70 border-sky-200 text-sky-900", badgeColor: "bg-sky-600 text-white" },
          { label: "In Progress", count: stats.in_progress, key: "in_progress", bg: "bg-indigo-50/70 border-indigo-200 text-indigo-900", badgeColor: "bg-indigo-600 text-white" },
          { label: "Waiting Customer", count: stats.waiting_for_customer, key: "waiting_for_customer", bg: "bg-amber-50/70 border-amber-200 text-amber-900", badgeColor: "bg-amber-600 text-white" },
          { label: "Resolved", count: stats.resolved, key: "resolved", bg: "bg-emerald-50/70 border-emerald-200 text-emerald-900", badgeColor: "bg-emerald-600 text-white" },
          { label: "Closed", count: stats.closed, key: "closed", bg: "bg-slate-100 border-slate-200 text-slate-900", badgeColor: "bg-slate-700 text-white" },
        ].map((item) => {
          const isSelected = filters.status === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setFilters({ ...filters, status: item.key, page: 1 })}
              className={`p-3.5 rounded-xl border text-left transition ${item.bg} ${
                isSelected ? "ring-2 ring-blue-600 shadow-sm scale-[1.02]" : "hover:opacity-90"
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                {item.label}
              </span>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xl font-bold">{item.count || 0}</span>
                {isSelected && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white">
                    Active
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* SEARCH */}
          <div className="relative lg:col-span-2">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ticket #, subject, description..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs outline-none transition"
            />
            {filters.search && (
              <button
                onClick={() => setFilters({ ...filters, search: "", page: 1 })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 text-xs outline-none bg-white font-medium text-slate-700"
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
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 text-xs outline-none bg-white font-medium text-slate-700"
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
              className="w-full px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs transition flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={13} />
              Reset
            </button>
          </div>
        </div>

        {/* DATE RANGE FILTERS */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2.5 border-t border-slate-100 text-xs">
          <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Date Filter:</span>
          <input
            type="date"
            value={filters.start_date}
            onChange={(e) => setFilters({ ...filters, start_date: e.target.value, page: 1 })}
            className="px-2.5 py-1 rounded-md border border-slate-200 text-xs outline-none text-slate-700"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={filters.end_date}
            onChange={(e) => setFilters({ ...filters, end_date: e.target.value, page: 1 })}
            className="px-2.5 py-1 rounded-md border border-slate-200 text-xs outline-none text-slate-700"
          />
        </div>
      </div>

      {/* TICKET DATA TABLE */}
      <TableContainer>
        {loading ? (
          <TableLoadingState message="Fetching support tickets..." />
        ) : tickets.length === 0 ? (
          <TableEmptyState
            title="No Tickets Found"
            description="There are no support tickets matching your active search or filter criteria."
            actionLabel="Create New Ticket"
            onAction={() => setIsCreateOpen(true)}
          />
        ) : (
          <>
            <Table>
              <Thead>
                <tr>
                  <Th>Ticket #</Th>
                  <Th>Subject</Th>
                  <Th>Category</Th>
                  <Th>Priority</Th>
                  <Th>Status</Th>
                  <Th>Created Date</Th>
                  <Th align="right">Action</Th>
                </tr>
              </Thead>
              <Tbody>
                {tickets.map((t) => (
                  <Tr key={t.id}>
                    <Td className="font-mono font-semibold text-blue-600">
                      #{t.ticket_no}
                    </Td>

                    <Td className="max-w-xs">
                      <div className="font-medium text-slate-900 truncate">
                        {t.subject}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        By {t.user?.name || "Customer"} {t.company ? `(${t.company.company_name})` : ""}
                      </div>
                    </Td>

                    <Td>
                      <span
                        className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold border"
                        style={{
                          backgroundColor: t.category?.color ? `${t.category.color}15` : "#eff6ff",
                          color: t.category?.color || "#2563eb",
                          borderColor: t.category?.color ? `${t.category.color}40` : "#bfdbfe",
                        }}
                      >
                        {t.category?.name || "General"}
                      </span>
                    </Td>

                    <Td>
                      <TableStatusBadge
                        variant={getPriorityVariant(t.priority)}
                        label={t.priority}
                        dot={t.priority === "critical"}
                      />
                    </Td>

                    <Td>
                      {isDeveloper ? (
                        <select
                          value={t.status}
                          onChange={(e) => handleQuickStatusChange(t.id, e.target.value)}
                          className="px-2 py-1 rounded-md text-[11px] font-medium border border-slate-200 bg-white text-slate-700 capitalize outline-none cursor-pointer focus:border-blue-500"
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="waiting_for_customer">Waiting for Customer</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      ) : (
                        <TableStatusBadge
                          variant={getStatusVariant(t.status)}
                          label={t.status.replace(/_/g, " ")}
                        />
                      )}
                    </Td>

                    <Td className="text-slate-500 text-[11px]">
                      <div className="font-medium text-slate-700">{new Date(t.created_at).toLocaleDateString()}</div>
                      <div className="text-slate-400 text-[10px]">
                        {new Date(t.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </Td>

                    <Td align="right">
                      <button
                        onClick={() => navigate(`/helpdesk/ticket/${t.id}`)}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold text-xs transition inline-flex items-center gap-1.5"
                      >
                        <Eye size={13} />
                        View
                      </button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>

            <TablePagination
              currentPage={pagination.current_page || filters.page}
              totalPages={pagination.last_page || 1}
              totalItems={pagination.total || 0}
              rowsPerPage={filters.per_page}
              onPageChange={(newPage) => setFilters({ ...filters, page: newPage })}
              onRowsPerPageChange={(newPerPage) =>
                setFilters({ ...filters, per_page: newPerPage, page: 1 })
              }
              itemLabel="tickets"
            />
          </>
        )}
      </TableContainer>

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
