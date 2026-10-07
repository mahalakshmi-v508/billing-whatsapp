import { useEffect, useMemo, useState } from "react";
import {
  History,
  Users,
  Truck,
  Package,
  Tags,
  Layers,
  FileText,
  Receipt,
  ShoppingCart,
  Wallet,
  Building2,
  UserCog,
  Headset,
  Landmark,
  Globe,
  Settings,
  Bot,
  Search,
  Shield,
} from "lucide-react";
import { SettingsShell, SectionTitle, Badge } from "./settingsUI";
import { fetchSettings, saveSettings } from "./settingsApi";
import { AUDIT_SETTINGS_KEY, DEFAULT_AUDIT_SETTINGS } from "../../components/audit/auditApi";

/**
 * Pages/modules the audit log covers.
 *
 * `label` is what the user reads; `value` MUST equal the module name the
 * backend stores in audit_logs.module (MODULE_NAMES in AuditLogger.php),
 * otherwise hiding a page here would never match the rows on the Audit Log.
 */
const PAGES = [
  { label: "Customers", value: "Customer", icon: Users },
  { label: "Suppliers", value: "Supplier", icon: Truck },
  { label: "Supplier Products", value: "Supplier Product", icon: Package },
  { label: "Products", value: "Product", icon: Package },
  { label: "Categories", value: "Category", icon: Tags },
  { label: "Subcategories", value: "Subcategory", icon: Layers },
  { label: "Brands", value: "Brand", icon: FileText },
  { label: "Invoices", value: "Invoice", icon: Receipt },
  { label: "Credit Notes", value: "Credit Note", icon: FileText },
  { label: "Debit Notes", value: "Debit Note", icon: FileText },
  { label: "Purchases", value: "Purchase", icon: ShoppingCart },
  { label: "Expenses", value: "Expense", icon: Wallet },
  { label: "Companies", value: "Company", icon: Building2 },
  { label: "Admins", value: "Admin", icon: UserCog },
  { label: "Cashiers", value: "Cashier", icon: UserCog },
  { label: "Cashier Requests", value: "Cashier Request", icon: Headset },
  { label: "Company Requests", value: "Company Request", icon: Headset },
  { label: "User & Access", value: "User & Access", icon: Shield },
  { label: "Helpdesk Tickets", value: "Helpdesk Ticket", icon: Headset },
  { label: "E-Way Bill", value: "E-Way Bill", icon: Landmark },
  { label: "E-Way Bill Settings", value: "E-Way Bill Settings", icon: Landmark },
  { label: "WhatsApp", value: "WhatsApp", icon: Globe },
  { label: "Settings", value: "Settings", icon: Settings },
  { label: "Invoice Settings", value: "Invoice Settings", icon: Settings },
  { label: "WhatsApp & SMS Alerts", value: "WhatsApp & SMS Alerts", icon: Globe },
  { label: "Credit Settings", value: "Credit Settings", icon: Settings },
  { label: "AI Assistant", value: "AI Assistant", icon: Bot },
];

export default function AuditLogSettings() {
  const [settings, setSettings] = useState({ ...DEFAULT_AUDIT_SETTINGS });
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchSettings()
      .then((saved) => {
        setSettings({ ...DEFAULT_AUDIT_SETTINGS, ...(saved?.[AUDIT_SETTINGS_KEY] || {}) });
      })
      .catch(() => setSettings({ ...DEFAULT_AUDIT_SETTINGS }));
  }, []);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const hidden = useMemo(() => new Set(settings.hiddenModules || []), [settings.hiddenModules]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return PAGES;
    return PAGES.filter(
      (p) => p.label.toLowerCase().includes(q) || p.value.toLowerCase().includes(q)
    );
  }, [search]);

  const hiddenCount = PAGES.filter((p) => hidden.has(p.value)).length;

  const patch = (key, value) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: value };
      saveSettings({ [AUDIT_SETTINGS_KEY]: updated });
      return updated;
    });
    showToast("Audit Log page preferences saved");
  };

  const toggleModule = (moduleValue, visible) => {
    const next = new Set(hidden);
    if (visible) {
      next.delete(moduleValue);
    } else {
      next.add(moduleValue);
    }
    patch("hiddenModules", [...next]);
  };

  return (
    <SettingsShell
      title="Audit Log"
      subtitle="CHOOSE WHICH PAGES ARE RECORDED & SHOWN IN THE AUDIT LOG"
      icon={<History size={22} strokeWidth={2.2} />}
      contentClassName="p-2 space-y-5 max-w-[1600px] mx-auto text-slate-800 font-sans"
    >
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[11px]">
            ✓
          </div>
          <span>{toast}</span>
        </div>
      )}

      {/* ── Overview card ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <SectionTitle title="Page Coverage">
            <Badge tone={hiddenCount > 0 ? "amber" : "green"}>
              {hiddenCount === 0
                ? "All pages recorded"
                : `${hiddenCount} of ${PAGES.length} pages hidden`}
            </Badge>
          </SectionTitle>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => patch("hiddenModules", PAGES.map((p) => p.value))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition"
            >
              Hide All
            </button>
            <button
              type="button"
              onClick={() => patch("hiddenModules", [])}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition"
            >
              Show All
            </button>
          </div>
        </div>

        <p className="text-[12.5px] text-slate-500 leading-relaxed mt-3">
          Pages you switch <strong>off</strong> are hidden: their activity is no longer recorded and
          nothing from them appears on the <strong>Audit Log</strong> page (<em>/audit-log</em>).
          Turning a page off never deletes entries that were already recorded — they simply stop
          being shown.
        </p>

        <div className="relative mt-4 mb-2 max-w-md">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pages…"
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
          />
        </div>

        {/* ── Per-page toggles ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 mt-2">
          {filtered.map((page) => {
            const Icon = page.icon;
            const isHidden = hidden.has(page.value);
            return (
              <label
                key={page.label}
                className="flex items-center justify-between gap-3 py-2 px-2 rounded-lg cursor-pointer select-none group hover:bg-slate-50 transition-colors"
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isHidden ? "bg-slate-100 text-slate-400" : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    <Icon size={15} />
                  </span>
                  <span
                    className={`text-[13.5px] font-medium truncate ${
                      isHidden ? "text-slate-400" : "text-slate-700 group-hover:text-slate-900"
                    }`}
                  >
                    {page.label}
                  </span>
                </span>

                <span className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wide ${
                      isHidden ? "text-rose-400" : "text-emerald-600"
                    }`}
                  >
                    {isHidden ? "Hidden" : "Recorded"}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!isHidden}
                    onClick={() => toggleModule(page.value, isHidden)}
                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                      isHidden ? "bg-slate-300" : "bg-blue-600"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        isHidden ? "left-0.5" : "left-[22px]"
                      }`}
                    />
                  </button>
                </span>
              </label>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-6">No pages match "{search}".</p>
        )}
      </div>
    </SettingsShell>
  );
}