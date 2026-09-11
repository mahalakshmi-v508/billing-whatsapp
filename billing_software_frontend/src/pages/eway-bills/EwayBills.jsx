import { useState } from "react";
import { Truck, RefreshCw, Search, SlidersHorizontal, ChevronDown } from "lucide-react";

const TABLE_HEADERS = [
  "EWB Number",
  "Invoice Details",
  "Recipient (Ship To)",
  "Generated Date",
  "Valid Upto",
  "Vehicle / Mode",
  "Status",
];

const STATUS_OPTIONS = ["All Status", "Active", "In Transporter", "Cancelled"];

export default function EwayBills() {
  // No backend integration yet: registry starts empty on purpose.
  const [ewayBills] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All Status");
  const [filterOpen, setFilterOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 900);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setFilterOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 font-['Plus_Jakarta_Sans',sans-serif]">

      {/* ── 1. PAGE HEADER ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Truck size={22} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">E-Way Bills Registry</h1>
            <p className="text-[12.5px] text-slate-500 font-medium truncate">
              Official electronic consignment tracking registry with real-time vehicle update &amp; cancellation
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-[13px] font-semibold hover:bg-slate-50 transition cursor-pointer"
        >
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── 2. SEARCH / FILTER CARD ── */}
      <div className="mt-5 bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
        <div className="relative flex-1 min-w-0 sm:min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch(e)}
            placeholder="Search by EWB No, Invoice"
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-600 text-[13px] font-semibold hover:bg-slate-50 transition cursor-pointer"
          >
            <SlidersHorizontal size={15} />
            <span className="hidden sm:inline">Filter</span>
            <ChevronDown size={14} className={`transition-transform ${filterOpen ? "rotate-180" : ""}`} />
          </button>
          {filterOpen && (
            <div className="absolute right-0 top-12 w-44 z-40 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 animate-in fade-in zoom-in-95 duration-100">
              {STATUS_OPTIONS.map((opt) => (
                <div
                  key={opt}
                  onClick={() => {
                    setStatus(opt);
                    setFilterOpen(false);
                  }}
                  className={`px-3 py-2 text-[13px] font-medium cursor-pointer transition ${
                    status === opt ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {opt}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleSearch}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold shadow-sm cursor-pointer"
        >
          <Search size={15} />
          Search
        </button>
      </div>

      {/* ── 3. E-WAY BILL REGISTRY TABLE / EMPTY STATE ── */}
      <div className="mt-5 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-xs min-w-max">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 uppercase text-[11px] tracking-wide">
              {TABLE_HEADERS.map((h) => (
                <th key={h} className="py-3 px-4 font-semibold whitespace-nowrap">
                  {h}
                </th>
              ))}
              <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {ewayBills.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center mb-5">
                      <Truck size={36} className="text-sky-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">No E-Way Bills Found</h3>
                    <p className="text-sm text-slate-400 max-w-md">
                      Generate an E-Way Bill from any created invoice to populate this registry.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              ewayBills.map((bill) => (
                <tr key={bill.id} className="border-b border-slate-100 hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 font-bold text-blue-600 whitespace-nowrap">{bill.ewbNo}</td>
                  <td className="py-3 px-4 text-slate-600">{bill.invoice}</td>
                  <td className="py-3 px-4 text-slate-600">{bill.recipient}</td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{bill.generatedDate}</td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{bill.validUpto}</td>
                  <td className="py-3 px-4 text-slate-600">{bill.vehicle}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        bill.status === "Active"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          : bill.status === "Cancelled"
                          ? "bg-red-50 text-red-500 border border-red-200"
                          : "bg-blue-50 text-blue-600 border border-blue-200"
                      }`}
                    >
                      {bill.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-slate-400 whitespace-nowrap">—</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}