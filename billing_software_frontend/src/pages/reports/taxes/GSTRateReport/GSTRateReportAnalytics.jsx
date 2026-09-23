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
  Receipt,
  TrendingUp,
  FileText,
  ShoppingBag,
} from "lucide-react";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#7c3aed", "#0891b2", "#f43f5e", "#eab308"];

const fmtINR = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
        {item.payload.isOther ? "Other Brackets" : <span>{item.name}</span>}
      </div>
      <div className="text-slate-400 mt-1">
        Value: <span className="text-white font-semibold">{fmtINR(item.value)}</span>
      </div>
      <div className="text-slate-400">
        Share: <span className="text-white font-semibold">{item.payload.percent}%</span>
      </div>
    </div>
  );
}

export default function GSTRateReportAnalytics({ rows = [], period = "", onClose }) {
  const data = useMemo(
    () =>
      (rows || []).map((r) => ({
        name: `${r.tax_name || "Tax"} (${r.tax_percent || 0}%)`,
        taxName: r.tax_name || "Tax",
        taxPercent: r.tax_percent || 0,
        taxableSale: Number(r.taxable_sale_amount || 0),
        taxablePurchase: Number(r.taxable_purchase_expense_amount || 0),
        taxIn: Number(r.tax_in || 0),
        taxOut: Number(r.tax_out || 0),
        value: Number(r.taxable_sale_amount || 0),
      })),
    [rows]
  );

  const totals = useMemo(() => {
    let taxableSale = 0,
      taxablePurchase = 0,
      taxIn = 0,
      taxOut = 0;
    const brackets = new Set();
    data.forEach((r) => {
      taxableSale += r.taxableSale;
      taxablePurchase += r.taxablePurchase;
      taxIn += r.taxIn;
      taxOut += r.taxOut;
      if (r.name) brackets.add(r.name);
    });
    return {
      taxableSale,
      taxablePurchase,
      taxIn,
      taxOut,
      net: taxIn - taxOut,
      count: data.length,
      brackets: brackets.size,
      avg: data.length ? taxableSale / data.length : 0,
    };
  }, [data]);

  const bracketData = useMemo(
    () => [...data].sort((a, b) => b.value - a.value),
    [data]
  );

  const donut = useMemo(() => {
    const TOP = 5;
    const top = bracketData.slice(0, TOP);
    const rest = bracketData.slice(TOP);
    const arr = top.map((p, i) => ({ name: p.name, value: p.value, color: COLORS[i % COLORS.length] }));
    if (rest.length) {
      arr.push({ name: "Others", value: rest.reduce((a, p) => a + p.value, 0), color: "#cbd5e1", isOther: true });
    }
    const total = arr.reduce((a, s) => a + s.value, 0) || 1;
    return arr.map((d) => ({ ...d, percent: ((d.value / total) * 100).toFixed(0) }));
  }, [bracketData]);

  const maxRow = Math.max(...data.map((r) => r.value), 1);

  return (
    <div className="space-y-6 transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            <span>Taxation Reports</span>
            <span>•</span>
            <span>GST Slab Analytics</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              Live Filtered
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            GST Tax Rate Analytics
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            <span className="font-semibold text-indigo-600">{period}</span> • Rate bracket breakdown •{" "}
            {totals.brackets} slab{totals.brackets === 1 ? "" : "s"}
          </p>
        </div>

        {typeof onClose === "function" && (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs cursor-pointer"
            title="Return to GST Tax Rate Report"
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
              Taxable Sale
            </div>
            <div className="text-2xl sm:text-3xl font-black text-indigo-600 mt-2 tracking-tight">
              {fmtINR(totals.taxableSale)}
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Taxable value of sales
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-slate-500">
              <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Receipt className="w-3.5 h-3.5" />
              </span>
              Tax In (ITC)
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-2 tracking-tight">
              {fmtINR(totals.taxIn)}
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Input tax credit claimed
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-slate-500">
              <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5" />
              </span>
              Tax Out (Collected)
            </div>
            <div className="text-2xl sm:text-3xl font-black text-blue-600 mt-2 tracking-tight">
              {fmtINR(totals.taxOut)}
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Tax collected on outward supplies
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-slate-500">
              <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <Percent className="w-3.5 h-3.5" />
              </span>
              Tax Slabs
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-2 tracking-tight">
              {totals.brackets}
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Active GST rate brackets
          </div>
        </div>
      </div>

      {/* Summary Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl px-4 py-3 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Taxable Purchase/Expense</span>
          <span className="text-sm font-black text-slate-700">
            {fmtINR(totals.taxablePurchase)}
          </span>
        </div>
        <div className="bg-white rounded-xl px-4 py-3 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Net Tax (ITC - Collected)</span>
          <span className="text-sm font-black text-emerald-600">{fmtINR(totals.net)}</span>
        </div>
        <div className="bg-white rounded-xl px-4 py-3 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Avg / Slab</span>
          <span className="text-sm font-black text-violet-600">{fmtINR(totals.avg)}</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top brackets bar */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-indigo-600" />
              <span>Top Rate Brackets by Taxable Sale</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">
              Taxable sale value per GST rate bracket
            </p>

            {bracketData.slice(0, 8).length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
                No data available for the selected period.
              </div>
            ) : (
              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bracketData.slice(0, 8)} margin={{ top: 10, right: 10, left: -6, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="name"
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
                    <Bar dataKey="value" name="Value" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={36} />
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
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Sale by Bracket</h3>
              <span className="text-xs font-bold text-slate-400">{donut.length} entries</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">How taxable sales distribute across slabs</p>

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
                      {fmtINR(totals.taxableSale)}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Taxable
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
                      <span className="font-semibold text-slate-700 truncate">
                        {item.isOther ? "Other Brackets" : item.name}
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
              <span>Top Rate Brackets</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Taxable sale, input credit and tax collected per bracket
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {totals.count} bracket{totals.count === 1 ? "" : "s"}
          </span>
        </div>

        {data.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">No data available.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="py-2.5 pr-3 font-bold">#</th>
                  <th className="py-2.5 px-3 font-bold">Rate Bracket</th>
                  <th className="py-2.5 px-3 font-bold text-right">Taxable Sale</th>
                  <th className="py-2.5 px-3 font-bold text-right">Tax In (ITC)</th>
                  <th className="py-2.5 px-3 font-bold text-right">Tax Out</th>
                  <th className="py-2.5 pl-3 font-bold">Share</th>
                </tr>
              </thead>
              <tbody>
                {[...data]
                  .sort((a, b) => b.value - a.value)
                  .slice(0, 20)
                  .map((r, i) => {
                    const share = (r.value / maxRow) * 100;
                    return (
                      <tr key={`${i}-${r.name}`} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition text-xs">
                        <td className="py-3 pr-3">
                          <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center">
                            {i + 1}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-800 whitespace-nowrap">
                          {r.taxName} <span className="text-slate-400 font-semibold">({r.taxPercent}%)</span>
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-slate-700 tabular-nums">{fmtINR(r.taxableSale)}</td>
                        <td className="py-3 px-3 text-right font-semibold text-emerald-700 tabular-nums">{fmtINR(r.taxIn)}</td>
                        <td className="py-3 px-3 text-right font-semibold text-blue-700 tabular-nums">{fmtINR(r.taxOut)}</td>
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