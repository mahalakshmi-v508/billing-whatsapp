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
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  ArrowLeft,
  Calendar,
  Sparkles,
  Users,
  Award,
} from "lucide-react";

const PALETTE = ["#6366f1", "#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6", "#f43f5e"];

function CustomTrendTooltip({ active, payload, label, symbol, metricView }) {
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
          <span className="text-slate-300">Quantity Demanded:</span>
          <span className="font-bold text-blue-400">
            {Number(data.qty || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })} units
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-300">Order Value:</span>
          <span className="font-bold text-emerald-400">
            {symbol}{Number(data.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800">
          <span className="text-slate-400">Orders Logged:</span>
          <span className="font-semibold text-white">{data.orderCount} {data.orderCount === 1 ? "order" : "orders"}</span>
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
        Quantity: <span className="text-white font-semibold">{Number(item.value).toLocaleString("en-IN")}</span> ({item.payload.percent}%)
      </div>
      <div className="text-slate-400">
        Value: <span className="text-white font-semibold">{symbol}{Number(item.payload.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
      </div>
    </div>
  );
}

export default function SaleOrderItemAnalytics({
  lines = [],
  reportedRows = [],
  totalQty = 0,
  totalAmount = 0,
  symbol = "₹",
  fromDate = "",
  toDate = "",
  orderType = "sale_order",
  orderStatus = "all",
  onClose,
}) {
  const [granularity, setGranularity] = useState("auto"); // "auto" | "daily" | "weekly" | "monthly"
  const [metricView, setMetricView] = useState("qty"); // "qty" | "amount"

  const fmtMoney = (n) =>
    `${symbol}${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const avgUnitPrice = useMemo(() => {
    if (totalQty <= 0) return 0;
    return totalAmount / totalQty;
  }, [totalAmount, totalQty]);

  /* ─────────────────────────────────────────────────────────────
     1. Trend Series Aggregation (By Date from lines)
     ───────────────────────────────────────────────────────────── */
  const trendData = useMemo(() => {
    if (!lines.length) return [];

    let effectiveGranularity = granularity;
    if (granularity === "auto") {
      const dates = lines.map((l) => (l.date ? new Date(l.date).getTime() : 0)).filter(Boolean);
      if (dates.length > 1) {
        const spanDays = (Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24);
        effectiveGranularity = spanDays > 60 ? "monthly" : spanDays > 21 ? "weekly" : "daily";
      } else {
        effectiveGranularity = "daily";
      }
    }

    const bucketMap = new Map();

    lines.forEach((l) => {
      if (!l.date) return;
      const d = new Date(l.date);
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
          qty: 0,
          amount: 0,
          orderCount: 0,
        });
      }

      const item = bucketMap.get(key);
      item.qty += Number(l.qty) || 0;
      item.amount += Number(l.amount) || 0;
      item.orderCount += 1;
    });

    const sorted = Array.from(bucketMap.values()).sort((a, b) => a.key.localeCompare(b.key));
    return sorted;
  }, [lines, granularity]);

  /* ─────────────────────────────────────────────────────────────
     2. Product Volume Share Donut (Top 5 + Others)
     ───────────────────────────────────────────────────────────── */
  const volumeDonutData = useMemo(() => {
    if (!reportedRows.length || totalQty <= 0) return [];

    const sortedByQty = [...reportedRows].sort((a, b) => b.qty - a.qty);
    const top5 = sortedByQty.slice(0, 5);
    const remainder = sortedByQty.slice(5);

    const data = top5.map((p, idx) => ({
      name: p.name,
      value: p.qty,
      amount: p.amount,
      color: PALETTE[idx % PALETTE.length],
      percent: ((p.qty / totalQty) * 100).toFixed(1),
    }));

    if (remainder.length > 0) {
      const otherQty = remainder.reduce((s, p) => s + p.qty, 0);
      const otherAmount = remainder.reduce((s, p) => s + p.amount, 0);
      data.push({
        name: "Other Items",
        value: otherQty,
        amount: otherAmount,
        color: "#94a3b8",
        percent: ((otherQty / totalQty) * 100).toFixed(1),
      });
    }

    return data;
  }, [reportedRows, totalQty]);

  /* ─────────────────────────────────────────────────────────────
     3. Top Selling Products by Revenue (Top 5)
     ───────────────────────────────────────────────────────────── */
  const topRevenueProducts = useMemo(() => {
    if (!reportedRows.length) return [];
    return [...reportedRows].sort((a, b) => b.amount - a.amount).slice(0, 5);
  }, [reportedRows]);

  /* ─────────────────────────────────────────────────────────────
     4. Top Parties by Item Demand (Alternative to Map)
     ───────────────────────────────────────────────────────────── */
  const topDemandParties = useMemo(() => {
    const map = new Map();
    lines.forEach((l) => {
      const party = (l.customer || "Unknown").trim();
      if (!map.has(party)) {
        map.set(party, { name: party, qty: 0, amount: 0, itemsCount: 0 });
      }
      const entry = map.get(party);
      entry.qty += Number(l.qty) || 0;
      entry.amount += Number(l.amount) || 0;
      entry.itemsCount += 1;
    });

    return Array.from(map.values())
      .sort((a, b) => b.qty - a.qty || b.amount - a.amount)
      .slice(0, 5);
  }, [lines]);

  return (
    <div className="space-y-6 animate-fadeIn transition-all">
      {/* ─────────────────────────────────────────────────────────
          Dedicated View Header Card
          ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            <span>Orders & Fulfillment</span>
            <span>•</span>
            <span>{orderType === "sale_order" ? "Itemized Sales Demand Analytics" : "Procurement Demand Analytics"}</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              Live Filtered
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            {orderType === "sale_order" ? "Sale Order Items Analytics" : "Purchase Order Items Analytics"}
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Active Period: <span className="font-semibold text-slate-700">{fromDate || "All"}</span> to{" "}
            <span className="font-semibold text-slate-700">{toDate || "All"}</span> •{" "}
            <span className="font-semibold text-indigo-600">{reportedRows.length}</span> Distinct Products •{" "}
            <span className="font-semibold text-blue-600">{Number(totalQty).toLocaleString("en-IN")}</span> Total Units Demanded
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs cursor-pointer"
              title="Return to Sale Order Item Report"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>Close</span>
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────
          Section 1: Executive Item KPI Cards
          ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Distinct Items */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Distinct Products</div>
            <div className="text-2xl font-black text-slate-800 mt-0.5">{reportedRows.length}</div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Unique items ordered</div>
          </div>
        </div>

        {/* Card 2: Total Units Demanded */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Units Demanded</div>
            <div className="text-2xl font-black text-blue-600 mt-0.5">
              {Number(totalQty).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Aggregate item quantity</div>
          </div>
        </div>

        {/* Card 3: Total Contracted Value */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Cumulative Value</div>
            <div className="text-2xl font-black text-emerald-600 mt-0.5">{fmtMoney(totalAmount)}</div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Gross item revenue</div>
          </div>
        </div>

        {/* Card 4: Average Unit Rate */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Avg Unit Value</div>
            <div className="text-2xl font-black text-amber-600 mt-0.5">{fmtMoney(avgUnitPrice)}</div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Weighted avg per unit</div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────
          Section 2: Charts Grid (Trend Chart & Volume Donut)
          ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols): Demand & Value Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Item Demand Trend</span>
                  <span className="text-xs font-normal text-slate-400">
                    ({trendData.length} active time points)
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chronological progression of units demanded and cumulative value
                </p>
              </div>

              {/* View & Granularity Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50/80 p-0.5 text-xs font-semibold">
                  <button
                    onClick={() => setMetricView("qty")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      metricView === "qty"
                        ? "bg-white text-indigo-700 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Quantity (Units)
                  </button>
                  <button
                    onClick={() => setMetricView("amount")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      metricView === "amount"
                        ? "bg-white text-indigo-700 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Value ({symbol})
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
                  Total Units
                </span>
                <span className="text-xs sm:text-sm font-black text-blue-600">
                  {Number(totalQty).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Value
                </span>
                <span className="text-xs sm:text-sm font-black text-emerald-600">
                  {fmtMoney(totalAmount)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Average Daily Units
                </span>
                <span className="text-xs sm:text-sm font-black text-indigo-600">
                  {trendData.length > 0
                    ? Number(totalQty / trendData.length).toLocaleString("en-IN", { maximumFractionDigits: 1 })
                    : 0}{" "}
                  / period
                </span>
              </div>
            </div>
          </div>

          {/* Recharts Area Chart */}
          <div className="h-64 sm:h-72 w-full mt-2">
            {trendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No item demand data found for the selected period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="qtyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="amountGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.28} />
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
                      metricView === "qty"
                        ? v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
                        : `${symbol}${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`
                    }
                  />
                  <Tooltip content={<CustomTrendTooltip symbol={symbol} metricView={metricView} />} />
                  {metricView === "qty" ? (
                    <Area
                      type="monotone"
                      dataKey="qty"
                      name="Quantity Demanded"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#qtyGrad)"
                    />
                  ) : (
                    <Area
                      type="monotone"
                      dataKey="amount"
                      name="Order Value"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#amountGrad)"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right (1 col): Product Volume Share Donut */}
        <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Product Volume Share</h3>
              <span className="text-xs font-bold text-slate-400">{reportedRows.length} items</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Top products share of total demanded units
            </p>

            {/* Donut Chart with Centered Metric */}
            <div className="relative h-44 w-full flex items-center justify-center">
              {reportedRows.length === 0 ? (
                <div className="text-slate-400 text-xs">No items to display</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={volumeDonutData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={74}
                        paddingAngle={4}
                      >
                        {volumeDonutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomDonutTooltip symbol={symbol} />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-black text-slate-900 tracking-tight">
                      {Number(totalQty).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Units
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Product Share Breakdown List */}
            <div className="space-y-3 mt-4">
              {volumeDonutData.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 max-w-[65%] truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-semibold text-slate-700 truncate" title={item.name}>
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{Number(item.value).toLocaleString("en-IN")}</span>
                      <span className="text-slate-400 font-medium w-9 text-right">{item.percent}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{ backgroundColor: item.color, width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Top 5 concentration</span>
            <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
              {volumeDonutData.slice(0, 5).reduce((s, p) => s + parseFloat(p.percent), 0).toFixed(1)}% of demand
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────
          Section 3: Top Revenue Products & Customer Demand Distribution
          (Replaces Map with high-value item demand data)
          ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Top Products by Revenue */}
        <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>Top Products by Contracted Revenue</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Highest grossing products in the current filtered period
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400">Top {topRevenueProducts.length}</span>
          </div>

          {topRevenueProducts.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">No products found</div>
          ) : (
            <div className="space-y-3">
              {topRevenueProducts.map((p, idx) => {
                const share = totalAmount > 0 ? (p.amount / totalAmount) * 100 : 0;
                return (
                  <div
                    key={`${p.name}-${idx}`}
                    className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/70 hover:border-emerald-200 hover:bg-emerald-50/20 transition-all flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="truncate">
                          <div className="font-bold text-slate-800 text-xs truncate" title={p.name}>
                            {p.name}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {Number(p.qty).toLocaleString("en-IN")} units demanded
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-black text-emerald-600 text-sm">{fmtMoney(p.amount)}</div>
                        <div className="text-[10px] font-semibold text-slate-400">{share.toFixed(1)}% of total</div>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1 mt-2.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-1 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, share))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Card 2: Top Customers by Item Demand (Alternative to Map) */}
        <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Top Parties by Demand Volume</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Parties generating the highest product demand in this period
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400">Top {topDemandParties.length}</span>
          </div>

          {topDemandParties.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">No party demand data found</div>
          ) : (
            <div className="space-y-3">
              {topDemandParties.map((party, idx) => {
                const share = totalQty > 0 ? (party.qty / totalQty) * 100 : 0;
                return (
                  <div
                    key={`${party.name}-${idx}`}
                    className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/70 hover:border-indigo-200 hover:bg-indigo-50/20 transition-all flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-800 font-bold text-xs flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="truncate">
                          <div className="font-bold text-slate-800 text-xs truncate" title={party.name}>
                            {party.name}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {party.itemsCount} order line {party.itemsCount === 1 ? "entry" : "entries"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-black text-indigo-600 text-sm">
                          {Number(party.qty).toLocaleString("en-IN")} units
                        </div>
                        <div className="text-[10px] font-semibold text-slate-400">{fmtMoney(party.amount)}</div>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1 mt-2.5 overflow-hidden">
                      <div
                        className="bg-indigo-500 h-1 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, share))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
