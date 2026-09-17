import { RefreshCw } from "lucide-react";

export default function TableLoadingState({
  colSpan = 10,
  message = "Loading records...",
  className = "",
}) {
  return (
    <tr>
      <td colSpan={colSpan} className={`py-14 text-center text-slate-400 ${className}`}>
        <RefreshCw size={24} className="animate-spin text-blue-600 mx-auto mb-2" />
        <span className="font-semibold text-xs text-slate-500">{message}</span>
      </td>
    </tr>
  );
}
