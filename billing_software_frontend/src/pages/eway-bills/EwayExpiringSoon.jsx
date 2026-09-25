import { useState, useMemo } from "react";
import {
  Clock,
  AlertTriangle,
  Truck,
  Plus,
  ArrowRight,
  ShieldAlert,
  Printer,
  Download,
  Share2,
} from "lucide-react";
import EwayStatusBadge from "./EwayStatusBadge";
import EwayActionMenu from "./EwayActionMenu";
import EwayEmptyState from "./EwayEmptyState";
import { formatINR } from "./mockEwayData";

const TIMEFRAME_FILTERS = [
  { id: "all", label: "All Expiring" },
  { id: "today", label: "Expiring Today" },
  { id: "tomorrow", label: "Expiring Tomorrow" },
  { id: "3days", label: "Next 3 Days" },
  { id: "7days", label: "Next 7 Days" },
];

export default function EwayExpiringSoon({
  bills,
  onViewBill,
  onUpdateVehicle,
  onExtendValidity,
  onCancelBill,
  onPrint,
  onDownload,
  onWhatsApp,
}) {
  const [timeframe, setTimeframe] = useState("all");

  const expiringBills = useMemo(() => {
    return bills.filter((b) => b.status === "Expiring Soon" || (b.status === "Active" && b.remaining_time?.includes("hour")));
  }, [bills]);

  return (
    <div className="space-y-6">
      {/* Top Banner Alert */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent rounded-2xl border border-amber-200/80 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
            <Clock size={22} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-amber-950">Expiring E-Way Bills (Action Required)</h2>
            <p className="text-xs text-amber-900/80 mt-0.5 max-w-xl">
              E-Way Bills expiring within the statutory delivery window. Extend validity before midnight to prevent vehicle detention and interstate penalties.
            </p>
          </div>
        </div>

        {/* Timeframe Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto paysplitx-scrollbar-light">
          {TIMEFRAME_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setTimeframe(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                timeframe === f.id
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-white hover:bg-amber-100 text-amber-900 border border-amber-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {expiringBills.length === 0 ? (
        <EwayEmptyState
          title="No E-Way Bills Expiring Soon"
          description="All active consignments are well within their statutory travel validity limits."
          actionLabel="View All E-Way Bills"
          icon={ShieldAlert}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-extrabold uppercase text-slate-500 border-b border-slate-200/80">
                  <th className="p-3.5 pl-5">E-Way Bill No</th>
                  <th className="p-3.5">Invoice No</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Vehicle No</th>
                  <th className="p-3.5">Valid Until</th>
                  <th className="p-3.5">Remaining Time</th>
                  <th className="p-3.5">Quick Actions</th>
                  <th className="p-3.5 pr-5 text-right">More</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {expiringBills.map((b) => (
                  <tr key={b.id} className="hover:bg-amber-50/40 transition">
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
                    <td className="p-3.5 font-semibold text-slate-800 truncate max-w-[170px]">{b.customer_name}</td>
                    <td className="p-3.5 font-mono font-bold text-slate-800">
                      <span className="px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200">
                        {b.vehicle_no || "—"}
                      </span>
                    </td>
                    <td className="p-3.5 font-medium text-slate-800">{b.valid_until}</td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                        <Clock size={12} />
                        {b.remaining_time}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onExtendValidity && onExtendValidity(b)}
                          className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold transition shadow-2xs cursor-pointer"
                        >
                          Extend Validity
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateVehicle && onUpdateVehicle(b)}
                          className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                        >
                          Update Vehicle
                        </button>
                      </div>
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
      )}
    </div>
  );
}
