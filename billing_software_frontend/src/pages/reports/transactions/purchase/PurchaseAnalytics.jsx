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
  Sparkles,
  ArrowLeft,
  ShoppingCart,
  Wallet,
  AlertTriangle,
  Receipt,
  Building2,
  TrendingUp,
  CreditCard,
} from "lucide-react";

const GROUP_COLORS = ["#f59e0b", "#6366f1", "#0891b2", "#10b981", "#7c3aed", "#f43f5e", "#eab308"];

const fmtINR = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const shortDate = (key) => {
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

function CustomSupplierTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-xl px-3.5 py-2.5 shadow-2xl border border-slate-700/50 text-xs">
      <div className="font-bold text-slate-200 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.payload.color }} />
        {item.payload.isOther ? "Other Suppliers" : <Capitalized text={item.name} />}
      </div>
      <div className="text-slate-400 mt-1">
        Value: <span className="text-white font-semibold">{fmtINR(item.value)}</span>
      </div>
      <div className="text-slate-400">
        Purchases: <span className="text-white font-semibold">{item.payload.count}</span> ({item.payload.percent}%)
      </div>
    </div>
  );
}

export default function PurchaseAnalytics({
  rows: rowsProp = [],
  fromDate: fromDateProp = "",
  toDate: toDateProp = "",
  onClose,
}) {
  const locationState = useLocation()?.state || {};

  const rows = rowsProp.length ? rowsProp : locationState.rows || [];
  const fromDate = fromDateProp || locationState.fromDate || "";
  const toDate = toDateProp || locationState.toDate || "";
  const canClose = typeof onClose === "function";

  const [metricView, setMetricView] = useState("value");

  const totals = useMemo(() => {
    let value = 0,
      paid = 0,
      balance = 0,
      count = 0;
    rows.forEach((r) => {
      value += Number(r.value || 0);
      paid += Number(r.paid || 0);
      balance += Number(r.balance || 0);
      count += Number(r.count || 1);
    });
    const pending = Number(Math.max(0, balance).toFixed(2));
    return { value, paid, pending, count };
  }, [rows]);

  const daily = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const key = String(r.date || "").slice(0, 10) || "no-date";
      if (!map.has(key)) map.set(key, { key, value: 0, count: 0 });
      const item = map.get(key);
      item.value += Number(r.value || 0);
      item.count += Number(r.count || 1);
    });
    const list = Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
    return {
      list,
      max: Math.max(...list.map((d) => d.value), 1),
    };
  }, [rows]);

  const supplierBreakdown = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const name = (r.group || "Cash Purchase").trim();
      if (!map.has(name)) map.set(name, { name, value: 0, count: 0, paid: 0, balance: 0 });
      const item = map.get(name);
      item.value += Number(r.value || 0);
      item.count += Number(r.count || 1);
      item.paid += Number(r.paid || 0);
      item.balance += Number(r.balance || 0);
    });
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [rows]);

  const supplierDonut = useMemo(() => {
    const TOP = 5;
    const top = supplierBreakdown.slice(0, TOP);
    const rest = supplierBreakdown.slice(TOP);
    const data = top.map((s, i) => ({
      name: s.name,
      value: s.value,
      count: s.count,
      color: GROUP_COLORS[i % GROUP_COLORS.length],
    }));
    if (rest.length) {
      data.push({
        name: "Others",
        value: rest.reduce((a, s) => a + s.value, 0),
        count: rest.reduce((a, s) => a + s.count, 0),
        color: "#cbd5e1",
        isOther: true,
      });
    }
    const total = data.reduce((a, s) => a + s.value, 0) || 1;
    return data.map((s) => ({ ...s, percent: ((s.value / total) * 100).toFixed(0) }));
  }, [supplierBreakdown]);

  const paymentMethods = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const key = (r.paymentType || "other").toLowerCase();
      if (!map.has(key)) map.set(key, { name: key, value: 0, count: 0 });
      const item = map.get(key);
      item.value += Number(r.value || 0);
      item.count += Number(r.count || 1);
    });
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [rows]);

  const paymentMax = Math.max(...paymentMethods.map((p) => p.value), 1);
  const supplierMax = Math.max(...supplierBreakdown.map((s) => s.value), 1);

  const tooltipPeriod =
    fromDate && toDate
      ? `${shortDate(fromDate)} to ${shortDate(toDate)}`
      : fromDate
      ? `From ${shortDate(fromDate)}`
      : toDate
      ? `Until ${shortDate(toDate)}`
      : "All time";

  return (
    <div className="space-y-6 transition-all">
      {/* Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 uppercase tracking-wider">
            <span>Transactions</span>
            <span>•</span>
            <span>Purchase Analytics</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Live Filtered
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            Purchase Analytics
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            <span className="font-semibold text-amber-600">{tooltipPeriod}</span> •{" "}
            {totals.count} purchase{totals.count === 1 ? "" : "s"}
          </p>
        </div>

        {canClose && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs cursor-pointer"
              title="Return to Purchase Report"
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
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-slate-500">
              <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <ShoppingCart className="w-3.5 h-3.5" />
              </span>
              Total Purchases
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-2 tracking-tight">
              {fmtINR(totals.value)}
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Gross purchase value in period
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-slate-500">
              <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Wallet className="w-3.5 h-3.5" />
              </span>
              Total Paid
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-2 tracking-tight">
              {fmtINR(totals.paid)}
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Amount settled to suppliers
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-500" />
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-slate-500">
              <span className="w-6 h-6 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5" />
              </span>
              Pending Balance
            </div>
            <div className="text-2xl sm:text-3xl font-black text-rose-600 mt-2 tracking-tight">
              {fmtINR(totals.pending)}
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Outstanding payable to vendors
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-slate-500">
              <span className="w-6 h-6 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center">
                <Receipt className="w-3.5 h-3.5" />
              </span>
              Purchases
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-800 mt-2 tracking-tight">
              {totals.count}
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Total bills in the selected period
          </div>
        </div>
      </div>

      {/* Payment method strip */}
      <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-600" />
            <span>Payment Methods</span>
          </h3>
          <span className="text-xs font-semibold text-slate-500">
            {paymentMethods.length} method{paymentMethods.length === 1 ? "" : "s"} used
          </span>
        </div>
        {paymentMethods.length === 0 ? (
          <div className="text-center py-4 text-slate-400 text-xs">No data available.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {paymentMethods.map((m) => (
              <div key={m.name} className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/70">
                <div className="font-bold text-slate-800 text-xs capitalize truncate">{m.name}</div>
                <div className="font-extrabold text-amber-600 text-sm mt-1">{fmtINR(m.value)}</div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {m.count} {m.count === 1 ? "bill" : "bills"}
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200/60">
                  <div className="w-full bg-amber-100 rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-amber-500 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, (m.value / paymentMax) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Purchase value by date */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-600" />
                <span>Purchase Value by Date</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Daily purchase amounts across the selected period
              </p>
            </div>
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50/80 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setMetricView("value")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  metricView === "value"
                    ? "bg-white text-amber-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Value (₹)
              </button>
              <button
                onClick={() => setMetricView("count")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  metricView === "count"
                    ? "bg-white text-amber-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Count
              </button>
            </div>
          </div>

          {daily.list.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
              No data available for the selected period.
            </div>
          ) : (
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily.list} margin={{ top: 10, right: 10, left: -6, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="key"
                    tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                    tickFormatter={shortDate}
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
                    <Bar dataKey="value" name="Purchase Value" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={34} />
                  ) : (
                    <Bar dataKey="count" name="Purchases" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={34} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Supplier donut */}
        <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs flex flex-col">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">By Supplier</h3>
              <span className="text-xs font-bold text-slate-400">{supplierBreakdown.length} suppliers</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">Purchase value shared by each supplier</p>

            <div className="relative h-44 w-full flex items-center justify-center">
              {supplierDonut.length === 0 ? (
                <div className="text-slate-400 text-xs">No data to display</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={supplierDonut}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={72}
                        paddingAngle={3}
                        strokeWidth={0}
                      >
                        {supplierDonut.map((entry, i) => (
                          <Cell key={`cell-${i}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomSupplierTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-sm font-black text-slate-900 tracking-tight">
                      {fmtINR(totals.value)}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Total
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2.5 mt-4">
              {supplierDonut.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                      <span className="font-semibold text-slate-700 truncate">
                        {item.isOther ? "Other Suppliers" : <Capitalized text={item.name} />}
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

      {/* Top Suppliers table */}
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-600" />
              <span>Top Suppliers by Purchase Value</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Paid vs pending breakdown for every supplier in the period
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {supplierBreakdown.length} supplier{supplierBreakdown.length === 1 ? "" : "s"}
          </span>
        </div>

        {supplierBreakdown.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">No supplier data available.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="py-2.5 pr-3 font-bold">#</th>
                  <th className="py-2.5 px-3 font-bold">Supplier</th>
                  <th className="py-2.5 px-3 font-bold text-right">Bills</th>
                  <th className="py-2.5 px-3 font-bold text-right">Value</th>
                  <th className="py-2.5 px-3 font-bold text-right">Paid</th>
                  <th className="py-2.5 px-3 font-bold text-right">Pending</th>
                  <th className="py-2.5 pl-3 font-bold">Paid vs Pending</th>
                </tr>
              </thead>
              <tbody>
                {supplierBreakdown.slice(0, 10).map((s, i) => {
                  const value = Math.max(s.value, 1);
                  const paidPct = (s.paid / value) * 100;
                  const pendingPct = (s.balance / value) * 100;
                  const share = (s.value / supplierMax) * 100;
                  return (
                    <tr key={`${s.name}-${i}`} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition text-xs">
                      <td className="py-3 pr-3">
                        <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-700 font-bold text-[10px] flex items-center justify-center">
                          {i + 1}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-800 max-w-[220px] truncate" title={s.name}>
                        {s.name}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-500 font-semibold">{s.count}</td>
                      <td className="py-3 px-3 text-right font-extrabold text-slate-900">{fmtINR(s.value)}</td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-600">{fmtINR(s.paid)}</td>
                      <td className="py-3 px-3 text-right font-bold text-rose-600">{fmtINR(s.balance)}</td>
                      <td className="py-3 pl-3 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <div className="flex w-full h-1.5 rounded-full overflow-hidden bg-slate-100">
                            <div className="bg-emerald-500 h-full" style={{ width: `${paidPct}%` }} />
                            <div className="bg-rose-400 h-full" style={{ width: `${Math.min(pendingPct, 100) }%` }} />
                          </div>
                          <div className="w-20 bg-slate-100 rounded-full h-1 overflow-hidden shrink-0">
                            <div className="bg-amber-500 h-1 rounded-full" style={{ width: `${Math.min(100, share)}%` }} />
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