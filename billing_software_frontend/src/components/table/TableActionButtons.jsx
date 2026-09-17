import { useState, useRef, useEffect } from "react";
import { Eye, Edit, Trash2, Printer, Share2, MoreVertical } from "lucide-react";

export default function TableActionButtons({
  onView,
  viewTitle = "View",
  onEdit,
  editTitle = "Edit",
  onDelete,
  deleteTitle = "Delete",
  onPrint,
  printTitle = "Print",
  onShare,
  shareTitle = "Share",
  dropdownItems = [],
  children,
  className = "",
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleOutside);
    }
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [menuOpen]);

  return (
    <div
      className={`flex items-center justify-center gap-1 text-slate-400 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Print */}
      {onPrint && (
        <button
          type="button"
          onClick={onPrint}
          className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition cursor-pointer"
          title={printTitle}
        >
          <Printer size={15} />
        </button>
      )}

      {/* Share */}
      {onShare && (
        <button
          type="button"
          onClick={onShare}
          className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition cursor-pointer"
          title={shareTitle}
        >
          <Share2 size={15} />
        </button>
      )}

      {/* View */}
      {onView && (
        <button
          type="button"
          onClick={onView}
          className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition cursor-pointer"
          title={viewTitle}
        >
          <Eye size={15} />
        </button>
      )}

      {/* Edit */}
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition cursor-pointer"
          title={editTitle}
        >
          <Edit size={14} />
        </button>
      )}

      {/* Delete */}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
          title={deleteTitle}
        >
          <Trash2 size={14} />
        </button>
      )}

      {/* Custom Child Buttons */}
      {children}

      {/* 3-Dot More Menu */}
      {dropdownItems && dropdownItems.length > 0 && (
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition cursor-pointer"
            title="More actions"
          >
            <MoreVertical size={15} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-8 w-36 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 text-left animate-in fade-in zoom-in-95 duration-100">
              {dropdownItems.map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      setMenuOpen(false);
                      item.onClick && item.onClick(e);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-left transition cursor-pointer ${
                      item.danger
                        ? "text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        : "text-slate-700 hover:bg-blue-50 hover:text-blue-600"
                    }`}
                  >
                    {ItemIcon && <ItemIcon size={14} className={item.danger ? "text-rose-600" : "text-slate-500"} />}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
