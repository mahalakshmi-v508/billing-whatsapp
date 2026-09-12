import { useEffect, useMemo, useState } from "react";
import {
  Truck,
  RefreshCw,
  Search,
  SlidersHorizontal,
  ChevronDown,
  Plus,
  X,
  Pencil,
  Ban,
  Loader2,
} from "lucide-react";
import api from "../../services/api";
import { getCompanyId } from "../settings/settingsApi";

const TABLE_HEADERS = [
  "EWB Number",
  "Invoice Details",
  "Recipient (Ship To)",
  "Generated Date",
  "Valid Upto",
  "Vehicle / Mode",
  "Status",
];

const STATUS_OPTIONS = ["All Status", "Active", "In Transporter", "Cancelled", "Expired"];
const VEHICLE_TYPES = ["Regular", "Over Dimensional Cargo"];

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-[13.5px] text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

function StatusPill({ status }) {
  const cls =
    status === "Active"
      ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
      : status === "Cancelled"
      ? "bg-red-50 text-red-500 border border-red-200"
      : status === "Expired"
      ? "bg-slate-100 text-slate-500 border border-slate-200"
      : "bg-blue-50 text-blue-600 border border-blue-200";
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${cls}`}>
      {status}
    </span>
  );
}

const EMPTY_GEN = {
  invoice_id: "",
  ship_to: "",
  from_place: "",
  transporter_name: "",
  transporter_id: "",
  vehicle_number: "",
  vehicle_type: "Regular",
  distance_km: "",
};

export default function EwayBills() {
  const companyId = getCompanyId();
  const [bills, setBills] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All Status");
  const [filterOpen, setFilterOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [appliedQuery, setAppliedQuery] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [genOpen, setGenOpen] = useState(false);
  const [genForm, setGenForm] = useState({ ...EMPTY_GEN });
  const [genInvoices, setGenInvoices] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [updBill, setUpdBill] = useState(null);
  const [updForm, setUpdForm] = useState({});

  const showToast = (msg, ok = true) => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { id, msg, ok }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  };

  useEffect(() => {
    let cancelled = false;
    api
      .get("/eway-bill/list", {
        params: { company_id: companyId, search: appliedQuery, status },
      })
      .then((res) => {
        if (cancelled) return;
        setBills((res.data && res.data.data) || []);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, appliedQuery, status, reloadKey]);

  const handleRefresh = () => {
    setRefreshing(true);
    setLoading(true);
    setReloadKey((k) => k + 1);
    setTimeout(() => setRefreshing(false), 700);
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    setAppliedQuery(query);
    setLoading(true);
    setFilterOpen(false);
  };

  const openGen = async () => {
    setGenForm({ ...EMPTY_GEN });
    setGenInvoices([]);
    setGenOpen(true);
    if (!companyId) return;
    try {
      const res = await api.get("/eway-bill/invoices", { params: { company_id: companyId } });
      setGenInvoices((res.data && res.data.data) || []);
    } catch {
      /* ignore */
    }
  };

  const handleGenSubmit = async (e) => {
    e.preventDefault();
    if (!companyId) return;
    if (!genForm.invoice_id) {
      showToast("Please select an invoice", false);
      return;
    }
    setSubmitting(true);
    try {
      const payload = { company_id: companyId, invoice_id: genForm.invoice_id };
      for (const key of [
        "ship_to",
        "from_place",
        "transporter_name",
        "transporter_id",
        "vehicle_number",
        "vehicle_type",
      ]) {
        if (genForm[key]) payload[key] = genForm[key];
      }
      if (genForm.distance_km) payload.distance_km = genForm.distance_km;
      const res = await api.post("/eway-bill/create", payload);
      if (res.data && res.data.status) {
        showToast(res.data.message);
        setGenOpen(false);
        setLoading(true);
        setReloadKey((k) => k + 1);
      } else {
        showToast((res.data && res.data.message) || "Generation failed", false);
      }
    } catch {
      showToast("Could not reach server", false);
    }
    setSubmitting(false);
  };

  const openUpd = (bill) => {
    setUpdBill(bill);
    setUpdForm({
      vehicle_number: bill.vehicle_number || "",
      vehicle_type: bill.vehicle_type || "Regular",
      distance_km: bill.distance_km != null ? String(bill.distance_km) : "",
      transporter_name: bill.transporter_name || "",
      transporter_id: bill.transporter_id || "",
      ship_to: bill.shipTo || "",
      status: bill.status,
    });
  };

  const handleUpdSubmit = async (e) => {
    e.preventDefault();
    if (!updBill) return;
    setSubmitting(true);
    try {
      const payload = { id: updBill.id, ...updForm };
      if (payload.distance_km === "") payload.distance_km = null;
      const res = await api.post("/eway-bill/update", payload);
      if (res.data && res.data.status) {
        showToast(res.data.message);
        setUpdBill(null);
        setLoading(true);
        setReloadKey((k) => k + 1);
      } else {
        showToast((res.data && res.data.message) || "Update failed", false);
      }
    } catch {
      showToast("Could not reach server", false);
    }
    setSubmitting(false);
  };

  const handleCancel = async (bill) => {
    if (!window.confirm(`Cancel E-Way Bill ${bill.ewbNo}? This cannot be undone.`)) return;
    try {
      const res = await api.post("/eway-bill/cancel", { id: bill.id });
      if (res.data && res.data.status) {
        showToast(res.data.message);
        setLoading(true);
        setReloadKey((k) => k + 1);
      } else {
        showToast((res.data && res.data.message) || "Cancel failed", false);
      }
    } catch {
      showToast("Could not reach server", false);
    }
  };

  const modalBackdrop = "fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4";

  const genInvoiceLabel = useMemo(() => {
    const opt = genInvoices.find((i) => String(i.id) === String(genForm.invoice_id));
    if (!opt) return "";
    return `Invoice ${opt.invoice_no} · ${opt.customer_name || "—"} · ₹${opt.total_amount || 0}`;
  }, [genInvoices, genForm.invoice_id]);

  const statusCount = useMemo(() => {
    const counts = { Active: 0, "In Transporter": 0, Cancelled: 0, Expired: 0 };
    bills.forEach((b) => {
      if (counts[b.status] != null) counts[b.status]++;
    });
    return counts;
  }, [bills]);

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

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-[13px] font-semibold hover:bg-slate-50 transition cursor-pointer"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            onClick={openGen}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold shadow-sm cursor-pointer"
          >
            <Plus size={15} />
            Generate E-Way Bill
          </button>
        </div>
      </div>

      {/* ── 2. SEARCH / FILTER CARD ── */}
      <div className="mt-5 bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
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
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-600 text-[13px] font-semibold hover:bg-slate-50 transition cursor-pointer"
          >
            <SlidersHorizontal size={15} />
            <span className="hidden sm:inline">Filter</span>
            <span
              className={`hidden sm:inline-block px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                status !== "All Status" ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"
              }`}
            >
              {status}
            </span>
            <ChevronDown size={14} className={`transition-transform ${filterOpen ? "rotate-180" : ""}`} />
          </button>
          {filterOpen && (
            <div className="absolute right-0 top-12 w-48 z-40 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 animate-in fade-in zoom-in-95 duration-100">
              {STATUS_OPTIONS.map((opt) => (
                <div
                  key={opt}
                  onClick={() => {
                    setStatus(opt);
                    setLoading(true);
                    setFilterOpen(false);
                  }}
                  className={`flex items-center justify-between px-3 py-2 text-[13px] font-medium cursor-pointer transition ${
                    status === opt ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {opt}
                  {statusCount[opt] != null && (
                    <span className="text-[10.5px] font-semibold text-slate-400">{statusCount[opt]}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleSearch}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold shadow-sm cursor-pointer"
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
            {loading && bills.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                    <Loader2 size={32} className="animate-spin text-blue-500 mb-3" />
                    <p className="text-sm text-slate-400 font-medium">Loading E-Way Bills…</p>
                  </div>
                </td>
              </tr>
            ) : bills.length === 0 ? (
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
                    <button
                      type="button"
                      onClick={openGen}
                      className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold shadow-sm cursor-pointer"
                    >
                      <Plus size={15} />
                      Generate E-Way Bill
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              bills.map((bill) => (
                <tr key={bill.id} className="border-b border-slate-100 hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 font-bold text-blue-600 whitespace-nowrap">{bill.ewbNo}</td>
                  <td className="py-3 px-4 text-slate-600">{bill.invoice}</td>
                  <td className="py-3 px-4 text-slate-600">{bill.recipient}</td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{bill.generatedDate}</td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{bill.validUpto}</td>
                  <td className="py-3 px-4 text-slate-600">{bill.vehicle}</td>
                  <td className="py-3 px-4">
                    <StatusPill status={bill.status} />
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    {bill.status !== "Cancelled" && (
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openUpd(bill)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 text-slate-600 text-[11px] font-semibold hover:bg-slate-50 cursor-pointer"
                        >
                          <Pencil size={12} />
                          Update
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancel(bill)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-red-200 text-red-500 text-[11px] font-semibold hover:bg-red-50 cursor-pointer"
                        >
                          <Ban size={12} />
                          Cancel
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── GENERATE E-WAY BILL MODAL ── */}
      {genOpen && (
        <div className={modalBackdrop}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl p-6 animate-in fade-in zoom-in-95 duration-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-slate-800">Generate E-Way Bill</h3>
              <button
                type="button"
                onClick={() => setGenOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-0.5 text-[12.5px] text-slate-500 mb-5">
              Pick a GST invoice and enter transport details to generate an E-Way Bill.
            </p>

            <form onSubmit={handleGenSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold tracking-wide text-slate-500 mb-1.5">Invoice *</label>
                <div className="relative">
                  <select
                    className={inputCls}
                    value={genForm.invoice_id}
                    onChange={(e) => setGenForm((s) => ({ ...s, invoice_id: e.target.value }))}
                  >
                    <option value="">Select a GST invoice…</option>
                    {genInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_no} — {inv.customer_name || "Customer"} (₹{inv.total_amount || 0})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold tracking-wide text-slate-500 mb-1.5">Ship To (Place)</label>
                  <input
                    className={inputCls}
                    value={genForm.ship_to}
                    onChange={(e) => setGenForm((s) => ({ ...s, ship_to: e.target.value }))}
                    placeholder="Destination city / place"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold tracking-wide text-slate-500 mb-1.5">From (Place)</label>
                  <input
                    className={inputCls}
                    value={genForm.from_place}
                    onChange={(e) => setGenForm((s) => ({ ...s, from_place: e.target.value }))}
                    placeholder="Dispatch city / place"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold tracking-wide text-slate-500 mb-1.5">Transporter Name</label>
                  <input
                    className={inputCls}
                    value={genForm.transporter_name}
                    onChange={(e) => setGenForm((s) => ({ ...s, transporter_name: e.target.value }))}
                    placeholder="e.g. Sri Ganesh Roadlines"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold tracking-wide text-slate-500 mb-1.5">Transporter ID</label>
                  <input
                    className={inputCls}
                    value={genForm.transporter_id}
                    onChange={(e) => setGenForm((s) => ({ ...s, transporter_id: e.target.value }))}
                    placeholder="Registration ID"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold tracking-wide text-slate-500 mb-1.5">Vehicle Number</label>
                  <input
                    className={inputCls}
                    value={genForm.vehicle_number}
                    onChange={(e) => setGenForm((s) => ({ ...s, vehicle_number: e.target.value }))}
                    placeholder="e.g. TN-01-AB-1234"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold tracking-wide text-slate-500 mb-1.5">Vehicle Type</label>
                  <select
                    className={inputCls}
                    value={genForm.vehicle_type}
                    onChange={(e) => setGenForm((s) => ({ ...s, vehicle_type: e.target.value }))}
                  >
                    {VEHICLE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold tracking-wide text-slate-500 mb-1.5">Distance (km)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputCls}
                    value={genForm.distance_km}
                    onChange={(e) => setGenForm((s) => ({ ...s, distance_km: e.target.value }))}
                    placeholder="e.g. 420"
                  />
                </div>
              </div>

              {genInvoiceLabel && (
                <p className="text-[12px] text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                  Selected: <span className="font-semibold text-slate-700">{genInvoiceLabel}</span>
                </p>
              )}

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setGenOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-[13px] font-semibold bg-white hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? "Generating…" : "Generate E-Way Bill"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── UPDATE VEHICLE MODAL ── */}
      {updBill && (
        <div className={modalBackdrop}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl p-6 animate-in fade-in zoom-in-95 duration-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-slate-800">Update E-Way Bill</h3>
              <button
                type="button"
                onClick={() => setUpdBill(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-0.5 text-[12.5px] text-slate-500 mb-5">
              EWB <span className="font-semibold text-blue-600">{updBill.ewbNo}</span> · {updBill.invoice}
            </p>

            <form onSubmit={handleUpdSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold tracking-wide text-slate-500 mb-1.5">Vehicle Number</label>
                  <input
                    className={inputCls}
                    value={updForm.vehicle_number || ""}
                    onChange={(e) => setUpdForm((s) => ({ ...s, vehicle_number: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold tracking-wide text-slate-500 mb-1.5">Vehicle Type</label>
                  <select
                    className={inputCls}
                    value={updForm.vehicle_type || "Regular"}
                    onChange={(e) => setUpdForm((s) => ({ ...s, vehicle_type: e.target.value }))}
                  >
                    {VEHICLE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold tracking-wide text-slate-500 mb-1.5">Transporter Name</label>
                  <input
                    className={inputCls}
                    value={updForm.transporter_name || ""}
                    onChange={(e) => setUpdForm((s) => ({ ...s, transporter_name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold tracking-wide text-slate-500 mb-1.5">Transporter ID</label>
                  <input
                    className={inputCls}
                    value={updForm.transporter_id || ""}
                    onChange={(e) => setUpdForm((s) => ({ ...s, transporter_id: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold tracking-wide text-slate-500 mb-1.5">Ship To (Place)</label>
                  <input
                    className={inputCls}
                    value={updForm.ship_to || ""}
                    onChange={(e) => setUpdForm((s) => ({ ...s, ship_to: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold tracking-wide text-slate-500 mb-1.5">Distance (km)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputCls}
                    value={updForm.distance_km || ""}
                    onChange={(e) => setUpdForm((s) => ({ ...s, distance_km: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold tracking-wide text-slate-500 mb-1.5">Status</label>
                  <select
                    className={inputCls}
                    value={updForm.status || "Active"}
                    onChange={(e) => setUpdForm((s) => ({ ...s, status: e.target.value }))}
                  >
                    <option>Active</option>
                    <option>In Transporter</option>
                    <option>Expired</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUpdBill(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-[13px] font-semibold bg-white hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TOASTS ── */}
      <div className="fixed bottom-5 right-5 space-y-2 z-50">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-2.5 rounded-xl text-[13px] font-semibold shadow-lg border ${
              t.ok ? "bg-emerald-600 text-white border-emerald-700" : "bg-red-600 text-white border-red-700"
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}