import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../services/api";
import {
  Building2,
  Hash,
  MapPin,
  Phone,
  Mail,
  ReceiptText,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Pencil,
  X,
  ExternalLink,
  Copy,
  Check,
  Store,
  Package,
  Layers,
  Sparkles,
  ArrowRight,
  Globe,
  Tag,
} from "lucide-react";

const GST_STATE_CODES = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "36": "Telangana",
  "37": "Andhra Pradesh",
};

export default function CompanyDetailsModal({
  company,
  isOpen,
  onClose,
  onEdit,
  onToggleStatus,
}) {
  const navigate = useNavigate();
  const [copiedKey, setCopiedKey] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "tax" | "actions"

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  if (!isOpen || !company) return null;

  const getLogoUrl = (logo) => {
    if (!logo) return null;
    if (logo.startsWith("http://") || logo.startsWith("https://")) {
      return logo;
    }
    const baseUrl = API_BASE_URL.replace("/api/", "/");
    return `${baseUrl}${logo}`;
  };

  const logoUrl = getLogoUrl(company.logo);

  const getInitials = (name) =>
    name
      ?.split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "CO";

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getGstState = (gstin) => {
    if (!gstin || gstin.length < 2) return null;
    const code = gstin.substring(0, 2);
    return GST_STATE_CODES[code] ? `${code} - ${GST_STATE_CODES[code]}` : `State Code ${code}`;
  };

  const gstState = getGstState(company.gstin);

  const isCurrentActiveBranch =
    localStorage.getItem("selected_company_id") === String(company.id);

  const handleSetAsActiveBranch = () => {
    localStorage.setItem("selected_company_id", String(company.id));
    window.dispatchEvent(new Event("storage"));
    setCopiedKey("branch_set");
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleNavigateWithBranch = (path) => {
    localStorage.setItem("selected_company_id", String(company.id));
    onClose();
    navigate(path);
  };

  return (
    <div
      className="fixed inset-0 z-[100000] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh] animate-in zoom-in-95 duration-200 font-['Plus_Jakarta_Sans',sans-serif]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 1. MODAL HEADER HERO BANNER ── */}
        <div className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 flex-shrink-0">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-1/4 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4 min-w-0">
              {/* Logo / Initials Avatar */}
              <div className="w-16 h-16 rounded-2xl bg-white/10 border-2 border-white/20 p-1 flex items-center justify-center flex-shrink-0 shadow-lg backdrop-blur-md overflow-hidden">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={company.company_name}
                    className="w-full h-full object-contain rounded-xl"
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.parentElement.innerHTML = `<span class="text-xl font-black text-white">${getInitials(
                        company.company_name
                      )}</span>`;
                    }}
                  />
                ) : (
                  <span className="text-xl font-black text-white tracking-wider">
                    {getInitials(company.company_name)}
                  </span>
                )}
              </div>

              {/* Title & Core Meta */}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                    ID #{company.id}
                  </span>
                  {company.company_code && (
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-slate-200 border border-white/10 flex items-center gap-1">
                      <Hash size={10} />
                      {company.company_code}
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      company.status === "active"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        company.status === "active" ? "bg-emerald-400 animate-pulse" : "bg-slate-400"
                      }`}
                    />
                    {company.status || "active"}
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight truncate font-display">
                  {company.company_name}
                </h2>
                <p className="text-xs text-slate-300 truncate mt-0.5 flex items-center gap-1.5">
                  <MapPin size={12} className="text-indigo-400 flex-shrink-0" />
                  <span className="truncate">{company.company_address || "No address provided"}</span>
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer flex-shrink-0 border border-white/10"
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-4 border-t border-white/10 text-xs">
            <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Tax Regime</span>
              <span className="font-bold text-slate-100 capitalize">
                {company.gst_type ? company.gst_type.replace("_", " ") : "With GST"}
              </span>
            </div>
            <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">GSTIN Status</span>
              <span className="font-mono font-bold text-indigo-300 truncate block">
                {company.gstin ? "Registered" : "Unregistered"}
              </span>
            </div>
            <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Contact Phone</span>
              <span className="font-bold text-slate-100 truncate block">
                {company.phone || "—"}
              </span>
            </div>
            <div className="bg-white/5 rounded-xl p-2.5 border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Status Toggle</span>
                <span className="font-bold text-slate-200 capitalize text-[11px]">
                  {company.status === "active" ? "Active" : "Inactive"}
                </span>
              </div>
              {onToggleStatus && (
                <button
                  type="button"
                  onClick={() => onToggleStatus(company)}
                  className={`w-8 h-5 rounded-full transition-colors relative cursor-pointer ${
                    company.status === "active" ? "bg-emerald-500" : "bg-slate-600"
                  }`}
                  title="Toggle Active / Inactive"
                >
                  <span
                    className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-transform ${
                      company.status === "active" ? "left-4" : "left-0.5"
                    }`}
                  />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── 2. MODAL BODY (Scrollable Detail Panels) ── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 paysplitx-scrollbar-light">
          {/* Active Branch Quick Alert */}
          {isCurrentActiveBranch ? (
            <div className="bg-indigo-50/80 border border-indigo-200/90 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs text-indigo-900">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                  ✓
                </div>
                <div>
                  <span className="font-bold">Currently Selected Branch: </span>
                  All POS bills, invoices, and stock entries are currently mapped to this company.
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider flex-shrink-0">
                Active Session
              </span>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-slate-500" />
                <span>Switch to this branch to create bills or view invoices under this firm.</span>
              </div>
              <button
                type="button"
                onClick={handleSetAsActiveBranch}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition cursor-pointer flex-shrink-0 flex items-center gap-1.5 shadow-xs"
              >
                {copiedKey === "branch_set" ? (
                  <>
                    <Check size={13} />
                    <span>Selected!</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    <span>Set as Active Branch</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Grid of Detail Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Legal Entity & Identity */}
            <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <Building2 size={14} className="text-indigo-600" />
                <span>Entity Identity</span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] font-semibold block">Company Name</span>
                  <span className="font-bold text-slate-900 text-sm">{company.company_name}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 text-[11px] font-semibold block">Company Code</span>
                    <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block mt-0.5">
                      {company.company_code || "—"}
                    </span>
                  </div>
                  {company.company_code && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(company.company_code, "code")}
                      className="text-slate-400 hover:text-indigo-600 p-1 rounded hover:bg-white transition cursor-pointer"
                      title="Copy Company Code"
                    >
                      {copiedKey === "code" ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 text-[11px] font-semibold block">Branch ID</span>
                  <span className="font-mono text-slate-700">ENTITY-UID-{company.id}</span>
                </div>
              </div>
            </div>

            {/* Card 2: GSTIN & Tax Compliance */}
            <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <ReceiptText size={14} className="text-indigo-600" />
                <span>GSTIN &amp; Compliance</span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px] font-semibold">GSTIN Identification</span>
                    {company.gstin && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(company.gstin, "gstin")}
                        className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === "gstin" ? (
                          <>
                            <Check size={12} className="text-emerald-600" />
                            <span className="text-emerald-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Copy GSTIN</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <span className="font-mono font-extrabold text-slate-900 text-sm bg-white px-2.5 py-1 rounded-lg border border-slate-200 inline-block mt-1">
                    {company.gstin || "NOT REGISTERED / CONSUMER"}
                  </span>
                </div>

                {gstState && (
                  <div>
                    <span className="text-slate-400 text-[11px] font-semibold block">GST State Jurisdiction</span>
                    <span className="font-semibold text-slate-800">{gstState}</span>
                  </div>
                )}

                <div>
                  <span className="text-slate-400 text-[11px] font-semibold block">Tax Filing Scheme</span>
                  <span className="font-semibold text-slate-800 capitalize">
                    {company.gst_type ? company.gst_type.replace("_", " ") : "With GST Invoice"}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Contact & Communication */}
            <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <Phone size={14} className="text-indigo-600" />
                <span>Contact Channels</span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px] font-semibold">Official Phone</span>
                    {company.phone && (
                      <a
                        href={`tel:${company.phone}`}
                        className="text-[11px] font-bold text-indigo-600 hover:underline inline-flex items-center gap-1"
                      >
                        <ExternalLink size={10} /> Call
                      </a>
                    )}
                  </div>
                  <span className="font-bold text-slate-800 font-mono text-sm block mt-0.5">
                    {company.phone || "—"}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px] font-semibold">Email Address</span>
                    {company.email && (
                      <a
                        href={`mailto:${company.email}`}
                        className="text-[11px] font-bold text-indigo-600 hover:underline inline-flex items-center gap-1"
                      >
                        <ExternalLink size={10} /> Mail
                      </a>
                    )}
                  </div>
                  <span className="font-semibold text-slate-800 truncate block mt-0.5">
                    {company.email || "No email on record"}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 4: Registered Address */}
            <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <MapPin size={14} className="text-indigo-600" />
                <span>Physical Location</span>
              </div>

              <div className="text-xs space-y-1.5">
                <span className="text-slate-400 text-[11px] font-semibold block">Full Registered Address</span>
                <p className="font-medium text-slate-800 leading-relaxed bg-white p-2.5 rounded-xl border border-slate-200">
                  {company.company_address || "No complete address entered for this company."}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Direct Launchpad Shortcuts */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Quick Actions For This Branch
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Launch direct workspace</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => handleNavigateWithBranch("/billing")}
                className="flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-emerald-600 hover:text-white transition cursor-pointer border border-white/10 group"
              >
                <div className="flex items-center gap-2">
                  <Store size={15} className="text-emerald-400 group-hover:text-white" />
                  <span>Open POS Counter</span>
                </div>
                <ArrowRight size={13} />
              </button>

              <button
                type="button"
                onClick={() => handleNavigateWithBranch("/sales/invoices")}
                className="flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-indigo-600 hover:text-white transition cursor-pointer border border-white/10 group"
              >
                <div className="flex items-center gap-2">
                  <ReceiptText size={15} className="text-indigo-400 group-hover:text-white" />
                  <span>View Sale Invoices</span>
                </div>
                <ArrowRight size={13} />
              </button>

              <button
                type="button"
                onClick={() => handleNavigateWithBranch("/products")}
                className="flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-violet-600 hover:text-white transition cursor-pointer border border-white/10 group"
              >
                <div className="flex items-center gap-2">
                  <Package size={15} className="text-violet-400 group-hover:text-white" />
                  <span>Inventory Catalog</span>
                </div>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* ── 3. MODAL FOOTER ── */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="text-[11px] text-slate-500 font-medium">
            Entity Status: <strong className="text-slate-800 capitalize">{company.status || "active"}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              Close
            </button>
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(company.id);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition cursor-pointer flex items-center gap-1.5"
              >
                <Pencil size={14} />
                <span>Edit Company</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
