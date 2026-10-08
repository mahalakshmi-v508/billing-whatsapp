import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import {
  Bell,
  AlertCircle,
  Package,
  PackageX,
  ChevronRight,
  RotateCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LOW_STOCK_THRESHOLD, isLowStock, isOutOfStock } from "../../utils/stockAlerts";
import { useLanguage } from "../../utils/i18n";

/* Per-tab empty states so each filter explains itself instead of showing a generic blank list. */
const TAB_EMPTY_COPY = {
  all: {
    title: "All clear!",
    body: "No overdue payments, expiring items or stock warnings currently.",
  },
  overdue: {
    title: "No overdue payments",
    body: "Every customer invoice is within its due date.",
  },
  out_of_stock: {
    title: "Nothing out of stock",
    body: "No product has hit zero or negative quantity.",
  },
  low_stock: {
    title: "No low stock items",
    body: `Every active product has ${LOW_STOCK_THRESHOLD} units or more in stock.`,
  },
  expire: {
    title: "No expiring products",
    body: "All products are safe. None expiring within the next 30 days.",
  },
};

export default function HeaderNotifications() {
  const navigate = useNavigate();
  const { t: translate } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'overdue' | 'out_of_stock' | 'low_stock' | 'expire'
  const [overdueList, setOverdueList] = useState([]);
  const [unsoldList, setUnsoldList] = useState([]);
  const [stockAlerts, setStockAlerts] = useState([]);
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
        // Low stock (< 10) and out of stock (<= 0) alerts for the active branch.
        promises.push(
          api
            .get(
              `/dashboard/get_stock_alert_notifications?company_id=${selectedCompany}&threshold=${LOW_STOCK_THRESHOLD}`
            )
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
        promises.push(Promise.resolve([]));
      }

      const [overdueRes, unsoldRes, stockRes, expiringRes] = await Promise.all(promises);
      setOverdueList(overdueRes || []);
      setUnsoldList(unsoldRes || []);
      setStockAlerts(stockRes || []);
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

  /* ── Stock alert buckets ── */
  const outOfStockList = useMemo(
    () => stockAlerts.filter((p) => isOutOfStock(p)),
    [stockAlerts]
  );
  const lowStockList = useMemo(
    () => stockAlerts.filter((p) => isLowStock(p)),
    [stockAlerts]
  );

  const totalCount =
    overdueList.length +
    unsoldList.length +
    stockAlerts.length +
    expiringList.length;

  /* Rows visible for the current tab - drives the empty state instead of totalCount,
     so clicking "Out of Stock" when 0 items exist says "Nothing out of stock" rather
     than hiding the dropdown or claiming all 18 total alerts apply to it. */
  const tabCount = useMemo(() => {
    switch (activeTab) {
      case "overdue":
        return overdueList.length;
      case "out_of_stock":
        return outOfStockList.length;
      case "low_stock":
        return lowStockList.length;
      case "expire":
        return expiringList.length;
      case "all":
      default:
        return totalCount;
    }
  }, [
    activeTab,
    overdueList.length,
    outOfStockList.length,
    lowStockList.length,
    expiringList.length,
    totalCount,
  ]);

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
                    {translate("Notifications")}
                  </h3>
                  <p className="text-[10px] text-slate-300">{translate("Business alerts & critical dues")}</p>
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
            <div className="flex items-center bg-slate-50 border-b border-slate-100 px-3 py-1.5 gap-1.5 text-[11px] font-semibold overflow-x-auto paysplitx-scrollbar-light whitespace-nowrap">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${
                  activeTab === "all"
                    ? "bg-white text-indigo-600 shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {translate("All")} ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("overdue")}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${
                  activeTab === "overdue"
                    ? "bg-white text-rose-600 shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {translate("Overdue")} ({overdueList.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("out_of_stock")}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${
                  activeTab === "out_of_stock"
                    ? "bg-white text-rose-600 shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {translate("Out of Stock")} ({outOfStockList.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("low_stock")}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${
                  activeTab === "low_stock"
                    ? "bg-white text-amber-600 shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {translate("Low Stock")} ({lowStockList.length})
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
                {translate("Expire")} ({expiringList.length})
              </button>
            </div>

            {/* Content List */}
            <div className="max-h-80 overflow-y-auto paysplitx-scrollbar-light divide-y divide-slate-100">
              {loading && totalCount === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-medium">
                  <RotateCw size={18} className="animate-spin mx-auto mb-2 text-indigo-500" />
                  Loading alerts...
                </div>
              ) : tabCount === 0 ? (
                <div className="py-8 text-center px-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 font-bold">
                    ✓
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    {TAB_EMPTY_COPY[activeTab]?.title || "All clear!"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {TAB_EMPTY_COPY[activeTab]?.body ||
                      "No overdue payments, expiring items or stock warnings currently."}
                  </p>
                </div>
              ) : (
                <>
                  {/* Overdue Items */}
                  {(activeTab === "all" || activeTab === "overdue") &&
                    overdueList.map((item, idx) => (
                      <div
                        key={`due-${idx}`}
                        onClick={() => {
                          setIsOpen(false);
                          navigate(`/sales/invoices?search=${encodeURIComponent(item.customer || "")}`);
                        }}
                        className="p-3 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                            <AlertCircle size={14} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition">
                              {item.customer || "Unknown Customer"}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              Inv #{item.invoice_no} • Due: {item.due_date || "N/A"}
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

                  {/* Out of Stock Alerts (stock <= 0) */}
                  {(activeTab === "all" || activeTab === "out_of_stock") &&
                    outOfStockList.map((item, idx) => (
                      <div
                        key={`oos-${item.id || idx}`}
                        onClick={() => {
                          setIsOpen(false);
                          navigate("/products");
                        }}
                        className="p-3 hover:bg-rose-50/50 transition cursor-pointer flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                            <PackageX size={14} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate group-hover:text-rose-600 transition">
                              {item.product_name}
                            </p>
                            <p className="text-[10px] text-rose-600 font-medium">
                              Out of stock - {Number(item.stock)} {item.unit || "units"} available
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold">
                            Out of Stock
                          </span>
                          <span className="text-[10px] text-indigo-600 font-bold group-hover:underline inline-flex items-center gap-0.5 mt-0.5">
                            Restock <ChevronRight size={10} />
                          </span>
                        </div>
                      </div>
                    ))}

                  {/* Low Stock Alerts (0 < stock < threshold) */}
                  {(activeTab === "all" || activeTab === "low_stock") &&
                    lowStockList.map((item, idx) => (
                      <div
                        key={`low-${item.id || idx}`}
                        onClick={() => {
                          setIsOpen(false);
                          navigate("/products");
                        }}
                        className="p-3 hover:bg-amber-50/50 transition cursor-pointer flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                            <Package size={14} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate group-hover:text-amber-600 transition">
                              {item.product_name}
                            </p>
                            <p className="text-[10px] text-amber-600 font-medium">
                              Only {Number(item.stock)} {item.unit || "units"} left - below {LOW_STOCK_THRESHOLD}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                            Low Stock
                          </span>
                          <span className="text-[10px] text-indigo-600 font-bold group-hover:underline inline-flex items-center gap-0.5 mt-0.5">
                            Restock <ChevronRight size={10} />
                          </span>
                        </div>
                      </div>
                    ))}

                  {/* Dormant / Unsold Items - folded into the All tab only */}
                  {activeTab === "all" &&
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
