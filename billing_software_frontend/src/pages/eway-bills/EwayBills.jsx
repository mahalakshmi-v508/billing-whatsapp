import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Truck,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  Pencil,
  XCircle,
  FileText,
  Clock,
  Loader2,
  X,
  Check,
  Plus,
} from "lucide-react";
import api from "../../services/api";
import { getCompanyId } from "../settings/settingsApi";
import {
  TableContainer,
  Table,
  Thead,
  Th,
  Tbody,
  Tr,
  Td,
  TablePagination,
  TableStatusBadge,
  TableActionButtons,
  TableEmptyState,
  TableLoadingState,
} from "../../components/table";

const STATUS_OPTIONS = ["All Status", "Active", "In Transporter", "Cancelled", "Expired"];

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

export default function EwayBills() {
  const navigate = useNavigate();
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(
    localStorage.getItem("selected_company_id") || getCompanyId() || ""
  );

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [status, setStatus] = useState("All Status");
  const [appliedStatus, setAppliedStatus] = useState("All Status");
  const [filterOpen, setFilterOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // Modal states
  const [viewBill, setViewBill] = useState(null);
  const [updateBill, setUpdateBill] = useState(null);
  const [updateForm, setUpdateForm] = useState({});
  const [updateErrs, setUpdateErrs] = useState({});
  const [cancelBill, setCancelBill] = useState(null);

  // Load companies
  useEffect(() => {
    if (!user?.id) return;
    const adminId = user.role === "cashier" ? user.admin_id : user.id;
    api
      .get(`/company/get_companies_by_admin?admin_id=${adminId}`)
      .then((res) => {
        if (res.data?.status && Array.isArray(res.data.data)) {
          setCompanies(res.data.data);
          if (!selectedCompany && res.data.data.length > 0) {
            const firstId = String(res.data.data[0].id);
            setSelectedCompany(firstId);
            localStorage.setItem("selected_company_id", firstId);
          }
        }
      })
      .catch((err) => console.error("Error fetching companies:", err));
  }, [user]);

  // Fetch E-Way Bills
  useEffect(() => {
    let active = true;
    const activeCompanyId = selectedCompany || getCompanyId();
    if (!activeCompanyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    (async () => {
      try {
        const res = await api.get("/eway-bill/list", {
          params: {
            company_id: activeCompanyId,
            search: appliedQuery,
            status: appliedStatus === "All Status" ? "" : appliedStatus,
          },
        });
        if (active && res.data && res.data.status) {
          setBills(Array.isArray(res.data.data) ? res.data.data : []);
        } else if (active) {
          setBills([]);
        }
      } catch (err) {
        if (active) setBills([]);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [selectedCompany, appliedQuery, appliedStatus, reloadKey]);

  const handleCompanyChange = (cId) => {
    setSelectedCompany(String(cId));
    localStorage.setItem("selected_company_id", String(cId));
    setCurrentPage(1);
  };

  const handleStatusPick = (opt) => {
    setStatus(opt);
    setAppliedStatus(opt);
    setFilterOpen(false);
    setCurrentPage(1);
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
    if (!updateForm.vehicle_number || !updateForm.vehicle_number.trim())
      errs.vehicle_number = "Vehicle number required";
    if (!updateForm.distance_km || Number(updateForm.distance_km) <= 0)
      errs.distance_km = "Distance required";
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
      setUpdateErrs({ backend: err.response?.data?.message || "Update failed." });
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

  // Filter bills by search query
  const filteredBills = useMemo(() => {
    if (!appliedQuery) return bills;
    const q = appliedQuery.toLowerCase();
    return bills.filter(
      (b) =>
        (b.ewb_number && String(b.ewb_number).toLowerCase().includes(q)) ||
        (b.invoice_no && String(b.invoice_no).toLowerCase().includes(q)) ||
        (b.customer_name && String(b.customer_name).toLowerCase().includes(q)) ||
        (b.vehicle_number && String(b.vehicle_number).toLowerCase().includes(q))
    );
  }, [bills, appliedQuery]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredBills.length / rowsPerPage) || 1;
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedBills = filteredBills.slice(
    (safePage - 1) * rowsPerPage,
    safePage * rowsPerPage
  );

  return (
    <div className="space-y-4 pb-12 max-w-[1600px] mx-auto">
      {/* ── 1. PAGE HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 border border-blue-100">
            <Truck size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">E-Way Bills Registry</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Official electronic consignment tracking registry · synced with invoices
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={refresh}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── 2. COMPANY SELECTOR PILLS ── */}
      {companies.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {companies.map((c) => {
            const isActive = Number(selectedCompany) === Number(c.id);
            return (
              <button
                key={c.id}
                onClick={() => handleCompanyChange(c.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border ${
                  isActive
                    ? "app-pill-active"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>🏢</span>
                <span>{c.company_name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── 3. REGISTRY TABLE CONTAINER ── */}
      <TableContainer
        title="Consignments Directory"
        badge={filteredBills.length}
        searchQuery={query}
        onSearchChange={(val) => {
          setQuery(val);
          setAppliedQuery(val.trim());
          setCurrentPage(1);
        }}
        searchPlaceholder="Search by EWB No, Invoice No, Customer, Vehicle..."
        actions={
          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
            >
              <SlidersHorizontal size={13} />
              <span>{status === "All Status" ? "Filter Status" : status}</span>
              <ChevronDown
                size={12}
                className={`transition-transform ${filterOpen ? "rotate-180" : ""}`}
              />
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-9 w-44 z-40 bg-white rounded-xl shadow-xl border border-slate-200 py-1 animate-in fade-in duration-100">
                {STATUS_OPTIONS.map((opt) => (
                  <div
                    key={opt}
                    onClick={() => handleStatusPick(opt)}
                    className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition ${
                      status === opt
                        ? "bg-blue-50 text-blue-600 font-bold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {opt}
                  </div>
                ))}
              </div>
            )}
          </div>
        }
      >
        <Table>
          <Thead>
            <tr>
              <Th>EWB Number</Th>
              <Th>Invoice</Th>
              <Th>Customer / GSTIN</Th>
              <Th align="right">Taxable</Th>
              <Th align="right">GST</Th>
              <Th align="right">Invoice Total</Th>
              <Th>Vehicle</Th>
              <Th align="center">Status</Th>
              <Th>Created</Th>
              <Th align="center" className="w-28">
                Actions
              </Th>
            </tr>
          </Thead>

          <Tbody>
            {loading ? (
              <TableLoadingState colSpan={10} message="Loading E-Way Bills registry..." />
            ) : filteredBills.length === 0 ? (
              <TableEmptyState
                colSpan={10}
                title="No E-Way Bills Found"
                description={
                  appliedQuery || appliedStatus !== "All Status"
                    ? "No records match your search filter criteria."
                    : "Generate an E-Way Bill from any created invoice to populate this registry."
                }
              />
            ) : (
              paginatedBills.map((bill) => (
                <Tr key={bill.id}>
                  <Td className="font-bold text-blue-600 font-mono text-xs whitespace-nowrap">
                    {bill.ewb_number}
                  </Td>

                  <Td className="whitespace-nowrap">
                    <div className="font-bold text-slate-800">{bill.invoice_no}</div>
                    <div className="text-[11px] text-slate-400 font-medium">
                      {dateOnly(bill.invoice_date)}
                    </div>
                  </Td>

                  <Td>
                    <div className="font-bold text-slate-800">{bill.customer_name || "—"}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {bill.to_gstin || "—"}
                    </div>
                  </Td>

                  <Td align="right" className="font-medium text-slate-700 whitespace-nowrap">
                    {money(bill.taxable_amount)}
                  </Td>

                  <Td align="right" className="font-medium text-slate-700 whitespace-nowrap">
                    {money(bill.gst_total)}
                  </Td>

                  <Td align="right" className="font-bold text-slate-900 whitespace-nowrap">
                    {money(bill.invoice_value)}
                  </Td>

                  <Td className="whitespace-nowrap">
                    <div className="font-semibold text-slate-800">
                      {bill.vehicle_number || "—"}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {bill.transport_mode || bill.vehicle_type || ""}
                    </div>
                  </Td>

                  <Td align="center">
                    <TableStatusBadge status={bill.status} />
                  </Td>

                  <Td className="text-slate-600 text-xs whitespace-nowrap">
                    {dt(bill.created_at)}
                  </Td>

                  <Td align="center">
                    <TableActionButtons
                      onView={() => setViewBill(bill)}
                      viewTitle="View Details"
                      onEdit={
                        ACTIVE_STATUSES.includes(bill.status)
                          ? () => openUpdate(bill)
                          : undefined
                      }
                      editTitle="Update Vehicle"
                      onDelete={
                        ACTIVE_STATUSES.includes(bill.status)
                          ? () => setCancelBill(bill)
                          : undefined
                      }
                      deleteTitle="Cancel E-Way Bill"
                    />
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>

        {filteredBills.length > 0 && (
          <TablePagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={filteredBills.length}
            rowsPerPage={rowsPerPage}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={(n) => {
              setRowsPerPage(n);
              setCurrentPage(1);
            }}
            itemLabel="bills"
          />
        )}
      </TableContainer>

      {/* ── 4. VIEW MODAL ── */}
      {viewBill && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setViewBill(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText size={18} className="text-blue-600" />
                <h3 className="text-base font-bold text-slate-800">
                  E-Way Bill {viewBill.ewb_number}
                </h3>
                <TableStatusBadge status={viewBill.status} />
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
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Supplier
                  </p>
                  <p className="text-xs font-bold text-slate-800">{viewBill.from_place || "—"}</p>
                  <p className="text-[11.5px] text-slate-500 leading-relaxed">
                    {viewBill.from_address || "—"}
                  </p>
                  <p className="text-[11.5px] text-slate-600 font-mono">
                    {viewBill.from_gstin || "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Consignee
                  </p>
                  <p className="text-xs font-bold text-slate-800">
                    {viewBill.consignee_name || viewBill.customer_name || "—"}
                  </p>
                  <p className="text-[11.5px] text-slate-500 leading-relaxed">
                    {viewBill.consignee_address || "—"}
                  </p>
                  <p className="text-[11.5px] text-slate-600 font-mono">
                    {viewBill.to_gstin || "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Validity
                  </p>
                  <p className="text-xs text-slate-600 flex items-center gap-1.5">
                    <Clock size={13} className="text-slate-400" /> Generated{" "}
                    {dt(viewBill.generated_date)}
                  </p>
                  <p className="text-xs text-slate-600">
                    Valid until{" "}
                    <span className="font-bold text-slate-800">{dt(viewBill.valid_upto)}</span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {viewBill.distance_km ? `${viewBill.distance_km} km` : "Distance not set"}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Invoice
                  </p>
                  <p className="text-xs font-bold text-slate-700">{viewBill.invoice_no}</p>
                  <p className="text-[11px] text-slate-400">{dateOnly(viewBill.invoice_date)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Supply
                  </p>
                  <p className="text-xs font-semibold text-slate-700">
                    {viewBill.supply_type || "—"}
                  </p>
                  <p className="text-[11px] text-slate-400">{viewBill.sub_supply_type || ""}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Transport
                  </p>
                  <p className="text-xs font-bold text-slate-700">
                    {viewBill.vehicle_number || "—"}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {viewBill.transport_mode} · {viewBill.vehicle_type}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Transporter
                  </p>
                  <p className="text-xs font-semibold text-slate-700">
                    {viewBill.transporter_name || "—"}
                  </p>
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
                            <span className="block text-[10px] text-slate-400 font-mono">
                              {it.product_code || ""}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600">
                            {it.quantity} {it.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600">
                            {money(it.rate)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600">
                            {it.gst_rate}%
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-700">
                            {money(it.taxable)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600">
                            {money(it.cgst)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600">
                            {money(it.sgst)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600">
                            {money(it.igst)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-x-6 gap-y-2 border-t border-slate-100 pt-4 text-xs">
                <span className="text-slate-500">
                  Taxable <strong className="text-slate-800">{money(viewBill.taxable_amount)}</strong>
                </span>
                <span className="text-slate-500">
                  GST <strong className="text-slate-800">{money(viewBill.gst_total)}</strong>{" "}
                  <span className="text-slate-400">
                    (C {money(viewBill.cgst_amount)} + S {money(viewBill.sgst_amount)} + I{" "}
                    {money(viewBill.igst_amount)})
                  </span>
                </span>
                <span className="text-slate-500">
                  Invoice Total{" "}
                  <strong className="text-blue-700 text-sm">{money(viewBill.invoice_value)}</strong>
                </span>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewBill(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
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
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setUpdateBill(null)}
        >
          <form
            onSubmit={confirmUpdate}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Pencil size={16} className="text-amber-600" /> Update Vehicle
              </h3>
              <button
                type="button"
                onClick={() => setUpdateBill(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              EWB <span className="font-bold text-blue-600">{updateBill.ewb_number}</span> · updating
              transport details recalculates validity.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500">
                  Vehicle Number
                </span>
                <input
                  value={updateForm.vehicle_number}
                  onChange={(e) =>
                    setUpdateForm((f) => ({ ...f, vehicle_number: e.target.value }))
                  }
                  className={`px-3 py-2 border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    updateErrs.vehicle_number ? "border-red-400" : "border-slate-300"
                  }`}
                />
                {updateErrs.vehicle_number && (
                  <span className="text-[10.5px] font-semibold text-red-500">
                    {updateErrs.vehicle_number}
                  </span>
                )}
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500">
                  Distance (km)
                </span>
                <input
                  type="number"
                  value={updateForm.distance_km}
                  onChange={(e) =>
                    setUpdateForm((f) => ({ ...f, distance_km: e.target.value }))
                  }
                  className={`px-3 py-2 border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    updateErrs.distance_km ? "border-red-400" : "border-slate-300"
                  }`}
                />
                {updateErrs.distance_km && (
                  <span className="text-[10.5px] font-semibold text-red-500">
                    {updateErrs.distance_km}
                  </span>
                )}
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500">
                  Transport Mode
                </span>
                <select
                  value={updateForm.transport_mode}
                  onChange={(e) =>
                    setUpdateForm((f) => ({ ...f, transport_mode: e.target.value }))
                  }
                  className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer bg-white"
                >
                  {["Road", "Rail", "Air", "Ship"].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500">
                  Vehicle Type
                </span>
                <select
                  value={updateForm.vehicle_type}
                  onChange={(e) =>
                    setUpdateForm((f) => ({ ...f, vehicle_type: e.target.value }))
                  }
                  className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer bg-white"
                >
                  <option>Regular</option>
                  <option>ODC</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500">
                  Transporter Name
                </span>
                <input
                  value={updateForm.transporter_name}
                  onChange={(e) =>
                    setUpdateForm((f) => ({ ...f, transporter_name: e.target.value }))
                  }
                  className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500">
                  Transporter ID
                </span>
                <input
                  value={updateForm.transporter_id}
                  onChange={(e) =>
                    setUpdateForm((f) => ({ ...f, transporter_id: e.target.value }))
                  }
                  className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </label>
            </div>

            {updateErrs.backend && (
              <p className="text-xs font-semibold text-red-500">{updateErrs.backend}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setUpdateBill(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="app-btn-primary px-5 py-2 rounded-xl disabled:opacity-60 text-xs font-bold cursor-pointer"
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
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setCancelBill(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
              <XCircle size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Cancel E-Way Bill?</h3>
            <p className="text-xs text-slate-500 mb-5">
              EWB <span className="font-bold text-blue-600">{cancelBill.ewb_number}</span> for invoice{" "}
              <span className="font-bold text-slate-700">{cancelBill.invoice_no}</span> will be cancelled.
            </p>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setCancelBill(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
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