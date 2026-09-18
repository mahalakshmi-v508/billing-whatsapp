import { FileText, Construction } from "lucide-react";

/**
 * Shared "coming soon" placeholder used by report pages that don't yet have a
 * full implementation. Keeps the whole Reports set navigable with a consistent
 * look. `title` is the report name (no category names ever shown).
 */
export default function ReportPlaceholder({ title, icon, notes }) {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto text-slate-800 font-sans">
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 shrink-0">
            {icon || <FileText size={20} />}
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight">{title}</h1>
            <p className="text-xs text-slate-500 font-medium">Report Overview & Analytics</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-12 md:p-16 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-400 mb-4 shadow-2xs">
          <Construction size={28} className="text-blue-500" />
        </div>
        <h2 className="text-base font-bold text-slate-800 mb-1">{title}</h2>
        <p className="text-xs text-slate-500 max-w-md font-medium leading-relaxed mb-2">
          This report is currently under active development. Navigation, permissions, and routing are fully configured.
        </p>
        {notes && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200/60 rounded-lg text-xs text-blue-700 font-semibold mt-2">
            {notes}
          </div>
        )}
      </div>
    </div>
  );
}
