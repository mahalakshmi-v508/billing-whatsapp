import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Sparkles,
  ArrowLeft,
  IndianRupee,
  Percent,
  Package,
  Hash,
  TrendingUp,
  FileText,
  ShoppingBag,
} from "lucide-react";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#7c3aed", "#0891b2", "#f43f5e", "#eab308"];

const fmtINR = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtNum = (n) => Number(n || 0).toLocaleString("en-IN");

function Capitalized({ text }) {
  if (!text) return "-";
  return String(text)
    .split(/[\s_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function taxOf(g) {
  return Number(g.igst || 0) + Number(g.cgst || 0) + Number(g.sgst || 0) + Number(g.cess || 0);
}
function qtyOf(g) {
  if (!Array.isArray(g.items)) return 0;
  return g.items.reduce((a, it) => a + Number(it?.qty || 0), 0);
}

function CustomBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-xl px-4 py-3 shadow-2xl border border-slate-700/50 text-xs">
      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
        HSN {label || "-"}
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
        {item.payload.isOther ? "Other HSNs" : <>HSN {item.name}</>}
      </div>
      <div className="text-slate-400 mt-1">
        Base: <span className="text-white font-semibold">{fmtINR(item.value)}</span>
      </div>
      <div className="text-slate-400">
        Share: <span className="text-white font-semibold">{item.payload.percent}%</span>
      </div>
    </div>
  );
}

export default function SaleSummaryByHSNAnalytics({ rows = [], period = "", onClose }) {
  const totals = useMemo(() => {
    let base = 0,
      tax = 0,
      total = 0,
      qty = 0;
    rows.forEach((g) => {
      base += Number(g.base || 0);
      tax += taxOf(g);
      total += Number(g.total || 0);
      qty += qtyOf(g);
    });
    return { base, tax, total, qty, count: rows.length, rate: base ? (tax / base) * 100 : 0 };
  }, [rows]);

  const topRows = useMemo(
    () => [...rows].sort((a, b) => Number(b.base || 0) - Number(a.base || 0)).slice(0, 8),
    [rows]
  );

  const donut = useMemo(() => {
    const sorted = [...rows].sort((a, b) => Number(b.base || 0) - Number(a.base || 0));
    const TOP = 5;
    const top = sorted.slice(0, TOP);
    const rest = sorted.slice(TOP);
    const data = top.map((g, i) => ({
      name: g.hsn || "NA",
      value: Number(g.base || 0),
      color: COLORS[i % COLORS.length],
    }));
    if (rest.length) {
      data.push({ name: "Others", value: rest.reduce((a, g) => a + Number(g.base || 0), 0), color: "#cbd5e1", isOther: true });
    }
    const total = data.reduce((a, s) => a + s.value, 0) || 1;
    return data.map((d) => ({ ...d, percent: ((d.value / total) * 100).toFixed(0) }));
  }, [rows]);

  const maxRow = Math.max(...rows.map((g) => Number(g.base || 0)), 1);

  return (
    <div className="space-y-6 transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            <span>GST</span>
            <span>•</span>
            <span>Sale Summary By HSN Analytics</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              Live Filtered
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            Sale Summary By HSN Analytics
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            <span className="font-semibold text-indigo-600">{period}</span> • {totals.count} HSN code
            {totals.count === 1 ? "" : "s"}
          </p>
        </div>

        {typeof onClose === "function" && (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs cursor-pointer"
            title="Return to Sale Summary By HSN"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>Close</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-600" />
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-slate-500">
              <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <IndianRupee className="w-3.5 h-3.5" />
              </span>
              Total Base
            </div>
            <div className="text-2xl sm:text-3xl font-black text-indigo-600 mt-2 tracking-tight">
              {fmtINR(totals.base)}
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            {fmtNum(totals.qty)} units sold
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-slate-500">
              <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <Percent className="w-3.5 h-3.5" />
              </span>
              Total Tax
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-2 tracking-tight">
              {fmtINR(totals.tax)}
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            IGST + CGST + SGST + Cess ({totals.rate.toFixed(1)}% of base)
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-slate-500">
              <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Package className="w-3.5 h-3.5" />
              </span>
              Total Value
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-2 tracking-tight">
              {fmtINR(totals.total)}
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Base + tax
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-slate-500">
              <span className="w-6 h-6 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center">
                <Hash className="w-3.5 h-3.5" />
              </span>
              HSN Codes
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-800 mt-2 tracking-tight">
              {totals.count}
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Distinct HSN codes sold
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top HSN bar */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>Top HSN Codes by Base</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">
              Taxable base value for the top-selling HSN codes
            </p>

            {topRows.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
                No data available for the selected period.
              </div>
            ) : (
              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topRows} margin={{ top: 10, right: 10, left: -6, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="hsn"
                      tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                      tickFormatter={(v) => (v ? v.slice(0, 10) : "NA")}
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
                    <Bar dataKey="base" name="Base" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Donut */}
        <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs flex flex-col">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Base by HSN</h3>
              <span className="text-xs font-bold text-slate-400">{donut.length} codes</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">Sales value share per HSN code</p>

            <div className="relative h-44 w-full flex items-center justify-center">
              {donut.length === 0 ? (
                <div className="text-slate-400 text-xs">No data to display</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donut}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={72}
                        paddingAngle={3}
                        strokeWidth={0}
                      >
                        {donut.map((entry, i) => (
                          <Cell key={`cell-${i}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomDonutTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-sm font-black text-slate-900 tracking-tight">
                      {fmtINR(totals.base)}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Base
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2.5 mt-4">
              {donut.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                      <span className="font-bold text-slate-700 truncate">
                        {item.isOther ? "Other HSNs" : <>HSN {item.name}</>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-slate-900">{fmtINR(item.value)}</span>
                      <span className="text-slate-400 font-medium w-8 text-right">{item.percent}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${item.percent}%`, background: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>HSN-wise Summary</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Base, tax and total value per HSN code
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">{totals.count} HSN codes</span>
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">No data available.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="py-2.5 pr-3 font-bold">#</th>
                  <th className="py-2.5 px-3 font-bold">HSN</th>
                  <th className="py-2.5 px-3 font-bold text-right">Qty</th>
                  <th className="py-2.5 px-3 font-bold text-right">Base</th>
                  <th className="py-2.5 px-3 font-bold text-right">Tax</th>
                  <th className="py-2.5 px-3 font-bold text-right">Total</th>
                  <th className="py-2.5 pl-3 font-bold">Share</th>
                </tr>
              </thead>
              <tbody>
                {[...rows]
                  .sort((a, b) => Number(b.base || 0) - Number(a.base || 0))
                  .map((g, i) => {
                    const share = (Number(g.base || 0) / maxRow) * 100;
                    return (
                      <tr key={`${g.hsn}-${i}`} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition text-xs">
                        <td className="py-3 pr-3">
                          <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center">
                            {i + 1}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-800">
                          <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">{g.hsn || "NA"}</span>
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-slate-500">{fmtNum(qtyOf(g))}</td>
                        <td className="py-3 px-3 text-right font-extrabold text-indigo-600">{fmtINR(g.base)}</td>
                        <td className="py-3 px-3 text-right font-bold text-amber-600">{fmtINR(taxOf(g))}</td>
                        <td className="py-3 px-3 text-right font-bold text-slate-800">{fmtINR(g.total)}</td>
                        <td className="py-3 pl-3 min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden shrink-0">
                              <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, share)}%` }} />
                            </div>
                            <span className="font-semibold text-slate-400 w-9 text-right">{share.toFixed(0)}%</span>
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