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
  Users,
  UserCog,
  ClipboardList,
  Building,
  HelpCircle,
  MessageCircle,
  MessageSquareText,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  ShoppingBag,
  PackagePlus,
  UserPlus,
  FolderPlus,
  Play,
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

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredPath, setHoveredPath] = useState(null);
  const [saleOpen, setSaleOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState("general");
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
              { name: "Sale Order", path: "/sales/order" },
              { name: "Sale Return/ Credit Note", path: "/sales/credit-note" },
            ]
          },
          { name: "Company", path: "/company", icon: <Building2 size={20} /> },
          { name: "Category & Subcategory", path: "/category", icon: <Package size={20} /> },
          { name: "Brand", path: "/brand", icon: <Tags size={20} /> },
          { name: "supplier", path: "/supplier", icon: <Truck size={20} /> },
          { name: "Products", path: "/products", icon: <PackageSearch size={20} /> },
          { name: "Purchases", path: "/purchases", icon: <ClipboardList size={20} /> },
          { name: "Reports", path: "/reports", icon: <BarChart3 size={20} /> },
          { name: "Cashiers", path: "/cashier", icon: <Users size={20} /> },
          { name: "Customer", path: "/customer", icon: <User size={20} /> },
          { name: "WhatsApp", path: "/whatsapp", icon: <MessageSquareText size={20} /> },
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
          animate={{ width: 288 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="m-4 rounded-3xl bg-gradient-to-br from-[#1f8cff] to-[#4338ca] text-white shadow-2xl flex flex-col transition-all duration-300 relative select-none flex-shrink-0 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-xs flex-shrink-0">
              <Settings size={22} color="#1f8cff" />
            </div>
            <h2 className="text-xl font-bold tracking-tight whitespace-nowrap">Settings</h2>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/30">
            <nav className="space-y-1.5">
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
                  className={`w-full text-left px-4 py-3 rounded-xl text-[15px] font-semibold transition cursor-pointer ${
                    settingsTab === tab.id
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-white/90 hover:bg-white/10 hover:text-white"
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
        animate={{ width: isCollapsed ? 82 : 288 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        className={`m-4 rounded-3xl bg-gradient-to-br from-[#1f8cff] to-[#4338ca] text-white shadow-2xl flex flex-col transition-all duration-300 relative select-none flex-shrink-0 ${
          isCollapsed ? "p-3 py-6" : "p-6"
        }`}
      >
        {/* LOGO & ARROW TOGGLE */}
        <div className={`flex items-center mb-6 relative ${isCollapsed ? "flex-col gap-3 justify-center" : "justify-between"}`}>
          <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-xs flex-shrink-0">
              <ShieldCheck size={22} color="#1f8cff" />
            </div>
            {!isCollapsed && (
              <h2 className="text-xl font-bold tracking-tight whitespace-nowrap">
                Billing
              </h2>
            )}
          </div>

          {/* Toggle Arrow Button (Revealed on hover at the top of the sidebar) */}
          <button
            type="button"
            onClick={toggleSidebar}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            className={`w-7 h-7 rounded-lg bg-white/20 hover:bg-white text-white hover:text-blue-600 flex items-center justify-center transition-all duration-200 cursor-pointer shadow-xs ${
              isCollapsed
                ? "opacity-90 hover:opacity-100"
                : sidebarHovered
                ? "opacity-100 scale-100"
                : "opacity-0 scale-90 pointer-events-none"
            }`}
          >
            {isCollapsed ? (
              <ChevronRight size={16} strokeWidth={2.5} />
            ) : (
              <ChevronLeft size={16} strokeWidth={2.5} />
            )}
          </button>
        </div>

        {/* 🔥 SCROLLABLE MENU */}
        <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/30">
          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              if (item.isDropdown) {
                const isSaleActive = item.subItems.some(
                  (sub) =>
                    location.pathname === sub.path ||
                    (sub.altPaths && sub.altPaths.includes(location.pathname))
                );

                if (isCollapsed) {
                  return (
                    <motion.div
                      key={item.name}
                      onClick={() => navigate(item.subItems[0]?.path || "/sales/invoices")}
                      whileHover={{ scale: 1.08 }}
                      title="Sale"
                      className={`flex items-center justify-center p-3 rounded-xl cursor-pointer transition ${
                        isSaleActive ? "bg-white text-blue-600 shadow-sm" : "text-white/80 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <div className="flex-shrink-0">{item.icon}</div>
                    </motion.div>
                  );
                }

                return (
                  <div key={item.name} className="flex flex-col">
                    {/* Parent Sale button */}
                    <div
                      onClick={() => setSaleOpen((prev) => !prev)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition select-none ${
                        isSaleActive && !saleOpen
                          ? "bg-white text-blue-600 font-semibold shadow-sm"
                          : isSaleActive && saleOpen
                          ? "bg-white/15 text-white font-semibold"
                          : "text-white/90 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {item.icon}
                        <span className="font-semibold text-[15px] whitespace-nowrap">{item.name}</span>
                      </div>

                      <ChevronDown
                        size={17}
                        className={`transition-transform duration-200 ${
                          saleOpen ? "rotate-180 text-white" : "text-white/70"
                        }`}
                      />
                    </div>

                    {/* Submenu List */}
                    <AnimatePresence>
                      {saleOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-1.5 mb-1 pl-3 pr-1 flex flex-col space-y-1"
                        >
                          {item.subItems.map((sub) => {
                            const isSubActive =
                              location.pathname === sub.path ||
                              (sub.altPaths && sub.altPaths.includes(location.pathname));

                            return (
                              <div
                                key={sub.name}
                                onClick={() => navigate(sub.path)}
                                className={`flex items-center py-2.5 px-4 rounded-xl text-[13.5px] cursor-pointer transition-all duration-150 ${
                                  isSubActive
                                    ? "bg-white text-blue-600 font-bold shadow-md"
                                    : "text-white/85 hover:bg-white/15 hover:text-white"
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
                    whileHover={{ scale: 1.08 }}
                    title={item.name}
                    className={`flex items-center justify-center p-3 rounded-xl cursor-pointer transition ${
                      isActive ? "bg-white text-blue-600 shadow-sm" : "text-white/80 hover:bg-white/10 hover:text-white"
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
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition ${
                    isActive ? "bg-white text-blue-600 font-semibold shadow-sm" : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <div className="flex-shrink-0">{item.icon}</div>
                  <span className="whitespace-nowrap truncate">{item.name}</span>
                </motion.div>
              );
            })}
          </nav>
        </div>

        {/* 🔥 FIXED USER PROFILE */}
        <div className="mt-4 pt-4 border-t border-white/20">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-full bg-white text-blue-600 flex items-center justify-center font-bold shadow-xs cursor-pointer"
                title={`${user?.name || "User"} (${user?.role || ""})`}
              >
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                className="bg-red-500/80 hover:bg-red-600 p-2 rounded-lg text-white transition cursor-pointer"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-white text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>

              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold truncate">{user?.name}</p>
                <p className="text-xs text-white/70 truncate">{user?.email}</p>
                <p className="text-[10px] text-white/40">{user?.role}</p>
              </div>

              <button
                onClick={handleLogout}
                title="Logout"
                className="bg-red-500 hover:bg-red-600 p-2 rounded-lg text-white transition cursor-pointer flex-shrink-0"
              >
                <LogOut size={16} />
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
                          { name: "Sale Order", shortcut: "ALT + F", path: "/sales/order", sub: "" },
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