import { useState, useEffect, useMemo } from "react";
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
  Search,
  Filter,
  Eye,
  CheckCircle,
  Zap,
} from "lucide-react";
import api from "../../services/api";
import { useSettings } from "./SettingsContext";
import { SettingsShell, InfoIcon } from "./settingsUI";

// Document Definitions & Metadata
const DOCUMENT_TYPES = [
  {
    key: "invoice",
    prefixKey: "prefix",
    numKey: "next_number",
    padKey: "padding",
    title: "Sales Invoice",
    category: "Sales",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    icon: FileText,
    desc: "Primary retail, wholesale & counter tax invoice voucher serials",
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
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: RotateCcw,
    desc: "Issued when a customer returns goods or claims a refund / credit note",
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
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    icon: Receipt,
    desc: "Receipt voucher tracking incoming customer collections and cash inflows",
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
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    icon: ShoppingCart,
    desc: "Inward procurement order reference placed with suppliers / vendors",
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
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    icon: CreditCard,
    desc: "Payment voucher tracking outgoing vendor settlements and disbursements",
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
    badgeColor: "bg-orange-50 text-orange-700 border-orange-200",
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
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
    icon: FileSpreadsheet,
    desc: "Quotations and price estimates presented to prospective buyers",
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
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    icon: Truck,
    desc: "Transport goods accompaniment note for dispatch and stock movement",
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
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    icon: PackageCheck,
    desc: "Preliminary bill of sale sent to buyers in advance of goods delivery",
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
    badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
    icon: TrendingUp,
    desc: "Sales confirmation order booked for delivery and stock allocation",
    presets: ["SO-", "ORD-", "SO/2026/"],
    defaultPrefix: "SO-",
  },
  {
    key: "expense",
    prefixKey: "expense_prefix",
    numKey: "expense_next_number",
    padKey: "expense_padding",
    title: "Expense Voucher",
    category: "Accounts",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Receipt,
    desc: "Daily business overheads, rent, utility bills, and operational expenses",
    presets: ["EXP-", "VOUCH-", "EXP/2026/", "BILL/"],
    defaultPrefix: "EXP-",
  },
];

const CATEGORIES = ["All", "Sales", "Purchase", "Accounts", "Logistics"];

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
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
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
    expense_prefix: "EXP-",
    expense_next_number: 1,
    expense_padding: 4,
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
            expense_prefix: d.expense_prefix ?? "EXP-",
            expense_next_number: d.expense_next_number ?? 1,
            expense_padding: d.expense_padding ?? 4,
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

  // Filtered documents for overview matrix
  const filteredDocuments = useMemo(() => {
    return DOCUMENT_TYPES.filter((doc) => {
      const matchCat = categoryFilter === "All" || doc.category === categoryFilter;
      const matchQuery =
        !searchQuery.trim() ||
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [categoryFilter, searchQuery]);

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

        expense_prefix: formData.expense_prefix === "None" ? "" : formData.expense_prefix,
        expense_next_number: Math.max(1, parseInt(formData.expense_next_number) || 1),
        expense_padding: Math.max(1, parseInt(formData.expense_padding) || 1),
      };

      const res = await api.post("/invoice-settings/save", payload);
      if (res.data.status) {
        setToast({ type: "success", msg: "All document numbering series saved successfully!" });
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

  const activeCompanyObj = companies.find((c) => Number(c.id) === Number(companyId));

  return (
    <SettingsShell
      title="Invoice & Document Numbering"
      subtitle="CUSTOM PREFIXES, STARTING SEQUENCES & AUTO-INCREMENT FOR ALL BILLS & VOUCHERS"
      icon={<Hash size={22} strokeWidth={2.4} />}
      onClose={() => setSettingsTab && setSettingsTab("general")}
      contentClassName="space-y-4 w-full"
      actions={
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition cursor-pointer disabled:opacity-50"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{saving ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      }
    >
      {/* ── Toast Notification ── */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3 duration-200 ${
            toast.type === "success"
              ? "bg-slate-900 text-white border-slate-700"
              : "bg-rose-900 text-white border-rose-700"
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] ${
              toast.type === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
            }`}
          >
            {toast.type === "success" ? "✓" : "!"}
          </div>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ── 1. COMMAND DESK & BRANCH SELECTOR BANNER ── */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
            <Sliders size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight font-display">
                Document Numbering Engine
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Auto-Increment
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Set starting sequences, prefixes, and digit zero-padding for 11 distinct document voucher types.
            </p>
          </div>
        </div>

        {/* Company Switcher Pill */}
        <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-1.5 shrink-0">
          <Building2 size={15} className="text-blue-600 shrink-0" />
          <div className="text-left">
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Company Branch</span>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-2"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name || `Company #${c.id}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── 2. CATEGORY TABS & DOCUMENT SELECTOR STRIP ── */}
      <div className="space-y-2.5">
        {/* Category Tabs */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  categoryFilter === cat
                    ? "bg-white text-blue-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-400 font-semibold">
            Configuring: <strong className="text-slate-800">{currentDoc.title}</strong>
          </span>
        </div>

        {/* Horizontal Scrollable Document Selector Cards */}
        <div className="flex gap-2 overflow-x-auto pb-1.5 paysplitx-scrollbar-light">
          {DOCUMENT_TYPES.map((doc) => {
            const Icon = doc.icon;
            const isSelected = selectedDocKey === doc.key;
            const isCategoryMatch = categoryFilter === "All" || doc.category === categoryFilter;
            const liveNo = computePreview(
              formData[doc.prefixKey] ?? doc.defaultPrefix,
              formData[doc.numKey] ?? 1,
              formData[doc.padKey] ?? 4
            );

            if (!isCategoryMatch) return null;

            return (
              <button
                key={doc.key}
                type="button"
                onClick={() => setSelectedDocKey(doc.key)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-left transition-all whitespace-nowrap shrink-0 cursor-pointer select-none ${
                  isSelected
                    ? "bg-blue-50/70 border-blue-500 shadow-sm ring-2 ring-blue-500/15"
                    : "bg-white hover:bg-slate-50 border-slate-200 shadow-xs hover:border-slate-300"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold transition ${
                    isSelected ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <Icon size={15} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900">{doc.title}</span>
                  </div>
                  <div className="text-[11px] font-mono font-extrabold text-blue-600 mt-0.5">
                    {liveNo}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 3. MAIN DUAL-COLUMN CONFIGURATION STUDIO ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column (7 Cols): Active Document Configuration Studio */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 flex flex-col justify-between">
          <div>
            {/* Header of Active Form */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  {<currentDoc.icon size={18} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 font-display">
                      {currentDoc.title}
                    </h3>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${currentDoc.badgeColor}`}>
                      {currentDoc.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{currentDoc.desc}</p>
                </div>
              </div>
            </div>

            {/* Input Controls */}
            <div className="space-y-4">
              {/* 1. Prefix Configuration */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Series Prefix
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium">Text or identifier before number</span>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={currentPrefix === "None" ? "" : currentPrefix}
                      onChange={(e) => handleChange(currentDoc.prefixKey, e.target.value)}
                      placeholder={`e.g. ${currentDoc.defaultPrefix}`}
                      className="w-full px-3.5 py-2.5 bg-slate-50/70 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/15 transition"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleChange(currentDoc.prefixKey, "None")}
                    className={`px-4 py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                      currentPrefix === "None" || currentPrefix === ""
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    No Prefix
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mr-1">
                    Presets:
                  </span>
                  {currentDoc.presets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleChange(currentDoc.prefixKey, preset)}
                      className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border transition font-bold cursor-pointer ${
                        currentPrefix === preset
                          ? "bg-blue-50 text-blue-700 border-blue-300 ring-1 ring-blue-300"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-white hover:border-slate-300"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Next Number & Padding Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Starting Number
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
                    className="w-full px-3.5 py-2.5 bg-slate-50/70 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/15 transition"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Zero Padding (Digits)
                    </label>
                    <InfoIcon title="Leading zeroes to maintain fixed width serials" />
                  </div>
                  <select
                    value={currentPadding}
                    onChange={(e) =>
                      handleChange(currentDoc.padKey, parseInt(e.target.value) || 1)
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/15 cursor-pointer transition"
                  >
                    <option value="1">No Padding (e.g. 1, 2, 3)</option>
                    <option value="3">3 Digits (e.g. 001, 002)</option>
                    <option value="4">4 Digits (e.g. 0001, 0002)</option>
                    <option value="5">5 Digits (e.g. 00001, 00002)</option>
                    <option value="6">6 Digits (e.g. 000001, 000002)</option>
                  </select>
                </div>
              </div>

              {/* 3. Live Dynamic Number Preview Box (Enhanced Padding) */}
              <div className="bg-gradient-to-br from-blue-50/90 via-indigo-50/60 to-slate-50 border border-blue-200/90 rounded-2xl p-6 sm:p-7 my-3.5 shadow-xs">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-blue-700 flex items-center gap-2">
                    <Sparkles size={16} className="text-blue-600" />
                    Next {currentDoc.title} Voucher Preview
                  </span>
                  <span className="text-[10px] font-extrabold bg-blue-600 text-white px-2.5 py-0.5 rounded-full shadow-xs">
                    Next Auto Sequence
                  </span>
                </div>
                <div className="text-3xl sm:text-4xl font-black font-mono text-blue-900 tracking-wider my-3">
                  {currentPreview}
                </div>
                <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
                  When creating the next <strong>{currentDoc.title}</strong>, it will automatically receive this formatted serial and advance to the subsequent number.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 Cols): All Series Matrix Overview */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-slate-100 mb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">All Document Series Matrix</h3>
                <p className="text-[11px] text-slate-400 font-medium">Quick inspection of all voucher formats</p>
              </div>
              <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {filteredDocuments.length} / {DOCUMENT_TYPES.length} Series
              </span>
            </div>

            {/* Matrix Items List */}
            <div className="space-y-1.5 max-h-[440px] overflow-y-auto pr-1 paysplitx-scrollbar-light">
              {filteredDocuments.map((doc) => {
                const isSelected = selectedDocKey === doc.key;
                const p = formData[doc.prefixKey] ?? doc.defaultPrefix;
                const n = formData[doc.numKey] ?? 1;
                const pad = formData[doc.padKey] ?? 4;
                const preview = computePreview(p, n, pad);
                const Icon = doc.icon;

                return (
                  <div
                    key={doc.key}
                    onClick={() => setSelectedDocKey(doc.key)}
                    className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer select-none ${
                      isSelected
                        ? "bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/10 shadow-xs"
                        : "bg-slate-50/50 hover:bg-slate-100/70 border-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelected ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200"
                        }`}
                      >
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate">
                          {doc.title}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          Prefix: <span className="font-semibold text-slate-600">{p === "None" ? "—" : p || "—"}</span> • Padding: {pad}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-2">
                      <span className="text-[11px] font-mono font-black text-blue-700 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-xs">
                        {preview}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. STICKY RECONCILIATION ACTION FOOTER ── */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle size={16} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">
              Auto-Increment Synchronized for Branch: <span className="text-blue-600 font-bold">{activeCompanyObj?.company_name || `Company #${companyId}`}</span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Saving updates prefix configurations across all Sales, Purchases, Credit/Debit notes, and Accounts.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition shadow-md shadow-blue-500/20 hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {saving ? (
            <>
              <RefreshCw size={15} className="animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <Save size={15} />
              <span>Save Numbering Settings</span>
            </>
          )}
        </button>
      </div>
    </SettingsShell>
  );
}

