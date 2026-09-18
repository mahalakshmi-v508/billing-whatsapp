import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import {
  Pencil, ChevronLeft, ChevronRight, Phone, MapPin, Mail,
  Search, Plus, Building2, UserCheck, ShieldAlert, Users,
  RefreshCw, X, PackageCheck
} from "lucide-react";

const ITEMS_PER_PAGE = 8;

export default function SupplierList() {
  const navigate = useNavigate();

  const [suppliers, setSuppliers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "active" | "inactive"
  const [loading, setLoading] = useState(true);

  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(
    localStorage.getItem("selected_company_id") || ""
  );

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user?.id) return;

    api.get(`/company/get_companies_by_admin?admin_id=${user.id}`)
      .then((res) => {
        if (res.data.status) {
          setCompanies(res.data.data);
          const savedId = localStorage.getItem("selected_company_id");
          const activeId = savedId || (res.data.data.length > 0 ? res.data.data[0].id : "");
          if (activeId) {
            setSelectedCompany(activeId);
            fetchSuppliers(activeId);
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchSuppliers(selectedCompany);
    } else {
      setSuppliers([]);
      setLoading(false);
    }
  }, [selectedCompany]);

  const fetchSuppliers = async (companyId) => {
    setLoading(true);
    try {
      const res = await api.get(`/supplier/get_all?company_id=${companyId}`);
      if (res.data.status) {
        setSuppliers(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyChange = (companyId) => {
    setSelectedCompany(companyId);
    localStorage.setItem("selected_company_id", companyId);
    setCurrentPage(1);
  };

  const toggleStatus = async (supplier) => {
    const newStatus = supplier.status === "active" ? "inactive" : "active";
    try {
      const res = await api.post("/supplier/toggle_supplier_status", {
        id: supplier.id,
        status: newStatus,
      });

      if (res.data.status) {
        setSuppliers((prev) =>
          prev.map((s) => (s.id === supplier.id ? { ...s, status: newStatus } : s))
        );
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Server error toggling status");
    }
  };

  const goToProductList = (supplier) => {
    navigate(`/supplier/${supplier.id}/products`, {
      state: { supplierName: supplier.supplier_name },
    });
  };

  // KPI Calculations
  const metrics = useMemo(() => {
    const total = suppliers.length;
    const active = suppliers.filter((s) => s.status === "active").length;
    const inactive = total - active;
    const withGst = suppliers.filter((s) => Boolean(s.gst_number)).length;
    return { total, active, inactive, withGst };
  }, [suppliers]);

  // Filtering
  const filtered = useMemo(() => {
    return suppliers.filter((s) => {
      const q = search.toLowerCase();
      const matchesSearch =
        s.supplier_name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.gst_number?.toLowerCase().includes(q) ||
        s.mobile_number?.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (statusFilter === "active") return s.status === "active";
      if (statusFilter === "inactive") return s.status !== "active";
      return true;
    });
  }, [suppliers, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6 min-h-screen bg-[#f8faff] p-4 sm:p-6 lg:p-8 font-sans animate-in fade-in duration-300">
      
      {/* ── 1. HEADER (PaySplitX Style) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-md shadow-indigo-100 ring-2 ring-indigo-50">
              <Building2 size={20} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-display">
              Suppliers Directory
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
              {suppliers.length} Registered
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Maintain supplier relationships, GST registrations, product inventories, and contact information.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => navigate("/purchases")}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            <span>View Purchase Bills</span>
          </button>
          <button
            onClick={() => navigate("/supplier/add")}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white font-semibold text-xs rounded-xl shadow-sm shadow-indigo-200 transition transform active:scale-95 cursor-pointer"
          >
            <Plus size={15} strokeWidth={2.6} />
            <span>+ Add Supplier</span>
          </button>
        </div>
      </div>

      {/* ── 2. 4-CARD KPI STRIP ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Suppliers */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Suppliers</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight my-1 font-display">
            {metrics.total}
          </div>
          <div className="text-[11px] text-slate-500">
            <span>Enrolled vendor partners</span>
          </div>
        </div>

        {/* Active Accounts */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Status</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 tracking-tight my-1 font-display">
            {metrics.active}
          </div>
          <div className="text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">Operational</span> vendor accounts
          </div>
        </div>

        {/* Inactive / Paused */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Suspended</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldAlert size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 tracking-tight my-1 font-display">
            {metrics.inactive}
          </div>
          <div className="text-[11px] text-slate-500">
            <span>Inactive or disabled</span>
          </div>
        </div>

        {/* GST Registered */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">GST Compliant</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-600 tracking-tight my-1 font-display">
            {metrics.withGst}
          </div>
          <div className="text-[11px] text-slate-500">
            <span>Verified GSTIN tax profiles</span>
          </div>
        </div>
      </div>

      {/* ── 3. TOOLBAR (Search + Firm + Status Filter) ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search supplier name, mobile, email, city or GSTIN..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white font-medium transition"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Firm Filter + Status Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {companies.length > 1 && (
            <select
              value={selectedCompany}
              onChange={(e) => handleCompanyChange(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 text-slate-700 outline-none"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  🏢 {c.company_name}
                </option>
              ))}
            </select>
          )}

          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            {[
              { id: "all", label: "All" },
              { id: "active", label: "Active" },
              { id: "inactive", label: "Inactive" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === tab.id
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 4. SUPPLIERS DIRECTORY TABLE ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw size={15} className="animate-spin text-indigo-500" />
              <span>Loading suppliers directory...</span>
            </div>
          ) : paginated.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Building2 size={28} />
              </div>
              <h3 className="font-bold text-sm text-slate-800">No Suppliers Found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No vendors found for the current search filter. Add a new supplier to start recording purchases.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Supplier & Products</th>
                  <th className="py-3 px-4">Contact Details</th>
                  <th className="py-3 px-4">Address & City</th>
                  <th className="py-3 px-4">GST Number</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginated.map((s, index) => {
                  const initial = (s.supplier_name || "S").charAt(0).toUpperCase();
                  const isActive = s.status === "active";
                  return (
                    <tr key={s.id} className="hover:bg-indigo-50/20 transition-colors text-slate-700">
                      <td className="py-3.5 px-4 text-center text-slate-400 font-bold">
                        {(safePage - 1) * ITEMS_PER_PAGE + index + 1}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-black flex items-center justify-center text-xs shrink-0 shadow-xs">
                            {initial}
                          </div>
                          <div>
                            <button
                              onClick={() => goToProductList(s)}
                              className="font-bold text-slate-900 hover:text-indigo-600 transition text-left cursor-pointer flex items-center gap-1 group"
                              title="Click to view supplier's products"
                            >
                              <span>{s.supplier_name}</span>
                              <span className="text-[10px] text-indigo-500 opacity-0 group-hover:opacity-100 transition">
                                (View Products)
                              </span>
                            </button>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {s.contact_person ? `Attn: ${s.contact_person}` : "Supplier"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Phone size={11} className="text-slate-400" />
                            <span>{s.mobile_number || s.phone || "—"}</span>
                          </div>
                          {s.email && (
                            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                              <Mail size={11} />
                              <span>{s.email}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-600 max-w-[200px] truncate">
                          <MapPin size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate">{s.address || s.city || "—"}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {s.gst_number ? (
                          <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                            {s.gst_number}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unregistered</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isActive}
                            onClick={() => toggleStatus(s)}
                            className={`relative w-9 h-5 rounded-full transition-colors shrink-0 cursor-pointer ${
                              isActive ? "bg-indigo-600" : "bg-slate-300"
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                isActive ? "left-[18px]" : "left-0.5"
                              }`}
                            />
                          </button>
                          <span
                            className={`text-[11px] font-bold ${
                              isActive ? "text-emerald-700" : "text-slate-400"
                            }`}
                          >
                            {isActive ? "Active" : "Off"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => goToProductList(s)}
                            title="Supplier Products"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                          >
                            <PackageCheck size={15} />
                          </button>
                          <button
                            onClick={() => navigate(`/supplier/edit/${s.id}`)}
                            title="Edit Supplier Details"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                          >
                            <Pencil size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Showing page <strong className="text-slate-800">{safePage}</strong> of{" "}
              <strong className="text-slate-800">{totalPages}</strong> ({filtered.length} suppliers)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition cursor-pointer ${
                    safePage === i + 1
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}