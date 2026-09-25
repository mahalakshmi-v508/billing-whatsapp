import { useState } from "react";
import { X, Clock, AlertTriangle, Check, ShieldAlert } from "lucide-react";

export default function ExtendValidityModal({ bill, isOpen, onClose, onSave }) {
  const [extensionHours, setExtensionHours] = useState("24");
  const [reason, setReason] = useState("Traffic Congestion / Heavy Weather Delay");
  const [consignmentStatus, setConsignmentStatus] = useState("In Transit");
  const [currentLocation, setCurrentLocation] = useState("Dindigul Highway NH 44");
  const [remainingKm, setRemainingKm] = useState("85");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !bill) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSave &&
        onSave({
          ...bill,
          valid_until: "2026-09-27 11:59 PM (Extended)",
          remaining_time: "+24 hours added",
          status: "Active",
          timeline: [
            ...(bill.timeline || []),
            {
              title: "Validity Extended (+24 hrs)",
              time: "Just now",
              user: "Current User",
              note: `Extended at ${currentLocation} - Reason: ${reason}`,
            },
          ],
        });
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Extend E-Way Bill Validity</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                EWB: <span className="font-mono font-bold text-slate-700">{bill.ewb_no}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Current vs New Validity Comparison */}
        <div className="p-4 bg-amber-50/60 border-b border-amber-100/80">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-white p-2.5 rounded-xl border border-amber-200/60 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Current Validity</span>
              <span className="font-bold text-slate-800 text-[12px] block mt-0.5">{bill.valid_until}</span>
              <span className="text-[10px] text-amber-700 font-semibold">{bill.remaining_time}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-emerald-300 shadow-2xs">
              <span className="text-[10px] font-bold text-emerald-600 uppercase block">New Valid Until (Est.)</span>
              <span className="font-bold text-emerald-700 text-[12px] block mt-0.5">+24 Hours Extended</span>
              <span className="text-[10px] text-emerald-600 font-semibold">Valid across checkpoints</span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Consignment Status *</label>
              <select
                value={consignmentStatus}
                onChange={(e) => setConsignmentStatus(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                <option value="In Transit">In Transit (On Highway)</option>
                <option value="In Custody of Transporter">In Custody of Transporter / Hub</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Extension Duration</label>
              <select
                value={extensionHours}
                onChange={(e) => setExtensionHours(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                <option value="24">+24 Hours (1 Day)</option>
                <option value="48">+48 Hours (2 Days)</option>
                <option value="72">+72 Hours (3 Days)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Current Vehicle Location *</label>
              <input
                type="text"
                required
                value={currentLocation}
                onChange={(e) => setCurrentLocation(e.target.value)}
                placeholder="e.g. Near Dindigul Toll Plaza"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Remaining Distance (km) *</label>
              <input
                type="number"
                required
                value={remainingKm}
                onChange={(e) => setRemainingKm(e.target.value)}
                placeholder="e.g. 85"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Reason for Extension *</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            >
              <option value="Traffic Congestion / Heavy Weather Delay">Traffic Congestion / Heavy Weather</option>
              <option value="Vehicle Breakdown / Mechanical Repair">Vehicle Breakdown / Repair</option>
              <option value="Transshipment Delay at Hub">Transshipment Delay at Logistics Hub</option>
              <option value="Law and Order / Road Blockage">Law and Order / Road Blockage</option>
              <option value="Others">Others</option>
            </select>
          </div>

          {/* Statutory Warning Box */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 flex items-start gap-2.5 text-amber-900 text-xs leading-relaxed">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p>
              <strong>Important:</strong> Please verify the transport details and physical location of the cargo before extending validity in accordance with GST Rule 138(10).
            </p>
          </div>

          {/* Footer actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 disabled:opacity-50 text-white text-xs font-bold transition shadow-sm shadow-amber-500/20 cursor-pointer"
            >
              {loading ? (
                <span>Extending...</span>
              ) : (
                <>
                  <Check size={14} strokeWidth={2.5} />
                  <span>Confirm Extension</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
