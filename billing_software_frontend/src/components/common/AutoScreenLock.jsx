import { useState, useEffect, useRef, useCallback } from "react";
import { Lock, Unlock, ShieldAlert, LogOut, ArrowRight, UserCheck, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../utils/i18n";
import { CASHIER_SECURITY_KEY, DEFAULT_CASHIER_SECURITY } from "../../pages/settings/CashierSecuritySettings";

export default function AutoScreenLock() {
  const navigate = useNavigate();
  const { isTamil } = useLanguage();

  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(`settings_${CASHIER_SECURITY_KEY}`);
      return saved ? { ...DEFAULT_CASHIER_SECURITY, ...JSON.parse(saved) } : { ...DEFAULT_CASHIER_SECURITY };
    } catch {
      return { ...DEFAULT_CASHIER_SECURITY };
    }
  });

  const [isLocked, setIsLocked] = useState(() => {
    try {
      return sessionStorage.getItem("screen_locked") === "true";
    } catch {
      return false;
    }
  });

  const [pin, setPin] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();

  const timeoutRef = useRef(null);
  const pinInputRef = useRef(null);

  // Sync settings when updated in CashierSecuritySettings
  useEffect(() => {
    const handleUpdate = (e) => {
      if (e?.detail?.[CASHIER_SECURITY_KEY]) {
        setSettings((prev) => ({ ...prev, ...e.detail[CASHIER_SECURITY_KEY] }));
      } else {
        try {
          const saved = localStorage.getItem(`settings_${CASHIER_SECURITY_KEY}`);
          if (saved) setSettings({ ...DEFAULT_CASHIER_SECURITY, ...JSON.parse(saved) });
        } catch {}
      }
    };
    window.addEventListener("company-settings-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("company-settings-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // Update clock every second when locked
  useEffect(() => {
    if (!isLocked) return;
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [isLocked]);

  // Lock function
  const triggerLock = useCallback(() => {
    setIsLocked(true);
    try {
      sessionStorage.setItem("screen_locked", "true");
    } catch {}
  }, []);

  // Inactivity timer logic
  useEffect(() => {
    const minutes = Number(settings.auto_screen_lock_minutes) || 0;
    if (minutes <= 0) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    const ms = minutes * 60 * 1000;

    const resetTimer = () => {
      if (isLocked) return;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        triggerLock();
      }, ms);
    };

    resetTimer();

    const activityEvents = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    const handleActivity = () => resetTimer();

    activityEvents.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      activityEvents.forEach((ev) => window.removeEventListener(ev, handleActivity));
    };
  }, [settings.auto_screen_lock_minutes, isLocked, triggerLock]);

  // Focus input when locked
  useEffect(() => {
    if (isLocked) {
      setPin("");
      setErrorMsg("");
      setTimeout(() => pinInputRef.current?.focus(), 150);
    }
  }, [isLocked]);

  const handleUnlock = () => {
    const requiredPin = String(settings.supervisor_admin_pin || "1234").trim();
    if (pin.trim() === requiredPin) {
      setIsLocked(false);
      setPin("");
      setErrorMsg("");
      try {
        sessionStorage.removeItem("screen_locked");
      } catch {}
    } else {
      setErrorMsg(isTamil ? "தவறான PIN! மீண்டும் முயற்சிக்கவும்." : "Invalid PIN! Please try again.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setPin("");
      pinInputRef.current?.focus();
    }
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem("screen_locked");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } catch {}
    navigate("/login");
  };

  if (!isLocked) return null;

  return (
    <div
      className="fixed inset-0 z-[999999] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-200"
      style={{ isolation: "isolate" }}
    >
      <div
        className={`w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center text-white shadow-2xl relative overflow-hidden transition-transform ${
          isShaking ? "animate-shake" : ""
        }`}
      >
        {/* Decorative background glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Lock Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-purple-600/30 mb-4 animate-bounce duration-1000">
          <Lock size={30} strokeWidth={2.5} />
        </div>

        {/* Time display */}
        <div className="text-2xl sm:text-3xl font-mono font-black tracking-tight text-white mb-1">
          {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </div>
        <p className="text-xs text-slate-400 mb-5 font-medium">
          {currentTime.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "short", day: "numeric" })}
        </p>

        {/* Header Message */}
        <h2 className="text-lg font-bold text-white mb-1">
          {isTamil ? "திரை பூட்டப்பட்டுள்ளது" : "Screen Locked"}
        </h2>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          {isTamil
            ? "செயலற்ற நிலை காரணமாக சிஸ்டம் தானாக பூட்டப்பட்டது. தொடர 4-இலக்க PIN ஐ உள்ளிடவும்."
            : "Terminal locked due to inactivity. Enter the 4-digit Supervisor/Admin PIN to continue."}
        </p>

        {/* User Card */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 mb-6 flex items-center justify-between text-left">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
              <UserCheck size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-white block truncate">
                {user.name || user.username || "Operator"}
              </span>
              <span className="text-[10px] text-slate-400 block truncate">
                {user.role ? user.role.toUpperCase() : "CASHIER"}
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase shrink-0">
            {isTamil ? "செயலற்றது" : "Idle"}
          </span>
        </div>

        {/* PIN Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleUnlock();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">
              {isTamil ? "4-இலக்க மேற்பார்வையாளர் PIN:" : "4-Digit Supervisor PIN:"}
            </label>
            <div className="relative max-w-[200px] mx-auto">
              <input
                ref={pinInputRef}
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                  setErrorMsg("");
                }}
                placeholder="••••"
                className="w-full text-center tracking-[0.6em] font-mono text-xl font-black py-2.5 px-3 bg-slate-800 border-2 border-slate-700 focus:border-purple-500 focus:bg-slate-800/90 rounded-2xl outline-none text-white transition-all shadow-inner"
                autoComplete="off"
              />
            </div>
            {errorMsg && (
              <p className="text-xs font-bold text-rose-400 animate-in fade-in">
                {errorMsg}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={pin.length !== 4}
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:from-purple-700 active:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Unlock size={14} />
            <span>{isTamil ? "திரையை திறக்கவும் (Unlock)" : "Unlock Screen"}</span>
          </button>
        </form>

        {/* Footer Logout Option */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>{isTamil ? "வேறு பயனர்?" : "Different User?"}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="text-slate-400 hover:text-rose-400 transition flex items-center gap-1 font-bold cursor-pointer"
          >
            <LogOut size={12} />
            <span>{isTamil ? "வெளியேறு (Logout)" : "Logout"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
