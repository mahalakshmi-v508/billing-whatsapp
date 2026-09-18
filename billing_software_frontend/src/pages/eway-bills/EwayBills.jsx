import { useEffect, useState, useMemo } from "react";
import {
  Truck,
  RefreshCw,
  Search,
  SlidersHorizontal,
  ChevronDown,
  Eye,
  Pencil,
  XCircle,
  FileText,
  Clock,
  Loader2,
  X,
  Check,
} from "lucide-react";
import api from "../../services/api";
import { getCompanyId } from "../settings/settingsApi";

const STATUS_OPTIONS = ["All Status", "Active", "In Transporter", "Cancelled", "Expired"];

const TABLE_HEADERS = [
  "EWB Number",
  "Invoice",
  "Customer / GSTIN",
  "Taxable",
  "GST",
  "Invoice Total",
  "Vehicle",
  "Status",
  "Created",
];

const ACTIVE_STATUSES = ["Active", "In Transporter"];

function money(v) {
  return "₹" + Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dt(v) {
  if (!v) return "—";
  const d = String(v).slice(0, 19).replace("T", " ");
  const [date, time] = d.split(" ");
  const [, m, day] = (date || "").split("-");
  return `${day || date}/${m || ""} ${(time || "").slice(0, 5)}`;
}

function dateOnly(v) {
  if (!v) return "—";
  const [date] = String(v).slice(0, 10).split(" ");
  return date || "—";
}

function StatusBadge({ status }) {
  const tone =
    status === "Active"
      ? "bg-emerald-50 text-emerald-600 border-emerald-200"
      : status === "In Transporter"
      ? "bg-blue-50 text-blue-600 border-blue-200"
      : status === "Cancelled"
      ? "bg-red-50 text-red-500 border-red-200"
      : "bg-slate-100 text-slate-500 border-slate-200";
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${tone}`}>
      {status}
    </span>
  );
}

export default function EwayBills() {
  const companyId = getCompanyId();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(Boolean(companyId));
  const [saving, setSaving] = useState(false);

  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [status, setStatus] = useState("All Status");
  const [appliedStatus, setAppliedStatus] = useState("All Status");
  const [filterOpen, setFilterOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [viewBill, setViewBill] = useState(null);
  const [updateBill, setUpdateBill] = useState(null);
  const [updateForm, setUpdateForm] = useState({});
  const [updateErrs, setUpdateErrs] = useState({});
  const [cancelBill, setCancelBill] = useState(null);

  useEffect(() => {
    let active = true;
    if (!companyId) return;
    (async () => {
      try {
        const res = await api.get("/eway-bill/list", {
          params: { company_id: companyId, search: appliedQuery, status: appliedStatus },
        });
        if (active && res.data && res.data.status) {
          setBills(Array.isArray(res.data.data) ? res.data.data : []);
        }
      } catch {
        if (active) setBills([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [companyId, appliedQuery, appliedStatus, reloadKey]);

  const handleSearch = (e) => {
    e.preventDefault();
    setAppliedQuery(query.trim());
    setAppliedStatus(status);
    setFilterOpen(false);
  };

  const handleStatusPick = (opt) => {
    setStatus(opt);
    setFilterOpen(false);
  };

  const refresh = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  const openUpdate = (bill) => {
    setUpdateBill(bill);
    setUpdateForm({
      vehicle_number: bill.vehicle_number || "",
      vehicle_type: bill.vehicle_type || "Regular",
      transport_mode: bill.transport_mode || "Road",
      transporter_name: bill.transporter_name || "",
      transporter_id: bill.transporter_id || "",
      distance_km: bill.distance_km ? String(bill.distance_km) : "",
    });
    setUpdateErrs({});
  };

  const confirmUpdate = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!updateForm.vehicle_number || !updateForm.vehicle_number.trim()) errs.vehicle_number = "Vehicle number required";
    if (!updateForm.distance_km || Number(updateForm.distance_km) <= 0) errs.distance_km = "Distance required";
    setUpdateErrs(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const res = await api.post("/eway-bill/update", {
        id: updateBill.id,
        vehicle_number: updateForm.vehicle_number.trim().toUpperCase(),
        vehicle_type: updateForm.vehicle_type,
        transport_mode: updateForm.transport_mode,
        transporter_name: updateForm.transporter_name,
        transporter_id: updateForm.transporter_id,
        distance_km: Number(updateForm.distance_km),
      });
      if (res.data && res.data.status) {
        setUpdateBill(null);
        refresh();
      }
    } catch (err) {
      setUpdateErrs({ backend: (err.response?.data?.message) || "Update failed." });
    } finally {
      setSaving(false);
    }
  };

  const confirmCancel = async () => {
    if (!cancelBill) return;
    setSaving(true);
    try {
      const res = await api.post("/eway-bill/cancel", { id: cancelBill.id });
      if (res.data && res.data.status) {
        setCancelBill(null);
        refresh();
      }
    } catch {
      setCancelBill(null);
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const items = (bill) => (Array.isArray(bill.item_details) ? bill.item_details : []);

  // Compute summary metrics for PaySplitX KPI strip
  const summary = useMemo(() => {
    let totalValue = 0;
    let activeCount = 0;
    let cancelledCount = 0;
    bills.forEach((b) => {
      totalValue += Number(b.total_amount || 0);
      if (ACTIVE_STATUSES.includes(b.status)) activeCount++;
      if (b.status === "Cancelled" || b.status === "Expired") cancelledCount++;
    });
    return { count: bills.length, totalValue, activeCount, cancelledCount };
  }, [bills]);

  return (
    <div className="min-h-screen bg-[#f8faff] p-4 sm:p-6 lg:p-8 space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">

      {/* ── 1. PAGE HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 select-none">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-cyan-100 ring-4 ring-cyan-50/50 flex-shrink-0">
            <Truck size={24} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              E-Way Bills Registry
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
              Consignment transport tracking, vehicle updates &amp; official GST portal sync
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer shadow-xs"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-cyan-600" : "text-slate-400"} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* ── 2. METRIC KPI CARDS (PaySplitX 4-Card Strip) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Consignments */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total E-Way Bills</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
                {summary.count}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-black">
              <Truck size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Generated consigns</span>
            <span className="text-[11px] font-semibold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full">
              Registry count
            </span>
          </div>
        </div>

        {/* Card 2: Active in Transit */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Active In Transit</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1 tracking-tight">
                {summary.activeCount}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>En route shipments</span>
            <span className="text-[11px] font-semibold text-emerald-600">
              Valid consignments
            </span>
          </div>
        </div>

        {/* Card 3: Total Consignment Value */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Goods Value</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
                {money(summary.totalValue)}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
              ₹
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Invoice goods sum</span>
            <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              Taxable + GST
            </span>
          </div>
        </div>

        {/* Card 4: Cancelled / Expired */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Cancelled / Void</p>
              <h3 className="text-2xl font-black text-rose-600 mt-1 tracking-tight">
                {summary.cancelledCount}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <XCircle size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Void consignments</span>
            <span className="text-[11px] font-semibold text-rose-600">Inactive</span>
          </div>
        </div>
      </div>

      {/* ── 3. SEARCH & FILTER CARD ── */}
      <form onSubmit={handleSearch} className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-4 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
        <div className="relative flex-1 min-w-0 sm:min-w-[220px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by EWB Number, Invoice No or Customer / GSTIN..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
          />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
          >
            <SlidersHorizontal size={14} className="text-slate-400" />
            <span>{status === "All Status" ? "Filter Status" : status}</span>
            <ChevronDown size={13} className={`text-slate-400 transition-transform ${filterOpen ? "rotate-180" : ""}`} />
          </button>
          {filterOpen && (
            <div className="absolute right-0 top-12 w-48 z-40 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 animate-in fade-in zoom-in-95 duration-100">
              {STATUS_OPTIONS.map((opt) => (
                <div
                  key={opt}
                  onClick={() => handleStatusPick(opt)}
                  className={`px-3.5 py-2 text-xs font-semibold cursor-pointer transition flex items-center justify-between ${
                    status === opt ? "bg-cyan-50 text-cyan-700 font-bold" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>{opt}</span>
                  {status === opt && <div className="w-1.5 h-1.5 rounded-full bg-cyan-600" />}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white text-xs font-bold shadow-md shadow-cyan-200 cursor-pointer transition"
        >
          <Search size={14} />
          <span>Apply Filter</span>
        </button>
      </form>

      {/* ── 3. REGISTRY TABLE ── */}
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
            {loading ? (
              <tr>
                <td colSpan={11}>
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Loader2 size={30} className="animate-spin text-blue-600 mb-3" />
                    <p className="text-sm font-semibold text-slate-500">Loading E-Way Bills…</p>
                  </div>
                </td>
              </tr>
            ) : bills.length === 0 ? (
              <tr>
                <td colSpan={11}>
                  <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center mb-5">
                      <Truck size={36} className="text-sky-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">
                      {appliedQuery || appliedStatus !== "All Status" ? "No matching records" : "No E-Way Bills Found"}
                    </h3>
                    <p className="text-sm text-slate-400 max-w-md">
                      Generate an E-Way Bill from any created invoice to populate this registry.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              bills.map((bill) => (
                <tr key={bill.id} className="border-b border-slate-100 hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 font-bold text-blue-600 whitespace-nowrap">{bill.ewb_number}</td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-700 whitespace-nowrap">{bill.invoice_no}</p>
                    <p className="text-[10.5px] text-slate-400">Date: {dateOnly(bill.invoice_date)}</p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-slate-700 whitespace-nowrap">{bill.customer_name || "—"}</p>
                    <p className="text-[10.5px] text-slate-400 font-mono">{bill.to_gstin || "—"}</p>
                  </td>
                  <td className="py-3 px-4 text-right text-slate-700 whitespace-nowrap">{money(bill.taxable_amount)}</td>
                  <td className="py-3 px-4 text-right text-slate-700 whitespace-nowrap">{money(bill.gst_total)}</td>
                  <td className="py-3 px-4 text-right font-bold text-slate-800 whitespace-nowrap">{money(bill.invoice_value)}</td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-700 whitespace-nowrap">{bill.vehicle_number || "—"}</p>
                    <p className="text-[10.5px] text-slate-400">{bill.transport_mode || bill.vehicle_type || ""}</p>
                  </td>
                  <td className="py-3 px-4"><StatusBadge status={bill.status} /></td>
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{dt(bill.created_at)}</td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        title="View"
                        onClick={() => setViewBill(bill)}
                        className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition cursor-pointer"
                      >
                        <Eye size={14} />
                      </button>
                      {ACTIVE_STATUSES.includes(bill.status) && (
                        <>
                          <button
                            type="button"
                            title="Update Vehicle"
                            onClick={() => openUpdate(bill)}
                            className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition cursor-pointer"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            title="Cancel"
                            onClick={() => setCancelBill(bill)}
                            className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition cursor-pointer"
                          >
                            <XCircle size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && bills.length > 0 && (
        <p className="mt-3 text-[11.5px] text-slate-400">
          Showing <strong className="text-slate-600">{bills.length}</strong> E-Way Bill{bills.length === 1 ? "" : "s"}
          {appliedStatus !== "All Status" ? ` · status filter: ${appliedStatus}` : ""}
          {appliedQuery ? ` · matching "${appliedQuery}"` : ""}
        </p>
      )}

      {/* ── 4. VIEW MODAL ── */}
      {viewBill && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setViewBill(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText size={18} className="text-blue-600" />
                <h3 className="text-[15px] font-bold text-slate-800">E-Way Bill {viewBill.ewb_number}</h3>
                <StatusBadge status={viewBill.status} />
              </div>
              <button
                type="button"
                onClick={() => setViewBill(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Supplier</p>
                  <p className="text-[13px] font-bold text-slate-800">{viewBill.from_place || "—"}</p>
                  <p className="text-[11.5px] text-slate-500 leading-relaxed">{viewBill.from_address || "—"}</p>
                  <p className="text-[11.5px] text-slate-600 font-mono">{viewBill.from_gstin || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Consignee</p>
                  <p className="text-[13px] font-bold text-slate-800">{viewBill.consignee_name || viewBill.customer_name || "—"}</p>
                  <p className="text-[11.5px] text-slate-500 leading-relaxed">{viewBill.consignee_address || "—"}</p>
                  <p className="text-[11.5px] text-slate-600 font-mono">{viewBill.to_gstin || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Validity</p>
                  <p className="text-[12px] text-slate-600 flex items-center gap-1.5"><Clock size={13} className="text-slate-400" /> Generated {dt(viewBill.generated_date)}</p>
                  <p className="text-[12px] text-slate-600">Valid until <span className="font-bold text-slate-800">{dt(viewBill.valid_upto)}</span></p>
                  <p className="text-[11px] text-slate-400">{viewBill.distance_km ? `${viewBill.distance_km} km` : "Distance not set"}</p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Invoice</p>
                  <p className="text-[12.5px] font-bold text-slate-700">{viewBill.invoice_no}</p>
                  <p className="text-[11px] text-slate-400">{dateOnly(viewBill.invoice_date)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Supply</p>
                  <p className="text-[12.5px] font-semibold text-slate-700">{viewBill.supply_type || "—"}</p>
                  <p className="text-[11px] text-slate-400">{viewBill.sub_supply_type || ""}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Transport</p>
                  <p className="text-[12.5px] font-bold text-slate-700">{viewBill.vehicle_number || "—"}</p>
                  <p className="text-[11px] text-slate-400">
                    {viewBill.transport_mode} · {viewBill.vehicle_type}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Transporter</p>
                  <p className="text-[12.5px] font-semibold text-slate-700">{viewBill.transporter_name || "—"}</p>
                  <p className="text-[11px] text-slate-400">{viewBill.transporter_id || ""}</p>
                </div>
              </div>

              {items(viewBill).length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-left text-[11.5px] min-w-max">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wide border-b border-slate-200">
                        <th className="py-2.5 px-3 font-bold">Item</th>
                        <th className="py-2.5 px-3 text-right font-bold">Qty</th>
                        <th className="py-2.5 px-3 text-right font-bold">Rate</th>
                        <th className="py-2.5 px-3 text-right font-bold">GST%</th>
                        <th className="py-2.5 px-3 text-right font-bold">Taxable</th>
                        <th className="py-2.5 px-3 text-right font-bold">CGST</th>
                        <th className="py-2.5 px-3 text-right font-bold">SGST</th>
                        <th className="py-2.5 px-3 text-right font-bold">IGST</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items(viewBill).map((it, i) => (
                        <tr key={i} className="border-b border-slate-100 last:border-0">
                          <td className="py-2.5 px-3 font-semibold text-slate-700">
                            {it.product_name}
                            <span className="block text-[10px] text-slate-400 font-mono">{it.product_code || ""}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600">{it.quantity} {it.unit}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">{money(it.rate)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">{it.gst_rate}%</td>
                          <td className="py-2.5 px-3 text-right text-slate-700">{money(it.taxable)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">{money(it.cgst)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">{money(it.sgst)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">{money(it.igst)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-x-6 gap-y-2 border-t border-slate-100 pt-4 text-[12px]">
                <span className="text-slate-500">
                  Taxable <strong className="text-slate-800">{money(viewBill.taxable_amount)}</strong>
                </span>
                <span className="text-slate-500">
                  GST <strong className="text-slate-800">{money(viewBill.gst_total)}</strong>{" "}
                  <span className="text-slate-400">
                    (C {money(viewBill.cgst_amount)} + S {money(viewBill.sgst_amount)} + I {money(viewBill.igst_amount)})
                  </span>
                </span>
                <span className="text-slate-500">
                  Invoice Total <strong className="text-blue-700 text-[13.5px]">{money(viewBill.invoice_value)}</strong>
                </span>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewBill(null)}
                  className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-600 text-[13px] font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. UPDATE MODAL ── */}
      {updateBill && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setUpdateBill(null)}>
          <form
            onSubmit={confirmUpdate}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-slate-800 flex items-center gap-2">
                <Pencil size={16} className="text-amber-600" /> Update Vehicle
              </h3>
              <button type="button" onClick={() => setUpdateBill(null)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer">
                <X size={17} />
              </button>
            </div>
            <p className="text-[12px] text-slate-500">EWB <span className="font-bold text-blue-600">{updateBill.ewb_number}</span> · updating transport details recalculates validity.</p>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500">Vehicle Number</span>
                <input
                  value={updateForm.vehicle_number}
                  onChange={(e) => setUpdateForm((f) => ({ ...f, vehicle_number: e.target.value }))}
                  className={`px-3 py-2.5 border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 ${updateErrs.vehicle_number ? "border-red-400" : "border-slate-300"}`}
                />
                {updateErrs.vehicle_number && <span className="text-[10.5px] font-semibold text-red-500">{updateErrs.vehicle_number}</span>}
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500">Distance (km)</span>
                <input
                  type="number"
                  value={updateForm.distance_km}
                  onChange={(e) => setUpdateForm((f) => ({ ...f, distance_km: e.target.value }))}
                  className={`px-3 py-2.5 border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 ${updateErrs.distance_km ? "border-red-400" : "border-slate-300"}`}
                />
                {updateErrs.distance_km && <span className="text-[10.5px] font-semibold text-red-500">{updateErrs.distance_km}</span>}
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500">Transport Mode</span>
                <select
                  value={updateForm.transport_mode}
                  onChange={(e) => setUpdateForm((f) => ({ ...f, transport_mode: e.target.value }))}
                  className="px-3 py-2.5 border border-slate-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {["Road", "Rail", "Air", "Ship"].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500">Vehicle Type</span>
                <select
                  value={updateForm.vehicle_type}
                  onChange={(e) => setUpdateForm((f) => ({ ...f, vehicle_type: e.target.value }))}
                  className="px-3 py-2.5 border border-slate-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option>Regular</option>
                  <option>ODC</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500">Transporter Name</span>
                <input
                  value={updateForm.transporter_name}
                  onChange={(e) => setUpdateForm((f) => ({ ...f, transporter_name: e.target.value }))}
                  className="px-3 py-2.5 border border-slate-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500">Transporter ID</span>
                <input
                  value={updateForm.transporter_id}
                  onChange={(e) => setUpdateForm((f) => ({ ...f, transporter_id: e.target.value }))}
                  className="px-3 py-2.5 border border-slate-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
            </div>

            {updateErrs.backend && <p className="text-[12px] font-semibold text-red-500">{updateErrs.backend}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setUpdateBill(null)} className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-600 text-[13px] font-semibold hover:bg-slate-50 cursor-pointer">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-[13px] font-bold cursor-pointer"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {saving ? "Updating…" : "Update & Recalculate"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── 6. CANCEL CONFIRM ── */}
      {cancelBill && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setCancelBill(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
              <XCircle size={24} />
            </div>
            <h3 className="text-[16px] font-bold text-slate-800 mb-1">Cancel E-Way Bill?</h3>
            <p className="text-[12.5px] text-slate-500 mb-5">
              EWB <span className="font-bold text-blue-600">{cancelBill.ewb_number}</span> for invoice{" "}
              <span className="font-bold text-slate-700">{cancelBill.invoice_no}</span> will be cancelled.
            </p>
            <div className="flex justify-center gap-2">
              <button type="button" onClick={() => setCancelBill(null)} className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-600 text-[13px] font-semibold hover:bg-slate-50 cursor-pointer">
                Keep
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                disabled={saving}
                className="px-5 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-[13px] font-bold cursor-pointer"
              >
                {saving ? "Cancelling…" : "Yes, Cancel E-Way Bill"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}