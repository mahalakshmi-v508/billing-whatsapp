import { useState, useMemo } from "react";
import {
  Clock,
  CheckCircle2,
  Truck,
  RotateCcw,
  XCircle,
  AlertCircle,
  Filter,
  FileText,
  User,
  ShieldCheck,
  Search,
} from "lucide-react";
import { MOCK_ACTIVITY_HISTORY } from "./mockEwayData";

const EVENT_FILTERS = [
  { id: "all", label: "All Events" },
  { id: "Generated", label: "Generated" },
  { id: "Vehicle", label: "Vehicle Updates" },
  { id: "Validity", label: "Validity Extensions" },
  { id: "Cancelled", label: "Cancellations" },
  { id: "Failed", label: "Errors & Failures" },
];

export default function EwayHistory({ onViewBillByEwb }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filteredEvents = useMemo(() => {
    return MOCK_ACTIVITY_HISTORY.filter((item) => {
      if (filter === "Generated" && !item.badge.includes("Generated")) return false;
      if (filter === "Vehicle" && !item.badge.includes("Vehicle")) return false;
      if (filter === "Validity" && !item.badge.includes("Validity")) return false;
      if (filter === "Cancelled" && !item.badge.includes("Cancelled")) return false;
      if (filter === "Failed" && !item.badge.includes("Failed")) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          item.event.toLowerCase().includes(q) ||
          item.ewb_no.toLowerCase().includes(q) ||
          item.invoice_no.toLowerCase().includes(q) ||
          item.customer.toLowerCase().includes(q) ||
          item.details.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [filter, search]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Clock size={18} className="text-blue-600" />
              E-Way Bill Compliance Audit Log & History
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Chronological log of all generation, vehicle modifications, validity extensions, and cancellations.
            </p>
          </div>

          <div className="relative w-full sm:w-60">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search history by EWB, invoice..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 paysplitx-scrollbar-light">
          {EVENT_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                filter === f.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vertical Timeline Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        {filteredEvents.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 font-medium">
            No historical events match your search/filter criteria.
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-8">
            {filteredEvents.map((evt) => {
              const isGen = evt.badgeTone === "emerald";
              const isVeh = evt.badgeTone === "blue";
              const isExt = evt.badgeTone === "amber";
              const isDanger = evt.badgeTone === "red";

              const dotColor = isGen
                ? "bg-emerald-500 ring-4 ring-emerald-100"
                : isVeh
                ? "bg-blue-500 ring-4 ring-blue-100"
                : isExt
                ? "bg-amber-500 ring-4 ring-amber-100"
                : "bg-rose-500 ring-4 ring-rose-100";

              const badgeColor = isGen
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : isVeh
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : isExt
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-rose-50 text-rose-700 border-rose-200";

              return (
                <div key={evt.id} className="relative group">
                  {/* Timeline Dot */}
                  <span className={`absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full ${dotColor} transition-transform group-hover:scale-125`} />

                  <div className="bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/80 p-4.5 space-y-2 transition shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-sm font-black text-slate-900">{evt.event}</h3>
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${badgeColor}`}>
                          {evt.badge}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400">{evt.timestamp}</span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{evt.details}</p>

                    {/* Metadata References */}
                    <div className="flex items-center gap-4 text-xs text-slate-500 pt-1 border-t border-slate-200/60 flex-wrap">
                      <span>
                        EWB: <strong className="font-mono text-slate-800">{evt.ewb_no}</strong>
                      </span>
                      <span>
                        Invoice: <strong className="text-slate-800">{evt.invoice_no}</strong>
                      </span>
                      <span>
                        Party: <strong className="text-slate-800">{evt.customer}</strong>
                      </span>
                      <span>
                        User: <strong className="text-slate-800">{evt.user}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
