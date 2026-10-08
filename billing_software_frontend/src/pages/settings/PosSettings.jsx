import { useState } from "react";
import {
  Store,
  Printer,
  Phone,
  Monitor,
  Barcode,
  RotateCcw,
  CheckCircle2,
  Zap,
  Check,
  Receipt,
  FileSpreadsheet,
} from "lucide-react";
import { SettingsShell, Toggle, Badge } from "./settingsUI";
import { useCompanySetting } from "./useCompanySetting";
import { useLanguage } from "../../utils/i18n";

export const POS_SETTINGS_KEY = "pos_controls";

export const DEFAULT_POS_SETTINGS = {
  auto_print_on_save: false,
  mandatory_customer_mobile: false,
  default_billing_screen: "quick", // "quick" | "detailed"
  barcode_scanner_speed_mode: true,
  auto_clear_cart_after_save: true,
};

export default function PosSettings() {
  const { isTamil } = useLanguage();
  const [settings, setSetting] = useCompanySetting(POS_SETTINGS_KEY, DEFAULT_POS_SETTINGS);
  const [toast, setToast] = useState(null);

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

  const handleScreenChange = (screen) => {
    setSetting("default_billing_screen")(screen);
    showToast(
      screen === "quick"
        ? isTamil
          ? "இயல்புநிலை: விரைவு பில்லிங் (Quick POS)"
          : "Default Screen: Quick POS Bill (/billing)"
        : isTamil
          ? "இயல்புநிலை: விரிவான பில்லிங் (Detailed GST Invoice)"
          : "Default Screen: Detailed Sale Invoice (/sales/add)"
    );
  };

  return (
    <SettingsShell
      title={isTamil ? "பில்லிங் & கவுண்டர் அமைப்புகள் (POS Controls)" : "POS & Counter Controls"}
      subtitle={
        isTamil
          ? "வேகமான பில்லிங், பார்கோடு ஸ்கேனர் வேகம், ஆட்டோ பிரிண்ட் & கல்லா அமைப்புகள்"
          : "HIGH-SPEED COUNTER BILLING, BARCODE SPEED, AUTO-PRINT & CART PREFERENCES"
      }
      icon={<Store size={22} strokeWidth={2.2} />}
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

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 md:p-6 text-white border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
              <Zap size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg md:text-xl font-black tracking-tight text-white">
                  {isTamil ? "பில்லிங் & கவுண்டர் கட்டுப்பாடுகள்" : "POS Counter Controls & Speed Engine"}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                  <CheckCircle2 size={11} /> {isTamil ? "நேரலை தயார்" : "Live Sync Active"}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {isTamil
                  ? "கேஷியர் பில்லிங் வேகம், பார்கோடு தானியங்கி உள்ளீடு மற்றும் பில் சேமிப்பு நடவடிக்கைகளை கட்டுப்படுத்தவும்."
                  : "Optimize cashier speed, streamline barcode scanner throughput, and fine-tune instant save & print behaviors."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 5 POS Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* 1. Auto-Print on Save */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between hover:border-indigo-300 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                <Printer size={20} />
              </div>
              <Badge tone={settings.auto_print_on_save ? "green" : "gray"}>
                {settings.auto_print_on_save
                  ? isTamil
                    ? "செயலில் உள்ளது"
                    : "Enabled"
                  : isTamil
                  ? "முடக்கப்பட்டுள்ளது"
                  : "Disabled"}
              </Badge>
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-slate-900 flex items-center gap-2">
                {isTamil ? "1. பில் சேவ் ஆனதும் ஆட்டோ பிரிண்ட்" : "1. Auto-Print on Save"}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {isTamil
                  ? "பில் சேவ் (Save) செய்யப்பட்ட உடனே கூடுதல் கிளிக் இல்லாமல் பிரவுசர் பிரிண்டர் தானாகவே திறக்கப்படும்."
                  : "Automatically trigger the thermal/slip printer dialogue immediately when a bill is successfully saved."}
              </p>
            </div>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              {isTamil ? "தானாக பிரிண்ட் செய்ய" : "Auto-Print on completion"}
            </span>
            <Toggle
              checked={Boolean(settings.auto_print_on_save)}
              onChange={() =>
                handleToggle("auto_print_on_save", isTamil ? "ஆட்டோ பிரிண்ட்" : "Auto-Print on Save")
              }
            />
          </div>
        </div>

        {/* 2. Mandatory Customer Mobile */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between hover:border-indigo-300 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
                <Phone size={20} />
              </div>
              <Badge tone={settings.mandatory_customer_mobile ? "amber" : "gray"}>
                {settings.mandatory_customer_mobile
                  ? isTamil
                    ? "கட்டாயம் (Mandatory)"
                    : "Required"
                  : isTamil
                  ? "விருப்பத்தேர்வு (Optional)"
                  : "Optional"}
              </Badge>
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-slate-900 flex items-center gap-2">
                {isTamil ? "2. வாடிக்கையாளர் மொபைல் எண் கட்டாயம்" : "2. Mandatory Customer Mobile"}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {isTamil
                  ? "பில் போடும்போது 10 இலக்க வாடிக்கையாளர் மொபைல் எண் இல்லாமல் பில்லை சேவ் செய்ய அனுமதிக்காது (வாட்ஸ்அப் பில்லிற்கு மிக பயனுள்ளது)."
                  : "Enforce a valid 10-digit mobile number for every bill. Prevents saving walk-in bills without contact info."}
              </p>
            </div>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              {isTamil ? "மொபைல் எண் கட்டாயமாக்கு" : "Require 10-digit mobile"}
            </span>
            <Toggle
              checked={Boolean(settings.mandatory_customer_mobile)}
              onChange={() =>
                handleToggle(
                  "mandatory_customer_mobile",
                  isTamil ? "வாடிக்கையாளர் மொபைல் கட்டாயம்" : "Mandatory Mobile"
                )
              }
            />
          </div>
        </div>

        {/* 3. Barcode Scanner Speed Mode */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between hover:border-indigo-300 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center shrink-0">
                <Barcode size={20} />
              </div>
              <Badge tone={settings.barcode_scanner_speed_mode ? "green" : "gray"}>
                {settings.barcode_scanner_speed_mode
                  ? isTamil
                    ? "அதிவேகம் (Active)"
                    : "High-Speed Active"
                  : isTamil
                  ? "இயல்புநிலை"
                  : "Standard"}
              </Badge>
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-slate-900 flex items-center gap-2">
                {isTamil ? "3. பார்கோடு ஸ்கேனர் ஸ்பீட் மோட்" : "3. Barcode Scanner Speed Mode"}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {isTamil
                  ? "பார்கோடு ஸ்கேன் செய்த உடனே தாமதமின்றி பொருளைக் கண்டறிந்து Qty + 1 செய்து, தானாக ஆட்டோ என்டர் செய்து அடுத்த ஸ்கேனுக்கு தயாராகும்."
                  : "Instant item recognition upon hardware scanner beam. Auto-increments Qty +1, clears the input, and refocuses in 0ms."}
              </p>
            </div>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              {isTamil ? "அதிவேக ஆட்டோ என்டர் & Qty +1" : "Instant Auto-Enter & Qty +1"}
            </span>
            <Toggle
              checked={Boolean(settings.barcode_scanner_speed_mode)}
              onChange={() =>
                handleToggle(
                  "barcode_scanner_speed_mode",
                  isTamil ? "பார்கோடு ஸ்பீட் மோட்" : "Barcode Speed Mode"
                )
              }
            />
          </div>
        </div>

        {/* 4. Auto-Clear Cart after Save */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between hover:border-indigo-300 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                <RotateCcw size={20} />
              </div>
              <Badge tone={settings.auto_clear_cart_after_save ? "green" : "gray"}>
                {settings.auto_clear_cart_after_save
                  ? isTamil
                    ? "செயலில் உள்ளது"
                    : "Auto-Reset ON"
                  : isTamil
                  ? "மேனுவல் ரீசெட்"
                  : "Manual Reset"}
              </Badge>
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-slate-900 flex items-center gap-2">
                {isTamil ? "4. பில் முடிந்ததும் ஆட்டோ க்ளியர் கார்ட்" : "4. Auto-Clear Cart after Save"}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {isTamil
                  ? "பில் முடிந்ததும் அடுத்த வாடிக்கையாளருக்கு ஸ்கிரீன் உடனே க்ளியர் ஆகி, புதிய காலியான கார்ட் உடனே தயாராகும்."
                  : "Clears cart, customer details, and resets payment inputs immediately upon bill save, ready for the next customer in queue."}
              </p>
            </div>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              {isTamil ? "அடுத்த பில்லுக்கு உடனே தயாராகு" : "Reset screen for next bill"}
            </span>
            <Toggle
              checked={Boolean(settings.auto_clear_cart_after_save)}
              onChange={() =>
                handleToggle(
                  "auto_clear_cart_after_save",
                  isTamil ? "ஆட்டோ க்ளியர் கார்ட்" : "Auto-Clear Cart"
                )
              }
            />
          </div>
        </div>
      </div>

      {/* 5. Default Billing Screen Selection */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0">
              <Monitor size={20} />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-slate-900">
                {isTamil ? "5. இயல்புநிலை பில்லிங் திரை (Default Billing Screen)" : "5. Default Billing Screen"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isTamil
                  ? "பில்லிங் திறக்கும்போது Quick POS Bill வர வேண்டுமா அல்லது Detailed GST Sale Invoice வர வேண்டுமா?"
                  : "Choose which screen opens when launching billing from the sidebar, dashboard, or quick action shortcuts."}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Option A: Quick POS Bill */}
          <div
            onClick={() => handleScreenChange("quick")}
            className={`cursor-pointer rounded-2xl border-2 p-4 transition-all flex items-start gap-3.5 ${
              settings.default_billing_screen === "quick"
                ? "border-blue-600 bg-blue-50/40 shadow-sm"
                : "border-slate-200 hover:border-slate-300 bg-white"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                settings.default_billing_screen === "quick"
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-300 bg-white"
              }`}
            >
              {settings.default_billing_screen === "quick" && <Check size={12} strokeWidth={3} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Receipt size={16} className="text-blue-600" />
                <span className="text-sm font-bold text-slate-900">
                  {isTamil ? "விரைவு பில்லிங் (Quick POS Bill)" : "Quick POS Bill (/billing)"}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  {isTamil ? "பரிந்துரைக்கப்படுகிறது" : "Recommended"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {isTamil
                  ? "ரீடெய்ல் கவுண்டர், சூப்பர் மார்க்கெட் மற்றும் பார்கோடு ஸ்கேனருக்கு ஏற்ற அதிவேக ஒற்றைத் திரை பில்லிங்."
                  : "Single-screen high-speed counter workflow tailored for retail supermarkets, touch counters, and fast checkouts."}
              </p>
            </div>
          </div>

          {/* Option B: Detailed Sale Invoice */}
          <div
            onClick={() => handleScreenChange("detailed")}
            className={`cursor-pointer rounded-2xl border-2 p-4 transition-all flex items-start gap-3.5 ${
              settings.default_billing_screen === "detailed"
                ? "border-blue-600 bg-blue-50/40 shadow-sm"
                : "border-slate-200 hover:border-slate-300 bg-white"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                settings.default_billing_screen === "detailed"
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-300 bg-white"
              }`}
            >
              {settings.default_billing_screen === "detailed" && <Check size={12} strokeWidth={3} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-indigo-600" />
                <span className="text-sm font-bold text-slate-900">
                  {isTamil ? "விரிவான விற்பனை பில் (Detailed GST Invoice)" : "Detailed GST Invoice (/sales/add)"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {isTamil
                  ? "ஹோல்சேல் மற்றும் B2B வியாபாரத்திற்கான E-Way bill, போக்குவரத்து, ரவுண்ட் ஆஃப் அடங்கிய முழுமையான இன்வாய்ஸ் திரை."
                  : "Comprehensive B2B invoicing with shipping addresses, transport vehicle details, multiple terms & E-Way fields."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </SettingsShell>
  );
}
