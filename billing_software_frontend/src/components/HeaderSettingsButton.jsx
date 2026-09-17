import { Settings } from "lucide-react";

/**
 * Reusable Header Settings Button for Sale & Purchase Workspaces
 * @param {'list' | 'voucher'} [variant='list'] - 'list' (circular, 19px) or 'voucher' (rounded-xl, 16px)
 * @param {Function} [onClick] - Optional click handler
 * @param {boolean} [isActive=false] - Active state styling
 * @param {string} [title="Settings"] - Tooltip text
 * @param {string} [className=""] - Additional custom classes
 */
export default function HeaderSettingsButton({
  variant = "list",
  onClick,
  isActive = false,
  title = "Settings",
  className = ""
}) {
  if (variant === "voucher") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`w-9 h-9 rounded-xl border transition cursor-pointer flex items-center justify-center shadow-2xs ${
          isActive
            ? "bg-blue-50 border-blue-300 text-blue-600"
            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        } ${className}`}
        title={title}
      >
        <Settings size={16} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-9 h-9 flex items-center justify-center rounded-full transition cursor-pointer ${
        isActive
          ? "bg-blue-100 text-blue-600"
          : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
      } ${className}`}
      title={title}
    >
      <Settings size={19} />
    </button>
  );
}
