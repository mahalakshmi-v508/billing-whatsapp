import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
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

const MENU_VIEWPORT_MARGIN = 8;
const MENU_GAP = 6;
const MENU_OFFSCREEN = -9999;

/* 3-DOT POPUP POSITIONING LOGIC
   1. read the clicked button rect via getBoundingClientRect
   2. measure free space below / above the button
   3. if space below fits the full popup -> open below, else -> open above
   4. clamp left/right so the popup never leaves the viewport */
function getMenuPosition(btnRect, menuWidth, menuHeight) {
  const vw = window.innerWidth || document.documentElement.clientWidth || 0;
  const vh = window.innerHeight || document.documentElement.clientHeight || 0;

  const spaceBelow = vh - btnRect.bottom - MENU_GAP - MENU_VIEWPORT_MARGIN;
  const spaceAbove = btnRect.top - MENU_GAP - MENU_VIEWPORT_MARGIN;

  let openUp;
  if (spaceBelow >= menuHeight) openUp = false;
  else if (spaceAbove >= menuHeight) openUp = true;
  else openUp = spaceAbove > spaceBelow;

  let top = openUp ? btnRect.top - menuHeight - MENU_GAP : btnRect.bottom + MENU_GAP;
  top = Math.max(MENU_VIEWPORT_MARGIN, Math.min(top, vh - menuHeight - MENU_VIEWPORT_MARGIN));

  let left = btnRect.right - menuWidth;
  left = Math.max(MENU_VIEWPORT_MARGIN, Math.min(left, vw - menuWidth - MENU_VIEWPORT_MARGIN));

  return { top, left, openUp };
}

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
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const popupRef = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    setPos(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      const btn = btnRef.current;
      const pop = popupRef.current;
      if (btn && btn.contains(e.target)) return;
      if (pop && pop.contains(e.target)) return;
      close();
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, close]);

  const reposition = useCallback(() => {
    const btn = btnRef.current;
    const pop = popupRef.current;
    if (!btn || !pop) return;
    const p = getMenuPosition(
      btn.getBoundingClientRect(),
      pop.offsetWidth || 192,
      pop.offsetHeight || 0
    );
    setPos({ top: p.top, left: p.left });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, reposition]);

  const isExpired = bill.status === "Expired";
  const isCancelled = bill.status === "Cancelled";
  const isFailed = bill.status === "Failed";

  return (
    <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        ref={btnRef}
        onClick={() => {
          if (open) {
            close();
            return;
          }
          setOpen(true);
          setPos({ top: MENU_OFFSCREEN, left: MENU_OFFSCREEN });
        }}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer shadow-2xs ${
          open
            ? "bg-slate-200 text-slate-900"
            : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900"
        }`}
        title="More Actions"
      >
        <MoreVertical size={15} />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={popupRef}
            className="fixed w-48 bg-white rounded-xl shadow-2xl border border-slate-200/90 py-1.5 z-[9999] text-left animate-in fade-in zoom-in-95 duration-150"
            style={{ top: pos.top, left: pos.left }}
          >
            {/* View Details */}
            <button
              type="button"
              onClick={() => {
                close();
                onView && onView(bill);
              }}
              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2.5 transition cursor-pointer"
            >
              <Eye size={14} className="text-slate-400 shrink-0" />
              <span>View Details</span>
            </button>

            {!isCancelled && !isFailed && !isExpired && (
              <>
                {/* Update Vehicle */}
                <button
                  type="button"
                  onClick={() => {
                    close();
                    onUpdateVehicle && onUpdateVehicle(bill);
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2.5 transition cursor-pointer"
                >
                  <Truck size={14} className="text-slate-400 shrink-0" />
                  <span>Update Vehicle</span>
                </button>

                {/* Extend Validity */}
                <button
                  type="button"
                  onClick={() => {
                    close();
                    onExtendValidity && onExtendValidity(bill);
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-amber-600 flex items-center gap-2.5 transition cursor-pointer"
                >
                  <Clock size={14} className="text-slate-400 shrink-0" />
                  <span>Extend Validity</span>
                </button>
              </>
            )}

            {isExpired && (
              <button
                type="button"
                onClick={() => {
                  close();
                  onGenerateNew && onGenerateNew(bill);
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-blue-600 hover:bg-blue-50 flex items-center gap-2.5 transition cursor-pointer"
              >
                <RotateCcw size={14} className="shrink-0" />
                <span>Generate New EWB</span>
              </button>
            )}

            <div className="my-1 border-t border-slate-100" />

            {/* Print */}
            <button
              type="button"
              onClick={() => {
                close();
                onPrint && onPrint(bill);
              }}
              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition cursor-pointer"
            >
              <Printer size={14} className="text-slate-400 shrink-0" />
              <span>Print EWB Slip</span>
            </button>

            {/* Download */}
            <button
              type="button"
              onClick={() => {
                close();
                onDownload && onDownload(bill);
              }}
              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition cursor-pointer"
            >
              <Download size={14} className="text-slate-400 shrink-0" />
              <span>Download PDF</span>
            </button>

            {/* WhatsApp */}
            <button
              type="button"
              onClick={() => {
                close();
                onWhatsApp && onWhatsApp(bill);
              }}
              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2.5 transition cursor-pointer"
            >
              <Share2 size={14} className="text-emerald-500 shrink-0" />
              <span>Send via WhatsApp</span>
            </button>

            {/* Cancel E-Way Bill (Only if not already cancelled/failed/expired) */}
            {!isCancelled && !isFailed && !isExpired && (
              <>
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={() => {
                    close();
                    onCancel && onCancel(bill);
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition cursor-pointer"
                >
                  <XCircle size={14} className="shrink-0" />
                  <span>Cancel E-Way Bill</span>
                </button>
              </>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
