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
  if (variant === "table") {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        className={`w-8 h-8 rounded-xl border flex items-center justify-center transition cursor-pointer ${
          isActive
            ? "bg-indigo-50 border-indigo-200 text-indigo-600 ring-2 ring-indigo-500/20"
            : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 shadow-2xs"
        } ${className}`}
      >
        <Settings size={14} />
      </button>
    );
  }

  if (variant === "voucher") {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        className={`w-9 h-9 rounded-xl border flex items-center justify-center transition cursor-pointer ${
          isActive
            ? "bg-indigo-50 border-indigo-200 text-indigo-600 ring-2 ring-indigo-500/20"
            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-2xs"
        } ${className}`}
      >
        <Settings size={15} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`h-10 w-10 rounded-xl border flex items-center justify-center transition cursor-pointer ${
        isActive
          ? "bg-indigo-50 border-indigo-200 text-indigo-600 ring-2 ring-indigo-500/20"
          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-xs"
      } ${className}`}
    >
      <Settings size={15} />
    </button>
  );
}
