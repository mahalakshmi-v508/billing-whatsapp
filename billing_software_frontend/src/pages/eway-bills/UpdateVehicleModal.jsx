import { useState } from "react";
import { X, Truck, AlertCircle, Check, Info } from "lucide-react";

export default function UpdateVehicleModal({ bill, isOpen, onClose, onSave }) {
  const [vehicleNo, setVehicleNo] = useState(bill?.vehicle_no || "");
  const [vehicleType, setVehicleType] = useState(bill?.vehicle_type || "Regular");
  const [transporterDocNo, setTransporterDocNo] = useState(bill?.doc_lr_no || "");
  const [reason, setReason] = useState("Transshipment (Goods Transferred to new vehicle)");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !bill) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!vehicleNo.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSave &&
        onSave({
          ...bill,
          vehicle_no: vehicleNo.toUpperCase().trim(),
          vehicle_type: vehicleType,
          doc_lr_no: transporterDocNo,
          timeline: [
            ...(bill.timeline || []),
            {
              title: "Vehicle Updated (Part-B)",
              time: "Just now",
              user: "Current User",
              note: `Changed to ${vehicleNo.toUpperCase()} - Reason: ${reason}`,
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
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
              <Truck size={20} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Update Vehicle Details (Part-B)</h3>
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

        {/* Current Info Banner */}
        <div className="p-4 bg-blue-50/50 border-b border-blue-100/70 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-600">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Vehicle</span>
              <span className="font-mono font-bold text-slate-800">{bill.vehicle_no || "— (Not Assigned)"}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Transporter</span>
              <span className="font-semibold text-slate-800 truncate block">{bill.transporter_name || "Self"}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Distance</span>
              <span className="font-semibold text-slate-800">{bill.distance}</span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>New Vehicle Registration Number *</span>
              <span className="text-[10px] text-slate-400 font-normal">e.g. TN 38 BX 9801</span>
            </label>
            <input
              type="text"
              required
              value={vehicleNo}
              onChange={(e) => setVehicleNo(e.target.value)}
              placeholder="e.g. TN 38 BX 9801"
              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Vehicle Type</label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="Regular">Regular</option>
                <option value="Over Dimensional Cargo (ODC)">ODC (Over Dimensional)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Transporter Doc / LR No</label>
              <input
                type="text"
                value={transporterDocNo}
                onChange={(e) => setTransporterDocNo(e.target.value)}
                placeholder="e.g. LR-98241"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Reason for Vehicle Update *</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="Transshipment (Goods Transferred to new vehicle)">Transshipment (Goods Transferred)</option>
              <option value="Vehicle Breakdown / Mechanical Failure">Vehicle Breakdown</option>
              <option value="Not Updated Earlier (Part-B Entry)">Initial Part-B Update</option>
              <option value="Others / Route Change">Others / Route Change</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Remarks / Location (Optional)</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Transferred at Salem Logistics Hub"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
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
              disabled={loading || !vehicleNo.trim()}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 text-white text-xs font-bold transition shadow-sm shadow-blue-500/20 cursor-pointer"
            >
              {loading ? (
                <span>Updating...</span>
              ) : (
                <>
                  <Check size={14} strokeWidth={2.5} />
                  <span>Update Vehicle</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
