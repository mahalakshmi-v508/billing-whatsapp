import { useState, useEffect, useRef, useMemo } from "react";
import {
  Coins,
  Database,
  Download,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Printer,
  Calendar,
  Layers,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Receipt,
  RotateCcw,
  Check,
  FileText,
  DollarSign,
  Building2,
  Sliders,
  History,
  Info,
  X,
  CreditCard,
  QrCode,
  Wallet,
} from "lucide-react";
import { SettingsShell, Toggle, Badge } from "./settingsUI";
import { useCompanySetting } from "./useCompanySetting";
import { useLanguage } from "../../utils/i18n";
import api, { API_BASE_URL } from "../../services/api";

export const TAX_BACKUP_KEY = "tax_backup";

export const DEFAULT_TAX_BACKUP = {
  default_tax_mode: "inclusive", // "inclusive" (with_gst) | "exclusive" (without_gst)
  allow_cashier_tax_toggle: true, // Allow cashier to toggle tax mode on POS screen
  apply_to_unlisted_items: true,
  auto_backup_reminder: true,
  last_backup_date: null,
};

const DENOMINATIONS = [
  { value: 500, label: "₹500 Note" },
  { value: 200, label: "₹200 Note" },
  { value: 100, label: "₹100 Note" },
  { value: 50, label: "₹50 Note" },
  { value: 20, label: "₹20 Note" },
  { value: 10, label: "₹10 Note" },
  { value: 1, label: "Coins / Change" },
];

export default function TaxBackupSettings({ initialTab = "tax-mode" }) {
  const { isTamil } = useLanguage();
  const [settings, setSetting, setEntireSettings] = useCompanySetting(
    TAX_BACKUP_KEY,
    DEFAULT_TAX_BACKUP
  );

  const [activeSubTab, setActiveSubTab] = useState(initialTab);
  const [toast, setToast] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // Day Closing States
  const [closingDate, setClosingDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [summaryData, setSummaryData] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [openingCashInput, setOpeningCashInput] = useState("");
  const [counts, setCounts] = useState({
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    1: 0,
  });
  const [cashierNotes, setCashierNotes] = useState("");
  const [savingClosing, setSavingClosing] = useState(false);
  const [showZReportModal, setShowZReportModal] = useState(false);
  const [activeZReport, setActiveZReport] = useState(null);
  const [closingHistory, setClosingHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const companyId =
    localStorage.getItem("selected_company_id") ||
    localStorage.getItem("company_id") ||
    "";

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch Day Closing summary
  const fetchDaySummary = async (date = closingDate) => {
    if (!companyId) return;
    setLoadingSummary(true);
    try {
      const res = await api.get("/day-closing/summary", {
        params: { company_id: companyId, date },
      });
      if (res.data && res.data.status) {
        setSummaryData(res.data);
        if (openingCashInput === "" || openingCashInput === null) {
          setOpeningCashInput(String(res.data.opening_cash ?? 0));
        }
        if (res.data.closing?.denominations) {
          setCounts((prev) => ({ ...prev, ...res.data.closing.denominations }));
          if (res.data.closing.notes) setCashierNotes(res.data.closing.notes);
        }
      }
    } catch (err) {
      console.error(err);
      showToast(isTamil ? "கணக்கு விவரங்களை ஏற்றுவதில் பிழை!" : "Failed to load day summary!", "error");
    } finally {
      setLoadingSummary(false);
    }
  };

  // Fetch Closing History
  const fetchClosingHistory = async () => {
    if (!companyId) return;
    setLoadingHistory(true);
    try {
      const res = await api.get("/day-closing/history", {
        params: { company_id: companyId },
      });
      if (res.data && res.data.status) {
        setClosingHistory(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === "day-closing") {
      fetchDaySummary(closingDate);
      fetchClosingHistory();
    }
  }, [activeSubTab, closingDate, companyId]);

  // Denominations Total
  const totalCountedCash = useMemo(() => {
    return Object.entries(counts).reduce((sum, [denom, count]) => {
      return sum + Number(denom) * (Number(count) || 0);
    }, 0);
  }, [counts]);

  // Expected Cash
  const effectiveOpeningCash = Number(openingCashInput) || 0;
  const expectedCash = useMemo(() => {
    if (!summaryData) return 0;
    const cashSales = Number(summaryData.cash_sales) || 0;
    const cashRefunds = Number(summaryData.cash_refunds) || 0;
    const cashExpenses = Number(summaryData.cash_expenses) || 0;
    return effectiveOpeningCash + cashSales - cashRefunds - cashExpenses;
  }, [summaryData, effectiveOpeningCash]);

  // Discrepancy
  const discrepancy = useMemo(() => {
    return Math.round((totalCountedCash - expectedCash) * 100) / 100;
  }, [totalCountedCash, expectedCash]);

  // Handle Count Change
  const handleCountChange = (denom, val) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setCounts((prev) => ({ ...prev, [denom]: num }));
  };

  // Handle Backup Export
  const handleDownloadBackup = async () => {
    setIsExporting(true);
    try {
      const response = await api.get(`/backup/export?company_id=${companyId}`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const todayStr = new Date().toISOString().replace(/[:.]/g, "-");
      link.download = `PaySplitX_Backup_${todayStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      const nowFormatted = new Date().toLocaleString();
      setSetting("last_backup_date", nowFormatted);

      showToast(
        isTamil
          ? `✅ முழு பேக்கப் வெற்றிகரமாக டவுன்லோட் செய்யப்பட்டது! (${nowFormatted})`
          : `✅ Full system backup downloaded successfully! (${nowFormatted})`,
        "success"
      );
    } catch (err) {
      console.error(err);
      showToast(
        isTamil ? "❌ பேக்கப் பதிவிறக்குவதில் தோல்வி!" : "❌ Failed to download backup!",
        "error"
      );
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Save Day Closing
  const handleCloseDay = async () => {
    setSavingClosing(true);
    try {
      const cashierName =
        localStorage.getItem("user_name") ||
        localStorage.getItem("admin_name") ||
        "Cashier";

      const res = await api.post("/day-closing/save", {
        company_id: companyId,
        closing_date: closingDate,
        cashier_name: cashierName,
        opening_cash: effectiveOpeningCash,
        actual_cash: totalCountedCash,
        denominations: counts,
        notes: cashierNotes,
      });

      if (res.data && res.data.status) {
        showToast(
          isTamil
            ? `✅ கல்லா கணக்கு வெற்றிகரமாக முடிக்கப்பட்டது! (${res.data.data.z_report_no})`
            : `✅ Day-End Closing completed! (${res.data.data.z_report_no})`,
          "success"
        );
        setActiveZReport(res.data.data);
        setShowZReportModal(true);
        fetchDaySummary(closingDate);
        fetchClosingHistory();
      } else {
        showToast(res.data?.message || "Failed to save closing", "error");
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Server error while saving closing", "error");
    } finally {
      setSavingClosing(false);
    }
  };

  return (
    <SettingsShell
      title={isTamil ? "வரி & பேக்கப் அமைப்புகள்" : "Tax & Backup Settings"}
      subtitle={
        isTamil
          ? "பில்லிங் வரி முறை (Inclusive / Exclusive), முழு பேக்கப் டவுன்லோட் மற்றும் நாள் முடிவில் கல்லா கணக்கு (Z-Report)."
          : "Default Tax Mode (Inclusive / Exclusive), one-click system data backup, and Day-End cash drawer tally (Z-Report)."
      }
      badgeText="Tax & Backup"
      badgeColor="emerald"
    >
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-sm font-bold text-white transition-all transform animate-bounce ${
            toast.type === "error" ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          {toast.type === "error" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Sub Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-6 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveSubTab("tax-mode")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === "tax-mode"
              ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
          }`}
        >
          <Coins size={14} />
          <span>{isTamil ? "1. இயல்புநிலை வரி முறை (Tax Mode)" : "1. Default Tax Mode"}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("backup")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === "backup"
              ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
          }`}
        >
          <Database size={14} />
          <span>{isTamil ? "2. முழு பேக்கப் (One-Click Backup)" : "2. System Backup"}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("day-closing")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === "day-closing"
              ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
          }`}
        >
          <Receipt size={14} />
          <span>{isTamil ? "3. கல்லா கணக்கு & Z-Report (Day Closing)" : "3. Day-End Closing & Z-Report"}</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SUB-TAB 1: DEFAULT TAX MODE
      ───────────────────────────────────────────────────────────── */}
      {activeSubTab === "tax-mode" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Coins size={16} className="text-emerald-600" />
                <span>{isTamil ? "பில்லிங் இயல்புநிலை வரி முறை (Default Tax Mode)" : "Default Billing Tax Mode"}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {isTamil
                  ? "பொருட்களின் விற்பனை விலையில் GST வரியை உள்ளடக்கியா (MRP முறை) அல்லது தனித்துவமாக கூட்ட வேண்டுமா என தேர்வு செய்யவும்."
                  : "Choose whether item prices entered on bills already include GST (MRP Inclusive) or GST should be added on top (Exclusive)."}
              </p>
            </div>

            {/* Interactive Mode Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option A: Tax Inclusive */}
              <div
                onClick={() => setSetting("default_tax_mode", "inclusive")}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                  settings.default_tax_mode === "inclusive"
                    ? "border-emerald-500 bg-emerald-50/40 shadow-md shadow-emerald-900/5 ring-2 ring-emerald-500/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        settings.default_tax_mode === "inclusive"
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-slate-300"
                      }`}
                    >
                      {settings.default_tax_mode === "inclusive" && <Check size={12} strokeWidth={3} />}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-800 block">
                        {isTamil ? "வரி உட்பட (Tax Inclusive / with_gst)" : "Tax Inclusive (with_gst)"}
                      </span>
                      <span className="text-[11px] text-emerald-700 font-semibold">
                        {isTamil ? "சில்லறை விற்பனை & சூப்பர் மார்க்கெட் முறை (MRP)" : "Recommended for Retail & Supermarkets"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Visual calculation box */}
                <div className="mt-4 p-3 bg-white/90 rounded-xl border border-emerald-200/80 text-xs space-y-1.5 font-mono">
                  <div className="text-[11px] font-bold text-slate-700 pb-1 border-b border-slate-100 flex items-center justify-between">
                    <span>{isTamil ? "கணக்கீடு மாதிரி (Sample):" : "Calculation Example:"}</span>
                    <span className="text-emerald-600 font-bold">{isTamil ? "வாடிக்கையாளர் தருவது: ₹100" : "Customer Pays: ₹100"}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>{isTamil ? "பொருள் விலை (MRP):" : "Entered Price:"}</span>
                    <span className="font-bold">₹100.00</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>{isTamil ? "அடக்க அடிப்படை (Base):" : "Base Taxable:"}</span>
                    <span>₹84.75</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>{isTamil ? "ஜிஎஸ்டி (18% GST அடக்கம்):" : "Embedded GST (18%):"}</span>
                    <span>+ ₹15.25</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold pt-1 border-t border-slate-100">
                    <span>{isTamil ? "மொத்த பில் தொகை:" : "Net Bill Total:"}</span>
                    <span className="text-emerald-700">₹100.00</span>
                  </div>
                </div>
              </div>

              {/* Option B: Tax Exclusive */}
              <div
                onClick={() => setSetting("default_tax_mode", "exclusive")}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                  settings.default_tax_mode === "exclusive"
                    ? "border-emerald-500 bg-emerald-50/40 shadow-md shadow-emerald-900/5 ring-2 ring-emerald-500/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        settings.default_tax_mode === "exclusive"
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-slate-300"
                      }`}
                    >
                      {settings.default_tax_mode === "exclusive" && <Check size={12} strokeWidth={3} />}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-800 block">
                        {isTamil ? "வரி தனியாக (Tax Exclusive / without_gst)" : "Tax Exclusive (without_gst)"}
                      </span>
                      <span className="text-[11px] text-blue-700 font-semibold">
                        {isTamil ? "மொத்த வியாபாரம் & B2B முறை" : "Standard for Wholesale & B2B Invoices"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Visual calculation box */}
                <div className="mt-4 p-3 bg-white/90 rounded-xl border border-slate-200 text-xs space-y-1.5 font-mono">
                  <div className="text-[11px] font-bold text-slate-700 pb-1 border-b border-slate-100 flex items-center justify-between">
                    <span>{isTamil ? "கணக்கீடு மாதிரி (Sample):" : "Calculation Example:"}</span>
                    <span className="text-blue-600 font-bold">{isTamil ? "வாடிக்கையாளர் தருவது: ₹118" : "Customer Pays: ₹118"}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>{isTamil ? "அடிப்படை விலை (Base Rate):" : "Base Unit Rate:"}</span>
                    <span className="font-bold">₹100.00</span>
                  </div>
                  <div className="flex justify-between text-blue-600 font-semibold">
                    <span>{isTamil ? "கூடுதல் ஜிஎஸ்டி (+18% GST):" : "Extra GST (18%):"}</span>
                    <span>+ ₹18.00</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold pt-1 border-t border-slate-100">
                    <span>{isTamil ? "மொத்த பில் தொகை:" : "Net Bill Total:"}</span>
                    <span className="text-blue-700">₹118.00</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Toggles */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <Toggle
                label={
                  isTamil
                    ? "பில்லிங் திரையில் வரி முறையை மாற்ற கேஷியருக்கு அனுமதி (Allow Cashier Tax Toggle on POS)"
                    : "Allow Cashier to Toggle Tax Mode on POS Billing Screen"
                }
                subtitle={
                  isTamil
                    ? "கேஷியர் பில்லிங் செய்யும் போது கார்ட்டின் மேல் உள்ள பொத்தான் மூலம் அந்த பில்லுக்கு மட்டும் வரி முறையை மாற்றிக்கொள்ளலாம்."
                    : "Shows an interactive toggle badge on the POS cart bar so cashiers can switch pricing mode per transaction if required."
                }
                checked={settings.allow_cashier_tax_toggle}
                onChange={(checked) => setSetting("allow_cashier_tax_toggle", checked)}
              />

              <Toggle
                label={
                  isTamil
                    ? "பட்டியலில் இல்லாத புதிய பொருட்களுக்கு தானாகப் பொருத்து (Apply to Unlisted / Quick Items)"
                    : "Apply Default Tax Mode to Custom / Unlisted Items"
                }
                subtitle={
                  isTamil
                    ? "பார்-கோடு அல்லது புதிய பொருள் சேர்க்கும் போது இந்த வரி முறை தானாக தேர்ந்தெடுக்கப்படும்."
                    : "Custom and non-catalog products added to bills automatically adopt the selected tax mode."
                }
                checked={settings.apply_to_unlisted_items}
                onChange={(checked) => setSetting("apply_to_unlisted_items", checked)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUB-TAB 2: ONE-CLICK BACKUP DOWNLOAD
      ───────────────────────────────────────────────────────────── */}
      {activeSubTab === "backup" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Database size={16} className="text-emerald-600" />
                  <span>{isTamil ? "ஒரே கிளிக்கில் முழு டேட்டா பேக்கப் (One-Click Backup Download)" : "One-Click System Data Backup"}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {isTamil
                    ? "உங்கள் கடையின் மொத்த தயாரிப்புகள், பில்கள், வாடிக்கையாளர்கள் மற்றும் கணக்கு விவரங்களை ஒரே கிளிக்கில் பாதுகாப்பாக டவுன்லோட் செய்யுங்கள்."
                    : "Instantly export and download your entire store database, catalog, invoices, day books, and settings in portable JSON format."}
                </p>
              </div>

              <button
                type="button"
                disabled={isExporting}
                onClick={handleDownloadBackup}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:from-emerald-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 shadow-md shadow-emerald-700/20 transition cursor-pointer flex-shrink-0 disabled:opacity-60"
              >
                {isExporting ? (
                  <RotateCcw size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                <span>
                  {isExporting
                    ? isTamil ? "பதிவிறக்கம் செய்யப்படுகிறது..." : "Generating Backup..."
                    : isTamil ? "முழு பேக்கப் டவுன்லோட் செய்" : "Download Full System Backup"}
                </span>
              </button>
            </div>

            {/* Last Backup Banner */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    {isTamil ? "கடைசியாக பேக்கப் எடுத்த நேரம்:" : "Last Backup Timestamp:"}
                  </span>
                  <span className="text-[11px] text-slate-600">
                    {settings.last_backup_date || (isTamil ? "இதுவரை பேக்கப் எடுக்கப்படவில்லை" : "No backup downloaded yet")}
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                JSON v2.0
              </span>
            </div>

            {/* Data Contents Included */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                {isTamil ? "பேக்கப்பில் உள்ளடக்கப்படும் தகவல்கள்:" : "Data Included in Backup:"}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { title: isTamil ? "தயாரிப்புகள் & இருப்பு" : "Products & Stock", desc: "Catalog, barcodes, prices", icon: <Layers size={14} /> },
                  { title: isTamil ? "விற்பனை பில்கள் & வரவு" : "Invoices & Payments", desc: "Sales, taxes, items", icon: <Receipt size={14} /> },
                  { title: isTamil ? "வாடிக்கையாளர் & சப்ளையர்" : "Parties & Contacts", desc: "Profiles, credit ledger", icon: <Building2 size={14} /> },
                  { title: isTamil ? "பர்ச்சேஸ் & செலவுகள்" : "Purchases & Expenses", desc: "Supplier bills, payouts", icon: <TrendingUp size={14} /> },
                  { title: isTamil ? "கல்லா கணக்கு (Z-Reports)" : "Day Closings", desc: "Cash drawer history", icon: <Clock size={14} /> },
                  { title: isTamil ? "கடையின் முழு அமைப்புகள்" : "Company Settings", desc: "Tax, print, security, setup", icon: <Sliders size={14} /> },
                ].map((item, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 transition">
                    <div className="flex items-center gap-2 text-slate-700 font-bold text-xs mb-1">
                      <span className="text-emerald-600">{item.icon}</span>
                      <span>{item.title}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <Toggle
                label={
                  isTamil
                    ? "நாள் முடிவில் பேக்கப் எடுக்க நினைவூட்டு (Remind to Backup on Day-End Closing)"
                    : "Remind to Download Backup on Day-End Closing"
                }
                subtitle={
                  isTamil
                    ? "கடையை மூடும் போது கேஷியருக்கு பேக்கப் எடுக்க நினைவூட்டல் அட்டையைக் காட்டும்."
                    : "Displays a friendly prompt to download system backup before submitting daily Z-Report."
                }
                checked={settings.auto_backup_reminder}
                onChange={(checked) => setSetting("auto_backup_reminder", checked)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUB-TAB 3: DAY-END CLOSING & Z-REPORT
      ───────────────────────────────────────────────────────────── */}
      {activeSubTab === "day-closing" && (
        <div className="space-y-6">
          {/* Top Bar: Date & Status */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-sm">
                <Receipt size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {isTamil ? "கல்லாப்பெட்டி கணக்கு முடித்தல் (Day-End Closing / Z-Report)" : "Cash Drawer Closing & Z-Report"}
                </h3>
                <span className="text-xs text-slate-500">
                  {isTamil ? "அன்றைய ரொக்க விற்பனை மற்றும் ரூபாய் நோட்டுக்களை கணக்கிட்டு Z-Report உருவாக்குதல்." : "Reconcile daily cash in drawer against POS sales & generate Z-Report."}
                </span>
              </div>
            </div>

            {/* Date Picker & Refresh */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="date"
                  value={closingDate}
                  onChange={(e) => setClosingDate(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="button"
                onClick={() => fetchDaySummary(closingDate)}
                disabled={loadingSummary}
                title={isTamil ? "புதுப்பி" : "Refresh"}
                className="p-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl text-slate-600 transition cursor-pointer"
              >
                <RotateCcw size={16} className={loadingSummary ? "animate-spin" : ""} />
              </button>

              {summaryData?.is_closed && (
                <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  <span>{isTamil ? "நாள் முடிந்தது (Closed)" : "Closed"}</span>
                </span>
              )}
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. Opening Cash */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                {isTamil ? "தொடக்க ரொக்கம் (Float)" : "Opening Cash"}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  value={openingCashInput}
                  onChange={(e) => setOpeningCashInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-base font-extrabold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <span className="text-[9px] text-slate-400 block">{isTamil ? "கல்லா இருப்பு" : "Drawer float"}</span>
            </div>

            {/* 2. Cash Sales */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                {isTamil ? "ரொக்க விற்பனை" : "Cash Sales"}
              </span>
              <div className="text-base font-extrabold text-emerald-600">
                ₹{Number(summaryData?.cash_sales || 0).toFixed(2)}
              </div>
              <span className="text-[9px] text-emerald-700/80 block">
                {summaryData?.invoices_count || 0} {isTamil ? "பில்கள்" : "Bills"}
              </span>
            </div>

            {/* 3. UPI / Digital Sales */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                {isTamil ? "UPI / QR விற்பனை" : "UPI / QR Sales"}
              </span>
              <div className="text-base font-extrabold text-indigo-600">
                ₹{Number(summaryData?.upi_sales || 0).toFixed(2)}
              </div>
              <span className="text-[9px] text-slate-400 block">{isTamil ? "நேரடி வங்கி" : "Digital"}</span>
            </div>

            {/* 4. Card / Bank Sales */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                {isTamil ? "கார்டு / வங்கி" : "Card / Bank"}
              </span>
              <div className="text-base font-extrabold text-blue-600">
                ₹{(Number(summaryData?.card_sales || 0) + Number(summaryData?.bank_sales || 0)).toFixed(2)}
              </div>
              <span className="text-[9px] text-slate-400 block">{isTamil ? "கார்டு ஸ்வைப்" : "POS / Bank"}</span>
            </div>

            {/* 5. Cash Outflow (Refunds + Expenses) */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                {isTamil ? "ரொக்க வெளியேற்றம்" : "Cash Outflow"}
              </span>
              <div className="text-base font-extrabold text-rose-600">
                ₹{(Number(summaryData?.cash_refunds || 0) + Number(summaryData?.cash_expenses || 0)).toFixed(2)}
              </div>
              <span className="text-[9px] text-slate-400 block">
                {isTamil ? "செலவுகள் & ரீஃபண்ட்" : "Expenses/Refunds"}
              </span>
            </div>

            {/* 6. Expected Cash in Drawer */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-3.5 rounded-2xl shadow-md space-y-1">
              <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wide block">
                {isTamil ? "எதிர்பார்க்கப்படும் ரொக்கம்" : "Expected Cash"}
              </span>
              <div className="text-base font-black text-white">
                ₹{expectedCash.toFixed(2)}
              </div>
              <span className="text-[9px] text-indigo-200/70 block">{isTamil ? "கல்லாவில் இருக்க வேண்டியது" : "Must be in drawer"}</span>
            </div>
          </div>

          {/* Main Reconciliation Section: Denominations & Tally */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Currency Denominations Counter (7 Cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <Wallet size={15} className="text-emerald-600" />
                    <span>{isTamil ? "ரூபாய் நோட்டுக்கள் கணக்கீடு (Cash Denominations Counter)" : "Physical Cash Denomination Counter"}</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    {isTamil ? "கல்லாவில் உள்ள நோட்டுக்களின் எண்ணிக்கையை உள்ளிடவும்." : "Count and enter the quantity of each currency denomination in drawer."}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCounts({ 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 1: 0 })}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw size={11} />
                  <span>{isTamil ? "ரீசெட்" : "Reset"}</span>
                </button>
              </div>

              {/* Denomination rows */}
              <div className="space-y-2">
                {DENOMINATIONS.map((d) => {
                  const qty = counts[d.value] || 0;
                  const rowTotal = d.value * qty;
                  return (
                    <div
                      key={d.value}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 hover:bg-slate-100/70 transition border border-slate-200/60"
                    >
                      <div className="w-24 flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-slate-200 text-slate-800">
                          ₹{d.value}
                        </span>
                        <span className="text-xs font-bold text-slate-700">{d.label.split(" ")[1] || ""}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">×</span>
                        <input
                          type="number"
                          min="0"
                          value={qty === 0 ? "" : qty}
                          placeholder="0"
                          onChange={(e) => handleCountChange(d.value, e.target.value)}
                          className="w-20 text-center py-1 bg-white border border-slate-300 rounded-lg text-xs font-extrabold text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="w-28 text-right font-mono font-bold text-xs text-slate-800">
                        = ₹{rowTotal.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cashier Notes */}
              <div className="pt-2">
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  {isTamil ? "கேஷியர் / மேலாளர் குறிப்புகள் (Closing Notes):" : "Cashier / Manager Closing Notes:"}
                </label>
                <textarea
                  rows={2}
                  value={cashierNotes}
                  onChange={(e) => setCashierNotes(e.target.value)}
                  placeholder={
                    isTamil
                      ? "நாள் முடிவு பற்றிய விபரங்கள் அல்லது வேறுபாட்டிற்கான காரணம்..."
                      : "Shift notes, discrepancy explanations or cash deposit notes..."
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>

            {/* Right: Reconciliation & Action (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {/* Tally Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 flex-1">
                <h4 className="text-xs font-bold text-slate-800 pb-2 border-b border-slate-100 flex items-center justify-between">
                  <span>{isTamil ? "கல்லா ஒப்புமை சுருக்கம் (Tally Summary)" : "Drawer Reconciliation"}</span>
                  <Badge text="End of Day" color="slate" />
                </h4>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                    <span>{isTamil ? "எதிர்பார்க்கப்படும் ரொக்கம்:" : "Expected Cash in Drawer:"}</span>
                    <span className="font-bold font-mono text-slate-900">₹{expectedCash.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                    <span>{isTamil ? "எண்ணப்பட்ட மொத்த ரொக்கம்:" : "Total Counted Cash:"}</span>
                    <span className="font-extrabold font-mono text-emerald-700 text-sm">
                      ₹{totalCountedCash.toFixed(2)}
                    </span>
                  </div>

                  {/* Discrepancy Box */}
                  <div
                    className={`p-4 rounded-xl border flex items-center justify-between ${
                      discrepancy === 0
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : discrepancy < 0
                        ? "bg-rose-50 border-rose-200 text-rose-900"
                        : "bg-blue-50 border-blue-200 text-blue-900"
                    }`}
                  >
                    <div>
                      <span className="text-[11px] font-bold block uppercase tracking-wide">
                        {discrepancy === 0
                          ? isTamil ? "வித்தியாசம் (சரியானது):" : "Difference (Exact Match):"
                          : discrepancy < 0
                          ? isTamil ? "பற்றாக்குறை (Shortage):" : "Shortage (Deficit):"
                          : isTamil ? "கூடுதல் ரொக்கம் (Excess):" : "Excess (Overage):"}
                      </span>
                      <span className="text-xs opacity-80">
                        {discrepancy === 0
                          ? isTamil ? "கல்லா துல்லியமாகப் பொருந்துகிறது" : "Drawer tally matches 100%"
                          : discrepancy < 0
                          ? isTamil ? "கல்லாவில் ரொக்கம் குறைவாக உள்ளது" : "Counted cash is less than expected"
                          : isTamil ? "கல்லாவில் ரொக்கம் அதிகமாக உள்ளது" : "Counted cash is more than expected"}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-black font-mono">
                        {discrepancy > 0 ? `+₹${discrepancy.toFixed(2)}` : `₹${discrepancy.toFixed(2)}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Close Day Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={savingClosing || totalCountedCash === 0}
                    onClick={handleCloseDay}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:from-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20 transition cursor-pointer disabled:opacity-50"
                  >
                    {savingClosing ? (
                      <RotateCcw size={15} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={15} />
                    )}
                    <span>
                      {isTamil ? "கல்லா கணக்கு முடி & Z-Report உருவாக்கு" : "Close Day & Generate Z-Report"}
                    </span>
                  </button>
                </div>
              </div>

              {/* View Current Z-Report if closed */}
              {summaryData?.closing && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveZReport({
                      ...summaryData.closing,
                      closing_date: closingDate,
                      total_sales: summaryData.total_sales,
                      invoices_count: summaryData.invoices_count,
                      cash_sales: summaryData.cash_sales,
                      upi_sales: summaryData.upi_sales,
                      card_sales: summaryData.card_sales,
                      bank_sales: summaryData.bank_sales,
                      credit_sales: summaryData.credit_sales,
                      cash_refunds: summaryData.cash_refunds,
                      cash_expenses: summaryData.cash_expenses,
                    });
                    setShowZReportModal(true);
                  }}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Printer size={14} />
                  <span>{isTamil ? "இன்றைய Z-Report பிரிண்ட் செய் (Print Z-Report)" : "Print Today's Z-Report"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Past Closings History Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <History size={15} className="text-slate-600" />
                <span>{isTamil ? "முந்தைய Z-Report வரலாறு (Past Z-Reports)" : "Past Day-End Closings"}</span>
              </h4>
              <button
                type="button"
                onClick={fetchClosingHistory}
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw size={11} className={loadingHistory ? "animate-spin" : ""} />
                <span>{isTamil ? "புதுப்பி" : "Refresh History"}</span>
              </button>
            </div>

            {closingHistory.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                {isTamil ? "இதுவரை முந்தைய Z-Report பதிவுகள் இல்லை." : "No previous Z-Report entries found."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold">
                      <th className="py-2.5 px-3">{isTamil ? "தேதி" : "Date"}</th>
                      <th className="py-2.5 px-3">Z-Report #</th>
                      <th className="py-2.5 px-3">{isTamil ? "கேஷியர்" : "Cashier"}</th>
                      <th className="py-2.5 px-3 text-right">{isTamil ? "எதிர்பார்த்தது" : "Expected"}</th>
                      <th className="py-2.5 px-3 text-right">{isTamil ? "எண்ணியது" : "Counted"}</th>
                      <th className="py-2.5 px-3 text-right">{isTamil ? "வித்தியாசம்" : "Discrepancy"}</th>
                      <th className="py-2.5 px-3 text-center">{isTamil ? "செயல்" : "Action"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {closingHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 font-semibold text-slate-700">{item.closing_date}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{item.z_report_no}</td>
                        <td className="py-2.5 px-3 text-slate-600">{item.cashier_name || "Cashier"}</td>
                        <td className="py-2.5 px-3 text-right font-mono">₹{Number(item.expected_cash || 0).toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{Number(item.actual_cash || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              Number(item.discrepancy) === 0
                                ? "bg-emerald-100 text-emerald-800"
                                : Number(item.discrepancy) < 0
                                ? "bg-rose-100 text-rose-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {Number(item.discrepancy) > 0 ? `+₹${Number(item.discrepancy).toFixed(2)}` : `₹${Number(item.discrepancy).toFixed(2)}`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveZReport(item);
                              setShowZReportModal(true);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                          >
                            <Printer size={11} />
                            <span>{isTamil ? "காண்" : "Print"}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          PRINTABLE 80MM Z-REPORT MODAL
      ───────────────────────────────────────────────────────────── */}
      {showZReportModal && activeZReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-emerald-400" />
                <span className="font-bold text-sm">Z-Report: {activeZReport.z_report_no}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowZReportModal(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition cursor-pointer text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Printable Area (80mm Mockup) */}
            <div className="p-6 bg-slate-50 overflow-y-auto max-h-[70vh]">
              <div
                id="z-report-print-target"
                className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 font-mono text-[11px] text-black leading-tight space-y-3"
              >
                {/* Store Header */}
                <div className="text-center border-b border-black pb-2 space-y-1">
                  <div className="font-extrabold text-sm uppercase tracking-wide">
                    {summaryData?.company_name || "PAYSPLITX STORE"}
                  </div>
                  <div className="text-[10px] text-slate-600 font-bold">
                    DAY-END CASH DRAWER Z-REPORT
                  </div>
                  <div className="text-[10px]">
                    No: <strong>{activeZReport.z_report_no}</strong>
                  </div>
                  <div className="text-[10px] text-slate-600">
                    Date: {activeZReport.closing_date} · Closed: {activeZReport.closed_at ? new Date(activeZReport.closed_at).toLocaleTimeString() : "End of Day"}
                  </div>
                  <div className="text-[10px]">
                    Cashier: <strong>{activeZReport.cashier_name || "Admin"}</strong>
                  </div>
                </div>

                {/* Sales Summary */}
                <div className="space-y-1 border-b border-dashed border-black pb-2">
                  <div className="font-bold uppercase tracking-wider text-[10px] text-slate-700">SALES SUMMARY</div>
                  <div className="flex justify-between">
                    <span>Total Invoices Count:</span>
                    <span className="font-bold">{activeZReport.invoices_count || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Gross Sales:</span>
                    <span className="font-bold">₹{Number(activeZReport.total_sales || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>  • Cash Sales Collected:</span>
                    <span>₹{Number(activeZReport.cash_sales || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>  • UPI / QR Collections:</span>
                    <span>₹{Number(activeZReport.upi_sales || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>  • Card / POS Swipes:</span>
                    <span>₹{Number(activeZReport.card_sales || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>  • Bank Transfers:</span>
                    <span>₹{Number(activeZReport.bank_sales || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>  • Credit / Pending:</span>
                    <span>₹{Number(activeZReport.credit_sales || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Cash Drawer Reconciliation */}
                <div className="space-y-1 border-b border-black pb-2">
                  <div className="font-bold uppercase tracking-wider text-[10px] text-slate-700">CASH DRAWER TALLY</div>
                  <div className="flex justify-between">
                    <span>Opening Float:</span>
                    <span>₹{Number(activeZReport.opening_cash || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>(+) Cash Inflows:</span>
                    <span>+₹{Number(activeZReport.cash_sales || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-rose-700">
                    <span>(-) Cash Expenses:</span>
                    <span>-₹{Number(activeZReport.cash_expenses || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-rose-700">
                    <span>(-) Cash Refunds:</span>
                    <span>-₹{Number(activeZReport.cash_refunds || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1 border-t border-dotted border-black">
                    <span>EXPECTED DRAWER CASH:</span>
                    <span>₹{Number(activeZReport.expected_cash || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-black text-xs pt-1 border-t border-black">
                    <span>PHYSICAL COUNTED CASH:</span>
                    <span>₹{Number(activeZReport.actual_cash || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-xs pt-1">
                    <span>DISCREPANCY (STATUS):</span>
                    <span className={Number(activeZReport.discrepancy) < 0 ? "text-rose-700" : Number(activeZReport.discrepancy) > 0 ? "text-blue-700" : "text-emerald-700"}>
                      {Number(activeZReport.discrepancy) === 0
                        ? "EXACT MATCH (₹0.00)"
                        : Number(activeZReport.discrepancy) < 0
                        ? `SHORT (-₹${Math.abs(Number(activeZReport.discrepancy)).toFixed(2)})`
                        : `EXCESS (+₹${Number(activeZReport.discrepancy).toFixed(2)})`}
                    </span>
                  </div>
                </div>

                {/* Denominations table */}
                {activeZReport.denominations && Object.keys(activeZReport.denominations).length > 0 && (
                  <div className="space-y-1 border-b border-dashed border-black pb-2 text-[10px]">
                    <div className="font-bold uppercase tracking-wider text-slate-700">DENOMINATIONS</div>
                    {Object.entries(activeZReport.denominations).map(([denom, q]) => {
                      if (!q || q === 0) return null;
                      return (
                        <div key={denom} className="flex justify-between">
                          <span>₹{denom} × {q}</span>
                          <span>₹{(Number(denom) * Number(q)).toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Notes */}
                {activeZReport.notes && (
                  <div className="text-[10px] text-slate-600 border-b border-dotted border-black pb-2">
                    <strong>Notes:</strong> {activeZReport.notes}
                  </div>
                )}

                {/* Signatures */}
                <div className="pt-4 flex justify-between text-[10px] text-center">
                  <div>
                    <div className="border-t border-black w-24 pt-1">Cashier Sign</div>
                  </div>
                  <div>
                    <div className="border-t border-black w-24 pt-1">Manager Sign</div>
                  </div>
                </div>

                <div className="text-center text-[9px] text-slate-500 pt-2">
                  *** END OF Z-REPORT · PAYSPLITX ***
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowZReportModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                {isTamil ? "மூடு" : "Close"}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer size={14} />
                <span>{isTamil ? "பிரிண்ட் செய் (Print)" : "Print Z-Report"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </SettingsShell>
  );
}
