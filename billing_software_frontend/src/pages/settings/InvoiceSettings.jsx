import { useState, useEffect } from "react";
import {
  Hash,
  Check,
  Save,
  RefreshCw,
  Sparkles,
  Building2,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCcw,
  Receipt,
  ShoppingCart,
  CreditCard,
  Layers,
  ArrowRight,
  TrendingUp,
  Truck,
  FileSpreadsheet,
  PackageCheck,
  Sliders,
} from "lucide-react";
import api from "../../services/api";
import { useSettings } from "./SettingsContext";
import { SettingsShell, SettingsCard, InfoIcon } from "./settingsUI";

// Document Definitions & Metadata
const DOCUMENT_TYPES = [
  {
    key: "invoice",
    prefixKey: "prefix",
    numKey: "next_number",
    padKey: "padding",
    title: "Sales Invoice",
    category: "Sales",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    icon: FileText,
    desc: "Used for standard retail & wholesale sales billing",
    presets: ["INV-", "SS/", "BILL-", "INV/2026/"],
    defaultPrefix: "INV-",
  },
  {
    key: "credit_note",
    prefixKey: "credit_note_prefix",
    numKey: "credit_note_next_number",
    padKey: "credit_note_padding",
    title: "Credit Note (Sale Return)",
    category: "Sales",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    icon: RotateCcw,
    desc: "Issued when a customer returns goods or claims a refund / credit",
    presets: ["CN-", "CRN/", "SR-", "CN/2026/"],
    defaultPrefix: "CN-",
  },
  {
    key: "payment_in",
    prefixKey: "payment_in_prefix",
    numKey: "payment_in_next_number",
    padKey: "payment_in_padding",
    title: "Payment-In Receipt",
    category: "Accounts",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    icon: Receipt,
    desc: "Receipt vouchers for incoming payments received from customers",
    presets: ["PAYIN-", "REC-", "RCPT/", "IN/"],
    defaultPrefix: "PAYIN-",
  },
  {
    key: "purchase_order",
    prefixKey: "purchase_order_prefix",
    numKey: "purchase_order_next_number",
    padKey: "purchase_order_padding",
    title: "Purchase Order (PO)",
    category: "Purchase",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    icon: ShoppingCart,
    desc: "Official order placed to vendors / suppliers for procurement",
    presets: ["PO-", "ORD-", "PUR/", "PO/2026/"],
    defaultPrefix: "PO-",
  },
  {
    key: "payment_out",
    prefixKey: "payment_out_prefix",
    numKey: "payment_out_next_number",
    padKey: "payment_out_padding",
    title: "Payment-Out Receipt",
    category: "Accounts",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
    icon: CreditCard,
    desc: "Payment vouchers for outgoing settlements made to suppliers",
    presets: ["PAYOUT-", "VOUCH-", "PV-", "OUT/"],
    defaultPrefix: "PAYOUT-",
  },
  {
    key: "debit_note",
    prefixKey: "debit_note_prefix",
    numKey: "debit_note_next_number",
    padKey: "debit_note_padding",
    title: "Debit Note (Purchase Return)",
    category: "Purchase",
    badgeColor: "bg-orange-100 text-orange-800 border-orange-200",
    icon: RotateCcw,
    desc: "Issued when returning damaged or excess items back to a supplier",
    presets: ["DN-", "DBN/", "PR-", "DN/2026/"],
    defaultPrefix: "DN-",
  },
  {
    key: "estimate",
    prefixKey: "estimate_prefix",
    numKey: "estimate_next_number",
    padKey: "estimate_padding",
    title: "Estimate / Quotation",
    category: "Sales",
    badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-200",
    icon: FileSpreadsheet,
    desc: "Quotations and price estimates presented to potential customers",
    presets: ["EST-", "QUOT-", "QTN/", "EST/2026/"],
    defaultPrefix: "EST-",
  },
  {
    key: "delivery_challan",
    prefixKey: "delivery_challan_prefix",
    numKey: "delivery_challan_next_number",
    padKey: "delivery_challan_padding",
    title: "Delivery Challan",
    category: "Logistics",
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
    icon: Truck,
    desc: "Transport goods accompaniment note for dispatch and logistics",
    presets: ["DC-", "CHLN/", "DC/2026/"],
    defaultPrefix: "DC-",
  },
  {
    key: "proforma_invoice",
    prefixKey: "proforma_invoice_prefix",
    numKey: "proforma_invoice_next_number",
    padKey: "proforma_invoice_padding",
    title: "Proforma Invoice",
    category: "Sales",
    badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
    icon: PackageCheck,
    desc: "Preliminary bill of sale sent to buyers in advance of a delivery",
    presets: ["PI-", "PRO-", "PI/2026/"],
    defaultPrefix: "PI-",
  },
  {
    key: "sale_order",
    prefixKey: "sale_order_prefix",
    numKey: "sale_order_next_number",
    padKey: "sale_order_padding",
    title: "Sale Order",
    category: "Sales",
    badgeColor: "bg-sky-100 text-sky-800 border-sky-200",
    icon: TrendingUp,
    desc: "Sales confirmation order booked for fulfillment",
    presets: ["SO-", "ORD-", "SO/2026/"],
    defaultPrefix: "SO-",
  },
];

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
  const [selectedDocKey, setSelectedDocKey] = useState("invoice");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [formData, setFormData] = useState({
    prefix: "INV-",
    next_number: 1,
    padding: 4,
    credit_note_prefix: "CN-",
    credit_note_next_number: 1,
    credit_note_padding: 4,
    payment_in_prefix: "PAYIN-",
    payment_in_next_number: 1,
    payment_in_padding: 4,
    purchase_order_prefix: "PO-",
    purchase_order_next_number: 1,
    purchase_order_padding: 4,
    payment_out_prefix: "PAYOUT-",
    payment_out_next_number: 1,
    payment_out_padding: 4,
    debit_note_prefix: "DN-",
    debit_note_next_number: 1,
    debit_note_padding: 4,
    estimate_prefix: "EST-",
    estimate_next_number: 1,
    estimate_padding: 4,
    delivery_challan_prefix: "DC-",
    delivery_challan_next_number: 1,
    delivery_challan_padding: 4,
    proforma_invoice_prefix: "PI-",
    proforma_invoice_next_number: 1,
    proforma_invoice_padding: 4,
    sale_order_prefix: "SO-",
    sale_order_next_number: 1,
    sale_order_padding: 4,
  });

  // Load companies for admin
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const adminId = user?.admin_id || user?.id || 0;
    if (adminId) {
      api
        .get(`/company/get_companies_by_admin?admin_id=${adminId}&role=${user.role || "admin"}`)
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
    api
      .get(`/invoice-settings/get?company_id=${companyId}`)
      .then((res) => {
        if (res.data.status && res.data.data) {
          const d = res.data.data;
          setFormData((prev) => ({
            ...prev,
            prefix: d.prefix ?? "INV-",
            next_number: d.next_number ?? 1,
            padding: d.padding ?? 4,
            credit_note_prefix: d.credit_note_prefix ?? "CN-",
            credit_note_next_number: d.credit_note_next_number ?? 1,
            credit_note_padding: d.credit_note_padding ?? 4,
            payment_in_prefix: d.payment_in_prefix ?? "PAYIN-",
            payment_in_next_number: d.payment_in_next_number ?? 1,
            payment_in_padding: d.payment_in_padding ?? 4,
            purchase_order_prefix: d.purchase_order_prefix ?? "PO-",
            purchase_order_next_number: d.purchase_order_next_number ?? 1,
            purchase_order_padding: d.purchase_order_padding ?? 4,
            payment_out_prefix: d.payment_out_prefix ?? "PAYOUT-",
            payment_out_next_number: d.payment_out_next_number ?? 1,
            payment_out_padding: d.payment_out_padding ?? 4,
            debit_note_prefix: d.debit_note_prefix ?? "DN-",
            debit_note_next_number: d.debit_note_next_number ?? 1,
            debit_note_padding: d.debit_note_padding ?? 4,
            estimate_prefix: d.estimate_prefix ?? "EST-",
            estimate_next_number: d.estimate_next_number ?? 1,
            estimate_padding: d.estimate_padding ?? 4,
            delivery_challan_prefix: d.delivery_challan_prefix ?? "DC-",
            delivery_challan_next_number: d.delivery_challan_next_number ?? 1,
            delivery_challan_padding: d.delivery_challan_padding ?? 4,
            proforma_invoice_prefix: d.proforma_invoice_prefix ?? "PI-",
            proforma_invoice_next_number: d.proforma_invoice_next_number ?? 1,
            proforma_invoice_padding: d.proforma_invoice_padding ?? 4,
            sale_order_prefix: d.sale_order_prefix ?? "SO-",
            sale_order_next_number: d.sale_order_next_number ?? 1,
            sale_order_padding: d.sale_order_padding ?? 4,
          }));
        }
      })
      .catch((err) => {
        console.error("Failed to load invoice settings:", err);
      })
      .finally(() => setLoading(false));
  }, [companyId]);

  // Helper to compute formatted preview
  const computePreview = (prefix, nextNum, padding) => {
    const p = prefix === "None" ? "" : prefix || "";
    const pad = Math.max(1, Number(padding) || 1);
    const num = Math.max(1, Number(nextNum) || 1);
    const seq = pad > 1 ? String(num).padStart(pad, "0") : String(num);
    return `${p}${seq}`;
  };

  const handleChange = (key, val) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  const currentDoc = DOCUMENT_TYPES.find((d) => d.key === selectedDocKey) || DOCUMENT_TYPES[0];
  const currentPrefix = formData[currentDoc.prefixKey] ?? currentDoc.defaultPrefix;
  const currentNum = formData[currentDoc.numKey] ?? 1;
  const currentPadding = formData[currentDoc.padKey] ?? 4;
  const currentPreview = computePreview(currentPrefix, currentNum, currentPadding);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setToast(null);

    try {
      const payload = {
        company_id: companyId,
        prefix: formData.prefix === "None" ? "" : formData.prefix,
        next_number: Math.max(1, parseInt(formData.next_number) || 1),
        padding: Math.max(1, parseInt(formData.padding) || 1),

        credit_note_prefix: formData.credit_note_prefix === "None" ? "" : formData.credit_note_prefix,
        credit_note_next_number: Math.max(1, parseInt(formData.credit_note_next_number) || 1),
        credit_note_padding: Math.max(1, parseInt(formData.credit_note_padding) || 1),

        payment_in_prefix: formData.payment_in_prefix === "None" ? "" : formData.payment_in_prefix,
        payment_in_next_number: Math.max(1, parseInt(formData.payment_in_next_number) || 1),
        payment_in_padding: Math.max(1, parseInt(formData.payment_in_padding) || 1),

        purchase_order_prefix: formData.purchase_order_prefix === "None" ? "" : formData.purchase_order_prefix,
        purchase_order_next_number: Math.max(1, parseInt(formData.purchase_order_next_number) || 1),
        purchase_order_padding: Math.max(1, parseInt(formData.purchase_order_padding) || 1),

        payment_out_prefix: formData.payment_out_prefix === "None" ? "" : formData.payment_out_prefix,
        payment_out_next_number: Math.max(1, parseInt(formData.payment_out_next_number) || 1),
        payment_out_padding: Math.max(1, parseInt(formData.payment_out_padding) || 1),

        debit_note_prefix: formData.debit_note_prefix === "None" ? "" : formData.debit_note_prefix,
        debit_note_next_number: Math.max(1, parseInt(formData.debit_note_next_number) || 1),
        debit_note_padding: Math.max(1, parseInt(formData.debit_note_padding) || 1),

        estimate_prefix: formData.estimate_prefix === "None" ? "" : formData.estimate_prefix,
        estimate_next_number: Math.max(1, parseInt(formData.estimate_next_number) || 1),
        estimate_padding: Math.max(1, parseInt(formData.estimate_padding) || 1),

        delivery_challan_prefix: formData.delivery_challan_prefix === "None" ? "" : formData.delivery_challan_prefix,
        delivery_challan_next_number: Math.max(1, parseInt(formData.delivery_challan_next_number) || 1),
        delivery_challan_padding: Math.max(1, parseInt(formData.delivery_challan_padding) || 1),

        proforma_invoice_prefix: formData.proforma_invoice_prefix === "None" ? "" : formData.proforma_invoice_prefix,
        proforma_invoice_next_number: Math.max(1, parseInt(formData.proforma_invoice_next_number) || 1),
        proforma_invoice_padding: Math.max(1, parseInt(formData.proforma_invoice_padding) || 1),

        sale_order_prefix: formData.sale_order_prefix === "None" ? "" : formData.sale_order_prefix,
        sale_order_next_number: Math.max(1, parseInt(formData.sale_order_next_number) || 1),
        sale_order_padding: Math.max(1, parseInt(formData.sale_order_padding) || 1),
      };

      const res = await api.post("/invoice-settings/save", payload);
      if (res.data.status) {
        setToast({ type: "success", msg: "All document numbering settings saved successfully!" });
      } else {
        setToast({ type: "error", msg: res.data.message || "Failed to save settings." });
      }
    } catch (err) {
      console.error(err);
      setToast({ type: "error", msg: "An error occurred while saving document numbering." });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <SettingsShell
      title="Invoice & Document Numbering"
      subtitle="CUSTOM PREFIXES, STARTING SEQUENCES & AUTO-INCREMENT FOR ALL BILLS & VOUCHERS"
      icon={<Hash size={22} strokeWidth={2.4} />}
      onClose={() => setSettingsTab && setSettingsTab("general")}
      contentClassName="max-w-6xl space-y-6"
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

      {/* Top Bar: Company Selector & Status */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Sliders size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Multi-Document Voucher System</h3>
            <p className="text-xs text-slate-500 font-medium">
              Configure independent auto-incrementing serial sequences for every bill and receipt.
            </p>
          </div>
        </div>

        {companies.length > 1 && (
          <div className="flex items-center gap-2.5">
            <Building2 size={18} className="text-blue-600" />
            <span className="text-xs font-semibold text-slate-600">Company:</span>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(Number(e.target.value))}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name || `Company #${c.id}`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Document Selector Pills / Horizontal Tabs */}
      <div className="bg-slate-50/80 p-2 rounded-2xl border border-slate-200">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 mb-1">
          Select Document Type to Configure:
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {DOCUMENT_TYPES.map((doc) => {
            const Icon = doc.icon;
            const isSelected = selectedDocKey === doc.key;
            const liveNo = computePreview(
              formData[doc.prefixKey] ?? doc.defaultPrefix,
              formData[doc.numKey] ?? 1,
              formData[doc.padKey] ?? 4
            );

            return (
              <button
                key={doc.key}
                type="button"
                onClick={() => setSelectedDocKey(doc.key)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-left transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isSelected
                    ? "bg-white text-blue-900 border-blue-500 shadow-md ring-2 ring-blue-500/20"
                    : "bg-white/60 hover:bg-white text-slate-700 border-slate-200 hover:border-slate-300 shadow-xs"
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg ${
                    isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <Icon size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold leading-tight">{doc.title}</div>
                  <div className="text-[10.5px] font-mono font-semibold text-blue-600 mt-0.5">
                    {liveNo}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Configuration Card for Selected Document */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Document Form Config */}
        <div className="lg:col-span-7 space-y-6">
          <SettingsCard
            title={
              <div className="flex items-center gap-2">
                <span>{currentDoc.title} Configuration</span>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${currentDoc.badgeColor}`}>
                  {currentDoc.category}
                </span>
              </div>
            }
          >
            <p className="text-xs text-slate-500 font-medium -mt-1 mb-4">
              {currentDoc.desc}
            </p>

            <div className="space-y-4 pt-1">
              {/* Prefix Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {currentDoc.title} Prefix
                  </label>
                  <InfoIcon title="The text or code prefix placed at the beginning of the number" />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentPrefix === "None" ? "" : currentPrefix}
                    onChange={(e) => handleChange(currentDoc.prefixKey, e.target.value)}
                    placeholder={`e.g. ${currentDoc.defaultPrefix}`}
                    className="flex-1 px-3.5 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleChange(currentDoc.prefixKey, "None")}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border transition ${
                      currentPrefix === "None" || currentPrefix === ""
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    None
                  </button>
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-[11px] text-slate-400 font-medium">Quick Presets:</span>
                  {currentDoc.presets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleChange(currentDoc.prefixKey, preset)}
                      className={`text-[11.5px] px-2.5 py-1 rounded-lg border transition font-semibold cursor-pointer ${
                        currentPrefix === preset
                          ? "bg-blue-50 text-blue-700 border-blue-300 ring-1 ring-blue-300"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Next Number & Padding */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Next Starting Number
                    </label>
                    <InfoIcon title="The sequential number for the next document created" />
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={currentNum}
                    onChange={(e) =>
                      handleChange(currentDoc.numKey, Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Digits (Padding)
                    </label>
                    <InfoIcon title="Number of digits with leading zero padding" />
                  </div>
                  <select
                    value={currentPadding}
                    onChange={(e) =>
                      handleChange(currentDoc.padKey, parseInt(e.target.value) || 1)
                    }
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

              {/* Real-Time Live Preview Banner */}
              <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-sky-50 border border-blue-200/80 rounded-2xl p-4 mt-4 shadow-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-extrabold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={15} className="text-blue-600" />
                    Next {currentDoc.title} Number Preview
                  </span>
                  <span className="text-[10.5px] font-bold text-blue-700 bg-blue-100/90 px-2 py-0.5 rounded-md border border-blue-200">
                    Live Dynamic Preview
                  </span>
                </div>
                <div className="text-2xl font-black font-mono text-blue-900 tracking-wider my-1">
                  {currentPreview}
                </div>
                <p className="text-[11.5px] text-blue-700/80 font-medium">
                  When creating a new {currentDoc.title}, it will automatically receive this identifier and increment sequentially.
                </p>
              </div>
            </div>
          </SettingsCard>
        </div>

        {/* Right 5 Cols: All Documents Overview Table */}
        <div className="lg:col-span-5 space-y-6">
          <SettingsCard title="All Document Series Overview">
            <p className="text-xs text-slate-500 mb-3 font-medium">
              Click on any row below to quickly customize its prefix and sequence.
            </p>
            <div className="space-y-1 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin">
              {DOCUMENT_TYPES.map((doc) => {
                const isSelected = selectedDocKey === doc.key;
                const p = formData[doc.prefixKey] ?? doc.defaultPrefix;
                const n = formData[doc.numKey] ?? 1;
                const pad = formData[doc.padKey] ?? 4;
                const preview = computePreview(p, n, pad);

                return (
                  <div
                    key={doc.key}
                    onClick={() => setSelectedDocKey(doc.key)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-blue-50/80 border-blue-300 ring-1 ring-blue-300"
                        : "bg-white hover:bg-slate-50 border-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isSelected ? "bg-blue-600" : "bg-slate-300"
                        }`}
                      />
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-800 truncate">
                          {doc.title}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          Prefix: <span className="font-semibold text-slate-600">{p === "None" ? "(None)" : p || "(None)"}</span> • Digits: {pad}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {preview}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </SettingsCard>
        </div>
      </div>

      {/* Save Button Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
        <div className="text-xs text-slate-500 font-medium">
          Settings are saved instantly for all documents under the selected company.
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {saving ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <Save size={16} />
              <span>Save All Document Settings</span>
            </>
          )}
        </button>
      </div>
    </SettingsShell>
  );
}
