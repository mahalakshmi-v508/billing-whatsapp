import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageCircle,
  Phone,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Globe,
  ShieldCheck,
  Check,
  ExternalLink,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { SettingsShell, Toggle, Badge } from "./settingsUI";
import { useCompanySetting } from "./useCompanySetting";
import { useLanguage } from "../../utils/i18n";
import api from "../../services/api";

export const WHATSAPP_DEFAULTS_KEY = "whatsapp_defaults";

export const DEFAULT_WHATSAPP_DEFAULTS = {
  default_country_code: "+91",
  auto_prefix_country_code: true,
  send_daily_summary_to_owner: true,
  owner_whatsapp_number: "",
  daily_summary_time: "21:00",
  include_payment_breakdown: true,
  include_top_items: true,
};

const COUNTRY_CODE_PRESETS = [
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+971", country: "UAE", flag: "🇦🇪" },
  { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+1", country: "USA / Canada", flag: "🇺🇸" },
  { code: "+65", country: "Singapore", flag: "🇸🇬" },
  { code: "+60", country: "Malaysia", flag: "🇲🇾" },
  { code: "+44", country: "United Kingdom", flag: "🇬🇧" },
  { code: "+94", country: "Sri Lanka", flag: "🇱🇰" },
];

export default function WhatsAppDefaultSettings() {
  const navigate = useNavigate();
  const { isTamil } = useLanguage();
  const [settings, setSetting] = useCompanySetting(
    WHATSAPP_DEFAULTS_KEY,
    DEFAULT_WHATSAPP_DEFAULTS
  );

  const [toast, setToast] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState({
    loading: true,
    connected: false,
    phone: null,
    name: null,
  });
  const [testPhone, setTestPhone] = useState("9876543210");
  const [isSendingSummary, setIsSendingSummary] = useState(false);

  const companyId =
    localStorage.getItem("selected_company_id") ||
    localStorage.getItem("company_id") ||
    "";

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Check WhatsApp connection status on load
  useEffect(() => {
    let mounted = true;
    const checkStatus = async () => {
      if (!companyId) {
        if (mounted) setConnectionStatus({ loading: false, connected: false });
        return;
      }
      try {
        const res = await api.get(`/whatsapp/connect_status?company_id=${companyId}`);
        if (mounted) {
          if (res.data?.status) {
            const isReady =
              res.data.connected === true || res.data.data?.status === "ready";
            setConnectionStatus({
              loading: false,
              connected: isReady,
              phone: res.data.data?.phone || null,
              name: res.data.data?.name || null,
            });
          } else {
            setConnectionStatus({ loading: false, connected: false });
          }
        }
      } catch {
        if (mounted) setConnectionStatus({ loading: false, connected: false });
      }
    };

    checkStatus();
    return () => {
      mounted = false;
    };
  }, [companyId]);

  const handleCountryCodeSelect = (code) => {
    setSetting("default_country_code")(code);
    showToast(
      isTamil
        ? `இயல்புநிலை நாட்டின் குறியீடு: ${code}`
        : `Default Country Code set to ${code}`
    );
  };

  const handleCustomCodeChange = (e) => {
    let val = e.target.value.trim();
    if (val && !val.startsWith("+")) {
      val = "+" + val.replace(/\D/g, "");
    } else if (val.startsWith("+")) {
      val = "+" + val.slice(1).replace(/\D/g, "");
    }
    setSetting("default_country_code")(val || "+91");
  };

  const handleOwnerPhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, "");
    setSetting("owner_whatsapp_number")(val);
  };

  const handleSendDailySummaryNow = async () => {
    const targetPhone = settings.owner_whatsapp_number?.trim();
    if (!targetPhone) {
      showToast(
        isTamil
          ? "முதலாளியின் வாட்ஸ்அப் எண்ணை உள்ளிடவும்!"
          : "Please enter the Owner's WhatsApp Number!",
        "error"
      );
      return;
    }

    if (!connectionStatus.connected) {
      showToast(
        isTamil
          ? "வாட்ஸ்அப் இணைக்கப்படவில்லை. தயவுசெய்து முதலில் வாட்ஸ்அப்பை இணைக்கவும்!"
          : "WhatsApp is not connected. Please connect WhatsApp first!",
        "error"
      );
      return;
    }

    setIsSendingSummary(true);
    try {
      const res = await api.post("/whatsapp/send_daily_summary", {
        company_id: companyId,
        phone: targetPhone,
      });

      if (res.data?.status) {
        showToast(
          isTamil
            ? "இன்றைய மொத்த சேல்ஸ் கணக்கு முதலாளியின் வாட்ஸ்அப்பிற்கு வெற்றிகரமாக அனுப்பப்பட்டது! ✅"
            : "Today's daily sales summary sent successfully to Owner's WhatsApp! ✅"
        );
      } else {
        showToast(
          res.data?.message ||
            (isTamil ? "அனுப்புவதில் தோல்வி ஏற்பட்டது" : "Failed to send summary"),
          "error"
        );
      }
    } catch (err) {
      const errMsg =
        err?.response?.data?.message ||
        (isTamil
          ? "சேல்ஸ் கணக்கு அனுப்புவதில் பிழை ஏற்பட்டது. வாட்ஸ்அப் இணைப்பை சரிபார்க்கவும்."
          : "Error sending summary. Please check your WhatsApp connection.");
      showToast(errMsg, "error");
    } finally {
      setIsSendingSummary(false);
    }
  };

  // Compute live test output for preview
  const activeCountryCode = settings.default_country_code || "+91";
  const cleanCode = activeCountryCode.replace(/\D/g, "") || "91";
  const simulatedDigits = testPhone.replace(/\D/g, "").slice(0, 10);
  const simulatedFullNumber = simulatedDigits
    ? `+${cleanCode} ${simulatedDigits}`
    : `+${cleanCode} ...`;

  return (
    <SettingsShell
      title={isTamil ? "வாட்ஸ்அப் அமைப்புகள்" : "WhatsApp Defaults"}
      subtitle={
        isTamil
          ? "நாட்டின் குறியீடு (+91) தானியங்கு அமைப்பு மற்றும் அன்றைய சேல்ஸ் கணக்கு முதலாளியின் வாட்ஸ்அப்பிற்கு இரவில் தானாக அனுப்பும் வசதி"
          : "Auto country code (+91) prepending and automated daily sales summary dispatch to owner's WhatsApp"
      }
      badge="WhatsApp Automation"
    >
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold transition-all transform animate-bounce ${
            toast.type === "error"
              ? "bg-rose-600 text-white"
              : "bg-emerald-600 text-white"
          }`}
        >
          {toast.type === "error" ? (
            <AlertCircle size={16} />
          ) : (
            <CheckCircle2 size={16} />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* WhatsApp Connection Status Banner */}
        <div
          className={`rounded-2xl border p-4.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            connectionStatus.connected
              ? "bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-500/30"
              : "bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border-amber-500/30"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                connectionStatus.connected
                  ? "bg-emerald-600 text-white shadow-emerald-500/30"
                  : "bg-amber-600 text-white shadow-amber-500/30"
              }`}
            >
              <MessageCircle size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-800">
                  {connectionStatus.connected
                    ? isTamil
                      ? "வாட்ஸ்அப் இணைக்கப்பட்டுள்ளது (Active)"
                      : "WhatsApp Connected & Ready"
                    : isTamil
                    ? "வாட்ஸ்அப் இணைக்கப்படவில்லை (Offline)"
                    : "WhatsApp Not Connected"}
                </h4>
                <span
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus.connected
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-amber-500"
                  }`}
                />
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {connectionStatus.connected
                  ? `${
                      isTamil ? "இணைக்கப்பட்ட எண்:" : "Connected as:"
                    } ${connectionStatus.phone || connectionStatus.name || "Active Session"}`
                  : isTamil
                  ? "தானியங்கு செய்திகளை அனுப்ப உங்கள் வாட்ஸ்அப்பை QR ஸ்கேன் மூலம் இணைக்கவும்."
                  : "Scan QR code to connect your WhatsApp number for automated notifications."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/whatsapp")}
            className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 transition cursor-pointer shadow-sm ${
              connectionStatus.connected
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20"
            }`}
          >
            <span>
              {connectionStatus.connected
                ? isTamil
                  ? "வாட்ஸ்அப் நிலையை பார்"
                  : "View WhatsApp Session"
                : isTamil
                ? "வாட்ஸ்அப்பை இணைக்க (QR ஸ்கேன்)"
                : "Connect WhatsApp (QR Scan)"}
            </span>
            <ExternalLink size={13} />
          </button>
        </div>

        {/* ── CARD 1: DEFAULT COUNTRY CODE (+91) ── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/60 to-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Globe size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>
                    {isTamil
                      ? "1. 📱 இயல்புநிலை நாட்டின் குறியீடு (Default Country Code)"
                      : "1. Default Country Code (+91)"}
                  </span>
                  <Badge color="green">
                    {settings.default_country_code || "+91"}
                  </Badge>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isTamil
                    ? "போன் நம்பருக்கு முன்னால் தானாக +91 வரும் (கேஷியர் 10 இலக்கம் மட்டும் அடித்தால் போதும்)"
                    : "Automatically prepends country code to customer numbers so cashiers only need to enter 10 digits"}
                </p>
              </div>
            </div>

            <Toggle
              checked={settings.auto_prefix_country_code}
              onChange={(val) => {
                setSetting("auto_prefix_country_code")(val);
                showToast(
                  val
                    ? isTamil
                      ? "தானியங்கு நாட்டின் குறியீடு இயக்கப்பட்டது"
                      : "Auto-Prefix Enabled"
                    : isTamil
                    ? "தானியங்கு நாட்டின் குறியீடு முடக்கப்பட்டது"
                    : "Auto-Prefix Disabled"
                );
              }}
            />
          </div>

          <div className="p-5 space-y-5">
            {/* Quick Country Presets */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">
                {isTamil
                  ? "விரைவு நாட்டின் குறியீடு தேர்வுகள் (Quick Presets):"
                  : "Popular Country Presets:"}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {COUNTRY_CODE_PRESETS.map((item) => {
                  const isSelected =
                    (settings.default_country_code || "+91") === item.code;
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => handleCountryCodeSelect(item.code)}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                        isSelected
                          ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 font-bold"
                          : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{item.flag}</span>
                        <div>
                          <div className="text-xs font-bold">{item.code}</div>
                          <div className="text-[10px] text-slate-500">
                            {item.country}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <Check size={14} className="text-emerald-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Country Code Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  {isTamil
                    ? "தனிப்பயன் நாட்டின் குறியீடு (Custom Code):"
                    : "Custom Country Code:"}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-mono text-xs">
                    <Globe size={14} />
                  </div>
                  <input
                    type="text"
                    value={settings.default_country_code || "+91"}
                    onChange={handleCustomCodeChange}
                    placeholder="+91"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500 font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {isTamil
                    ? "உதாரணம்: +91 (இந்தியா), +971 (துபாய்), +1 (அமெரிக்கா)"
                    : "Example: +91 (India), +971 (UAE), +1 (USA)"}
                </p>
              </div>

              {/* Live Simulator Preview */}
              <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Sparkles size={13} className="text-emerald-600" />
                    <span>
                      {isTamil
                        ? "நேரடி சோதனை (Live Simulator)"
                        : "Live Cashier Simulator"}
                    </span>
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-1.5 py-0.5 rounded">
                    {isTamil ? "தானியங்கு" : "Auto-Prefix"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-mono font-bold border border-emerald-300">
                    {activeCountryCode}
                  </span>
                  <input
                    type="text"
                    maxLength={10}
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="Enter 10 digits"
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="pt-1 text-[11px] text-slate-600 flex items-center justify-between border-t border-slate-200/60">
                  <span>
                    {isTamil
                      ? "வாட்ஸ்அப் செல்லும் வடிவம்:"
                      : "WhatsApp Destination:"}
                  </span>
                  <span className="font-mono font-bold text-emerald-700">
                    {simulatedFullNumber}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── CARD 2: SEND DAILY SUMMARY TO OWNER ── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-teal-50/60 to-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                <TrendingUp size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>
                    {isTamil
                      ? "2. 📊 முதலாளிக்கு தினசரி சேல்ஸ் கணக்கு (Send Daily Summary to Owner)"
                      : "2. Send Daily Summary to Owner"}
                  </span>
                  <Badge color={settings.send_daily_summary_to_owner ? "emerald" : "gray"}>
                    {settings.send_daily_summary_to_owner
                      ? isTamil
                        ? "செயல்பாட்டில்"
                        : "Active"
                      : isTamil
                      ? "முடக்கப்பட்டது"
                      : "Disabled"}
                  </Badge>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isTamil
                    ? "அன்றைய மொத்த சேல்ஸ் கணக்கு முதலாளியின் வாட்ஸ்அப்பிற்கு இரவில் தானாக செல்லும்"
                    : "Automated end-of-day sales, collections, and bill count sent directly to owner's WhatsApp"}
                </p>
              </div>
            </div>

            <Toggle
              checked={settings.send_daily_summary_to_owner}
              onChange={(val) => {
                setSetting("send_daily_summary_to_owner")(val);
                showToast(
                  val
                    ? isTamil
                      ? "தினசரி சேல்ஸ் கணக்கு அனுப்புதல் இயக்கப்பட்டது"
                      : "Daily Summary to Owner Enabled"
                    : isTamil
                    ? "தினசரி சேல்ஸ் கணக்கு அனுப்புதல் முடக்கப்பட்டது"
                    : "Daily Summary to Owner Disabled"
                );
              }}
            />
          </div>

          <div className="p-5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Form Controls */}
              <div className="space-y-4">
                {/* Owner WhatsApp Number Input */}
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1.5">
                    {isTamil
                      ? "முதலாளியின் வாட்ஸ்அப் எண் (Owner WhatsApp Number) *"
                      : "Owner WhatsApp Mobile Number *"}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Phone size={14} />
                    </div>
                    <input
                      type="tel"
                      value={settings.owner_whatsapp_number || ""}
                      onChange={handleOwnerPhoneChange}
                      placeholder={
                        isTamil
                          ? "எ.கா: 9876543210 (10 இலக்கம் அல்லது நாட்டின் குறியீட்டுடன்)"
                          : "e.g. 9876543210 (10-digits or with country code)"
                      }
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-teal-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {isTamil
                      ? "இந்த எண்ணிற்கு தினசரி இரவு விற்பனை சுருக்கம் தானாக அனுப்பப்படும்."
                      : "The daily closing sales report and collection summary will be dispatched here."}
                  </p>
                </div>

                {/* Scheduled Time */}
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1.5">
                    {isTamil
                      ? "தானாக அனுப்பும் நேரம் (Scheduled Daily Time):"
                      : "Daily Scheduled Dispatch Time:"}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Clock size={14} />
                    </div>
                    <input
                      type="time"
                      value={settings.daily_summary_time || "21:00"}
                      onChange={(e) =>
                        setSetting("daily_summary_time")(e.target.value)
                      }
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-teal-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {isTamil
                      ? "இயல்புநிலை: இரவு 09:00 PM (21:00) கடை மூடும் போது."
                      : "Default: 09:00 PM (21:00) upon counter close."}
                  </p>
                </div>

                {/* Sub-Toggles */}
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        {isTamil
                          ? "கட்டண வசூல் விவரங்கள் சேர்க்க (Payment Breakdown)"
                          : "Include Payment Mode Breakdown"}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {isTamil
                          ? "Cash, UPI/GPay, Card, Credit (Udhar) தொகை பிரித்து காட்டும்"
                          : "Breaks down totals into Cash, UPI, Card, and Udhar/Credit"}
                      </div>
                    </div>
                    <Toggle
                      checked={settings.include_payment_breakdown !== false}
                      onChange={(val) =>
                        setSetting("include_payment_breakdown")(val)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        {isTamil
                          ? "அதிகம் விற்பனையான பொருட்கள் (Top 3 Selling Items)"
                          : "Include Top 3 Selling Products"}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {isTamil
                          ? "அன்றைய தினம் அதிகம் விற்ற முதல் 3 பொருட்கள் பட்டியல்"
                          : "Highlights the top 3 best-selling products of the day"}
                      </div>
                    </div>
                    <Toggle
                      checked={settings.include_top_items !== false}
                      onChange={(val) => setSetting("include_top_items")(val)}
                    />
                  </div>
                </div>

                {/* Dispatch Now Button */}
                <div className="pt-3">
                  <button
                    type="button"
                    disabled={isSendingSummary}
                    onClick={handleSendDailySummaryNow}
                    className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm shadow-teal-600/20"
                  >
                    {isSendingSummary ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>
                          {isTamil
                            ? "அனுப்பப்படுகிறது..."
                            : "Dispatching Summary..."}
                        </span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>
                          {isTamil
                            ? "இன்றைய கணக்கை உடனே அனுப்பு (Send Today's Summary Now)"
                            : "Send Today's Summary Now"}
                        </span>
                      </>
                    )}
                  </button>
                  <p className="text-[10.5px] text-slate-500 text-center mt-1.5">
                    {isTamil
                      ? "உடனே இன்றைய விற்பனை சுருக்கத்தை முதலாளியின் வாட்ஸ்அப்பிற்கு சோதிக்க கிளிக் செய்யவும்."
                      : "Click to immediately trigger and test today's closing summary to owner."}
                  </p>
                </div>
              </div>

              {/* Right Column: WhatsApp Chat Bubble Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <MessageCircle size={14} className="text-teal-600" />
                    <span>
                      {isTamil
                        ? "வாட்ஸ்அப் செய்தி முன்னோட்டம்"
                        : "WhatsApp Message Preview"}
                    </span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {settings.daily_summary_time || "21:00"}
                  </span>
                </div>

                {/* Realistic WhatsApp Chat Bubble */}
                <div className="bg-[#efeae2] p-4 rounded-2xl border border-slate-200 relative overflow-hidden font-sans shadow-inner">
                  {/* WhatsApp background pattern imitation */}
                  <div className="bg-white/95 rounded-2xl rounded-tl-none p-3.5 shadow-sm border border-slate-100 max-w-sm ml-auto space-y-2 text-slate-800">
                    <div className="text-[12px] font-bold text-emerald-800 flex items-center gap-1 border-b border-emerald-100 pb-1.5">
                      <span>📊</span>
                      <span>
                        {isTamil
                          ? "தினசரி சேல்ஸ் சுருக்கம் (Daily Sales Summary)"
                          : "Daily Sales Summary"}
                      </span>
                    </div>

                    <div className="text-[11px] space-y-1 font-mono leading-tight">
                      <div className="text-slate-500">
                        📅 Date: {new Date().toLocaleDateString("en-IN")}
                      </div>
                      <div className="text-slate-800 font-bold pt-1">
                        💰 Total Sales: ₹48,500.00
                      </div>
                      <div>🧾 Bills Created: 34</div>
                      <div>👥 Customers Served: 29</div>

                      {settings.include_payment_breakdown !== false && (
                        <div className="pt-1.5 border-t border-slate-100 mt-1">
                          <div className="font-bold text-slate-700 text-[10.5px]">
                            💳 Collections Breakdown:
                          </div>
                          <div className="text-[10.5px] text-slate-600 pl-1">
                            💵 Cash: ₹22,000.00
                          </div>
                          <div className="text-[10.5px] text-slate-600 pl-1">
                            📱 UPI / Online: ₹18,500.00
                          </div>
                          <div className="text-[10.5px] text-slate-600 pl-1">
                            💳 Card: ₹5,000.00
                          </div>
                          <div className="text-[10.5px] text-slate-600 pl-1">
                            📝 Credit (Udhar): ₹3,000.00
                          </div>
                        </div>
                      )}

                      {settings.include_top_items !== false && (
                        <div className="pt-1.5 border-t border-slate-100 mt-1">
                          <div className="font-bold text-slate-700 text-[10.5px]">
                            🏆 Top Selling Items:
                          </div>
                          <div className="text-[10px] text-slate-600 pl-1">
                            1. Aashirvaad Atta 5kg - 18 pcs
                          </div>
                          <div className="text-[10px] text-slate-600 pl-1">
                            2. Sunflower Oil 1L - 12 pcs
                          </div>
                          <div className="text-[10px] text-slate-600 pl-1">
                            3. Tata Salt 1kg - 10 pcs
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-100">
                      <span>✨ PaySplitX ERP</span>
                      <div className="flex items-center gap-1 font-mono">
                        <span>{settings.daily_summary_time || "21:00"}</span>
                        <Check size={11} className="text-teal-600" />
                        <Check size={11} className="-ml-2 text-teal-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Helpful Tip */}
                <div className="bg-teal-50/70 border border-teal-200/80 rounded-xl p-3 text-[11px] text-teal-900 flex items-start gap-2">
                  <ShieldCheck size={16} className="text-teal-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">
                      {isTamil
                        ? "முக்கிய குறிப்பு:"
                        : "Executive Feature:"}
                    </span>{" "}
                    {isTamil
                      ? "முதலாளி கடையில் இல்லாத நாட்களிலும், ஒவ்வொரு இரவும் அன்றைய மொத்த வருமானம் மற்றும் பில் கணக்குகள் அவருடைய கைபேசி வாட்ஸ்அப்பிற்கு தானாக வந்துவிடும்."
                      : "Even when the business owner is away, complete closing financials and collection totals arrive automatically every night on their WhatsApp."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SettingsShell>
  );
}
