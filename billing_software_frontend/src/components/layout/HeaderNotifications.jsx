import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import {
  Bell,
  AlertCircle,
  Package,
  Calendar,
  IndianRupee,
  ChevronRight,
  Sparkles,
  ExternalLink,
  RotateCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function HeaderNotifications() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'overdue' | 'stock' | 'expire'
  const [overdueList, setOverdueList] = useState([]);
  const [unsoldList, setUnsoldList] = useState([]);
  const [expiringList, setExpiringList] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const selectedCompany = localStorage.getItem("selected_company_id") || "";

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const adminId = user.role === "cashier" ? user.admin_id : user.id;

      const promises = [];
      if (adminId) {
        promises.push(
          api
            .get(`/dashboard/get_admin_overdue_notifications?admin_id=${adminId}`)
            .then((res) => (res.data.status ? res.data.data || [] : []))
            .catch(() => [])
        );
      } else {
        promises.push(Promise.resolve([]));
      }

      if (selectedCompany) {
        promises.push(
          api
            .get(`/dashboard/get_unsold_products_notification?company_id=${selectedCompany}`)
            .then((res) => (res.data.status ? res.data.data || [] : []))
            .catch(() => [])
        );
        promises.push(
          api
            .get(`/dashboard/get_expiring_products_notification?company_id=${selectedCompany}`)
            .then((res) => (res.data.status ? res.data.data || [] : []))
            .catch(() => [])
        );
      } else if (adminId) {
        promises.push(Promise.resolve([]));
        promises.push(
          api
            .get(`/dashboard/get_expiring_products_notification?admin_id=${adminId}`)
            .then((res) => (res.data.status ? res.data.data || [] : []))
            .catch(() => [])
        );
      } else {
        promises.push(Promise.resolve([]));
        promises.push(Promise.resolve([]));
      }

      const [overdueRes, unsoldRes, expiringRes] = await Promise.all(promises);
      setOverdueList(overdueRes || []);
      setUnsoldList(unsoldRes || []);
      setExpiringList(expiringRes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [selectedCompany]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalCount = overdueList.length + unsoldList.length + expiringList.length;

  return (
    <div ref={dropdownRef} className="relative">
      {/* ── Notification Bell Button ── */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) fetchNotifications();
        }}
        title="Business Alerts & Notifications"
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer relative shadow-2xs ${
          isOpen
            ? "bg-indigo-50 border-indigo-200 text-indigo-600 ring-2 ring-indigo-500/20"
            : "bg-white border-slate-200/90 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`}
      >
        <Bell size={17} className={totalCount > 0 ? "animate-wiggle" : ""} />
        {totalCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-md animate-pulse">
            {totalCount > 99 ? "99+" : totalCount}
          </span>
        )}
      </button>

      {/* ── Dropdown Popover ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-12 w-[340px] sm:w-[380px] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <Bell size={15} />
                </div>
                <div>
                  <h3 className="text-xs font-bold font-display uppercase tracking-wider">
                    Notifications
                  </h3>
                  <p className="text-[10px] text-slate-300">Business alerts & critical dues</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchNotifications}
                  title="Refresh Notifications"
                  className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                >
                  <RotateCw size={11} className={loading ? "animate-spin" : ""} />
                </button>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-sm">
                  {totalCount} active
                </span>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center bg-slate-50 border-b border-slate-100 px-3 py-1.5 gap-1.5 text-[11px] font-semibold overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${
                  activeTab === "all"
                    ? "bg-white text-indigo-600 shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                All ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("overdue")}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                  activeTab === "overdue"
                    ? "bg-white text-rose-600 shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Overdue ({overdueList.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("stock")}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                  activeTab === "stock"
                    ? "bg-white text-amber-600 shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Stock ({unsoldList.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("expire")}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                  activeTab === "expire"
                    ? "bg-white text-rose-600 shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Expire ({expiringList.length})
              </button>
            </div>

            {/* Content List */}
            <div className="max-h-80 overflow-y-auto paysplitx-scrollbar-light divide-y divide-slate-100">
              {loading && totalCount === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-medium">
                  <RotateCw size={18} className="animate-spin mx-auto mb-2 text-indigo-500" />
                  Loading alerts...
                </div>
              ) : totalCount === 0 ? (
                <div className="py-8 text-center px-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 font-bold">
                    ✓
                  </div>
                  <p className="text-xs font-bold text-slate-800">All clear!</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    No overdue payments, expiring items or stock warnings currently.
                  </p>
                </div>
              ) : (
                <>
                  {/* Empty tab state for Expire */}
                  {activeTab === "expire" && expiringList.length === 0 && (
                    <div className="py-8 text-center px-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 font-bold">
                        ✓
                      </div>
                      <p className="text-xs font-bold text-slate-800">No Expiring Products</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        All products are safe. None expiring within the next 30 days.
                      </p>
                    </div>
                  )}

                  {/* Empty tab state for Overdue */}
                  {activeTab === "overdue" && overdueList.length === 0 && (
                    <div className="py-8 text-center px-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 font-bold">
                        ✓
                      </div>
                      <p className="text-xs font-bold text-slate-800">No Overdue Payments</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        All customer payments are up to date!
                      </p>
                    </div>
                  )}

                  {/* Empty tab state for Stock */}
                  {activeTab === "stock" && unsoldList.length === 0 && (
                    <div className="py-8 text-center px-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 font-bold">
                        ✓
                      </div>
                      <p className="text-xs font-bold text-slate-800">No Dormant Stock</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Inventory movement is healthy.
                      </p>
                    </div>
                  )}

                  {/* Overdue Items */}
                  {(activeTab === "all" || activeTab === "overdue") &&
                    overdueList.map((item, idx) => (
                      <div
                        key={`overdue-${idx}`}
                        onClick={() => {
                          setIsOpen(false);
                          navigate("/sales/payment-in");
                        }}
                        className="p-3 hover:bg-rose-50/40 transition cursor-pointer flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                            <AlertCircle size={14} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate group-hover:text-rose-600 transition">
                              {item.customer || item.customer_name || "Customer Account"}
                            </p>
                            <p className="text-[10px] text-rose-600 font-medium">
                              Due Date: {item.due_date || "Past Due"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xs font-extrabold text-rose-600 block">
                            ₹{Number(item.outstanding || item.total_balance || 0).toLocaleString("en-IN")}
                          </span>
                          <span className="text-[10px] text-indigo-600 font-bold group-hover:underline inline-flex items-center gap-0.5">
                            Collect <ChevronRight size={10} />
                          </span>
                        </div>
                      </div>
                    ))}

                  {/* Expiring Products */}
                  {(activeTab === "all" || activeTab === "expire") &&
                    expiringList.map((item, idx) => {
                      const isExpired = item.is_expired;
                      const isToday = item.expires_today;
                      const daysLeft = item.days_left;

                      let badgeText = "";
                      let badgeClass = "";
                      let dueText = "";

                      if (isExpired) {
                        badgeText = "Expired";
                        badgeClass = "bg-rose-100 text-rose-700 border-rose-200";
                        dueText = `Expired: ${item.expiry_date} (${Math.abs(daysLeft)}d ago)`;
                      } else if (isToday) {
                        badgeText = "Expires Today";
                        badgeClass = "bg-rose-100 text-rose-700 border-rose-200 font-bold animate-pulse";
                        dueText = `Expires: Today (${item.expiry_date})`;
                      } else {
                        badgeText = `${daysLeft}d left`;
                        badgeClass =
                          daysLeft <= 7
                            ? "bg-amber-100 text-amber-800 border-amber-200"
                            : "bg-orange-50 text-orange-700 border-orange-200";
                        dueText = `Expires: ${item.expiry_date} (in ${daysLeft} days)`;
                      }

                      return (
                        <div
                          key={`expire-${idx}`}
                          onClick={() => {
                            setIsOpen(false);
                            navigate("/products");
                          }}
                          className="p-3 hover:bg-rose-50/40 transition cursor-pointer flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 font-bold ${
                                isExpired || isToday
                                  ? "bg-rose-100 text-rose-600"
                                  : "bg-amber-100 text-amber-600"
                              }`}
                            >
                              <AlertCircle size={14} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate group-hover:text-rose-600 transition">
                                {item.product_name}
                              </p>
                              <p
                                className={`text-[10px] font-semibold ${
                                  isExpired
                                    ? "text-rose-600"
                                    : isToday
                                    ? "text-rose-500"
                                    : "text-amber-700"
                                }`}
                              >
                                {dueText}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                Stock:{" "}
                                <strong className="text-slate-600 font-semibold">
                                  {item.stock ?? 0} {item.unit || "units"}
                                </strong>
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full border font-bold block mb-1 ${badgeClass}`}
                            >
                              {badgeText}
                            </span>
                            <span className="text-[10px] text-indigo-600 font-bold group-hover:underline inline-flex items-center gap-0.5">
                              View <ChevronRight size={10} />
                            </span>
                          </div>
                        </div>
                      );
                    })}

                  {/* Stock / Unsold Items */}
                  {(activeTab === "all" || activeTab === "stock") &&
                    unsoldList.map((item, idx) => (
                      <div
                        key={`unsold-${idx}`}
                        onClick={() => {
                          setIsOpen(false);
                          navigate("/products");
                        }}
                        className="p-3 hover:bg-amber-50/40 transition cursor-pointer flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                            <Package size={14} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate group-hover:text-amber-600 transition">
                              {item.product_name}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Stock: {item.stock || 0} {item.unit || "units"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                            Dormant
                          </span>
                        </div>
                      </div>
                    ))}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/dashboard");
                }}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer inline-flex items-center gap-1"
              >
                <span>View Full Executive Dashboard</span>
                <ChevronRight size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
