import { useState, useEffect, useRef } from "react";
import api from "../services/api";
import { generateInvoicePdfBase64, getInvoiceLogoUrl } from "../utils/invoiceShare";
import { DESIGN_COMPONENTS } from "../pages/billing/Invoice";

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

/* ── 3. Main ShareTransactionPopover Component ── */
export default function ShareTransactionPopover({
  isOpen,
  onClose,
  transaction = {},
  type = "Invoice",
}) {
  const popoverRef = useRef(null);
  const [isSending, setIsSending] = useState(false);
  const [renderDoc, setRenderDoc] = useState(null);

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

  if (!isOpen && !renderDoc) return null;

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

  const formattedAmount = Number(rawAmount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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
  const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  /* ── 1. Share via WhatsApp (Direct to customer number with high-res PDF) ── */
  const handleShareWhatsApp = async (e) => {
    e.stopPropagation();

    const text =
      `Hello ${partyName} 👋\n\n` +
      `Please find your invoice attached.\n\n` +
      `Invoice: ${docNo}\n` +
      `Amount: ₹${formattedAmount}\n\n` +
      `Thank you for your business.`;

    if (companyId && targetPhone) {
      setIsSending(true);
      try {
        // 1. Fetch complete document details from API
        let fullTxn = transaction;
        let compObj = null;

        try {
          const invRes = await api.get(`/invoice/get_invoice_by_id?id=${docNo}`);
          if (invRes.data?.status && invRes.data?.data) {
            fullTxn = { ...transaction, ...invRes.data.data };
            compObj = {
              company_name: invRes.data.data.company_name,
              company_address: invRes.data.data.company_address,
              phone: invRes.data.data.phone,
              gstin: invRes.data.data.gstin,
              logo: invRes.data.data.logo,
              bank_name: invRes.data.data.bank_name,
              account_no: invRes.data.data.account_no,
              ifsc_code: invRes.data.data.ifsc_code,
            };
          }
        } catch (fetchErr) {
          console.log("Using list item fallback data:", fetchErr);
        }

        // Fallback company details
        if (!compObj || !compObj.company_name) {
          let user = {};
          try {
            user = JSON.parse(localStorage.getItem("user") || "{}");
          } catch {}
          compObj = {
            company_name: fullTxn.company_name || user?.company_name || user?.name || "My Company",
            company_address: fullTxn.company_address || fullTxn.address || user?.company_address || user?.address || "",
            phone: fullTxn.company_phone || fullTxn.phone || user?.phone || user?.mobile || "",
            gstin: fullTxn.gstin || user?.gstin || "",
            logo: fullTxn.logo || user?.logo || null,
          };
        }

        // Prepare products / rows
        let products = fullTxn.products;
        if (typeof products === "string") {
          try {
            products = JSON.parse(products);
          } catch {
            products = [];
          }
        } else if (!Array.isArray(products)) {
          if (Array.isArray(fullTxn.items)) products = fullTxn.items;
          else if (typeof fullTxn.items === "string") {
            try {
              products = JSON.parse(fullTxn.items);
            } catch {
              products = [];
            }
          } else if (Array.isArray(fullTxn.rows)) products = fullTxn.rows;
          else products = [];
        }

        const isPaymentVoucher =
          type.toLowerCase().includes("payment in") ||
          type.toLowerCase().includes("payment out");

        if (!isPaymentVoucher && (!products || products.length === 0)) {
          products = [
            {
              item_name: `${type} #${docNo}`,
              hsn_code: "-",
              qty: 1,
              price: Number(rawAmount || 0),
              gst: 0,
              amount: Number(rawAmount || 0),
              tax_amount: 0,
            },
          ];
        }

        const vType =
          type.toLowerCase().includes("payment in")
            ? "payment_in"
            : type.toLowerCase().includes("payment out")
            ? "payment_out"
            : type.toLowerCase().includes("credit")
            ? "credit_note"
            : type.toLowerCase().includes("debit")
            ? "debit_note"
            : type.toLowerCase().includes("expense")
            ? "expense"
            : type.toLowerCase().includes("purchase")
            ? "purchase"
            : "sale";

        const invoiceDoc = {
          ...fullTxn,
          invoice_no: fullTxn.invoice_no || fullTxn.purchase_no || fullTxn.return_no || fullTxn.receipt_no || docNo,
          voucher_type: vType,
          customer_name: fullTxn.customer_name || fullTxn.supplier_name || fullTxn.party_name || partyName,
          customer_phone: fullTxn.customer_phone || fullTxn.supplier_phone || fullTxn.party_phone || phone,
          billing_address: fullTxn.billing_address || fullTxn.address || "",
          payment_type: fullTxn.payment_type || fullTxn.payment_method || paymentMode,
          created_at: fullTxn.created_at || fullTxn.invoice_date || fullTxn.bill_date || rawDate,
          products,
          total_amount: Number(fullTxn.total_amount ?? fullTxn.amount ?? fullTxn.grandTotal ?? rawAmount ?? 0),
          paid_amount: Number(fullTxn.paid_amount ?? fullTxn.received_amount ?? fullTxn.total_amount ?? rawAmount ?? 0),
          sub_total: Number(
            fullTxn.sub_total ??
              (Number(fullTxn.total_amount || rawAmount || 0) -
                Number(fullTxn.gst_total || fullTxn.tax_amount || 0))
          ),
          gst_total: Number(fullTxn.gst_total ?? fullTxn.tax_amount ?? 0),
        };

        // 2. Render React ThemeTally in state
        setRenderDoc({
          invoice: invoiceDoc,
          company: compObj,
          invoice_no: docNo,
        });

        // 3. Wait for DOM paint and image assets to settle
        await new Promise((resolve) => setTimeout(resolve, 300));

        const element = document.getElementById(`share-popover-print-area-${docNo}`);
        if (!element) {
          throw new Error("Unable to locate rendered voucher print area");
        }

        try {
          await Promise.all(
            [...element.querySelectorAll("img")].map((im) =>
              im.complete
                ? null
                : new Promise((r) => {
                    im.onload = r;
                    im.onerror = r;
                  })
            )
          );
        } catch {
          /* ignore image wait errors */
        }

        // 4. Generate high-fidelity Base64 PDF (A4 ThemeTally)
        const pdf_base64 = await generateInvoicePdfBase64({
          element,
          invoiceNo: docNo,
          isPOS: false,
        });

        // 5. Send PDF Document + Caption via backend WhatsApp Service
        const res = await api.post("/whatsapp/send_invoice", {
          company_id: companyId,
          invoice_no: docNo,
          phone: targetPhone,
          pdf_base64,
          filename: `${docNo}.pdf`,
          caption: text,
        });

        if (res.data?.status) {
          alert(res.data.message || `${type} PDF sent via WhatsApp!`);
          setIsSending(false);
          setRenderDoc(null);
          onClose();
          return;
        } else {
          throw new Error(res.data?.message || "WhatsApp service response was not successful");
        }
      } catch (err) {
        console.log("Direct WhatsApp service error, falling back to WhatsApp Web/App...", err);
      } finally {
        setIsSending(false);
        setRenderDoc(null);
      }
    }

    // Direct WhatsApp Web / Mobile chat opening with the customer's phone number
    const url = targetPhone
      ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(url, "_blank");
    onClose();
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
      {/* ── OFF-SCREEN INVOICE (ThemeTally layout matching Screenshot) ── */}
      {renderDoc && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "740px",
            background: "#ffffff",
            zIndex: -99999,
            pointerEvents: "none",
            boxSizing: "border-box",
          }}
        >
          <div
            id={`share-popover-print-area-${renderDoc.invoice_no || docNo}`}
            style={{
              background: "#ffffff",
              width: "740px",
              minHeight: "1000px",
              padding: "20px 24px",
              boxSizing: "border-box",
              margin: "0 auto",
            }}
          >
            <DESIGN_COMPONENTS.tally
              invoice={renderDoc.invoice}
              company={renderDoc.company}
              color="#6366f1"
              logoUrl={getInvoiceLogoUrl(renderDoc.company?.logo)}
            />
          </div>
        </div>
      )}

      {/* ── Popover Menu UI ── */}
      {isOpen && (
        <div
          ref={popoverRef}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)] border border-slate-100 p-3 z-[9999] min-w-[200px] text-left animate-in fade-in zoom-in-95 duration-100 font-sans select-none"
        >
          {/* Little Pointer Arrow */}
          <div className="absolute -top-1.5 right-3 w-3 h-3 bg-white border-t border-l border-slate-100 rotate-45" />

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
        </div>
      )}
    </>
  );
}
