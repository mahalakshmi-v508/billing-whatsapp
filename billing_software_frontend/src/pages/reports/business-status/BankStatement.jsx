import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import ReportPlaceholder from "../../../components/reports/ReportPlaceholder";
import ReportAnalyticsView from "../../../components/reports/ReportAnalyticsView";

export default function BankStatement() {
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  const analyticsRows = useMemo(() => [], []);

  return (
    <>
      <div className="flex items-center justify-end gap-2.5 px-4 md:px-6 lg:px-8 pt-4 md:pt-6 lg:pt-8">
        <button
          type="button"
          onClick={() => setAnalyticsOpen(true)}
          disabled={!analyticsRows.length}
          title="Open Analytics"
          className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <BarChart3 size={16} />
          <span>Analytics</span>
        </button>
      </div>
      <ReportPlaceholder title={"Bank Statement"} />
      {analyticsOpen && (
        <ReportAnalyticsView
          title="Bank Statement Analytics"
          subtitle={`${analyticsRows.length} records`}
          rows={analyticsRows}
          symbol="₹"
          groupLabel="Transactions"
          onClose={() => setAnalyticsOpen(false)}
        />
      )}
    </>
  );
}