import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import InvoicePdfCapture from "./InvoicePdfCapture";
import {
  buildInvoiceShareCaption,
  composeShareDocument,
  fetchWhatsAppConnection,
  formatAmount,
  isValidWaPhone,
  normalizeWaPhone,
  sendInvoiceDocument,
  WHATSAPP_ROUTE,
} from "../utils/whatsappShare";
import { queuePendingWhatsAppSend } from "../utils/pendingWhatsAppSend";

/* ── 1. Official Google Gmail Icon SVG (Crisp Pixel-Perfect) ── */
export function GmailIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M45 16.2V38C45 40.2 43.2 42 41 42H35V22.5L24 30.7L13 22.5V42H7C4.8 42 3 40.2 3 38V16.2C3 12.7 6.9 10.6 9.8 12.8L24 23.3L38.2 12.8C41.1 10.6 45 12.7 45 16.2Z"
        fill="#EA4335"
      />
      <path d="M35 42V22.5L45 15V38C45 40.2 43.2 42 41 42H35Z" fill="#34A853" />
      <path d="M13 42V22.5L3 15V38C3 40.2 4.8 42 7 42H13Z" fill="#4285F4" />
      <path d="M3 16.2L13 23.6V12.1L7.8 8.2C5.9 6.8 3 8.2 3 10.6V16.2Z" fill="#C5221F" />
      <path d="M45 16.2L35 23.6V12.1L40.2 8.2C42.1 6.8 45 8.2 45 10.6V16.2Z" fill="#FBBC04" />
    </svg>
  );
}

/* ── 2. Official WhatsApp Brand Icon SVG (Crisp Pixel-Perfect) ── */
export function WhatsAppIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="22" fill="#25D366" />
      <path
        d="M34.6 28.5c-.5-.3-2.9-1.4-3.4-1.6-.4-.2-.8-.3-1.1.3-.3.4-1.2 1.5-1.5 1.8-.3.3-.6.3-1.1.1-.5-.3-2.1-.8-3.9-2.4-1.4-1.3-2.4-2.8-2.7-3.3-.3-.5 0-.8.2-1 .2-.2.5-.6.7-.9.2-.3.3-.5.5-.8.2-.3 0-.6-.1-.8-.1-.3-1.1-2.7-1.5-3.6-.4-.9-.8-.8-1.1-.8h-.9c-.3 0-1 .1-1.5.7-.5.6-1.9 1.9-1.9 4.6s2 5.3 2.2 5.7c.3.4 3.8 5.8 9.2 8.2 1.3.6 2.3 1 3.1 1.2 1.3.4 2.5.4 3.5.2 1.1-.2 2.9-1.2 3.3-2.4.4-1.1.4-2.1.3-2.3-.2-.2-.5-.3-.9-.5z"
        fill="#ffffff"
      />
    </svg>
  );
}

const POPOVER_VIEWPORT_MARGIN = 8;
const POPOVER_GAP = 8;

function computePopoverPosition(anchorRect, width, height) {
  const vw = window.innerWidth || document.documentElement.clientWidth || 0;
  const vh = window.innerHeight || document.documentElement.clientHeight || 0;

  const spaceBelow = vh - anchorRect.bottom - POPOVER_GAP - POPOVER_VIEWPORT_MARGIN;
  const spaceAbove = anchorRect.top - POPOVER_GAP - POPOVER_VIEWPORT_MARGIN;

  let openUp;
  if (spaceBelow >= height) openUp = false;
  else if (spaceAbove >= height) openUp = true;
  else openUp = spaceAbove > spaceBelow;

  let top = openUp ? anchorRect.top - height - POPOVER_GAP : anchorRect.bottom + POPOVER_GAP;
  top = Math.max(POPOVER_VIEWPORT_MARGIN, Math.min(top, vh - height - POPOVER_VIEWPORT_MARGIN));

  let left = anchorRect.right - width;
  left = Math.max(POPOVER_VIEWPORT_MARGIN, Math.min(left, vw - width - POPOVER_VIEWPORT_MARGIN));

  return { top, left, openUp };
}

/* ── 3. Main ShareTransactionPopover Component ── */
export default function ShareTransactionPopover({
  isOpen,
  onClose,
  transaction = {},
  type = "Invoice",
  anchorElRef,
}) {
  const popoverRef = useRef(null);
  const [isSending, setIsSending] = useState(false);
  const [sendDoc, setSendDoc] = useState(null);
  const [pos, setPos] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Close on click outside or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e) => {
      const pop = popoverRef.current;
      const anchor = anchorElRef && anchorElRef.current;
      if (pop && pop.contains(e.target)) return;
      if (anchor && anchor.contains(e.target)) return;
      onClose();
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
  }, [isOpen, onClose, anchorElRef]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const pop = popoverRef.current;
    const anchor = anchorElRef && anchorElRef.current;
    if (!pop || !anchor) return;
    const anchorRect = anchor.getBoundingClientRect();
    setPos(computePopoverPosition(anchorRect, pop.offsetWidth || 200, pop.offsetHeight || 0));
  }, [isOpen, anchorElRef]);

  useEffect(() => {
    if (!isOpen) return;
    const reposition = () => {
      const pop = popoverRef.current;
      const anchor = anchorElRef && anchorElRef.current;
      if (!pop || !anchor) return;
      const anchorRect = anchor.getBoundingClientRect();
      setPos(computePopoverPosition(anchorRect, pop.offsetWidth || 200, pop.offsetHeight || 0));
    };
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [isOpen, anchorElRef]);

  if (!isOpen && !sendDoc) return null;

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
    transaction.phone_number ||
    transaction.phone ||
    transaction.mobile ||
    transaction.mobile_number ||
    transaction.contact ||
    transaction.contact_no ||
    "";

  const email =
    transaction.customer_email ||
    transaction.supplier_email ||
    transaction.party_email ||
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

  const formattedAmount = formatAmount(rawAmount);

  const paymentMode =
    transaction.payment_type ||
    transaction.payment_method ||
    "Cash";

  // Build direct invoice preview/download link
  const invoiceUrl = `${window.location.origin}/invoice/${docNo}`;

  // Company details
  let companyId = transaction.company_id || 0;
  let companyName = "";
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    companyId = companyId || user?.company_id || localStorage.getItem("selected_company_id") || 0;
    companyName = user?.company_name || user?.name || "";
  } catch {
    companyName = "";
  }

  const cleanPhone = String(phone || "").replace(/[^0-9]/g, "");
  const targetPhone = normalizeWaPhone(phone);

  /* ── 1. Share via WhatsApp ──────────────────────────────────────────────
     WhatsApp is ALWAYS handled by the application's own /whatsapp page.
       • already connected  → render PDF + POST /whatsapp/send_invoice right here
       • not connected      → persist the full invoice context, then navigate
                             internally to /whatsapp so the user can scan the
                             QR and the send resumes automatically.
     WhatsApp Web / wa.me / the desktop app are never opened.               */
  const buildPendingAction = () => ({
    type: "invoice",
    action: "send_invoice",
    invoiceId: docNo,
    invoiceNumber: docNo,
    invoiceType: type,
    customerId: transaction.customer_id || transaction.party_id || transaction.supplier_id || null,
    customerName: partyName,
    phone: targetPhone,
    amount: formattedAmount,
    companyId: Number(companyId) || null,
    isPOS: false,
    source: location.pathname + location.search,
    returnTo: location.pathname,
    docType: type,
  });

  // InvoicePdfCapture keeps this handler in a ref, so a plain function is safe
  // here even though the component re-renders on every state change.
  const handleCapture = async (result) => {
    if (!result?.ok) {
      setIsSending(false);
      setSendDoc(null);
      alert("Could not generate the invoice PDF. Please try again.");
      return;
    }

    try {
      const res = await sendInvoiceDocument({
        companyId,
        invoiceNo: docNo,
        phone: targetPhone,
        pdfBase64: result.pdf_base64,
        caption: buildInvoiceShareCaption({
          customerName: partyName,
          invoiceNumber: docNo,
          amount: formattedAmount,
        }),
      });

      if (res.data?.status) {
        alert(res.data.message || `${type} PDF sent via WhatsApp!`);
        onClose();
      } else {
        alert(res.data?.message || "WhatsApp could not send this invoice. Please try again.");
      }
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Could not reach the WhatsApp service. Please try again."
      );
    } finally {
      setIsSending(false);
      setSendDoc(null);
    }
  };

  const handleShareWhatsApp = async (e) => {
    e.stopPropagation();
    if (isSending) return;

    setIsSending(true);

    // 0. Missing / invalid customer number → hand off to the internal
    //    /whatsapp page, which shows a clear, non-fatal validation error.
    if (!isValidWaPhone(targetPhone)) {
      queuePendingWhatsAppSend(buildPendingAction());
      setIsSending(false);
      onClose();
      navigate(WHATSAPP_ROUTE);
      return;
    }

    // 1. Real connection check against the existing WhatsApp service.
    const { connected } = await fetchWhatsAppConnection(companyId);

    // 2. Not connected → keep the invoice context and go to /whatsapp.
    if (!connected) {
      queuePendingWhatsAppSend(buildPendingAction());
      setIsSending(false);
      onClose();
      navigate(WHATSAPP_ROUTE);
      return;
    }

    // 3. Connected → send immediately through the existing endpoint.
    try {
      const doc = await composeShareDocument({
        transaction,
        type,
        docNo,
        partyName,
        phone,
        rawDate,
        paymentMode,
        rawAmount,
      });
      setSendDoc({ ...doc, captureKey: `popover-${docNo}` });
    } catch {
      setIsSending(false);
      alert("Could not prepare this invoice for sharing. Please try again.");
    }
  };

  /* ── 2. Share via Gmail / Email ── */
  const handleShareEmail = (e) => {
    e.stopPropagation();
    const subject = `${type} #${docNo}${companyName ? ` from ${companyName}` : ""}`;
    const body =
      `Dear ${partyName},\n\n` +
      `Please find your ${type} #${docNo} details below:\n\n` +
      `• Document No: ${docNo}\n` +
      `• Date: ${dateStr}\n` +
      `• Total Amount: ₹${formattedAmount}\n` +
      `• Payment Mode: ${paymentMode}\n\n` +
      `View / Download Invoice: ${invoiceUrl}\n\n` +
      `Thank you for your business!`;

    window.open(
      `mailto:${email || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      "_blank"
    );
    onClose();
  };

  return (
    <>
      {/* ── OFF-SCREEN INVOICE → base64 PDF (shared with /whatsapp) ── */}
      <InvoicePdfCapture doc={sendDoc} isPOS={false} onCapture={handleCapture} />

      {/* ── Popover Menu UI ── */}
      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            onClick={(e) => e.stopPropagation()}
            style={{ top: pos ? pos.top : -9999, left: pos ? pos.left : -9999 }}
            className="fixed bg-white rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)] border border-slate-100 p-3 z-[9999] min-w-[200px] text-left animate-in fade-in zoom-in-95 duration-100 font-sans select-none"
          >
            {/* Little Pointer Arrow */}
            <div
              className={`absolute right-3 w-3 h-3 bg-white border-slate-100 rotate-45 ${
                pos && pos.openUp ? "-bottom-1.5 border-b border-r" : "-top-1.5 border-t border-l"
              }`}
            />

          {/* Header */}
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Share
            </span>
          </div>

          {/* Channels Grid (Email & WhatsApp only) */}
          <div className="grid grid-cols-2 gap-2">
            {/* Email / Gmail */}
            <button
              type="button"
              onClick={handleShareEmail}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-slate-200/90 hover:border-red-300 hover:bg-gradient-to-b hover:from-red-50/50 hover:to-red-50/20 active:scale-95 transition-all duration-150 cursor-pointer group shadow-sm hover:shadow"
              title="Share via Email"
            >
              <div className="transform group-hover:scale-110 transition duration-150 drop-shadow-sm">
                <GmailIcon size={26} />
              </div>
              <span className="text-[11px] font-semibold text-slate-700 mt-1.5 group-hover:text-red-600 transition">
                Email
              </span>
              <span className="text-[9px] text-slate-400 font-medium tracking-tight mt-0.5 truncate max-w-[80px]">
                Send Email
              </span>
            </button>

            {/* WhatsApp */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              disabled={isSending}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-slate-200/90 hover:border-emerald-300 hover:bg-gradient-to-b hover:from-emerald-50/50 hover:to-emerald-50/20 active:scale-95 transition-all duration-150 cursor-pointer group shadow-sm hover:shadow"
              title={cleanPhone ? `Send to ${cleanPhone}` : "Share via WhatsApp"}
            >
              <div className="transform group-hover:scale-110 transition duration-150 drop-shadow-sm">
                <WhatsAppIcon size={26} />
              </div>
              <span className="text-[11px] font-semibold text-slate-700 mt-1.5 group-hover:text-emerald-600 transition">
                {isSending ? "Sending..." : "WhatsApp"}
              </span>
              <span className="text-[9px] text-emerald-600 font-medium tracking-tight mt-0.5 truncate max-w-[80px]">
                {cleanPhone ? `${cleanPhone}` : "Send to Phone"}
              </span>
            </button>
          </div>
          </div>,
          document.body
        )}
    </>
  );
}
