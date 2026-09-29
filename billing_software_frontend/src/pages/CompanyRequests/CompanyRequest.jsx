import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import {
  Search,
  Building2,
  Check,
  X,
  Users,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ShieldCheck,
  Mail,
  UserCheck,
  AlertCircle,
  Building,
} from "lucide-react";

const ITEMS_PER_PAGE = 8;

export default function CompanyRequest() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [confirmBox, setConfirmBox] = useState({
    open: false,
    type: "",
    requestId: null,
    item: null,
  });

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get("/CompanyRequest/get_company_requests");
      if (res.data.status) {
        setRequests(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to load company requests", false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (requestId) => {
    try {
      setActionLoading(true);
      const res = await api.post("/CompanyRequest/approve_company_request", {
        request_id: requestId,
      });

      if (res.data.status) {
        showToast("Company onboarding request approved successfully! 🎉", true);
        await fetchRequests();
      } else {
        showToast(res.data.message || "Approval failed", false);
      }
    } catch (err) {
      console.error(err);
      showToast("Server error during approval", false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (requestId) => {
    try {
      setActionLoading(true);
      const res = await api.post("/CompanyRequest/reject_company_request", {
        request_id: requestId,
      });

      if (res.data.status) {
        showToast("Company request rejected", true);
        await fetchRequests();
      } else {
        showToast(res.data.message || "Rejection failed", false);
      }
    } catch (err) {
      console.error(err);
      showToast("Server error during rejection", false);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const txt = search.toLowerCase();
      return (
        (r.company_name || "").toLowerCase().includes(txt) ||
        (r.owner_name || "").toLowerCase().includes(txt) ||
        (r.owner_email || "").toLowerCase().includes(txt) ||
        (r.admin_name || "").toLowerCase().includes(txt)
      );
    });
  }, [requests, search]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const totalRequests = requests.length;
    const uniqueAdmins = new Set(
      requests.map((r) => r.admin_name || r.owner_name).filter(Boolean)
    ).size;
    return { totalRequests, uniqueAdmins };
  }, [requests]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRequests.length / ITEMS_PER_PAGE)
  );
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRequests = filteredRequests.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  const getInitial = (name) =>
    name ? name.charAt(0).toUpperCase() : "C";

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 font-sans text-slate-800">
      {/* ── CONFIRMATION MODAL ── */}
      {confirmBox.open && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget)
              setConfirmBox({ open: false, type: "", requestId: null, item: null });
          }}
          className="fixed inset-0 z-[9998] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 text-center animate-in zoom-in-95 duration-150">
            <div
              className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4 ${
                confirmBox.type === "approve"
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                  : "bg-rose-50 text-rose-600 border border-rose-100"
              }`}
            >
              {confirmBox.type === "approve" ? (
                <Check size={28} />
              ) : (
                <X size={28} />
              )}
            </div>

            <h3 className="text-lg font-extrabold text-slate-900">
              {confirmBox.type === "approve"
                ? "Approve Company Request?"
                : "Reject Company Request?"}
            </h3>

            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              {confirmBox.type === "approve" ? (
                <>
                  Are you sure you want to approve company{" "}
                  <strong className="text-slate-800">
                    {confirmBox.item?.company_name || "this company"}
                  </strong>{" "}
                  requested by{" "}
                  <strong className="text-slate-800">
                    {confirmBox.item?.admin_name || "the administrator"}
                  </strong>
                  ? The business entity will be created and activated immediately.
                </>
              ) : (
                <>
                  Are you sure you want to reject the registration request for{" "}
                  <strong className="text-slate-800">
                    {confirmBox.item?.company_name || "this company"}
                  </strong>
                  ? This action cannot be undone.
                </>
              )}
            </p>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() =>
                  setConfirmBox({ open: false, type: "", requestId: null, item: null })
                }
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={async () => {
                  if (confirmBox.type === "approve") {
                    await handleApprove(confirmBox.requestId);
                  } else {
                    await handleReject(confirmBox.requestId);
                  }
                  setConfirmBox({ open: false, type: "", requestId: null, item: null });
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center justify-center gap-1.5 ${
                  confirmBox.type === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                    : "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                }`}
              >
                {actionLoading
                  ? "Processing..."
                  : confirmBox.type === "approve"
                  ? "Yes, Approve"
                  : "Yes, Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST NOTIFICATION ── */}
      {toast && (
        <div className="fixed top-5 right-5 z-[99999] flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-slate-200 shadow-xl animate-in fade-in slide-in-from-top-3 duration-200">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-white ${
              toast.ok
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
              Company Approval Requests
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
              {requests.length} Pending
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review and approve new company onboarding requests submitted by administrators.
          </p>
        </div>

        <button
          onClick={fetchRequests}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition-all self-start sm:self-auto"
          title="Refresh List"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh Requests
        </button>
      </div>

      {/* ── KPI STATS CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Total Pending */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Pending Company Requests
            </span>
            <div className="text-xl sm:text-2xl font-black text-amber-600 mt-1">
              {stats.totalRequests}
            </div>
            <span className="text-[11px] font-medium text-slate-500">
              Awaiting verification & onboarding
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
            <Building2 size={24} />
          </div>
        </div>

        {/* Requesting Admins */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Requesting Administrators
            </span>
            <div className="text-xl sm:text-2xl font-black text-indigo-600 mt-1">
              {stats.uniqueAdmins}
            </div>
            <span className="text-[11px] font-medium text-slate-500">
              Registered business owners
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
            <Users size={24} />
          </div>
        </div>
      </div>

      {/* ── TOOLBAR: SEARCH ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 mb-6">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search company name, admin supervisor or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-8 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                setCurrentPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── TABLE CONTAINER ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4">Company Details</th>
                <th className="py-3.5 px-4">Requested By (Admin)</th>
                <th className="py-3.5 px-4 text-center w-48">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-14 text-center text-slate-400 font-medium">
                    <RefreshCw size={24} className="mx-auto animate-spin mb-2 text-indigo-500" />
                    Loading company requests...
                  </td>
                </tr>
              ) : paginatedRequests.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-14 text-center text-slate-400 font-medium">
                    <ShieldCheck size={36} className="mx-auto text-emerald-500 mb-2" />
                    <p className="text-sm font-bold text-slate-700">No Pending Requests</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {search ? "No company requests match your search criteria." : "All company onboarding requests have been reviewed 🎉"}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((item, index) => {
                  const serial = (safePage - 1) * ITEMS_PER_PAGE + index + 1;
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Serial */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                        {serial}
                      </td>

                      {/* Company Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm flex-shrink-0">
                            {getInitial(item.company_name)}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 text-sm">
                              {item.company_name}
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium">
                              Request ID #{item.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Requested By */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800 text-xs sm:text-sm">
                          {item.admin_name || item.owner_name || "Administrator"}
                        </div>
                        <span className="inline-block text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded mt-0.5">
                          COMPANY ADMIN
                        </span>
                      </td>

                      {/* Decision Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() =>
                              setConfirmBox({
                                open: true,
                                type: "approve",
                                requestId: item.id,
                                item,
                              })
                            }
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 flex items-center gap-1 transition-all transform active:scale-95"
                          >
                            <Check size={14} /> Accept
                          </button>

                          <button
                            onClick={() =>
                              setConfirmBox({
                                open: true,
                                type: "reject",
                                requestId: item.id,
                                item,
                              })
                            }
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 flex items-center gap-1 transition-all transform active:scale-95"
                          >
                            <X size={14} /> Reject
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
        {filteredRequests.length > ITEMS_PER_PAGE && (
          <div className="p-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
            <p className="text-xs text-slate-500 font-medium">
              Showing{" "}
              <strong>
                {(safePage - 1) * ITEMS_PER_PAGE + 1}–
                {Math.min(safePage * ITEMS_PER_PAGE, filteredRequests.length)}
              </strong>{" "}
              of <strong>{filteredRequests.length}</strong> requests
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
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                        safePage === item
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
    </div>
  );
}