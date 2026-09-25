import { useMemo } from "react";
import { XCircle, Eye, Printer, Download, Share2 } from "lucide-react";
import EwayStatusBadge from "./EwayStatusBadge";
import EwayActionMenu from "./EwayActionMenu";
import EwayEmptyState from "./EwayEmptyState";
import { formatINR } from "./mockEwayData";

export default function EwayCancelled({
  bills,
  onViewBill,
  onPrint,
  onDownload,
  onWhatsApp,
}) {
  const cancelledBills = useMemo(() => {
    return bills.filter((b) => b.status === "Cancelled");
  }, [bills]);

  return (
    <div className="space-y-6">
      <div className="bg-rose-50/70 rounded-2xl border border-rose-200 p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <XCircle size={20} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-rose-950">Cancelled E-Way Bills</h2>
            <p className="text-xs text-rose-800/80 mt-0.5">
              Consignments cancelled within the statutory 24-hour portal window. These bills are void and invalid for movement.
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">
          {cancelledBills.length} Cancelled
        </span>
      </div>

      {cancelledBills.length === 0 ? (
        <EwayEmptyState
          title="No Cancelled E-Way Bills"
          description="You have no cancelled E-Way Bills in your active records."
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
                  <th className="p-3.5">Cancellation Reason</th>
                  <th className="p-3.5 text-right">Invoice Value</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {cancelledBills.map((b) => (
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
                    <td className="p-3.5 font-semibold text-slate-800 truncate max-w-[170px]">{b.customer_name}</td>
                    <td className="p-3.5">
                      <span className="text-rose-700 font-medium bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100 block truncate max-w-xs">
                        {b.cancellation_reason || "Cancelled on Portal"}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                      {formatINR(b.total_value)}
                    </td>
                    <td className="p-3.5">
                      <EwayStatusBadge status={b.status} size="sm" />
                    </td>
                    <td className="p-3.5 pr-5 text-right">
                      <button
                        type="button"
                        onClick={() => onViewBill(b)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                      >
                        <Eye size={13} />
                        <span>View Details</span>
                      </button>
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
