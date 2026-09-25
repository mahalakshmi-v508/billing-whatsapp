import { useMemo } from "react";
import { AlertTriangle, RotateCcw, Printer, Download, Eye } from "lucide-react";
import EwayStatusBadge from "./EwayStatusBadge";
import EwayActionMenu from "./EwayActionMenu";
import EwayEmptyState from "./EwayEmptyState";
import { formatINR } from "./mockEwayData";

export default function EwayExpired({
  bills,
  onViewBill,
  onGenerateNew,
  onPrint,
  onDownload,
  onWhatsApp,
}) {
  const expiredBills = useMemo(() => {
    return bills.filter((b) => b.status === "Expired");
  }, [bills]);

  return (
    <div className="space-y-6">
      <div className="bg-slate-100/80 rounded-2xl border border-slate-200 p-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-800">Expired E-Way Bills Archive</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Archived consignments whose statutory transit window has expired. Generate a new EWB if goods are being re-transported.
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-700 text-xs font-bold">
          {expiredBills.length} Expired
        </span>
      </div>

      {expiredBills.length === 0 ? (
        <EwayEmptyState
          title="No Expired E-Way Bills"
          description="There are currently no expired consignments in your system archive."
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
                  <th className="p-3.5">Expired On</th>
                  <th className="p-3.5 text-right">Invoice Value</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {expiredBills.map((b) => (
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
                    <td className="p-3.5 font-mono">
                      <span className="px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200 text-slate-800 font-bold">
                        {b.vehicle_no || "—"}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600">{b.valid_until}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                      {formatINR(b.total_value)}
                    </td>
                    <td className="p-3.5">
                      <EwayStatusBadge status={b.status} size="sm" />
                    </td>
                    <td className="p-3.5 pr-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onGenerateNew && onGenerateNew(b)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition cursor-pointer"
                        >
                          <RotateCcw size={13} />
                          <span>Generate New</span>
                        </button>
                        <EwayActionMenu
                          bill={b}
                          onView={onViewBill}
                          onPrint={onPrint}
                          onDownload={onDownload}
                          onWhatsApp={onWhatsApp}
                          onGenerateNew={onGenerateNew}
                        />
                      </div>
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
