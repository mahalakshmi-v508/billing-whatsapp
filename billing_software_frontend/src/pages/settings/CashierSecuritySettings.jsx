import { useState } from "react";
import api from "../../services/api";
import {
  Lock,
  Unlock,
  ShieldAlert,
  ShieldCheck,
  Percent,
  TrendingDown,
  KeyRound,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Check,
  Ban,
  Sliders,
  Sparkles,
  RefreshCw,
  X,
} from "lucide-react";
import { SettingsShell, Toggle, Badge } from "./settingsUI";
import { useCompanySetting } from "./useCompanySetting";
import { useLanguage } from "../../utils/i18n";

export const CASHIER_SECURITY_KEY = "cashier_security";

export const DEFAULT_CASHIER_SECURITY = {
  lock_item_price_edit: false, // Lock unit price edit in billing for cashiers
  max_discount_enabled: true, // Cap maximum discount cashier can give
  max_discount_limit: 10, // Max discount percentage (e.g. 10%)
  restrict_selling_below_cost: true, // Prevent selling below cost/purchase price
  supervisor_pin_enabled: true, // Require 4-digit PIN for bill delete/cancel
  supervisor_admin_pin: "1234", // 4-digit Supervisor/Admin PIN
  auto_screen_lock_minutes: 0, // 0 = Off, 5 = 5m, 10 = 10m, 15 = 15m
};

export default function CashierSecuritySettings() {
  const { isTamil } = useLanguage();
  const [settings, setSetting] = useCompanySetting(
    CASHIER_SECURITY_KEY,
    DEFAULT_CASHIER_SECURITY
  );
  const [toast, setToast] = useState(null);
  const [showPin, setShowPin] = useState(false);
  const [tempPin, setTempPin] = useState(settings.supervisor_admin_pin || "1234");

  // ─── PIN authorization OTP state ──────────────────────────
  const [showOtpBox, setShowOtpBox] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [pendingPin, setPendingPin] = useState(null);

  // ─── Auto-screen lock PIN authorization state ─────────────
  const [lockPinPrompt, setLockPinPrompt] = useState(false);
  const [pendingLockMins, setPendingLockMins] = useState(null);
  const [lockPin, setLockPin] = useState("");
  const [showLockPinInput, setShowLockPinInput] = useState(false);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggle = (key, label) => {
    const nextVal = !settings[key];
    setSetting(key)(nextVal);
    showToast(
      `${label}: ${
        nextVal
          ? isTamil
            ? "செயல்படுத்தப்பட்டது (ON)"
            : "Enabled (ON)"
          : isTamil
          ? "முடக்கப்பட்டது (OFF)"
          : "Disabled (OFF)"
      }`
    );
  };

  const handleDiscountLimitChange = (val) => {
    const num = Math.min(100, Math.max(1, parseInt(val, 10) || 1));
    setSetting("max_discount_limit")(num);
  };

  const resetPinOtp = () => {
    setShowOtpBox(false);
    setOtpSent(false);
    setAdminEmail("");
    setEnteredOtp("");
    setPendingPin(null);
    setIsSendingOtp(false);
    setIsVerifyingOtp(false);
  };

  const isCustomPin =
    String(settings.supervisor_admin_pin || "").trim() !==
    String(DEFAULT_CASHIER_SECURITY.supervisor_admin_pin);

  const pinActionLabel = isCustomPin
    ? isTamil
      ? "PIN மாற்று"
      : "Change PIN"
    : isTamil
    ? "சேமி"
    : "Save PIN";

  const handlePinActionClick = () => {
    const cleaned = String(tempPin || "").replace(/\D/g, "").slice(0, 4);
    if (cleaned.length !== 4) {
      showToast(
        isTamil
          ? "PIN சரியாக 4 இலக்கங்களாக இருக்க வேண்டும்"
          : "PIN must be exactly 4 digits"
      );
      return;
    }
    setPendingPin(cleaned);
    setEnteredOtp("");
    setOtpSent(false);
    setShowOtpBox(true);
  };

  const handleSendPinOtp = async () => {
    setIsSendingOtp(true);
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const res = await api.post("/auth/send_otp_for_credit", {
        user_id: user?.id,
        role: user?.role,
      });
      if (res.data.status === "success") {
        setAdminEmail(res.data.email);
        setOtpSent(true);
        showToast(res.data.message || "OTP sent successfully to admin email!");
      } else {
        showToast(res.data.message || "Failed to send OTP", false);
      }
    } catch (err) {
      console.error(err);
      showToast("Error sending OTP", false);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyPinOtp = async () => {
    if (!pendingPin) return;
    if (!enteredOtp.trim()) {
      showToast("Please enter the OTP code", false);
      return;
    }
    setIsVerifyingOtp(true);
    try {
      const res = await api.post("/auth/verify_otp", {
        email: adminEmail,
        otp: enteredOtp.trim(),
      });
      if (res.data.status === "success") {
        setSetting("supervisor_admin_pin")(pendingPin);
        setTempPin(pendingPin);
        showToast(
          isTamil
            ? isCustomPin
              ? "மேற்பார்வையாளர் PIN வெற்றிகரமாக மாற்றப்பட்டது!"
              : "மேற்பார்வையாளர் PIN வெற்றிகரமாக சேமிக்கப்பட்டது!"
            : isCustomPin
            ? "Supervisor PIN changed successfully!"
            : "Supervisor PIN saved successfully!"
        );
        resetPinOtp();
      } else {
        showToast(res.data.message || "Invalid OTP code", false);
      }
    } catch (err) {
      console.error(err);
      showToast("Error verifying OTP", false);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const applyAutoLock = (mins) => {
    setSetting("auto_screen_lock_minutes")(mins);
    showToast(
      mins === 0
        ? isTamil
          ? "ஆட்டோ ஸ்கிரீன் லாக் முடக்கப்பட்டது"
          : "Auto Screen Lock Disabled"
        : isTamil
        ? `ஆட்டோ ஸ்கிரீன் லாக்: ${mins} நிமிடங்களில் பூட்டப்படும்`
        : `Auto Screen Lock set to ${mins} minutes`
    );
  };

  const handleAutoLockRequest = (mins) => {
    // Skip the PIN prompt if the clicked option is already active
    if ((settings.auto_screen_lock_minutes || 0) === mins) return;
    setPendingLockMins(mins);
    setLockPin("");
    setShowLockPinInput(false);
    setLockPinPrompt(true);
  };

  const closeLockPinPrompt = () => {
    setLockPinPrompt(false);
    setPendingLockMins(null);
    setLockPin("");
    setShowLockPinInput(false);
  };

  const handleVerifyLockPin = () => {
    if (pendingLockMins == null) return;
    const pin = lockPin.trim();
    if (!pin) {
      showToast(
        isTamil
          ? "4-இலக்க மேற்பார்வையாளர் PIN ஐ உள்ளிடவும்"
          : "Please enter the 4-digit supervisor/admin PIN"
      );
      return;
    }
    const requiredPin = String(settings.supervisor_admin_pin || "1234").trim();
    if (pin === requiredPin) {
      applyAutoLock(pendingLockMins);
      closeLockPinPrompt();
    } else {
      showToast(
        isTamil
          ? "தவறான PIN! மீண்டும் முயற்சிக்கவும்."
          : "Invalid PIN! Please try again."
      );
    }
  };

  return (
    <SettingsShell
      title={
        isTamil
          ? "கேஷியர் & செக்யூரிட்டி (Staff Restrictions)"
          : "Cashier & Staff Security"
      }
      subtitle={
        isTamil
          ? "விலை மாற்றம் லாக், தள்ளுபடி வரம்பு, அடக்க விலை பாதுகாப்பு, அட்மின் PIN & ஆட்டோ லாக்"
          : "PREVENT PRICE TAMPERING, SET MAX DISCOUNT CEILINGS, ENFORCE COST SAFETY & ADMIN PIN"
      }
      icon={<Lock size={22} strokeWidth={2.2} />}
      contentClassName="p-3 sm:p-6 space-y-6 max-w-[1200px] mx-auto text-slate-800 font-sans"
    >
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[11px]">
            ✓
          </div>
          <span>{toast}</span>
        </div>
      )}

      {/* Hero Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 md:p-6 text-white border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg md:text-xl font-black tracking-tight text-white">
                  {isTamil
                    ? "3. கேஷியர் & செக்யூரிட்டி கட்டுப்பாடுகள்"
                    : "3. Cashier & Security Staff Restrictions"}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                  <CheckCircle2 size={11} />{" "}
                  {isTamil ? "செயலில் உள்ளது" : "Security Active"}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {isTamil
                  ? "கேஷியர் பில்லில் விலையை மாற்றுவதை தடுத்தல், அதிகபட்ச தள்ளுபடி வரம்பு, அடக்க விலைக்கு கீழ் விற்க தடை, பில் டெலீட் PIN & தானியங்கி திரை பூட்டு."
                  : "Restrict cashier price alterations, enforce maximum discount caps, prevent selling below cost, protect deletions with PIN & auto-lock screen."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 1. LOCK ITEM PRICE EDIT ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0">
              {settings.lock_item_price_edit ? <Lock size={20} /> : <Unlock size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-[15px] font-bold text-slate-900">
                  {isTamil
                    ? "1. பொருளின் விலையை மாற்ற தடை (Lock Item Price Edit)"
                    : "1. Lock Item Price Edit"}
                </h3>
                <Badge tone={settings.lock_item_price_edit ? "blue" : "gray"}>
                  {settings.lock_item_price_edit
                    ? isTamil
                      ? "விலை லாக் செயலில் உள்ளது"
                      : "Price Locked"
                    : isTamil
                    ? "மாற்ற அனுமதிக்கப்பட்டது"
                    : "Unlocked"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isTamil
                  ? "கேஷியர் பில் போடும்போது பொருட்களின் நிர்ணயிக்கப்பட்ட விற்பனை விலையை (Unit Price) தன்னிச்சையாக மாற்ற முடியாதபடி லாக் செய்யும்."
                  : "Locks the item unit sale price in POS billing so cashiers cannot modify prices. Only administrators can alter item rates."}
              </p>
            </div>
          </div>
          <Toggle
            checked={Boolean(settings.lock_item_price_edit)}
            onChange={() =>
              handleToggle(
                "lock_item_price_edit",
                isTamil ? "விலை மாற்றம் லாக்" : "Lock Item Price Edit"
              )
            }
          />
        </div>

        <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-3 ${
              settings.lock_item_price_edit
                ? "bg-indigo-50/60 border-indigo-200 text-indigo-900"
                : "bg-slate-50 border-slate-200 text-slate-600"
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
              🔒
            </div>
            <div className="text-xs">
              <span className="font-bold block">
                {isTamil ? "கேஷியர் பயன்முறை:" : "Cashier Mode:"}
              </span>
              <span>
                {settings.lock_item_price_edit
                  ? isTamil
                    ? "விலை உள்ளீட்டுப் புலம் முடக்கப்படும் (Read-Only)."
                    : "Item rate input is disabled & read-only for cashiers."
                  : isTamil
                  ? "கேஷியர் விலையை விருப்பப்படி மாற்றலாம்."
                  : "Cashiers are currently free to change sale prices."}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
              👑
            </div>
            <div className="text-xs">
              <span className="font-bold block text-slate-800">
                {isTamil ? "அட்மின் உரிமை:" : "Admin Override:"}
              </span>
              <span>
                {isTamil
                  ? "நிர்வாகி (Admin) உள்நுழைந்திருந்தால் எப்போது வேண்டுமானாலும் விலையை மாற்றலாம்."
                  : "Admin users always retain full permission to edit rates regardless of this setting."}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. MAXIMUM DISCOUNT LIMIT ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
              <Percent size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-[15px] font-bold text-slate-900">
                  {isTamil
                    ? "2. அதிகபட்ச தள்ளுபடி வரம்பு (Maximum Discount Limit)"
                    : "2. Maximum Discount Limit"}
                </h3>
                <Badge tone={settings.max_discount_enabled ? "amber" : "gray"}>
                  {settings.max_discount_enabled
                    ? `${settings.max_discount_limit || 10}% Max`
                    : isTamil
                    ? "வரம்பற்றது"
                    : "No Limit"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isTamil
                  ? "கேஷியர் வாடிக்கையாளருக்கு வழங்கக்கூடிய அதிகபட்ச தள்ளுபடி சதவீதத்தை நிர்ணயிக்கவும் (எ.கா: Max 10%)."
                  : "Cap the maximum discount percentage cashiers are allowed to apply on item lines or invoices."}
              </p>
            </div>
          </div>
          <Toggle
            checked={Boolean(settings.max_discount_enabled)}
            onChange={() =>
              handleToggle(
                "max_discount_enabled",
                isTamil ? "தள்ளுபடி வரம்பு" : "Discount Limit"
              )
            }
          />
        </div>

        {settings.max_discount_enabled && (
          <div className="pt-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  {isTamil
                    ? "அதிகபட்ச தள்ளுபடி சதவீதம் (Max Discount %):"
                    : "Maximum Allowed Discount Percentage (%):"}
                </label>
                <p className="text-[11px] text-slate-400">
                  {isTamil
                    ? `கேஷியர் ${settings.max_discount_limit || 10}%-க்கு மேல் தள்ளுபடி வழங்கினால் சிஸ்டம் தடுக்கும்.`
                    : `Disallows discounts exceeding ${settings.max_discount_limit || 10}% without administrator approval.`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.max_discount_limit || 10}
                    onChange={(e) => handleDiscountLimitChange(e.target.value)}
                    className="w-24 px-3 py-2 pr-8 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    %
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                {isTamil ? "விரைவு தேர்வுகள்:" : "Quick Presets:"}
              </span>
              {[5, 10, 15, 20, 25].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setSetting("max_discount_limit")(preset)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    (settings.max_discount_limit || 10) === preset
                      ? "bg-amber-500 text-white shadow-sm"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  {preset}%
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 3. RESTRICT SELLING BELOW COST ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
              <TrendingDown size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-[15px] font-bold text-slate-900">
                  {isTamil
                    ? "3. அடக்க விலைக்கு கீழ் விற்க தடை (Restrict Selling Below Cost)"
                    : "3. Restrict Selling Below Cost"}
                </h3>
                <Badge tone={settings.restrict_selling_below_cost ? "red" : "gray"}>
                  {settings.restrict_selling_below_cost
                    ? isTamil
                      ? "நஷ்ட தடுப்பு ஆன்"
                      : "Cost Protection ON"
                    : isTamil
                    ? "முடக்கப்பட்டது"
                    : "Disabled"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isTamil
                  ? "பொருளின் வாங்கிய விலையை (Purchase Price) விட குறைந்த விலைக்கு அல்லது அதிக தள்ளுபடி தந்து நஷ்டத்தில் விற்கப்படுவதைத் தடுக்கும்."
                  : "Prevents loss by blocking sales when effective selling price drops below recorded product purchase cost."}
              </p>
            </div>
          </div>
          <Toggle
            checked={Boolean(settings.restrict_selling_below_cost)}
            onChange={() =>
              handleToggle(
                "restrict_selling_below_cost",
                isTamil ? "அடக்க விலை பாதுகாப்பு" : "Cost Protection"
              )
            }
          />
        </div>

        <div className="pt-4 text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200/80">
          <p className="font-semibold text-slate-800 mb-1">
            {isTamil ? "🛡️ இந்த பாதுகாப்பு எவ்வாறு இயங்குகிறது?" : "🛡️ How Cost Protection Works:"}
          </p>
          <p>
            {isTamil
              ? "ஒரு பொருளின் கொள்முதல் விலை ₹100 எனில், தள்ளுபடி அல்லது தவறான உள்ளீடு காரணமாக அதன் பில்லிங் விலை ₹99-க்கு கீழ் சென்றால், பில்லிங் திரையில் சிவப்பு நிற எச்சரிக்கை தோன்றி பில் உருவாக்குவது தடுக்கப்படும்."
              : "If an item was purchased at ₹100, the billing system prevents the net selling price from falling under ₹100, safeguarding profitability."}
          </p>
        </div>
      </div>

      {/* ── 4. SUPERVISOR / ADMIN PIN ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center shrink-0">
              <KeyRound size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-[15px] font-bold text-slate-900">
                  {isTamil
                    ? "4. மேற்பார்வையாளர் / அட்மின் PIN (Supervisor / Admin PIN)"
                    : "4. Supervisor / Admin Security PIN"}
                </h3>
                <Badge tone={settings.supervisor_pin_enabled ? "purple" : "gray"}>
                  {settings.supervisor_pin_enabled
                    ? isTamil
                      ? "PIN பாதுகாப்பு ஆன்"
                      : "PIN Active"
                    : isTamil
                    ? "முடக்கப்பட்டது"
                    : "Disabled"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isTamil
                  ? "பழைய பில்லை நீக்க (Delete), ரத்து செய்ய (Cancel) அல்லது விதிவிலக்கு அளிக்க 4-இலக்க ரகசிய PIN கட்டாயம்."
                  : "Require a 4-digit supervisor secret PIN before deleting invoices, canceling bills, or overriding restrictions."}
              </p>
            </div>
          </div>
          <Toggle
            checked={Boolean(settings.supervisor_pin_enabled)}
            onChange={() =>
              handleToggle(
                "supervisor_pin_enabled",
                isTamil ? "மேற்பார்வையாளர் PIN" : "Supervisor PIN"
              )
            }
          />
        </div>

        {settings.supervisor_pin_enabled && (
          <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                {isTamil
                  ? "4-இலக்க மேற்பார்வையாளர் PIN (4-Digit PIN):"
                  : "4-Digit Supervisor PIN:"}
              </label>
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <input
                    type={showPin ? "text" : "password"}
                    maxLength={4}
                    value={tempPin}
                    onChange={(e) =>
                      setTempPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    placeholder="1234"
                    className="w-32 tracking-[0.3em] font-mono text-center px-3 py-2 text-base font-black text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showPin ? "Hide PIN" : "Show PIN"}
                  >
                    {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handlePinActionClick}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-sm shadow-purple-600/20"
                >
                  {pinActionLabel}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                {isTamil
                  ? "இயல்புநிலை PIN: 1234. PIN-ஐ சேமிக்க அல்லது மாற்ற, நிர்வாகி OTP சரிபார்ப்பு அவசியம்."
                  : "Default PIN is 1234. Saving or changing the PIN requires admin OTP verification."}
              </p>
            </div>

            <div className="bg-purple-50/60 border border-purple-200/80 rounded-xl p-3.5 text-xs text-purple-900 space-y-1">
              <span className="font-bold block">
                {isTamil ? "பாதுகாக்கப்படும் செயல்கள்:" : "Protected Operations:"}
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-purple-800">
                <li>{isTamil ? "விற்பனை பில் நீக்கம் (Delete Sale Invoice)" : "Permanent Invoice Deletion"}</li>
                <li>{isTamil ? "பில் ரத்து மற்றும் ஸ்டாக் ரீசெட்" : "Invoice Cancellation & Stock Restoration"}</li>
                <li>{isTamil ? "கல்லா தொகை திருத்தம்" : "Cashier Cash Reconciliation Override"}</li>
              </ul>
            </div>

            {showOtpBox && (
              <div className="md:col-span-2 bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5">
                <div className="flex items-start gap-3.5 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                    <Lock size={18} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-amber-900">
                      {isTamil ? "அட்மின் OTP அங்கீகாரம் தேவை" : "Admin OTP Authorization Required"}
                    </h5>
                    <p className="text-[11.5px] text-amber-700 mt-0.5">
                      {isTamil
                        ? "PIN-ஐ சேமிக்க/மாற்ற, நிர்வாகி மின்னஞ்சலுக்கு அனுப்பப்படும் OTP-ஐ சரிபார்க்கவும். OTP சரிபார்க்கப்பட்ட பின்னரே PIN மாறும்."
                        : "To save or change the PIN, verify the OTP sent to the admin email. The PIN is only updated after the OTP is verified."}
                    </p>
                  </div>
                </div>

                {!otpSent ? (
                  <button
                    type="button"
                    onClick={handleSendPinOtp}
                    disabled={isSendingOtp}
                    className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSendingOtp ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <ShieldCheck size={16} />
                    )}
                    {isSendingOtp
                      ? isTamil
                        ? "OTP அனுப்பப்படுகிறது..."
                        : "Dispatching OTP..."
                      : isTamil
                      ? "நிர்வாகி மின்னஞ்சலுக்கு OTP அனுப்பு"
                      : "Send Verification OTP to Admin Email"}
                  </button>
                ) : (
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-amber-200">
                    <p className="text-xs text-slate-600">
                      {isTamil ? "சரிபார்ப்புக் குறியீடு இதற்கு அனுப்பப்பட்டது:" : "Verification code sent to:"}{" "}
                      <strong className="text-slate-900">{adminEmail}</strong>
                    </p>
                    <div className="flex items-center gap-2.5 max-w-sm">
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="Enter 6-digit OTP"
                        value={enteredOtp}
                        onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ""))}
                        className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tracking-widest text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyPinOtp}
                        disabled={isVerifyingOtp || !enteredOtp.trim()}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                      >
                        {isVerifyingOtp
                          ? isTamil
                            ? "சரிபார்க்கிறது..."
                            : "Verifying..."
                          : isTamil
                          ? "சரிபார்த்து அங்கீகரி"
                          : "Verify & Authorize"}
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={handleSendPinOtp}
                        disabled={isSendingOtp}
                        className="text-[11px] font-semibold text-indigo-600 hover:underline inline-block"
                      >
                        {isTamil ? "OTP வரவில்லையா? மீண்டும் அனுப்பு" : "Didn't get code? Resend OTP"}
                      </button>
                      <button
                        type="button"
                        onClick={resetPinOtp}
                        className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 underline"
                      >
                        {isTamil ? "ரத்துசெய்" : "Cancel"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 5. AUTO-SCREEN LOCK ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center shrink-0">
              <Clock size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-[15px] font-bold text-slate-900">
                  {isTamil
                    ? "5. தானியங்கி திரை பூட்டு (Auto-Screen Lock)"
                    : "5. Auto-Screen Inactivity Lock"}
                </h3>
                <Badge
                  tone={
                    (settings.auto_screen_lock_minutes || 0) > 0 ? "teal" : "gray"
                  }
                >
                  {(settings.auto_screen_lock_minutes || 0) > 0
                    ? `${settings.auto_screen_lock_minutes} Mins`
                    : isTamil
                    ? "முடக்கப்பட்டது"
                    : "Disabled"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isTamil
                  ? "கேஷியர் அல்லது ஆப்பரேட்டர் சிஸ்டத்தை விட்டுச் சென்றால் குறிப்பிட்ட நிமிடங்களில் ஸ்கிரீனை தானாக லாக் செய்யும்."
                  : "Automatically lock the screen after idle timeout to prevent unauthorized transactions when POS is unattended."}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {[
            { mins: 0, label: isTamil ? "முடக்கப்பட்டது (Off)" : "Disabled (Off)" },
            { mins: 5, label: isTamil ? "5 நிமிடங்கள்" : "5 Minutes" },
            { mins: 10, label: isTamil ? "10 நிமிடங்கள்" : "10 Minutes" },
            { mins: 15, label: isTamil ? "15 நிமிடங்கள்" : "15 Minutes" },
          ].map((item) => {
            const isSelected = (settings.auto_screen_lock_minutes || 0) === item.mins;
            return (
              <button
                key={item.mins}
                type="button"
                onClick={() => handleAutoLockRequest(item.mins)}
                className={`p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? "border-teal-600 bg-teal-50/60 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-900 block">
                    {item.label}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {item.mins === 0
                      ? isTamil
                        ? "பூட்டு இல்லை"
                        : "Never lock"
                      : isTamil
                      ? "செயலற்ற நேரம்"
                      : "Idle timer"}
                  </span>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-slate-400 mt-3">
          {isTamil
            ? "இந்த மாற்றத்தைப் பயன்படுத்த, மேற்பார்வையாளர் PIN சரிபார்ப்பு தேவை."
            : "Applying an auto-lock time requires supervisor PIN verification."}
        </p>
      </div>

      {/* ── AUTO-SCREEN LOCK PIN AUTH MODAL ── */}
      {lockPinPrompt && (
        <div
          className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={closeLockPinPrompt}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-slate-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isTamil
                    ? "மேற்பார்வையாளர் PIN மூலம் உறுதிப்படுத்தவும்"
                    : "Confirm with Supervisor PIN"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isTamil
                    ? "ஆட்டோ ஸ்கிரீன் லாக் நேர மாற்றத்தை அங்கீகரிக்க 4-இலக்க PIN ஐ உள்ளிடவும்."
                    : "Enter the 4-digit supervisor/admin PIN to apply the selected auto-lock time."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeLockPinPrompt}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative flex-1">
                <input
                  type={showLockPinInput ? "text" : "password"}
                  maxLength={4}
                  placeholder="4-digit PIN"
                  value={lockPin}
                  onChange={(e) =>
                    setLockPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleVerifyLockPin();
                  }}
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tracking-[0.3em] text-center text-slate-900 focus:outline-none focus:border-purple-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowLockPinInput((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  title={showLockPinInput ? "Hide PIN" : "Show PIN"}
                >
                  {showLockPinInput ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <button
                type="button"
                onClick={handleVerifyLockPin}
                disabled={!lockPin.trim()}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                {isTamil ? "சரிபார்" : "Verify"}
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mt-3">
              {isTamil
                ? "PIN அங்கீகரிக்கப்பட்ட பின்னரே தேர்ந்தெடுக்கப்பட்ட நேரம் பயன்படுத்தப்படும்."
                : "The selected time is only applied after the correct PIN is entered."}
            </p>
          </div>
        </div>
      )}
    </SettingsShell>
  );
}
