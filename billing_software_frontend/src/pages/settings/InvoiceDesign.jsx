import { useState, useEffect } from "react";
import {
  Palette, Check, Save, Sparkles, Building2, Eye,
  CheckCircle2, AlertCircle, Maximize2, Minimize2, X,
  FileText, Layers, Printer, ZoomIn, ZoomOut
} from "lucide-react";
import api from "../../services/api";
import { useSettings } from "./SettingsContext";
import { SettingsShell, SettingsCard } from "./settingsUI";
import { DESIGN_COMPONENTS } from "../billing/Invoice";

/* ─── REALISTIC SAMPLE INVOICE DATA FOR LIVE PREVIEW ───────────────────────── */
export const SAMPLE_INVOICE = {
  invoice_no: "INV-2026-0001",
  created_at: new Date().toISOString(),
  invoice_date: new Date().toISOString(),
  due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
  customer_name: "Sri Murugan Traders",
  customer_phone: "+91 98765 43210",
  billing_address: "124, Cross Cut Road, Gandhipuram, Coimbatore - 641012",
  customer_gstin: "33AAAAA0000A1Z5",
  payment_type: "Cash",
  payment_method: "Cash",
  invoice_type: "Tax Invoice",
  gst_type: "with_gst",
  status: "paid",
  products: [
    {
      product_name: "Premium Cotton Shirting Fabric",
      name: "Premium Cotton Shirting Fabric",
      product_code: "5208",
      qty: 2,
      price: 500,
      gst: 18,
      tax_percent: 18,
      amount: 1000,
      tax_amount: 180
    },
    {
      product_name: "Silk Zari Border Dhotis (Pack of 2)",
      name: "Silk Zari Border Dhotis (Pack of 2)",
      product_code: "5007",
      qty: 1,
      price: 300,
      gst: 12,
      tax_percent: 12,
      amount: 300,
      tax_amount: 36
    },
    {
      product_name: "Linen Formal Casual Material",
      name: "Linen Formal Casual Material",
      product_code: "5309",
      qty: 1,
      price: 200,
      gst: 5,
      tax_percent: 5,
      amount: 200,
      tax_amount: 10
    }
  ],
  sub_total: 1500,
  tax_amount: 226,
  gst_total: 226,
  total_amount: 1726,
  paid_amount: 1726,
  balance_amount: 0,
  terms_conditions: "1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged for delayed payments.\n3. Subject to Coimbatore Jurisdiction."
};

/* ─── THEME OPTIONS (SIMPLIFIED & CLEAN) ──────────────────────────────────── */
export const THEME_OPTIONS = [
  {
    id: "tally",
    label: "Tally Theme",
    category: "Classic",
    badge: "Standard",
    icon: "📄"
  },
  {
    id: "gst1",
    label: "GST Theme 1",
    category: "Modern GST",
    badge: "Corporate",
    icon: "📊"
  },
  {
    id: "gst3",
    label: "GST Theme 3",
    category: "Minimal GST",
    badge: "Boxed",
    icon: "📑"
  },
  {
    id: "double_divine",
    label: "Double Divine",
    category: "Premium",
    badge: "Curved Header",
    icon: "🎨"
  },
  {
    id: "french_elite",
    label: "French Elite",
    category: "Classic",
    badge: "Clean",
    icon: "🏛️"
  },
  {
    id: "pos",
    label: "POS Thermal Receipt",
    category: "Retail",
    badge: "80mm Roll",
    icon: "🧾"
  },
  {
    id: "vintage_classic",
    label: "Vintage Classic",
    category: "Vintage",
    badge: "Traditional",
    icon: "📜"
  },
  {
    id: "vintage_bold",
    label: "Vintage Bold",
    category: "Vintage",
    badge: "High Contrast",
    icon: "📜"
  },
];

/* ─── 18 VIBRANT COLOR SWATCHES ────────────────────────────────────────────── */
export const PALETTE_COLORS = [
  { hex: "#2563eb", name: "Royal Blue" },
  { hex: "#1f8cff", name: "Bright Blue" },
  { hex: "#0284c7", name: "Sky Blue" },
  { hex: "#0d9488", name: "Teal" },
  { hex: "#16a34a", name: "Emerald Green" },
  { hex: "#65a30d", name: "Olive Green" },
  { hex: "#84cc16", name: "Lime Green" },
  { hex: "#6366f1", name: "Indigo" },
  { hex: "#a855f7", name: "Violet" },
  { hex: "#9333ea", name: "Purple" },
  { hex: "#ec4899", name: "Hot Pink" },
  { hex: "#f43f5e", name: "Rose" },
  { hex: "#dc2626", name: "Crimson Red" },
  { hex: "#d97706", name: "Warm Amber" },
  { hex: "#b45309", name: "Ochre" },
  { hex: "#78350f", name: "Warm Brown" },
  { hex: "#4b5563", name: "Slate Gray" },
  { hex: "#0f172a", name: "Midnight Navy" }
];

export default function InvoiceDesign() {
  const { setSettingsTab } = useSettings();

  const [companyId, setCompanyId] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      if (u && u.company_id) return u.company_id;
      const sel = localStorage.getItem("selected_company_id");
      if (sel && /^\d+$/.test(sel)) return Number(sel);
    } catch {
      /* ignore */
    }
    return 1;
  });

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [selectedTheme, setSelectedTheme] = useState("tally");
  const [selectedColor, setSelectedColor] = useState("#2563eb");
  const [zoomLevel, setZoomLevel] = useState(78); // Default crisp readable zoom %
  const [serverSettings, setServerSettings] = useState({});
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);

  // Load companies for admin
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const adminId = user?.admin_id || user?.id || 0;
    if (adminId) {
      api.get(`/company/get_companies_by_admin?admin_id=${adminId}&role=${user.role || "admin"}`)
        .then((res) => {
          if (res.data.status && Array.isArray(res.data.data)) {
            setCompanies(res.data.data);
          }
        })
        .catch((err) => console.error("Failed to load companies:", err));
    }
  }, []);

  // Fetch settings for selected company
  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    api.get(`/settings/get?company_id=${companyId}`)
      .then((res) => {
        if (res.data.status && res.data.data) {
          const data = res.data.data || {};
          setServerSettings(data);
          const design = data.invoiceDesign || data.print || {};
          if (design.theme) {
            setSelectedTheme(design.theme);
          } else if (design.template) {
            const map = {
              "Tally Theme": "tally",
              "GST Theme 1": "gst1",
              "GST Theme 2": "gst3",
              "GST Theme 3": "gst3",
              "Double Divine": "double_divine",
              "Minimal Theme": "gst3",
              "french_elite": "french_elite",
              "pos": "pos",
              "vintage_classic": "vintage_classic",
              "vintage_bold": "vintage_bold"
            };
            setSelectedTheme(map[design.template] || design.template.toLowerCase().replace(/\s+/g, "_") || "tally");
          }
          if (design.themeColor) {
            setSelectedColor(design.themeColor);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load invoice design settings:", err);
      })
      .finally(() => setLoading(false));
  }, [companyId]);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setToast(null);

    try {
      const updatedSettings = {
        ...serverSettings,
        invoiceDesign: {
          theme: selectedTheme,
          themeColor: selectedColor,
          updated_at: new Date().toISOString()
        },
        print: {
          ...(serverSettings.print || {}),
          template: selectedTheme,
          theme: selectedTheme,
          themeColor: selectedColor
        }
      };

      const res = await api.post("/settings/save", {
        company_id: companyId,
        settings: updatedSettings
      });

      if (res.data.status) {
        setServerSettings(updatedSettings);
        try {
          localStorage.setItem("invoice_default_theme", selectedTheme);
          localStorage.setItem("invoice_default_color", selectedColor);
        } catch {
          /* ignore */
        }
        setToast({ type: "success", msg: "Default Invoice Theme & Color saved successfully! New bills will automatically use this design." });
        setTimeout(() => setToast(null), 4000);
      } else {
        setToast({ type: "error", msg: res.data.message || "Failed to save settings." });
      }
    } catch (err) {
      console.error(err);
      setToast({ type: "error", msg: err.response?.data?.message || "Server error while saving." });
    } finally {
      setSaving(false);
    }
  };

  const activeThemeObj = THEME_OPTIONS.find((t) => t.id === selectedTheme) || THEME_OPTIONS[0];

  // Active Company Data
  const currentComp = companies.find((c) => c.id === companyId) || {};
  const activeCompany = {
    company_name: currentComp.company_name || "Mahalakshmi Tex & Garments",
    company_address: currentComp.address || "No. 45, Kumaran Road, Tirupur, Tamil Nadu - 641601",
    phone: currentComp.phone || "98765 43210",
    email: currentComp.email || "billing@mahalakshmitex.com",
    gstin: currentComp.gstin || "33ABCDE1234F1Z5",
    bank_name: currentComp.bank_name || "State Bank of India",
    account_no: currentComp.account_no || "30294819284",
    ifsc_code: currentComp.ifsc_code || "SBIN0001234",
    branch_name: currentComp.branch_name || "Tirupur Main Branch",
    logo: currentComp.logo || null
  };

  // Helper to render active theme component
  const renderThemePreview = () => {
    const Component = DESIGN_COMPONENTS[selectedTheme] || DESIGN_COMPONENTS.tally || DESIGN_COMPONENTS.classic;
    if (!Component) return null;
    return (
      <Component
        invoice={SAMPLE_INVOICE}
        company={activeCompany}
        color={selectedColor}
        logoUrl={null}
      />
    );
  };

  const isPOS = selectedTheme === "pos";
  const currentScale = isPOS ? 1.0 : zoomLevel / 100;

  return (
    <SettingsShell
      title="Invoice Design"
      subtitle="DEFAULT INVOICE THEMES, BRAND PALETTE & LIVE PREVIEW"
      icon={<Palette size={22} strokeWidth={2.2} />}
      onClose={() => setSettingsTab && setSettingsTab("general")}
      contentClassName="space-y-5 max-w-[1400px] w-full"
    >
      {/* Toast Notification */}
      {toast && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium transition-all ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-rose-600 flex-shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Top Bar: Company Selector & Quick Save Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Building2 size={20} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Company</div>
            {companies.length > 1 ? (
              <select
                value={companyId}
                onChange={(e) => setCompanyId(Number(e.target.value))}
                className="text-sm font-bold text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer pr-4"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name} (ID: {c.id})
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-sm font-bold text-slate-800">
                {companies[0]?.company_name || "My Company"}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="text-xs text-slate-500 font-medium hidden md:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/70">
            <Sparkles size={14} className="text-blue-500" />
            <span>Saved design applies to all new bills automatically</span>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-5 py-2 rounded-xl font-bold text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm active:scale-95 cursor-pointer flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={15} />
                <span>Save as Default Bill</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid: Left Controls (4 Cols) | Right Big Live Preview (8 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* ── LEFT SIDEBAR: SIMPLIFIED THEMES & ACCENT COLOR (4 COLS) ── */}
        <div className="lg:col-span-4 space-y-4">

          {/* 1. Simplified Theme Selector */}
          <SettingsCard
            title="Select Default Theme"
            headerExtra={
              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                {THEME_OPTIONS.length} Themes
              </span>
            }
          >
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {THEME_OPTIONS.map((theme) => {
                const isSelected = selectedTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setSelectedTheme(theme.id)}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/70 shadow-sm ring-1 ring-blue-500/30"
                        : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/70"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl flex-shrink-0">{theme.icon}</span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold text-slate-900 truncate">
                          {theme.label}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                          {theme.category}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10.5px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md hidden sm:inline-block">
                        {theme.badge}
                      </span>
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-slate-300 bg-white" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </SettingsCard>

          {/* 2. Simplified Color Palette */}
          <SettingsCard
            title="Theme Accent Color"
            headerExtra={
              <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded-md">
                <div className="w-3 h-3 rounded-full" style={{ background: selectedColor }} />
                <span className="font-mono text-[11px] font-bold text-slate-700 uppercase">{selectedColor}</span>
              </div>
            }
          >
            <div className="grid grid-cols-6 gap-2">
              {PALETTE_COLORS.map((col) => {
                const isSelected = selectedColor.toLowerCase() === col.hex.toLowerCase();
                return (
                  <button
                    key={col.hex}
                    type="button"
                    title={col.name}
                    onClick={() => setSelectedColor(col.hex)}
                    style={{ background: col.hex }}
                    className={`h-8 rounded-lg transition-all relative flex items-center justify-center cursor-pointer ${
                      isSelected
                        ? "ring-2 ring-slate-900 ring-offset-2 scale-110 shadow-md z-10"
                        : "hover:scale-105 border border-black/10 opacity-90 hover:opacity-100"
                    }`}
                  >
                    {isSelected && <Check size={13} color="#ffffff" strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </SettingsCard>

        

        </div>

        {/* ── RIGHT AREA: PROMINENT LARGE LIVE BILL PREVIEW (8 COLS) ── */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">

            {/* Header: Theme Info, Scale / Zoom Controls, and Fullscreen Button */}
            <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              
              {/* Left: Active Badge */}
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Live Bill Preview
                </span>
                <span
                  className="text-[11px] font-bold px-2.5 py-0.5 rounded-md text-white shadow-xs"
                  style={{ background: selectedColor }}
                >
                  {activeThemeObj.label}
                </span>
                <span className="text-[11px] text-slate-500 hidden sm:inline-block">
                  ({isPOS ? "Thermal 80mm" : "A4 Standard"})
                </span>
              </div>

              {/* Right: Zoom Level Pointers & Full Preview */}
              <div className="flex items-center gap-2">
                {!isPOS && (
                  <div className="flex items-center bg-white rounded-lg border border-slate-200 p-0.5 text-xs font-medium text-slate-600">
                    <button
                      type="button"
                      onClick={() => setZoomLevel(65)}
                      className={`px-2 py-1 rounded-md transition cursor-pointer ${zoomLevel === 65 ? "bg-slate-900 text-white font-bold" : "hover:bg-slate-100"}`}
                    >
                      65%
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(78)}
                      className={`px-2 py-1 rounded-md transition cursor-pointer ${zoomLevel === 78 ? "bg-slate-900 text-white font-bold" : "hover:bg-slate-100"}`}
                    >
                      78%
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(95)}
                      className={`px-2 py-1 rounded-md transition cursor-pointer ${zoomLevel === 95 ? "bg-slate-900 text-white font-bold" : "hover:bg-slate-100"}`}
                    >
                      95%
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsFullscreenPreview(true)}
                  className="text-xs font-semibold text-slate-700 hover:text-blue-600 bg-white hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  title="Expand to Fullscreen"
                >
                  <Maximize2 size={13} />
                  <span>Full Screen</span>
                </button>
              </div>

            </div>

            {/* Large Document Paper Canvas */}
            <div
              className="p-4 sm:p-6 bg-slate-100/90 flex justify-center items-start overflow-y-auto relative"
              style={{ minHeight: 650, maxHeight: 760 }}
            >
              <div
                className="transition-all duration-200"
                style={{
                  width: isPOS ? 300 : 794,
                  background: "#ffffff",
                  padding: isPOS ? "14px 12px" : "28px 32px",
                  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12), 0 2px 8px rgba(15, 23, 42, 0.06)",
                  borderRadius: 4,
                  transform: `scale(${currentScale})`,
                  transformOrigin: "top center",
                  marginBottom: isPOS ? 20 : `-${Math.round(1050 * (1 - currentScale))}px`,
                  pointerEvents: "none",
                  userSelect: "none",
                  flexShrink: 0
                }}
              >
                {renderThemePreview()}
              </div>
            </div>

            {/* Bottom Status Info Bar */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
              <div>
                Selected: <strong className="text-slate-800">{activeThemeObj.label}</strong> with accent <strong className="text-slate-800">{selectedColor}</strong>
              </div>
              <div className="text-[11px] text-slate-400">
                Click <strong>Save as Default Bill</strong> to apply this template to future invoices
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* ── FULL-SCREEN HIGH RESOLUTION PREVIEW MODAL ── */}
      {isFullscreenPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex flex-col justify-between p-4 sm:p-6 overflow-y-auto">
          {/* Top Floating Modal Bar */}
          <div className="max-w-4xl w-full mx-auto bg-white/95 backdrop-blur px-5 py-3 rounded-2xl shadow-2xl flex items-center justify-between border border-slate-200/80 mb-4 sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <span className="text-xl">{activeThemeObj.icon}</span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{activeThemeObj.label} (Full Resolution)</h3>
                <span className="text-xs text-slate-500">Accent: {selectedColor} • Format: {isPOS ? "POS Thermal 80mm" : "A4 Standard"}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Save size={14} />
                <span>Save as Default</span>
              </button>
              <button
                onClick={() => setIsFullscreenPreview(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
                title="Close Full Preview"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Full Scale 100% Invoice Paper */}
          <div className="flex justify-center items-start flex-1 py-4">
            <div
              style={{
                width: isPOS ? 340 : 794,
                background: "#ffffff",
                padding: isPOS ? "18px 16px" : "32px 36px",
                boxShadow: "0 12px 48px rgba(0,0,0,0.35)",
                borderRadius: 4,
                minHeight: isPOS ? "auto" : 950
              }}
            >
              {renderThemePreview()}
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="max-w-4xl w-full mx-auto text-center py-2 text-xs text-white/70">
            Press Esc or click Close to return
          </div>
        </div>
      )}

    </SettingsShell>
  );
}
  