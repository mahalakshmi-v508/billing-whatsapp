import { useEffect, useState, useMemo } from "react";
import api from "../../services/api";
import {
  ShieldCheck,
  Search,
  Plus,
  Pencil,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Mail,
  Phone,
  UserCheck,
  UserX,
  X,
  Users,
  Check,
} from "lucide-react";
import AdminModal from "./AdminModal";

const ITEMS_PER_PAGE = 8;

export default function AdminList() {
  const [admins, setAdmins] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'active' | 'inactive'
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Modal State for Add & Edit
  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: "add", // 'add' | 'edit'
    adminData: null,
  });

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/get_admins");
      if (res.data.status) {
        setAdmins(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to fetch administrators", false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const toggleStatus = async (admin) => {
    const newStatus = admin.status === "active" ? "inactive" : "active";
    try {
      const res = await api.post("/admin/toggle_status_admin", {
        id: admin.id,
        status: newStatus,
      });
      if (res.data.success || res.data.status) {
        setAdmins((prev) =>
          prev.map((a) => (a.id === admin.id ? { ...a, status: newStatus } : a))
        );
        showToast(
          `Admin "${admin.name}" is now ${newStatus.toUpperCase()}`
        );
      } else {
        showToast(res.data.message || "Failed to update status", false);
      }
    } catch (err) {
      console.error(err);
      showToast("Server error while updating status", false);
    }
  };

  /* ── Filter & Search ── */
  const filtered = useMemo(() => {
    return admins.filter((a) => {
      const matchSearch =
        a.name?.toLowerCase().includes(search.toLowerCase()) ||
        a.email?.toLowerCase().includes(search.toLowerCase()) ||
        (a.phone && a.phone.includes(search));

      if (statusFilter === "active" && a.status !== "active") return false;
      if (statusFilter === "inactive" && a.status === "active") return false;

      return matchSearch;
    });
  }, [admins, search, statusFilter]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const total = admins.length;
    const active = admins.filter((a) => a.status === "active").length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [admins]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  const handleSearch = (val) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const getInitials = (name) =>
    name
      ? name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
      : "AD";

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 font-sans text-slate-800">
      {/* ── TOAST NOTIFICATION ── */}
      {toast && (
        <div className="fixed top-5 right-5 z-[99999] flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-slate-200 shadow-xl animate-in fade-in slide-in-from-top-3 duration-200">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-white ${toast.ok
              ? "bg-emerald-500 shadow-emerald-500/20"
              : "bg-rose-500 shadow-rose-500/20"
              }`}
          >
            {toast.ok ? <Check size={16} /> : <X size={16} />}
          </div>
          <span className="text-sm font-semibold text-slate-800">
            {toast.msg}
          </span>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Admin Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
              {admins.length} Admins
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage company administrators, phone contacts, permission toggles, and account access.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchAdmins}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition-all"
            title="Refresh List"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            onClick={() =>
              setModalState({ isOpen: true, mode: "add", adminData: null })
            }
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all transform active:scale-95"
          >
            <Plus size={16} />
            Add Admin
          </button>
        </div>
      </div>

      {/* ── KPI STATS CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Total Admins */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Administrators
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {stats.total}
            </div>
            <span className="text-[11px] font-medium text-slate-500">
              Registered admin accounts
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
            <ShieldCheck size={24} />
          </div>
        </div>

        {/* Active Admins */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Active Admins
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
              {stats.active}
            </div>
            <span className="text-[11px] font-medium text-slate-500">
              Full access enabled
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <UserCheck size={24} />
          </div>
        </div>

        {/* Inactive Admins */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Inactive Admins
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-500 mt-1">
              {stats.inactive}
            </div>
            <span className="text-[11px] font-medium text-slate-500">
              Disabled / Suspended
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 flex-shrink-0">
            <UserX size={24} />
          </div>
        </div>
      </div>

      {/* ── TOOLBAR: SEARCH & TABS ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search admin name, email or phone..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-8 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
          {search && (
            <button
              onClick={() => handleSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold self-start sm:self-auto">
          <button
            onClick={() => {
              setStatusFilter("all");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === "all"
              ? "bg-white text-indigo-600 shadow-sm font-black"
              : "text-slate-600 hover:text-slate-900"
              }`}
          >
            All ({admins.length})
          </button>
          <button
            onClick={() => {
              setStatusFilter("active");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === "active"
              ? "bg-white text-emerald-600 shadow-sm font-black"
              : "text-slate-600 hover:text-slate-900"
              }`}
          >
            Active ({stats.active})
          </button>
          <button
            onClick={() => {
              setStatusFilter("inactive");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === "inactive"
              ? "bg-white text-slate-700 shadow-sm font-black"
              : "text-slate-600 hover:text-slate-900"
              }`}
          >
            Inactive ({stats.inactive})
          </button>
        </div>
      </div>

      {/* ── TABLE CONTAINER ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4">Administrator</th>
                <th className="py-3.5 px-4">Email Address</th>
                <th className="py-3.5 px-4">Mobile Number</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">User Enable/Disable</th>
                <th className="py-3.5 px-4 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-400 font-medium">
                    <RefreshCw size={24} className="mx-auto animate-spin mb-2 text-indigo-500" />
                    Loading administrators...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-400 font-medium">
                    <Users size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-bold text-slate-700">No administrators found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {search ? "Try adjusting your search criteria." : "Click '+ Add Admin' to create one."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((a, idx) => {
                  const isActive = a.status === "active";
                  const serial = (safePage - 1) * ITEMS_PER_PAGE + idx + 1;

                  return (
                    <tr
                      key={a.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Serial */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                        {serial}
                      </td>

                      {/* Admin Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs flex-shrink-0">
                            {getInitials(a.name)}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                              {a.name}
                            </div>
                            <span className="inline-block text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded mt-0.5">
                              ADMINISTRATOR
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Mail size={13} className="text-slate-400 flex-shrink-0" />
                          <span>{a.email || "—"}</span>
                        </div>
                      </td>

                      {/* Mobile Number */}
                      <td className="py-3.5 px-4 text-slate-700 font-semibold">
                        {a.phone ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                              <Phone size={12} />
                            </div>
                            <span className="font-mono text-xs">{a.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${isActive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                            }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"
                              }`}
                          />
                          {a.status || "inactive"}
                        </span>
                      </td>

                      {/* Toggle Switch */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => toggleStatus(a)}
                          className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isActive ? "bg-indigo-600" : "bg-slate-300"
                            }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${isActive ? "translate-x-5" : "translate-x-0"
                              }`}
                          />
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() =>
                              setModalState({
                                isOpen: true,
                                mode: "edit",
                                adminData: a,
                              })
                            }
                            title="Edit Admin Details"
                            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200 flex items-center justify-center transition-all"
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── PAGINATION ── */}
        {filtered.length > ITEMS_PER_PAGE && (
          <div className="p-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
            <p className="text-xs text-slate-500 font-medium">
              Showing{" "}
              <strong>
                {(safePage - 1) * ITEMS_PER_PAGE + 1}–
                {Math.min(safePage * ITEMS_PER_PAGE, filtered.length)}
              </strong>{" "}
              of <strong>{filtered.length}</strong> administrators
            </p>

            <div className="flex items-center gap-1.5">
              <button
                disabled={safePage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={14} /> Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === totalPages ||
                    Math.abs(p - safePage) <= 1
                )
                .reduce((acc, p, i, arr) => {
                  if (i > 0 && arr[i - 1] !== p - 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, i) =>
                  item === "..." ? (
                    <span key={`dots-${i}`} className="px-1 text-slate-400 text-xs">
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setCurrentPage(item)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${safePage === item
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100"
                        }`}
                    >
                      {item}
                    </button>
                  )
                )}

              <button
                disabled={safePage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── ADMIN MODAL (ADD & EDIT POPUP) ── */}
      <AdminModal
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        adminData={modalState.adminData}
        onClose={() =>
          setModalState({ isOpen: false, mode: "add", adminData: null })
        }
        onSuccess={(msg) => {
          showToast(msg);
          fetchAdmins();
        }}
      />
    </div>
  );
}