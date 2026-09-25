import { useState, useRef, useEffect } from "react";
import {
  MoreVertical,
  Eye,
  Truck,
  Clock,
  Printer,
  Download,
  Share2,
  XCircle,
  RotateCcw,
} from "lucide-react";

export default function EwayActionMenu({
  bill,
  onView,
  onUpdateVehicle,
  onExtendValidity,
  onPrint,
  onDownload,
  onWhatsApp,
  onCancel,
  onGenerateNew,
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const isExpired = bill.status === "Expired";
  const isCancelled = bill.status === "Cancelled";
  const isFailed = bill.status === "Failed";

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition cursor-pointer shadow-2xs"
        title="More Actions"
      >
        <MoreVertical size={15} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200/90 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* View Details */}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onView && onView(bill);
            }}
            className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2.5 transition cursor-pointer"
          >
            <Eye size={14} className="text-slate-400" />
            <span>View Details</span>
          </button>

          {!isCancelled && !isFailed && !isExpired && (
            <>
              {/* Update Vehicle */}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onUpdateVehicle && onUpdateVehicle(bill);
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2.5 transition cursor-pointer"
              >
                <Truck size={14} className="text-slate-400" />
                <span>Update Vehicle</span>
              </button>

              {/* Extend Validity */}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onExtendValidity && onExtendValidity(bill);
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-amber-600 flex items-center gap-2.5 transition cursor-pointer"
              >
                <Clock size={14} className="text-slate-400" />
                <span>Extend Validity</span>
              </button>
            </>
          )}

          {isExpired && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onGenerateNew && onGenerateNew(bill);
              }}
              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-blue-600 hover:bg-blue-50 flex items-center gap-2.5 transition cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>Generate New EWB</span>
            </button>
          )}

          <div className="my-1 border-t border-slate-100" />

          {/* Print */}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onPrint && onPrint(bill);
            }}
            className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition cursor-pointer"
          >
            <Printer size={14} className="text-slate-400" />
            <span>Print EWB Slip</span>
          </button>

          {/* Download */}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDownload && onDownload(bill);
            }}
            className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition cursor-pointer"
          >
            <Download size={14} className="text-slate-400" />
            <span>Download PDF</span>
          </button>

          {/* WhatsApp */}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onWhatsApp && onWhatsApp(bill);
            }}
            className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2.5 transition cursor-pointer"
          >
            <Share2 size={14} className="text-emerald-500" />
            <span>Send via WhatsApp</span>
          </button>

          {/* Cancel E-Way Bill (Only if not already cancelled/failed/expired) */}
          {!isCancelled && !isFailed && !isExpired && (
            <>
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onCancel && onCancel(bill);
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition cursor-pointer"
              >
                <XCircle size={14} />
                <span>Cancel E-Way Bill</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
