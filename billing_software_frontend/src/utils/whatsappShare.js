/* ───────────────────────────────────────────────────────────────────────────
   Shared WhatsApp share helpers.

   Single source of truth used by BOTH the Share popover (already-connected
   case) and the internal /whatsapp page (resumed after QR login), so an
   invoice always renders and sends through exactly the same pipeline:
       load invoice → build document → render off-screen → html2pdf →
       POST /whatsapp/send_invoice  (WhatsappConnectController@sendInvoice)
   ─────────────────────────────────────────────────────────────────────────── */

import api from "../services/api";

/* The internal WhatsApp route. Authentication + sending always happen here. */
export const WHATSAPP_ROUTE = "/whatsapp";

export const MISSING_PHONE_MESSAGE = "Customer WhatsApp number is missing or invalid.";

/* 10-digit Indian numbers get the country code, matching the existing
   normalization already used by WhatsappConnectController and the chat UI. */
export function normalizeWaPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
}

export function isValidWaPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

/* Read-only connection probe against the existing backend endpoint. */
export async function fetchWhatsAppConnection(companyId) {
  if (!companyId) return { connected: false, status: "disconnected" };
  try {
    const res = await api.get(`/whatsapp/connect_status?company_id=${companyId}`);
    if (res.data?.status) {
      const status = res.data.data?.status || "disconnected";
      return {
        connected: res.data.connected === true || status === "ready",
        status,
        phone: res.data.data?.phone || null,
        name: res.data.data?.name || null,
      };
    }
    return { connected: false, status: "disconnected" };
  } catch {
    /* service unreachable — treat as "not connected" so the user lands on
       the internal /whatsapp page instead of any external URL. */
    return { connected: false, status: "unreachable" };
  }
}

export function formatAmount(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* Same caption the application already sends with the invoice PDF. */
export function buildInvoiceShareCaption({ customerName, invoiceNumber, amount }) {
  return (
    `Hello ${customerName} 👋\n\n` +
    `Please find your invoice attached.\n\n` +
    `Invoice: ${invoiceNumber}\n` +
    `Amount: ₹${amount}\n\n` +
    `Thank you for your business.`
  );
}

export function deriveVoucherType(type = "") {
  const t = String(type).toLowerCase();
  if (t.includes("payment in")) return "payment_in";
  if (t.includes("payment out")) return "payment_out";
  if (t.includes("credit")) return "credit_note";
  if (t.includes("debit")) return "debit_note";
  if (t.includes("expense")) return "expense";
  if (t.includes("purchase")) return "purchase";
  return "sale";
}

/* Pull the full voucher (products, totals, company details) from the backend.
   Falls back to whatever the clicked report row already carried. */
export async function loadInvoiceForShare(docNo) {
  if (!docNo) return null;
  try {
    const res = await api.get(`/invoice/get_invoice_by_id?id=${encodeURIComponent(docNo)}`);
    if (res.data?.status && res.data?.data) return res.data.data;
  } catch {
    /* list-item fallback data is used instead */
  }
  return null;
}

function buildCompany(fresh, txn) {
  if (fresh?.company_name) {
    return {
      company_name: fresh.company_name,
      company_address: fresh.company_address,
      phone: fresh.phone,
      gstin: fresh.gstin,
      logo: fresh.logo,
      bank_name: fresh.bank_name,
      account_no: fresh.account_no,
      ifsc_code: fresh.ifsc_code,
    };
  }

  let user = {};
  try {
    user = JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    /* fall back to an empty user */
  }

  return {
    company_name: txn.company_name || user.company_name || user.name || "My Company",
    company_address: txn.company_address || txn.address || user.company_address || user.address || "",
    phone: txn.company_phone || txn.phone || user.phone || user.mobile || "",
    gstin: txn.gstin || user.gstin || "",
    logo: txn.logo || user.logo || null,
    bank_name: txn.bank_name || "",
    account_no: txn.account_no || "",
    ifsc_code: txn.ifsc_code || "",
  };
}

function normalizeProducts(fullTxn) {
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
  return Array.isArray(products) ? products : [];
}

/* Assemble the renderable invoice document from the row + backend data. */
export function buildInvoiceDocument({ fullTxn, type, docNo, partyName, phone, rawDate, paymentMode, rawAmount }) {
  const voucherType = deriveVoucherType(type);
  const isPaymentVoucher = voucherType === "payment_in" || voucherType === "payment_out";

  let products = normalizeProducts(fullTxn);
  if (!isPaymentVoucher && products.length === 0) {
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

  return {
    ...fullTxn,
    invoice_no:
      fullTxn.invoice_no || fullTxn.purchase_no || fullTxn.return_no || fullTxn.receipt_no || docNo,
    voucher_type: voucherType,
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
        (Number(fullTxn.total_amount || rawAmount || 0) - Number(fullTxn.gst_total || fullTxn.tax_amount || 0))
    ),
    gst_total: Number(fullTxn.gst_total ?? fullTxn.tax_amount ?? 0),
  };
}

/* One-shot helper: resolve everything needed to render + send a shared doc. */
export async function composeShareDocument({ transaction = {}, type = "Invoice", docNo, partyName, phone, rawDate, paymentMode, rawAmount }) {
  const fresh = await loadInvoiceForShare(docNo);
  const fullTxn = { ...transaction, ...(fresh || {}) };
  return {
    invoice: buildInvoiceDocument({
      fullTxn,
      type,
      docNo,
      partyName,
      phone,
      rawDate,
      paymentMode,
      rawAmount,
    }),
    company: buildCompany(fresh, fullTxn),
    invoice_no: docNo,
  };
}

/* The existing send endpoint — no new backend, no second WhatsApp service. */
export function sendInvoiceDocument({ companyId, invoiceNo, phone, pdfBase64, caption }) {
  return api.post("/whatsapp/send_invoice", {
    company_id: companyId,
    invoice_no: invoiceNo,
    phone,
    pdf_base64: pdfBase64,
    filename: `${invoiceNo}.pdf`,
    caption,
  });
}

/* Plain-text share (E-Way Bill, estimate summary) through the same internal
   service instead of an external wa.me link. */
export function sendTextMessage({ companyId, phone, message }) {
  return api.post("/whatsapp/send_message", {
    company_id: companyId,
    phone,
    message,
  });
}
