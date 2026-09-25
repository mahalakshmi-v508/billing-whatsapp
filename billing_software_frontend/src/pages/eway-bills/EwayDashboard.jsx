import { useState } from "react";
import {
  Truck,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  AlertCircle,
  FileCheck2,
  TrendingUp,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import EwayStatusBadge from "./EwayStatusBadge";
import EwayActionMenu from "./EwayActionMenu";
import { formatINR, MOCK_ALERTS } from "./mockEwayData";

export default function EwayDashboard({
  bills,
  metrics,
  onNavigateTab,
  onViewBill,
  onUpdateVehicle,
  onExtendValidity,
  onCancelBill,
  onPrint,
  onDownload,
  onWhatsApp,
}) {
  const [activeAlertFilter, setActiveAlertFilter] = useState("all");

  const recentBills = bills.slice(0, 7);

  return (
    <div className="space-y-6">
      {/* ── Top Header Banner ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 md:p-6 text-white border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 shrink-0">
              <Truck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">E-Way Bill Compliance</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                  <ShieldCheck size={12} /> NIC Gateway Connected
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Manage, monitor, and track your GST E-Way Bills in real-time across active transit corridors.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab("generate")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold transition shadow-lg shadow-blue-600/30 cursor-pointer self-start sm:self-center shrink-0"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Generate E-Way Bill</span>
          </button>
        </div>
      </div>

      {/* ── Summary Cards Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total E-Way Bills */}
        <div
          onClick={() => onNavigateTab("all")}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 hover:border-blue-300 hover:shadow-md transition cursor-pointer group select-none shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 group-hover:text-blue-600 transition">Total Bills</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileCheck2 size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">{metrics.total}</span>
            <span className="text-[11px] text-slate-400 font-medium">All Time</span>
          </div>
        </div>

        {/* Active in Transit */}
        <div
          onClick={() => onNavigateTab("active")}
          className="bg-white rounded-2xl border border-emerald-200/80 p-4 hover:border-emerald-400 hover:shadow-md transition cursor-pointer group select-none shadow-2xs bg-gradient-to-b from-white to-emerald-50/30"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800">Active (In Transit)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700 tracking-tight">{metrics.active}</span>
            <span className="text-[11px] text-emerald-600 font-bold">Valid & Live</span>
          </div>
        </div>

        {/* Expiring Soon */}
        <div
          onClick={() => onNavigateTab("expiring")}
          className="bg-white rounded-2xl border border-amber-200/80 p-4 hover:border-amber-400 hover:shadow-md transition cursor-pointer group select-none shadow-2xs bg-gradient-to-b from-white to-amber-50/40 animate-pulse-slow"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800">Expiring Soon</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700 tracking-tight">{metrics.expiring}</span>
            <span className="text-[11px] text-amber-600 font-bold">&lt; 24h Left</span>
          </div>
        </div>

        {/* Expired */}
        <div
          onClick={() => onNavigateTab("expired")}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 hover:border-slate-400 hover:shadow-md transition cursor-pointer group select-none shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Expired</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800 tracking-tight">{metrics.expired}</span>
            <span className="text-[11px] text-slate-400 font-medium">Delivered / Done</span>
          </div>
        </div>

        {/* Cancelled */}
        <div
          onClick={() => onNavigateTab("cancelled")}
          className="bg-white rounded-2xl border border-rose-200/80 p-4 hover:border-rose-300 hover:shadow-md transition cursor-pointer group select-none shadow-2xs col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800">Cancelled</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-700 tracking-tight">{metrics.cancelled}</span>
            <span className="text-[11px] text-rose-500 font-medium">Void on Portal</span>
          </div>
        </div>
      </div>

      {/* ── Section: Action Required Alerts ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
              Action Required Alerts
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">Auto-synced with NIC compliance server</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {MOCK_ALERTS.map((alt) => {
            const isWarning = alt.type === "warning";
            const isDanger = alt.type === "danger";
            const isSuccess = alt.type === "success";

            const containerStyle = isWarning
              ? "bg-amber-50/70 border-amber-200 hover:border-amber-300 text-amber-950"
              : isDanger
                ? "bg-rose-50/70 border-rose-200 hover:border-rose-300 text-rose-950"
                : isSuccess
                  ? "bg-emerald-50/70 border-emerald-200 hover:border-emerald-300 text-emerald-950"
                  : "bg-blue-50/70 border-blue-200 hover:border-blue-300 text-blue-950";

            const badgeStyle = isWarning
              ? "bg-amber-500 text-white"
              : isDanger
                ? "bg-rose-500 text-white"
                : isSuccess
                  ? "bg-emerald-600 text-white"
                  : "bg-blue-600 text-white";

            const btnStyle = isWarning
              ? "bg-amber-600 hover:bg-amber-700 text-white"
              : isDanger
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : isSuccess
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white";

            return (
              <div
                key={alt.id}
                className={`p-4 rounded-2xl border transition shadow-2xs flex flex-col justify-between gap-3 ${containerStyle}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-black shrink-0 ${badgeStyle}`}>
                    {alt.count}
                  </span>
                  <div>
                    <h3 className="text-xs font-bold leading-tight">{alt.title}</h3>
                    <p className="text-[11px] opacity-80 mt-1 leading-relaxed">{alt.desc}</p>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => onNavigateTab(alt.tabTarget)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${btnStyle}`}
                  >
                    <span>{alt.actionLabel}</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section: Recent E-Way Bills Activity Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-blue-600" />
              Recent E-Way Bills & Transit Activity
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Live tracking for dispatched consignments</p>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab("all")}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition cursor-pointer self-start sm:self-center"
          >
            <span>View All ({bills.length})</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-extrabold uppercase text-slate-500 border-b border-slate-200/80">
                <th className="p-3.5 pl-5">E-Way Bill No</th>
                <th className="p-3.5">Invoice</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5 text-right">Invoice Value</th>
                <th className="p-3.5">Vehicle No</th>
                <th className="p-3.5">Valid Until</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {recentBills.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/70 transition">
                  <td className="p-3.5 pl-5 font-mono font-bold text-slate-900">
                    <button
                      type="button"
                      onClick={() => onViewBill(b)}
                      className="text-blue-600 hover:underline cursor-pointer text-left"
                    >
                      {b.ewb_no}
                    </button>
                  </td>
                  <td className="p-3.5 font-semibold text-slate-800">{b.invoice_no}</td>
                  <td className="p-3.5">
                    <span className="font-semibold text-slate-800 block truncate max-w-[180px]">{b.customer_name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{b.customer_gstin}</span>
                  </td>
                  <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                    {formatINR(b.total_value)}
                  </td>
                  <td className="p-3.5 font-mono text-slate-800">
                    <span className="px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200 font-bold">
                      {b.vehicle_no || "—"}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className="font-semibold text-slate-800 block">{b.valid_until}</span>
                    <span className="text-[10px] text-slate-500">{b.remaining_time}</span>
                  </td>
                  <td className="p-3.5">
                    <EwayStatusBadge status={b.status} size="sm" />
                  </td>
                  <td className="p-3.5 pr-5 text-right">
                    <EwayActionMenu
                      bill={b}
                      onView={onViewBill}
                      onUpdateVehicle={onUpdateVehicle}
                      onExtendValidity={onExtendValidity}
                      onCancel={onCancelBill}
                      onPrint={onPrint}
                      onDownload={onDownload}
                      onWhatsApp={onWhatsApp}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
