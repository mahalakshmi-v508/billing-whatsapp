import { useState, useEffect, useRef } from "react";
import api from "../services/api";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Home,
  Package,
  ReceiptText,
  BarChart3,
  Building2,
  Settings,
  ShieldCheck,
   AlertCircle ,
   User,
  LogOut,
  FolderTree,
  Boxes,
  Tags,
  Truck,
  PackageSearch,
  Search,
  Users,
  UserCog,
  ClipboardList,
  Building,
  HelpCircle,
  MessageCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  ShoppingBag,
  PackagePlus,
  UserPlus,
  FolderPlus,
  Play,
  ShoppingCart,
} from "lucide-react";

// 🎟️ Sale Ticket Icon with % symbol matching reference image
const SaleIcon = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
    <path d="M15 9l-6 6" />
    <path d="M9 9h.01" />
    <path d="M15 15h.01" />
  </svg>
);

// Official WhatsApp logo glyph (inherits sidebar text color)
const WhatsAppIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredPath, setHoveredPath] = useState(null);
  const [saleOpen, setSaleOpen] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const quickAddRef = useRef(null);

  // Collapsible Sidebar state
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("sidebar_collapsed") === "true";
  });
  const [sidebarHovered, setSidebarHovered] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar_collapsed", String(next));
      return next;
    });
  };

  // Close quickAdd dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (quickAddRef.current && !quickAddRef.current.contains(event.target)) {
        setQuickAddOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard Shortcuts: Ctrl + Enter toggles menu, Alt shortcuts navigate
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        setQuickAddOpen((prev) => !prev);
      }
      if (e.altKey) {
        const key = e.key.toLowerCase();
        if (key === "s") {
          e.preventDefault();
          setQuickAddOpen(false);
          navigate("/sales/add");
        } else if (key === "i") {
          e.preventDefault();
          setQuickAddOpen(false);
          navigate("/sales/payment-in");
        } else if (key === "r") {
          e.preventDefault();
          setQuickAddOpen(false);
          navigate("/sales/credit-note/add");
        } else if (key === "f") {
          e.preventDefault();
          setQuickAddOpen(false);
          navigate("/sales/order");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  // 🔥 GET USER
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.role;

  // Hide sidebar for cashier on billing page (full-screen POS mode)
  const isCashierBilling = role === "cashier" && location.pathname === "/billing";

  useEffect(() => {
    if (!user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  // Auto-expand Sale or Purchase dropdown if current route is inside it
  useEffect(() => {
    if (location.pathname.startsWith("/sales")) {
      setSaleOpen(true);
    }
    if (location.pathname.startsWith("/purchases")) {
      setPurchaseOpen(true);
    }
  }, [location.pathname]);

  // 🔥 LOGOUT
  const handleLogout = async () => {
    try {
      const userObj = JSON.parse(localStorage.getItem("user") || "{}");
      if (userObj && userObj.id) {
        await api.post("/auth/logout", { id: userObj.id, role: userObj.role });
      }
    } catch (err) {
      console.error(err);
    }
    localStorage.clear();
    navigate("/");
  };

  // 🔥 ROLE BASED MENU
  const menuItems = [
    // COMMON FOR ALL ROLES
    { name: "Helpdesk Support", path: "/helpdesk", icon: <HelpCircle size={20} /> },

    // ADMIN ONLY
    ...(role === "admin"
      ? [
          { name: "Home", path: "/dashboard", icon: <Home size={20} /> },
          {
            name: "Sale",
            icon: <SaleIcon size={20} />,
            isDropdown: true,
            subItems: [
              { name: "Sale Invoices", path: "/sales/invoices", altPaths: ["/sales/invoices", "/reports", "/sales/add"] },
              { name: "Payment-In", path: "/sales/payment-in", altPaths: ["/payment-pending", "/sales/payment-in"] },
              { name: "Sale Return/ Credit Note", path: "/sales/credit-note" },
            ]
          },
          { name: "Company", path: "/company", icon: <Building2 size={20} /> },
          { name: "Category & Subcategory", path: "/category", icon: <Package size={20} /> },
          { name: "Brand", path: "/brand", icon: <Tags size={20} /> },
          { name: "Supplier", path: "/supplier", icon: <Truck size={20} /> },
          { name: "Products", path: "/products", icon: <PackageSearch size={20} /> },
          {
            name: "Purchase & Expense",
            icon: <ShoppingCart size={20} />,
            isDropdown: true,
            dropdownKey: "purchase",
            subItems: [
              { name: "Purchase Bills", path: "/purchases", altPaths: ["/purchases", "/purchases/bills", "/purchases/new"] },
              { name: "Payment-Out", path: "/purchases/payment-out" },
              { name: "Expenses", path: "/purchases/expenses", altPaths: ["/purchases/expenses", "/purchases/expenses/add"] },
              { name: "Purchase Return/ Dr. Note", path: "/purchases/return", altPaths: ["/purchases/return", "/purchases/debit-note/add"] },
            ]
          },
          { name: "Reports", path: "/reports", icon: <BarChart3 size={20} /> },
          { name: "Cashiers", path: "/cashier", icon: <Users size={20} /> },
          { name: "Customer", path: "/customer", icon: <User size={20} /> },
          { name: "WhatsApp", path: "/whatsapp", icon: <WhatsAppIcon size={20} /> },
          { name: "Settings", path: "/settings", icon: <Settings size={20} /> },
        ]
      : []),

    // SUPERADMIN ONLY
    ...(role === "superadmin"
      ? [
          { name: "Admin List", path: "/admin", icon: <UserCog size={20} /> },
          { name: "Cashier Requests", path: "/cashier-requests", icon: <ClipboardList size={20} /> },
          { name: "Company Requests", path: "/company-requests", icon: <Building size={20} /> }
        ]
      : []),

    // CASHIER ONLY
    ...(role === "cashier"
      ? [
          { name: "Home", path: "/dashboard", icon: <Home size={20} /> },
          { name: "Billing", path: "/billing", icon: <ReceiptText size={20} /> },
          { name: "Reports", path: "/reports", icon: <BarChart3 size={20} /> },
          { name: "Pending Invoice", path: "/payment-pending", icon: <AlertCircle  size={20} /> },
        ]
      : []),

    // DEVELOPER ONLY
    ...(role === "developer"
      ? [
          { name: "Home", path: "/dashboard", icon: <Home size={20} /> },
          { name: "Reports", path: "/reports", icon: <BarChart3 size={20} /> },
        ]
      : [])
  ];


  return (
    <div className="flex h-screen bg-[#f0f4f9] overflow-hidden">

      {/* SETTINGS SIDEBAR (replaces main sidebar on /settings) */}
      {location.pathname === "/settings" ? (
        <motion.div
          initial={false}
          animate={{ width: 260 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="bg-[#1e293b] text-white flex flex-col transition-all duration-300 relative select-none flex-shrink-0 px-3 py-5 h-screen"
        >
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 bg-slate-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Settings size={20} color="#ffffff" />
            </div>
            <h2 className="text-[15px] font-semibold tracking-wide whitespace-nowrap">Settings</h2>
          </div>

          <div className="flex-1 overflow-y-auto px-0.5 scrollbar-thin scrollbar-thumb-white/20">
            <nav className="space-y-0.5">
              {[
                { id: "general", label: "General" },
                { id: "transaction", label: "Transaction" },
                { id: "print", label: "Print" },
                { id: "taxes", label: "Taxes & GST" },
                { id: "txn-messages", label: "Transaction Messages" },
                { id: "party", label: "Party" },
                { id: "item", label: "Item" },
                { id: "service-reminders", label: "Service Reminders" },
                { id: "accounting", label: "Accounting" },
                { id: "multi-currency", label: "Multi Currency" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSettingsTab(tab.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-[14px] font-medium transition cursor-pointer ${
                    settingsTab === tab.id
                      ? "bg-white text-slate-800"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </motion.div>
      ) : (
      <motion.div
        initial={false}
        animate={{ width: isCollapsed ? 72 : 260 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        className={`bg-[#1e293b] text-white flex flex-col transition-all duration-300 relative select-none flex-shrink-0 h-screen overflow-hidden ${
          isCollapsed ? "px-2 py-5" : "px-3 py-5"
        }`}
      >
        {/* TOP BAR: SEARCH + COLLAPSE TOGGLE */}
        {isCollapsed ? (
          <div className="h-9 mb-5 relative">
            {/* Toggle Arrow Button */}
            <button
              type="button"
              onClick={toggleSidebar}
              title="Expand Sidebar"
              className="w-6 h-6 absolute right-0 top-1/2 -translate-y-1/2 rounded-md bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer"
            >
              <ChevronRight size={14} strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-5">
            {/* Open Anything search-style bar */}
            <div className="flex-1 min-w-0 h-9 flex items-center gap-2 bg-white/10 rounded-lg px-3">
              <Search size={15} className="text-slate-400 flex-shrink-0" />
              <span className="text-[13px] text-slate-300 truncate">Open Anything</span>
              <span className="ml-auto px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-semibold text-slate-400 whitespace-nowrap flex-shrink-0">
                Ctrl+F
              </span>
            </div>

            {/* Toggle Arrow Button */}
            <button
              type="button"
              onClick={toggleSidebar}
              title="Collapse Sidebar"
              className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer flex-shrink-0"
            >
              <ChevronLeft size={14} strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* 🔥 SCROLLABLE MENU */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-0.5 min-w-0 scrollbar-thin scrollbar-thumb-white/20">
          <nav className="space-y-0.5 min-w-0">
            {menuItems.map((item) => {
              if (item.isDropdown) {
                const isDropdownItemActive = item.subItems.some(
                  (sub) =>
                    location.pathname === sub.path ||
                    (sub.altPaths && sub.altPaths.includes(location.pathname))
                );

                const isOpen = item.dropdownKey === "purchase" ? purchaseOpen : saleOpen;
                const toggleDropdown = () => {
                  if (item.dropdownKey === "purchase") {
                    setPurchaseOpen((prev) => !prev);
                  } else {
                    setSaleOpen((prev) => !prev);
                  }
                };

                if (isCollapsed) {
                  return (
                    <motion.div
                      key={item.name}
                      onClick={() => navigate(item.subItems[0]?.path || "/purchases")}
                      whileHover={{ scale: 1.08 }}
                      title={item.name}
                      className={`flex items-center justify-center p-3 rounded-xl cursor-pointer transition ${
                        isDropdownItemActive ? "bg-white text-blue-600 shadow-sm" : "text-white/80 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <div className="flex-shrink-0">{item.icon}</div>
                    </motion.div>
                  );
                }

                return (
                  <div key={item.name} className="flex flex-col">
                    {/* Parent button */}
                    <div
                      onClick={toggleDropdown}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition select-none ${
                        isDropdownItemActive && !isOpen
                          ? "bg-white text-blue-600 font-semibold shadow-sm"
                          : isDropdownItemActive && isOpen
                          ? "bg-white/15 text-white font-semibold"
                          : "text-white/90 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.icon}
                        <span className="font-medium text-[14px] whitespace-nowrap">{item.name}</span>
                      </div>

                      <ChevronDown
                        size={16}
                        className={`transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-white" : "text-white/70"
                        }`}
                      />
                    </div>

                    {/* Submenu List */}
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-1 mb-1 pl-4 pr-1 flex flex-col space-y-0.5"
                        >
                          {item.subItems.map((sub) => {
                            const isSubActive =
                              location.pathname === sub.path ||
                              (sub.altPaths && sub.altPaths.includes(location.pathname));

                            return (
                              <div
                                key={sub.name}
                                onClick={() => navigate(sub.path)}
                                className={`flex items-center py-2 px-3 rounded-lg text-[13.5px] cursor-pointer transition-all duration-100 min-w-0 ${
                                  isSubActive
                                    ? "bg-white text-slate-800 font-medium"
                                    : "text-slate-400 hover:bg-white/10 hover:text-white"
                                }`}
                              >
                                <span className="truncate">{sub.name}</span>
                              </div>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }

              const isActive = location.pathname === item.path;

              if (isCollapsed) {
                return (
                  <motion.div
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    whileHover={{ scale: 1.06 }}
                    title={item.name}
                    className={`flex items-center justify-center p-2.5 rounded-lg cursor-pointer transition mx-1 ${
                      isActive ? "bg-white text-slate-800 shadow" : "text-slate-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <div className="flex-shrink-0">{item.icon}</div>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  whileHover={{ scale: 1.02, x: 5 }}
                  title={item.name}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition min-w-0 ${
                    isActive ? "bg-white text-slate-800 font-medium" : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <div className="flex-shrink-0">{item.icon}</div>
                  <span className="whitespace-nowrap truncate text-[14px]">{item.name}</span>
                </motion.div>
              );
            })}
          </nav>
        </div>

        {/* 🔥 FIXED USER PROFILE */}
        <div className="mt-3 pt-3 border-t border-white/10">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-9 h-9 rounded-full bg-slate-600 text-white flex items-center justify-center font-bold shadow cursor-pointer"
                title={`${user?.name || "User"} (${user?.role || ""})`}
              >
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                className="bg-red-500/70 hover:bg-red-600 p-1.5 rounded-md text-white transition cursor-pointer"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 bg-white/5 p-2.5 rounded-lg min-w-0">
              <div className="w-9 h-9 rounded-full bg-slate-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>

              <div className="flex-1 overflow-hidden">
                <p className="text-[13px] font-semibold truncate">{user?.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                <p className="text-[10px] text-slate-500">{user?.role}</p>
              </div>

              <button
                onClick={handleLogout}
                title="Logout"
                className="bg-red-500/70 hover:bg-red-600 p-1.5 rounded-md text-white transition cursor-pointer flex-shrink-0"
              >
                <LogOut size={15} />
              </button>
            </div>
          )}
        </div>
      </motion.div>
      )}

      {/* RIGHT CONTENT AREA: FIXED TOP BAR + SCROLLABLE PAGE */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* 🔥 TOP FIXED BAR FOR ADMIN (Exact Same Buttons as in Dashboard) */}
        {role === "admin" && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
            padding: "12px 24px 6px 24px",
            background: "#f0f4f9",
            position: "sticky",
            top: 0,
            zIndex: 110,
            flexShrink: 0
          }}>
            {/* Add Sale & Add Purchase Buttons (Visible ONLY on Dashboard) */}
            {location.pathname === "/dashboard" && (
              <>
                {/* Add Sale Button */}
                <button
                  onClick={() => navigate("/sales/add")}
                  style={{
                    height: 38,
                    padding: "0 18px",
                    borderRadius: "9999px",
                    border: "none",
                    background: "#ef4444",
                    color: "#ffffff",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 13.5,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: "0 2px 8px rgba(239, 68, 68, 0.25)",
                    transition: "all .15s ease",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(239, 68, 68, 0.35)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(239, 68, 68, 0.25)";
                  }}
                >
                  <Plus size={16} strokeWidth={2.8} />
                  <span>Add Sale</span>
                </button>

                {/* Add Purchase Button */}
                <button
                  onClick={() => navigate("/purchases/new")}
                  style={{
                    height: 38,
                    padding: "0 18px",
                    borderRadius: "9999px",
                    border: "none",
                    background: "#1f8cff",
                    color: "#ffffff",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 13.5,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: "0 2px 8px rgba(31, 140, 255, 0.25)",
                    transition: "all .15s ease",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(31, 140, 255, 0.35)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(31, 140, 255, 0.25)";
                  }}
                >
                  <Plus size={16} strokeWidth={2.8} />
                  <span>Add Purchase</span>
                </button>
              </>
            )}

            {/* Plus (+) Quick Action Button (Visible on ALL Pages) */}
            <div ref={quickAddRef} style={{ position: "relative" }}>
              <button
                onClick={() => setQuickAddOpen(v => !v)}
                title="Quick Actions"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "9999px",
                  border: "1.5px solid #dbeafe",
                  background: quickAddOpen ? "#dbeafe" : "#eff6ff",
                  color: "#1f8cff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all .15s ease",
                }}
                onMouseEnter={e => {
                  if (!quickAddOpen) {
                    e.currentTarget.style.background = "#dbeafe";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={e => {
                  if (!quickAddOpen) {
                    e.currentTarget.style.background = "#eff6ff";
                    e.currentTarget.style.transform = "none";
                  }
                }}
              >
                <Plus size={18} strokeWidth={2.6} />
              </button>

              {/* Quick Action Popover Dropdown (Matching media_1787899244680.png) */}
              {quickAddOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: -10,
                    top: 48,
                    width: 660,
                    background: "#ffffff",
                    borderRadius: 14,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 20px 45px -10px rgba(15, 23, 42, 0.22), 0 4px 16px rgba(15, 23, 42, 0.08)",
                    overflow: "hidden",
                    zIndex: 99999,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  {/* Top Upward Pointer Arrow */}
                  <div
                    style={{
                      position: "absolute",
                      right: 22,
                      top: -6,
                      width: 12,
                      height: 12,
                      background: "#ffffff",
                      transform: "rotate(45deg)",
                      borderLeft: "1px solid #cbd5e1",
                      borderTop: "1px solid #cbd5e1",
                      zIndex: 10,
                    }}
                  />

                  {/* 3 Columns Section */}
                  <div style={{ padding: "20px 24px 18px", display: "grid", gridTemplateColumns: "1.1fr 1.1fr 1fr", gap: 24 }}>
                    {/* ── COLUMN 1: SALE ── */}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 900, color: "#1e293b", letterSpacing: ".04em", marginBottom: 14, textTransform: "uppercase" }}>
                        SALE
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {[
                          { name: "Sale Invoice", shortcut: "ALT + S", path: "/sales/add", sub: "" },
                          { name: "Payment-In", shortcut: "ALT + I", path: "/sales/payment-in", sub: "" },
                          { name: "Sale Return", shortcut: "ALT + R", path: "/sales/credit-note/add", sub: "Cr Note" },
                        ].map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setQuickAddOpen(false);
                              navigate(item.path);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              padding: "6px 8px",
                              borderRadius: 7,
                              cursor: "pointer",
                              transition: "all .15s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#eff6ff";
                              const title = e.currentTarget.querySelector(".menu-title");
                              if (title) title.style.color = "#1f8cff";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                              const title = e.currentTarget.querySelector(".menu-title");
                              if (title) title.style.color = "#334155";
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 7, minWidth: 0 }}>
                              <Play size={8} style={{ fill: "#1f8cff", color: "#1f8cff", marginTop: 5, flexShrink: 0 }} />
                              <div>
                                <div className="menu-title" style={{ fontSize: 13, fontWeight: 600, color: "#334155", transition: "color .15s" }}>
                                  {item.name}
                                </div>
                                {item.sub && (
                                  <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500, marginTop: -1 }}>
                                    {item.sub}
                                  </div>
                                )}
                              </div>
                            </div>
                            <span style={{ fontSize: 11, fontFamily: "monospace", color: "#94a3b8", fontWeight: 600, marginLeft: 8, whiteSpace: "nowrap", paddingTop: 2 }}>
                              {item.shortcut}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── COLUMN 2: PURCHASE ── */}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 900, color: "#1e293b", letterSpacing: ".04em", marginBottom: 14, textTransform: "uppercase" }}>
                        PURCHASE
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {[
                          { name: "Purchase Bill", shortcut: "ALT + P", path: "/purchases", sub: "" },
                          { name: "Payment-Out", shortcut: "ALT + O", path: "/purchases", sub: "" },
                          { name: "Purchase Return", shortcut: "ALT + L", path: "/purchases", sub: "Dr Note" },
                          { name: "Purchase Order", shortcut: "ALT + G", path: "/purchases", sub: "" },
                        ].map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setQuickAddOpen(false);
                              navigate(item.path);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              padding: "6px 8px",
                              borderRadius: 7,
                              cursor: "pointer",
                              transition: "all .15s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#eff6ff";
                              const title = e.currentTarget.querySelector(".menu-title");
                              if (title) title.style.color = "#1f8cff";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                              const title = e.currentTarget.querySelector(".menu-title");
                              if (title) title.style.color = "#334155";
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 7, minWidth: 0 }}>
                              <Play size={8} style={{ fill: "#1f8cff", color: "#1f8cff", marginTop: 5, flexShrink: 0 }} />
                              <div>
                                <div className="menu-title" style={{ fontSize: 13, fontWeight: 600, color: "#334155", transition: "color .15s" }}>
                                  {item.name}
                                </div>
                                {item.sub && (
                                  <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500, marginTop: -1 }}>
                                    {item.sub}
                                  </div>
                                )}
                              </div>
                            </div>
                            <span style={{ fontSize: 11, fontFamily: "monospace", color: "#94a3b8", fontWeight: 600, marginLeft: 8, whiteSpace: "nowrap", paddingTop: 2 }}>
                              {item.shortcut}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── COLUMN 3: OTHERS ── */}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 900, color: "#1e293b", letterSpacing: ".04em", marginBottom: 14, textTransform: "uppercase" }}>
                        OTHERS
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {[
                          { name: "Expenses", shortcut: "ALT + E", path: "/reports", sub: "" },
                          { name: "Party To Party Transfer", shortcut: "ALT + J", path: "/customer", sub: "" },
                        ].map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setQuickAddOpen(false);
                              navigate(item.path);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              padding: "6px 8px",
                              borderRadius: 7,
                              cursor: "pointer",
                              transition: "all .15s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#eff6ff";
                              const title = e.currentTarget.querySelector(".menu-title");
                              if (title) title.style.color = "#1f8cff";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                              const title = e.currentTarget.querySelector(".menu-title");
                              if (title) title.style.color = "#334155";
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 7, minWidth: 0 }}>
                              <Play size={8} style={{ fill: "#1f8cff", color: "#1f8cff", marginTop: 5, flexShrink: 0 }} />
                              <div>
                                <div className="menu-title" style={{ fontSize: 13, fontWeight: 600, color: "#334155", transition: "color .15s" }}>
                                  {item.name}
                                </div>
                                {item.sub && (
                                  <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500, marginTop: -1 }}>
                                    {item.sub}
                                  </div>
                                )}
                              </div>
                            </div>
                            <span style={{ fontSize: 11, fontFamily: "monospace", color: "#94a3b8", fontWeight: 600, marginLeft: 8, whiteSpace: "nowrap", paddingTop: 2 }}>
                              {item.shortcut}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ── BOTTOM LIGHT GREY BANNER (Matching theme) ── */}
                  <div
                    style={{
                      background: "#f8fafc",
                      borderTop: "1px solid #e2e8f0",
                      padding: "9px 24px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#475569",
                    }}
                  >
                    <span>Shortcut to open this menu :</span>
                    <span
                      style={{
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        borderRadius: 5,
                        padding: "2px 8px",
                        fontSize: 11,
                        fontWeight: 800,
                        color: "#0f172a",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                      }}
                    >
                      Ctrl
                    </span>
                    <span style={{ color: "#94a3b8", fontWeight: 700 }}>+</span>
                    <span
                      style={{
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        borderRadius: 5,
                        padding: "2px 8px",
                        fontSize: 11,
                        fontWeight: 800,
                        color: "#0f172a",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                      }}
                    >
                      Enter
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MAIN CONTENT */}
        <main className="flex-1 p-4 overflow-auto">
          <Outlet context={{ settingsTab, setSettingsTab }} />
        </main>
      </div>

    </div>
  );
}