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
  ReceiptText,
  Users,
  TrendingUp,
  FileText,
  Wallet,
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
        {item.payload.isOther ? "Other Methods" : <Capitalized text={item.name} />}
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

export default function PaymentInAnalytics({ rows = [], period = "", onClose }) {
  const data = useMemo(
    () =>
      rows.map((p, i) => ({
        date: p.payment_date || p.created_at || "",
        receipt: p.receipt_no || p.invoice_no || `#${i + 1}`,
        party: p.customer_name || p.name || "Customer",
        method: p.payment_method || "Cash",
        received: Number(p.paid_amount || 0),
        billed: Number(p.total_amount || p.paid_amount || 0),
        discount: Number(p.discount_amount || 0),
        balance: Number(p.balance_amount || 0),
      })),
    [rows]
  );

  const totals = useMemo(() => {
    let received = 0,
      billed = 0,
      discount = 0,
      balance = 0,
      parties = new Set(),
      methods = new Set();
    data.forEach((r) => {
      received += r.received;
      billed += r.billed;
      discount += r.discount;
      balance += r.balance;
      if (r.party) parties.add(r.party);
      if (r.method) methods.add(r.method);
    });
    return {
      received,
      billed,
      discount,
      balance,
      count: data.length,
      parties: parties.size,
      methods: methods.size,
      avg: data.length ? received / data.length : 0,
    };
  }, [data]);

  const methodData = useMemo(() => {
    const map = new Map();
    data.forEach((r) => {
      map.set(r.method, (map.get(r.method) || 0) + r.received);
    });
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const donut = useMemo(() => {
    const TOP = 5;
    const top = methodData.slice(0, TOP);
    const rest = methodData.slice(TOP);
    const arr = top.map((m, i) => ({ name: m.name, value: m.value, color: COLORS[i % COLORS.length] }));
    if (rest.length) {
      arr.push({ name: "Others", value: rest.reduce((a, m) => a + m.value, 0), color: "#cbd5e1", isOther: true });
    }
    const total = arr.reduce((a, s) => a + s.value, 0) || 1;
    return arr.map((d) => ({ ...d, percent: ((d.value / total) * 100).toFixed(0) }));
  }, [methodData]);

  const maxRow = Math.max(...data.map((r) => r.received), 1);

  return (
    <div className="space-y-6 transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider">
            <span>Sales</span>
            <span>•</span>
            <span>Payment-In Analytics</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              Live Filtered
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            Payment-In Analytics
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            <span className="font-semibold text-emerald-600">{period}</span> • Customer inward payments •{" "}
            {totals.count} voucher{totals.count === 1 ? "" : "s"}
          </p>
        </div>

        {typeof onClose === "function" && (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs cursor-pointer"
            title="Return to Payment-In"
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
              Total Received
            </div>
            <div className="text-2xl sm:text-3xl font-black text-indigo-600 mt-2 tracking-tight">
              {fmtINR(totals.received)}
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Money collected from customers
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-slate-500">
              <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Users className="w-3.5 h-3.5" />
              </span>
              Customers
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-2 tracking-tight">
              {totals.parties}
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Unique customers in this period
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-slate-500">
              <span className="w-6 h-6 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center">
                <ReceiptText className="w-3.5 h-3.5" />
              </span>
              Vouchers
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-800 mt-2 tracking-tight">
              {totals.count}
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Payment-in records received
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-slate-500">
              <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5" />
              </span>
              Avg / Voucher
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-2 tracking-tight">
              {fmtINR(totals.avg)}
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Total received ÷ vouchers
          </div>
        </div>
      </div>

      {/* Summary Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl px-4 py-3 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Billed</span>
          <span className="text-sm font-black text-slate-800">{fmtINR(totals.billed)}</span>
        </div>
        <div className="bg-white rounded-xl px-4 py-3 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Discounts Given</span>
          <span className="text-sm font-black text-amber-600">{fmtINR(totals.discount)}</span>
        </div>
        <div className="bg-white rounded-xl px-4 py-3 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Outstanding</span>
          <span className="text-sm font-black text-rose-500">{fmtINR(totals.balance)}</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top methods bar */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Wallet className="w-4 h-4 text-indigo-600" />
              <span>Top Payment Methods</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">
              Highest total received by payment method
            </p>

            {methodData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
                No data available for the selected period.
              </div>
            ) : (
              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={methodData.slice(0, 8)} margin={{ top: 10, right: 10, left: -6, bottom: 0 }}>
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
                    <Bar dataKey="value" name="Received" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={36} />
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
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Received by Method</h3>
              <span className="text-xs font-bold text-slate-400">{totals.methods} methods</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">Where your collections come from</p>

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
                      {fmtINR(totals.received)}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Received
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
                        {item.isOther ? "Other Methods" : <Capitalized text={item.name} />}
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
              <span>Top Payment-In Vouchers by Received</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Highest inward payment records in this period
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {totals.count} record{totals.count === 1 ? "" : "s"}
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
                  <th className="py-2.5 px-3 font-bold">Date</th>
                  <th className="py-2.5 px-3 font-bold">Receipt No</th>
                  <th className="py-2.5 px-3 font-bold">Customer</th>
                  <th className="py-2.5 px-3 font-bold">Method</th>
                  <th className="py-2.5 px-3 font-bold text-right">Received</th>
                  <th className="py-2.5 pl-3 font-bold">Share</th>
                </tr>
              </thead>
              <tbody>
                {[...data]
                  .sort((a, b) => Number(b.received) - Number(a.received))
                  .slice(0, 20)
                  .map((r, i) => {
                    const share = (Number(r.received) / maxRow) * 100;
                    return (
                      <tr key={`${i}-${r.date}-${r.receipt}`} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition text-xs">
                        <td className="py-3 pr-3">
                          <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center">
                            {i + 1}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-600 whitespace-nowrap">
                          {r.date ? String(r.date).split("T")[0] : "-"}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-800 whitespace-nowrap">{r.receipt}</td>
                        <td className="py-3 px-3 font-semibold text-slate-700 max-w-[220px] truncate" title={r.party}>
                          {r.party}
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-bold text-[10px]">
                            <Capitalized text={r.method} />
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold text-emerald-600">{fmtINR(r.received)}</td>
                        <td className="py-3 pl-3 min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden shrink-0">
                              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, share)}%` }} />
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