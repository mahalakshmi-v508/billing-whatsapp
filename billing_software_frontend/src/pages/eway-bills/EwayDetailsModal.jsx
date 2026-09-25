import { useState } from "react";
import {
  X,
  Printer,
  Download,
  Share2,
  Truck,
  Clock,
  Building2,
  User,
  FileText,
  MapPin,
  Calendar,
  CheckCircle2,
  Package,
  Layers,
  ShieldCheck,
  RotateCcw,
  Copy,
  Check,
  XCircle,
} from "lucide-react";
import EwayStatusBadge from "./EwayStatusBadge";
import { formatINR } from "./mockEwayData";

export default function EwayDetailsModal({
  bill,
  isOpen,
  onClose,
  onUpdateVehicle,
  onExtendValidity,
  onCancel,
  onPrint,
  onDownload,
  onWhatsApp,
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !bill) return null;

  const handleCopyEwb = () => {
    navigator.clipboard?.writeText(bill.ewb_no);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isCancelled = bill.status === "Cancelled";
  const isFailed = bill.status === "Failed";
  const isExpired = bill.status === "Expired";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Truck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  E-Way Bill #{bill.ewb_no}
                </h2>
                <button
                  type="button"
                  onClick={handleCopyEwb}
                  title="Copy E-Way Bill Number"
                  className="p-1 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
                >
                  {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </button>
                <EwayStatusBadge status={bill.status} size="md" />
              </div>
              <p className="text-xs text-slate-500">
                Generated from Invoice: <strong className="text-slate-700">{bill.invoice_no}</strong> • Created on {bill.generated_at}
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={() => onPrint && onPrint(bill)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition shadow-2xs cursor-pointer"
            >
              <Printer size={13} />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              type="button"
              onClick={() => onDownload && onDownload(bill)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition shadow-2xs cursor-pointer"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              type="button"
              onClick={() => onWhatsApp && onWhatsApp(bill)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold text-emerald-700 transition shadow-2xs cursor-pointer"
            >
              <Share2 size={13} />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition cursor-pointer ml-1"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 paysplitx-scrollbar-light">
          {/* Failure / Cancellation Warning Banner */}
          {bill.failure_reason && (
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 flex items-start gap-3 text-rose-900 text-xs">
              <XCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block">Generation Failure Details:</strong>
                <p className="mt-0.5 leading-relaxed">{bill.failure_reason}</p>
              </div>
            </div>
          )}

          {bill.cancellation_reason && (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-3 text-amber-900 text-xs">
              <XCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block">Cancellation Note:</strong>
                <p className="mt-0.5 leading-relaxed">{bill.cancellation_reason}</p>
              </div>
            </div>
          )}

          {/* Section 1: Validity & LifeCycle Visual Timeline */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Clock size={14} className="text-blue-600" /> Validity & Movement Lifecycle
              </span>
              <span className="text-xs font-bold text-blue-600">{bill.remaining_time}</span>
            </div>

            {/* Horizontal / Grid Lifecycle Steps */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Generated At</span>
                <span className="text-xs font-bold text-slate-800 block mt-0.5">{bill.generated_at}</span>
                <span className="text-[10px] text-emerald-600 font-semibold">NIC GSP Verified</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Assigned Vehicle</span>
                <span className="text-xs font-mono font-bold text-slate-800 block mt-0.5">{bill.vehicle_no || "—"}</span>
                <span className="text-[10px] text-slate-500">{bill.vehicle_type}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Distance</span>
                <span className="text-xs font-bold text-slate-800 block mt-0.5">{bill.distance}</span>
                <span className="text-[10px] text-slate-500">Mode: {bill.transport_mode}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Valid Until</span>
                <span className="text-xs font-bold text-slate-800 block mt-0.5">{bill.valid_until}</span>
                <span className="text-[10px] text-blue-600 font-semibold">{bill.status}</span>
              </div>
            </div>

            {/* Audit Log Events */}
            {bill.timeline && bill.timeline.length > 0 && (
              <div className="pt-2 border-t border-slate-200/60 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Activity History:</span>
                <div className="space-y-1.5">
                  {bill.timeline.map((evt, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-slate-600">
                      <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                      <div>
                        <strong className="text-slate-800 font-semibold">{evt.title}</strong>
                        <span className="text-slate-400 text-[11px] ml-2">({evt.time} by {evt.user})</span>
                        <p className="text-[11px] text-slate-500">{evt.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Supplier & Consignee 2-Col Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Supplier / From */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Building2 size={13} className="text-slate-600" /> Supplier (From / Dispatch)
              </span>
              <h4 className="text-sm font-black text-slate-900">{bill.supplier_name}</h4>
              <p className="text-xs font-mono font-bold text-slate-700">GSTIN: {bill.supplier_gstin}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{bill.supplier_address}</p>
            </div>

            {/* Customer / To */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <User size={13} className="text-blue-600" /> Consignee (To / Ship To)
              </span>
              <h4 className="text-sm font-black text-slate-900">{bill.customer_name}</h4>
              <p className="text-xs font-mono font-bold text-slate-700">GSTIN: {bill.customer_gstin || "Unregistered"}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{bill.customer_address}</p>
              {bill.place_of_delivery && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                  <MapPin size={11} /> Place of Delivery: {bill.place_of_delivery}
                </span>
              )}
            </div>
          </div>

          {/* Section 3: Transportation Details (Part-B) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Truck size={14} className="text-indigo-600" /> Transportation Details (Part-B)
              </span>
              {!isCancelled && !isFailed && !isExpired && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onUpdateVehicle && onUpdateVehicle(bill);
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                >
                  Edit Vehicle
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Transporter Name</span>
                <span className="font-semibold text-slate-800 truncate block mt-0.5">{bill.transporter_name || "Self"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Transporter ID</span>
                <span className="font-mono font-semibold text-slate-800 block mt-0.5">{bill.transporter_id || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Doc / LR Number</span>
                <span className="font-semibold text-slate-800 block mt-0.5">{bill.doc_lr_no || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">LR Date</span>
                <span className="font-semibold text-slate-800 block mt-0.5">{bill.doc_lr_date || "—"}</span>
              </div>
            </div>
          </div>

          {/* Section 4: Item Summary Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Package size={14} className="text-blue-600" /> Item Summary
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {bill.items ? bill.items.length : 1} Line Item(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-[11px] font-extrabold uppercase text-slate-500 border-b border-slate-100">
                    <th className="p-3">Product Description</th>
                    <th className="p-3">HSN</th>
                    <th className="p-3 text-right">Qty</th>
                    <th className="p-3 text-right">Taxable (₹)</th>
                    <th className="p-3 text-right">GST</th>
                    <th className="p-3 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {bill.items && bill.items.length > 0 ? (
                    bill.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-900">{item.name}</td>
                        <td className="p-3 font-mono">{item.hsn}</td>
                        <td className="p-3 text-right">{item.qty} {item.unit}</td>
                        <td className="p-3 text-right font-mono font-medium">{formatINR(item.taxable)}</td>
                        <td className="p-3 text-right font-mono">{item.gst_rate}% ({formatINR(item.gst_amount)})</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">{formatINR(item.total)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="p-3 font-semibold text-slate-900">General Cargo / Invoiced Goods</td>
                      <td className="p-3 font-mono">9988</td>
                      <td className="p-3 text-right">1 Lot</td>
                      <td className="p-3 text-right font-mono">{formatINR(bill.taxable_value)}</td>
                      <td className="p-3 text-right font-mono">{formatINR(bill.cgst + bill.sgst + bill.igst)}</td>
                      <td className="p-3 text-right font-mono font-bold">{formatINR(bill.total_value)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Total Tax Summary Footer */}
            <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4 text-slate-600">
                <span>Taxable: <strong className="text-slate-800 font-mono">{formatINR(bill.taxable_value)}</strong></span>
                {bill.cgst > 0 && <span>CGST: <strong className="text-slate-800 font-mono">{formatINR(bill.cgst)}</strong></span>}
                {bill.sgst > 0 && <span>SGST: <strong className="text-slate-800 font-mono">{formatINR(bill.sgst)}</strong></span>}
                {bill.igst > 0 && <span>IGST: <strong className="text-slate-800 font-mono">{formatINR(bill.igst)}</strong></span>}
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 mr-2">Invoice Total Value:</span>
                <span className="text-base font-black text-slate-900 font-mono">{formatINR(bill.total_value)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {!isCancelled && !isFailed && !isExpired && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onCancel && onCancel(bill);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              >
                Cancel E-Way Bill
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {!isCancelled && !isFailed && !isExpired && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onUpdateVehicle && onUpdateVehicle(bill);
                  }}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition shadow-2xs cursor-pointer"
                >
                  Update Vehicle
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onExtendValidity && onExtendValidity(bill);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Extend Validity
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
