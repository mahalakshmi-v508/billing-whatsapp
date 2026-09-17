import { FolderOpen, Plus } from "lucide-react";

export default function TableEmptyState({
  icon: Icon = FolderOpen,
  title = "No Records Found",
  description = "No items match your search or filter criteria.",
  colSpan = 10,
  actionText,
  onAction,
  className = "",
}) {
  return (
    <tr>
      <td colSpan={colSpan} className={`py-14 text-center text-slate-400 ${className}`}>
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <Icon size={24} strokeWidth={1.75} />
        </div>
        <p className="font-bold text-slate-700 text-sm">{title}</p>
        {description && (
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto font-normal leading-relaxed">
            {description}
          </p>
        )}
        {actionText && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="mt-4 app-btn-primary inline-flex items-center gap-1.5 text-xs h-8 px-3.5 rounded-xl cursor-pointer"
          >
            <Plus size={14} />
            <span>{actionText}</span>
          </button>
        )}
      </td>
    </tr>
  );
}
