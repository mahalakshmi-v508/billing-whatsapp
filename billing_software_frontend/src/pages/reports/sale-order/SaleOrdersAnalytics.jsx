import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  CheckCircle2,
  Clock,
  Users,
  Calendar,
  X,
  Sparkles,
  BarChart2,
  ArrowLeft,
} from "lucide-react";

const STATUS_COLORS = {
  paid: { fill: "#10b981", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", bar: "bg-emerald-500", label: "Paid" },
  pending: { fill: "#f59e0b", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", bar: "bg-amber-500", label: "Partial" },
  unpaid: { fill: "#f43f5e", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", bar: "bg-rose-500", label: "Unpaid" },
};

function CustomTrendTooltip({ active, payload, label, symbol }) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return (
    <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-xl px-4 py-3 shadow-2xl border border-slate-700/50 text-xs">
      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
        <Calendar className="w-3 h-3 text-indigo-400" />
        {data.fullDate || label}
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-300">Order Value:</span>
          <span className="font-bold text-indigo-400">
            {symbol}{Number(data.value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-300">Advance Settled:</span>
          <span className="font-bold text-emerald-400">
            {symbol}{Number(data.advance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800">
          <span className="text-slate-400">Total Orders:</span>
          <span className="font-semibold text-white">{data.count} {data.count === 1 ? "order" : "orders"}</span>
        </div>
      </div>
    </div>
  );
}

function CustomDonutTooltip({ active, payload, symbol }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-xl px-3.5 py-2.5 shadow-2xl border border-slate-700/50 text-xs">
      <div className="font-bold text-slate-200 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.payload.color }} />
        {item.name}
      </div>
      <div className="text-slate-400 mt-1">
        Orders: <span className="text-white font-semibold">{item.value}</span> ({item.payload.percent}%)
      </div>
      <div className="text-slate-400">
        Amount: <span className="text-white font-semibold">{symbol}{Number(item.payload.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
      </div>
    </div>
  );
}

export default function SaleOrdersAnalytics({
  orders = [],
  symbol = "₹",
  fromDate = "",
  toDate = "",
  orderType = "sale_order",
  onClose,
}) {
  const [granularity, setGranularity] = useState("auto"); // "auto" | "daily" | "weekly" | "monthly"
  const [metricView, setMetricView] = useState("value"); // "value" | "count"

  const fmtMoney = (n) =>
    `${symbol}${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  /* ─────────────────────────────────────────────────────────────
     1. Executive Summary Metrics
     ───────────────────────────────────────────────────────────── */
  const summary = useMemo(() => {
    const totalOrders = orders.length;
    let totalValue = 0;
    let totalAdvance = 0;
    let totalBalance = 0;

    let paidCount = 0;
    let paidAmount = 0;
    let partialCount = 0;
    let partialAmount = 0;
    let unpaidCount = 0;
    let unpaidAmount = 0;

    orders.forEach((o) => {
      const tot = Number(o.total) || 0;
      const adv = Number(o.advance) || 0;
      const bal = Number(o.balance) || 0;

      totalValue += tot;
      totalAdvance += adv;
      totalBalance += bal;

      if (bal === 0 || o.status === "paid") {
        paidCount++;
        paidAmount += tot;
      } else if (adv > 0) {
        partialCount++;
        partialAmount += tot;
      } else {
        unpaidCount++;
        unpaidAmount += tot;
      }
    });

    const paidRate = totalValue > 0 ? (totalAdvance / totalValue) * 100 : 0;
    const pendingOrdersCount = partialCount + unpaidCount;

    return {
      totalOrders,
      totalValue,
      totalAdvance,
      totalBalance,
      paidCount,
      paidAmount,
      partialCount,
      partialAmount,
      unpaidCount,
      unpaidAmount,
      paidRate,
      pendingOrdersCount,
    };
  }, [orders]);

  /* ─────────────────────────────────────────────────────────────
     2. Status Distribution Data for Donut Chart
     ───────────────────────────────────────────────────────────── */
  const statusDistribution = useMemo(() => {
    const total = summary.totalOrders || 1;
    const data = [
      {
        name: "Paid",
        value: summary.paidCount,
        amount: summary.paidAmount,
        color: STATUS_COLORS.paid.fill,
        percent: ((summary.paidCount / total) * 100).toFixed(0),
        statusKey: "paid",
      },
      {
        name: "Partial",
        value: summary.partialCount,
        amount: summary.partialAmount,
        color: STATUS_COLORS.pending.fill,
        percent: ((summary.partialCount / total) * 100).toFixed(0),
        statusKey: "pending",
      },
      {
        name: "Unpaid",
        value: summary.unpaidCount,
        amount: summary.unpaidAmount,
        color: STATUS_COLORS.unpaid.fill,
        percent: ((summary.unpaidCount / total) * 100).toFixed(0),
        statusKey: "unpaid",
      },
    ].filter((item) => item.value > 0);

    return data;
  }, [summary]);

  /* ─────────────────────────────────────────────────────────────
     3. Sales Order Trend Series (Daily / Weekly / Monthly)
     ───────────────────────────────────────────────────────────── */
  const trendData = useMemo(() => {
    if (!orders.length) return [];

    // Auto-detect best grouping if set to "auto"
    let effectiveGranularity = granularity;
    if (granularity === "auto") {
      const dates = orders.map((o) => (o.date ? new Date(o.date).getTime() : 0)).filter(Boolean);
      if (dates.length > 1) {
        const spanDays = (Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24);
        effectiveGranularity = spanDays > 60 ? "monthly" : spanDays > 21 ? "weekly" : "daily";
      } else {
        effectiveGranularity = "daily";
      }
    }

    const bucketMap = new Map();

    orders.forEach((o) => {
      if (!o.date) return;
      const d = new Date(o.date);
      if (isNaN(d.getTime())) return;

      let key = "";
      let label = "";
      let fullDate = "";

      if (effectiveGranularity === "monthly") {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        label = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
        fullDate = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
      } else if (effectiveGranularity === "weekly") {
        const startOfYear = new Date(d.getFullYear(), 0, 1);
        const weekNo = Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
        key = `${d.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
        label = `W${weekNo} '${String(d.getFullYear()).slice(-2)}`;
        fullDate = `Week ${weekNo}, ${d.getFullYear()}`;
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        label = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
        fullDate = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      }

      if (!bucketMap.has(key)) {
        bucketMap.set(key, {
          key,
          label,
          fullDate,
          sortTime: d.getTime(),
          value: 0,
          advance: 0,
          balance: 0,
          count: 0,
        });
      }

      const item = bucketMap.get(key);
      item.value += Number(o.total) || 0;
      item.advance += Number(o.advance) || 0;
      item.balance += Number(o.balance) || 0;
      item.count += 1;
    });

    const sorted = Array.from(bucketMap.values()).sort((a, b) => a.key.localeCompare(b.key));
    return sorted;
  }, [orders, granularity]);

  /* ─────────────────────────────────────────────────────────────
     4. Party / Customer Contribution (Top 5)
     ───────────────────────────────────────────────────────────── */
  const topParties = useMemo(() => {
    const map = new Map();
    orders.forEach((o) => {
      const name = (o.name || "Unknown").trim();
      if (!map.has(name)) {
        map.set(name, { name, total: 0, count: 0, advance: 0, balance: 0 });
      }
      const p = map.get(name);
      p.total += Number(o.total) || 0;
      p.advance += Number(o.advance) || 0;
      p.balance += Number(o.balance) || 0;
      p.count += 1;
    });

    const sorted = Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return sorted;
  }, [orders]);

  return (
    <div className="space-y-6 animate-fadeIn transition-all">
      {/* View Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            <span>Orders & Fulfillment</span>
            <span>•</span>
            <span>{orderType === "sale_order" ? "Sales Pipeline Analytics" : "Procurement Analytics"}</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              Live Filtered
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            {orderType === "sale_order" ? "Sale Orders Analytics" : "Purchase Orders Analytics"}
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Active Period: <span className="font-semibold text-slate-700">{fromDate || "All"}</span> to{" "}
            <span className="font-semibold text-slate-700">{toDate || "All"}</span> •{" "}
            <span className="font-semibold text-indigo-600">{orders.length}</span> {orders.length === 1 ? "order" : "orders"} matching filter criteria
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs cursor-pointer"
              title="Return to Sale Orders Report"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>Close</span>
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────
          Section 1: Modern Executive KPI Cards (Reference inspired)
          ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total Orders & Contract Sum */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-indigo-600" />
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
                Total Orders Summary
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {summary.totalOrders} {summary.totalOrders === 1 ? "Order" : "Orders"}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 tracking-tight">
              {fmtMoney(summary.totalValue)}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Gross contracted value across filtered records
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
            <div className="bg-slate-50 rounded-xl p-2">
              <div className="text-[10px] font-bold uppercase text-slate-400">Paid</div>
              <div className="text-xs font-black text-emerald-600 mt-0.5">
                {fmtMoney(summary.totalAdvance)}
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-2">
              <div className="text-[10px] font-bold uppercase text-slate-400">Pending</div>
              <div className="text-xs font-black text-amber-600 mt-0.5">
                {fmtMoney(summary.totalBalance)}
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-2">
              <div className="text-[10px] font-bold uppercase text-slate-400">Rate</div>
              <div className="text-xs font-black text-indigo-600 mt-0.5">
                {summary.paidRate.toFixed(0)}%
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Settled / Paid Orders */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
                Settled Orders
              </span>
              <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
                {summary.paidCount}
              </div>
              <span className="text-xs text-slate-400 font-semibold">orders fully paid</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Valued at <span className="font-bold text-slate-700">{fmtMoney(summary.paidAmount)}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-500">Settlement Progress</span>
              <span className="font-bold text-emerald-600">{summary.paidRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, summary.paidRate))}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-between">
              <span>Deposit collection efficiency</span>
              <span className="font-medium text-slate-600">{fmtMoney(summary.totalAdvance)} collected</span>
            </div>
          </div>
        </div>

        {/* Card 3: Pending & Outstanding Orders */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-rose-500" />
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
                Pending & Unpaid
              </span>
              <div className="w-6 h-6 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <div className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight">
                {summary.pendingOrdersCount}
              </div>
              <span className="text-xs text-slate-400 font-semibold">orders awaiting balance</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Outstanding sum: <span className="font-bold text-amber-700">{fmtMoney(summary.totalBalance)}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400">Partial Open</div>
              <div className="font-bold text-amber-600 text-sm mt-0.5">{summary.partialCount}</div>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400">Zero Advance</div>
              <div className="font-bold text-rose-600 text-sm mt-0.5">{summary.unpaidCount}</div>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400">Recovery Need</div>
              <div className="font-bold text-slate-700 text-sm mt-0.5">
                {(100 - summary.paidRate).toFixed(0)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────
          Section 2: Interactive Charts Grid (Trend & Distribution)
          ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols): Sales Order Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Sales Order Trend</span>
                  <span className="text-xs font-normal text-slate-400">
                    ({trendData.length} active time points)
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Order value and collection progression over the selected date range
                </p>
              </div>

              {/* View & Granularity Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50/80 p-0.5 text-xs font-semibold">
                  <button
                    onClick={() => setMetricView("value")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      metricView === "value"
                        ? "bg-white text-indigo-700 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Value ({symbol})
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

                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50/80 p-0.5 text-xs font-semibold">
                  {["auto", "daily", "weekly", "monthly"].map((g) => (
                    <button
                      key={g}
                      onClick={() => setGranularity(g)}
                      className={`px-2 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                        granularity === g
                          ? "bg-indigo-600 text-white shadow-2xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Metrics Sub-Header */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50/80 rounded-xl mb-4 border border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Invoiced
                </span>
                <span className="text-xs sm:text-sm font-black text-slate-800">
                  {fmtMoney(summary.totalValue)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Collected
                </span>
                <span className="text-xs sm:text-sm font-black text-emerald-600">
                  {fmtMoney(summary.totalAdvance)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Outstanding
                </span>
                <span className="text-xs sm:text-sm font-black text-amber-600">
                  {fmtMoney(summary.totalBalance)}
                </span>
              </div>
            </div>
          </div>

          {/* Recharts Area Chart */}
          <div className="h-64 sm:h-72 w-full mt-2">
            {trendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No orders match the selected filters.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="orderValueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="advanceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) =>
                      metricView === "count"
                        ? v
                        : `${symbol}${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`
                    }
                  />
                  <Tooltip content={<CustomTrendTooltip symbol={symbol} />} />
                  {metricView === "value" ? (
                    <>
                      <Area
                        type="monotone"
                        dataKey="value"
                        name="Order Value"
                        stroke="#4f46e5"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#orderValueGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="advance"
                        name="Advance Settled"
                        stroke="#10b981"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        fillOpacity={1}
                        fill="url(#advanceGrad)"
                      />
                    </>
                  ) : (
                    <Area
                      type="monotone"
                      dataKey="count"
                      name="Orders Count"
                      stroke="#4f46e5"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#orderValueGrad)"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right (1 col): Status Distribution Donut Chart */}
        <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Status Distribution</h3>
              <span className="text-xs font-bold text-slate-400">{summary.totalOrders} total</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Breakdown of order settlement status
            </p>

            {/* Donut Chart with Centered Metric */}
            <div className="relative h-44 w-full flex items-center justify-center">
              {summary.totalOrders === 0 ? (
                <div className="text-slate-400 text-xs">No orders to display</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={74}
                        paddingAngle={4}
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomDonutTooltip symbol={symbol} />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Centered text inside donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-black text-slate-900 tracking-tight">
                      {summary.totalOrders}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Orders
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Status Breakdown Legend & Progress Bars */}
            <div className="space-y-3 mt-4">
              {statusDistribution.map((item) => {
                const conf = STATUS_COLORS[item.statusKey] || STATUS_COLORS.paid;
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${conf.bar}`} />
                        <span className="font-semibold text-slate-700">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{item.value}</span>
                        <span className="text-slate-400 font-medium w-8 text-right">
                          {item.percent}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full ${conf.bar} transition-all duration-500`}
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Collection Efficiency Footer */}
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Collection efficiency</span>
            <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
              {summary.paidRate.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────
          Section 3: Top Party / Customer Contribution
          (Replaces Map with high-value real order data)
          ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Top Parties by Contracted Value</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Highest contributing customers/suppliers in the current filtered result set
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Top {topParties.length} of matching records
          </span>
        </div>

        {topParties.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">
            No party data available.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {topParties.map((p, idx) => {
              const share = summary.totalValue > 0 ? (p.total / summary.totalValue) * 100 : 0;
              return (
                <div
                  key={`${p.name}-${idx}`}
                  className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/70 hover:border-indigo-200 hover:bg-indigo-50/20 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {p.count} {p.count === 1 ? "order" : "orders"}
                      </span>
                    </div>
                    <div className="font-bold text-slate-800 text-xs truncate" title={p.name}>
                      {p.name}
                    </div>
                    <div className="font-extrabold text-indigo-600 text-sm mt-1">
                      {fmtMoney(p.total)}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/60">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span>Share</span>
                      <span className="font-bold text-slate-600">{share.toFixed(1)}%</span>
                    </div>
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
