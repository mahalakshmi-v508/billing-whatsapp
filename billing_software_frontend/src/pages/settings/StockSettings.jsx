import { useState } from "react";
import {
  Boxes,
  AlertTriangle,
  ShieldAlert,
  CalendarX2,
  Ban,
  Check,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Sparkles,
  Layers,
  HelpCircle,
} from "lucide-react";
import { SettingsShell, Toggle, Badge } from "./settingsUI";
import { useCompanySetting } from "./useCompanySetting";
import { useLanguage } from "../../utils/i18n";

export const STOCK_SETTINGS_KEY = "stock_safety";

export const DEFAULT_STOCK_SETTINGS = {
  negative_stock_mode: "block", // "block" | "warning" | "allow"
  low_stock_alert: true,
  low_stock_threshold: 5,
  expiry_control_mode: "block", // "block" | "warning" | "disabled"
  near_expiry_alert: true,
  near_expiry_days: 30,
};

export default function StockSettings() {
  const { isTamil } = useLanguage();
  const [settings, setSetting] = useCompanySetting(STOCK_SETTINGS_KEY, DEFAULT_STOCK_SETTINGS);
  const [toast, setToast] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleNegativeStockChange = (mode) => {
    setSetting("negative_stock_mode")(mode);
    const label =
      mode === "block"
        ? isTamil
          ? "நெகட்டிவ் ஸ்டாக்: பில்லிங் முழுமையாக தடைசெய்யப்பட்டது (Block)"
          : "Negative Stock: Strictly Blocked"
        : mode === "warning"
        ? isTamil
          ? "நெகட்டிவ் ஸ்டாக்: எச்சரிக்கை மட்டும் (Warning Only)"
          : "Negative Stock: Warning Only"
        : isTamil
        ? "நெகட்டிவ் ஸ்டாக்: அனுமதிக்கப்பட்டது (Allow Silently)"
        : "Negative Stock: Allowed Silently";
    showToast(label);
  };

  const handleExpiryModeChange = (mode) => {
    setSetting("expiry_control_mode")(mode);
    const label =
      mode === "block"
        ? isTamil
          ? "காலாவதியான பொருட்கள்: பில்லில் சேர்க்க தடை (Block Expired)"
          : "Expired Items: Strictly Blocked"
        : mode === "warning"
        ? isTamil
          ? "காலாவதியான பொருட்கள்: எச்சரிக்கை மட்டும் (Warning Only)"
          : "Expired Items: Warning Only"
        : isTamil
        ? "காலாவதியான பொருட்கள்: கட்டுப்பாடு இல்லை (Disabled)"
        : "Expired Items: Disabled";
    showToast(label);
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

  const handleThresholdChange = (val) => {
    const num = Math.max(1, parseInt(val, 10) || 1);
    setSetting("low_stock_threshold")(num);
  };

  const handleExpiryDaysChange = (val) => {
    const num = Math.max(1, parseInt(val, 10) || 1);
    setSetting("near_expiry_days")(num);
  };

  return (
    <SettingsShell
      title={isTamil ? "ஸ்டாக் & இன்வென்டரி பாதுகாப்பு (Stock Safety)" : "Stock & Inventory Safety"}
      subtitle={
        isTamil
          ? "நெகட்டிவ் ஸ்டாக் தடுப்பு, குறைந்த இருப்பு வண்ண எச்சரிக்கை & காலாவதி கட்டுப்பாடுகள்"
          : "NEGATIVE STOCK CONTROL, POS LOW STOCK COLOR ALERTS & BATCH/EXPIRY WARNINGS"
      }
      icon={<Boxes size={22} strokeWidth={2.2} />}
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
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 rounded-2xl p-5 md:p-6 text-white border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/20 shrink-0">
              <ShieldAlert size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg md:text-xl font-black tracking-tight text-white">
                  {isTamil ? "இருப்பு & காலாவதி பாதுகாப்பு அமைப்புகள்" : "Inventory Stock & Expiry Safety Shield"}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                  <CheckCircle2 size={11} /> {isTamil ? "நேரலை தயார்" : "Live Protection Active"}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {isTamil
                  ? "கையிருப்பு 0-வாக உள்ளபோது பில் போடுவதை தடுப்பது, குறைந்த இருப்பு வண்ண எச்சரிக்கை மற்றும் காலாவதியான பொருட்கள் விற்பனையைத் தடுக்கும் அமைப்புகள்."
                  : "Enforce zero-oversell negative stock limits, configure real-time POS low stock threshold colors, and ban expired batch sales."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 1. NEGATIVE STOCK CONTROL ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
              <Ban size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-[15px] font-bold text-slate-900">
                  {isTamil ? "1. நெகட்டிவ் ஸ்டாக் கட்டுப்பாடு (Negative Stock Control)" : "1. Negative Stock Control"}
                </h3>
                <Badge
                  tone={
                    settings.negative_stock_mode === "block"
                      ? "red"
                      : settings.negative_stock_mode === "warning"
                      ? "amber"
                      : "gray"
                  }
                >
                  {settings.negative_stock_mode === "block"
                    ? isTamil
                      ? "தடை (Block)"
                      : "Strict Block"
                    : settings.negative_stock_mode === "warning"
                    ? isTamil
                      ? "எச்சரிக்கை (Warning)"
                      : "Warning Only"
                    : isTamil
                    ? "அனுமதி (Allow)"
                    : "Allow"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isTamil
                  ? "கடையில் ஒரு பொருளின் ஸ்டாக் 0-வாக இருக்கும் போது அல்லது இருப்புக்கு அதிகமாக பில் போடும் போது என்ன நடவடிக்கை எடுக்க வேண்டும்?"
                  : "Choose how the billing engine reacts when an item has 0 stock or requested quantity exceeds available inventory."}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 items-stretch">
          {/* Option A: Block Billing (Strict) */}
          <div
            onClick={() => handleNegativeStockChange("block")}
            className={`cursor-pointer rounded-2xl border-2 p-4 transition-all flex items-start gap-3.5 h-full ${
              settings.negative_stock_mode === "block"
                ? "border-rose-600 bg-rose-50/40 shadow-sm"
                : "border-slate-200 hover:border-slate-300 bg-white"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                settings.negative_stock_mode === "block"
                  ? "border-rose-600 bg-rose-600 text-white"
                  : "border-slate-300 bg-white"
              }`}
            >
              {settings.negative_stock_mode === "block" && <Check size={12} strokeWidth={3} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-bold text-slate-900">
                  {isTamil ? "முழு தடை (Block Billing)" : "Strict Block (Recommended)"}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700">
                  {isTamil ? "பரிந்துரை" : "Recommended"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {isTamil
                  ? "இருப்பு 0-வாக இருக்கும் பொருளை பில்லில் சேர்க்கவே விடாது. இருப்புக்கு மேல் அளவு மாற்றவும் முடியாது."
                  : "Completely prevents adding 0-stock products to bills and restricts overselling past inventory."}
              </p>
            </div>
          </div>

          {/* Option B: Warning Only */}
          <div
            onClick={() => handleNegativeStockChange("warning")}
            className={`cursor-pointer rounded-2xl border-2 p-4 transition-all flex items-start gap-3.5 h-full ${
              settings.negative_stock_mode === "warning"
                ? "border-amber-600 bg-amber-50/40 shadow-sm"
                : "border-slate-200 hover:border-slate-300 bg-white"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                settings.negative_stock_mode === "warning"
                  ? "border-amber-600 bg-amber-600 text-white"
                  : "border-slate-300 bg-white"
              }`}
            >
              {settings.negative_stock_mode === "warning" && <Check size={12} strokeWidth={3} />}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold text-slate-900">
                {isTamil ? "எச்சரிக்கை மட்டும் (Warning Only)" : "Warning Toast Only"}
              </span>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {isTamil
                  ? "பில்லில் சேர்க்க அனுமதிக்கும், ஆனால் 'கையிருப்பு 0' என்ற வண்ண எச்சரிக்கை டோஸ்ட் காண்பிக்கும்."
                  : "Allows billing but displays a clear amber warning alert that stock is zero or insufficient."}
              </p>
            </div>
          </div>

          {/* Option C: Allow Silently */}
          <div
            onClick={() => handleNegativeStockChange("allow")}
            className={`cursor-pointer rounded-2xl border-2 p-4 transition-all flex items-start gap-3.5 h-full ${
              settings.negative_stock_mode === "allow"
                ? "border-slate-600 bg-slate-50/70 shadow-sm"
                : "border-slate-200 hover:border-slate-300 bg-white"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                settings.negative_stock_mode === "allow"
                  ? "border-slate-600 bg-slate-600 text-white"
                  : "border-slate-300 bg-white"
              }`}
            >
              {settings.negative_stock_mode === "allow" && <Check size={12} strokeWidth={3} />}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold text-slate-900">
                {isTamil ? "கட்டுப்பாடின்றி அனுமதி (Allow)" : "Allow Silently"}
              </span>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {isTamil
                  ? "எந்தவித எச்சரிக்கையும் இன்றி நெகட்டிவ் இருப்பு பில்லிங்கை முழுமையாக அனுமதிக்கும்."
                  : "Disables negative stock checks entirely. Allows overselling and negative balances without prompts."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. LOW STOCK ALERT AT POS ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-[15px] font-bold text-slate-900">
                  {isTamil ? "2. பில்லிங்கில் குறைந்த இருப்பு எச்சரிக்கை (Low Stock Alert at POS)" : "2. Low Stock Alert at POS"}
                </h3>
                <Badge tone={settings.low_stock_alert ? "amber" : "gray"}>
                  {settings.low_stock_alert
                    ? isTamil
                      ? "செயலில் உள்ளது"
                      : "Alert Active"
                    : isTamil
                    ? "முடக்கப்பட்டது"
                    : "Disabled"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isTamil
                  ? "பில் போடும்போதே பொருள் இருப்பு கம்மியாக இருந்தால் தேடல் மெனு மற்றும் டேபிளில் வண்ண எச்சரிக்கை காட்டும்."
                  : "Highlight low stock products with colored badges in suggestions and trigger instant alerts when added to cart."}
              </p>
            </div>
          </div>
          <Toggle
            checked={Boolean(settings.low_stock_alert)}
            onChange={() =>
              handleToggle("low_stock_alert", isTamil ? "குறைந்த இருப்பு எச்சரிக்கை" : "Low Stock Alert")
            }
          />
        </div>

        {settings.low_stock_alert && (
          <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Threshold Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>{isTamil ? "குறைந்த இருப்பு வரம்பு (Threshold Qty):" : "Low Stock Warning Threshold (Qty):"}</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={settings.low_stock_threshold || 5}
                  onChange={(e) => handleThresholdChange(e.target.value)}
                  className="w-28 px-3 py-2 text-sm font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500 focus:bg-white transition"
                />
                <span className="text-xs text-slate-500">
                  {isTamil
                    ? `இருப்பு ${settings.low_stock_threshold || 5} அல்லது அதற்குக் கீழே இருந்தால் எச்சரிக்கை காட்டப்படும்.`
                    : `Raises amber alert when stock drops to or below ${settings.low_stock_threshold || 5} units.`}
                </span>
              </div>
            </div>

            {/* Visual Color Guide */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {isTamil ? "POS வண்ண வழிகாட்டி (Color Indicators)" : "POS Color Indicators Preview"}
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-bold border border-red-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                  {isTamil ? "இருப்பு 0 (Out of Stock)" : "Stock 0 (Out of Stock)"}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                  {isTamil ? `குறைந்த இருப்பு (≤ ${settings.low_stock_threshold || 5})` : `Low Stock (≤ ${settings.low_stock_threshold || 5})`}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  {isTamil ? `போதுமான இருப்பு (> ${settings.low_stock_threshold || 5})` : `In Stock (> ${settings.low_stock_threshold || 5})`}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. BATCH / EXPIRY WARNING ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center shrink-0">
              <CalendarX2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-[15px] font-bold text-slate-900">
                  {isTamil ? "3. காலாவதியான பொருட்கள் கட்டுப்பாடு (Batch / Expiry Warning)" : "3. Batch / Expiry Warning Control"}
                </h3>
                <Badge
                  tone={
                    settings.expiry_control_mode === "block"
                      ? "red"
                      : settings.expiry_control_mode === "warning"
                      ? "amber"
                      : "gray"
                  }
                >
                  {settings.expiry_control_mode === "block"
                    ? isTamil
                      ? "தடை (Strict Block)"
                      : "Strict Block"
                    : settings.expiry_control_mode === "warning"
                    ? isTamil
                      ? "எச்சரிக்கை (Warning)"
                      : "Warning Only"
                    : isTamil
                    ? "முடக்கப்பட்டது"
                    : "Disabled"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isTamil
                  ? "காலாவதி தேதி முடிந்த (Expired) பொருட்களை பில்லிங் ஸ்கிரீனில் சேர்க்க தடை விதிப்பது அல்லது எச்சரிப்பது."
                  : "Protect consumers by enforcing sales restrictions on expired batches and receiving early expiry alerts."}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 items-stretch">
          {/* Option A: Strict Block Expired */}
          <div
            onClick={() => handleExpiryModeChange("block")}
            className={`cursor-pointer rounded-2xl border-2 p-4 transition-all flex items-start gap-3.5 h-full ${
              settings.expiry_control_mode === "block"
                ? "border-purple-600 bg-purple-50/40 shadow-sm"
                : "border-slate-200 hover:border-slate-300 bg-white"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                settings.expiry_control_mode === "block"
                  ? "border-purple-600 bg-purple-600 text-white"
                  : "border-slate-300 bg-white"
              }`}
            >
              {settings.expiry_control_mode === "block" && <Check size={12} strokeWidth={3} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-bold text-slate-900">
                  {isTamil ? "பில்லில் சேர்க்க முழு தடை (Block)" : "Block Expired Items"}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700">
                  {isTamil ? "பாதுகாப்பானது" : "Strict Safe"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {isTamil
                  ? "காலாவதியான பொருட்களை பில்லில் சேர்க்கவே முடியாது; கேஷியருக்கு பிழை செய்தி தோன்றும்."
                  : "Strictly bans adding any expired batch/product to customer bills."}
              </p>
            </div>
          </div>

          {/* Option B: Warning Only */}
          <div
            onClick={() => handleExpiryModeChange("warning")}
            className={`cursor-pointer rounded-2xl border-2 p-4 transition-all flex items-start gap-3.5 h-full ${
              settings.expiry_control_mode === "warning"
                ? "border-amber-600 bg-amber-50/40 shadow-sm"
                : "border-slate-200 hover:border-slate-300 bg-white"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                settings.expiry_control_mode === "warning"
                  ? "border-amber-600 bg-amber-600 text-white"
                  : "border-slate-300 bg-white"
              }`}
            >
              {settings.expiry_control_mode === "warning" && <Check size={12} strokeWidth={3} />}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold text-slate-900">
                {isTamil ? "எச்சரிக்கை மட்டும் (Warning)" : "Warning Only"}
              </span>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {isTamil
                  ? "பில்லில் சேர்க்க அனுமதிக்கும், ஆனால் 'காலாவதியான பொருள்' என்ற எச்சரிக்கையை வெளிப்படுத்தும்."
                  : "Allows selling expired goods with a prompt alerting the operator."}
              </p>
            </div>
          </div>

          {/* Option C: Disabled */}
          <div
            onClick={() => handleExpiryModeChange("disabled")}
            className={`cursor-pointer rounded-2xl border-2 p-4 transition-all flex items-start gap-3.5 h-full ${
              settings.expiry_control_mode === "disabled"
                ? "border-slate-600 bg-slate-50/70 shadow-sm"
                : "border-slate-200 hover:border-slate-300 bg-white"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                settings.expiry_control_mode === "disabled"
                  ? "border-slate-600 bg-slate-600 text-white"
                  : "border-slate-300 bg-white"
              }`}
            >
              {settings.expiry_control_mode === "disabled" && <Check size={12} strokeWidth={3} />}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold text-slate-900">
                {isTamil ? "முடக்கு (Disabled)" : "Disabled"}
              </span>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {isTamil
                  ? "காலாவதி தேதிகளை சரிபார்க்காது (மருந்துகள் அல்லாத இதர கடைகளுக்கு)."
                  : "Do not validate batch expiry dates during bill preparation."}
              </p>
            </div>
          </div>
        </div>

        {/* Near Expiry Reminder Row */}
        <div className="pt-5 mt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-800">
              {isTamil ? "விரைவில் காலாவதியாகும் எச்சரிக்கை (Near-Expiry Alert)" : "Near-Expiry Pre-Alert Warning"}
            </span>
            <p className="text-[11px] text-slate-500">
              {isTamil
                ? "பொருட்கள் காலாவதியாவதற்கு முன்னரே மஞ்சள் நிற டேக் காண்பிக்கப்படும்."
                : "Highlights products reaching expiry date soon within the specified threshold days."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-600 font-semibold">{isTamil ? "நாட்கள்:" : "Days:"}</span>
              <input
                type="number"
                min="1"
                max="365"
                value={settings.near_expiry_days || 30}
                onChange={(e) => handleExpiryDaysChange(e.target.value)}
                className="w-16 px-2.5 py-1 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-purple-500"
              />
            </div>
            <Toggle
              checked={Boolean(settings.near_expiry_alert)}
              onChange={() =>
                handleToggle("near_expiry_alert", isTamil ? "விரைவில் காலாவதி எச்சரிக்கை" : "Near-Expiry Alert")
              }
            />
          </div>
        </div>
      </div>
    </SettingsShell>
  );
}
