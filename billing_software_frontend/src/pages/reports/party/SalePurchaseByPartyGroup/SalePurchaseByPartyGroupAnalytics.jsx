import { useMemo } from "react";
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
  ShoppingBag,
  ShoppingCart,
  Scale,
  Users,
  TrendingUp,
  Layers,
} from "lucide-react";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#7c3aed", "#0891b2", "#f43f5e", "#eab308"];

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
        {item.payload.isOther ? "Other Groups" : <Capitalized text={item.name} />}
      </div>
      <div className="text-slate-400 mt-1">
        Sale: <span className="text-white font-semibold">{fmtINR(item.value)}</span>
      </div>
      <div className="text-slate-400">
        Share: <span className="text-white font-semibold">{item.payload.percent}%</span>
      </div>
    </div>
  );
}

export default function SalePurchaseByPartyGroupAnalytics({ rows = [], period = "", onClose }) {
  const totals = useMemo(() => {
    let sale = 0,
      purchase = 0,
      count = 0;
    rows.forEach((r) => {
      sale += Number(r.sale_amount || 0);
      purchase += Number(r.purchase_amount || 0);
      count += 1;
    });
    return { sale, purchase, net: sale - purchase, count };
  }, [rows]);

  const topGroups = useMemo(
    () =>
      [...rows]
        .sort((a, b) => Number(b.sale_amount || 0) - Number(a.sale_amount || 0))
        .slice(0, 8),
    [rows]
  );

  const saleDonut = useMemo(() => {
    const bySale = [...rows].sort((a, b) => Number(b.sale_amount || 0) - Number(a.sale_amount || 0));
    const TOP = 5;
    const top = bySale.slice(0, TOP);
    const rest = bySale.slice(TOP);
    const data = top.map((r, i) => ({
      name: r.group_name || "General",
      value: Number(r.sale_amount || 0),
      color: COLORS[i % COLORS.length],
    }));
    if (rest.length) {
      data.push({
        name: "Others",
        value: rest.reduce((a, r) => a + Number(r.sale_amount || 0), 0),
        color: "#cbd5e1",
        isOther: true,
      });
    }
    const total = data.reduce((a, s) => a + s.value, 0) || 1;
    return data.map((d) => ({ ...d, percent: ((d.value / total) * 100).toFixed(0) }));
  }, [rows]);

  const maxSale = Math.max(...rows.map((r) => Number(r.sale_amount || 0)), 1);

  return (
    <div className="space-y-6 transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            <span>Party</span>
            <span>•</span>
            <span>Sale / Purchase By Party Group Analytics</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              Live Filtered
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            Sale / Purchase By Party Group Analytics
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            <span className="font-semibold text-indigo-600">{period}</span> • {totals.count} group
            {totals.count === 1 ? "" : "s"}
          </p>
        </div>

        {typeof onClose === "function" && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs cursor-pointer"
              title="Return to Sale / Purchase By Party Group"
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
                <ShoppingBag className="w-3.5 h-3.5" />
              </span>
              Total Sale
            </div>
            <div className="text-2xl sm:text-3xl font-black text-indigo-600 mt-2 tracking-tight">
              {fmtINR(totals.sale)}
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Sales across selected groups
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
              {fmtINR(totals.purchase)}
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Purchases across selected groups
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-slate-500">
              <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Scale className="w-3.5 h-3.5" />
              </span>
              Net Sale
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-2 tracking-tight">
              {fmtINR(totals.net)}
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Sale − Purchase
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-slate-500">
              <span className="w-6 h-6 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center">
                <Users className="w-3.5 h-3.5" />
              </span>
              Groups
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-800 mt-2 tracking-tight">
              {totals.count}
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Party groups with transactions
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sale vs purchase bar */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>Top Groups — Sale vs Purchase</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">
              Sale and purchase totals per party group for the current period
            </p>

            {topGroups.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
                No data available for the selected period.
              </div>
            ) : (
              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topGroups} margin={{ top: 10, right: 10, left: -6, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="group_name"
                      tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                      tickFormatter={(v) => (v ? v.slice(0, 10) : "-")}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                      minTickGap={10}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                    />
                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "#f1f5f9" }} />
                    <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                    <Bar dataKey="sale_amount" name="Sale" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={34} />
                    <Bar dataKey="purchase_amount" name="Purchase" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={34} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Sale donut */}
        <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs flex flex-col">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Sale by Group</h3>
              <span className="text-xs font-bold text-slate-400">{saleDonut.length} groups</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">Sales share by each party group</p>

            <div className="relative h-44 w-full flex items-center justify-center">
              {saleDonut.length === 0 ? (
                <div className="text-slate-400 text-xs">No data to display</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={saleDonut}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={72}
                        paddingAngle={3}
                        strokeWidth={0}
                      >
                        {saleDonut.map((entry, i) => (
                          <Cell key={`cell-${i}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomDonutTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-sm font-black text-slate-900 tracking-tight">
                      {fmtINR(totals.sale)}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Sale
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2.5 mt-4">
              {saleDonut.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                      <span className="font-semibold text-slate-700 truncate">
                        {item.isOther ? "Other Groups" : <Capitalized text={item.name} />}
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

      {/* Group table */}
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Group Sale / Purchase</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Sale, purchase and net totals per party group
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {totals.count} group{totals.count === 1 ? "" : "s"}
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">No data available.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="py-2.5 pr-3 font-bold">#</th>
                  <th className="py-2.5 px-3 font-bold">Party Group</th>
                  <th className="py-2.5 px-3 font-bold text-right">Sale</th>
                  <th className="py-2.5 px-3 font-bold text-right">Purchase</th>
                  <th className="py-2.5 pl-3 font-bold">Net + Share</th>
                </tr>
              </thead>
              <tbody>
                {[...rows]
                  .sort((a, b) => Number(b.sale_amount || 0) - Number(a.sale_amount || 0))
                  .map((r, i) => {
                    const net = Number(r.sale_amount || 0) - Number(r.purchase_amount || 0);
                    const share = (Number(r.sale_amount || 0) / maxSale) * 100;
                    return (
                      <tr key={`${r.id || r.group_name}-${i}`} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition text-xs">
                        <td className="py-3 pr-3">
                          <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center">
                            {i + 1}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-800 max-w-[220px] truncate" title={r.group_name}>
                          {r.group_name || "General"}
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold text-indigo-600">{fmtINR(r.sale_amount)}</td>
                        <td className="py-3 px-3 text-right font-bold text-amber-600">{fmtINR(r.purchase_amount)}</td>
                        <td className="py-3 pl-3 min-w-[150px]">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold w-20 text-right shrink-0 ${net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                              {fmtINR(net)}
                            </span>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden shrink-0">
                              <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, share)}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}