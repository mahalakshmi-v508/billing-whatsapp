import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import {
  User,
  LogOut,
  ShieldCheck,
  Settings,
  Building2,
  Headset,
  ChevronDown,
  Sparkles,
  KeyRound,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function HeaderUserDropdown() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = user?.role || "user";

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    try {
      if (user && user.id) {
        await api.post("/auth/logout", { id: user.id, role: user.role });
      }
    } catch (err) {
      console.error(err);
    }
    localStorage.clear();
    navigate("/");
  };

  const handleNavigate = (path) => {
    setIsOpen(false);
    navigate(path);
  };

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  return (
    <div ref={dropdownRef} className="relative">
      {/* ── User Profile Button ── */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title={`${user?.name || "User Profile"} (${role})`}
        className={`flex items-center gap-2.5 pl-1.5 pr-2.5 sm:pr-3 py-1.5 rounded-2xl border transition-all cursor-pointer shadow-2xs select-none ${
          isOpen
            ? "bg-slate-100 border-indigo-300 ring-2 ring-indigo-500/20 shadow-sm"
            : "bg-white border-slate-200/90 hover:bg-slate-50 hover:border-slate-300"
        }`}
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 text-white flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0">
          {initial}
        </div>

        {/* Name & Role (hidden on very small screens) */}
        <div className="text-left hidden md:block max-w-[120px] lg:max-w-[150px]">
          <p className="text-xs font-bold text-slate-800 truncate leading-tight">
            {user?.name || "Account"}
          </p>
          <span className="text-[10px] font-semibold text-slate-400 capitalize block leading-tight">
            {role}
          </span>
        </div>

        {/* Dropdown chevron */}
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-indigo-600" : ""
          }`}
        />
      </button>

      {/* ── Dropdown Popover ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-12 w-64 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-50 py-1"
          >
            {/* User Header Summary */}
            <div className="px-4 py-3.5 bg-gradient-to-br from-slate-50 to-indigo-50/40 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate font-display">
                    {user?.name || "User"}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email || user?.mobile_number || ""}</p>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700">
                    {role}
                  </span>
                </div>
              </div>
            </div>

            {/* Links Menu */}
            <div className="py-1 px-1.5 space-y-0.5">
              <button
                type="button"
                onClick={() => handleNavigate("/profile")}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/60 rounded-xl transition cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                  <User size={14} />
                </div>
                <span>My Profile</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavigate("/change-password")}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/60 rounded-xl transition cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck size={14} />
                </div>
                <span>Change Password</span>
              </button>

              {role === "admin" && (
                <>
                  <button
                    type="button"
                    onClick={() => handleNavigate("/company")}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/60 rounded-xl transition cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                      <Building2 size={14} />
                    </div>
                    <span>Company Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNavigate("/settings")}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/60 rounded-xl transition cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                      <Settings size={14} />
                    </div>
                    <span>System Settings</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => handleNavigate("/helpdesk")}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/60 rounded-xl transition cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                  <Headset size={14} />
                </div>
                <span>Support & Helpdesk</span>
              </button>
            </div>

            {/* Logout Button */}
            <div className="pt-1 mt-1 border-t border-slate-100 px-1.5 pb-1">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                  <LogOut size={14} />
                </div>
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
