import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { WHATSAPP_ROUTE } from "../../utils/whatsappShare";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  CreditCard,
  ReceiptText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Pencil,
  Wallet,
  MessageCircle,
  History,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Clock,
  Send,
  Truck,
  Hash,
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

export default function CustomerDetailsModal({
  customer,
  pendingTotal = 0,
  isOpen,
  onClose,
  onEdit,
  onCollect,
  onSendReminder,
  onViewLedger,
  onViewHistory,
}) {
  const [copiedKey, setCopiedKey] = useState(null);
  const navigate = useNavigate();

  // WhatsApp chats always open in the app's own /whatsapp page, which handles
  // connection and sending. wa.me / WhatsApp Web are never opened.
  const openWhatsAppChat = () => {
    if (onClose) onClose();
    navigate(WHATSAPP_ROUTE, { state: { openPhone: customer?.phone || null } });
  };

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

  if (!isOpen || !customer) return null;

  const fmt = (v) => Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getInitials = (name) =>
    name
      ?.split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "CU";

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

  const gstState = getGstState(customer.gst_no);

  const isCreditAllowed =
    Number(customer.credit_enabled) === 1 ||
    customer.credit_enabled === "1" ||
    customer.credit_enabled === true ||
    Number(customer.credit_limit || 0) > 0;

  const creditLimit = Number(customer.credit_limit || 0);
  const pendingAmount = Number(pendingTotal || customer.pending_amount || 0);
  const advanceAmount = Number(customer.advance_balance || 0);

  const creditUsagePct = creditLimit > 0 ? Math.min(100, Math.round((pendingAmount / creditLimit) * 100)) : 0;

  // Formatted address helper
  const fullAddress = [
    customer.address_line1 || customer.billing_address || customer.address,
    customer.address_line2,
    customer.city,
    customer.state,
    customer.billing_pincode || customer.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  const fullShippingAddress = [
    customer.shipping_address_line1 || customer.shipping_address,
    customer.shipping_address_line2,
    customer.shipping_city,
    customer.shipping_country,
    customer.shipping_pincode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      className="fixed inset-0 z-[100000] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh] animate-in zoom-in-95 duration-200 font-['Plus_Jakarta_Sans',sans-serif]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 1. MODAL HERO HEADER ── */}
        <div className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 flex-shrink-0">
          <div className="absolute top-0 right-1/4 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4 min-w-0">
              {/* Initials Avatar */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-600 p-1 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20 border-2 border-white/20">
                <span className="text-xl font-black text-white tracking-wider">
                  {getInitials(customer.name)}
                </span>
              </div>

              {/* Title & Core Meta */}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                    UID #{customer.id}
                  </span>

                  {isCreditAllowed ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      <CreditCard size={10} /> Credit Customer
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-700 text-slate-300">
                      Cash Only
                    </span>
                  )}

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      pendingAmount > 0
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        pendingAmount > 0 ? "bg-rose-400 animate-pulse" : "bg-emerald-400"
                      }`}
                    />
                    {pendingAmount > 0 ? `₹${fmt(pendingAmount)} Due` : "All Cleared"}
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight truncate font-display">
                  {customer.name}
                </h2>
                <p className="text-xs text-slate-300 truncate mt-0.5 flex items-center gap-2">
                  <Phone size={12} className="text-indigo-400 flex-shrink-0" />
                  <span className="font-mono">{customer.phone || "No phone provided"}</span>
                  {customer.email && (
                    <>
                      <span className="text-slate-500">•</span>
                      <Mail size={12} className="text-indigo-400 flex-shrink-0" />
                      <span className="truncate">{customer.email}</span>
                    </>
                  )}
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

          {/* Quick Balance KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-4 border-t border-white/10 text-xs">
            {/* Total Pending */}
            <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Pending Balance</span>
              <span className={`font-black text-sm block ${pendingAmount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                ₹{fmt(pendingAmount)}
              </span>
            </div>

            {/* Advance Balance */}
            <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Advance Deposit</span>
              <span className={`font-black text-sm block ${advanceAmount > 0 ? "text-emerald-400" : "text-slate-300"}`}>
                ₹{fmt(advanceAmount)}
              </span>
            </div>

            {/* Credit Limit */}
            <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400">Credit Limit</span>
                {creditLimit > 0 && (
                  <span className="text-[9px] font-bold text-indigo-300">{creditUsagePct}% used</span>
                )}
              </div>
              <span className="font-bold text-slate-100 text-sm block">
                {creditLimit > 0 ? `₹${fmt(creditLimit)}` : "No Limit"}
              </span>
              {creditLimit > 0 && (
                <div className="w-full h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      creditUsagePct >= 90
                        ? "bg-rose-500"
                        : creditUsagePct >= 70
                        ? "bg-amber-500"
                        : "bg-indigo-400"
                    }`}
                    style={{ width: `${creditUsagePct}%` }}
                  />
                </div>
              )}
            </div>

            {/* Credit Days */}
            <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Credit Terms</span>
              <span className="font-bold text-slate-100 block">
                {Number(customer.credit_days || 0) > 0 ? `${customer.credit_days} Days` : "Immediate / Net 0"}
              </span>
            </div>
          </div>
        </div>

        {/* ── 2. MODAL BODY (Structured Detail Cards) ── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 paysplitx-scrollbar-light">
          {/* Action Notification Strip */}
          {pendingAmount > 0 ? (
            <div className="bg-rose-50 border border-rose-200/90 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-rose-900">
              <div className="flex items-center gap-2.5">
                <AlertCircle size={18} className="text-rose-600 flex-shrink-0" />
                <div>
                  <span className="font-bold">Pending Receivables: </span>
                  Customer has <strong>₹{fmt(pendingAmount)}</strong> in unsettled balances.
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {onSendReminder && (
                  <button
                    type="button"
                    onClick={() => onSendReminder(customer)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                    title="Send WhatsApp Balance Reminder"
                  >
                    <MessageCircle size={13} />
                    <span>WhatsApp</span>
                  </button>
                )}
                {onCollect && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onCollect(customer);
                    }}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <Wallet size={13} />
                    <span>Collect Payment</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs text-emerald-900">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
                <span>Account is in good standing with zero overdue balance.</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                Health 100%
              </span>
            </div>
          )}

          {/* Grid of Details Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Contact & Communication */}
            <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <Phone size={14} className="text-indigo-600" />
                <span>Contact Channels</span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px] font-semibold">Primary Phone</span>
                    {customer.phone && (
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${customer.phone}`}
                          className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5"
                        >
                          <Phone size={10} /> Call
                        </a>
                        <button
                          type="button"
                          onClick={openWhatsAppChat}
                          className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center gap-0.5"
                        >
                          <MessageCircle size={10} /> Chat
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="font-bold text-slate-800 font-mono text-sm block mt-0.5">
                    {customer.phone || "—"}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px] font-semibold">Email Address</span>
                    {customer.email && (
                      <a
                        href={`mailto:${customer.email}`}
                        className="text-[11px] font-bold text-indigo-600 hover:underline inline-flex items-center gap-1"
                      >
                        <ExternalLink size={10} /> Mail
                      </a>
                    )}
                  </div>
                  <span className="font-semibold text-slate-800 truncate block mt-0.5">
                    {customer.email || "No email on record"}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: GSTIN & Tax Identifiers */}
            <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <ReceiptText size={14} className="text-indigo-600" />
                <span>GSTIN &amp; Tax Compliance</span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px] font-semibold">GSTIN / Tax ID</span>
                    {customer.gst_no && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(customer.gst_no, "gst_no")}
                        className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === "gst_no" ? (
                          <>
                            <Check size={12} className="text-emerald-600" />
                            <span className="text-emerald-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <span className="font-mono font-extrabold text-slate-900 text-sm bg-white px-2 py-0.5 rounded border border-slate-200 inline-block mt-0.5">
                    {customer.gst_no || "Unregistered / Consumer"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 text-[11px] font-semibold block">GST Type</span>
                    <span className="font-semibold text-slate-800 capitalize">
                      {customer.gst_type || customer.type || "Consumer"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] font-semibold block">PAN Number</span>
                    <span className="font-mono font-bold text-slate-800">
                      {customer.pan_number || "—"}
                    </span>
                  </div>
                </div>

                {gstState && (
                  <div>
                    <span className="text-slate-400 text-[11px] font-semibold block">GST Jurisdiction</span>
                    <span className="font-semibold text-slate-800">{gstState}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Card 3: Billing Address */}
            <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <MapPin size={14} className="text-indigo-600" />
                <span>Billing Address</span>
              </div>

              <div className="text-xs space-y-1.5">
                <p className="font-medium text-slate-800 leading-relaxed bg-white p-2.5 rounded-xl border border-slate-200">
                  {fullAddress || "No complete billing address registered."}
                </p>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <div>
                    <span className="text-slate-400 block font-semibold">City / State:</span>
                    <span>{[customer.city, customer.state].filter(Boolean).join(", ") || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Pincode:</span>
                    <span className="font-mono">{customer.billing_pincode || customer.pincode || "—"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Shipping Address & Banking */}
            <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <Truck size={14} className="text-indigo-600" />
                <span>Shipping &amp; Account</span>
              </div>

              <div className="text-xs space-y-2">
                <div>
                  <span className="text-slate-400 text-[11px] font-semibold block">Shipping Address</span>
                  <p className="font-medium text-slate-800 leading-relaxed bg-white p-2 rounded-xl border border-slate-200 mt-0.5">
                    {fullShippingAddress || fullAddress || "Same as Billing Address"}
                  </p>
                </div>

                {customer.account_number && (
                  <div>
                    <span className="text-slate-400 text-[11px] font-semibold block">Account Reference</span>
                    <span className="font-mono font-bold text-slate-800">{customer.account_number}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Direct Actions Launchpad */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Customer Records &amp; Transactions
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Quick ledger tools</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold">
              {onViewLedger && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onViewLedger(customer);
                  }}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-indigo-600 hover:text-white transition cursor-pointer border border-white/10 group"
                >
                  <div className="flex items-center gap-2">
                    <ReceiptText size={15} className="text-indigo-400 group-hover:text-white" />
                    <span>View Invoices Ledger</span>
                  </div>
                  <ArrowRight size={13} />
                </button>
              )}

              {onViewHistory && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onViewHistory(customer);
                  }}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-violet-600 hover:text-white transition cursor-pointer border border-white/10 group"
                >
                  <div className="flex items-center gap-2">
                    <History size={15} className="text-violet-400 group-hover:text-white" />
                    <span>Payment Receipts History</span>
                  </div>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── 3. MODAL FOOTER ── */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="text-[11px] text-slate-500 font-medium">
            Account Status:{" "}
            <strong className="text-slate-800 capitalize">
              {pendingAmount > 0 ? "Pending Balance" : "Cleared Account"}
            </strong>
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
                  onEdit(customer.id);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition cursor-pointer flex items-center gap-1.5"
              >
                <Pencil size={14} />
                <span>Edit Profile</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
