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
  Database,
  Info,
  Clock,
  Zap,
  ArrowRight,
  Hash,
} from "lucide-react";
import api from "../../services/api";
import InvoiceSettings from "./InvoiceSettings";
import InvoiceDesign from "./InvoiceDesign";
import Print from "./Print";
import EwayBill from "./EwayBill";
import ServiceReminders from "./ServiceReminders";
import TransactionMessage from "./TransactionMessage";
import { useSettings } from "./SettingsContext";
import { SettingsShell, Badge, Toggle, InfoIcon } from "./settingsUI";
import { saveSettings } from "./settingsApi";

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
      if (saved) return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
    } catch (e) {
      /* ignore */
    }
    return DEFAULT_PREFERENCES;
  });

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

  // Sync preferences with backend & localStorage
  const updatePreference = (key, value) => {
    setPreferences((prev) => {
      const updated = { ...prev, [key]: value };
      try {
        localStorage.setItem("general_settings", JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
      } catch (e) {
        /* ignore */
      }
      saveSettings({ general: updated });
      return updated;
    });
    showToast("Preference updated successfully");
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

  return (
    <SettingsShell
      title="General Settings"
      subtitle="FIRM WORKSPACE, REGIONAL STANDARDS & SYSTEM PREFERENCES"
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
                  {activeCompanyObj ? activeCompanyObj.company_name : "Workspace Setup"}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 text-[11px] font-bold flex items-center gap-1">
                  <Crown size={11} className="text-amber-400" /> Default Workspace
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                  <CheckCircle2 size={11} /> Ready & Active
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Configure primary billing identity, regional currencies, number formatting, and POS workflow options.
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
              <span>Refresh Firms</span>
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
          {/* Card: Regional & Currency Preferences */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <span className="w-1.5 h-4 rounded-full bg-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">Regional & Currency Standards</h2>
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
  const { settingsTab = "general" } = useSettings();

  return (
    <div className="bg-transparent min-w-0 flex flex-col flex-1">
      {settingsTab === "general" && <GeneralSettings />}
      {settingsTab === "invoice-numbering" && <InvoiceSettings />}
      {settingsTab === "invoice-design" && <InvoiceDesign />}
      {settingsTab === "print" && <Print />}
      {settingsTab === "eway-bill" && <EwayBill />}
      {settingsTab === "txn-messages" && <TransactionMessage />}
      {settingsTab === "service-reminders" && <ServiceReminders />}
    </div>
  );
}
