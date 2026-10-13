import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Store,
  Upload,
  Image as ImageIcon,
  PenTool,
  Clock,
  Quote,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Sparkles,
  Building2,
  FileText,
  Receipt,
  Check,
  Sliders,
  ShieldCheck,
  Eye,
  RefreshCw,
} from "lucide-react";
import { SettingsShell, Toggle, Badge } from "./settingsUI";
import { useCompanySetting } from "./useCompanySetting";
import { useLanguage } from "../../utils/i18n";
import api from "../../services/api";

export const STORE_SETUP_KEY = "store_setup";

export const DEFAULT_STORE_SETUP = {
  counter_name: "Counter-1",
  store_logo: "",
  owner_signature: "",
  signature_label: "Authorized Signatory",
  working_hours: "09:00 AM - 10:00 PM (All Days)",
  store_slogan: "தரமான பொருட்கள், நியாயமான விலை!",
  show_counter_on_bill: true,
  show_logo_on_bill: true,
  show_signature_on_bill: true,
  show_slogan_on_bill: true,
  show_working_hours_on_bill: true,
};

const COUNTER_PRESETS = [
  "Counter-1",
  "Counter-2",
  "Counter-3",
  "Express Counter",
  "Main Counter",
  "Billing Desk 1",
  "VIP Counter",
];

const SLOGAN_PRESETS = [
  "தரமான பொருட்கள், நியாயமான விலை!",
  "வாடிக்கையாளர் திருப்தியே எங்கள் நோக்கம்!",
  "Quality, Purity & Trust Always",
  "Always Fresh, Always Best",
  "நம்பிக்கை மற்றும் தரம் எங்கள் அடையாளம்",
];

const WORKING_HOURS_PRESETS = [
  "09:00 AM - 10:00 PM (All Days)",
  "08:30 AM - 10:30 PM (Mon - Sun)",
  "10:00 AM - 09:00 PM (Sun Holiday)",
  "24 Hours Open (24x7)",
];

export default function StoreSetupSettings() {
  const navigate = useNavigate();
  const { isTamil } = useLanguage();
  const [settings, setSetting, setEntireSettings] = useCompanySetting(
    STORE_SETUP_KEY,
    DEFAULT_STORE_SETUP
  );

  const [toast, setToast] = useState(null);
  const [companyInfo, setCompanyInfo] = useState({ name: "PaySplitX Supermarket", phone: "" });
  const logoInputRef = useRef(null);
  const signatureInputRef = useRef(null);

  const companyId =
    localStorage.getItem("selected_company_id") ||
    localStorage.getItem("company_id") ||
    "";

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load company name for preview
  useEffect(() => {
    let mounted = true;
    if (companyId) {
      api.get(`/company/get_company_by_id?id=${companyId}`)
        .then((res) => {
          if (mounted && res.data?.status && res.data?.data) {
            setCompanyInfo({
              name: res.data.data.company_name || res.data.data.name || "PaySplitX Store",
              phone: res.data.data.mobile || res.data.data.phone || "",
              logo: res.data.data.logo || "",
            });
          }
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [companyId]);

  const handleFileUpload = (e, fieldName, successMsg) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast(
        isTamil ? "படக் கோப்பை மட்டும் தேர்ந்தெடுக்கவும் (PNG/JPG)" : "Please select an image file (PNG/JPG)",
        "error"
      );
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast(
        isTamil ? "படத்தின் அளவு 2MB-க்குள் இருக்க வேண்டும்" : "Image size must be less than 2MB",
        "error"
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64Data = uploadEvent.target?.result;
      if (base64Data) {
        setSetting(fieldName)(base64Data);
        showToast(successMsg);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveImage = (fieldName, label) => {
    setSetting(fieldName)("");
    showToast(
      isTamil ? `${label} வெற்றிகரமாக நீக்கப்பட்டது` : `${label} removed successfully`
    );
  };

  const activeLogo = settings.store_logo || companyInfo.logo || "";
  const activeSignature = settings.owner_signature || "";

  return (
    <SettingsShell
      title={isTamil ? "கடை & கவுண்டர் விவரங்கள்" : "Store & Counter Setup"}
      subtitle={
        isTamil
          ? "POS கவுண்டர் பெயர், பில்லில் வர வேண்டிய Logo, முதலாளி கையொப்பம் மற்றும் கடையின் நேரம் & வாசகம் அமைப்புகள்"
          : "Configure POS counter name, store logo & digital signature, operating hours, and bill slogan"
      }
      badge="Store Setup"
    >
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold transition-all transform animate-bounce ${
            toast.type === "error" ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
          }`}
        >
          {toast.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ── LEFT COLUMN: SETTINGS CONTROLS (7 Cols) ── */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* ── CARD 1: POS TERMINAL / COUNTER NAME ── */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/60 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <Store size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>{isTamil ? "1. 🖥️ POS கவுண்டர் பெயர் (Counter Name)" : "1. POS Terminal & Counter Name"}</span>
                      <Badge color="blue">{settings.counter_name || "Counter-1"}</Badge>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isTamil
                        ? "கவுண்டர் எண்/பெயர் (எ.கா: Counter-1, Express Counter) திரையிலும் பில்லிலும் தோன்றும்"
                        : "Counter/terminal identifier displayed on POS counter header and printed receipts"}
                    </p>
                  </div>
                </div>

                <Toggle
                  checked={settings.show_counter_on_bill !== false}
                  onChange={(val) => {
                    setSetting("show_counter_on_bill")(val);
                    showToast(
                      val
                        ? isTamil ? "கவுண்டர் பெயர் பில்லில் அச்சிடப்படும்" : "Counter will be printed on bills"
                        : isTamil ? "கவுண்டர் பெயர் பில்லில் மறைக்கப்பட்டது" : "Counter hidden on bills"
                    );
                  }}
                />
              </div>

              <div className="p-5 space-y-4">
                {/* Quick Presets */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-2">
                    {isTamil ? "விரைவு கவுண்டர் தேர்வுகள் (Quick Presets):" : "Popular Counter Names:"}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COUNTER_PRESETS.map((name) => {
                      const isSelected = settings.counter_name === name;
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            setSetting("counter_name")(name);
                            showToast(isTamil ? `கவுண்டர் பெயர்: ${name}` : `Counter set to ${name}`);
                          }}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-blue-50 border-blue-500 text-blue-900 font-bold ring-2 ring-blue-500/20"
                              : "bg-slate-50 border-slate-200/80 hover:bg-slate-100 text-slate-700"
                          }`}
                        >
                          <span>{name}</span>
                          {isSelected && <Check size={13} className="text-blue-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Counter Name Input */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    {isTamil ? "தனிப்பயன் கவுண்டர் பெயர் (Custom Counter Name):" : "Custom Counter Name:"}
                  </label>
                  <input
                    type="text"
                    value={settings.counter_name || ""}
                    onChange={(e) => setSetting("counter_name")(e.target.value)}
                    placeholder="e.g. Counter-1, Express Counter"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    {isTamil
                      ? "இந்த கவுண்டர் பெயர் POS திரையின் மேல் பகுதியிலும் மற்றும் பில்லிலும் காட்டப்படும்."
                      : "This terminal name will be displayed in the POS billing top bar and on printed customer receipts."}
                  </p>
                </div>
              </div>
            </div>

            {/* ── CARD 2: QUICK LOGO & SIGNATURE UPLOADER ── */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50/60 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <PenTool size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>{isTamil ? "2. 🖼️ லோகோ & டிஜிட்டல் கையொப்பம் (Logo & Sign)" : "2. Quick Logo & Sign Uploader"}</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isTamil
                        ? "பில்லில் வர வேண்டிய Logo மற்றும் முதலாளியின் டிஜிட்டல் கையொப்பம் பதிவேற்றம்"
                        : "Upload company logo and authorized digital signature for bills and invoices"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Store Logo Uploader */}
                  <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                        <ImageIcon size={15} className="text-purple-600" />
                        <span>{isTamil ? "கடையின் Logo" : "Store Logo"}</span>
                      </div>
                      <Toggle
                        checked={settings.show_logo_on_bill !== false}
                        onChange={(v) => setSetting("show_logo_on_bill")(v)}
                      />
                    </div>

                    {/* Logo Preview or Drop Area */}
                    <div className="w-full h-32 rounded-xl border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center p-2 relative overflow-hidden">
                      {activeLogo ? (
                        <div className="relative w-full h-full flex items-center justify-center group">
                          <img
                            src={activeLogo}
                            alt="Store Logo"
                            className="max-h-full max-w-full object-contain"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => logoInputRef.current?.click()}
                              className="p-1.5 bg-white text-slate-800 rounded-lg text-xs font-bold shadow hover:bg-slate-100 transition cursor-pointer"
                              title="Change Logo"
                            >
                              <Upload size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveImage("store_logo", isTamil ? "லோகோ" : "Logo")}
                              className="p-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold shadow hover:bg-rose-700 transition cursor-pointer"
                              title="Remove Logo"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => logoInputRef.current?.click()}
                          className="flex flex-col items-center justify-center text-center cursor-pointer p-2 w-full h-full hover:bg-slate-50 transition"
                        >
                          <Upload size={22} className="text-slate-400 mb-1" />
                          <span className="text-xs font-bold text-slate-700">
                            {isTamil ? "Logo-வை பதிவேற்ற கிளிக் செய்" : "Upload Store Logo"}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">PNG / JPG (Max 2MB)</span>
                        </div>
                      )}
                    </div>

                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleFileUpload(
                          e,
                          "store_logo",
                          isTamil ? "Logo வெற்றிகரமாக பதிவேற்றப்பட்டது!" : "Store Logo uploaded successfully!"
                        )
                      }
                    />

                    <div className="text-[11px] text-slate-500 text-center">
                      {isTamil ? "பில்லின் மேல் பகுதியில் லோகோ மையமாக அச்சிடப்படும்." : "Printed centered at top of bill."}
                    </div>
                  </div>

                  {/* Owner Digital Signature Uploader */}
                  <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                        <PenTool size={15} className="text-indigo-600" />
                        <span>{isTamil ? "டிஜிட்டல் கையொப்பம்" : "Digital Signature"}</span>
                      </div>
                      <Toggle
                        checked={settings.show_signature_on_bill !== false}
                        onChange={(v) => setSetting("show_signature_on_bill")(v)}
                      />
                    </div>

                    {/* Signature Preview or Drop Area */}
                    <div className="w-full h-32 rounded-xl border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center p-2 relative overflow-hidden">
                      {activeSignature ? (
                        <div className="relative w-full h-full flex items-center justify-center group">
                          <img
                            src={activeSignature}
                            alt="Digital Signature"
                            className="max-h-full max-w-full object-contain"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => signatureInputRef.current?.click()}
                              className="p-1.5 bg-white text-slate-800 rounded-lg text-xs font-bold shadow hover:bg-slate-100 transition cursor-pointer"
                              title="Change Signature"
                            >
                              <Upload size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveImage("owner_signature", isTamil ? "கையொப்பம்" : "Signature")}
                              className="p-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold shadow hover:bg-rose-700 transition cursor-pointer"
                              title="Remove Signature"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => signatureInputRef.current?.click()}
                          className="flex flex-col items-center justify-center text-center cursor-pointer p-2 w-full h-full hover:bg-slate-50 transition"
                        >
                          <PenTool size={22} className="text-slate-400 mb-1" />
                          <span className="text-xs font-bold text-slate-700">
                            {isTamil ? "கையொப்பத்தை பதிவேற்றவும்" : "Upload Signature"}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">Transparent PNG recommended</span>
                        </div>
                      )}
                    </div>

                    <input
                      ref={signatureInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleFileUpload(
                          e,
                          "owner_signature",
                          isTamil
                            ? "டிஜிட்டல் கையொப்பம் வெற்றிகரமாக சேமிக்கப்பட்டது!"
                            : "Digital signature uploaded successfully!"
                        )
                      }
                    />

                    <div>
                      <input
                        type="text"
                        value={settings.signature_label || "Authorized Signatory"}
                        onChange={(e) => setSetting("signature_label")(e.target.value)}
                        placeholder="Authorized Signatory"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 text-center"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── CARD 3: STORE WORKING HOURS & SLOGAN ── */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/60 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <Clock size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>{isTamil ? "3. 🕒 கடை நேரம் & வாசகம் (Hours & Slogan)" : "3. Store Working Hours & Slogan"}</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isTamil
                        ? "கடையின் இயங்கும் நேரம் மற்றும் வாசகம் (Tagline) பில்லில் வருவதற்கு"
                        : "Store operating schedule and tagline/slogan printed on customer invoices"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-6">
                {/* Store Slogan / Tagline */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Quote size={13} className="text-emerald-600" />
                      <span>{isTamil ? "கடையின் வாசகம் (Store Slogan / Tagline):" : "Store Slogan / Tagline:"}</span>
                    </label>
                    <Toggle
                      checked={settings.show_slogan_on_bill !== false}
                      onChange={(v) => setSetting("show_slogan_on_bill")(v)}
                    />
                  </div>

                  <input
                    type="text"
                    value={settings.store_slogan || ""}
                    onChange={(e) => setSetting("store_slogan")(e.target.value)}
                    placeholder="e.g. தரமான பொருட்கள், நியாயமான விலை!"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500 italic"
                  />

                  {/* Slogan Presets */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {SLOGAN_PRESETS.map((slogan) => (
                      <button
                        key={slogan}
                        type="button"
                        onClick={() => {
                          setSetting("store_slogan")(slogan);
                          showToast(isTamil ? "வாசகம் புதுப்பிக்கப்பட்டது!" : "Slogan updated!");
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-medium border border-emerald-200/70 transition cursor-pointer"
                      >
                        {slogan}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Working Hours */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Clock size={13} className="text-teal-600" />
                      <span>{isTamil ? "கடை இயங்கும் நேரம் (Store Working Hours):" : "Store Working Hours:"}</span>
                    </label>
                    <Toggle
                      checked={settings.show_working_hours_on_bill !== false}
                      onChange={(v) => setSetting("show_working_hours_on_bill")(v)}
                    />
                  </div>

                  <input
                    type="text"
                    value={settings.working_hours || ""}
                    onChange={(e) => setSetting("working_hours")(e.target.value)}
                    placeholder="e.g. 09:00 AM - 10:00 PM (All Days)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-teal-500"
                  />

                  {/* Hours Presets */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {WORKING_HOURS_PRESETS.map((hrs) => (
                      <button
                        key={hrs}
                        type="button"
                        onClick={() => {
                          setSetting("working_hours")(hrs);
                          showToast(isTamil ? "கடை நேரம் புதுப்பிக்கப்பட்டது!" : "Working hours updated!");
                        }}
                        className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-medium border border-teal-200/70 transition cursor-pointer"
                      >
                        {hrs}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: LIVE BILL PREVIEW (5 Cols) ── */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Receipt size={16} className="text-blue-600" />
                <span>{isTamil ? "நேரடி ரசீது முன்னோட்டம் (Live Bill Preview)" : "Live Receipt Preview"}</span>
              </div>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                80mm Thermal Receipt
              </span>
            </div>

            {/* Realistic Thermal Receipt Mockup */}
            <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 shadow-inner flex justify-center">
              <div className="w-full max-w-[320px] bg-white rounded-xl shadow-lg border border-slate-200 p-4 font-mono text-[11px] text-slate-800 space-y-2.5 relative">
                
                {/* Receipt Header */}
                <div className="text-center space-y-1 pb-2 border-b border-dashed border-slate-300">
                  {/* Logo */}
                  {settings.show_logo_on_bill !== false && activeLogo && (
                    <div className="flex justify-center mb-1">
                      <img
                        src={activeLogo}
                        alt="Logo Preview"
                        className="h-10 max-w-[120px] object-contain"
                      />
                    </div>
                  )}

                  <div className="font-bold text-xs uppercase tracking-wider text-slate-900">
                    {companyInfo.name || "PAYSPLIT SUPERMARKET"}
                  </div>

                  {/* Slogan */}
                  {settings.show_slogan_on_bill !== false && settings.store_slogan && (
                    <div className="text-[10px] text-slate-600 italic">
                      "{settings.store_slogan}"
                    </div>
                  )}

                  {companyInfo.phone && (
                    <div className="text-[10px] text-slate-500">
                      Ph: {companyInfo.phone}
                    </div>
                  )}

                  {/* Counter & Cashier */}
                  {settings.show_counter_on_bill !== false && (
                    <div className="text-[10px] font-bold text-blue-700 bg-blue-50 py-0.5 px-1.5 rounded mt-1 inline-block border border-blue-200">
                      {settings.counter_name || "Counter-1"} | Cashier: Admin
                    </div>
                  )}

                  <div className="text-[9.5px] text-slate-400 pt-0.5">
                    Bill #: INV-2026-0842 · Date: {new Date().toLocaleDateString("en-IN")}
                  </div>
                </div>

                {/* Sample Items List */}
                <div className="space-y-1.5 py-1 text-[10.5px]">
                  <div className="flex justify-between font-bold border-b border-slate-200 pb-1 text-slate-500 text-[10px]">
                    <span>Item</span>
                    <span>Qty</span>
                    <span>Price</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Aashirvaad Atta 5kg</span>
                    <span>1</span>
                    <span>₹275.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sunflower Oil 1L</span>
                    <span>2</span>
                    <span>₹290.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tata Salt 1kg</span>
                    <span>1</span>
                    <span>₹28.00</span>
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t border-dashed border-slate-300 pt-1.5 space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>Subtotal</span>
                    <span>₹593.00</span>
                  </div>
                  <div className="flex justify-between font-bold text-xs text-slate-900 border-t border-slate-200 pt-1">
                    <span>Total Amount</span>
                    <span>₹593.00</span>
                  </div>
                </div>

                {/* Working Hours Footer */}
                {settings.show_working_hours_on_bill !== false && settings.working_hours && (
                  <div className="text-center text-[9.5px] text-slate-500 border-t border-slate-200 pt-1.5">
                    <span className="font-semibold">{isTamil ? "கடை நேரம்:" : "Store Hours:"}</span> {settings.working_hours}
                  </div>
                )}

                {/* Digital Signature Area */}
                {settings.show_signature_on_bill !== false && (
                  <div className="pt-2 text-center border-t border-dashed border-slate-300">
                    {activeSignature ? (
                      <div className="flex justify-center mb-1">
                        <img
                          src={activeSignature}
                          alt="Signature Preview"
                          className="h-8 max-w-[100px] object-contain"
                        />
                      </div>
                    ) : (
                      <div className="h-6 flex items-center justify-center text-[10px] text-slate-300 italic">
                        [ Digital Signature ]
                      </div>
                    )}
                    <div className="text-[9.5px] font-bold text-slate-600 border-t border-slate-200 pt-0.5">
                      {settings.signature_label || "Authorized Signatory"}
                    </div>
                  </div>
                )}

                {/* Barcode Mock */}
                <div className="pt-2 text-center text-slate-300 text-[18px] tracking-widest font-mono">
                  ||||| | ||||| |||| | |||||
                </div>
                <div className="text-center text-[9px] text-slate-400">
                  Thank You! Visit Again 😊
                </div>
              </div>
            </div>

            {/* Feature Note */}
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 text-[11px] text-blue-900 flex items-start gap-2">
              <ShieldCheck size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">
                  {isTamil ? "தானியங்கு ஒத்திசைவு:" : "Automatic Sync:"}
                </span>{" "}
                {isTamil
                  ? "இங்கு நீங்கள் பதிவேற்றும் Logo, கையொப்பம் மற்றும் வாசகம் உங்கள் அனைத்து பில்கள் மற்றும் A4/Thermal இன்வாய்ஸ்களிலும் தானாக இணைக்கப்படும்."
                  : "All logo, signature, counter, and slogan settings automatically sync to your POS thermal receipts and A4 invoices."}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SettingsShell>
  );
}
