import { useState, useEffect } from "react";
import api from "../services/api";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
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
} from "lucide-react";

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredPath, setHoveredPath] = useState(null);

  // 🔥 GET USER
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.role;

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
          { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={20} /> },
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
          { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={20} /> },
          { name: "Billing", path: "/billing", icon: <ReceiptText size={20} /> },
          { name: "Reports", path: "/reports", icon: <BarChart3 size={20} /> },
          { name: "Pending Invoice", path: "/payment-pending", icon: <AlertCircle  size={20} /> },
        ]
      : []),

    // DEVELOPER ONLY
    ...(role === "developer"
      ? [
          { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={20} /> },
          { name: "Reports", path: "/reports", icon: <BarChart3 size={20} /> },
        ]
      : [])
  ];


  return (
    <div className="flex h-screen bg-[#f0f4f9] overflow-hidden">

      {/* SIDEBAR */}
    <motion.div
  initial={{ x: -100, opacity: 0 }}
  animate={{ x: 0, opacity: 1 }}
  className="w-72 m-4 rounded-3xl bg-gradient-to-br from-[#1f8cff] to-[#4338ca] p-6 text-white shadow-2xl flex flex-col"
>

  {/* LOGO */}
  <div className="flex items-center gap-3 mb-6">
    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
      <ShieldCheck size={22} color="#1f8cff" />
    </div>
    <h2 className="text-xl font-bold">
      Billing
    </h2>
  </div>

  {/* 🔥 SCROLLABLE MENU */}
  <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/30">

    <nav className="space-y-2">
      {menuItems.map((item) => {
        const isActive = location.pathname === item.path;

        return (
          <motion.div
            key={item.path}
            onClick={() => navigate(item.path)}
            whileHover={{ scale: 1.02, x: 5 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer ${
              isActive ? "bg-white text-blue-600" : "text-white/80"
            }`}
          >
            {item.icon}
            {item.name}
          </motion.div>
        );
      })}
    </nav>

  </div>

  {/* 🔥 FIXED USER PROFILE */}
  <div className="mt-4 pt-4 border-t border-white/20">

    <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl">

      <div className="w-10 h-10 rounded-full bg-white text-blue-600 flex items-center justify-center font-bold">
        {user?.name?.charAt(0)?.toUpperCase() || "U"}
      </div>

      <div className="flex-1 overflow-hidden">
        <p className="text-sm font-bold truncate">{user?.name}</p>
        <p className="text-xs text-white/70 truncate">{user?.email}</p>
        <p className="text-[10px] text-white/40">{user?.role}</p>
      </div>

      <button
        onClick={handleLogout}
        className="bg-red-500 hover:bg-red-600 p-2 rounded-lg"
      >
        <LogOut size={16} />
      </button>

    </div>

  </div>

</motion.div>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-4 overflow-auto">
        <Outlet />
      </main>

    </div>
  );
}