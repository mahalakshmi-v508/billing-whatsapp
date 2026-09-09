import { useState, useEffect } from "react";
import { Hash, Check, Save, RefreshCw, Sparkles, Building2, CheckCircle2, AlertCircle } from "lucide-react";
import api from "../../services/api";
import { useSettings } from "./SettingsContext";
import { SettingsShell, SettingsCard, InfoIcon } from "./settingsUI";

export default function InvoiceSettings() {
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

  const [formData, setFormData] = useState({
    prefix: "INV-",
    next_number: 1,
    padding: 4,
    credit_note_prefix: "CN-",
    sale_order_prefix: "SO-",
    purchase_order_prefix: "PO-",
    estimate_prefix: "EST-",
    proforma_invoice_prefix: "PI-",
    delivery_challan_prefix: "DC-",
    payment_in_prefix: "PAY-",
  });

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
        .catch((err) => console.error(err));
    }
  }, []);

  // Fetch invoice settings for selected company
  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    api.get(`/invoice-settings/get?company_id=${companyId}`)
      .then((res) => {
        if (res.data.status && res.data.data) {
          const d = res.data.data;
          setFormData({
            prefix: d.prefix ?? "INV-",
            next_number: d.next_number ?? 1,
            padding: d.padding ?? 4,
            credit_note_prefix: d.credit_note_prefix ?? "CN-",
            sale_order_prefix: d.sale_order_prefix ?? "SO-",
            purchase_order_prefix: d.purchase_order_prefix ?? "PO-",
            estimate_prefix: d.estimate_prefix ?? "EST-",
            proforma_invoice_prefix: d.proforma_invoice_prefix ?? "PI-",
            delivery_challan_prefix: d.delivery_challan_prefix ?? "DC-",
            payment_in_prefix: d.payment_in_prefix ?? "PAY-",
          });
        }
      })
      .catch((err) => {
        console.error("Failed to load invoice settings:", err);
      })
      .finally(() => setLoading(false));
  }, [companyId]);

  // Compute live formatted preview
  const previewInvoiceNo = (() => {
    const p = formData.prefix === "None" ? "" : (formData.prefix || "");
    const pad = Number(formData.padding) || 1;
    const num = Number(formData.next_number) || 1;
    const seq = pad > 1 ? String(num).padStart(pad, "0") : String(num);
    return `${p}${seq}`;
  })();

  const handleChange = (key, val) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setToast(null);

    try {
      const payload = {
        company_id: companyId,
        prefix: formData.prefix === "None" ? "" : formData.prefix,
        next_number: Math.max(1, parseInt(formData.next_number) || 1),
        padding: parseInt(formData.padding) || 1,
        credit_note_prefix: formData.credit_note_prefix,
        sale_order_prefix: formData.sale_order_prefix,
        purchase_order_prefix: formData.purchase_order_prefix,
        estimate_prefix: formData.estimate_prefix,
        proforma_invoice_prefix: formData.proforma_invoice_prefix,
        delivery_challan_prefix: formData.delivery_challan_prefix,
        payment_in_prefix: formData.payment_in_prefix,
      };

      const res = await api.post("/invoice-settings/save", payload);
      if (res.data.status) {
        setToast({ type: "success", msg: "Invoice numbering settings saved successfully!" });
      } else {
        setToast({ type: "error", msg: res.data.message || "Failed to save settings." });
      }
    } catch (err) {
      console.error(err);
      setToast({ type: "error", msg: "An error occurred while saving." });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <SettingsShell
      title="Invoice Numbering"
      subtitle="PREFIXES, STARTING SEQUENCE & AUTO-INCREMENT"
      icon={<Hash size={22} strokeWidth={2.4} />}
      onClose={() => setSettingsTab && setSettingsTab("general")}
      contentClassName="max-w-5xl space-y-6"
    >
      {/* Toast Notification */}
      {toast && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border shadow-sm transition-all animate-fadeIn ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-3">
            {toast.type === "success" ? (
              <CheckCircle2 size={20} className="text-emerald-600" />
            ) : (
              <AlertCircle size={20} className="text-red-600" />
            )}
            <span className="text-sm font-semibold">{toast.msg}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-xs font-bold px-2 py-1 rounded hover:bg-black/5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Company Switcher (if multiple companies exist) */}
      {companies.length > 1 && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Building2 size={18} className="text-blue-600" />
            <span className="text-sm font-semibold text-slate-700">Select Company:</span>
          </div>
          <select
            value={companyId}
            onChange={(e) => setCompanyId(Number(e.target.value))}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company_name || `Company #${c.id}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Sale Invoice Numbering Core */}
        <div className="lg:col-span-7 space-y-6">
          <SettingsCard title="Sale Invoice Configuration">
            <div className="space-y-4 pt-2">
              {/* Prefix */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Invoice Prefix
                  </label>
                  <InfoIcon title="The prefix added to the beginning of every invoice number" />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.prefix === "None" ? "" : formData.prefix}
                    onChange={(e) => handleChange("prefix", e.target.value)}
                    placeholder="e.g. INV-, SS/, BILL-"
                    className="flex-1 px-3.5 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleChange("prefix", "None")}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border transition ${
                      formData.prefix === "None" || formData.prefix === ""
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    None
                  </button>
                </div>
                {/* Preset Chips */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] text-slate-400 font-medium">Quick Presets:</span>
                  {["INV-", "SS/", "BILL-", "INV/2026/"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleChange("prefix", preset)}
                      className={`text-[11.5px] px-2.5 py-1 rounded-lg border transition font-semibold ${
                        formData.prefix === preset
                          ? "bg-blue-50 text-blue-700 border-blue-300"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Next Number & Padding */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Next Bill Number
                    </label>
                    <InfoIcon title="The starting or next sequential number for sales bills" />
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={formData.next_number}
                    onChange={(e) => handleChange("next_number", Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Digits (Padding)
                    </label>
                    <InfoIcon title="Minimum digits format with leading zeroes" />
                  </div>
                  <select
                    value={formData.padding}
                    onChange={(e) => handleChange("padding", parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="1">No Padding (1)</option>
                    <option value="3">3 Digits (001)</option>
                    <option value="4">4 Digits (0001)</option>
                    <option value="5">5 Digits (00001)</option>
                    <option value="6">6 Digits (000001)</option>
                  </select>
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-sky-50 border border-blue-200/80 rounded-2xl p-4 mt-4 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={14} className="text-blue-600" />
                    Next Sale Invoice Number Preview
                  </span>
                  <span className="text-[11px] font-semibold text-blue-600 bg-blue-100/70 px-2 py-0.5 rounded-md">
                    Live Preview
                  </span>
                </div>
                <div className="text-2xl font-black text-blue-900 tracking-wider my-1">
                  {previewInvoiceNo}
                </div>
                <p className="text-[12px] text-blue-600/80 font-medium">
                  When creating a new sale bill, it will automatically receive this number and increment for the next bill.
                </p>
              </div>
            </div>
          </SettingsCard>
        </div>

        {/* Right Column (5 cols): Other Document Prefixes */}
        <div className="lg:col-span-5 space-y-6">
          <SettingsCard title="Other Document Prefixes">
            <p className="text-xs text-slate-500 mb-3 font-medium">
              Configure prefixes for return notes, orders, and estimates.
            </p>
            <div className="space-y-3">
              {[
                { key: "credit_note_prefix", label: "Credit Note Prefix", placeholder: "CN-" },
                { key: "sale_order_prefix", label: "Sale Order Prefix", placeholder: "SO-" },
                { key: "purchase_order_prefix", label: "Purchase Order Prefix", placeholder: "PO-" },
                { key: "estimate_prefix", label: "Estimate Prefix", placeholder: "EST-" },
                { key: "proforma_invoice_prefix", label: "Proforma Invoice Prefix", placeholder: "PI-" },
                { key: "delivery_challan_prefix", label: "Delivery Challan Prefix", placeholder: "DC-" },
                { key: "payment_in_prefix", label: "Payment In Prefix", placeholder: "PAY-" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-3 py-1 border-b border-slate-100 last:border-0">
                  <label className="text-xs font-semibold text-slate-700 flex-1">
                    {item.label}
                  </label>
                  <input
                    type="text"
                    value={formData[item.key] || ""}
                    onChange={(e) => handleChange(item.key, e.target.value)}
                    placeholder={item.placeholder}
                    className="w-32 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                  />
                </div>
              ))}
            </div>
          </SettingsCard>
        </div>
      </div>

      {/* Save Button Bar */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition shadow-sm hover:shadow flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {saving ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save size={16} />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>
    </SettingsShell>
  );
}
