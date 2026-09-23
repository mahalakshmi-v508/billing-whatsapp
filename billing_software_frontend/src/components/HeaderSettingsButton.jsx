import { Settings } from "lucide-react";

/**
 * Standardized header settings button for opening column customization drawers.
 */
export default function HeaderSettingsButton({
  onClick,
  isActive = false,
  variant = "default",
  title = "Customise Table Columns",
  className = "",
}) {
  if (variant === "voucher") {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        className={`h-9 px-3 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition cursor-pointer ${
          isActive
            ? "bg-indigo-50 border-indigo-200 text-indigo-600 ring-2 ring-indigo-500/20"
            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-2xs"
        } ${className}`}
      >
        <Settings size={15} />
        <span className="hidden sm:inline">Columns</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`h-10 px-3.5 rounded-xl border flex items-center gap-2 text-xs font-semibold transition cursor-pointer ${
        isActive
          ? "bg-indigo-50 border-indigo-200 text-indigo-600 ring-2 ring-indigo-500/20"
          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-xs"
      } ${className}`}
    >
      <Settings size={15} />
      <span className="hidden sm:inline">Columns</span>
    </button>
  );
}
