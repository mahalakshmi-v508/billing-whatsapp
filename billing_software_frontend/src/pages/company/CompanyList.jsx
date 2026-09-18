import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import CompanyForm from "./CompanyForm";
import EditCompany from "./EditCompany";
import {
  Pencil,
  Search,
  Building2,
  Plus,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MapPin,
  Phone,
  Hash,
} from "lucide-react";

const PER_PAGE = 10;
const MAX_COMPANIES = 3;

export default function CompanyList() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState(null);

  const isLimitReached = companies.length >= MAX_COMPANIES;

  /* FETCH COMPANIES */
  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const res = await api.get(`/company/get_companies_by_admin?admin_id=${user?.id}`);
      if (res.data.status) {
        setCompanies(res.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching companies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  /* TOGGLE STATUS */
  const toggleStatus = async (company) => {
    const newStatus = company.status === "active" ? "inactive" : "active";
    try {
      const res = await api.post("/company/toggle_company_status", {
        id: company.id,
        status: newStatus,
      });

      if (res.data.status) {
        setCompanies((prev) =>
          prev.map((c) => (c.id === company.id ? { ...c, status: newStatus } : c))
        );
      } else {
        alert(res.data.message || "Failed to update company status.");
      }
    } catch (err) {
      console.error(err);
      alert("Server error while updating company status.");
    }
  };

  /* SEARCH & PAGINATION */
  const filtered = companies.filter(
    (c) =>
      c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.company_code?.toLowerCase().includes(search.toLowerCase()) ||
      c.gstin?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
  };

  const getInitials = (name) =>
    name
      ?.split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "CP";

  const avatarColors = [
    "bg-indigo-50 text-indigo-700 ring-indigo-200",
    "bg-blue-50 text-blue-700 ring-blue-200",
    "bg-emerald-50 text-emerald-700 ring-emerald-200",
    "bg-amber-50 text-amber-700 ring-amber-200",
    "bg-purple-50 text-purple-700 ring-purple-200",
    "bg-cyan-50 text-cyan-700 ring-cyan-200",
  ];

  const getColor = (name) =>
    avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length];

  const activeCount = companies.filter((c) => c.status === "active").length;
  const inactiveCount = companies.filter((c) => c.status !== "active").length;

  return (
    <div className="min-h-screen bg-[#f8faff] p-4 sm:p-6 lg:p-8 space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* ── 1. PAGE HEADER (Matches CashierList) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 select-none">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100 ring-4 ring-indigo-50/50">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Company Settings
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manage registered business entities, tax settings, GSTIN compliance &amp; store branches
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            disabled={isLimitReached}
            onClick={() => {
              if (!isLimitReached) setShowAddModal(true);
            }}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-lg transition-all transform active:scale-95 cursor-pointer ${
              isLimitReached
                ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                : "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-indigo-200"
            }`}
          >
            <Plus size={16} strokeWidth={2.8} />
            <span>Add Company</span>
          </button>
        </div>
      </div>

      {/* ── 2. METRIC KPI CARDS (PaySplitX 4-Card Strip) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Companies */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Companies
              </p>
              <h3 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
                {companies.length}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
              <Building2 size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Registered Business Entities</span>
            <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              Profiles
            </span>
          </div>
        </div>

        {/* Card 2: Active Entities */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Active Entities
              </p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1 tracking-tight">
                {activeCount}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Enabled for billing &amp; sales</span>
            <span className="text-[11px] font-semibold text-emerald-600">Active</span>
          </div>
        </div>

        {/* Card 3: Inactive / Suspended */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Inactive / Paused
              </p>
              <h3 className="text-2xl font-black text-amber-600 mt-1 tracking-tight">
                {inactiveCount}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <XCircle size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Temporarily disabled</span>
            <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              Paused
            </span>
          </div>
        </div>

        {/* Card 4: Company Quota */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Company Quota
              </p>
              <h3 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
                {companies.length} / {MAX_COMPANIES}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <ShieldCheck size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Maximum businesses allowed</span>
            <span
              className={`text-[11px] font-semibold ${
                isLimitReached ? "text-rose-600" : "text-purple-600"
              }`}
            >
              {isLimitReached ? "Limit Reached" : "Available"}
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. LIMIT WARNING BANNER ── */}
      {isLimitReached && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
            <div>
              <span className="font-bold">Company limit reached: </span>
              Your plan allows a maximum of 3 registered companies. To register additional firms or branches, please request an increase.
            </div>
          </div>
          <button
            onClick={() => navigate("/company/add")}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl whitespace-nowrap transition cursor-pointer"
          >
            Request Company
          </button>
        </div>
      )}

      {/* ── 4. SEARCH TOOLBAR ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search companies by name, code, GSTIN or phone..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-8 py-2 text-xs text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium transition"
          />
          {search && (
            <button
              onClick={() => handleSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
            {filtered.length} companies
          </span>
        </div>
      </div>

      {/* ── 5. DIRECTORY TABLE CARD (Exact CashierList structure) ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-max">
            <thead>
              <tr className="border-b border-slate-200/80 bg-[#fbfcfd] text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                <th className="py-3.5 px-5">#</th>
                <th className="py-3.5 px-5">Company Profile</th>
                <th className="py-3.5 px-5">Company Code</th>
                <th className="py-3.5 px-5">GSTIN</th>
                <th className="py-3.5 px-5">Contact Phone</th>
                <th className="py-3.5 px-5">Business Address</th>
                <th className="py-3.5 px-5 text-center">Status Toggle</th>
                <th className="py-3.5 px-5 text-center">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-slate-400">
                    Loading Companies...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-400 flex items-center justify-center mb-3">
                        <Building2 size={32} />
                      </div>
                      <p className="text-sm font-bold text-slate-800">No Companies Found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {search
                          ? "No registered entities match your search filter."
                          : "Add your store companies to start multi-firm billing."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((c, idx) => {
                  const colorClass = getColor(c.company_name);
                  return (
                    <tr key={c.id} className="hover:bg-indigo-50/20 transition-colors">
                      {/* Serial Number */}
                      <td className="py-3.5 px-5">
                        <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                          {(safePage - 1) * PER_PAGE + idx + 1}
                        </span>
                      </td>

                      {/* Company Profile (Avatar + Name + Email) */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ring-2 ${colorClass}`}
                          >
                            {getInitials(c.company_name)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs sm:text-sm">
                              {c.company_name}
                            </div>
                            {c.email ? (
                              <div className="text-[11px] text-slate-500 font-normal">
                                {c.email}
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                ID #{c.id}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Company Code */}
                      <td className="py-3.5 px-5">
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200/60">
                          <Hash size={11} className="text-indigo-400" />
                          {c.company_code || "—"}
                        </span>
                      </td>

                      {/* GSTIN */}
                      <td className="py-3.5 px-5 font-mono text-xs font-semibold text-slate-700">
                        {c.gstin || "—"}
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-5 text-slate-600">
                        {c.phone ? (
                          <div className="flex items-center gap-1.5">
                            <Phone size={13} className="text-slate-400" />
                            <span>{c.phone}</span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>

                      {/* Address */}
                      <td className="py-3.5 px-5 text-slate-600 max-w-[200px]">
                        {c.company_address ? (
                          <div
                            className="flex items-center gap-1.5 truncate"
                            title={c.company_address}
                          >
                            <MapPin size={13} className="text-slate-400 flex-shrink-0" />
                            <span className="truncate">{c.company_address}</span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>

                      {/* Status Toggle Switch (Matches CashierList) */}
                      <td className="py-3.5 px-5 text-center">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={c.status === "active"}
                          onClick={() => toggleStatus(c)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            c.status === "active" ? "bg-indigo-600" : "bg-slate-200"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              c.status === "active" ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-5 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            c.status === "active"
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                              : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              c.status === "active" ? "bg-emerald-600" : "bg-slate-400"
                            }`}
                          />
                          {c.status || "active"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => setEditingCompanyId(c.id)}
                          className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                          title="Edit Company"
                        >
                          <Pencil size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── PAGINATION BAR (Matches CashierList) ── */}
        {filtered.length > PER_PAGE && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-200/80 text-xs text-slate-600 bg-white">
            <div>
              Showing <strong className="font-bold text-slate-900">{(safePage - 1) * PER_PAGE + 1}</strong> to{" "}
              <strong className="font-bold text-slate-900">
                {Math.min(safePage * PER_PAGE, filtered.length)}
              </strong>{" "}
              of <strong className="font-bold text-slate-900">{filtered.length}</strong> companies
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={safePage === 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronLeft size={15} />
              </button>
              <div className="px-3 py-1 font-bold text-slate-800">
                {safePage} / {totalPages}
              </div>
              <button
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── ADD COMPANY MODAL POPUP ── */}
      {showAddModal && (
        <CompanyForm
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchCompanies();
          }}
        />
      )}

      {/* ── EDIT COMPANY MODAL POPUP ── */}
      {editingCompanyId && (
        <EditCompany
          isOpen={Boolean(editingCompanyId)}
          id={editingCompanyId}
          onClose={() => setEditingCompanyId(null)}
          onSuccess={() => {
            setEditingCompanyId(null);
            fetchCompanies();
          }}
        />
      )}
    </div>
  );
}