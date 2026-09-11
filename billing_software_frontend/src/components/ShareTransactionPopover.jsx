import { useEffect, useRef } from "react";

/* ── 1. Official Email / Gmail Icon SVG ── */
export function GmailIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#ffffff" />
      <path
        d="M10 37V15.5L24 26L38 15.5V37C38 38.1 37.1 39 36 39H12C10.9 39 10 38.1 10 37Z"
        fill="#FAFAFA"
      />
      <path
        d="M38 13.8V15.5L24 26L10 15.5V13.8C10 12.5 11.4 11.8 12.4 12.5L24 21.2L35.6 12.5C36.6 11.8 38 12.5 38 13.8Z"
        fill="#EA4335"
      />
      <path
        d="M38 15.5V37C38 38.1 37.1 39 36 39H34V23.5L38 15.5Z"
        fill="#FBBC04"
      />
      <path
        d="M10 15.5V37C10 38.1 10.9 39 12 39H14V23.5L10 15.5Z"
        fill="#4285F4"
      />
      <path
        d="M10 15.5L24 26V39H12C10.9 39 10 38.1 10 37V15.5Z"
        fill="#34A853"
      />
      <path
        d="M38 15.5L24 26V39H36C37.1 39 38 38.1 38 37V15.5Z"
        fill="#EA4335"
      />
      <rect x="6" y="6" width="36" height="36" rx="8" stroke="#E2E8F0" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

/* ── 2. Official WhatsApp Icon SVG ── */
export function WhatsAppIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="22" fill="#25D366" />
      <path
        d="M34.5 28.2c-.5-.3-2.9-1.4-3.3-1.6-.4-.2-.7-.3-1 .3-.3.4-1.2 1.5-1.4 1.8-.3.3-.6.3-1.1.1-.5-.3-2-0.7-3.8-2.3-1.4-1.2-2.3-2.7-2.6-3.2-.3-.5 0-.8.2-1 .2-.2.5-.6.7-.9.2-.3.3-.5.5-.8.2-.3 0-.6 0-.8-.2-.3-1-2.6-1.5-3.5-.4-.9-.8-.8-1.1-.8h-.9c-.3 0-1 .1-1.4.6-.5.6-1.8 1.8-1.8 4.4s1.8 5.1 2.1 5.5c.3.4 3.6 5.6 8.9 7.9 1.2.5 2.2.9 3 .1.2.8.4 2.4.3 3.3.2 1.1-.2 2.9-1.2 3.3-2.4.4-1.1.4-2.1.3-2.3-.2-.2-.5-.3-.9-.5z"
        fill="#ffffff"
      />
    </svg>
  );
}

/* ── 3. Official SMS / Message Icon SVG ── */
export function SmsIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="22" fill="#F59E0B" />
      <path
        d="M13 22c0-5.5 4.9-10 11-10s11 4.5 11 10-4.9 10-11 10c-1.8 0-3.5-.4-5-1.1L13 33l1.5-4.2C13.6 26.8 13 24.5 13 22z"
        fill="#ffffff"
      />
      <circle cx="19" cy="22" r="1.8" fill="#F59E0B" />
      <circle cx="24" cy="22" r="1.8" fill="#F59E0B" />
      <circle cx="29" cy="22" r="1.8" fill="#F59E0B" />
    </svg>
  );
}

/* ── 4. Main ShareTransactionPopover Component ── */
export default function ShareTransactionPopover({
  isOpen,
  onClose,
  transaction = {},
  type = "Invoice",
}) {
  const popoverRef = useRef(null);

  // Close on click outside or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Extract common fields safely
  const docNo =
    transaction.invoice_no ||
    transaction.purchase_no ||
    transaction.return_no ||
    transaction.receipt_no ||
    transaction.refNo ||
    transaction.expense_no ||
    transaction.id ||
    "1";

  const partyName =
    transaction.customer_name ||
    transaction.supplier_name ||
    transaction.party_name ||
    transaction.party ||
    transaction.name ||
    "Customer / Party";

  const phone =
    transaction.customer_phone ||
    transaction.supplier_phone ||
    transaction.party_phone ||
    transaction.phone ||
    transaction.mobile ||
    "";

  const email =
    transaction.customer_email ||
    transaction.supplier_email ||
    transaction.email ||
    "";

  const rawDate =
    transaction.invoice_date ||
    transaction.bill_date ||
    transaction.payment_date ||
    transaction.expense_date ||
    transaction.return_date ||
    transaction.created_at ||
    transaction.date ||
    new Date().toISOString();

  let dateStr = "";
  try {
    const d = new Date(rawDate);
    dateStr = !isNaN(d.getTime())
      ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
      : String(rawDate).split("T")[0];
  } catch {
    dateStr = String(rawDate).split("T")[0];
  }

  const rawAmount =
    transaction.total_amount ??
    transaction.amount ??
    transaction.paid_amount ??
    transaction.grandTotal ??
    0;

  const formattedAmount = Number(rawAmount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const paymentMode =
    transaction.payment_type ||
    transaction.payment_method ||
    "Cash";

  /* ── 1. Share via WhatsApp ── */
  const handleShareWhatsApp = (e) => {
    e.stopPropagation();
    const cleanPhone = String(phone || "").replace(/[^0-9]/g, "");
    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const text =
      `*${type} #${docNo}*\n` +
      `*Party:* ${partyName}\n` +
      `*Date:* ${dateStr}\n` +
      `*Total Amount:* ₹${formattedAmount}\n` +
      `*Payment Mode:* ${paymentMode}\n\n` +
      `Thank you for doing business with us!`;

    const url = targetPhone
      ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(url, "_blank");
    onClose();
  };

  /* ── 2. Share via Gmail / Email ── */
  const handleShareEmail = (e) => {
    e.stopPropagation();
    const subject = `${type} #${docNo} from Billing`;
    const body =
      `Dear ${partyName},\n\n` +
      `Please find the details for your ${type} #${docNo}:\n\n` +
      `• Document No: ${docNo}\n` +
      `• Date: ${dateStr}\n` +
      `• Total Amount: ₹${formattedAmount}\n` +
      `• Payment Mode: ${paymentMode}\n\n` +
      `Thank you for your business!`;

    window.open(
      `mailto:${email || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      "_blank"
    );
    onClose();
  };

  /* ── 3. Share via SMS ── */
  const handleShareSMS = (e) => {
    e.stopPropagation();
    const cleanPhone = String(phone || "").replace(/[^0-9]/g, "");
    const body = `${type} #${docNo} for ${partyName}. Total: ₹${formattedAmount} on ${dateStr}. Thank you!`;
    window.open(`sms:${cleanPhone || ""}?body=${encodeURIComponent(body)}`, "_blank");
    onClose();
  };

  return (
    <div
      ref={popoverRef}
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-3.5 z-[9999] min-w-[210px] text-left animate-in fade-in zoom-in-95 duration-100 font-sans select-none"
      style={{ filter: "drop-shadow(0 10px 25px rgba(0,0,0,0.15))" }}
    >
      {/* Little Pointer Arrow pointing to share button */}
      <div className="absolute -top-1.5 right-3 w-3 h-3 bg-white border-t border-l border-slate-200 rotate-45" />

      {/* Header */}
      <div className="flex items-center justify-between mb-2.5 px-0.5">
        <span className="text-xs font-black text-slate-800 tracking-tight">Share</span>
      </div>

      {/* Channels Row (Email / WhatsApp / SMS) */}
      <div className="flex items-center gap-2">
        {/* Email / Gmail */}
        <button
          type="button"
          onClick={handleShareEmail}
          className="flex-1 flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition cursor-pointer group"
          title="Share via Email"
        >
          <div className="transform group-hover:scale-110 transition duration-150">
            <GmailIcon size={26} />
          </div>
          <span className="text-[11px] font-bold text-slate-700 mt-1.5 group-hover:text-blue-600">
            Email
          </span>
        </button>

        {/* WhatsApp */}
        <button
          type="button"
          onClick={handleShareWhatsApp}
          className="flex-1 flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 transition cursor-pointer group"
          title="Share via WhatsApp"
        >
          <div className="transform group-hover:scale-110 transition duration-150">
            <WhatsAppIcon size={26} />
          </div>
          <span className="text-[11px] font-bold text-slate-700 mt-1.5 group-hover:text-emerald-600">
            WhatsApp
          </span>
        </button>

        {/* SMS */}
        <button
          type="button"
          onClick={handleShareSMS}
          className="flex-1 flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 transition cursor-pointer group"
          title="Share via SMS"
        >
          <div className="transform group-hover:scale-110 transition duration-150">
            <SmsIcon size={26} />
          </div>
          <span className="text-[11px] font-bold text-slate-700 mt-1.5 group-hover:text-amber-600">
            SMS
          </span>
        </button>
      </div>
    </div>
  );
}
