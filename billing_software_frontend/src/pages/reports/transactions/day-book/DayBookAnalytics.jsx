import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Receipt,
  Sparkles,
  ArrowLeft,
  Users,
  TrendingUp,
} from "lucide-react";

const GROUP_COLORS = ["#7c3aed", "#6366f1", "#0891b2", "#10b981", "#f59e0b", "#f43f5e"];

const fmtINR = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Capitalized({ text }) {
  if (!text) return "-";
  return String(text)
    .split(/[\s_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function CustomBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-xl px-4 py-3 shadow-2xl border border-slate-700/50 text-xs">
      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
        {label || "-"}
      </div>
      {payload.map((item) => (
        <div key={item.dataKey} className="flex items-center justify-between gap-4">
          <span className="text-slate-300">{item.name}:</span>
          <span className="font-bold" style={{ color: item.color }}>
            {fmtINR(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function CustomDonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-xl px-3.5 py-2.5 shadow-2xl border border-slate-700/50 text-xs">
      <div className="font-bold text-slate-200 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.payload.color }} />
        <Capitalized text={item.name} />
      </div>
      <div className="text-slate-400 mt-1">
        Value: <span className="text-white font-semibold">{fmtINR(item.value)}</span>
      </div>
      <div className="text-slate-400">
        Entries: <span className="text-white font-semibold">{item.payload.count}</span> ({item.payload.percent}%)
      </div>
    </div>
  );
}

export default function DayBookAnalytics({
  rows: rowsProp = [],
  date: dateProp = "",
  firmName: firmNameProp = "ALL FIRMS",
  onClose,
}) {
  const locationState = useLocation()?.state || {};

  const rows = rowsProp.length ? rowsProp : locationState.rows || [];
  const date = dateProp || locationState.date || "";
  const firmName = firmNameProp || locationState.firmName || "ALL FIRMS";
  const canClose = typeof onClose === "function";

  const [metricView, setMetricView] = useState("value");

  const moneyTotals = useMemo(() => {
    let moneyIn = 0,
      moneyOut = 0,
      count = 0;
    rows.forEach((t) => {
      moneyIn += Number(t.moneyIn || 0);
      moneyOut += Number(t.moneyOut || 0);
      count += Number(t.count || 1);
    });
    return { moneyIn, moneyOut, net: moneyIn - moneyOut, count };
  }, [rows]);

  const paymentBreakdown = useMemo(() => {
    const map = new Map();
    rows.forEach((t) => {
      const key = (t.paymentType || "other").toLowerCase();
      if (!map.has(key)) map.set(key, { name: key, moneyIn: 0, moneyOut: 0, count: 0 });
      const item = map.get(key);
      item.moneyIn += Number(t.moneyIn || 0);
      item.moneyOut += Number(t.moneyOut || 0);
      item.count += Number(t.count || 1);
    });
    return Array.from(map.values()).sort(
      (a, b) => b.moneyIn + b.moneyOut - (a.moneyIn + a.moneyOut)
    );
  }, [rows]);

  const typeDistribution = useMemo(() => {
    const map = new Map();
    rows.forEach((t) => {
      const name = (t.group || "General").trim();
      if (!map.has(name)) map.set(name, { name, value: 0, count: 0 });
      const item = map.get(name);
      item.value += Number(t.value || 0);
      item.count += Number(t.count || 1);
    });
    const sorted = Array.from(map.values()).sort((a, b) => b.value - a.value);
    const total = sorted.reduce((s, g) => s + g.value, 0) || 1;
    return sorted.map((g, i) => ({
      ...g,
      color: GROUP_COLORS[i % GROUP_COLORS.length],
      percent: ((g.value / total) * 100).toFixed(0),
    }));
  }, [rows]);

  const topParties = useMemo(() => {
    const map = new Map();
    rows.forEach((t) => {
      const name = (t.name || "Unknown").trim();
      if (!map.has(name)) map.set(name, { name, total: 0, count: 0, in: 0, out: 0 });
      const item = map.get(name);
      item.total += Number(t.value || 0);
      item.in += Number(t.moneyIn || 0);
      item.out += Number(t.moneyOut || 0);
      item.count += Number(t.count || 1);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 6);
  }, [rows]);

  const partyMax = Math.max(...topParties.map((p) => p.total), 1);

  const prettyDate = date
    ? new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "All";

  return (
    <div className="space-y-6 transition-all">
      {/* Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            <span>Transactions</span>
            <span>•</span>
            <span>Day Book Analytics</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              Live Filtered
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            Day Book Analytics
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            <span className="font-semibold text-slate-700">{firmName}</span> •{" "}
            <span className="font-semibold text-indigo-600">{prettyDate}</span> •{" "}
            {moneyTotals.count} transaction{moneyTotals.count === 1 ? "" : "s"}
          </p>
        </div>

        {canClose && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs cursor-pointer"
              title="Return to Day Book Report"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>Close</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-slate-500">
              <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ArrowDownLeft className="w-3.5 h-3.5" />
              </span>
              Total Money-In
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-2 tracking-tight">
              {fmtINR(moneyTotals.moneyIn)}
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Collections & inflows for the day
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-500" />
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-slate-500">
              <span className="w-6 h-6 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
              Total Money-Out
            </div>
            <div className="text-2xl sm:text-3xl font-black text-rose-600 mt-2 tracking-tight">
              {fmtINR(moneyTotals.moneyOut)}
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Purchases & outflows for the day
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-600" />
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-slate-500">
              <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Wallet className="w-3.5 h-3.5" />
              </span>
              Net Cash Flow
            </div>
            <div className="text-2xl sm:text-3xl font-black text-indigo-600 mt-2 tracking-tight">
              {fmtINR(moneyTotals.net)}
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Money-In − Money-Out
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-slate-500">
              <span className="w-6 h-6 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center">
                <Receipt className="w-3.5 h-3.5" />
              </span>
              Transactions
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-800 mt-2 tracking-tight">
              {moneyTotals.count}
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Total entries on selected day
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment method bar chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <span>Payment Method Breakdown</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Money In vs Money Out grouped by how each entry was settled
              </p>
            </div>
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50/80 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setMetricView("value")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  metricView === "value"
                    ? "bg-white text-indigo-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Value (₹)
              </button>
              <button
                onClick={() => setMetricView("count")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  metricView === "count"
                    ? "bg-white text-indigo-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Count
              </button>
            </div>
          </div>

          {paymentBreakdown.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
              No data available for the selected day.
            </div>
          ) : (
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentBreakdown} margin={{ top: 10, right: 10, left: -6, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                    tickFormatter={(v) => (v ? v.charAt(0).toUpperCase() + v.slice(1) : v)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => (metricView === "count" ? v : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                  />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "#f1f5f9" }} />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                  {metricView === "value" ? (
                    <>
                      <Bar dataKey="moneyIn" name="Money In" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={38} />
                      <Bar dataKey="moneyOut" name="Money Out" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={38} />
                    </>
                  ) : (
                    <Bar dataKey="count" name="Transactions" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={38} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Type distribution donut */}
        <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs flex flex-col">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Transaction Types</h3>
              <span className="text-xs font-bold text-slate-400">{typeDistribution.length} types</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">Breakdown of the day by transaction type</p>

            <div className="relative h-44 w-full flex items-center justify-center">
              {typeDistribution.length === 0 ? (
                <div className="text-slate-400 text-xs">No data to display</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={typeDistribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={72}
                        paddingAngle={3}
                        strokeWidth={0}
                      >
                        {typeDistribution.map((entry, i) => (
                          <Cell key={`cell-${i}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomDonutTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-black text-slate-900 tracking-tight">
                      {moneyTotals.count}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Entries
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-3 mt-4">
              {typeDistribution.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                      <span className="font-semibold text-slate-700">
                        <Capitalized text={item.name} />
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{fmtINR(item.value)}</span>
                      <span className="text-slate-400 font-medium w-8 text-right">{item.percent}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${item.percent}%`, background: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top Parties */}
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Top Parties by Day Value</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Highest contributing counterparts for the selected day
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Top {topParties.length} of matching entries
          </span>
        </div>

        {topParties.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">No party data available.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {topParties.map((p, idx) => {
              const share = partyMax > 0 ? (p.total / partyMax) * 100 : 0;
              return (
                <div
                  key={`${p.name}-${idx}`}
                  className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/70 hover:border-indigo-200 hover:bg-indigo-50/20 transition-all"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {p.count} {p.count === 1 ? "entry" : "entries"}
                    </span>
                  </div>
                  <div className="font-bold text-slate-800 text-xs truncate" title={p.name}>
                    {p.name}
                  </div>
                  <div className="font-extrabold text-indigo-600 text-sm mt-1">{fmtINR(p.total)}</div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                    <span>In {fmtINR(p.in)}</span>
                    <span>Out {fmtINR(p.out)}</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200/60">
                    <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, share))}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}