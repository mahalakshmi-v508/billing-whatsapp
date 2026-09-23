import { useMemo, useState } from "react";
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
  Sparkles,
  ArrowLeft,
  BadgeCheck,
  ShoppingCart,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  Receipt,
  TrendingUp,
  ReceiptIndianRupee,
  AlertCircle,
} from "lucide-react";

const TYPE_COLORS = ["#6366f1", "#0891b2", "#10b981", "#f59e0b", "#7c3aed", "#f43f5e", "#0ea5e9"];

const fmtINR = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const shortDay = (key) => {
  const p = String(key || "").slice(0, 10).split("-");
  return p.length === 3 && p[0] && p[1] && p[2] ? `${p[2]}/${p[1]} ` : key || "-";
};

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

export default function PartyStatementAnalytics({
  rows = [],
  summary = {},
  partyName = "General",
  period = "",
  onClose,
}) {
  const [metricView, setMetricView] = useState("value");

  const daily = useMemo(() => {
    const map = new Map();
    rows.forEach((t) => {
      const key = String(t.date || "").slice(0, 10) || "no-date";
      if (!map.has(key)) map.set(key, { key, received: 0, paid: 0, count: 0 });
      const item = map.get(key);
      item.received += Number(t.received || 0);
      item.paid += Number(t.paid || 0);
      item.count += Number(t.count || 1);
    });
    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [rows]);

  const typeDistribution = useMemo(() => {
    const map = new Map();
    rows.forEach((t) => {
      const name = (t.txn_type || "General").trim();
      if (!map.has(name)) map.set(name, { name, value: 0, count: 0 });
      const item = map.get(name);
      item.value += Number(t.total || 0);
      item.count += 1;
    });
    const sorted = Array.from(map.values()).sort((a, b) => b.value - a.value);
    const total = sorted.reduce((s, g) => s + g.value, 0) || 1;
    return sorted.map((g, i) => ({
      ...g,
      color: TYPE_COLORS[i % TYPE_COLORS.length],
      percent: ((g.value / total) * 100).toFixed(0),
    }));
  }, [rows]);

  const topTransactions = useMemo(
    () =>
      [...rows]
        .sort((a, b) => Number(b.total || 0) - Number(a.total || 0))
        .slice(0, 8),
    [rows]
  );

  const receivable = Number(summary.total_receivable || 0);
  const payable = Number(summary.total_payable || 0);

  return (
    <div className="space-y-6 transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            <span>Party</span>
            <span>•</span>
            <span>Statement Analytics</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              Live Filtered
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            Party Statement Analytics
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            <span className="font-semibold text-slate-700">{partyName}</span> •{" "}
            <span className="font-semibold text-indigo-600">{period}</span> •{" "}
            {rows.length} transaction{rows.length === 1 ? "" : "s"}
          </p>
        </div>

        {typeof onClose === "function" && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs cursor-pointer"
              title="Return to Party Statement Report"
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
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-600" />
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-slate-500">
              <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <BadgeCheck className="w-3.5 h-3.5" />
              </span>
              Total Sale
            </div>
            <div className="text-2xl sm:text-3xl font-black text-indigo-600 mt-2 tracking-tight">
              {fmtINR(summary.total_sale)}
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Sales billed to {partyName}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-slate-500">
              <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <ShoppingCart className="w-3.5 h-3.5" />
              </span>
              Total Purchase
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-2 tracking-tight">
              {fmtINR(summary.total_purchase)}
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Purchases recorded from {partyName}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-slate-500">
              <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ArrowDownLeft className="w-3.5 h-3.5" />
              </span>
              Money In
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-2 tracking-tight">
              {fmtINR(summary.total_money_in)}
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Received from {partyName}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-500" />
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-slate-500">
              <span className="w-6 h-6 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
              Money Out
            </div>
            <div className="text-2xl sm:text-3xl font-black text-rose-600 mt-2 tracking-tight">
              {fmtINR(summary.total_money_out)}
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Paid to {partyName}
          </div>
        </div>
      </div>

      {/* Balance chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-3 bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-xs">
          <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Scale className="w-4 h-4" />
          </span>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Receivable Balance</div>
            <div className="font-extrabold text-emerald-600 text-sm">{fmtINR(receivable)}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-xs">
          <span className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Scale className="w-4 h-4" />
          </span>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payable Balance</div>
            <div className="font-extrabold text-rose-600 text-sm">{fmtINR(payable)}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-xs">
          <span className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ReceiptIndianRupee className="w-4 h-4" />
          </span>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Expense</div>
            <div className="font-extrabold text-slate-800 text-sm">{fmtINR(summary.total_expense)}</div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily money in/out bar */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <span>Daily Received vs Paid</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cash movement with the party across the period
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

          {daily.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
              No data available for the selected period.
            </div>
          ) : (
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily} margin={{ top: 10, right: 10, left: -6, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="key"
                    tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                    tickFormatter={shortDay}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={12}
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
                      <Bar dataKey="received" name="Received" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="paid" name="Paid" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={32} />
                    </>
                  ) : (
                    <Bar dataKey="count" name="Transactions" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={32} />
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
            <p className="text-xs text-slate-500 mb-4">Statement lines grouped by type</p>

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
                    <span className="text-lg font-black text-slate-900 tracking-tight">
                      {fmtINR(summary.total_sale)}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Total
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2.5 mt-4">
              {typeDistribution.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                      <span className="font-semibold text-slate-700 truncate">
                        <Capitalized text={item.name} />
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
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

      {/* Top transactions table */}
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Receipt className="w-4 h-4 text-indigo-600" />
              <span>Top Transactions by Value</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Highest-value statement entries for {partyName}
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">Top {topTransactions.length} entries</span>
        </div>

        {topTransactions.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">No transaction data available.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="py-2.5 pr-3 font-bold">#</th>
                  <th className="py-2.5 px-3 font-bold">Date</th>
                  <th className="py-2.5 px-3 font-bold">Type</th>
                  <th className="py-2.5 px-3 font-bold">Ref No.</th>
                  <th className="py-2.5 px-3 font-bold text-right">Received</th>
                  <th className="py-2.5 px-3 font-bold text-right">Paid</th>
                  <th className="py-2.5 pl-3 font-bold text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {topTransactions.map((t, i) => (
                  <tr key={`${t.ref_no}-${i}`} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition text-xs">
                    <td className="py-3 pr-3">
                      <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center">
                        {i + 1}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium">{shortDay(t.date)}</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                        <Capitalized text={t.txn_type} />
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800 max-w-[140px] truncate" title={t.ref_no}>
                      {t.ref_no || "-"}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-600">{fmtINR(t.received)}</td>
                    <td className="py-3 px-3 text-right font-bold text-rose-600">{fmtINR(t.paid)}</td>
                    <td className="py-3 pl-3 text-right font-extrabold text-slate-900">{fmtINR(t.txn_balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}