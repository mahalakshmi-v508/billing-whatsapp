import React from "react";
import { AlertCircle, RefreshCw, HelpCircle } from "lucide-react";

export default function EwayErrorState({
  title = "Failed to load E-Way Bill data",
  message = "An error occurred while communicating with the E-Way Bill portal. Please check your connection or gateway credentials.",
  onRetry,
}) {
  return (
    <div className="bg-rose-50/60 rounded-2xl border border-rose-200 p-8 md:p-10 text-center flex flex-col items-center justify-center max-w-lg mx-auto">
      <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 mb-3 shadow-2xs">
        <AlertCircle size={24} />
      </div>
      <h3 className="text-sm font-bold text-rose-900">{title}</h3>
      <p className="text-xs text-rose-700/80 mt-1 max-w-md leading-relaxed">{message}</p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold transition shadow-xs cursor-pointer"
        >
          <RefreshCw size={13} />
          <span>Retry Operation</span>
        </button>
      )}
    </div>
  );
}
