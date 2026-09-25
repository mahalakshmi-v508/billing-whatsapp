import { useState, useMemo } from "react";
import {
  Search,
  SlidersHorizontal,
  Download,
  Plus,
  Filter,
  X,
  Calendar,
  Truck,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  ChevronDown,
} from "lucide-react";
import EwayStatusBadge from "./EwayStatusBadge";
import EwayActionMenu from "./EwayActionMenu";
import EwayEmptyState from "./EwayEmptyState";
import { formatINR } from "./mockEwayData";

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "Active", label: "Active" },
  { id: "Expiring Soon", label: "Expiring Soon" },
  { id: "Expired", label: "Expired" },
  { id: "Cancelled", label: "Cancelled" },
  { id: "Failed", label: "Failed" },
];

const DATE_PRESETS = [
  { id: "all", label: "All Dates" },
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7", label: "Last 7 Days" },
  { id: "last30", label: "Last 30 Days" },
];

export default function EwayList({
  bills,
  initialTab = "all",
  onNavigateTab,
  onViewBill,
  onUpdateVehicle,
  onExtendValidity,
  onCancelBill,
  onPrint,
  onDownload,
  onWhatsApp,
  onGenerateNew,
}) {
  const [selectedTab, setSelectedTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [docTypeFilter, setDocTypeFilter] = useState("all");
  const [transporterFilter, setTransporterFilter] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      all: bills.length,
      Active: bills.filter((b) => b.status === "Active").length,
      "Expiring Soon": bills.filter((b) => b.status === "Expiring Soon").length,
      Expired: bills.filter((b) => b.status === "Expired").length,
      Cancelled: bills.filter((b) => b.status === "Cancelled").length,
      Failed: bills.filter((b) => b.status === "Failed").length,
    };
  }, [bills]);

  // Unique Transporters for filter dropdown
  const uniqueTransporters = useMemo(() => {
    const set = new Set(bills.map((b) => b.transporter_name).filter(Boolean));
    return Array.from(set);
  }, [bills]);

  // Filter logic
  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      // Tab filter
      if (selectedTab !== "all" && b.status !== selectedTab) {
        return false;
      }

      // Document Type Filter
      if (docTypeFilter !== "all" && b.doc_type !== docTypeFilter) {
        return false;
      }

      // Transporter Filter
      if (transporterFilter !== "all" && b.transporter_name !== transporterFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesEwb = b.ewb_no && b.ewb_no.toLowerCase().includes(q);
        const matchesInv = b.invoice_no && b.invoice_no.toLowerCase().includes(q);
        const matchesCust = b.customer_name && b.customer_name.toLowerCase().includes(q);
        const matchesGstin = b.customer_gstin && b.customer_gstin.toLowerCase().includes(q);
        const matchesVeh = b.vehicle_no && b.vehicle_no.toLowerCase().includes(q);
        const matchesTransp = b.transporter_name && b.transporter_name.toLowerCase().includes(q);

        if (!matchesEwb && !matchesInv && !matchesCust && !matchesGstin && !matchesVeh && !matchesTransp) {
          return false;
        }
      }

      return true;
    });
  }, [bills, selectedTab, docTypeFilter, transporterFilter, searchQuery]);

  const hasActiveFilters = dateFilter !== "all" || docTypeFilter !== "all" || transporterFilter !== "all" || searchQuery !== "";

  const clearAllFilters = () => {
    setSearchQuery("");
    setDateFilter("all");
    setDocTypeFilter("all");
    setTransporterFilter("all");
    setSelectedTab("all");
  };

  const handleExportCSV = () => {
    const headers = ["E-Way Bill No", "Invoice No", "Customer", "Invoice Date", "Invoice Value", "Vehicle No", "Transporter", "Valid Until", "Status"];
    const rows = filteredBills.map((b) => [
      b.ewb_no,
      b.invoice_no,
      `"${b.customer_name}"`,
      b.invoice_date,
      b.total_value,
      b.vehicle_no,
      `"${b.transporter_name}"`,
      b.valid_until,
      b.status,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `eway_bills_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* ── Top Bar with Status Tabs & Action Buttons ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs with Badge Counts */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 paysplitx-scrollbar-light">
            {STATUS_TABS.map((t) => {
              const isSelected = selectedTab === t.id;
              const count = tabCounts[t.id] ?? 0;

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTab(t.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/60"
                  }`}
                >
                  <span>{t.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                      isSelected ? "bg-white/20 text-white" : "bg-slate-200/80 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Export & Generate Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 transition shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet size={14} className="text-emerald-600" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab("generate")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold transition shadow-sm shadow-blue-500/20 cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Generate E-Way Bill</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Filter Toggle Row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-2 border-t border-slate-100">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search E-Way Bill, Invoice, Customer, Vehicle or Transporter..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setFilterOpen((prev) => !prev)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition cursor-pointer shrink-0 ${
              filterOpen || hasActiveFilters
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
            }`}
          >
            <SlidersHorizontal size={14} />
            <span>Filters</span>
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-blue-600" />}
          </button>
        </div>

        {/* Filter Popdown Drawer */}
        {filterOpen && (
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Filter size={13} className="text-blue-600" /> Advanced Filter Options
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  Clear All Filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Date Presets */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Date Range</label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                >
                  {DATE_PRESETS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Document Type */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Document Type</label>
                <select
                  value={docTypeFilter}
                  onChange={(e) => setDocTypeFilter(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                >
                  <option value="all">All Document Types</option>
                  <option value="Tax Invoice">Tax Invoice</option>
                  <option value="Bill of Supply">Bill of Supply</option>
                  <option value="Delivery Challan">Delivery Challan</option>
                  <option value="Credit Note">Credit Note</option>
                </select>
              </div>

              {/* Transporter */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Transporter</label>
                <select
                  value={transporterFilter}
                  onChange={(e) => setTransporterFilter(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                >
                  <option value="all">All Transporters</option>
                  {uniqueTransporters.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Table Container & Responsive Fallback ── */}
      {filteredBills.length === 0 ? (
        <EwayEmptyState
          title="No E-Way Bills Match Criteria"
          description="Try clearing search queries or adjusting status and date filter presets."
          actionLabel="Clear Filters"
          onAction={clearAllFilters}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Desktop & Tablet Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-extrabold uppercase text-slate-500 border-b border-slate-200/80">
                  <th className="p-3.5 pl-5">E-Way Bill No</th>
                  <th className="p-3.5">Invoice No</th>
                  <th className="p-3.5">Customer / Consignee</th>
                  <th className="p-3.5">Invoice Date</th>
                  <th className="p-3.5 text-right">Invoice Value</th>
                  <th className="p-3.5">Vehicle No</th>
                  <th className="p-3.5">Transporter</th>
                  <th className="p-3.5">Valid Until</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredBills.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5 pl-5 font-mono font-bold text-slate-900">
                      <button
                        type="button"
                        onClick={() => onViewBill(b)}
                        className="text-blue-600 hover:underline cursor-pointer text-left"
                      >
                        {b.ewb_no}
                      </button>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800">{b.invoice_no}</td>
                    <td className="p-3.5">
                      <span className="font-semibold text-slate-800 block truncate max-w-[170px]">{b.customer_name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{b.customer_gstin || "Unregistered"}</span>
                    </td>
                    <td className="p-3.5 text-slate-600">{b.invoice_date}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                      {formatINR(b.total_value)}
                    </td>
                    <td className="p-3.5 font-mono">
                      <span className="px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200 font-bold text-slate-800">
                        {b.vehicle_no || "—"}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600 truncate max-w-[130px]">{b.transporter_name || "Self"}</td>
                    <td className="p-3.5">
                      <span className="font-semibold text-slate-800 block">{b.valid_until}</span>
                      <span className="text-[10px] text-slate-500">{b.remaining_time}</span>
                    </td>
                    <td className="p-3.5">
                      <EwayStatusBadge status={b.status} size="sm" />
                    </td>
                    <td className="p-3.5 pr-5 text-right">
                      <EwayActionMenu
                        bill={b}
                        onView={onViewBill}
                        onUpdateVehicle={onUpdateVehicle}
                        onExtendValidity={onExtendValidity}
                        onCancel={onCancelBill}
                        onPrint={onPrint}
                        onDownload={onDownload}
                        onWhatsApp={onWhatsApp}
                        onGenerateNew={onGenerateNew}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Count Footer */}
          <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing <strong>{filteredBills.length}</strong> of <strong>{bills.length}</strong> E-Way Bills
            </span>
            <span className="font-mono text-slate-700">GST Portal Sync Active</span>
          </div>
        </div>
      )}
    </div>
  );
}
