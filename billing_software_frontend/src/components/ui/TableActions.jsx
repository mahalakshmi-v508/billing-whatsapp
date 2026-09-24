import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Printer, Share2, MoreVertical, Eye } from "lucide-react";
import ShareTransactionPopover from "../ShareTransactionPopover";

const MENU_VIEWPORT_MARGIN = 8;
const MENU_GAP = 6;
const MENU_OFFSCREEN = -9999;

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

/**
 * Standardized Actions column component for tables across Sale & Purchase menus.
 * Renders ONLY 3 visible items:
 *   1. Print
 *   2. Share
 *   3. 3-Dot More Actions Menu (with "View Invoice" at minimum)
 */
export default function TableActions({
  onPrint,
  printTitle = "Print",
  onShare,
  shareTransaction,
  shareType = "Invoice",
  onViewInvoice,
  viewInvoiceLabel = "View Invoice",
  menuItems = [],
  className = "",
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [popupPos, setPopupPos] = useState(null);
  const btnRef = useRef(null);
  const shareBtnRef = useRef(null);
  const popupRef = useRef(null);

  // Close 3-dot dropdown on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      const btn = btnRef.current;
      const pop = popupRef.current;
      if (btn && btn.contains(e.target)) return;
      if (pop && pop.contains(e.target)) return;
      setMenuOpen(false);
      setPopupPos(null);
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setPopupPos(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  useLayoutEffect(() => {
    if (!menuOpen) return;
    const btn = btnRef.current;
    const pop = popupRef.current;
    if (!btn || !pop) return;
    const pos = getMenuPosition(
      btn.getBoundingClientRect(),
      pop.offsetWidth || 176,
      pop.offsetHeight || 0
    );
    setPopupPos({ top: pos.top, left: pos.left });
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const reposition = () => {
      const btn = btnRef.current;
      const pop = popupRef.current;
      if (!btn || !pop) return;
      const pos = getMenuPosition(
        btn.getBoundingClientRect(),
        pop.offsetWidth || 176,
        pop.offsetHeight || 0
      );
      setPopupPos({ top: pos.top, left: pos.left });
    };
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [menuOpen]);

  const handlePrintClick = (e) => {
    e.stopPropagation();
    if (onPrint) onPrint(e);
  };

  const handleShareClick = (e) => {
    e.stopPropagation();
    if (onShare) {
      onShare(e);
    } else if (shareTransaction) {
      setShareOpen((prev) => !prev);
    }
  };

  const handleToggleMenu = (e) => {
    e.stopPropagation();
    if (menuOpen) {
      setMenuOpen(false);
      setPopupPos(null);
      return;
    }
    setMenuOpen(true);
    setPopupPos({ top: MENU_OFFSCREEN, left: MENU_OFFSCREEN });
  };

  // Compile full menu items ensuring "View Invoice" is present
  const allMenuItems = [];

  // Add View Invoice at top if onViewInvoice provided and not explicitly in menuItems
  const hasExplicitView = menuItems.some(
    (item) => item?.isViewInvoice || (item?.label && item.label.toLowerCase().includes("view"))
  );

  if (onViewInvoice && !hasExplicitView) {
    allMenuItems.push({
      label: viewInvoiceLabel,
      icon: Eye,
      onClick: onViewInvoice,
      isViewInvoice: true,
    });
  }

  // Append provided menu items
  menuItems.forEach((item) => {
    if (item) allMenuItems.push(item);
  });

  return (
    <div
      className={`flex items-center justify-end gap-1 text-slate-400 select-none ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. PRINT ACTION */}
      <button
        type="button"
        onClick={handlePrintClick}
        title={printTitle}
        className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
      >
        <Printer size={15} />
      </button>

      {/* 2. SHARE ACTION */}
      <div className="relative">
        <button
          ref={shareBtnRef}
          type="button"
          onClick={handleShareClick}
          title="Share"
          className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
        >
          <Share2 size={15} />
        </button>

        {shareTransaction && (
          <ShareTransactionPopover
            isOpen={shareOpen}
            onClose={() => setShareOpen(false)}
            transaction={shareTransaction}
            type={shareType}
            anchorElRef={shareBtnRef}
          />
        )}
      </div>

      {/* 3. THREE-DOT MORE ACTIONS */}
      <div className="relative">
        <button
          ref={btnRef}
          type="button"
          onClick={handleToggleMenu}
          title="More actions"
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition cursor-pointer ${
            menuOpen
              ? "text-indigo-600 bg-indigo-50"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          }`}
        >
          <MoreVertical size={15} />
        </button>

        {menuOpen &&
          popupPos &&
          createPortal(
            <div
              ref={popupRef}
              className="fixed w-44 bg-white rounded-xl shadow-2xl border border-slate-200/90 py-1.5 z-[9999] text-left animate-in fade-in zoom-in-95 duration-100"
              style={{ top: popupPos.top, left: popupPos.left }}
            >
              {allMenuItems.map((item, idx) => {
                if (item.isDivider) {
                  return <div key={`div-${idx}`} className="border-t border-slate-100 my-1" />;
                }

                const Icon = item.icon;
                const isDanger = item.isDanger;

                return (
                  <button
                    key={item.label || idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      setPopupPos(null);
                      if (item.onClick) item.onClick(e);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold transition text-left cursor-pointer ${
                      isDanger
                        ? "text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        : "text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                    } ${item.className || ""}`}
                  >
                    {Icon && (
                      <Icon
                        size={14}
                        className={isDanger ? "text-rose-600 shrink-0" : "text-slate-500 shrink-0"}
                      />
                    )}
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>,
            document.body
          )}
      </div>
    </div>
  );
}