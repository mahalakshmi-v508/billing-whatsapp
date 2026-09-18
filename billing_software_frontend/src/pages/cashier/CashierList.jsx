import { useEffect, useState } from "react";
import api from "../../services/api";
import {
  Pencil,
  Search,
  UserPlus,
  Users,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserCheck
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import CashierForm from "./CashierForm";
import EditCashier from "./EditCashier";

const PER_PAGE = 10;
const MAX_CASHIERS = 3;

export default function CashierList() {
  const [cashiers, setCashiers] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCashierId, setEditingCashierId] = useState(null);

  const navigate = useNavigate();
  const isLimitReached = cashiers.length >= MAX_CASHIERS;

  /* FETCH CASHIERS */
  const fetchCashiers = async () => {
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const res = await api.post("/cashier/get_cashiers", {
        admin_id: user.id,
      });
      if (res.data.status) {
        setCashiers(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashiers();
  }, []);

  /* TOGGLE STATUS */
  const toggleStatus = async (cashier) => {
    const newStatus = cashier.status === "active" ? "inactive" : "active";
    try {
      const res = await api.post("/cashier/toggle_status_cashier", {
        id: cashier.id,
        status: newStatus,
      });
      if (res.data.success) {
        setCashiers((prev) =>
          prev.map((c) => (c.id === cashier.id ? { ...c, status: newStatus } : c))
        );
      } else {
        alert(res.data.message || "Failed to update cashier status.");
      }
    } catch (err) {
      console.error(err);
      alert("Server Error");
    }
  };

  /* SEARCH & PAGINATION */
  const filtered = cashiers.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
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
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "??";

  const avatarColors = [
    ["bg-indigo-50 text-indigo-700 ring-indigo-200"],
    ["bg-blue-50 text-blue-700 ring-blue-200"],
    ["bg-emerald-50 text-emerald-700 ring-emerald-200"],
    ["bg-amber-50 text-amber-700 ring-amber-200"],
    ["bg-purple-50 text-purple-700 ring-purple-200"],
    ["bg-cyan-50 text-cyan-700 ring-cyan-200"]
  ];

  const getColor = (name) =>
    avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length][0];

  const activeCount = cashiers.filter((c) => c.status === "active").length;
  const inactiveCount = cashiers.filter((c) => c.status !== "active").length;

  return (
    <div className="min-h-screen bg-[#f8faff] p-4 sm:p-6 lg:p-8 space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* ── 1. PAGE HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 select-none">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100 ring-4 ring-indigo-50/50">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Cashier Accounts
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Control operator roles, POS counter logins &amp; cashier account access status
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
            <UserPlus size={16} strokeWidth={2.8} />
            <span>Add Cashier</span>
          </button>
        </div>
      </div>

      {/* ── 2. METRIC KPI CARDS (PaySplitX 4-Card Strip) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Cashiers */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Cashiers</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
                {cashiers.length}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>POS Operator Profiles</span>
            <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              Registered
            </span>
          </div>
        </div>

        {/* Card 2: Active Accounts */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Logins</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1 tracking-tight">
                {activeCount}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <UserCheck size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Ready for counter billing</span>
            <span className="text-[11px] font-semibold text-emerald-600">
              Online
            </span>
          </div>
        </div>

        {/* Card 3: Inactive Accounts */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Suspended / Off</p>
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

        {/* Card 4: Plan Limit */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Account Quota</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
                {cashiers.length} / {MAX_CASHIERS}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <ShieldCheck size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Maximum accounts allowed</span>
            <span className={`text-[11px] font-semibold ${isLimitReached ? "text-rose-600" : "text-purple-600"}`}>
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
              <span className="font-bold">Account limit reached: </span>
              Your current subscription allows a maximum of 3 cashiers. To add more counter operators, please request an upgrade.
            </div>
          </div>
          <button
            onClick={() => navigate("/cashier/add")}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl whitespace-nowrap transition cursor-pointer"
          >
            Request Upgrade
          </button>
        </div>
      )}

      {/* ── 4. SEARCH TOOLBAR ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search cashiers by name, email..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
            {filtered.length} operators
          </span>
        </div>
      </div>

      {/* ── 5. DIRECTORY TABLE CARD ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-max">
            <thead>
              <tr className="border-b border-slate-200/80 bg-[#fbfcfd] text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                <th className="py-3.5 px-5">Cashier Profile</th>
                <th className="py-3.5 px-5">Login Email</th>
                <th className="py-3.5 px-5 text-center">Status Toggle</th>
                <th className="py-3.5 px-5 text-center">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-slate-400">
                    Loading Cashier Accounts...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-400 flex items-center justify-center mb-3">
                        <Users size={32} />
                      </div>
                      <p className="text-sm font-bold text-slate-800">No Cashiers Found</p>
                      <p className="text-xs text-slate-400 mt-1">Add your store operators to permit counter access.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((c) => {
                  const colorClass = getColor(c.name);
                  return (
                    <tr key={c.id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ring-2 ${colorClass}`}>
                            {getInitials(c.name)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs sm:text-sm">{c.name}</div>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              ID #{c.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-5 text-slate-600 font-medium">
                        {c.email}
                      </td>

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

                      <td className="py-3.5 px-5 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            c.status === "active"
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                              : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${c.status === "active" ? "bg-emerald-600" : "bg-slate-400"}`} />
                          {c.status || "active"}
                        </span>
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => setEditingCashierId(c.id)}
                          className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                          title="Edit Cashier"
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

        {/* ── PAGINATION BAR ── */}
        {filtered.length > PER_PAGE && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-200/80 text-xs text-slate-600 bg-white">
            <div>
              Showing <strong className="font-bold text-slate-900">{(safePage - 1) * PER_PAGE + 1}</strong> to{" "}
              <strong className="font-bold text-slate-900">{Math.min(safePage * PER_PAGE, filtered.length)}</strong> of{" "}
              <strong className="font-bold text-slate-900">{filtered.length}</strong> operators
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

      {/* ── ADD CASHIER MODAL POPUP ── */}
      {showAddModal && (
        <CashierForm
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchCashiers();
          }}
        />
      )}

      {/* ── EDIT CASHIER MODAL POPUP ── */}
      {editingCashierId && (
        <EditCashier
          isOpen={Boolean(editingCashierId)}
          id={editingCashierId}
          onClose={() => setEditingCashierId(null)}
          onSuccess={() => {
            setEditingCashierId(null);
            fetchCashiers();
          }}
        />
      )}
    </div>
  );
}