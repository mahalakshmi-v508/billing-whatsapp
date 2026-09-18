import { useState, useEffect, useRef, useMemo } from "react";
import api from "../services/api";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import SettingsContext from "../pages/settings/SettingsContext";
import { fetchSettings } from "../pages/settings/settingsApi";
import { SALES_TRANSACTION_MENU_ITEMS } from "../config/salesTransactionMap";
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
  AlertCircle,
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
  Headset,
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
  X,
  Sparkles,
  Command,
  Bell,
  Store,
  IndianRupee,
  RotateCcw,
  FileText,
  FileMinus,
  Wallet,
} from "lucide-react";
import HeaderQuickMenu from "../components/layout/HeaderQuickMenu";

function getHeaderBreadcrumbs(pathname) {
  if (pathname === "/dashboard") {
    return { section: "Executive", title: "Overview Dashboard", icon: Home };
  }
  if (pathname.startsWith("/sales/invoices")) {
    return { section: "Sales & Invoicing", title: "Sale Invoices", icon: ReceiptText };
  }
  if (pathname.startsWith("/sales/add")) {
    return { section: "Sales & Invoicing", title: "New Sale Invoice", icon: Plus };
  }
  if (pathname.startsWith("/sales/estimate-quotation")) {
    return { section: "Sales & Invoicing", title: "Estimate & Quotation", icon: FileText };
  }
  if (pathname.startsWith("/sales/payment-in")) {
    return { section: "Sales & Invoicing", title: "Payment-In Collections", icon: IndianRupee };
  }
  if (pathname.startsWith("/sales/credit-note")) {
    return { section: "Sales & Invoicing", title: "Sale Return / Cr Note", icon: RotateCcw };
  }
  if (pathname.startsWith("/purchases/expenses")) {
    return { section: "Purchases & Expenses", title: "Expense Management", icon: Wallet };
  }
  if (pathname.startsWith("/purchases/payment-out")) {
    return { section: "Purchases & Expenses", title: "Payment-Out Disbursements", icon: IndianRupee };
  }
  if (pathname.startsWith("/purchases/return")) {
    return { section: "Purchases & Expenses", title: "Debit Note / Dr Note", icon: FileMinus };
  }
  if (pathname.startsWith("/purchases")) {
    return { section: "Purchases & Expenses", title: "Purchase Bills", icon: ShoppingCart };
  }
  if (pathname.startsWith("/customer")) {
    return { section: "Parties & CRM", title: "Customer Directory", icon: User };
  }
  if (pathname.startsWith("/whatsapp")) {
    return { section: "Marketing", title: "WhatsApp Connect", icon: MessageCircle };
  }
  if (pathname.startsWith("/products")) {
    return { section: "Inventory", title: "Products & Stock Catalog", icon: PackageSearch };
  }
  if (pathname.startsWith("/e-way")) {
    return { section: "Compliance", title: "E-Way Bills Portal", icon: Truck };
  }
  if (pathname.startsWith("/reports")) {
    return { section: "Compliance & Audit", title: "Financial Reports Hub", icon: BarChart3 };
  }
  if (pathname.startsWith("/company")) {
    return { section: "Administration", title: "Company Settings", icon: Building2 };
  }
  if (pathname.startsWith("/cashier")) {
    return { section: "Administration", title: "Cashier Accounts", icon: UserCog };
  }
  if (pathname.startsWith("/helpdesk")) {
    return { section: "Support Desk", title: "Helpdesk & Tickets", icon: Headset };
  }
  if (pathname.startsWith("/billing")) {
    return { section: "POS Terminal", title: "POS Counter Billing", icon: Store };
  }
  return { section: "Workspace", title: "Smart Ledger", icon: Home };
}

// 🎟️ Sale Ticket Icon
const SaleIcon = ({ size = 18 }) => (
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
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
    <path d="M15 9l-6 6" />
    <path d="M9 9h.01" />
    <path d="M15 15h.01" />
  </svg>
);

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [saleOpen, setSaleOpen] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState("general");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const quickAddRef = useRef(null);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const searchInputRef = useRef(null);
  const [generalSettings, setGeneralSettings] = useState({});

  // Fetch general settings
  useEffect(() => {
    let mounted = true;
    fetchSettings().then((settings) => {
      if (!mounted) return;
      setGeneralSettings((settings && settings.general) || {});
    });
    const handleUpdate = (e) => {
      if (!mounted) return;
      const general = (e.detail && e.detail.general) || {};
      setGeneralSettings(general);
    };
    window.addEventListener("company-settings-updated", handleUpdate);
    return () => {
      mounted = false;
      window.removeEventListener("company-settings-updated", handleUpdate);
    };
  }, []);

  // Collapsible Sidebar state
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("sidebar_collapsed") === "true";
  });

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
      if (e.ctrlKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setIsCollapsed(false);
        setTimeout(() => {
          if (searchInputRef.current) searchInputRef.current.focus();
        }, 60);
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
        } else if (key === "q") {
          e.preventDefault();
          setQuickAddOpen(false);
          navigate("/sales/estimate-quotation");
        } else if (key === "p") {
          e.preventDefault();
          setQuickAddOpen(false);
          navigate("/purchases/new");
        } else if (key === "e") {
          e.preventDefault();
          setQuickAddOpen(false);
          navigate("/purchases/expenses/add");
        } else if (key === "o") {
          e.preventDefault();
          setQuickAddOpen(false);
          navigate("/purchases/payment-out");
        } else if (key === "l") {
          e.preventDefault();
          setQuickAddOpen(false);
          navigate("/purchases/debit-note/add");
        } else if (key === "c") {
          e.preventDefault();
          setQuickAddOpen(false);
          navigate("/customer");
        } else if (key === "d") {
          e.preventDefault();
          setQuickAddOpen(false);
          navigate("/products");
        } else if (key === "b") {
          e.preventDefault();
          setQuickAddOpen(false);
          navigate("/billing");
        } else if (key === "w") {
          e.preventDefault();
          setQuickAddOpen(false);
          navigate("/e-way");
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

  useEffect(() => {
    if (!user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  // Auto-expand dropdowns if current route is inside
  useEffect(() => {
    if (location.pathname.startsWith("/sales")) {
      setSaleOpen(true);
    }
    if (location.pathname.startsWith("/purchases")) {
      setPurchaseOpen(true);
    }
    if (location.pathname.startsWith("/company") || location.pathname.startsWith("/cashier")) {
      setAccountsOpen(true);
    }
    if (location.pathname.startsWith("/customer") || location.pathname.startsWith("/whatsapp")) {
      setCustomerOpen(true);
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

  const saleSubItemsFromSettings = SALES_TRANSACTION_MENU_ITEMS.filter(
    (item) => generalSettings[item.settingsKey] !== false && item.settingsKey !== "quotation"
  ).map((item) => ({ name: item.label, path: item.path }));

  const menuItems = [
    // ADMIN ONLY
    ...(role === "admin"
      ? [
          { name: "Dashboard", path: "/dashboard", icon: <Home size={18} /> },
          {
            name: "Customer & CRM",
            icon: <User size={18} />,
            isDropdown: true,
            dropdownKey: "customer",
            subItems: [
              { name: "Customer Directory", path: "/customer", altPaths: ["/customer", "/customer/add", "/customer/edit"] },
              { name: "WhatsApp Connect", path: "/whatsapp", altPaths: ["/whatsapp"] },
            ],
          },
          {
            name: "Sales & Invoicing",
            icon: <SaleIcon size={18} />,
            isDropdown: true,
            dropdownKey: "sale",
            subItems: [
              { name: "Sale Invoices", path: "/sales/invoices", altPaths: ["/sales/invoices", "/sales/add", "/sales/edit"] },
              { name: "Estimate / Quotation", path: "/sales/estimate-quotation", altPaths: ["/sales/estimate-quotation"] },
              { name: "Payment-In", path: "/sales/payment-in", altPaths: ["/payment-pending", "/sales/payment-in"] },
              { name: "Sale Return / Cr. Note", path: "/sales/credit-note", altPaths: ["/sales/credit-note", "/sales/credit-note/add", "/sales/credit-note/edit"] },
              ...saleSubItemsFromSettings,
            ],
          },
          {
            name: "Purchase & Expenses",
            icon: <ShoppingCart size={18} />,
            isDropdown: true,
            dropdownKey: "purchase",
            subItems: [
              { name: "Purchase Bills", path: "/purchases", altPaths: ["/purchases", "/purchases/bills", "/purchases/new"] },
              { name: "Payment-Out", path: "/purchases/payment-out" },
              { name: "Expense Vouchers", path: "/purchases/expenses", altPaths: ["/purchases/expenses", "/purchases/expenses/add"] },
              { name: "Purchase Return / Dr. Note", path: "/purchases/return", altPaths: ["/purchases/return", "/purchases/debit-note/add"] },
            ],
          },
          { name: "Inventory Products", path: "/products", icon: <PackageSearch size={18} /> },
          { name: "E-Way Bills", path: "/e-way", icon: <Truck size={18} /> },
          {
            name: "Companies & Staff",
            icon: <Building2 size={18} />,
            isDropdown: true,
            dropdownKey: "accounts",
            subItems: [
              { name: "Company Settings", path: "/company", altPaths: ["/company", "/company/add", "/company/edit"] },
              { name: "Cashier Accounts", path: "/cashier", altPaths: ["/cashier", "/cashier/add", "/cashier/edit"] },
            ],
          },
          { name: "Analytics & Reports", path: "/reports", icon: <BarChart3 size={18} /> },
          { name: "Settings", path: "/settings", icon: <Settings size={18} /> },
        ]
      : []),

    // SUPERADMIN ONLY
    ...(role === "superadmin"
      ? [
          { name: "Admin List", path: "/admin", icon: <UserCog size={18} /> },
          { name: "Cashier Requests", path: "/cashier-requests", icon: <ClipboardList size={18} /> },
          { name: "Company Requests", path: "/company-requests", icon: <Building size={18} /> },
        ]
      : []),

    // CASHIER ONLY
    ...(role === "cashier"
      ? [
          { name: "Dashboard", path: "/dashboard", icon: <Home size={18} /> },
          { name: "Point of Sale (POS)", path: "/billing", icon: <ReceiptText size={18} /> },
          { name: "Reports", path: "/reports", icon: <BarChart3 size={18} /> },
          { name: "Pending Invoices", path: "/payment-pending", icon: <AlertCircle size={18} /> },
        ]
      : []),

    // DEVELOPER ONLY
    ...(role === "developer"
      ? [
          { name: "Dashboard", path: "/dashboard", icon: <Home size={18} /> },
          { name: "Reports", path: "/reports", icon: <BarChart3 size={18} /> },
        ]
      : []),

    // SUPPORT / HELPDESK (LAST ITEM COMMON FOR ALL ROLES)
    { name: "Support", path: "/helpdesk", icon: <Headset size={18} /> },
  ];

  // Live sidebar search filtering
  const filteredMenuItems = useMemo(() => {
    if (!sidebarSearch.trim()) return menuItems;
    const q = sidebarSearch.toLowerCase();
    return menuItems.reduce((acc, item) => {
      if (item.isDropdown) {
        const parentMatches = item.name.toLowerCase().includes(q);
        const matchingSubItems = (item.subItems || []).filter((sub) =>
          sub.name.toLowerCase().includes(q)
        );
        if (parentMatches || matchingSubItems.length > 0) {
          acc.push({
            ...item,
            subItems: parentMatches ? item.subItems : matchingSubItems,
            forceOpen: true,
          });
        }
      } else {
        if (item.name.toLowerCase().includes(q)) {
          acc.push(item);
        }
      }
      return acc;
    }, []);
  }, [menuItems, sidebarSearch]);

  return (
    <div className="flex h-screen bg-[#f8faff] overflow-hidden font-sans">
      {/* ── SETTINGS SIDEBAR (when path is /settings) ── */}
      {location.pathname === "/settings" ? (
        <motion.div
          initial={false}
          animate={{ width: 270 }}
          transition={{ duration: 0.22, ease: "easeInOut" }}
          className="bg-[#0b0f19] text-white flex flex-col flex-shrink-0 px-4 py-5 h-screen border-r border-white/5 relative select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center shadow-glow-brand">
                <Settings size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-tight text-white font-display">System Settings</h2>
                <p className="text-[11px] text-slate-400">Configurations & Rules</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              title="Close Settings"
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex-1 overflow-y-auto paysplitx-scrollbar space-y-1 pr-1">
            {[
              { id: "general", label: "General Settings" },
              { id: "invoice-numbering", label: "Invoice Numbering" },
              { id: "invoice-design", label: "Invoice Design & Print" },
              { id: "transaction", label: "Transaction Rules" },
              { id: "taxes", label: "Taxes & GST Rates" },
              { id: "eway-bill", label: "E-Way Bill Integration", icon: <Truck size={15} /> },
              { id: "txn-messages", label: "WhatsApp & SMS Alerts" },
              { id: "party", label: "Party & Ledger" },
              { id: "item", label: "Items & Inventory" },
              { id: "accounting", label: "Accounting Rules" },
              { id: "multi-currency", label: "Multi Currency" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSettingsTab(tab.id)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition cursor-pointer flex items-center gap-2.5 ${
                  settingsTab === tab.id
                    ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-sm font-semibold"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                {tab.icon && <span className="opacity-80">{tab.icon}</span>}
                <span className="truncate">{tab.label}</span>
              </button>
            ))}
          </div>
        </motion.div>
      ) : (
        /* ── MAIN PAYSPLITX SIDEBAR ── */
        <motion.div
          initial={false}
          animate={{ width: isCollapsed ? 76 : 270 }}
          transition={{ duration: 0.22, ease: "easeInOut" }}
          className={`bg-[#0b0f19] text-white flex flex-col flex-shrink-0 h-screen border-r border-white/5 relative select-none ${
            isCollapsed ? "px-2.5 py-5" : "px-4 py-5"
          }`}
        >
          {/* BRAND LOGO AREA */}
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/5">
            {!isCollapsed ? (
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-glow-brand flex-shrink-0">
                  <Sparkles size={18} className="text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-white text-[15px] tracking-tight truncate">
                      Smart Ledger
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                      v2.0
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 truncate block">
                    Enterprise Billing
                  </span>
                </div>
              </div>
            ) : (
              <div className="mx-auto">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-glow-brand">
                  <Sparkles size={18} className="text-white" />
                </div>
              </div>
            )}

            {!isCollapsed && (
              <button
                type="button"
                onClick={toggleSidebar}
                title="Collapse Sidebar"
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer flex-shrink-0"
              >
                <ChevronLeft size={14} strokeWidth={2.5} />
              </button>
            )}
          </div>

          {/* QUICK SEARCH BUTTON IN SIDEBAR */}
          {isCollapsed ? (
            <div className="mb-4 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  toggleSidebar();
                  setTimeout(() => {
                    if (searchInputRef.current) searchInputRef.current.focus();
                  }, 100);
                }}
                title="Quick Search Menus (Ctrl+F)"
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <Search size={16} />
              </button>
            </div>
          ) : (
            <div className="mb-4">
              <div className="relative w-full">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  placeholder="Quick Search Menus..."
                  className="w-full h-9 bg-white/5 border border-white/10 hover:border-white/20 focus:border-indigo-500 focus:bg-white/10 rounded-xl pl-8 pr-12 text-xs text-white placeholder-slate-400 focus:outline-none transition shadow-inner"
                />
                {sidebarSearch ? (
                  <button
                    type="button"
                    onClick={() => setSidebarSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center text-[10px] font-bold cursor-pointer"
                    title="Clear Search"
                  >
                    ✕
                  </button>
                ) : (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold bg-white/10 text-slate-400 px-1.5 py-0.5 rounded pointer-events-none">
                    Ctrl+F
                  </span>
                )}
              </div>
            </div>
          )}

          {/* NAVIGATION LIST */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden paysplitx-scrollbar space-y-1 pr-1">
            {!isCollapsed && (
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 flex items-center justify-between">
                <span>{sidebarSearch ? "SEARCH RESULTS" : "MAIN MENU"}</span>
                {sidebarSearch && (
                  <span className="text-[10px] text-indigo-400 font-medium lowercase">
                    {filteredMenuItems.length} found
                  </span>
                )}
              </div>
            )}

            {filteredMenuItems.map((item) => {
              if (item.isDropdown) {
                const isDropdownItemActive = item.subItems.some(
                  (sub) =>
                    location.pathname === sub.path ||
                    (sub.altPaths && sub.altPaths.some((p) => location.pathname.startsWith(p)))
                );

                const isOpen =
                  item.forceOpen ||
                  (item.dropdownKey === "purchase"
                    ? purchaseOpen
                    : item.dropdownKey === "accounts"
                    ? accountsOpen
                    : item.dropdownKey === "customer"
                    ? customerOpen
                    : saleOpen);

                const toggleDropdown = () => {
                  if (item.dropdownKey === "purchase") setPurchaseOpen((prev) => !prev);
                  else if (item.dropdownKey === "accounts") setAccountsOpen((prev) => !prev);
                  else if (item.dropdownKey === "customer") setCustomerOpen((prev) => !prev);
                  else setSaleOpen((prev) => !prev);
                };

                if (isCollapsed) {
                  return (
                    <div
                      key={item.name}
                      onClick={() => navigate(item.subItems[0]?.path || "/dashboard")}
                      title={item.name}
                      className={`flex items-center justify-center w-10 h-10 mx-auto rounded-xl cursor-pointer transition mb-1 ${
                        isDropdownItemActive
                          ? "bg-indigo-600 text-white shadow-glow-brand"
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {item.icon}
                    </div>
                  );
                }

                return (
                  <div key={item.name} className="flex flex-col mb-1">
                    <button
                      type="button"
                      onClick={toggleDropdown}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition cursor-pointer select-none ${
                        isDropdownItemActive
                          ? "text-white bg-white/5 font-semibold"
                          : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={isDropdownItemActive ? "text-indigo-400" : "text-slate-400"}>
                          {item.icon}
                        </span>
                        <span className="truncate">{item.name}</span>
                      </div>
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 text-slate-400 ${
                          isOpen ? "rotate-180 text-white" : ""
                        }`}
                      />
                    </button>

                    {/* Submenu with left connector */}
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-1 ml-5 pl-3 border-l border-white/10 space-y-0.5"
                        >
                          {item.subItems.map((sub) => {
                            const isSubActive =
                              location.pathname === sub.path ||
                              (sub.altPaths && sub.altPaths.includes(location.pathname));

                            return (
                              <button
                                key={sub.name}
                                type="button"
                                onClick={() => navigate(sub.path)}
                                className={`w-full text-left py-2 px-3 rounded-lg text-xs font-medium cursor-pointer transition flex items-center gap-2 ${
                                  isSubActive
                                    ? "bg-indigo-600 text-white font-semibold shadow-sm"
                                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                                }`}
                              >
                                {isSubActive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                                <span className="truncate">{sub.name}</span>
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }

              const isActive =
                location.pathname === item.path ||
                (item.path !== "/" && location.pathname.startsWith(item.path + "/"));

              if (isCollapsed) {
                return (
                  <div
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    title={item.name}
                    className={`flex items-center justify-center w-10 h-10 mx-auto rounded-xl cursor-pointer transition mb-1 ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-glow-brand"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {item.icon}
                  </div>
                );
              }

              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] cursor-pointer transition select-none ${
                    isActive
                      ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-semibold shadow-glow-brand"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium"
                  }`}
                >
                  <span className={isActive ? "text-white" : "text-slate-400"}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.name}</span>
                </button>
              );
            })}

            {filteredMenuItems.length === 0 && (
              <div className="py-8 px-2 text-center text-slate-400">
                <Search size={20} className="mx-auto text-slate-500 mb-2" />
                <p className="text-xs font-semibold text-slate-300">No menus match "{sidebarSearch}"</p>
                <button
                  type="button"
                  onClick={() => setSidebarSearch("")}
                  className="mt-2 text-[11px] text-indigo-400 hover:text-indigo-300 font-bold underline cursor-pointer"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>

          {/* USER PROFILE CARD */}
          <div className="mt-3 pt-3 border-t border-white/5">
            {isCollapsed ? (
              <div className="flex flex-col items-center gap-2">
                <div
                  className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 text-white flex items-center justify-center font-bold text-sm border border-white/10"
                  title={`${user?.name || "User"} (${user?.role || ""})`}
                >
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="w-8 h-8 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center transition cursor-pointer"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                    <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {user?.role?.toUpperCase()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="w-8 h-8 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center transition cursor-pointer flex-shrink-0"
                >
                  <LogOut size={15} />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── RIGHT CONTENT AREA ── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#f8faff]">
        {/* PAYSPLITX ADVANCED TOP HEADER BAR */}
        <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between z-30 flex-shrink-0 shadow-2xs">
          {/* Left: Dynamic Breadcrumbs Navigation */}
          <div className="flex items-center gap-2.5 min-w-0">
            {(() => {
              const crumb = getHeaderBreadcrumbs(location.pathname);
              const CrumbIcon = crumb.icon;
              return (
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100/80 text-indigo-600 flex items-center justify-center flex-shrink-0 shadow-2xs">
                    <CrumbIcon size={16} />
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-semibold text-slate-400 hidden sm:inline truncate">
                      {crumb.section}
                    </span>
                    <ChevronRight size={13} className="text-slate-300 flex-shrink-0 hidden sm:inline" />
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900 font-display tracking-tight truncate">
                      {crumb.title}
                    </h2>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Right: Quick Actions Command Menu & POS Launcher */}
          <div className="flex items-center gap-3">
            <HeaderQuickMenu
              isOpen={quickAddOpen}
              setIsOpen={setQuickAddOpen}
              navigate={navigate}
              role={role}
              containerRef={quickAddRef}
            />
          </div>
        </header>

        {/* MAIN SCROLLABLE CONTENT */}
        <main className="flex-1 p-6 overflow-auto paysplitx-scrollbar-light">
          <SettingsContext.Provider value={{ settingsTab, setSettingsTab }}>
            <Outlet context={{ settingsTab, setSettingsTab }} />
          </SettingsContext.Provider>
        </main>
      </div>
    </div>
  );
}