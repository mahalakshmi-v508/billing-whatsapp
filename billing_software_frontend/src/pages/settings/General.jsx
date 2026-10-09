import { useState, useEffect, useMemo } from "react";
import {
  Crown,
  Settings,
  RefreshCw,
  Building2,
  CheckCircle2,
  Globe,
  Coins,
  Calendar,
  CreditCard,
  Volume2,
  Sparkles,
  Shield,
  User,
  Search,
  Sliders,
  Check,
  Layers,
  Boxes,
  Database,
  Info,
  Clock,
  Zap,
  ArrowRight,
  Hash,
  Languages,
  Sun,
  Moon,
  Lock,
  MessageCircle,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import InvoiceSettings from "./InvoiceSettings";
import InvoiceDesign from "./InvoiceDesign";
import Print from "./Print";
import EwayBill from "./EwayBill";
import ServiceReminders from "./ServiceReminders";
import TransactionMessage from "./TransactionMessage";
import TermsSettings from "./TermsSettings";
import AuditLogSettings from "./AuditLogSettings";
import PosSettings from "./PosSettings";
import StockSettings from "./StockSettings";
import CashierSecuritySettings from "./CashierSecuritySettings";
import WhatsAppDefaultSettings from "./WhatsAppDefaultSettings";
import { useSettings } from "./SettingsContext";
import { SettingsShell, Badge, Toggle, InfoIcon } from "./settingsUI";
import { saveSettings, fetchSettings } from "./settingsApi";
import { AUDIT_SETTINGS_KEY, DEFAULT_AUDIT_SETTINGS } from "../../components/audit/auditApi";
import { applyTheme, applyLanguage } from "../../utils/themeInitializer";
import { t, useLanguage } from "../../utils/i18n";

const blue = "#2563eb";
const gradient = "linear-gradient(135deg, #1f8cff 0%, #4338ca 100%)";

const DEFAULT_PREFERENCES = {
  currency: "₹ Indian Rupee (INR)",
  dateFormat: "DD/MM/YYYY",
  numberFormat: "Indian (1,00,000.00)",
  decimalPlaces: "2",
  financialYear: "April 1 - March 31 (Standard Indian FY)",
  defaultPaymentMode: "Cash",
  autoRoundOff: true,
  audioChimeOnSuccess: true,
  autoFocusBarcodeSearch: true,
  showShortcutHints: true,
  appLanguage: "en",
  themeMode: "light",
};

const CURRENCIES = [
  { code: "INR", symbol: "₹", label: "₹ Indian Rupee (INR)", region: "India" },
  { code: "USD", symbol: "$", label: "$ US Dollar (USD)", region: "United States" },
  { code: "EUR", symbol: "€", label: "€ Euro (EUR)", region: "European Union" },
  { code: "GBP", symbol: "£", label: "£ British Pound (GBP)", region: "United Kingdom" },
  { code: "AED", symbol: "د.إ", label: "د.إ UAE Dirham (AED)", region: "United Arab Emirates" },
  { code: "SAR", symbol: "﷼", label: "﷼ Saudi Riyal (SAR)", region: "Saudi Arabia" },
  { code: "SGD", symbol: "S$", label: "S$ Singapore Dollar (SGD)", region: "Singapore" },
  { code: "AUD", symbol: "A$", label: "A$ Australian Dollar (AUD)", region: "Australia" },
];

const DATE_FORMATS = [
  { id: "DD/MM/YYYY", label: "DD/MM/YYYY (e.g. 25/09/2026)", sample: "25/09/2026" },
  { id: "MM/DD/YYYY", label: "MM/DD/YYYY (e.g. 09/25/2026)", sample: "09/25/2026" },
  { id: "YYYY-MM-DD", label: "YYYY-MM-DD (e.g. 2026-09-25)", sample: "2026-09-25" },
  { id: "DD-MMM-YYYY", label: "DD-MMM-YYYY (e.g. 25-Sep-2026)", sample: "25-Sep-2026" },
];

const PAYMENT_MODES = [
  { id: "Cash", label: "Cash" },
  { id: "UPI / QR Code", label: "UPI / QR Code" },
  { id: "Bank Transfer / NEFT", label: "Bank Transfer / NEFT" },
  { id: "Credit Card / Debit Card", label: "Card Swipe / POS" },
  { id: "Cheque", label: "Cheque" },
  { id: "Credit / Udhar", label: "Credit (Unpaid / Udhar)" },
];

function GeneralSettings() {
  const navigate = useNavigate();
  const { setSettingsTab } = useSettings();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [firmSearch, setFirmSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState(
    localStorage.getItem("selected_company_id") || ""
  );

  // Load preferences from local storage or defaults
  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem("general_settings");
      const parsed = saved ? JSON.parse(saved) : {};
      const rawTheme = localStorage.getItem("app_theme");
      const savedTheme = rawTheme || parsed.themeMode || "light";
      const savedLang = localStorage.getItem("app_language") || parsed.appLanguage || DEFAULT_PREFERENCES.appLanguage;
      return {
        ...DEFAULT_PREFERENCES,
        ...parsed,
        themeMode: savedTheme,
        appLanguage: savedLang,
      };
    } catch (e) {
      /* ignore */
    }
    return DEFAULT_PREFERENCES;
  });

  // Keep DOM synchronized on component mount & listen for external changes
  useEffect(() => {
    if (preferences.themeMode) applyTheme(preferences.themeMode);
    if (preferences.appLanguage) applyLanguage(preferences.appLanguage);

    const handleTheme = (e) => {
      const theme = e?.detail || localStorage.getItem("app_theme") || "light";
      setPreferences((prev) => (prev.themeMode === theme ? prev : { ...prev, themeMode: theme }));
    };
    const handleLang = (e) => {
      const lang = e?.detail || localStorage.getItem("app_language") || "en";
      setPreferences((prev) => (prev.appLanguage === lang ? prev : { ...prev, appLanguage: lang }));
    };

    window.addEventListener("app_theme_changed", handleTheme);
    window.addEventListener("app_language_changed", handleLang);
    return () => {
      window.removeEventListener("app_theme_changed", handleTheme);
      window.removeEventListener("app_language_changed", handleLang);
    };
  }, []);

  let user = {};
  try {
    user = JSON.parse(localStorage.getItem("user") || "{}");
  } catch (e) {
    user = {};
  }
  const adminId = user?.role === "cashier" ? user?.admin_id : user?.id;

  /* Fetch Companies */
  const fetchCompanies = async () => {
    if (!adminId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(
        `/company/get_companies_by_admin?admin_id=${adminId}&role=${user.role || ""}`
      );
      if (res.data.status) {
        const list = res.data.data || [];
        setCompanies(list);
        const currentSaved = localStorage.getItem("selected_company_id");
        if (!currentSaved && list.length > 0) {
          const firstId = String(list[0].id);
          setSelectedCompany(firstId);
          localStorage.setItem("selected_company_id", firstId);
        }
      }
    } catch (err) {
      console.error("Error fetching companies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [adminId]);

  /* Audit Log settings - persisted in the shared company_settings blob */
  const [auditSettings, setAuditSettings] = useState({ ...DEFAULT_AUDIT_SETTINGS });

  useEffect(() => {
    fetchSettings()
      .then((settings) => {
        setAuditSettings({
          ...DEFAULT_AUDIT_SETTINGS,
          ...(settings?.[AUDIT_SETTINGS_KEY] || {}),
        });
      })
      .catch(() => setAuditSettings({ ...DEFAULT_AUDIT_SETTINGS }));
  }, [selectedCompany]);

  const updateAuditSetting = (key, value) => {
    setAuditSettings((prev) => {
      const updated = { ...prev, [key]: value };
      // saveSettings shallow-merges the patch and re-broadcasts, so the header
      // button picks up the change immediately.
      saveSettings({ [AUDIT_SETTINGS_KEY]: updated });
      showToast(
        key === "enabled"
          ? value
            ? "Audit Log enabled - all actions are now being recorded"
            : "Audit Log disabled - no new actions will be recorded"
          : "Audit Log preference updated"
      );
      return updated;
    });
  };

  // Sync preferences with backend & localStorage
  const updatePreference = (key, value) => {
    setPreferences((prev) => {
      const updated = { ...prev, [key]: value };

      // Apply live effects immediately
      if (key === "themeMode") {
        applyTheme(value);
      } else if (key === "appLanguage") {
        applyLanguage(value);
      }

      try {
        localStorage.setItem("general_settings", JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
      } catch (e) {
        /* ignore */
      }
      saveSettings({ general: updated });
      return updated;
    });

    if (key === "themeMode") {
      showToast(value === "dark" ? "Dark Theme activated (இரவு பயன்முறை)" : "Light Mode activated (வெளிச்ச பயன்முறை)");
    } else if (key === "appLanguage") {
      showToast(value === "ta" ? "முழுமையான தமிழ் மொழி மாற்றப்பட்டது (Tamil UI active)" : "Language switched to English (முழுமையாக ஆங்கிலம் மாற்றப்பட்டது)");
    } else {
      showToast("Preference updated successfully");
    }
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  /* Set Default Company Handler */
  const handleSetDefaultCompany = (company) => {
    const compId = String(company.id);
    setSelectedCompany(compId);
    localStorage.setItem("selected_company_id", compId);
    window.dispatchEvent(new Event("storage"));
    showToast(`Default company set to "${company.company_name}"`);
  };

  // Filtered firms based on search
  const filteredCompanies = useMemo(() => {
    if (!firmSearch.trim()) return companies;
    const q = firmSearch.toLowerCase();
    return companies.filter(
      (c) =>
        (c.company_name && c.company_name.toLowerCase().includes(q)) ||
        (c.gstin && c.gstin.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }, [companies, firmSearch]);

  // Current active default company object
  const activeCompanyObj = useMemo(() => {
    return companies.find((c) => String(c.id) === String(selectedCompany)) || companies[0] || null;
  }, [companies, selectedCompany]);

  const isTamil = preferences.appLanguage === "ta";

  return (
    <SettingsShell
      title={isTamil ? "பொது அமைப்புகள் (General Settings)" : "General Settings"}
      subtitle={
        isTamil
          ? "நிறுவன பணியிடம், பிராந்திய அமைப்புகள் & விருப்பங்கள்"
          : "FIRM WORKSPACE, REGIONAL STANDARDS & SYSTEM PREFERENCES"
      }
      icon={<Settings size={22} strokeWidth={2.2} />}
      contentClassName="p-2 space-y-6 max-w-[1600px] mx-auto text-slate-800 font-sans"
    >
      {/* ── Toast Notification ── */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[11px]">
            ✓
          </div>
          <span>{toast}</span>
        </div>
      )}

      {/* ── Top Overview Banner ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 md:p-6 text-white border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 shrink-0">
              <Building2 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg md:text-xl font-black tracking-tight text-white">
                  {activeCompanyObj ? activeCompanyObj.company_name : isTamil ? "பணியிட அமைப்பு" : "Workspace Setup"}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 text-[11px] font-bold flex items-center gap-1">
                  <Crown size={11} className="text-amber-400" /> {isTamil ? "முதன்மை பணியிடம்" : "Default Workspace"}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                  <CheckCircle2 size={11} /> {isTamil ? "செயலில் உள்ளது" : "Ready & Active"}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {isTamil
                  ? "முதன்மை பில்லிங் அடையாளம், பிராந்திய நாணயங்கள், காட்சி தீம்கள் மற்றும் விற்பனை விருப்பங்களை நிர்வகிக்கவும்."
                  : "Configure primary billing identity, regional currencies, number formatting, and POS workflow options."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-center">
            <button
              type="button"
              onClick={fetchCompanies}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-white border border-white/15 text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <RefreshCw size={13} className={loading ? "animate-spin text-blue-400" : ""} />
              <span>{isTamil ? "நிறுவனங்களைப் புதுப்பி" : "Refresh Firms"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Main 2-Column Grid Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ══════════════════════════════════════════════════════════════
            LEFT COLUMN (7 COLS): MULTI-FIRM DIRECTORY & ACTIVE WORKSPACE
        ══════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card: Multi Firm Management */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-4 rounded-full bg-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">Multi Firm Management</h2>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">
                  {companies.length} Registered
                </span>
              </div>

              {/* Search input for firms */}
              <div className="relative w-full sm:w-56">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={firmSearch}
                  onChange={(e) => setFirmSearch(e.target.value)}
                  placeholder="Search firms by name/GST..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs"
                />
              </div>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-500">
                Select your default active company. Invoices, tax ledgers, and document numbering will automatically load from this workspace.
              </p>

              {loading ? (
                <div className="py-12 text-center text-xs text-slate-400 font-medium flex flex-col items-center justify-center gap-2">
                  <RefreshCw size={20} className="animate-spin text-blue-600" />
                  <span>Loading registered firms...</span>
                </div>
              ) : filteredCompanies.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 font-medium border border-dashed border-slate-200 rounded-xl">
                  {firmSearch ? "No firms match your search criteria." : "No companies registered under this account."}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredCompanies.map((company) => {
                    const isSelected = String(company.id) === String(selectedCompany);
                    return (
                      <div
                        key={company.id}
                        onClick={() => handleSetDefaultCompany(company)}
                        className={`group p-4 rounded-xl border-2 transition-all cursor-pointer select-none relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isSelected
                          ? "border-blue-600 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/10"
                          : "border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/70"
                          }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="pt-0.5">
                            <input
                              type="radio"
                              name="default_company_radio"
                              checked={isSelected}
                              onChange={() => handleSetDefaultCompany(company)}
                              className="cursor-pointer w-4 h-4 text-blue-600 focus:ring-blue-500"
                              style={{ accentColor: blue }}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[13.5px] font-bold text-slate-900 group-hover:text-blue-700 transition">
                                {company.company_name}
                              </span>
                              {isSelected && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-blue-600 text-white px-2 py-0.5 rounded-md shadow-xs">
                                  <Crown size={10} /> DEFAULT FIRM
                                </span>
                              )}
                              {company.business_type && (
                                <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                                  {company.business_type}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                              {company.gstin && (
                                <span className="font-mono text-slate-700 font-medium">
                                  GST: <strong className="font-semibold">{company.gstin}</strong>
                                </span>
                              )}
                              {company.phone && <span>Ph: {company.phone}</span>}
                              {company.email && <span>{company.email}</span>}
                            </div>

                            {company.address && (
                              <p className="text-[11px] text-slate-400 mt-1 truncate max-w-md">
                                {company.address}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {isSelected ? (
                            <span className="text-xs font-bold text-blue-600 flex items-center gap-1 bg-blue-100/70 px-2.5 py-1 rounded-lg">
                              <Check size={13} strokeWidth={2.5} /> Active
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-700 transition">
                              Click to switch
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Card: Active Firm Snapshot */}
          {activeCompanyObj && (
            <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-5">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-blue-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Active Workspace Details
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">ID: #{activeCompanyObj.id}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-400 block">Company Name</span>
                  <span className="text-xs font-bold text-slate-800 truncate block mt-0.5">
                    {activeCompanyObj.company_name}
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-400 block">GSTIN / Tax ID</span>
                  <span className="text-xs font-mono font-bold text-slate-800 truncate block mt-0.5">
                    {activeCompanyObj.gstin || "Unregistered"}
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-400 block">Phone / Mobile</span>
                  <span className="text-xs font-bold text-slate-800 truncate block mt-0.5">
                    {activeCompanyObj.phone || "—"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════
            RIGHT COLUMN (5 COLS): REGIONAL, CURRENCY & SYSTEM DEFAULTS
        ══════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 space-y-6">
          {/* ══════════════════════════════════════════════════════════════
              CARD: 7. 🎨 காட்சி & மொழி (DISPLAY & THEME)
              CONTAINS ONLY: App Language & Dark Mode (per user request)
          ══════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-2xl border-2 border-indigo-200/90 dark:border-indigo-900/60 shadow-xs p-5 space-y-5 relative overflow-hidden">
            {/* Top gradient decorative glow */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-indigo-500/10 via-violet-500/5 to-transparent rounded-bl-full pointer-events-none" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 relative z-10">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-5 rounded-full bg-gradient-to-b from-indigo-600 via-violet-600 to-purple-600" />
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{isTamil ? "7. 🎨 காட்சி & தோற்றம்" : "7. 🎨 Display & Theme"}</span>
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {isTamil
                      ? "பயன்பாட்டு மொழி மற்றும் இரவு நேர தோற்ற அமைப்புகள்"
                      : "Application language & dark mode theme controls"}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800">
                {isTamil ? "விருப்பங்கள்" : "Preferences"}
              </span>
            </div>

            {/* 1. App Language (தமிழ் / ஆங்கிலம்) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Languages size={15} className="text-indigo-600 dark:text-indigo-400" />
                  <span>{isTamil ? "பயன்பாட்டு மொழி" : "App Language"}</span>
                </label>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md">
                  {preferences.appLanguage === "ta" ? "தமிழ் செயலில் உள்ளது" : "English Active"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                • <strong>{isTamil ? "பயன்பாட்டு மொழி" : "App Language"}</strong> – {isTamil ? "தமிழ் அல்லது ஆங்கில மொழியைத் தேர்ந்தெடுக்கவும்." : "Switch between English and Tamil."}
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                {/* English option */}
                <button
                  type="button"
                  onClick={() => updatePreference("appLanguage", "en")}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer relative flex flex-col justify-between gap-2 ${
                    preferences.appLanguage === "en"
                      ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/50 shadow-xs ring-2 ring-indigo-500/10"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-900/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold">🇬🇧</span>
                    {preferences.appLanguage === "en" && (
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                        ✓
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{isTamil ? "ஆங்கிலம்" : "English"}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{isTamil ? "முழுமையான ஆங்கில இடைமுகம்" : "English UI mode"}</span>
                  </div>
                </button>

                {/* Tamil option */}
                <button
                  type="button"
                  onClick={() => updatePreference("appLanguage", "ta")}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer relative flex flex-col justify-between gap-2 ${
                    preferences.appLanguage === "ta"
                      ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/50 shadow-xs ring-2 ring-indigo-500/10"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-900/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold">🇮🇳</span>
                    {preferences.appLanguage === "ta" && (
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                        ✓
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{isTamil ? "தமிழ்" : "Tamil (தமிழ்)"}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{isTamil ? "முழுமையான தமிழ் இடைமுகம்" : "Full Tamil UI mode"}</span>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. Dark Mode */}
            <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Moon size={15} className="text-indigo-600 dark:text-indigo-400" />
                  <span>{isTamil ? "இரவு பயன்முறை" : "Dark Mode"}</span>
                </label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={preferences.themeMode === "dark"}
                  onClick={() => updatePreference("themeMode", preferences.themeMode === "dark" ? "light" : "dark")}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 cursor-pointer ${
                    preferences.themeMode === "dark" ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      preferences.themeMode === "dark" ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                • <strong>{isTamil ? "இரவு பயன்முறை" : "Dark Mode"}</strong> – {isTamil ? "இரவு நேரம் மற்றும் கண் சோர்வை குறைக்க கருப்பு நிற தோற்றம்." : "Dark theme for eye comfort."}
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Light Mode */}
                <button
                  type="button"
                  onClick={() => updatePreference("themeMode", "light")}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${
                    preferences.themeMode !== "dark"
                      ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/50 shadow-xs ring-2 ring-indigo-500/10"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-900/40"
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center shrink-0">
                    <Sun size={17} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{isTamil ? "பகல் பயன்முறை" : "Light Mode"}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">{isTamil ? "வெளிச்சமான தோற்றம்" : "Daylight mode"}</span>
                  </div>
                </button>

                {/* Dark Mode */}
                <button
                  type="button"
                  onClick={() => updatePreference("themeMode", "dark")}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${
                    preferences.themeMode === "dark"
                      ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/50 shadow-xs ring-2 ring-indigo-500/10"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-900/40"
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-950 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-800/60">
                    <Moon size={17} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{isTamil ? "இரவு பயன்முறை" : "Dark Mode"}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">{isTamil ? "இருண்ட தோற்றம்" : "Night theme"}</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Card: Regional & Currency Preferences */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <span className="w-1.5 h-4 rounded-full bg-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">
                {isTamil ? "பிராந்திய & நாணய அமைப்புகள் (Regional & Currency)" : "Regional & Currency Standards"}
              </h2>
            </div>

            {/* Currency Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Coins size={14} className="text-indigo-600" /> Base Billing Currency
                </span>
                <span className="text-[11px] text-slate-400 font-normal">Active across invoices</span>
              </label>
              <select
                value={preferences.currency}
                onChange={(e) => updatePreference("currency", e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.label}>
                    {c.label} ({c.region})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Format Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-indigo-600" /> Date Display Format
                </span>
                <span className="text-[11px] text-slate-400 font-normal">Reports & Vouchers</span>
              </label>
              <select
                value={preferences.dateFormat}
                onChange={(e) => updatePreference("dateFormat", e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              >
                {DATE_FORMATS.map((df) => (
                  <option key={df.id} value={df.id}>
                    {df.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Financial Year Cycle */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Clock size={14} className="text-indigo-600" /> Financial Year Cycle
              </label>
              <select
                value={preferences.financialYear}
                onChange={(e) => updatePreference("financialYear", e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              >
                <option value="April 1 - March 31 (Standard Indian FY)">April 1 – March 31 (Standard Indian FY)</option>
                <option value="January 1 - December 31 (Calendar Year)">January 1 – December 31 (Calendar Year)</option>
              </select>
            </div>

            {/* Number System Format */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Hash size={14} className="text-indigo-600" /> Numbering & Decimal Precision
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={preferences.numberFormat}
                  onChange={(e) => updatePreference("numberFormat", e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                >
                  <option value="Indian (1,00,000.00)">Indian (1,00,000)</option>
                  <option value="International (100,000.00)">International (100,000)</option>
                </select>

                <select
                  value={preferences.decimalPlaces}
                  onChange={(e) => updatePreference("decimalPlaces", e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                >
                  <option value="2">2 Decimals (0.00)</option>
                  <option value="3">3 Decimals (0.000)</option>
                  <option value="0">No Decimals (0)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card: Billing & POS Operational Behaviors */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <span className="w-1.5 h-4 rounded-full bg-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Application & POS Preferences</h2>
            </div>

            {/* Default Payment Mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <CreditCard size={14} className="text-emerald-600" /> Default Payment Mode on Transactions
              </label>
              <select
                value={preferences.defaultPaymentMode}
                onChange={(e) => updatePreference("defaultPaymentMode", e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              >
                {PAYMENT_MODES.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggles */}
            <div className="divide-y divide-slate-100 pt-1">
              <Toggle
                label="Auto-Calculate Round Off by Default"
                info="Automatically round off gross bill amounts to the nearest integer"
                checked={preferences.autoRoundOff}
                onChange={(v) => updatePreference("autoRoundOff", v)}
              />

              <Toggle
                label="Audio Chime on Invoice Creation"
                info="Plays a gentle success confirmation tone when bills or payments are saved"
                checked={preferences.audioChimeOnSuccess}
                onChange={(v) => updatePreference("audioChimeOnSuccess", v)}
              />

              <Toggle
                label="Auto-Focus Barcode / Search Box"
                info="Automatically positions cursor on item search bar upon opening billing screens"
                checked={preferences.autoFocusBarcodeSearch}
                onChange={(v) => updatePreference("autoFocusBarcodeSearch", v)}
              />

              <Toggle
                label="Show Keyboard Shortcut Hints"
                info="Display fast keyboard key indicators (F1, F2, Alt+S) across POS interfaces"
                checked={preferences.showShortcutHints}
                onChange={(v) => updatePreference("showShortcutHints", v)}
              />
            </div>
          </div>

          {/* Card: POS & Counter Controls Quick Access */}
          <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/50 rounded-2xl border border-indigo-200/80 p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Zap size={15} className="text-amber-500" />
                <span>{isTamil ? "பில்லிங் & கவுண்டர் அமைப்புகள்" : "POS & Counter Controls"}</span>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-700">
                Fast POS
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {isTamil
                ? "ஆட்டோ பிரிண்ட், பார்கோடு ஸ்பீட் மோட், மொபைல் எண் கட்டாயம் & ஸ்கிரீன் ரீசெட் அமைப்புகளை எளிதாக மாற்றவும்."
                : "Manage Auto-Print on Save, Barcode Scanner Speed Mode, Mandatory Mobile, and Auto-Clear Cart settings."}
            </p>
            <button
              type="button"
              onClick={() => {
                setSettingsTab("pos-controls");
                navigate("/settings/pos-controls");
              }}
              className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm shadow-indigo-600/20"
            >
              <span>{isTamil ? "கவுண்டர் அமைப்புகளைத் திற (POS Controls)" : "Open POS Controls"}</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Card: Stock & Inventory Safety Quick Access */}
          <div className="bg-gradient-to-br from-rose-50/70 to-amber-50/50 rounded-2xl border border-rose-200/80 p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Boxes size={15} className="text-rose-600" />
                <span>{isTamil ? "ஸ்டாக் & இன்வென்டரி பாதுகாப்பு" : "Stock & Inventory Safety"}</span>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700">
                Safety Shield
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {isTamil
                ? "நெகட்டிவ் ஸ்டாக் தடுப்பு (Block / Warning), பில்லிங்கில் குறைந்த இருப்பு வண்ண எச்சரிக்கை & காலாவதியான பொருட்கள் கட்டுப்பாடு."
                : "Manage Negative Stock Control (Block / Warn), POS Low Stock Alert color badges, and Expired Batch sales restrictions."}
            </p>
            <button
              type="button"
              onClick={() => {
                setSettingsTab("stock-safety");
                navigate("/settings/stock-safety");
              }}
              className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm shadow-rose-600/20"
            >
              <span>{isTamil ? "இருப்பு பாதுகாப்பு அமைப்புகளைத் திற" : "Open Stock Safety Controls"}</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Card: Cashier & Security Controls Quick Access */}
          <div className="bg-gradient-to-br from-purple-50/70 to-indigo-50/50 rounded-2xl border border-purple-200/80 p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Lock size={15} className="text-purple-600" />
                <span>{isTamil ? "3. 🔒 கேஷியர் & செக்யூரிட்டி" : "3. Cashier & Security Controls"}</span>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-700">
                Staff Restrictions
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {isTamil
                ? "பொருளின் விலை மாற்றம் லாக், அதிகபட்ச தள்ளுபடி வரம்பு (Max 10%), அடக்க விலைக்கு கீழ் விற்க தடை, பில் டெலீட் PIN & ஆட்டோ ஸ்கிரீன் லாக்."
                : "Lock item price edit, enforce maximum discount limits, restrict selling below cost, supervisor/admin PIN for bill deletion, and auto-screen lock."}
            </p>
            <button
              type="button"
              onClick={() => {
                setSettingsTab("cashier-security");
                navigate("/settings/cashier-security");
              }}
              className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm shadow-purple-600/20"
            >
              <span>{isTamil ? "கேஷியர் பாதுகாப்பு அமைப்புகளைத் திற" : "Open Cashier & Security Settings"}</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Card: WhatsApp Defaults Quick Access */}
          <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/50 rounded-2xl border border-emerald-200/80 p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <MessageCircle size={15} className="text-emerald-600" />
                <span>{isTamil ? "4. 💬 வாட்ஸ்அப் அமைப்புகள்" : "4. WhatsApp Defaults"}</span>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700">
                WhatsApp Defaults
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {isTamil
                ? "போன் நம்பருக்கு முன்னால் தானாக +91 வருவது (10 டிஜிட் மட்டும் அடித்தால் போதும்) மற்றும் அன்றைய மொத்த சேல்ஸ் கணக்கு இரவில் தானாக முதலாளியின் வாட்ஸ்அப்பிற்கு செல்வது."
                : "Default country code (+91) auto-prefix for 10-digit customer phones and automatic daily sales summary dispatch to owner's WhatsApp."}
            </p>
            <button
              type="button"
              onClick={() => {
                setSettingsTab("whatsapp-defaults");
                navigate("/settings/whatsapp-defaults");
              }}
              className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm shadow-emerald-600/20"
            >
              <span>{isTamil ? "வாட்ஸ்அப் அமைப்புகளைத் திற" : "Open WhatsApp Default Settings"}</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Card: Audit Log */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Shield size={15} className="text-indigo-600" />
                <span>Audit Log</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                  auditSettings.enabled
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {auditSettings.enabled ? "Recording" : "Off"}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Records every create, edit, delete and status change made by any user, on every
              page. Entries can be reviewed from the <strong>Audit Log</strong> button in the top
              header or from the full Audit Log page.
            </p>

            <div className="divide-y divide-slate-200/60">
              <Toggle
                label="Enable Audit Log"
                info="Master switch. When off, no new activity is recorded and the Audit Log button is hidden everywhere."
                checked={auditSettings.enabled}
                onChange={(v) => updateAuditSetting("enabled", v)}
              />

              <Toggle
                label="Show Audit Log Button in Header"
                info="Display the Audit Log button on every page's top header bar"
                checked={auditSettings.showHeaderButton}
                onChange={(v) => updateAuditSetting("showHeaderButton", v)}
              />

              <Toggle
                label="Show History on Individual Records"
                info="Allow per-record history to be viewed for customers, invoices, products and more"
                checked={auditSettings.showPerRecordHistory}
                onChange={(v) => updateAuditSetting("showPerRecordHistory", v)}
              />

              <Toggle
                label="Record Delete Actions"
                info="Keep a before-snapshot of deleted records so nothing is lost from the trail"
                checked={auditSettings.logDeletes}
                onChange={(v) => updateAuditSetting("logDeletes", v)}
              />
            </div>

            <div className="pt-1 border-t border-slate-200/60">
              <button
                type="button"
                onClick={() => {
                  setAuditSettings((prev) => {
                    const next = { ...DEFAULT_AUDIT_SETTINGS, ...prev, enabled: true };
                    saveSettings({ [AUDIT_SETTINGS_KEY]: next });
                    showToast("Audit Log restored to defaults");
                    return next;
                  });
                }}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
              >
                Reset to Defaults
              </button>
            </div>
          </div>

          {/* Card: User & System Diagnostic Info */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <User size={15} className="text-blue-600" />
                <span>Logged In Account</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold uppercase">
                {user.role || "Admin"}
              </span>
            </div>

            <div className="text-xs text-slate-600 space-y-1 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
              <p className="font-semibold text-slate-800">{user.name || user.username || "Authorized User"}</p>
              <p className="text-slate-400 text-[11px]">{user.email || user.phone || "No email provided"}</p>
              {adminId && <p className="text-slate-400 text-[11px]">Admin Reference ID: #{adminId}</p>}
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Backend Sync Active
              </span>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem("company_settings_cache");
                    showToast("Cache refreshed successfully");
                  } catch (e) {
                    /* ignore */
                  }
                }}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
              >
                Clear Settings Cache
              </button>
            </div>
          </div>
        </div>
      </div>
    </SettingsShell>
  );
}

export default function General() {
  const { tab } = useParams();
  const { settingsTab = "general" } = useSettings();
  const activeTab = tab || settingsTab;

  return (
    <div className="bg-transparent min-w-0 flex flex-col flex-1">
      {activeTab === "general" && <GeneralSettings />}
      {activeTab === "pos-controls" && <PosSettings />}
      {activeTab === "stock-safety" && <StockSettings />}
      {activeTab === "cashier-security" && <CashierSecuritySettings />}
      {activeTab === "staff-security" && <CashierSecuritySettings />}
      {activeTab === "whatsapp-defaults" && <WhatsAppDefaultSettings />}
      {activeTab === "audit-log" && <AuditLogSettings />}
      {activeTab === "invoice-numbering" && <InvoiceSettings />}
      {activeTab === "invoice-design" && <InvoiceDesign />}
      {activeTab === "print" && <Print />}
      {activeTab === "terms-conditions" && <TermsSettings />}
      {activeTab === "eway-bill" && <EwayBill />}
      {activeTab === "txn-messages" && <TransactionMessage />}
      {activeTab === "service-reminders" && <ServiceReminders />}
    </div>
  );
}
