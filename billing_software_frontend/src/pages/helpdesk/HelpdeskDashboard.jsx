import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Activity,
  Layers,
  ShieldAlert,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

export default function HelpdeskDashboard({ onBack }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    total_tickets: 0,
    open_tickets: 0,
    in_progress_tickets: 0,
    waiting_tickets: 0,
    resolved_tickets: 0,
    closed_tickets: 0,
    avg_resolution_hours: 0,
    by_category: [],
    by_priority: { low: 0, medium: 0, high: 0, critical: 0 },
    monthly_trend: [],
    recent_activities: [],
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.get("/helpdesk/analytics", {
        headers: {
          "X-User-Role": user.role,
          "X-User-Id": user.id,
        },
      });
      if (res.data.status) {
        setAnalytics(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load helpdesk analytics", err);
    } finally {
      setLoading(false);
    }
  };

  const priorityColors = {
    low: "bg-slate-500 text-slate-100",
    medium: "bg-amber-500 text-amber-100",
    high: "bg-orange-500 text-orange-100",
    critical: "bg-red-600 text-red-100",
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack || (() => navigate("/helpdesk"))}
            className="p-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="text-indigo-600" size={28} />
              Helpdesk Analytics & Overview
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Performance metrics, status breakdown, resolution times & audit log stream
            </p>
          </div>
        </div>

        <button
          onClick={fetchAnalytics}
          className="px-4 py-2.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold text-xs transition flex items-center gap-2 self-start md:self-auto"
        >
          <Activity size={16} />
          Refresh Stats
        </button>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Total Tickets", count: analytics.total_tickets, color: "from-blue-600 to-indigo-600", icon: Layers },
          { label: "Open", count: analytics.open_tickets, color: "from-sky-500 to-blue-600", icon: HelpCircle },
          { label: "In Progress", count: analytics.in_progress_tickets, color: "from-purple-600 to-indigo-700", icon: Activity },
          { label: "Waiting Customer", count: analytics.waiting_tickets, color: "from-amber-500 to-orange-600", icon: Clock },
          { label: "Resolved", count: analytics.resolved_tickets, color: "from-emerald-500 to-teal-600", icon: CheckCircle2 },
          { label: "Closed", count: analytics.closed_tickets, color: "from-slate-600 to-slate-800", icon: CheckCircle2 },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{card.label}</span>
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${card.color} text-white flex items-center justify-center shadow-sm`}>
                  <Icon size={16} />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-black text-gray-900">{card.count}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* RESOLUTION METRIC + PRIORITY DISTRIBUTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* AVG RESOLUTION TIME */}
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white p-6 rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center gap-2 text-indigo-200 text-xs font-bold uppercase tracking-wider">
              <Clock size={16} />
              Average Resolution Speed
            </div>
            <div className="mt-4">
              <span className="text-5xl font-black">{analytics.avg_resolution_hours}</span>
              <span className="text-lg font-bold text-indigo-200 ml-2">hours</span>
            </div>
            <p className="text-xs text-indigo-200/80 mt-2">
              Average time calculated from ticket creation to final resolution and closure.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-white/15 flex items-center justify-between text-xs">
            <span className="text-indigo-200">SLA Target: &lt; 24 Hours</span>
            <span className="bg-emerald-500/20 text-emerald-300 font-bold px-2.5 py-1 rounded-full border border-emerald-400/30">
              Optimal Performance
            </span>
          </div>
        </div>

        {/* PRIORITY BREAKDOWN */}
        <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <ShieldAlert size={20} className="text-indigo-600" />
            Tickets Distribution by Priority
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(analytics.by_priority || {}).map(([priority, count]) => (
              <div key={priority} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col justify-between">
                <span className="text-xs font-bold capitalize text-gray-500">{priority} Priority</span>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-gray-900">{count}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${priorityColors[priority] || "bg-gray-200"}`}>
                    {priority}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* MONTHLY TREND CHART / BARS */}
          <div className="mt-6">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">6-Month Ticket Volume Trend</h4>
            <div className="flex items-end gap-3 h-28 pt-4 border-b border-gray-100">
              {(analytics.monthly_trend || []).map((m, idx) => {
                const max = Math.max(...(analytics.monthly_trend || []).map((t) => t.count), 1);
                const heightPercent = Math.max((m.count / max) * 100, 12);
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <span className="text-xs font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition">
                      {m.count}
                    </span>
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full bg-indigo-500 group-hover:bg-indigo-600 rounded-t-xl transition-all"
                    />
                    <span className="text-[10px] font-bold text-gray-500 truncate">{m.month.split(" ")[0]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* CATEGORY BREAKDOWN & RECENT AUDIT ACTIVITIES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CATEGORY BREAKDOWN */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Layers size={20} className="text-indigo-600" />
            Tickets by Category
          </h3>

          <div className="space-y-4">
            {(analytics.by_category || []).map((cat) => {
              const total = analytics.total_tickets || 1;
              const percent = Math.round((cat.count / total) * 100);
              return (
                <div key={cat.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-gray-700">{cat.name}</span>
                    <span className="text-gray-900">
                      {cat.count} <span className="text-gray-400 font-normal">({percent}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: cat.color || "#4f46e5",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RECENT AUDIT LOG STREAM */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity size={20} className="text-indigo-600" />
            Live Support Audit Stream
          </h3>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-80 pr-1">
            {(analytics.recent_activities || []).map((log) => (
              <div key={log.id} className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-start justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{log.user_name}</span>
                    <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px] font-semibold uppercase">
                      {log.user_role}
                    </span>
                  </div>
                  <p className="text-gray-600 mt-1 font-medium">{log.action}</p>
                  {log.new_value && (
                    <p className="text-gray-400 text-[11px] mt-0.5 truncate max-w-xs">{log.new_value}</p>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 font-semibold shrink-0">
                  {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
