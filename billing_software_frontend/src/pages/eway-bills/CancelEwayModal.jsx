import { useState } from "react";
import { X, AlertOctagon, AlertTriangle, ShieldX } from "lucide-react";
import { formatINR } from "./mockEwayData";

export default function CancelEwayModal({ bill, isOpen, onClose, onConfirmCancel }) {
  const [reason, setReason] = useState("Order Cancelled by Customer");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !bill) return null;

  const handleCancel = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onConfirmCancel &&
        onConfirmCancel({
          ...bill,
          status: "Cancelled",
          remaining_time: "Cancelled just now",
          cancellation_reason: reason + (remarks ? ` - ${remarks}` : ""),
          cancelled_at: "Just now",
          cancelled_by: "Current User",
          timeline: [
            ...(bill.timeline || []),
            {
              title: "E-Way Bill Cancelled",
              time: "Just now",
              user: "Current User",
              note: `Cancelled on portal. Reason: ${reason} ${remarks ? `(${remarks})` : ""}`,
            },
          ],
        });
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Destructive Warning Header */}
        <div className="px-5 py-4 border-b border-rose-100 flex items-center justify-between bg-rose-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
              <AlertOctagon size={20} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-rose-950">Cancel E-Way Bill</h3>
              <p className="text-[11px] text-rose-700 font-medium">Permanent Cancellation on Portal</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/80 hover:bg-white text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Bill Summary */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">E-Way Bill Number:</span>
            <span className="font-mono font-bold text-slate-800">{bill.ewb_no}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Invoice Ref:</span>
            <span className="font-bold text-slate-800">{bill.invoice_no}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Customer:</span>
            <span className="font-semibold text-slate-800 truncate max-w-[200px]">{bill.customer_name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Invoice Total:</span>
            <span className="font-mono font-bold text-slate-900">{formatINR(bill.total_value)}</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleCancel} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Cancellation Reason *</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            >
              <option value="Order Cancelled by Customer">1. Order Cancelled by Customer</option>
              <option value="Data Entry Mistake">2. Data Entry Mistake in Invoice / EWB</option>
              <option value="Duplicate E-Way Bill">3. Duplicate E-Way Bill Generated</option>
              <option value="Order Postponed / Not Dispatched">4. Order Postponed / Not Dispatched</option>
              <option value="Others">5. Others</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Detailed Remarks (Optional)</label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Consignee requested delivery postponement until next week"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 flex items-start gap-2 text-amber-900 text-[11px] leading-relaxed">
            <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
            <p>
              Under GST rules, an E-Way Bill can only be cancelled within <strong>24 hours</strong> of generation provided transit hasn't been verified by a tax officer.
            </p>
          </div>

          {/* Destructive Confirmation Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Keep E-Way Bill
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 disabled:opacity-50 text-white text-xs font-bold transition shadow-sm shadow-rose-500/20 cursor-pointer"
            >
              <ShieldX size={14} />
              <span>{loading ? "Cancelling..." : "Cancel E-Way Bill"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
