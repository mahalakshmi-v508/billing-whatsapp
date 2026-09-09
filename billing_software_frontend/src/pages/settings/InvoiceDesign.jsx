import { useState, useEffect } from "react";
import {
  Palette, Check, Save, Sparkles, Building2, Eye,
  Layout, Layers, CheckCircle2, AlertCircle, FileText,
  Printer, ArrowRight
} from "lucide-react";
import api from "../../services/api";
import { useSettings } from "./SettingsContext";
import { SettingsShell, SettingsCard, InfoIcon } from "./settingsUI";

/* ─── THEME OPTIONS WITH METADATA ─────────────────────────────────────────── */
const THEME_OPTIONS = [
  {
    id: "tally",
    label: "Tally Theme",
    category: "Classic",
    tag: "Standard",
    badge: "Recommended",
    description: "Standard Indian Tax Invoice format with itemized tax summary, HSN codes, and bank details.",
    accentGradient: "linear-gradient(135deg, #2563eb, #1e40af)",
    icon: "📄"
  },
  {
    id: "gst1",
    label: "GST Theme 1",
    category: "Modern GST",
    tag: "Modern",
    badge: "Corporate",
    description: "Contemporary layout with bold colored banner, clean borders, and distinct bill-to section.",
    accentGradient: "linear-gradient(135deg, #0d9488, #115e59)",
    icon: "📊"
  },
  {
    id: "gst3",
    label: "GST Theme 3",
    category: "Minimal GST",
    tag: "Minimal",
    badge: "Boxed",
    description: "Compact framed layout optimized for clarity, structured tax rows, and multi-item invoices.",
    accentGradient: "linear-gradient(135deg, #4b5563, #1f2937)",
    icon: "📑"
  },
  {
    id: "double_divine",
    label: "Double Divine",
    category: "Premium",
    tag: "Premium",
    badge: "Executive",
    description: "Curved dynamic header design with rich accent contrast, perfect for luxury and corporate brands.",
    accentGradient: "linear-gradient(135deg, #9333ea, #6b21a8)",
    icon: "🎨"
  },
  {
    id: "french_elite",
    label: "French Elite",
    category: "Classic",
    tag: "Elegant",
    badge: "Clean",
    description: "Refined typographic hierarchy with balanced whitespace for wholesale and distributors.",
    accentGradient: "linear-gradient(135deg, #0284c7, #0369a1)",
    icon: "🏛️"
  },
  {
    id: "pos",
    label: "POS Thermal Receipt",
    category: "Retail / POS",
    tag: "Thermal",
    badge: "58mm / 80mm",
    description: "Narrow thermal roll receipt layout for supermarkets, cafes, and rapid counter checkout.",
    accentGradient: "linear-gradient(135deg, #d97706, #b45309)",
    icon: "🧾"
  },
  {
    id: "vintage_classic",
    label: "Vintage Classic",
    category: "Vintage",
    tag: "Traditional",
    badge: "Ledger",
    description: "Traditional ledger-style framed invoice format with formal double borders and clean lines.",
    accentGradient: "linear-gradient(135deg, #78350f, #451a03)",
    icon: "📜"
  },
  {
    id: "vintage_bold",
    label: "Vintage Bold",
    category: "Vintage",
    tag: "Traditional",
    badge: "Strong",
    description: "Bold dark header structure with high contrast lines designed for sharp dot-matrix or laser prints.",
    accentGradient: "linear-gradient(135deg, #1e293b, #0f172a)",
    icon: "📜"
  },
];

/* ─── 18 VIBRANT COLOR SWATCHES (MATCHING INVOICE PALETTE) ─────────────────── */
const PALETTE_COLORS = [
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
  const [serverSettings, setServerSettings] = useState({});

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
            // Map legacy template names to theme ids
            const map = {
              "Tally Theme": "tally",
              "GST Theme 1": "gst1",
              "GST Theme 2": "gst3",
              "GST Theme 3": "gst3",
              "Double Divine": "double_divine",
              "Minimal Theme": "gst3",
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

  return (
    <SettingsShell
      title="Invoice Design"
      subtitle="DEFAULT INVOICE THEMES, LAYOUT & BRAND PALETTE"
      icon={<Palette size={22} strokeWidth={2.2} />}
      onClose={() => setSettingsTab && setSettingsTab("general")}
      contentClassName="space-y-6 max-w-5xl"
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

      {/* Top Bar: Company Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Building2 size={20} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Company</div>
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

        <div className="text-xs text-slate-500 font-medium hidden sm:flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/70">
          <Sparkles size={14} className="text-blue-500" />
          <span>Selected design applies automatically to all new bills</span>
        </div>
      </div>

      {/* Grid: Left Visual Theme Selector | Right Live Preview & Color Swatches */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── LEFT: 8 THEME CARDS (8 COLS) ── */}
        <div className="lg:col-span-8 space-y-6">
          <SettingsCard
            title="Select Default Theme"
            headerExtra={
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/60">
                {THEME_OPTIONS.length} Designs Available
              </span>
            }
          >
            <p className="text-[13px] text-slate-500 mb-4">
              Choose the invoice design format that will automatically appear when generating bills or downloading PDFs.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {THEME_OPTIONS.map((theme) => {
                const isSelected = selectedTheme === theme.id;
                return (
                  <div
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme.id)}
                    className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between group ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/40 shadow-md shadow-blue-600/10 ring-1 ring-blue-500/20"
                        : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    {/* Active Selected Pill */}
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm">
                        <Check size={14} strokeWidth={3} />
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className="text-2xl">{theme.icon}</span>
                        <div>
                          <h4 className="text-[14.5px] font-bold text-slate-900 leading-snug">
                            {theme.label}
                          </h4>
                          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                            {theme.category}
                          </span>
                        </div>
                      </div>

                      <p className="text-[12px] text-slate-600 line-clamp-2 leading-relaxed mt-1">
                        {theme.description}
                      </p>
                    </div>

                    <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-400">
                        Badge: <strong className="text-slate-700">{theme.badge}</strong>
                      </span>
                      <span className={`font-bold ${isSelected ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}`}>
                        {isSelected ? "Default Active" : "Click to select"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </SettingsCard>
        </div>

        {/* ── RIGHT: COLOR PALETTE & LIVE OVERVIEW (4 COLS) ── */}
        <div className="lg:col-span-4 space-y-6">

          {/* Color Swatch Card */}
          <SettingsCard title="Theme Accent Color">
            <p className="text-[12.5px] text-slate-500 mb-3">
              Accent header color for titles, tables, and total highlight boxes.
            </p>

            {/* Currently Active Color */}
            <div className="flex items-center gap-3 p-2.5 mb-4 bg-slate-50 rounded-xl border border-slate-200">
              <div
                className="w-8 h-8 rounded-lg shadow-sm border border-black/10 flex-shrink-0"
                style={{ background: selectedColor }}
              />
              <div className="min-w-0">
                <div className="text-xs text-slate-500 font-medium">Selected Color</div>
                <div className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  {selectedColor}
                </div>
              </div>
            </div>

            {/* 18 Color Swatches */}
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
                    className={`h-8 rounded-lg transition-transform relative flex items-center justify-center cursor-pointer ${
                      isSelected
                        ? "ring-2 ring-slate-900 ring-offset-2 scale-110 shadow-md"
                        : "hover:scale-105 border border-black/10"
                    }`}
                  >
                    {isSelected && <Check size={14} color="#ffffff" strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </SettingsCard>

          {/* Active Preset Summary Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-xl shadow-slate-900/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Live Selection
                </span>
              </div>
              <span
                className="text-[10.5px] font-bold px-2 py-0.5 rounded-full uppercase"
                style={{ background: selectedColor, color: "#fff" }}
              >
                {activeThemeObj.category}
              </span>
            </div>

            <div className="pt-1">
              <div className="text-xl font-extrabold flex items-center gap-2">
                <span>{activeThemeObj.icon}</span>
                <span>{activeThemeObj.label}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                {activeThemeObj.description}
              </p>
            </div>

            {/* Mini Visual Badge */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Paper Layout:</span>
                <span className="font-semibold text-white">
                  {selectedTheme === "pos" ? "Thermal 58/80mm" : "A4 Standard Portrait"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Accent Color:</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded-full" style={{ background: selectedColor }} />
                  <span className="font-mono text-white text-[11px]">{selectedColor}</span>
                </div>
              </div>
            </div>

            <div className="pt-1">
              <button
                onClick={handleSave}
                disabled={saving || loading}
                className="w-full py-2.5 rounded-xl font-bold text-sm bg-white text-slate-900 hover:bg-slate-100 transition shadow-lg active:scale-95 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-900/40 border-t-slate-900 rounded-full animate-spin" />
                    <span>Saving Default Bill...</span>
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

        </div>

      </div>
    </SettingsShell>
  );
}
