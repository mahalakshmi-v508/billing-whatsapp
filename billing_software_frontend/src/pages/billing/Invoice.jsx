
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import html2pdf from "html2pdf.js";
import {
  Download, Printer, FileText, ChevronDown, ChevronUp,
  X, Maximize2, Minimize2, Check, Share2, MessageCircle, Mail,
  Smartphone, Copy, ExternalLink, QrCode, Building2, Palette,
  ArrowLeft, ZoomIn, ZoomOut, RotateCcw, Send, CheckCircle2,
  AlertCircle, Info, Sparkles, Layers, Sliders, Eye, EyeOff,
  CheckCheck, Loader2, Phone, Calendar, CreditCard, User,
  FileCheck, ShieldCheck, ChevronRight, CornerDownLeft
} from "lucide-react";
import {
  generateInvoicePdfBase64,
  sendInvoiceViaWhatsAppApi,
  getInvoiceLogoUrl,
} from "../../utils/invoiceShare";
import { numberToWordsINR } from "../../utils/numberToWords";

/* ─── PRINT CSS STYLES ─────────────────────────────────────────────────────── */
const PRINT_CSS = `
  @media print {
    body * { visibility: hidden !important; }
    #invoice-print-area, #invoice-print-area * { visibility: visible !important; }
    #invoice-print-area {
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 10mm !important;
      box-shadow: none !important;
      border: none !important;
      background: #ffffff !important;
    }
    .no-print { display: none !important; }
  }
`;

/* ─── COLOR PALETTE OPTIONS (MATCHING SCREENSHOT media_1787726886987.png) ─── */
const PALETTE_COLORS = [
  "#6366f1", "#0d9488", "#9ca3af", "#4b5563", "#65a30d", "#1f8cff",
  "#0284c7", "#16a34a", "#84cc16", "#78350f", "#9333ea", "#881337",
  "#b45309", "#a855f7", "#ec4899", "#d97706", "#f43f5e", "#dc2626"
];

/* ─── THEME DEFINITIONS ────────────────────────────────────────────────────── */
const THEMES = [
  { id: "tally", label: "Tally Theme", category: "classic" },
  { id: "gst1", label: "GST Theme 1", category: "classic" },
  { id: "gst3", label: "GST Theme 3", category: "classic" },
  { id: "double_divine", label: "Double Divine", category: "classic" },
  { id: "french_elite", label: "French Elite", category: "classic" },
  { id: "pos", label: "POS Receipt", category: "classic" },
  { id: "vintage_classic", label: "Vintage Classic", category: "vintage" },
  { id: "vintage_bold", label: "Vintage Bold", category: "vintage" },
];

/* ─── VOUCHER LABELS & LAYOUT HELPER ─────────────────────────────────────────────── */
function getVoucherConfig(invoice) {
  const vType = invoice?.voucher_type || (
    invoice?.invoice_type?.toLowerCase().includes("payment receipt") ? "payment_in" :
    invoice?.invoice_type?.toLowerCase().includes("payment out") ? "payment_out" :
    invoice?.invoice_type?.toLowerCase().includes("credit") ? "credit_note" :
    invoice?.invoice_type?.toLowerCase().includes("debit") ? "debit_note" :
    invoice?.invoice_type?.toLowerCase().includes("expense") ? "expense" :
    invoice?.invoice_type?.toLowerCase().includes("purchase") ? "purchase" : "sale"
  );

  let title = "Tax Invoice";
  let partyLabel = "Bill To:";
  let docNoLabel = "Invoice No.:";
  let dateLabel = "Date:";
  let isPaymentVoucher = false;

  switch (vType) {
    case "payment_in":
      title = "Payment Receipt";
      partyLabel = "Received From:";
      docNoLabel = "Receipt No.:";
      isPaymentVoucher = true;
      break;
    case "payment_out":
      title = "Payment Out";
      partyLabel = "Paid To:";
      docNoLabel = "Receipt No.:";
      isPaymentVoucher = true;
      break;
    case "credit_note":
      title = "Credit Note";
      partyLabel = "Return From:";
      docNoLabel = "Return No.:";
      break;
    case "debit_note":
      title = "Debit Note";
      partyLabel = "Return To:";
      docNoLabel = "Return No.:";
      break;
    case "expense":
      title = "Expense";
      partyLabel = "Expense For:";
      docNoLabel = "Expense No.:";
      break;
    case "purchase":
      title = "Purchase Invoice";
      partyLabel = "Supplier / Bill From:";
      docNoLabel = "Bill No.:";
      break;
    case "sale":
    default:
      title = invoice?.invoice_type || (invoice?.gst_type === "without_gst" ? "Bill of Supply" : "Tax Invoice");
      partyLabel = "Bill To:";
      docNoLabel = "Invoice No.:";
      break;
  }

  if (invoice?.invoice_type) {
    title = invoice.invoice_type;
  }

  return { vType, title, partyLabel, docNoLabel, dateLabel, isPaymentVoucher };
}

/* ─── INVOICE TYPE HELPER ─────────────────────────────────────────────────── */
function getInvoiceType(invoice) {
  return getVoucherConfig(invoice).title;
}

/* ─── VOUCHER LIST BACK ROUTE HELPER ─────────────────────────────────────── */
function getVoucherBackRoute(invoice) {
  const { vType } = getVoucherConfig(invoice);
  switch (vType) {
    case "payment_in":
      return "/sales/payment-in";
    case "payment_out":
      return "/purchases/payment-out";
    case "credit_note":
      return "/sales/credit-note";
    case "debit_note":
      return "/purchases/debit-note";
    case "expense":
      return "/purchases/expenses";
    case "purchase":
      return "/purchases/bills";
    case "sale":
    default:
      return "/sales/invoices";
  }
}

/* ─── PRODUCT ITEM HELPERS ────────────────────────────────────────────────── */
function getItemName(p) {
  if (!p) return "Item";
  return p.item_name || p.product_name || p.name || p.item || p.title || p.product || p.description || "Item";
}

function getItemHSN(p) {
  if (!p) return "-";
  return p.hsn_code || p.hsn_sac || p.hsn || p.product_code || "-";
}

/* ─── FORMAT CURRENCY HELPER (RESPECTS PRINT SETTINGS) ─── */
function formatCurrency(val, printSettings = {}) {
  const num = parseFloat(val) || 0;
  const decimals = printSettings.amountWithDecimal === false ? 0 : 2;
  if (printSettings.printAmountGrouping !== false) {
    return num.toLocaleString("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  return num.toFixed(decimals);
}

/* ─── ITEM EXTRA ATTRIBUTES RENDERER (POS & REGULAR) ─── */
function renderItemExtras(p, printSettings = {}) {
  const showBatch = printSettings.showBatchNo && p.batch_no;
  const showExp = printSettings.showExpDate && p.exp_date;
  const showMfg = printSettings.showMfgDate && p.mfg_date;
  const showSize = printSettings.showSize && p.size;
  const showModel = printSettings.showModelNo && p.model_no;
  const showSerial = printSettings.showSerialNo && p.serial_no;

  if (!showBatch && !showExp && !showMfg && !showSize && !showModel && !showSerial) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", fontSize: "9.5px", color: "#64748b", fontWeight: 400, marginTop: "2px" }}>
      {showBatch && <span>Batch: {p.batch_no}</span>}
      {showExp && <span>Exp: {p.exp_date}</span>}
      {showMfg && <span>Mfg: {p.mfg_date}</span>}
      {showSize && <span>Size: {p.size}</span>}
      {showModel && <span>Model: {p.model_no}</span>}
      {showSerial && <span>S/N: {p.serial_no}</span>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. THEME: TALLY THEME (MATCHING SCREENSHOT 1 & 2)
═══════════════════════════════════════════════════════════════════════════ */
function ThemeTally({ invoice, company, color, logoUrl, printSettings = {} }) {
  const { vType, title: invoiceType, partyLabel, docNoLabel, isPaymentVoucher } = getVoucherConfig(invoice);
  const products = Array.isArray(invoice.products) ? invoice.products : [];
  const totalQty = products.reduce((s, p) => s + (parseFloat(p.qty || p.quantity) || 0), 0);
  const totalGst = parseFloat(invoice.gst_total || invoice.tax_amount) || 0;
  const totalAmount = parseFloat(invoice.total_amount) || 0;
  const subTotal = parseFloat(invoice.sub_total) || (totalAmount - totalGst);
  const paidAmount = parseFloat(invoice.paid_amount) || 0;
  const balanceAmount = parseFloat(invoice.balance_amount) ?? Math.max(0, totalAmount - paidAmount);
  const paymentType = (invoice.payment_type || invoice.payment_method || "Cash").toUpperCase();

  const showLogo = printSettings.companyLogo !== false;
  const showCompanyName = printSettings.companyName !== false && company?.company_name;
  const showAddress = printSettings.address !== false && company?.company_address;
  const showPhone = printSettings.phone !== false && company?.phone;
  const showEmail = printSettings.email !== false && company?.email;
  const showGstin = printSettings.gstin !== false && company?.gstin;
  const showHSN = printSettings.showHSNCode !== false && printSettings.hsn !== false && vType !== "expense";
  const showSNo = printSettings.showSNo !== false;
  const showTax = printSettings.taxDetails !== false && vType !== "expense";
  const showWords = printSettings.amountInWords !== false && printSettings.amountInWords !== "None";
  const showRemarks = printSettings.printDescription !== false && invoice.notes;
  const showTerms = printSettings.printTerms !== false && (invoice.terms_conditions || invoice.terms);
  const showReceivedBy = printSettings.printReceivedBy;
  const showDeliveredBy = printSettings.printDeliveredBy;
  const showSignature = printSettings.printSignatureText !== false;
  const showReceived = printSettings.receivedAmount !== false;
  const showBalance = printSettings.balanceAmount !== false;
  const showPartyBalance = printSettings.currentBalanceParty && (invoice.current_balance !== undefined || invoice.previous_balance !== undefined);
  const showYouSaved = printSettings.youSaved && (invoice.savings_amount || invoice.discount_amount);
  const showPaymentMode = printSettings.paymentMode !== false;
  const showAck = printSettings.printAcknowledgement;

  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", color: "#111827", fontSize: 12, lineHeight: 1.4 }}>
      {printSettings.printOriginalDuplicate && (
        <div style={{ textAlign: "right", fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>
          [ ORIGINAL FOR RECIPIENT ]
        </div>
      )}

      {/* Title */}
      <h2 style={{ textAlign: "center", fontSize: 16, fontWeight: 800, margin: "0 0 10px 0", letterSpacing: 0.5, color: "#111827" }}>
        {invoiceType}
      </h2>

      {/* Top Box: Company Header */}
      <div style={{ border: "1px solid #94a3b8", display: "flex", alignItems: "center", padding: "14px 16px", gap: 16, background: "#ffffff" }}>
        {showLogo && (
          <div style={{
            width: 76, height: 76, background: "#64748b", display: "flex", alignItems: "center",
            justifyContent: "center", color: "#ffffff", fontWeight: 800, fontSize: 14, borderRadius: 2, flexShrink: 0
          }}>
            {logoUrl ? <img src={logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : "LOGO"}
          </div>
        )}
        <div>
          {showCompanyName && <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#1e293b" }}>{company.company_name}</h1>}
          {showAddress && <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{company.company_address}</div>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 11.5, color: "#475569", marginTop: 4 }}>
            {showPhone && <span>Contact: {company.phone}</span>}
            {showEmail && <span>Email: {company.email}</span>}
            {showGstin && <span>GSTIN: {company.gstin}</span>}
          </div>
        </div>
      </div>

      {/* Bill To & Invoice Details Box */}
      <div style={{ border: "1px solid #94a3b8", borderTop: "none", display: "grid", gridTemplateColumns: "1fr 1fr", background: "#ffffff" }}>
        <div style={{ padding: "10px 14px", borderRight: "1px solid #94a3b8" }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: "#334155" }}>{partyLabel}</div>
          <div style={{ fontWeight: 800, fontSize: 13, color: "#0f172a", marginTop: 2 }}>{invoice.customer_name || invoice.party_name || "Cash Customer"}</div>
          {invoice.customer_phone && <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>Contact No: {invoice.customer_phone}</div>}
          {invoice.billing_address && <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>{invoice.billing_address}</div>}
        </div>
        <div style={{ padding: "10px 14px" }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: "#334155" }}>Details:</div>
          <div style={{ fontSize: 12, color: "#0f172a", marginTop: 2 }}><strong>{docNoLabel}</strong> {invoice.invoice_no || invoice.receipt_no}</div>
          <div style={{ fontSize: 12, color: "#0f172a", marginTop: 2 }}><strong>Date:</strong> {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN")}</div>
          {showPaymentMode && (
            <div style={{ fontSize: 12, color: "#0f172a", marginTop: 2 }}><strong>Payment Type:</strong> <span style={{ fontWeight: 700, color: color }}>{paymentType}</span></div>
          )}
          {invoice.original_invoice_no && <div style={{ fontSize: 12, color: "#0f172a", marginTop: 2 }}><strong>Ref Bill No.:</strong> {invoice.original_invoice_no}</div>}
          <div style={{ fontSize: 12, color: "#0f172a", marginTop: 2 }}><strong>Voucher Type:</strong> <span style={{ fontWeight: 700, color: "#1e293b" }}>{invoiceType}</span></div>
        </div>
      </div>

      {isPaymentVoucher ? (
        /* ── Payment In / Payment Out Voucher Layout ── */
        <div style={{ border: "1px solid #94a3b8", borderTop: "none", background: "#ffffff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #94a3b8", fontSize: 13 }}>
            <span style={{ fontWeight: 700, color: "#334155" }}>{vType === "payment_out" ? "Paid :" : "Received :"}</span>
            <span style={{ fontWeight: 800, fontSize: 15, color: color }}>₹ {formatCurrency(paidAmount, printSettings)}</span>
          </div>
          {showWords && (
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #94a3b8" }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "#475569" }}>Amount in Words:</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginTop: 3 }}>
                {numberToWordsINR(paidAmount)}
              </div>
            </div>
          )}
          {showRemarks && (
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #94a3b8", fontSize: 11.5, color: "#475569" }}>
              <strong>Notes / Remarks:</strong> {invoice.notes}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: "24px 16px 14px 16px" }}>
            <div style={{ fontSize: 11, color: "#64748b" }}>
              {showBalance && balanceAmount > 0 && <span>Remaining Balance: <strong>₹ {formatCurrency(balanceAmount, printSettings)}</strong></span>}
            </div>
            {showSignature && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#334155" }}>For : {company?.company_name || "My Company"}</div>
                <div style={{ height: 36 }} />
                <div style={{ fontSize: 10.5, color: "#64748b", borderTop: "1px dashed #94a3b8", paddingTop: 2 }}>{printSettings.signatureText || company?.signature || "Authorized Signatory"}</div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Itemized Table for Sale, Purchase, Returns, Expenses ── */
        <>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #94a3b8", borderTop: "none", fontSize: 11.5 }}>
            <thead>
              <tr style={{ background: "#ffffff", borderBottom: "1px solid #94a3b8", height: 32 }}>
                {showSNo && <th style={{ width: 32, padding: "6px 4px", borderRight: "1px solid #94a3b8", textAlign: "center" }}>#</th>}
                <th style={{ padding: "6px 10px", borderRight: "1px solid #94a3b8", textAlign: "left" }}>Item name</th>
                {showHSN && <th style={{ width: 80, padding: "6px 4px", borderRight: "1px solid #94a3b8", textAlign: "center" }}>HSN/ SAC</th>}
                <th style={{ width: 68, padding: "6px 4px", borderRight: "1px solid #94a3b8", textAlign: "center" }}>Quantity</th>
                <th style={{ width: 90, padding: "6px 6px", borderRight: "1px solid #94a3b8", textAlign: "right" }}>Price/ Unit(₹)</th>
                {showTax && <th style={{ width: 95, padding: "6px 6px", borderRight: "1px solid #94a3b8", textAlign: "right" }}>GST(₹)</th>}
                <th style={{ width: 95, padding: "6px 10px", textAlign: "right" }}>Amount(₹)</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, idx) => {
                const qty = parseFloat(p.qty || p.quantity) || 1;
                const price = parseFloat(p.price || p.unit_price) || 0;
                const gstPct = parseFloat(p.gst || p.tax_percent || p.tax_rate) || 0;
                const lineAmt = parseFloat(p.amount || p.total) || (qty * price);
                const gstAmt = parseFloat(p.tax_amount || p.tax_amt) || ((lineAmt * gstPct) / 100);

                return (
                  <tr key={idx} style={{ height: 28, borderBottom: idx === products.length - 1 ? "1px solid #94a3b8" : "none" }}>
                    {showSNo && <td style={{ textAlign: "center", borderRight: "1px solid #94a3b8", padding: "4px" }}>{idx + 1}</td>}
                    <td style={{ padding: "4px 10px", borderRight: "1px solid #94a3b8", fontWeight: 600 }}>
                      <div>{getItemName(p)}</div>
                      {printSettings.showDescription !== false && printSettings.printDescription !== false && p.description && (
                        <div style={{ fontSize: 10, color: "#64748b", fontWeight: 400 }}>{p.description}</div>
                      )}
                      {renderItemExtras(p, printSettings)}
                    </td>
                    {showHSN && <td style={{ textAlign: "center", borderRight: "1px solid #94a3b8", padding: "4px", color: "#64748b" }}>{getItemHSN(p)}</td>}
                    <td style={{ textAlign: "center", borderRight: "1px solid #94a3b8", padding: "4px", fontWeight: 600 }}>
                      {qty} {printSettings.showUnits !== false && p.unit ? p.unit : ""}
                    </td>
                    <td style={{ textAlign: "right", borderRight: "1px solid #94a3b8", padding: "4px 6px" }}>₹ {formatCurrency(price, printSettings)}</td>
                    {showTax && (
                      <td style={{ textAlign: "right", borderRight: "1px solid #94a3b8", padding: "4px 6px" }}>
                        ₹ {formatCurrency(gstAmt, printSettings)} {gstPct > 0 ? `(${gstPct}%)` : ""}
                      </td>
                    )}
                    <td style={{ textAlign: "right", padding: "4px 10px", fontWeight: 700 }}>₹ {formatCurrency(lineAmt, printSettings)}</td>
                  </tr>
                );
              })}

              {/* Table Total Row */}
              <tr style={{ background: "#ffffff", fontWeight: 700, height: 30, borderTop: "1px solid #94a3b8", borderBottom: "1px solid #94a3b8" }}>
                <td colSpan={(showSNo ? 1 : 0) + 1 + (showHSN ? 1 : 0)} style={{ padding: "6px 10px", borderRight: "1px solid #94a3b8", fontWeight: 800 }}>Total</td>
                <td style={{ textAlign: "center", borderRight: "1px solid #94a3b8", padding: "6px 4px", fontWeight: 800 }}>
                  {printSettings.totalItemQty !== false ? totalQty : ""}
                </td>
                <td style={{ borderRight: "1px solid #94a3b8" }}></td>
                {showTax && <td style={{ textAlign: "right", borderRight: "1px solid #94a3b8", padding: "6px 6px", fontWeight: 800 }}>₹ {formatCurrency(totalGst, printSettings)}</td>}
                <td style={{ textAlign: "right", padding: "6px 10px", fontWeight: 800 }}>₹ {formatCurrency(totalAmount, printSettings)}</td>
              </tr>
            </tbody>
          </table>

          {/* Totals Breakdown Box */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 270px", border: "1px solid #94a3b8", borderTop: "none", background: "#ffffff" }}>
            {/* Left: Amount in Words, Terms, Notes, Signatory */}
            <div style={{ borderRight: "1px solid #94a3b8", padding: "10px 14px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                {showWords && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>Amount in Words:</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginTop: 2 }}>{numberToWordsINR(totalAmount)}</div>
                  </div>
                )}
                {showRemarks && <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}><strong>Remarks:</strong> {invoice.notes}</div>}
                {showTerms && (
                  <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 6, whiteSpace: "pre-line" }}>
                    <strong>Terms & Conditions:</strong><br />{invoice.terms_conditions || invoice.terms}
                  </div>
                )}
                {showReceivedBy && <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 8 }}>Received By: ___________________</div>}
                {showDeliveredBy && <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 4 }}>Delivered By: ___________________</div>}
              </div>
              {showSignature && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#334155" }}>For : {company?.company_name || "My Company"}</div>
                  <div style={{ height: 28 }} />
                  <div style={{ fontSize: 10.5, color: "#64748b", borderTop: "1px dashed #94a3b8", paddingTop: 2, display: "inline-block" }}>
                    {printSettings.signatureText || company?.signature || "Authorized Signatory"}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Sub Total, GST Total, Total, Paid, Balance */}
            <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                <span style={{ color: "#475569" }}>Sub Total :</span>
                <span style={{ fontWeight: 700 }}>₹ {formatCurrency(subTotal, printSettings)}</span>
              </div>
              {showTax && totalGst > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                  <span style={{ color: "#475569" }}>GST Total :</span>
                  <span>₹ {formatCurrency(totalGst, printSettings)}</span>
                </div>
              )}
              {showYouSaved && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#16a34a", fontWeight: 700 }}>
                  <span>You Saved :</span>
                  <span>₹ {formatCurrency(invoice.savings_amount || invoice.discount_amount || 150, printSettings)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, borderTop: "1px solid #e2e8f0", paddingTop: 4 }}>
                <span style={{ fontWeight: 800 }}>Total Amount :</span>
                <span style={{ fontWeight: 800, color: color }}>₹ {formatCurrency(totalAmount, printSettings)}</span>
              </div>
              {(showReceived || showBalance || showPartyBalance) && (
                <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 4, paddingTop: 4 }}>
                  {showReceived && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span style={{ color: "#475569" }}>Paid / Received :</span>
                      <span>₹ {formatCurrency(paidAmount, printSettings)}</span>
                    </div>
                  )}
                  {showBalance && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, fontWeight: 700, color: balanceAmount > 0 ? "#dc2626" : "#16a34a" }}>
                      <span>Balance :</span>
                      <span>₹ {formatCurrency(balanceAmount, printSettings)}</span>
                    </div>
                  )}
                  {showPartyBalance && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b" }}>
                      <span>Party Balance :</span>
                      <span>₹ {formatCurrency(invoice.current_balance || invoice.previous_balance || 0, printSettings)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Acknowledgement Slip */}
          {showAck && (
            <div style={{ marginTop: 14, borderTop: "2px dashed #94a3b8", paddingTop: 8, fontSize: 10.5, color: "#475569" }}>
              <div style={{ fontWeight: 800, textAlign: "center", textTransform: "uppercase" }}>--- Acknowledgement Slip ---</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span>Bill No: {invoice.invoice_no || invoice.receipt_no}</span>
                <span>Date: {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN")}</span>
                <span>Amount: ₹{formatCurrency(totalAmount, printSettings)}</span>
              </div>
              <div style={{ marginTop: 4 }}>Received above items in sound condition. Customer Signature: __________________</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. THEME: GST THEME 1 (MATCHING SCREENSHOT 3)
═══════════════════════════════════════════════════════════════════════════ */
function ThemeGST1({ invoice, company, color, logoUrl, printSettings = {} }) {
  const { vType, title: invoiceType, partyLabel, docNoLabel, isPaymentVoucher } = getVoucherConfig(invoice);
  const products = Array.isArray(invoice.products) ? invoice.products : [];
  const totalQty = products.reduce((s, p) => s + (parseFloat(p.qty || p.quantity) || 0), 0);
  const totalAmount = parseFloat(invoice.total_amount) || 0;
  const totalGst = parseFloat(invoice.gst_total || invoice.tax_amount) || 0;
  const subTotal = parseFloat(invoice.sub_total) || (totalAmount - totalGst);
  const paidAmount = parseFloat(invoice.paid_amount) || 0;
  const balanceAmount = parseFloat(invoice.balance_amount) ?? Math.max(0, totalAmount - paidAmount);
  const paymentType = (invoice.payment_type || invoice.payment_method || "Cash").toUpperCase();

  const showLogo = printSettings.companyLogo !== false;
  const showCompanyName = printSettings.companyName !== false && company?.company_name;
  const showAddress = printSettings.address !== false && company?.company_address;
  const showPhone = printSettings.phone !== false && company?.phone;
  const showEmail = printSettings.email !== false && company?.email;
  const showGstin = printSettings.gstin !== false && company?.gstin;
  const showHSN = printSettings.showHSNCode !== false && printSettings.hsn !== false && vType !== "expense";
  const showSNo = printSettings.showSNo !== false;
  const showTax = printSettings.taxDetails !== false && vType !== "expense";
  const showWords = printSettings.amountInWords !== false && printSettings.amountInWords !== "None";
  const showRemarks = printSettings.printDescription !== false && invoice.notes;
  const showTerms = printSettings.printTerms !== false && (invoice.terms_conditions || invoice.terms);
  const showReceivedBy = printSettings.printReceivedBy;
  const showDeliveredBy = printSettings.printDeliveredBy;
  const showSignature = printSettings.printSignatureText !== false;
  const showReceived = printSettings.receivedAmount !== false;
  const showBalance = printSettings.balanceAmount !== false;
  const showPartyBalance = printSettings.currentBalanceParty && (invoice.current_balance !== undefined || invoice.previous_balance !== undefined);
  const showYouSaved = printSettings.youSaved && (invoice.savings_amount || invoice.discount_amount);
  const showPaymentMode = printSettings.paymentMode !== false;
  const showAck = printSettings.printAcknowledgement;

  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", color: "#1e293b", fontSize: 12 }}>
      {printSettings.printOriginalDuplicate && (
        <div style={{ textAlign: "right", fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>
          [ ORIGINAL FOR RECIPIENT ]
        </div>
      )}

      {/* Top: Company Name on Left, Logo on Right */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8 }}>
        <div>
          {showCompanyName && <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#0f172a" }}>{company.company_name}</h1>}
          {showAddress && <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{company.company_address}</div>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
            {showPhone && <span>Phone: {company.phone}</span>}
            {showEmail && <span>Email: {company.email}</span>}
            {showGstin && <span>GSTIN: {company.gstin}</span>}
          </div>
        </div>
        {showLogo && (
          <div style={{
            width: 72, height: 72, background: "#64748b", display: "flex", alignItems: "center",
            justifyContent: "center", color: "#ffffff", fontWeight: 800, fontSize: 13, borderRadius: 2, flexShrink: 0
          }}>
            {logoUrl ? <img src={logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : "LOGO"}
          </div>
        )}
      </div>

      {/* Colored Top Divider */}
      <div style={{ height: 2, background: color, margin: "6px 0 10px 0" }} />

      {/* Centered Colored Title */}
      <h2 style={{ textAlign: "center", fontSize: 18, fontWeight: 900, color: color, margin: "0 0 14px 0" }}>
        {invoiceType}
      </h2>

      {/* Bill To / Party & Invoice Details */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, fontSize: 12.5 }}>
        <div>
          <div style={{ fontWeight: 700, color: "#475569" }}>{partyLabel}</div>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a", marginTop: 2 }}>{invoice.customer_name || invoice.party_name || "Cash Customer"}</div>
          {invoice.customer_phone && <div style={{ color: "#475569", marginTop: 2 }}>Contact No. : {invoice.customer_phone}</div>}
          {invoice.billing_address && <div style={{ color: "#64748b", marginTop: 2 }}>{invoice.billing_address}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700, color: "#475569" }}>Details</div>
          <div style={{ marginTop: 2 }}>{docNoLabel} <strong>{invoice.invoice_no || invoice.receipt_no}</strong></div>
          <div style={{ marginTop: 2 }}>Date : {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN")}</div>
          {showPaymentMode && (
            <div style={{ marginTop: 2 }}>Payment : <strong style={{ color: color }}>{paymentType}</strong></div>
          )}
          {invoice.original_invoice_no && <div style={{ marginTop: 2 }}>Ref Bill : <strong>{invoice.original_invoice_no}</strong></div>}
        </div>
      </div>

      {isPaymentVoucher ? (
        /* ── Payment In / Payment Out Voucher Box ── */
        <div style={{ border: `1px solid ${color}`, borderRadius: 6, overflow: "hidden", background: "#ffffff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: "#334155" }}>{vType === "payment_out" ? "Paid :" : "Received :"}</span>
            <span style={{ fontWeight: 900, fontSize: 18, color: color }}>₹ {formatCurrency(paidAmount, printSettings)}</span>
          </div>
          {showWords && (
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "#64748b" }}>Amount in Words:</div>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: "#0f172a", marginTop: 3 }}>
                {numberToWordsINR(paidAmount)}
              </div>
            </div>
          )}
          {showRemarks && (
            <div style={{ padding: "10px 18px", borderBottom: "1px solid #e2e8f0", fontSize: 12, color: "#475569" }}>
              <strong>Notes:</strong> {invoice.notes}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: "28px 18px 16px 18px" }}>
            <div style={{ fontSize: 11.5, color: "#64748b" }}>
              {showBalance && balanceAmount > 0 && <span>Remaining Balance: <strong style={{ color: "#dc2626" }}>₹ {formatCurrency(balanceAmount, printSettings)}</strong></span>}
            </div>
            {showSignature && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>For : {company?.company_name || "My Company"}</div>
                <div style={{ height: 36 }} />
                <div style={{ fontSize: 10.5, color: "#64748b", borderTop: "1px dashed #cbd5e1", paddingTop: 2 }}>{printSettings.signatureText || company?.signature || "Authorized Signatory"}</div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Itemized Table for Invoices & Returns ── */
        <>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: color, color: "#ffffff", height: 34 }}>
                {showSNo && <th style={{ width: 34, padding: "6px 4px", textAlign: "center" }}>#</th>}
                <th style={{ padding: "6px 10px", textAlign: "left" }}>Item name</th>
                {showHSN && <th style={{ width: 80, padding: "6px 4px", textAlign: "center" }}>HSN/ SAC</th>}
                <th style={{ width: 68, padding: "6px 4px", textAlign: "center" }}>Quantity</th>
                <th style={{ width: 90, padding: "6px 6px", textAlign: "right" }}>Price/ Unit</th>
                {showTax && <th style={{ width: 95, padding: "6px 6px", textAlign: "right" }}>GST</th>}
                <th style={{ width: 95, padding: "6px 10px", textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, idx) => {
                const qty = parseFloat(p.qty || p.quantity) || 1;
                const price = parseFloat(p.price || p.unit_price) || 0;
                const gstPct = parseFloat(p.gst || p.tax_percent || p.tax_rate) || 0;
                const lineAmt = parseFloat(p.amount || p.total) || (qty * price);
                const gstAmt = parseFloat(p.tax_amount || p.tax_amt) || ((lineAmt * gstPct) / 100);

                return (
                  <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0", height: 32, background: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                    {showSNo && <td style={{ textAlign: "center", padding: "4px" }}>{idx + 1}</td>}
                    <td style={{ padding: "4px 10px", fontWeight: 600 }}>
                      <div>{getItemName(p)}</div>
                      {printSettings.showDescription !== false && printSettings.printDescription !== false && p.description && (
                        <div style={{ fontSize: 10, color: "#64748b", fontWeight: 400 }}>{p.description}</div>
                      )}
                      {renderItemExtras(p, printSettings)}
                    </td>
                    {showHSN && <td style={{ textAlign: "center", color: "#64748b" }}>{getItemHSN(p)}</td>}
                    <td style={{ textAlign: "center", fontWeight: 600 }}>
                      {qty} {printSettings.showUnits !== false && p.unit ? p.unit : ""}
                    </td>
                    <td style={{ textAlign: "right", padding: "4px 6px" }}>₹ {formatCurrency(price, printSettings)}</td>
                    {showTax && <td style={{ textAlign: "right", padding: "4px 6px" }}>₹ {formatCurrency(gstAmt, printSettings)} ({gstPct}%)</td>}
                    <td style={{ textAlign: "right", padding: "4px 10px", fontWeight: 700 }}>₹ {formatCurrency(lineAmt, printSettings)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Summary Row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 16 }}>
            <div style={{ maxWidth: 320 }}>
              {showWords && (
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}><strong>Amount in Words:</strong></div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", marginTop: 2 }}>{numberToWordsINR(totalAmount)}</div>
                </div>
              )}
              {showRemarks && <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}><strong>Remarks:</strong> {invoice.notes}</div>}
              {showTerms && (
                <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 6, whiteSpace: "pre-line" }}>
                  <strong>Terms:</strong> {invoice.terms_conditions || invoice.terms}
                </div>
              )}
              {showReceivedBy && <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 8 }}>Received By: ___________________</div>}
              {showDeliveredBy && <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 4 }}>Delivered By: ___________________</div>}
            </div>

            <div style={{ width: 270, display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Sub Total :</span><span style={{ fontWeight: 700 }}>₹ {formatCurrency(subTotal, printSettings)}</span></div>
              {showTax && totalGst > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span>GST Total :</span><span>₹ {formatCurrency(totalGst, printSettings)}</span></div>}
              {showYouSaved && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "#16a34a", fontWeight: 700 }}>
                  <span>You Saved :</span>
                  <span>₹ {formatCurrency(invoice.savings_amount || invoice.discount_amount || 150, printSettings)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", background: color, color: "#fff", padding: "6px 10px", borderRadius: 4, fontWeight: 800, fontSize: 14 }}>
                <span>Total Amount :</span>
                <span>₹ {formatCurrency(totalAmount, printSettings)}</span>
              </div>
              {showReceived && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span>Paid / Received :</span><span>₹ {formatCurrency(paidAmount, printSettings)}</span></div>}
              {showBalance && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 700, color: balanceAmount > 0 ? "#dc2626" : "#16a34a" }}>
                  <span>Balance Due :</span>
                  <span>₹ {formatCurrency(balanceAmount, printSettings)}</span>
                </div>
              )}
              {showPartyBalance && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b" }}>
                  <span>Party Balance :</span>
                  <span>₹ {formatCurrency(invoice.current_balance || invoice.previous_balance || 0, printSettings)}</span>
                </div>
              )}
              {showSignature && (
                <div style={{ textAlign: "right", marginTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700 }}>For: {company?.company_name || "My Company"}</div>
                  <div style={{ height: 28 }} />
                  <div style={{ fontSize: 10, color: "#64748b", borderTop: "1px dashed #cbd5e1", paddingTop: 2 }}>{printSettings.signatureText || company?.signature || "Authorized Signatory"}</div>
                </div>
              )}
            </div>
          </div>

          {showAck && (
            <div style={{ marginTop: 14, borderTop: "2px dashed #cbd5e1", paddingTop: 8, fontSize: 10.5, color: "#475569" }}>
              <div style={{ fontWeight: 800, textAlign: "center", textTransform: "uppercase" }}>--- Acknowledgement Slip ---</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span>Bill No: {invoice.invoice_no || invoice.receipt_no}</span>
                <span>Date: {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN")}</span>
                <span>Amount: ₹{formatCurrency(totalAmount, printSettings)}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. THEME: GST THEME 3 (MATCHING SCREENSHOT 4)
═══════════════════════════════════════════════════════════════════════════ */
function ThemeGST3({ invoice, company, color, logoUrl, printSettings = {} }) {
  const { vType, title: invoiceType, partyLabel, docNoLabel, isPaymentVoucher } = getVoucherConfig(invoice);
  const products = Array.isArray(invoice.products) ? invoice.products : [];
  const totalAmount = parseFloat(invoice.total_amount) || 0;
  const totalGst = parseFloat(invoice.gst_total || invoice.tax_amount) || 0;
  const subTotal = parseFloat(invoice.sub_total) || (totalAmount - totalGst);
  const paidAmount = parseFloat(invoice.paid_amount) || 0;
  const balanceAmount = parseFloat(invoice.balance_amount) ?? Math.max(0, totalAmount - paidAmount);
  const paymentType = (invoice.payment_type || invoice.payment_method || "Cash").toUpperCase();

  const showLogo = printSettings.companyLogo !== false;
  const showCompanyName = printSettings.companyName !== false && company?.company_name;
  const showAddress = printSettings.address !== false && company?.company_address;
  const showPhone = printSettings.phone !== false && company?.phone;
  const showEmail = printSettings.email !== false && company?.email;
  const showGstin = printSettings.gstin !== false && company?.gstin;
  const showHSN = printSettings.showHSNCode !== false && printSettings.hsn !== false && vType !== "expense";
  const showSNo = printSettings.showSNo !== false;
  const showTax = printSettings.taxDetails !== false && vType !== "expense";
  const showWords = printSettings.amountInWords !== false && printSettings.amountInWords !== "None";
  const showRemarks = printSettings.printDescription !== false && invoice.notes;
  const showTerms = printSettings.printTerms !== false && (invoice.terms_conditions || invoice.terms);
  const showReceivedBy = printSettings.printReceivedBy;
  const showDeliveredBy = printSettings.printDeliveredBy;
  const showSignature = printSettings.printSignatureText !== false;
  const showReceived = printSettings.receivedAmount !== false;
  const showBalance = printSettings.balanceAmount !== false;
  const showPartyBalance = printSettings.currentBalanceParty && (invoice.current_balance !== undefined || invoice.previous_balance !== undefined);
  const showYouSaved = printSettings.youSaved && (invoice.savings_amount || invoice.discount_amount);
  const showPaymentMode = printSettings.paymentMode !== false;
  const showAck = printSettings.printAcknowledgement;

  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", color: "#1e293b", fontSize: 12 }}>
      {printSettings.printOriginalDuplicate && (
        <div style={{ textAlign: "right", fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>
          [ ORIGINAL FOR RECIPIENT ]
        </div>
      )}

      <h2 style={{ textAlign: "center", fontSize: 16, fontWeight: 800, margin: "0 0 10px 0" }}>{invoiceType}</h2>

      {/* Box Header */}
      <div style={{ border: "1px solid #cbd5e1", display: "flex", justifyContent: "space-between", padding: "12px 14px", background: "#ffffff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {showLogo && (
            <div style={{ width: 60, height: 60, background: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
              {logoUrl ? <img src={logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : "LOGO"}
            </div>
          )}
          <div>
            {showCompanyName && <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{company.company_name}</h1>}
            {showAddress && <div style={{ fontSize: 11.5, color: "#64748b" }}>{company.company_address}</div>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 11, color: "#64748b", marginTop: 2 }}>
              {showPhone && <span>Phone: {company.phone}</span>}
              {showEmail && <span>Email: {company.email}</span>}
              {showGstin && <span>GSTIN: {company.gstin}</span>}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 12 }}>
          <div>{docNoLabel} <strong>{invoice.invoice_no || invoice.receipt_no}</strong></div>
          <div>Date : {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN")}</div>
          {showPaymentMode && (
            <div>Payment : <strong style={{ color: color }}>{paymentType}</strong></div>
          )}
          <div>Type : <strong>{invoiceType}</strong></div>
        </div>
      </div>

      <div style={{ border: "1px solid #cbd5e1", borderTop: "none", padding: "10px 14px", background: "#ffffff" }}>
        <div style={{ fontWeight: 700 }}>{partyLabel}</div>
        <div style={{ fontWeight: 800, fontSize: 13, marginTop: 2 }}>{invoice.customer_name || invoice.party_name || "Cash Customer"}</div>
        {invoice.customer_phone && <div style={{ fontSize: 11.5, color: "#64748b" }}>Contact No.: {invoice.customer_phone}</div>}
      </div>

      {isPaymentVoucher ? (
        <div style={{ border: "1px solid #cbd5e1", borderTop: "none", padding: "14px", background: "#ffffff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 800, paddingBottom: 10, borderBottom: "1px solid #e2e8f0" }}>
            <span>{vType === "payment_out" ? "Paid Amount:" : "Received Amount:"}</span>
            <span style={{ color: color }}>₹ {formatCurrency(paidAmount, printSettings)}</span>
          </div>
          {showWords && (
            <div style={{ marginTop: 10, fontSize: 12 }}>
              <strong>Amount in Words:</strong> {numberToWordsINR(paidAmount)}
            </div>
          )}
          {showRemarks && <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 6 }}><strong>Remarks:</strong> {invoice.notes}</div>}
          {showSignature && (
            <div style={{ marginTop: 24, textAlign: "right", fontSize: 11.5 }}>
              <strong>For : {company?.company_name || "My Company"}</strong>
              <div style={{ height: 28 }} />
              <div style={{ fontSize: 10, color: "#64748b" }}>{printSettings.signatureText || company?.signature || "Authorized Signatory"}</div>
            </div>
          )}
        </div>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #cbd5e1", borderTop: "none" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #cbd5e1", height: 32, fontSize: 11.5 }}>
                {showSNo && <th style={{ width: 32, padding: "6px 4px", borderRight: "1px solid #cbd5e1" }}>#</th>}
                <th style={{ padding: "6px 10px", borderRight: "1px solid #cbd5e1", textAlign: "left" }}>Item name</th>
                {showHSN && <th style={{ width: 80, padding: "6px 4px", borderRight: "1px solid #cbd5e1", textAlign: "center" }}>HSN/ SAC</th>}
                <th style={{ width: 68, padding: "6px 4px", borderRight: "1px solid #cbd5e1", textAlign: "center" }}>Quantity</th>
                <th style={{ width: 90, padding: "6px 6px", borderRight: "1px solid #cbd5e1", textAlign: "right" }}>Price/ Unit</th>
                {showTax && <th style={{ width: 95, padding: "6px 6px", borderRight: "1px solid #cbd5e1", textAlign: "right" }}>GST</th>}
                <th style={{ width: 95, padding: "6px 10px", textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, idx) => (
                <tr key={idx} style={{ height: 28, borderBottom: "1px solid #f1f5f9" }}>
                  {showSNo && <td style={{ textAlign: "center", borderRight: "1px solid #cbd5e1" }}>{idx + 1}</td>}
                  <td style={{ padding: "4px 10px", borderRight: "1px solid #cbd5e1", fontWeight: 600 }}>
                    <div>{getItemName(p)}</div>
                    {printSettings.showDescription !== false && printSettings.printDescription !== false && p.description && (
                      <div style={{ fontSize: 10, color: "#64748b", fontWeight: 400 }}>{p.description}</div>
                    )}
                    {renderItemExtras(p, printSettings)}
                  </td>
                  {showHSN && <td style={{ textAlign: "center", borderRight: "1px solid #cbd5e1", color: "#64748b" }}>{getItemHSN(p)}</td>}
                  <td style={{ textAlign: "center", borderRight: "1px solid #cbd5e1", fontWeight: 600 }}>
                    {p.qty || p.quantity || 1} {printSettings.showUnits !== false && p.unit ? p.unit : ""}
                  </td>
                  <td style={{ textAlign: "right", borderRight: "1px solid #cbd5e1", padding: "4px 6px" }}>₹ {formatCurrency(p.price || p.unit_price || 0, printSettings)}</td>
                  {showTax && <td style={{ textAlign: "right", borderRight: "1px solid #cbd5e1", padding: "4px 6px" }}>₹ {formatCurrency(p.tax_amount || p.tax_amt || 0, printSettings)}</td>}
                  <td style={{ textAlign: "right", padding: "4px 10px", fontWeight: 700 }}>₹ {formatCurrency(p.amount || p.total || 0, printSettings)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 14 }}>
            <div style={{ maxWidth: 300 }}>
              {showWords && (
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  <strong>Amount in Words:</strong> {numberToWordsINR(totalAmount)}
                </div>
              )}
              {showRemarks && <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}><strong>Remarks:</strong> {invoice.notes}</div>}
              {showTerms && <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 4, whiteSpace: "pre-line" }}><strong>Terms:</strong> {invoice.terms_conditions || invoice.terms}</div>}
            </div>
            <div style={{ width: 250, display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Sub Total:</span><span>₹ {formatCurrency(subTotal, printSettings)}</span></div>
              {showTax && totalGst > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Total Tax:</span><span>₹ {formatCurrency(totalGst, printSettings)}</span></div>}
              {showYouSaved && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "#16a34a", fontWeight: 700 }}>
                  <span>You Saved:</span><span>₹ {formatCurrency(invoice.savings_amount || invoice.discount_amount || 150, printSettings)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #cbd5e1", paddingTop: 4, fontWeight: 800, fontSize: 13.5 }}>
                <span>Grand Total:</span>
                <span style={{ color: color }}>₹ {formatCurrency(totalAmount, printSettings)}</span>
              </div>
              {showReceived && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}><span>Paid:</span><span>₹ {formatCurrency(paidAmount, printSettings)}</span></div>}
              {showBalance && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, fontWeight: 700, color: balanceAmount > 0 ? "#dc2626" : "#16a34a" }}>
                  <span>Balance:</span><span>₹ {formatCurrency(balanceAmount, printSettings)}</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. THEME: DOUBLE DIVINE (MATCHING SCREENSHOT 5)
═══════════════════════════════════════════════════════════════════════════ */
function ThemeDoubleDivine({ invoice, company, color, logoUrl, printSettings = {} }) {
  const { vType, title: invoiceType, partyLabel, docNoLabel, isPaymentVoucher } = getVoucherConfig(invoice);
  const products = Array.isArray(invoice.products) ? invoice.products : [];
  const totalAmount = parseFloat(invoice.total_amount) || 0;
  const totalGst = parseFloat(invoice.gst_total || invoice.tax_amount) || 0;
  const subTotal = parseFloat(invoice.sub_total) || (totalAmount - totalGst);
  const paidAmount = parseFloat(invoice.paid_amount) || 0;
  const balanceAmount = parseFloat(invoice.balance_amount) ?? Math.max(0, totalAmount - paidAmount);
  const paymentType = (invoice.payment_type || invoice.payment_method || "Cash").toUpperCase();

  const showLogo = printSettings.companyLogo !== false;
  const showCompanyName = printSettings.companyName !== false && company?.company_name;
  const showAddress = printSettings.address !== false && company?.company_address;
  const showPhone = printSettings.phone !== false && company?.phone;
  const showEmail = printSettings.email !== false && company?.email;
  const showGstin = printSettings.gstin !== false && company?.gstin;
  const showHSN = printSettings.showHSNCode !== false && printSettings.hsn !== false && vType !== "expense";
  const showSNo = printSettings.showSNo !== false;
  const showTax = printSettings.taxDetails !== false && vType !== "expense";
  const showWords = printSettings.amountInWords !== false && printSettings.amountInWords !== "None";
  const showRemarks = printSettings.printDescription !== false && invoice.notes;
  const showTerms = printSettings.printTerms !== false && (invoice.terms_conditions || invoice.terms);
  const showReceivedBy = printSettings.printReceivedBy;
  const showDeliveredBy = printSettings.printDeliveredBy;
  const showSignature = printSettings.printSignatureText !== false;
  const showReceived = printSettings.receivedAmount !== false;
  const showBalance = printSettings.balanceAmount !== false;
  const showPartyBalance = printSettings.currentBalanceParty && (invoice.current_balance !== undefined || invoice.previous_balance !== undefined);
  const showYouSaved = printSettings.youSaved && (invoice.savings_amount || invoice.discount_amount);
  const showPaymentMode = printSettings.paymentMode !== false;
  const showAck = printSettings.printAcknowledgement;

  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", color: "#1e293b", fontSize: 12 }}>
      {printSettings.printOriginalDuplicate && (
        <div style={{ textAlign: "right", fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>
          [ ORIGINAL FOR RECIPIENT ]
        </div>
      )}

      {/* Curved Dark Header with Accent Pill */}
      <div style={{
        position: "relative",
        background: "#1e293b",
        color: "#ffffff",
        padding: "16px 20px",
        borderRadius: "4px 4px 0 0",
        overflow: "hidden",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        {/* Accent Swoosh / Background overlay */}
        <div style={{
          position: "absolute", top: 0, right: 0, width: "60%", height: "100%",
          background: color,
          borderRadius: "100px 0 0 100px",
          zIndex: 1,
          opacity: 0.95
        }} />

        <div style={{ display: "flex", alignItems: "center", gap: 14, zIndex: 2 }}>
          {showLogo && (
            <div style={{ width: 50, height: 50, background: "#475569", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 11, flexShrink: 0 }}>
              {logoUrl ? <img src={logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : "LOGO"}
            </div>
          )}
          <div>
            {showCompanyName && <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>{company.company_name}</h1>}
            {showAddress && <div style={{ fontSize: 11, color: "#cbd5e1" }}>{company.company_address}</div>}
            <div style={{ display: "flex", gap: 10, fontSize: 10.5, color: "#cbd5e1" }}>
              {showPhone && <span>Ph: {company.phone}</span>}
              {showEmail && <span>Email: {company.email}</span>}
              {showGstin && <span>GSTIN: {company.gstin}</span>}
            </div>
          </div>
        </div>

        <div style={{ zIndex: 2, textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.5 }}>{invoiceType}</div>
        </div>
      </div>

      {/* Bill To & Invoice Info */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", border: "1px solid #e2e8f0", borderTop: "none", background: "#ffffff" }}>
        <div>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>{partyLabel}</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>{invoice.customer_name || invoice.party_name || "Cash Customer"}</div>
          {invoice.customer_phone && <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>Contact No: {invoice.customer_phone}</div>}
        </div>
        <div style={{ textAlign: "right", fontSize: 12 }}>
          <div>{docNoLabel} <strong>{invoice.invoice_no || invoice.receipt_no}</strong></div>
          <div>Date: {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN")}</div>
          {showPaymentMode && (
            <div>Payment: <strong style={{ color: color }}>{paymentType}</strong></div>
          )}
          <div>Type: <strong>{invoiceType}</strong></div>
        </div>
      </div>

      {isPaymentVoucher ? (
        <div style={{ border: "1px solid #e2e8f0", borderTop: "none", padding: "16px", background: "#ffffff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 800, paddingBottom: 10, borderBottom: "1px solid #e2e8f0" }}>
            <span>{vType === "payment_out" ? "Paid :" : "Received :"}</span>
            <span style={{ color: color, fontSize: 16 }}>₹ {formatCurrency(paidAmount, printSettings)}</span>
          </div>
          {showWords && (
            <div style={{ marginTop: 12 }}>
              <strong>Amount in Words:</strong> {numberToWordsINR(paidAmount)}
            </div>
          )}
          {showRemarks && <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 6 }}><strong>Remarks:</strong> {invoice.notes}</div>}
          {showSignature && (
            <div style={{ marginTop: 24, textAlign: "right" }}>
              <div style={{ fontWeight: 700 }}>For : {company?.company_name || "My Company"}</div>
              <div style={{ height: 28 }} />
              <div style={{ fontSize: 10, color: "#64748b" }}>{printSettings.signatureText || company?.signature || "Authorized Signatory"}</div>
            </div>
          )}
        </div>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #e2e8f0", borderTop: "none" }}>
            <thead>
              <tr style={{ background: color, color: "#ffffff", height: 32, fontSize: 11.5 }}>
                {showSNo && <th style={{ width: 32, padding: "6px 4px", textAlign: "center" }}>#</th>}
                <th style={{ padding: "6px 10px", textAlign: "left" }}>Item name</th>
                {showHSN && <th style={{ width: 80, padding: "6px 4px", textAlign: "center" }}>HSN/ SAC</th>}
                <th style={{ width: 68, padding: "6px 4px", textAlign: "center" }}>Quantity</th>
                <th style={{ width: 90, padding: "6px 6px", textAlign: "right" }}>Price/ Unit</th>
                {showTax && <th style={{ width: 95, padding: "6px 6px", textAlign: "right" }}>GST</th>}
                <th style={{ width: 95, padding: "6px 10px", textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, idx) => (
                <tr key={idx} style={{ height: 28, borderBottom: "1px solid #e2e8f0" }}>
                  {showSNo && <td style={{ textAlign: "center", borderRight: "1px solid #e2e8f0" }}>{idx + 1}</td>}
                  <td style={{ padding: "4px 10px", borderRight: "1px solid #e2e8f0", fontWeight: 600 }}>
                    <div>{getItemName(p)}</div>
                    {printSettings.showDescription !== false && printSettings.printDescription !== false && p.description && (
                      <div style={{ fontSize: 10, color: "#64748b", fontWeight: 400 }}>{p.description}</div>
                    )}
                    {renderItemExtras(p, printSettings)}
                  </td>
                  {showHSN && <td style={{ textAlign: "center", borderRight: "1px solid #e2e8f0", color: "#64748b" }}>{getItemHSN(p)}</td>}
                  <td style={{ textAlign: "center", borderRight: "1px solid #e2e8f0", fontWeight: 600 }}>
                    {p.qty || p.quantity || 1} {printSettings.showUnits !== false && p.unit ? p.unit : ""}
                  </td>
                  <td style={{ textAlign: "right", borderRight: "1px solid #e2e8f0", padding: "4px 6px" }}>₹ {formatCurrency(p.price || p.unit_price || 0, printSettings)}</td>
                  {showTax && <td style={{ textAlign: "right", borderRight: "1px solid #e2e8f0", padding: "4px 6px" }}>₹ {formatCurrency(p.tax_amount || p.tax_amt || 0, printSettings)}</td>}
                  <td style={{ textAlign: "right", padding: "4px 10px", fontWeight: 700 }}>₹ {formatCurrency(p.amount || p.total || 0, printSettings)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 14 }}>
            <div style={{ maxWidth: 300 }}>
              {showWords && (
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  <strong>Amount in Words:</strong> {numberToWordsINR(totalAmount)}
                </div>
              )}
              {showRemarks && <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}><strong>Remarks:</strong> {invoice.notes}</div>}
              {showTerms && <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 4, whiteSpace: "pre-line" }}><strong>Terms:</strong> {invoice.terms_conditions || invoice.terms}</div>}
            </div>
            <div style={{ width: 250, display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Sub Total:</span><span>₹ {formatCurrency(subTotal, printSettings)}</span></div>
              {showTax && totalGst > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span>GST:</span><span>₹ {formatCurrency(totalGst, printSettings)}</span></div>}
              {showYouSaved && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "#16a34a", fontWeight: 700 }}>
                  <span>You Saved:</span><span>₹ {formatCurrency(invoice.savings_amount || invoice.discount_amount || 150, printSettings)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 14, color: color, borderTop: `2px solid ${color}`, paddingTop: 4 }}>
                <span>Grand Total:</span>
                <span>₹ {formatCurrency(totalAmount, printSettings)}</span>
              </div>
              {showReceived && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}><span>Paid:</span><span>₹ {formatCurrency(paidAmount, printSettings)}</span></div>}
              {showBalance && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, fontWeight: 700, color: balanceAmount > 0 ? "#dc2626" : "#16a34a" }}>
                  <span>Balance:</span><span>₹ {formatCurrency(balanceAmount, printSettings)}</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. THEME: POS RECEIPT (THERMAL 80MM)
═══════════════════════════════════════════════════════════════════════════ */
function formatPOSDateTime(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, '0');
  return `${day}-${month}-${year} ${strHours}:${minutes} ${ampm}`;
}

/* ─── 5.1 POS LAYOUT: CLASSIC MONOSPACE (STANDARD THERMAL) ─── */
export function ThemePOSClassic({ invoice, company, color, logoUrl, printSettings = {} }) {
  const { vType, title: invoiceType, partyLabel, docNoLabel, isPaymentVoucher } = getVoucherConfig(invoice);
  const products = Array.isArray(invoice.products) ? invoice.products : [];
  const totalAmount = parseFloat(invoice.total_amount) || 0;
  const totalGst = parseFloat(invoice.gst_total || invoice.tax_amount) || 0;
  const subTotal = parseFloat(invoice.sub_total) || (totalAmount - totalGst);
  const paidAmount = parseFloat(invoice.paid_amount) || 0;
  const balanceAmount = parseFloat(invoice.balance_amount) ?? Math.max(0, totalAmount - paidAmount);
  const previousBalance = parseFloat(invoice.previous_balance) || 0;
  const currentBalance = parseFloat(invoice.current_balance) || (previousBalance + balanceAmount);
  const paymentMethod = (invoice.payment_method || invoice.payment_type || "CASH").toUpperCase();

  const showLogo = printSettings.companyLogo !== false;
  const showCompanyName = printSettings.companyName !== false && company?.company_name;
  const showAddress = printSettings.address !== false && company?.company_address;
  const showPhone = printSettings.phone !== false && company?.phone;
  const showEmail = printSettings.email !== false && company?.email;
  const showGstin = printSettings.gstin !== false && company?.gstin;
  const showHSN = printSettings.showHSNCode !== false;
  const showTax = printSettings.taxDetails !== false;
  const showWords = printSettings.amountInWords !== false && printSettings.amountInWords !== "None";
  const showRemarks = printSettings.printDescription !== false && invoice.notes;
  const showTerms = printSettings.printTerms !== false && (invoice.terms_conditions || invoice.terms);
  const showReceivedBy = printSettings.printReceivedBy;
  const showDeliveredBy = printSettings.printDeliveredBy;
  const showSignature = printSettings.printSignatureText !== false;
  const showReceived = printSettings.receivedAmount !== false;
  const showBalance = printSettings.balanceAmount !== false;
  const showPartyBalance = printSettings.currentBalanceParty;
  const showYouSaved = printSettings.youSaved;
  const showPaymentMode = printSettings.paymentMode !== false;
  const showAck = printSettings.printAcknowledgement;

  const S = {
    receipt: {
      fontFamily: "'Courier New', Courier, monospace",
      fontSize: 11,
      color: "#000000",
      width: "100%",
      maxWidth: 270,
      margin: "0 auto",
      lineHeight: 1.35,
      background: "#ffffff",
      boxSizing: "border-box"
    },
    divider: {
      width: "100%",
      borderBottom: "1px dashed #000000",
      margin: "6px 0",
      boxSizing: "border-box"
    }
  };

  return (
    <div style={S.receipt}>
      {/* Centered Logo */}
      {showLogo && (
        <div style={{ textAlign: "center", marginBottom: 6 }}>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" style={{ width: 40, height: 40, objectFit: "contain", margin: "0 auto" }} />
          ) : (
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #ec4899, #eab308)", margin: "0 auto" }} />
          )}
        </div>
      )}

      {/* Company Info */}
      <div style={{ textAlign: "center", marginBottom: 4 }}>
        {showCompanyName && (
          <div style={{ fontSize: 13.5, fontWeight: "bold", letterSpacing: 0.2 }}>
            {company.company_name}
          </div>
        )}
        {showAddress && (
          <div style={{ fontSize: 10.5, margin: "2px 0", lineHeight: 1.25 }}>
            {company.company_address}
          </div>
        )}
        {showPhone && (
          <div style={{ fontSize: 11 }}>
            Ph: {company.phone}
          </div>
        )}
        {showEmail && (
          <div style={{ fontSize: 10.5 }}>
            Email: {company.email}
          </div>
        )}
        {showGstin && (
          <div style={{ fontSize: 11 }}>
            GSTIN: {company.gstin}
          </div>
        )}
      </div>

      <div style={S.divider} />

      {/* Bill & Customer Details */}
      <div style={{ fontSize: 11 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
          <span>{docNoLabel} {invoice.invoice_no || invoice.receipt_no}</span>
          <span>{formatPOSDateTime(invoice.created_at)}</span>
        </div>
        <div style={{ marginBottom: 2 }}>
          {partyLabel} {invoice.customer_name || invoice.party_name || "Party"}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
          <span>Phone: {invoice.customer_phone || "-"}</span>
          <span style={{ fontWeight: "bold" }}>{invoiceType}</span>
        </div>
      </div>

      <div style={S.divider} />

      {isPaymentVoucher ? (
        <div style={{ padding: "4px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: "bold", marginBottom: 4 }}>
            <span>{vType === "payment_out" ? "AMOUNT PAID:" : "AMOUNT RECEIVED:"}</span>
            <span>₹ {formatCurrency(paidAmount, printSettings)}</span>
          </div>
          {showWords && (
            <div style={{ fontSize: 10, margin: "4px 0" }}>
              <strong>In Words:</strong> {numberToWordsINR(paidAmount)}
            </div>
          )}
          {showPaymentMode && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginTop: 4 }}>
              <span>Payment Mode:</span>
              <span style={{ fontWeight: "bold" }}>{paymentMethod}</span>
            </div>
          )}
          {showRemarks && <div style={{ fontSize: 9.5, margin: "4px 0" }}><strong>Note:</strong> {invoice.notes}</div>}
          <div style={S.divider} />
          {showSignature && (
            <div style={{ textAlign: "right", marginTop: 12, fontSize: 10, fontWeight: "bold" }}>
              For: {company?.company_name || "My Company"}
              <div style={{ height: 20 }} />
              <div style={{ fontSize: 9.5 }}>{printSettings.signatureText || "Authorized Signatory"}</div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Item Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: "1px dashed #000000" }}>
                {printSettings.showSNo !== false && <th style={{ textAlign: "left", width: "12%", paddingBottom: 3, fontWeight: "bold" }}>#</th>}
                <th style={{ textAlign: "left", width: printSettings.showSNo !== false ? "40%" : "45%", paddingBottom: 3, fontWeight: "bold" }}>Item</th>
                <th style={{ textAlign: "right", width: "18%", paddingBottom: 3, fontWeight: "bold" }}>Rate</th>
                <th style={{ textAlign: "center", width: "15%", paddingBottom: 3, fontWeight: "bold" }}>Qty</th>
                <th style={{ textAlign: "right", width: "20%", paddingBottom: 3, fontWeight: "bold" }}>Amt</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => {
                const qty = parseFloat(p.qty || p.quantity) || 1;
                const price = parseFloat(p.price || p.unit_price) || 0;
                const amt = parseFloat(p.amount || p.total) || (qty * price);
                const gstPct = parseFloat(p.gst || p.tax_percent || p.tax_rate) || 0;
                const gstAmt = parseFloat(p.tax_amount || p.tax_amt) || ((amt * gstPct) / 100);

                return (
                  <tr key={i} style={{ verticalAlign: "top" }}>
                    {printSettings.showSNo !== false && <td style={{ textAlign: "left", padding: "3px 0" }}>{i + 1}</td>}
                    <td style={{ textAlign: "left", padding: "3px 2px 3px 0", wordBreak: "break-word" }}>
                      <div>{getItemName(p)}</div>
                      {printSettings.showDescription !== false && printSettings.printDescription !== false && p.description && (
                        <div style={{ fontSize: 9.5, color: "#333", marginTop: 1 }}>{p.description}</div>
                      )}
                      {showHSN && (p.hsn_code || p.hsn || p.product_code) && (
                        <div style={{ fontSize: 9.5, color: "#222", marginTop: 1 }}>HSN: {p.hsn_code || p.hsn || p.product_code}</div>
                      )}
                      {printSettings.showMRP && p.mrp && (
                        <div style={{ fontSize: 9.5, color: "#444" }}>MRP: ₹{p.mrp}</div>
                      )}
                      {showTax && gstPct > 0 && (
                        <div style={{ fontSize: 9.5, color: "#222", marginTop: 1 }}>
                          GST @{gstPct}% : ₹{formatCurrency(gstAmt, printSettings)}
                        </div>
                      )}
                      {renderItemExtras(p, printSettings)}
                    </td>
                    <td style={{ textAlign: "right", padding: "3px 2px" }}>{formatCurrency(price, printSettings)}</td>
                    <td style={{ textAlign: "center", padding: "3px 2px" }}>
                      {qty} {printSettings.showUnits !== false && p.unit ? p.unit : ""}
                    </td>
                    <td style={{ textAlign: "right", padding: "3px 0" }}>{formatCurrency(amt, printSettings)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={S.divider} />

          {/* Summary Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 11 }}>
            <tbody>
              {printSettings.totalItemQty !== false && (
                <tr>
                  <td style={{ textAlign: "left", width: "55%", padding: "2px 0" }}>Total Items / Qty</td>
                  <td style={{ textAlign: "right", width: "45%", padding: "2px 0" }}>{products.length} ({products.reduce((s, p) => s + (parseFloat(p.qty || p.quantity) || 0), 0)})</td>
                </tr>
              )}
              <tr>
                <td style={{ textAlign: "left", padding: "2px 0" }}>Subtotal</td>
                <td style={{ textAlign: "right", padding: "2px 0" }}>₹{formatCurrency(subTotal, printSettings)}</td>
              </tr>
              {showTax && totalGst > 0 && (
                <tr>
                  <td style={{ textAlign: "left", padding: "2px 0" }}>Tax</td>
                  <td style={{ textAlign: "right", padding: "2px 0" }}>₹{formatCurrency(totalGst, printSettings)}</td>
                </tr>
              )}
              {showYouSaved && (invoice.savings_amount || invoice.discount_amount) && (
                <tr>
                  <td style={{ textAlign: "left", padding: "2px 0", color: "#16a34a" }}>You Saved</td>
                  <td style={{ textAlign: "right", padding: "2px 0", color: "#16a34a" }}>₹{formatCurrency(invoice.savings_amount || 150, printSettings)}</td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={S.divider} />

          {/* Total Amount */}
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 13.5, fontWeight: "bold" }}>
            <tbody>
              <tr>
                <td style={{ textAlign: "left", width: "55%", padding: "2px 0" }}>Total Amount</td>
                <td style={{ textAlign: "right", width: "45%", padding: "2px 0" }}>₹{formatCurrency(totalAmount, printSettings)}</td>
              </tr>
            </tbody>
          </table>

          {(showPaymentMode || showReceived || showBalance || showPartyBalance) && (
            <>
              <div style={S.divider} />
              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 11 }}>
                <tbody>
                  {showPaymentMode && (
                    <tr>
                      <td style={{ textAlign: "left", width: "55%", padding: "2px 0" }}>Payment Method</td>
                      <td style={{ textAlign: "right", width: "45%", padding: "2px 0", fontWeight: "bold" }}>{paymentMethod}</td>
                    </tr>
                  )}
                  {showReceived && (
                    <tr>
                      <td style={{ textAlign: "left", padding: "2px 0" }}>Paid</td>
                      <td style={{ textAlign: "right", padding: "2px 0" }}>₹{formatCurrency(paidAmount, printSettings)}</td>
                    </tr>
                  )}
                  {showBalance && balanceAmount > 0 && (
                    <tr>
                      <td style={{ textAlign: "left", padding: "2px 0" }}>Balance Due</td>
                      <td style={{ textAlign: "right", padding: "2px 0" }}>₹{formatCurrency(balanceAmount, printSettings)}</td>
                    </tr>
                  )}
                  {showPartyBalance && (
                    <tr>
                      <td style={{ textAlign: "left", padding: "2px 0" }}>Party Balance</td>
                      <td style={{ textAlign: "right", padding: "2px 0" }}>₹{formatCurrency(currentBalance, printSettings)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}

          {showWords && (
            <div style={{ fontSize: 9.5, margin: "4px 0" }}>
              <strong>In Words:</strong> {numberToWordsINR(totalAmount)}
            </div>
          )}
          {showRemarks && <div style={{ fontSize: 9.5, margin: "4px 0" }}><strong>Note:</strong> {invoice.notes}</div>}
          {showTerms && <div style={{ fontSize: 9, margin: "4px 0", whiteSpace: "pre-line" }}><strong>Terms:</strong> {invoice.terms_conditions || invoice.terms}</div>}
          {showReceivedBy && <div style={{ fontSize: 9.5, marginTop: 4 }}>Received By: ____________</div>}
          {showDeliveredBy && <div style={{ fontSize: 9.5, marginTop: 2 }}>Delivered By: ____________</div>}
          {showSignature && (
            <div style={{ textAlign: "right", marginTop: 8, fontSize: 9.5, fontWeight: "bold" }}>
              {printSettings.signatureText || "Authorized Signatory"}
            </div>
          )}
          {showAck && (
            <div style={{ borderTop: "1px dashed #000", marginTop: 6, paddingTop: 4, textAlign: "center", fontSize: 9 }}>
              --- Acknowledgement Slip ---
            </div>
          )}
        </>
      )}

      <div style={S.divider} />

      {/* Footer Note */}
      <div style={{ textAlign: "center", fontSize: 9, letterSpacing: 0.2, marginTop: 4, paddingBottom: 2 }}>
        THANK YOU FOR YOUR BUSINESS
      </div>
    </div>
  );
}

/* ─── 5.2 POS LAYOUT: MODERN RETAIL (CLEAN SANS-SERIF & HIGH CONTRAST) ─── */
export function ThemePOSModern({ invoice, company, color, logoUrl, printSettings = {} }) {
  const { vType, title: invoiceType, partyLabel, docNoLabel, isPaymentVoucher } = getVoucherConfig(invoice);
  const products = Array.isArray(invoice.products) ? invoice.products : [];
  const totalAmount = parseFloat(invoice.total_amount) || 0;
  const totalGst = parseFloat(invoice.gst_total || invoice.tax_amount) || 0;
  const subTotal = parseFloat(invoice.sub_total) || (totalAmount - totalGst);
  const paidAmount = parseFloat(invoice.paid_amount) || 0;
  const balanceAmount = parseFloat(invoice.balance_amount) ?? Math.max(0, totalAmount - paidAmount);
  const paymentMethod = (invoice.payment_method || invoice.payment_type || "CASH").toUpperCase();

  const showLogo = printSettings.companyLogo !== false;
  const showCompanyName = printSettings.companyName !== false && company?.company_name;
  const showAddress = printSettings.address !== false && company?.company_address;
  const showPhone = printSettings.phone !== false && company?.phone;
  const showEmail = printSettings.email !== false && company?.email;
  const showGstin = printSettings.gstin !== false && company?.gstin;
  const showHSN = printSettings.showHSNCode !== false;
  const showTax = printSettings.taxDetails !== false;
  const showWords = printSettings.amountInWords !== false && printSettings.amountInWords !== "None";
  const showRemarks = printSettings.printDescription !== false && invoice.notes;
  const showTerms = printSettings.printTerms !== false && (invoice.terms_conditions || invoice.terms);
  const showReceivedBy = printSettings.printReceivedBy;
  const showDeliveredBy = printSettings.printDeliveredBy;
  const showSignature = printSettings.printSignatureText !== false;
  const showReceived = printSettings.receivedAmount !== false;
  const showBalance = printSettings.balanceAmount !== false;
  const showPartyBalance = printSettings.currentBalanceParty;
  const showYouSaved = printSettings.youSaved;
  const showPaymentMode = printSettings.paymentMode !== false;
  const showAck = printSettings.printAcknowledgement;

  return (
    <div style={{
      fontFamily: "'Segoe UI', system-ui, -apple-system, Roboto, sans-serif",
      fontSize: 11,
      color: "#0f172a",
      width: "100%",
      maxWidth: 275,
      margin: "0 auto",
      lineHeight: 1.35,
      background: "#ffffff",
      boxSizing: "border-box"
    }}>
      {/* Modern Header */}
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        {showLogo && (
          logoUrl ? (
            <img src={logoUrl} alt="Logo" style={{ width: 38, height: 38, objectFit: "contain", margin: "0 auto 4px auto" }} />
          ) : (
            <div style={{ display: "inline-block", background: "#0f172a", color: "#ffffff", fontWeight: 800, fontSize: 10, padding: "2px 8px", borderRadius: 4, marginBottom: 4, letterSpacing: 0.5 }}>
              {invoiceType.toUpperCase()}
            </div>
          )
        )}
        {showCompanyName && (
          <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", letterSpacing: -0.2 }}>
            {company.company_name}
          </div>
        )}
        {showAddress && (
          <div style={{ fontSize: 10, color: "#475569", margin: "2px 0", lineHeight: 1.3 }}>
            {company.company_address}
          </div>
        )}
        <div style={{ fontSize: 10.5, color: "#334155", fontWeight: 500 }}>
          {showPhone && `Ph: ${company.phone}`} {showEmail && `• ${company.email}`} {showGstin && `• GST: ${company.gstin}`}
        </div>
      </div>

      <div style={{ borderBottom: "1.5px solid #0f172a", margin: "6px 0" }} />

      {/* Bill Meta Pill Card */}
      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "5px 7px", fontSize: 10.5, marginBottom: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>
          <span>{docNoLabel} #{invoice.invoice_no || invoice.receipt_no}</span>
          <span>{formatPOSDateTime(invoice.created_at)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
          <span>{partyLabel} <strong style={{ color: "#0f172a" }}>{invoice.customer_name || invoice.party_name || "Party"}</strong></span>
          <span style={{ fontWeight: 600, color: color }}>{invoiceType}</span>
        </div>
        {invoice.customer_phone && (
          <div style={{ color: "#64748b", marginTop: 1 }}>Phone: {invoice.customer_phone}</div>
        )}
      </div>

      {isPaymentVoucher ? (
        <div style={{ padding: "6px 0" }}>
          <div style={{
            background: "#0f172a",
            color: "#ffffff",
            borderRadius: 6,
            padding: "8px 10px",
            margin: "6px 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>{vType === "payment_out" ? "Paid Amount" : "Received Amount"}</span>
            <span style={{ fontSize: 15, fontWeight: 900 }}>₹{formatCurrency(paidAmount, printSettings)}</span>
          </div>
          {showWords && (
            <div style={{ fontSize: 10, margin: "4px 0", color: "#475569" }}>
              <strong>In Words:</strong> {numberToWordsINR(paidAmount)}
            </div>
          )}
          {showPaymentMode && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#334155", background: "#f8fafc", padding: "4px 6px", borderRadius: 4, border: "1px solid #e2e8f0", marginTop: 6 }}>
              <span>Payment: <strong>{paymentMethod}</strong></span>
              <span>Status: <strong style={{ color: "#16a34a" }}>CONFIRMED</strong></span>
            </div>
          )}
          {showSignature && (
            <div style={{ textAlign: "right", marginTop: 16, fontSize: 10, fontWeight: 700 }}>
              For: {company?.company_name || "My Company"}
              <div style={{ fontSize: 9.5, color: "#64748b", marginTop: 2 }}>{printSettings.signatureText || "Authorized Signatory"}</div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Modern Items List */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5, marginBottom: 4 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #cbd5e1", background: "#f1f5f9" }}>
                {printSettings.showSNo !== false && <th style={{ textAlign: "center", padding: "4px 2px", fontWeight: 700, color: "#334155", width: 22 }}>#</th>}
                <th style={{ textAlign: "left", padding: "4px 3px", fontWeight: 700, color: "#334155" }}>ITEM</th>
                <th style={{ textAlign: "center", padding: "4px 2px", fontWeight: 700, color: "#334155" }}>QTY</th>
                <th style={{ textAlign: "right", padding: "4px 2px", fontWeight: 700, color: "#334155" }}>PRICE</th>
                <th style={{ textAlign: "right", padding: "4px 3px", fontWeight: 700, color: "#334155" }}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => {
                const qty = parseFloat(p.qty || p.quantity) || 1;
                const price = parseFloat(p.price || p.unit_price) || 0;
                const amt = parseFloat(p.amount || p.total) || (qty * price);
                const gstPct = parseFloat(p.gst || p.tax_percent || p.tax_rate) || 0;

                return (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    {printSettings.showSNo !== false && <td style={{ textAlign: "center", padding: "4px 2px", color: "#64748b" }}>{i + 1}</td>}
                    <td style={{ textAlign: "left", padding: "4px 2px", wordBreak: "break-word" }}>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{getItemName(p)}</div>
                      {printSettings.showDescription !== false && printSettings.printDescription !== false && p.description && (
                        <div style={{ fontSize: 9, color: "#64748b" }}>{p.description}</div>
                      )}
                      {showHSN && (p.hsn_code || p.hsn || p.product_code) && (
                        <div style={{ fontSize: 9, color: "#64748b" }}>Code: {p.hsn_code || p.hsn || p.product_code} {showTax && gstPct > 0 ? `• GST ${gstPct}%` : ""}</div>
                      )}
                      {renderItemExtras(p, printSettings)}
                    </td>
                    <td style={{ textAlign: "center", padding: "4px 2px", color: "#334155" }}>
                      {qty} {printSettings.showUnits !== false && p.unit ? p.unit : ""}
                    </td>
                    <td style={{ textAlign: "right", padding: "4px 2px", color: "#334155" }}>{formatCurrency(price, printSettings)}</td>
                    <td style={{ textAlign: "right", padding: "4px 2px", fontWeight: 700, color: "#0f172a" }}>{formatCurrency(amt, printSettings)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Summary Box */}
          <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: 4, fontSize: 10.5 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "1.5px 0", color: "#475569" }}>
              {printSettings.totalItemQty !== false && <span>Items / Qty: {products.length} ({products.reduce((s, p) => s + (parseFloat(p.qty || p.quantity) || 0), 0)})</span>}
              <span>Subtotal: ₹{formatCurrency(subTotal, printSettings)}</span>
            </div>
            {showTax && totalGst > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "1.5px 0", color: "#475569" }}>
                <span>GST Tax (Included)</span>
                <span>₹{formatCurrency(totalGst, printSettings)}</span>
              </div>
            )}
            {showYouSaved && (invoice.savings_amount || invoice.discount_amount) && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "1.5px 0", color: "#16a34a", fontWeight: 700 }}>
                <span>You Saved</span>
                <span>₹{formatCurrency(invoice.savings_amount || 150, printSettings)}</span>
              </div>
            )}
          </div>

          {/* Prominent High Contrast Total Banner */}
          <div style={{
            background: "#0f172a",
            color: "#ffffff",
            borderRadius: 6,
            padding: "6px 8px",
            margin: "6px 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase" }}>Total Payable</span>
            <span style={{ fontSize: 14, fontWeight: 900 }}>₹{formatCurrency(totalAmount, printSettings)}</span>
          </div>

          {/* Payment Status Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#334155", background: "#f8fafc", padding: "4px 6px", borderRadius: 4, border: "1px solid #e2e8f0" }}>
            {showPaymentMode && <span>Payment: <strong>{paymentMethod}</strong></span>}
            {showBalance && <span>Status: <strong style={{ color: balanceAmount > 0 ? "#dc2626" : "#16a34a" }}>{balanceAmount > 0 ? `Due ₹${formatCurrency(balanceAmount, printSettings)}` : "PAID FULL"}</strong></span>}
          </div>

          {showWords && (
            <div style={{ fontSize: 9.5, color: "#475569", marginTop: 4 }}>
              <strong>In Words:</strong> {numberToWordsINR(totalAmount)}
            </div>
          )}
          {showRemarks && <div style={{ fontSize: 9.5, color: "#475569", marginTop: 2 }}><strong>Note:</strong> {invoice.notes}</div>}
          {showTerms && <div style={{ fontSize: 9, color: "#64748b", marginTop: 2, whiteSpace: "pre-line" }}><strong>Terms:</strong> {invoice.terms_conditions || invoice.terms}</div>}
          {showSignature && (
            <div style={{ textAlign: "right", marginTop: 8, fontSize: 9.5, fontWeight: 700 }}>
              {printSettings.signatureText || "Authorized Signatory"}
            </div>
          )}
        </>
      )}

      {/* Modern Footer Note */}
      <div style={{ textAlign: "center", fontSize: 9.5, color: "#64748b", marginTop: 8, lineHeight: 1.3 }}>
        <div>★ ★ ★ THANK YOU FOR YOUR BUSINESS ★ ★ ★</div>
      </div>
    </div>
  );
}

/* ─── 5.3 POS LAYOUT: DETAILED GST TAX INVOICE (FULL GST TAX SPLIT) ─── */
export function ThemePOSDetailed({ invoice, company, color, logoUrl, printSettings = {} }) {
  const { vType, title: invoiceType, partyLabel, docNoLabel, isPaymentVoucher } = getVoucherConfig(invoice);
  const products = Array.isArray(invoice.products) ? invoice.products : [];
  const totalAmount = parseFloat(invoice.total_amount) || 0;
  const totalGst = parseFloat(invoice.gst_total || invoice.tax_amount) || 0;
  const subTotal = parseFloat(invoice.sub_total) || (totalAmount - totalGst);
  const paidAmount = parseFloat(invoice.paid_amount) || 0;
  const balanceAmount = parseFloat(invoice.balance_amount) ?? Math.max(0, totalAmount - paidAmount);
  const paymentMethod = (invoice.payment_method || invoice.payment_type || "CASH").toUpperCase();

  const showLogo = printSettings.companyLogo !== false;
  const showCompanyName = printSettings.companyName !== false && company?.company_name;
  const showAddress = printSettings.address !== false && company?.company_address;
  const showPhone = printSettings.phone !== false && company?.phone;
  const showEmail = printSettings.email !== false && company?.email;
  const showGstin = printSettings.gstin !== false && company?.gstin;
  const showHSN = printSettings.showHSNCode !== false;
  const showTax = printSettings.taxDetails !== false;
  const showWords = printSettings.amountInWords !== false && printSettings.amountInWords !== "None";
  const showRemarks = printSettings.printDescription !== false && invoice.notes;
  const showTerms = printSettings.printTerms !== false && (invoice.terms_conditions || invoice.terms);
  const showReceivedBy = printSettings.printReceivedBy;
  const showDeliveredBy = printSettings.printDeliveredBy;
  const showSignature = printSettings.printSignatureText !== false;
  const showReceived = printSettings.receivedAmount !== false;
  const showBalance = printSettings.balanceAmount !== false;
  const showPartyBalance = printSettings.currentBalanceParty;
  const showYouSaved = printSettings.youSaved;
  const showPaymentMode = printSettings.paymentMode !== false;
  const showAck = printSettings.printAcknowledgement;

  const halfGst = totalGst / 2;

  return (
    <div style={{
      fontFamily: "'Segoe UI', Arial, sans-serif",
      fontSize: 10.5,
      color: "#111827",
      width: "100%",
      maxWidth: 280,
      margin: "0 auto",
      lineHeight: 1.3,
      background: "#ffffff",
      boxSizing: "border-box"
    }}>
      {/* Heading */}
      <div style={{ textAlign: "center", borderBottom: "1px solid #000000", paddingBottom: 4, marginBottom: 4 }}>
        {showLogo && logoUrl && (
          <img src={logoUrl} alt="Logo" style={{ width: 36, height: 36, objectFit: "contain", margin: "0 auto 3px auto" }} />
        )}
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.5 }}>{invoiceType.toUpperCase()}</div>
        {showCompanyName && (
          <div style={{ fontSize: 13, fontWeight: 800, color: "#111827", marginTop: 1 }}>
            {company.company_name}
          </div>
        )}
        {showAddress && (
          <div style={{ fontSize: 9.5, color: "#374151" }}>
            {company.company_address}
          </div>
        )}
        {showGstin && (
          <div style={{ fontSize: 10, fontWeight: 600 }}>
            GSTIN: {company.gstin}
          </div>
        )}
        <div style={{ fontSize: 9.5 }}>
          {showPhone && `Phone: ${company.phone}`} {showEmail && `• ${company.email}`}
        </div>
      </div>

      {/* Bill & Party Details */}
      <table style={{ width: "100%", fontSize: 9.5, borderCollapse: "collapse", marginBottom: 4 }}>
        <tbody>
          <tr>
            <td style={{ width: "50%", padding: "1px 0" }}><strong>{docNoLabel}:</strong> {invoice.invoice_no || invoice.receipt_no}</td>
            <td style={{ width: "50%", textAlign: "right", padding: "1px 0" }}><strong>Date:</strong> {formatPOSDateTime(invoice.created_at)}</td>
          </tr>
          <tr>
            <td style={{ padding: "1px 0" }} colSpan={2}><strong>{partyLabel}:</strong> {invoice.customer_name || invoice.party_name || "Party"}</td>
          </tr>
          {invoice.customer_gstin && (
            <tr>
              <td style={{ padding: "1px 0" }} colSpan={2}><strong>Party GSTIN:</strong> {invoice.customer_gstin}</td>
            </tr>
          )}
          <tr>
            {showPaymentMode && <td style={{ padding: "1px 0" }}><strong>Payment Mode:</strong> {paymentMethod}</td>}
            <td style={{ textAlign: "right", padding: "1px 0" }}><strong>Type:</strong> {invoiceType}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ borderBottom: "1px dashed #000", margin: "3px 0" }} />

      {isPaymentVoucher ? (
        <div style={{ padding: "4px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: "bold", padding: "4px 0" }}>
            <span>{vType === "payment_out" ? "PAID AMOUNT:" : "RECEIVED AMOUNT:"}</span>
            <span>₹ {formatCurrency(paidAmount, printSettings)}</span>
          </div>
          {showWords && (
            <div style={{ fontSize: 9, margin: "3px 0", color: "#374151" }}>
              <strong>In Words:</strong> {numberToWordsINR(paidAmount)}
            </div>
          )}
          {showPaymentMode && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, marginTop: 4 }}>
              <span>Mode: {paymentMethod}</span>
              <span>Status: PAID</span>
            </div>
          )}
          {showSignature && (
            <div style={{ marginTop: 14, textAlign: "right", fontSize: 9, fontWeight: "bold" }}>
              For: {company?.company_name || "My Company"}
              <div style={{ fontSize: 8.5, color: "#64748b" }}>{printSettings.signatureText || "Authorized Signatory"}</div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Item Table with HSN & GST % */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9.5 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #000000" }}>
                {printSettings.showSNo !== false && <th style={{ textAlign: "left", padding: "2px 0", fontWeight: "bold", width: 18 }}>#</th>}
                <th style={{ textAlign: "left", padding: "2px 0", fontWeight: "bold" }}>Item</th>
                {showHSN && vType !== "expense" && <th style={{ textAlign: "center", padding: "2px 0", fontWeight: "bold" }}>HSN</th>}
                <th style={{ textAlign: "center", padding: "2px 0", fontWeight: "bold" }}>Qty</th>
                <th style={{ textAlign: "right", padding: "2px 0", fontWeight: "bold" }}>Rate</th>
                <th style={{ textAlign: "right", padding: "2px 0", fontWeight: "bold" }}>Amt</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => {
                const qty = parseFloat(p.qty || p.quantity) || 1;
                const price = parseFloat(p.price || p.unit_price) || 0;
                const amt = parseFloat(p.amount || p.total) || (qty * price);
                const gstPct = parseFloat(p.gst || p.tax_percent || p.tax_rate) || 0;

                return (
                  <tr key={i} style={{ borderBottom: "1px dotted #e5e7eb" }}>
                    {printSettings.showSNo !== false && <td style={{ textAlign: "left", padding: "2px 0" }}>{i + 1}</td>}
                    <td style={{ textAlign: "left", padding: "2px 0", wordBreak: "break-word" }}>
                      <div>{getItemName(p)}</div>
                      {printSettings.showDescription !== false && printSettings.printDescription !== false && p.description && (
                        <div style={{ fontSize: 8.5, color: "#64748b" }}>{p.description}</div>
                      )}
                      {showTax && gstPct > 0 && <div style={{ fontSize: 8.5, color: "#4b5563" }}>GST @{gstPct}%</div>}
                      {renderItemExtras(p, printSettings)}
                    </td>
                    {showHSN && vType !== "expense" && <td style={{ textAlign: "center", padding: "2px 0", fontSize: 9 }}>{getItemHSN(p)}</td>}
                    <td style={{ textAlign: "center", padding: "2px 0" }}>
                      {qty} {printSettings.showUnits !== false && p.unit ? p.unit : ""}
                    </td>
                    <td style={{ textAlign: "right", padding: "2px 0" }}>{formatCurrency(price, printSettings)}</td>
                    <td style={{ textAlign: "right", padding: "2px 0", fontWeight: "bold" }}>{formatCurrency(amt, printSettings)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ borderBottom: "1px dashed #000", margin: "4px 0" }} />

          {/* GST Split Breakdown Table */}
          {showTax && totalGst > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9, marginBottom: 4, background: "#f9fafb" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #d1d5db" }}>
                  <th style={{ textAlign: "left", padding: "2px" }}>Tax Split</th>
                  <th style={{ textAlign: "right", padding: "2px" }}>CGST</th>
                  <th style={{ textAlign: "right", padding: "2px" }}>SGST</th>
                  <th style={{ textAlign: "right", padding: "2px" }}>Total Tax</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: "2px" }}>GST (Standard)</td>
                  <td style={{ textAlign: "right", padding: "2px" }}>₹{formatCurrency(halfGst, printSettings)}</td>
                  <td style={{ textAlign: "right", padding: "2px" }}>₹{formatCurrency(halfGst, printSettings)}</td>
                  <td style={{ textAlign: "right", padding: "2px", fontWeight: "bold" }}>₹{formatCurrency(totalGst, printSettings)}</td>
                </tr>
              </tbody>
            </table>
          )}

          {/* Summary Totals */}
          <table style={{ width: "100%", fontSize: 10, borderCollapse: "collapse" }}>
            <tbody>
              {printSettings.totalItemQty !== false && (
                <tr>
                  <td style={{ padding: "1px 0" }}>Total Items / Qty</td>
                  <td style={{ textAlign: "right", padding: "1px 0" }}>{products.length} ({products.reduce((s, p) => s + (parseFloat(p.qty || p.quantity) || 0), 0)})</td>
                </tr>
              )}
              <tr>
                <td style={{ padding: "1px 0" }}>Sub Total (Taxable)</td>
                <td style={{ textAlign: "right", padding: "1px 0" }}>₹{formatCurrency(subTotal, printSettings)}</td>
              </tr>
              {showTax && totalGst > 0 && (
                <tr>
                  <td style={{ padding: "1px 0" }}>Total Tax</td>
                  <td style={{ textAlign: "right", padding: "1px 0" }}>₹{formatCurrency(totalGst, printSettings)}</td>
                </tr>
              )}
              {showYouSaved && (invoice.savings_amount || invoice.discount_amount) && (
                <tr>
                  <td style={{ padding: "1px 0", color: "#16a34a" }}>You Saved</td>
                  <td style={{ textAlign: "right", padding: "1px 0", color: "#16a34a" }}>₹{formatCurrency(invoice.savings_amount || 150, printSettings)}</td>
                </tr>
              )}
              <tr style={{ borderTop: "1.5px solid #000", borderBottom: "1.5px solid #000", fontWeight: "bold", fontSize: 12 }}>
                <td style={{ padding: "3px 0" }}>NET AMOUNT</td>
                <td style={{ textAlign: "right", padding: "3px 0" }}>₹{formatCurrency(totalAmount, printSettings)}</td>
              </tr>
              {(showReceived || showBalance) && (
                <tr>
                  <td style={{ padding: "1px 0", fontSize: 9.5 }}>{showReceived && `Paid: ₹${formatCurrency(paidAmount, printSettings)}`}</td>
                  <td style={{ textAlign: "right", padding: "1px 0", fontSize: 9.5, color: balanceAmount > 0 ? "#dc2626" : "#059669", fontWeight: "bold" }}>
                    {showBalance && `Balance: ₹${formatCurrency(balanceAmount, printSettings)}`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {showWords && (
            <div style={{ fontSize: 8.5, marginTop: 4, color: "#374151" }}>
              <strong>In Words:</strong> {numberToWordsINR(totalAmount)}
            </div>
          )}
          {showRemarks && <div style={{ fontSize: 8.5, marginTop: 2, color: "#374151" }}><strong>Note:</strong> {invoice.notes}</div>}
          {showTerms && <div style={{ fontSize: 8.5, marginTop: 2, color: "#64748b", whiteSpace: "pre-line" }}><strong>Terms:</strong> {invoice.terms_conditions || invoice.terms}</div>}
        </>
      )}

      {/* Signatory */}
      {showSignature && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 8, paddingTop: 4, borderTop: "1px dotted #9ca3af", fontSize: 8.5 }}>
          <div>
            <div>Thank you for your visit!</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: "bold" }}>{printSettings.signatureText || "Authorized Signatory"}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── 5.4 POS LAYOUT: QUICK MINIMAL / FAST BILLING TOKEN ─── */
export function ThemePOSMinimal({ invoice, company, color, logoUrl, printSettings = {} }) {
  const { vType, title: invoiceType, partyLabel, docNoLabel, isPaymentVoucher } = getVoucherConfig(invoice);
  const products = Array.isArray(invoice.products) ? invoice.products : [];
  const totalAmount = parseFloat(invoice.total_amount) || 0;
  const paidAmount = parseFloat(invoice.paid_amount) || 0;
  const totalQty = products.reduce((s, p) => s + (parseFloat(p.qty || p.quantity) || 0), 0);
  const paymentMethod = (invoice.payment_method || invoice.payment_type || "CASH").toUpperCase();

  const showLogo = printSettings.companyLogo !== false;
  const showCompanyName = printSettings.companyName !== false && company?.company_name;
  const showPhone = printSettings.phone !== false && company?.phone;
  const showWords = printSettings.amountInWords !== false && printSettings.amountInWords !== "None";

  return (
    <div style={{
      fontFamily: "'Courier New', Courier, monospace",
      fontSize: 11,
      color: "#000000",
      width: "100%",
      maxWidth: 270,
      margin: "0 auto",
      lineHeight: 1.3,
      background: "#ffffff",
      boxSizing: "border-box"
    }}>
      {/* Big Token Number Header Box */}
      <div style={{ border: "2px solid #000000", padding: "6px 4px", textAlign: "center", marginBottom: 6 }}>
        {showLogo && logoUrl && (
          <img src={logoUrl} alt="Logo" style={{ width: 30, height: 30, objectFit: "contain", margin: "0 auto 2px auto" }} />
        )}
        <div style={{ fontSize: 10, fontWeight: "bold", letterSpacing: 0.5 }}>{invoiceType.toUpperCase()}</div>
        <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 1, margin: "2px 0" }}>
          #{invoice.invoice_no || invoice.receipt_no}
        </div>
        <div style={{ fontSize: 9.5 }}>{showCompanyName ? company.company_name : "Express Billing"} {showPhone ? `• ${company.phone}` : ""}</div>
      </div>

      {/* Time & Counter */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, borderBottom: "1px dashed #000", paddingBottom: 3, marginBottom: 4 }}>
        <span>Date: {formatPOSDateTime(invoice.created_at)}</span>
        <span>Type: {paymentMethod}</span>
      </div>

      <div style={{ fontSize: 9.5, marginBottom: 4 }}>
        <span>{partyLabel} <strong>{invoice.customer_name || invoice.party_name || "Party"}</strong></span>
      </div>

      {isPaymentVoucher ? (
        <div style={{ padding: "4px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "4px 0" }}>
            <span style={{ fontSize: 11, fontWeight: "bold" }}>{vType === "payment_out" ? "PAID:" : "RECEIVED:"}</span>
            <span style={{ fontSize: 16, fontWeight: 900 }}>₹{formatCurrency(paidAmount, printSettings)}</span>
          </div>
          {showWords && (
            <div style={{ fontSize: 9, margin: "3px 0" }}>
              <strong>In Words:</strong> {numberToWordsINR(paidAmount)}
            </div>
          )}
          <div style={{ borderTop: "2px solid #000", borderBottom: "2px solid #000", padding: "3px 0", textAlign: "center", fontWeight: "bold", fontSize: 10, margin: "4px 0" }}>
            PAID BY {paymentMethod} • THANK YOU!
          </div>
        </div>
      ) : (
        <>
          {/* Streamlined Fast Item List */}
          <div style={{ fontSize: 11, marginBottom: 4 }}>
            {products.map((p, i) => {
              const qty = parseFloat(p.qty || p.quantity) || 1;
              const price = parseFloat(p.price || p.unit_price) || 0;
              const amt = parseFloat(p.amount || p.total) || (qty * price);

              return (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                  <span style={{ fontWeight: "bold", flex: 1, paddingRight: 4, wordBreak: "break-word" }}>
                    {qty}{printSettings.showUnits !== false && p.unit ? p.unit : ""} x {getItemName(p)}
                  </span>
                  <span style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>
                    ₹{formatCurrency(amt, printSettings)}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />

          {/* Large Bold Total */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "4px 0" }}>
            {printSettings.totalItemQty !== false && <span style={{ fontSize: 11, fontWeight: "bold" }}>ITEMS: {products.length} (QTY {totalQty})</span>}
            <span style={{ fontSize: 16, fontWeight: 900 }}>TOTAL: ₹{formatCurrency(totalAmount, printSettings)}</span>
          </div>

          <div style={{ borderTop: "2px solid #000", borderBottom: "2px solid #000", padding: "3px 0", textAlign: "center", fontWeight: "bold", fontSize: 10, margin: "4px 0" }}>
            PAID BY {paymentMethod} • THANK YOU!
          </div>
        </>
      )}
    </div>
  );
}

/* ─── 5.5 POS LAYOUT: VINTAGE BOUTIQUE (DECORATIVE BORDERS & STORE STORY) ─── */
export function ThemePOSVintage({ invoice, company, color, logoUrl, printSettings = {} }) {
  const { vType, title: invoiceType, partyLabel, docNoLabel, isPaymentVoucher } = getVoucherConfig(invoice);
  const products = Array.isArray(invoice.products) ? invoice.products : [];
  const totalAmount = parseFloat(invoice.total_amount) || 0;
  const totalGst = parseFloat(invoice.gst_total || invoice.tax_amount) || 0;
  const subTotal = parseFloat(invoice.sub_total) || (totalAmount - totalGst);
  const paidAmount = parseFloat(invoice.paid_amount) || 0;
  const balanceAmount = parseFloat(invoice.balance_amount) ?? Math.max(0, totalAmount - paidAmount);
  const paymentMethod = (invoice.payment_method || invoice.payment_type || "CASH").toUpperCase();

  const showLogo = printSettings.companyLogo !== false;
  const showCompanyName = printSettings.companyName !== false && company?.company_name;
  const showAddress = printSettings.address !== false && company?.company_address;
  const showPhone = printSettings.phone !== false && company?.phone;
  const showEmail = printSettings.email !== false && company?.email;
  const showGstin = printSettings.gstin !== false && company?.gstin;
  const showHSN = printSettings.showHSNCode !== false;
  const showTax = printSettings.taxDetails !== false;
  const showWords = printSettings.amountInWords !== false && printSettings.amountInWords !== "None";
  const showRemarks = printSettings.printDescription !== false && invoice.notes;
  const showTerms = printSettings.printTerms !== false && (invoice.terms_conditions || invoice.terms);
  const showReceivedBy = printSettings.printReceivedBy;
  const showDeliveredBy = printSettings.printDeliveredBy;
  const showSignature = printSettings.printSignatureText !== false;
  const showReceived = printSettings.receivedAmount !== false;
  const showBalance = printSettings.balanceAmount !== false;
  const showPartyBalance = printSettings.currentBalanceParty;
  const showYouSaved = printSettings.youSaved;
  const showPaymentMode = printSettings.paymentMode !== false;
  const showAck = printSettings.printAcknowledgement;

  return (
    <div style={{
      fontFamily: "'Courier New', Courier, monospace",
      fontSize: 10.5,
      color: "#18181b",
      width: "100%",
      maxWidth: 275,
      margin: "0 auto",
      lineHeight: 1.35,
      background: "#ffffff",
      boxSizing: "border-box"
    }}>
      {/* Decorative Vintage Banner */}
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        {showLogo && logoUrl && (
          <img src={logoUrl} alt="Logo" style={{ width: 34, height: 34, objectFit: "contain", margin: "0 auto 3px auto" }} />
        )}
        <div style={{ fontSize: 11, fontWeight: "bold", letterSpacing: 1 }}>═════════════════════════════</div>
        <div style={{ fontSize: 13.5, fontWeight: 900, letterSpacing: 0.5, margin: "2px 0" }}>
          * {showCompanyName ? company.company_name : "Apex Heritage & Boutique"} *
        </div>
        <div style={{ fontSize: 11, fontWeight: "bold", letterSpacing: 1 }}>═════════════════════════════</div>
        {showAddress && <div style={{ fontSize: 10, marginTop: 2 }}>{company.company_address}</div>}
        <div style={{ fontSize: 10 }}>
          {showPhone && `Ph: ${company.phone}`} {showEmail && `| Email: ${company.email}`} {showGstin && `| GST: ${company.gstin}`}
        </div>
      </div>

      <div style={{ borderBottom: "1px dashed #000", margin: "4px 0" }} />

      {/* Bill Info */}
      <div style={{ fontSize: 10, marginBottom: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>{docNoLabel} #{invoice.invoice_no || invoice.receipt_no}</span>
          <span>{formatPOSDateTime(invoice.created_at)}</span>
        </div>
        <div>{partyLabel} {invoice.customer_name || invoice.party_name || "Valued Patron"}</div>
      </div>

      <div style={{ borderBottom: "1px solid #000", margin: "4px 0" }} />

      {isPaymentVoucher ? (
        <div style={{ padding: "4px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: "bold" }}>
            <span>{vType === "payment_out" ? "AMOUNT PAID:" : "AMOUNT RECEIVED:"}</span>
            <span>₹ {formatCurrency(paidAmount, printSettings)}</span>
          </div>
          {showWords && (
            <div style={{ fontSize: 9.5, margin: "4px 0" }}>
              <strong>In Words:</strong> {numberToWordsINR(paidAmount)}
            </div>
          )}
          {showPaymentMode && (
            <div style={{ fontSize: 9.5, marginTop: 4 }}>
              <span>Payment: <strong>{paymentMethod}</strong></span>
            </div>
          )}
          <div style={{ borderBottom: "1px solid #000", margin: "6px 0" }} />
          {showSignature && (
            <div style={{ textAlign: "right", marginTop: 10, fontSize: 9.5, fontWeight: "bold" }}>
              For: {company?.company_name || "My Company"}
              <div style={{ fontSize: 9, color: "#64748b" }}>{printSettings.signatureText || "Authorized Signatory"}</div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Items List */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
            <thead>
              <tr style={{ borderBottom: "1px dashed #71717a" }}>
                {printSettings.showSNo !== false && <th style={{ textAlign: "left", paddingBottom: 2, fontWeight: "bold", width: 16 }}>#</th>}
                <th style={{ textAlign: "left", paddingBottom: 2, fontWeight: "bold" }}>ITEM DESCRIPTION</th>
                <th style={{ textAlign: "center", paddingBottom: 2, fontWeight: "bold" }}>QTY</th>
                <th style={{ textAlign: "right", paddingBottom: 2, fontWeight: "bold" }}>PRICE</th>
                <th style={{ textAlign: "right", paddingBottom: 2, fontWeight: "bold" }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => {
                const qty = parseFloat(p.qty || p.quantity) || 1;
                const price = parseFloat(p.price || p.unit_price) || 0;
                const amt = parseFloat(p.amount || p.total) || (qty * price);

                return (
                  <tr key={i} style={{ verticalAlign: "top" }}>
                    {printSettings.showSNo !== false && <td style={{ textAlign: "left", padding: "2.5px 0" }}>{i + 1}</td>}
                    <td style={{ textAlign: "left", padding: "2.5px 0", wordBreak: "break-word" }}>
                      * {getItemName(p)}
                      {printSettings.showDescription !== false && printSettings.printDescription !== false && p.description && (
                        <div style={{ fontSize: 9, color: "#52525b" }}>{p.description}</div>
                      )}
                      {showHSN && (p.hsn_code || p.hsn || p.product_code) && (
                        <div style={{ fontSize: 8.5, color: "#52525b" }}>HSN: {p.hsn_code || p.hsn || p.product_code}</div>
                      )}
                      {renderItemExtras(p, printSettings)}
                    </td>
                    <td style={{ textAlign: "center", padding: "2.5px 2px" }}>
                      {qty} {printSettings.showUnits !== false && p.unit ? p.unit : ""}
                    </td>
                    <td style={{ textAlign: "right", padding: "2.5px 2px" }}>{formatCurrency(price, printSettings)}</td>
                    <td style={{ textAlign: "right", padding: "2.5px 0", fontWeight: "bold" }}>{formatCurrency(amt, printSettings)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ borderBottom: "1px solid #000", margin: "4px 0" }} />

          {/* Summary */}
          <table style={{ width: "100%", fontSize: 10.5, borderCollapse: "collapse" }}>
            <tbody>
              {printSettings.totalItemQty !== false && (
                <tr>
                  <td style={{ padding: "1px 0" }}>TOTAL ITEMS / QTY</td>
                  <td style={{ textAlign: "right", padding: "1px 0" }}>{products.length} ({products.reduce((s, p) => s + (parseFloat(p.qty || p.quantity) || 0), 0)})</td>
                </tr>
              )}
              <tr>
                <td style={{ padding: "1px 0" }}>SUB TOTAL</td>
                <td style={{ textAlign: "right", padding: "1px 0" }}>₹{formatCurrency(subTotal, printSettings)}</td>
              </tr>
              {showTax && totalGst > 0 && (
                <tr>
                  <td style={{ padding: "1px 0" }}>ESTIMATED GST</td>
                  <td style={{ textAlign: "right", padding: "1px 0" }}>₹{formatCurrency(totalGst, printSettings)}</td>
                </tr>
              )}
              {showYouSaved && (invoice.savings_amount || invoice.discount_amount) && (
                <tr>
                  <td style={{ padding: "1px 0", color: "#16a34a" }}>SAVINGS HIGHLIGHT</td>
                  <td style={{ textAlign: "right", padding: "1px 0", color: "#16a34a" }}>₹{formatCurrency(invoice.savings_amount || 150, printSettings)}</td>
                </tr>
              )}
              <tr style={{ fontWeight: 900, fontSize: 12.5 }}>
                <td style={{ padding: "3px 0" }}>GRAND TOTAL</td>
                <td style={{ textAlign: "right", padding: "3px 0" }}>₹{formatCurrency(totalAmount, printSettings)}</td>
              </tr>
              {showPaymentMode && (
                <tr>
                  <td style={{ padding: "1px 0", fontSize: 10 }}>PAYMENT ({paymentMethod})</td>
                  <td style={{ textAlign: "right", padding: "1px 0", fontSize: 10 }}>₹{formatCurrency(paidAmount, printSettings)}</td>
                </tr>
              )}
            </tbody>
          </table>

          {showWords && (
            <div style={{ fontSize: 9, marginTop: 4, color: "#27272a" }}>
              <strong>In Words:</strong> {numberToWordsINR(totalAmount)}
            </div>
          )}
          {showRemarks && <div style={{ fontSize: 9, marginTop: 2 }}><strong>Note:</strong> {invoice.notes}</div>}
          {showTerms && <div style={{ fontSize: 8.5, marginTop: 2, whiteSpace: "pre-line" }}><strong>Terms:</strong> {invoice.terms_conditions || invoice.terms}</div>}
        </>
      )}

      <div style={{ borderBottom: "1px dashed #000", margin: "5px 0" }} />

      {/* Vintage Footer */}
      <div style={{ textAlign: "center", fontSize: 9.5, lineHeight: 1.35, paddingBottom: 2 }}>
        <div>~ Thank you for your business! ~</div>
        <div style={{ fontSize: 10, fontWeight: "bold", letterSpacing: 1, marginTop: 2 }}>═════════════════════════════</div>
      </div>
    </div>
  );
}

/* ─── MAIN POS RECEIPT THEME DISPATCHER ─── */
function ThemePOS({ invoice, company, color, logoUrl, layout, printSettings = {} }) {
  const activeLayout = layout || invoice?.pos_layout || (() => {
    try {
      return localStorage.getItem("thermal_pos_layout") || "pos_classic";
    } catch {
      return "pos_classic";
    }
  })();

  if (activeLayout === "pos_modern") {
    return <ThemePOSModern invoice={invoice} company={company} color={color} logoUrl={logoUrl} printSettings={printSettings} />;
  }
  if (activeLayout === "pos_detailed") {
    return <ThemePOSDetailed invoice={invoice} company={company} color={color} logoUrl={logoUrl} printSettings={printSettings} />;
  }
  if (activeLayout === "pos_minimal") {
    return <ThemePOSMinimal invoice={invoice} company={company} color={color} logoUrl={logoUrl} printSettings={printSettings} />;
  }
  if (activeLayout === "pos_vintage") {
    return <ThemePOSVintage invoice={invoice} company={company} color={color} logoUrl={logoUrl} printSettings={printSettings} />;
  }
  return <ThemePOSClassic invoice={invoice} company={company} color={color} logoUrl={logoUrl} printSettings={printSettings} />;
}

/* ─── INITIAL SETTINGS LOADER FROM LOCALSTORAGE ───────────────────────────── */
function getInitialPrintSettings() {
  try {
    const printSettings = JSON.parse(localStorage.getItem("print_settings") || "{}");
    const defaultPrinter = localStorage.getItem("invoice_printer_type") || printSettings.printer || "regular";
    const defaultTheme = localStorage.getItem("invoice_default_theme") || printSettings.template || printSettings.theme || "tally";
    const defaultColor = localStorage.getItem("invoice_default_color") || printSettings.themeColor || "#2563eb";
    const defaultPosLayout = localStorage.getItem("thermal_pos_layout") || localStorage.getItem("invoice_pos_layout") || printSettings.posLayout || "pos_classic";
    const defaultPageSize = printSettings.pageSize || "2 Inch: 58mm";

    return {
      printer: defaultPrinter,
      theme: defaultTheme,
      color: defaultColor,
      posLayout: defaultPosLayout,
      pageSize: defaultPageSize,
    };
  } catch {
    return {
      printer: "regular",
      theme: "tally",
      color: "#2563eb",
      posLayout: "pos_classic",
      pageSize: "2 Inch: 58mm",
    };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN INVOICE PREVIEW COMPONENT (MATCHING ALL SCREENSHOTS)
═══════════════════════════════════════════════════════════════════════════ */
export default function InvoicePreview() {
  const { invoiceNo } = useParams();
  const navigate = useNavigate();

  const initialSettings = getInitialPrintSettings();
  const [invoice, setInvoice] = useState(null);
  const [company, setCompany] = useState(null);
  const [printerType, setPrinterType] = useState(() => initialSettings.printer);
  const [selectedTheme, setSelectedTheme] = useState(() => initialSettings.theme);
  const [selectedColor, setSelectedColor] = useState(() => initialSettings.color);
  const [selectedPosLayout, setSelectedPosLayout] = useState(() => initialSettings.posLayout);
  const [pageSize, setPageSize] = useState(() => initialSettings.pageSize);
  const [printSettings, setPrintSettings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("print_settings") || "{}");
    } catch {
      return {};
    }
  });
  const [doNotShowAgain, setDoNotShowAgain] = useState(() => localStorage.getItem("skip_invoice_preview") === "true");
  const [waSending, setWaSending] = useState(false);
  const [tmSending, setTmSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const tmAttachDone = useRef(false);

  /* Modern UX & Canvas Controls */
  const [zoom, setZoom] = useState(1.0);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [copiedDocNo, setCopiedDocNo] = useState(false);
  const [toasts, setToasts] = useState([]);

  const isPOS = printerType === "thermal" || selectedTheme === "pos";
  const logoUrl = getInvoiceLogoUrl(company?.logo);

  const showToast = useCallback((msg, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  /* Insert Print CSS */
  useEffect(() => {
    const s = document.createElement("style");
    s.innerHTML = PRINT_CSS;
    document.head.appendChild(s);
    return () => document.head.removeChild(s);
  }, []);

  /* Load Invoice Data */
  useEffect(() => {
    if (!invoiceNo) {
      setLoadError("Invoice number is missing.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    api
      .get(`/invoice/get_invoice_by_id?id=${invoiceNo}`)
      .then((res) => {
        if (res.data && res.data.status && res.data.data) {
          setInvoice(res.data.data);
          setCompany({
            company_name: res.data.data.company_name,
            company_address: res.data.data.company_address,
            phone: res.data.data.phone,
            gstin: res.data.data.gstin,
            logo: res.data.data.logo,
            bank_name: res.data.data.bank_name,
            account_no: res.data.data.account_no,
            ifsc_code: res.data.data.ifsc_code,
          });
        } else {
          setLoadError(res.data?.message || `Invoice #${invoiceNo} not found.`);
        }
      })
      .catch((err) => {
        console.error(err);
        setLoadError(err.response?.data?.message || "Failed to load invoice details.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [invoiceNo]);

  /* Load print & invoice design settings from DB */
  useEffect(() => {
    if (!invoice) return;
    const companyId = invoice.company_id;
    api
      .get("/settings/get", { params: { company_id: companyId } })
      .then((res) => {
        const data = (res.data && res.data.data) || {};
        const printSettings = data.print || {};
        const designSettings = data.invoiceDesign || {};

        const activePrinter = printSettings.printer || (designSettings.theme === "pos" ? "thermal" : "regular");
        if (activePrinter) setPrinterType(activePrinter);

        const themeCandidate = printSettings.template || printSettings.theme || designSettings.template || designSettings.theme;
        if (themeCandidate) {
          const map = {
            "Tally Theme": "tally",
            "GST Theme 1": "gst1",
            "GST Theme 2": "gst3",
            "GST Theme 3": "gst3",
            "Double Divine": "double_divine",
            "Minimal Theme": "gst3",
            french_elite: "french_elite",
            pos: "pos",
            vintage_classic: "vintage_classic",
            vintage_bold: "vintage_bold",
          };
          const resolved = map[themeCandidate] || themeCandidate.toLowerCase().replace(/\s+/g, "_");
          if (resolved) setSelectedTheme(resolved);
        }

        const colorCandidate = printSettings.themeColor || designSettings.themeColor;
        if (colorCandidate) setSelectedColor(colorCandidate);

        const posLayoutCandidate = printSettings.posLayout || designSettings.posLayout;
        if (posLayoutCandidate) setSelectedPosLayout(posLayoutCandidate);

        if (printSettings.pageSize) setPageSize(printSettings.pageSize);
      })
      .catch(() => {});
  }, [invoice]);

  /* Auto-Send: attach PDF */
  useEffect(() => {
    if (!invoice?.invoice_no || tmAttachDone.current) return;
    tmAttachDone.current = true;
    let cancelled = false;

    api
      .get("/transaction-messages/attachment-status", {
        params: {
          company_id: invoice.company_id,
          transaction_type: "sales",
          txn_no: invoice.invoice_no,
        },
      })
      .then(async (res) => {
        if (cancelled || !res.data?.status || !res.data?.auto_sent) return;
        const element = document.getElementById("invoice-print-area");
        if (!element) return;

        try {
          await Promise.all(
            [...element.querySelectorAll("img")].map((im) =>
              im.complete ? null : new Promise((r) => { im.onload = r; im.onerror = r; })
            )
          );
        } catch {
          /* ignore image wait errors */
        }

        if (cancelled) return;
        const pdf_base64 = await generateInvoicePdfBase64({
          element,
          invoiceNo: invoice.invoice_no,
          isPOS,
        });

        return api.post("/transaction-messages/attach-pdf", {
          company_id: invoice.company_id,
          transaction_type: "sales",
          txn_no: invoice.invoice_no,
          pdf_base64,
          filename: `${invoice.invoice_no}.pdf`,
        });
      })
      .then((res) => {
        if (res && !res.data?.status) {
          console.warn("[AUTO SEND] PDF attach skipped:", res.data?.message);
        }
      })
      .catch((err) => {
        console.warn("[AUTO SEND] PDF attach failed:", err?.message || err);
      });

    return () => { cancelled = true; };
  }, [invoice, isPOS]);

  /* PDF Download */
  const downloadPDF = useCallback(() => {
    const element = document.getElementById("invoice-print-area");
    if (!element) return;

    showToast("Generating PDF download...", "info");
    if (isPOS) {
      const elementHeight = element.scrollHeight || element.offsetHeight || 550;
      const heightInMm = Math.max(140, Math.ceil((elementHeight * 25.4) / 96) + 8);

      const opt = {
        margin: [2, 2, 2, 2],
        filename: `invoice-${invoice.invoice_no}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 3,
          useCORS: true,
          logging: false,
          width: 275,
          windowWidth: 275,
          scrollX: 0,
          scrollY: 0,
        },
        jsPDF: {
          unit: "mm",
          format: [80, heightInMm],
          orientation: "portrait",
        },
      };
      html2pdf()
        .set(opt)
        .from(element)
        .save()
        .then(() => {
          showToast("PDF downloaded successfully!", "success");
        })
        .catch(() => {
          showToast("Failed to download PDF.", "error");
        });
    } else {
      const opt = {
        margin: [8, 8, 8, 8],
        filename: `invoice-${invoice.invoice_no}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };
      html2pdf()
        .set(opt)
        .from(element)
        .save()
        .then(() => {
          showToast("PDF downloaded successfully!", "success");
        })
        .catch(() => {
          showToast("Failed to download PDF.", "error");
        });
    }
  }, [invoice, isPOS, showToast]);

  /* Print */
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  /* WhatsApp Share */
  const shareWhatsApp = useCallback(() => {
    const element = document.getElementById("invoice-print-area");
    if (!element || waSending) return;

    setWaSending(true);
    showToast("Preparing & sending PDF via WhatsApp...", "info");
    generateInvoicePdfBase64({ element, invoiceNo: invoice.invoice_no, isPOS })
      .then((pdf_base64) =>
        sendInvoiceViaWhatsAppApi({
          company_id: invoice.company_id,
          invoice_no: invoice.invoice_no,
          phone: invoice.customer_phone,
          pdf_base64,
        })
      )
      .then((res) => {
        showToast(res.data?.message || "Invoice PDF sent via WhatsApp!", "success");
      })
      .catch((err) => {
        showToast(err.response?.data?.message || "Failed to send invoice via WhatsApp.", "error");
      })
      .finally(() => setWaSending(false));
  }, [invoice, isPOS, waSending, showToast]);

  /* Transaction Message via WhatsApp */
  const sendTransactionMessage = useCallback(() => {
    if (!invoice?.invoice_no || tmSending) return;
    setTmSending(true);
    showToast("Sending WhatsApp notification...", "info");
    api
      .post("/transaction-messages/send", {
        company_id: invoice.company_id,
        transaction_type: "sales",
        reference: { invoice_no: invoice.invoice_no },
        phone: invoice.customer_phone || "",
      })
      .then((res) => {
        showToast(res.data?.message || "Transaction message sent via WhatsApp!", "success");
      })
      .catch((err) => {
        showToast(err.response?.data?.message || "Failed to send transaction message.", "error");
      })
      .finally(() => setTmSending(false));
  }, [invoice, tmSending, showToast]);

  /* Gmail / Mail Share */
  const shareEmail = useCallback(() => {
    const subject = encodeURIComponent(`Invoice #${invoice.invoice_no} from ${company?.company_name || "Company"}`);
    const body = encodeURIComponent(
      `Dear ${invoice.customer_name || "Customer"},\n\nPlease find your invoice #${invoice.invoice_no} details:\nTotal Amount: ₹${invoice.total_amount}\nPayment Type: ${invoice.payment_type || "Cash"}\n\nThank you for your business!`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  }, [invoice, company]);

  /* SMS Share */
  const shareSMS = useCallback(() => {
    const body = encodeURIComponent(`Invoice #${invoice.invoice_no} Total: ₹${invoice.total_amount}. Thank you!`);
    window.open(`sms:${invoice.customer_phone || ""}?body=${body}`, "_blank");
  }, [invoice]);

  /* Copy Public Link */
  const copyInvoiceLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    showToast("Invoice URL copied to clipboard!", "success");
  }, [showToast]);

  /* Copy Invoice Number */
  const copyInvoiceNumber = useCallback(() => {
    if (!invoice?.invoice_no) return;
    navigator.clipboard.writeText(invoice.invoice_no);
    setCopiedDocNo(true);
    showToast(`Invoice #${invoice.invoice_no} copied!`, "success");
    setTimeout(() => setCopiedDocNo(false), 2000);
  }, [invoice, showToast]);

  /* Save & Close Navigation */
  const handleSaveAndClose = useCallback(() => {
    localStorage.setItem("skip_invoice_preview", doNotShowAgain ? "true" : "false");
    const targetRoute = getVoucherBackRoute(invoice || { invoice_no: invoiceNo });
    navigate(targetRoute);
  }, [doNotShowAgain, invoice, invoiceNo, navigate]);

  /* Keyboard Shortcuts */
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        handlePrint();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        downloadPDF();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "w") {
        e.preventDefault();
        shareWhatsApp();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleSaveAndClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlePrint, downloadPDF, shareWhatsApp, handleSaveAndClose]);

  /* Zoom Handlers */
  const handleZoomIn = () => setZoom((z) => Math.min(1.5, Math.round((z + 0.1) * 10) / 10));
  const handleZoomOut = () => setZoom((z) => Math.max(0.6, Math.round((z - 0.1) * 10) / 10));
  const handleResetZoom = () => setZoom(1.0);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center gap-4 text-slate-300">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 animate-pulse flex items-center justify-center shadow-lg shadow-blue-500/20">
            <FileText className="w-6 h-6 text-white animate-bounce" />
          </div>
          <div className="absolute -inset-2 rounded-2xl border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-slate-100 text-sm">Preparing Invoice #{invoiceNo}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Rendering precision print layout & templates...</p>
        </div>
      </div>
    );
  }

  if (loadError || !invoice) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Invoice Not Found</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            {loadError || `Could not find invoice #${invoiceNo}. It may have been deleted or the document number is invalid.`}
          </p>
          <button
            onClick={() => navigate(getVoucherBackRoute(invoice || { invoice_no: invoiceNo }))}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Invoices</span>
          </button>
        </div>
      </div>
    );
  }

  const totalAmountNum = parseFloat(invoice?.total_amount) || 0;
  const paidAmountNum = parseFloat(invoice?.paid_amount) || 0;
  const balanceAmountNum = Math.max(0, totalAmountNum - paidAmountNum);
  const isPaid = balanceAmountNum <= 0 && totalAmountNum > 0;
  const isPartial = paidAmountNum > 0 && balanceAmountNum > 0;

  const statusBadge = isPaid ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      PAID
    </span>
  ) : isPartial ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/25">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
      PARTIAL
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/25">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
      UNPAID
    </span>
  );

  const invoiceType = getInvoiceType(invoice);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-950 font-sans select-none overflow-hidden text-slate-100">

      {/* ── 1. MODERN APP HEADER (BRAND TOOLBAR) ── */}
      <header className="no-print h-14 bg-slate-900/95 backdrop-blur border-b border-slate-800/80 px-4 flex items-center justify-between z-30 shrink-0 shadow-lg">
        {/* Left Cluster: Navigation & Document Identification */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveAndClose}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700/60 transition-colors shadow-sm"
            title="Return to list (Esc)"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back</span>
            <kbd className="hidden md:inline px-1 py-0.2 rounded bg-slate-900 text-[10px] text-slate-400 border border-slate-700">Esc</kbd>
          </button>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {/* Doc details pill */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400">
              <FileCheck className="w-4 h-4" />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 hidden lg:inline">Invoice</span>
                <span className="text-xs sm:text-sm font-bold tracking-tight text-white font-mono">
                  #{invoice.invoice_no}
                </span>
                <button
                  onClick={copyInvoiceNumber}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                  title="Copy invoice number"
                >
                  {copiedDocNo ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>

              <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 font-semibold border border-blue-500/20">
                {invoiceType}
              </span>

              {statusBadge}
            </div>
          </div>
        </div>

        {/* Center Cluster: Format Selector & Interactive Zoom */}
        <div className="hidden md:flex items-center gap-3">
          {/* Format Switcher */}
          <div className="bg-slate-800/90 p-0.5 rounded-lg border border-slate-700/70 flex items-center gap-0.5">
            <button
              onClick={() => {
                setPrinterType("regular");
                localStorage.setItem("invoice_printer_type", "regular");
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                !isPOS
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/40"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>A4 Regular</span>
            </button>
            <button
              onClick={() => {
                setPrinterType("thermal");
                localStorage.setItem("invoice_printer_type", "thermal");
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                isPOS
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/40"
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Thermal POS</span>
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="bg-slate-800/90 rounded-lg border border-slate-700/70 flex items-center px-1 py-0.5 gap-0.5 text-xs text-slate-300">
            <button
              onClick={handleZoomOut}
              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="px-1.5 py-0.5 font-mono text-[11px] font-semibold hover:bg-slate-700 rounded transition-colors"
              title="Reset to 100%"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Cluster: Quick Actions & Close */}
        <div className="flex items-center gap-2.5">
          {/* Quick toggle check */}
          <label className="hidden xl:flex items-center gap-2 cursor-pointer text-xs text-slate-400 hover:text-slate-300">
            <input
              type="checkbox"
              checked={doNotShowAgain}
              onChange={(e) => {
                setDoNotShowAgain(e.target.checked);
                localStorage.setItem("skip_invoice_preview", e.target.checked ? "true" : "false");
              }}
              className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-blue-600"
            />
            <span>Skip preview next time</span>
          </label>

          {/* Quick Print Primary Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all"
            title="Print document (Ctrl+P)"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
            <kbd className="hidden lg:inline px-1 py-0.2 rounded bg-white/20 text-[9px] font-normal">^P</kbd>
          </button>

          {/* Save & Close Button */}
          <button
            onClick={handleSaveAndClose}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all"
          >
            <span>Done</span>
          </button>

          {/* Sidebar Toggle Controls for Responsive view */}
          <div className="flex items-center gap-1 lg:hidden">
            <button
              onClick={() => setLeftSidebarOpen((v) => !v)}
              className={`p-1.5 rounded-lg border text-xs ${
                leftSidebarOpen ? "bg-slate-800 border-slate-700 text-blue-400" : "bg-transparent border-slate-800 text-slate-400"
              }`}
              title="Toggle Studio panel"
            >
              <Sliders className="w-4 h-4" />
            </button>
            <button
              onClick={() => setRightSidebarOpen((v) => !v)}
              className={`p-1.5 rounded-lg border text-xs ${
                rightSidebarOpen ? "bg-slate-800 border-slate-700 text-blue-400" : "bg-transparent border-slate-800 text-slate-400"
              }`}
              title="Toggle Info panel"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. THREE-PANEL WORKSPACE ── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* ── 2.A LEFT PANEL: DESIGN & CUSTOMIZATION STUDIO ── */}
        <aside
          className={`no-print absolute lg:relative z-20 inset-y-0 left-0 w-72 bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 ease-in-out ${
            leftSidebarOpen ? "translate-x-0" : "-translate-x-full lg:w-0 lg:overflow-hidden lg:border-r-0"
          }`}
        >
          {/* Studio Header */}
          <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Palette className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Invoice Studio</span>
            </div>
            <button
              onClick={() => setLeftSidebarOpen(false)}
              className="lg:hidden p-1 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Studio Controls Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-5 custom-scrollbar text-xs">
            {/* 1. Format Selection */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Output Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPrinterType("regular");
                    localStorage.setItem("invoice_printer_type", "regular");
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                    !isPOS
                      ? "bg-blue-600/15 border-blue-500/50 text-blue-300 ring-1 ring-blue-500/30"
                      : "bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-xs">A4 Standard</span>
                  <span className="text-[10px] text-slate-400 leading-tight">Desktop GST bill</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrinterType("thermal");
                    localStorage.setItem("invoice_printer_type", "thermal");
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                    isPOS
                      ? "bg-amber-600/15 border-amber-500/50 text-amber-300 ring-1 ring-amber-500/30"
                      : "bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-xs">Thermal POS</span>
                  <span className="text-[10px] text-slate-400 leading-tight">Fast roll receipt</span>
                </button>
              </div>
            </div>

            {/* 2. Theme / Layout Selection */}
            {!isPOS ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Template Theme
                  </label>
                  <span className="text-[10px] text-slate-500">{THEMES.filter((t) => t.id !== "pos").length} presets</span>
                </div>
                <div className="space-y-1.5">
                  {THEMES.filter((t) => t.id !== "pos").map((t) => {
                    const isSelected = selectedTheme === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setSelectedTheme(t.id);
                          localStorage.setItem("invoice_default_theme", t.id);
                        }}
                        className={`w-full px-3 py-2 rounded-xl border text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? "bg-blue-600/15 border-blue-500/50 text-white font-bold ring-1 ring-blue-500/30"
                            : "bg-slate-800/40 border-slate-700/40 text-slate-300 hover:bg-slate-800/80 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ background: isSelected ? selectedColor : "#64748b" }}
                          />
                          <span className="text-xs">{t.label}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  POS Receipt Layout
                </label>
                <div className="space-y-1.5">
                  {[
                    { id: "pos_classic", label: "Classic POS", desc: "Default retail layout" },
                    { id: "pos_modern", label: "Modern Retail POS", desc: "Clean typography" },
                    { id: "pos_detailed", label: "Detailed GST POS", desc: "HSN & tax breakdown" },
                    { id: "pos_minimal", label: "Minimal Slip POS", desc: "Ultra-compact" },
                    { id: "pos_vintage", label: "Vintage Boutique POS", desc: "Boutique receipt" },
                  ].map((l) => {
                    const isSelected = selectedPosLayout === l.id;
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => {
                          setSelectedPosLayout(l.id);
                          localStorage.setItem("thermal_pos_layout", l.id);
                        }}
                        className={`w-full px-3 py-2 rounded-xl border text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? "bg-amber-600/15 border-amber-500/50 text-white font-bold ring-1 ring-amber-500/30"
                            : "bg-slate-800/40 border-slate-700/40 text-slate-300 hover:bg-slate-800/80 hover:text-white"
                        }`}
                      >
                        <div>
                          <div className="text-xs">{l.label}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{l.desc}</div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </button>
                    );
                  })}
                </div>

                {/* Paper Roll Width */}
                <div className="mt-4 pt-3 border-t border-slate-800">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Paper Roll Width
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {["2 Inch: 58mm", "3 Inch: 80mm"].map((sz) => {
                      const isSelected = pageSize === sz;
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setPageSize(sz)}
                          className={`p-2 rounded-lg border text-center text-xs font-semibold transition-all ${
                            isSelected
                              ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                              : "bg-slate-800/40 border-slate-700/40 text-slate-400 hover:bg-slate-800"
                          }`}
                        >
                          {sz}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 3. Theme Color Swatches */}
            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Theme Accent Color
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: selectedColor }} />
                  <span className="font-mono text-[10px] text-slate-400 uppercase">{selectedColor}</span>
                </div>
              </div>

              <div className="grid grid-cols-6 gap-2 bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50">
                {PALETTE_COLORS.map((c) => {
                  const isSelected = (selectedColor || "").toLowerCase() === c.toLowerCase();
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setSelectedColor(c);
                        localStorage.setItem("invoice_default_color", c);
                      }}
                      title={c}
                      className={`w-6 h-6 rounded-full mx-auto transition-transform flex items-center justify-center cursor-pointer ${
                        isSelected ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-900" : "hover:scale-105"
                      }`}
                      style={{ background: c }}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white drop-shadow" strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Studio Footer */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/90 text-center text-[11px] text-slate-500">
            Changes auto-saved as your default bill theme
          </div>
        </aside>

        {/* ── 2.B CENTER STAGE: ZOOMABLE INVOICE PAPER CANVAS ── */}
        <main className="flex-1 bg-slate-950/80 overflow-y-auto relative flex flex-col items-center justify-start p-4 sm:p-6 lg:p-8 custom-scrollbar">
          {/* Zoom Wrapper */}
          <div
            className="transition-transform duration-200 ease-out origin-top flex flex-col items-center"
            style={{ transform: `scale(${zoom})` }}
          >
            {/* The Precision Paper Container */}
            <div
              id="invoice-print-area"
              className={`bg-white text-slate-900 shadow-2xl rounded-sm ring-1 ring-slate-900/10 relative ${
                isPOS
                  ? pageSize && pageSize.includes("58mm")
                    ? "w-[270px] p-3"
                    : "w-[310px] p-4"
                  : "w-[794px] min-h-[1050px] p-8"
              }`}
            >
              {/* Dynamic Active Theme Component */}
              {isPOS ? (
                <ThemePOS
                  invoice={invoice}
                  company={company}
                  color={selectedColor}
                  logoUrl={logoUrl}
                  layout={selectedPosLayout}
                  printSettings={printSettings}
                />
              ) : (
                (() => {
                  const Component = DESIGN_COMPONENTS[selectedTheme] || DESIGN_COMPONENTS.tally || ThemeTally;
                  return (
                    <Component
                      invoice={invoice}
                      company={company}
                      color={selectedColor}
                      logoUrl={logoUrl}
                      printSettings={printSettings}
                    />
                  );
                })()
              )}
            </div>
          </div>

          {/* Floating Canvas Quick Actions Bar */}
          <div className="no-print sticky bottom-4 mt-6 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-800/90 rounded-2xl px-3 py-2 shadow-2xl flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print (Ctrl+P)</span>
            </button>

            <button
              onClick={downloadPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/60 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>

            <button
              onClick={shareWhatsApp}
              disabled={waSending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all"
            >
              {waSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />}
              <span>WhatsApp</span>
            </button>

            <div className="h-4 w-px bg-slate-800" />

            <button
              onClick={copyInvoiceLink}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Copy Invoice Link"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              onClick={handleResetZoom}
              className="px-2 py-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white font-mono text-xs transition-colors"
              title="Reset Zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
          </div>
        </main>

        {/* ── 2.C RIGHT PANEL: INVOICE INTEL & SHARE HUB ── */}
        <aside
          className={`no-print absolute lg:relative z-20 inset-y-0 right-0 w-80 bg-slate-900 border-l border-slate-800 flex flex-col transition-all duration-300 ease-in-out ${
            rightSidebarOpen ? "translate-x-0" : "translate-x-full lg:w-0 lg:overflow-hidden lg:border-l-0"
          }`}
        >
          {/* Header */}
          <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Invoice Summary</span>
            </div>
            <button
              onClick={() => setRightSidebarOpen(false)}
              className="lg:hidden p-1 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Intel Content Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs">
            {/* Grand Total & Settlement Card */}
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/80 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-1 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                <span>Grand Total</span>
                {statusBadge}
              </div>
              <div className="text-2xl font-black tracking-tight text-white font-mono">
                ₹ {totalAmountNum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>

              {balanceAmountNum > 0 && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-700/60 flex items-center justify-between text-xs">
                  <span className="text-rose-400 font-medium">Balance Due:</span>
                  <span className="font-bold text-rose-400 font-mono">
                    ₹ {balanceAmountNum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>

            {/* Bill Key Facts */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-3.5 space-y-2.5 text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Customer</span>
                </span>
                <span className="font-bold text-white max-w-[150px] truncate" title={invoice.customer_name}>
                  {invoice.customer_name || "Cash Customer"}
                </span>
              </div>

              {invoice.customer_phone && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>Phone</span>
                  </span>
                  <span className="font-mono text-slate-200">{invoice.customer_phone}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Date</span>
                </span>
                <span className="text-slate-200">
                  {invoice.created_at
                    ? new Date(invoice.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                    : new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                  <span>Payment</span>
                </span>
                <span className="font-bold text-emerald-400 uppercase tracking-wide text-[11px]">
                  {invoice.payment_type || invoice.payment_method || "Cash"}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Selected Layout:</span>
                <span className="font-semibold text-blue-400 truncate max-w-[140px]">
                  {isPOS
                    ? `POS (${(selectedPosLayout || "classic").replace("pos_", "").toUpperCase()})`
                    : `${(selectedTheme || "tally").toUpperCase()} A4`}
                </span>
              </div>
            </div>

            {/* Multi-Channel Sharing Hub */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Share Invoice
              </label>

              <div className="space-y-2">
                {/* WhatsApp PDF Button */}
                <button
                  onClick={shareWhatsApp}
                  disabled={waSending}
                  className="w-full p-2.5 rounded-xl bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:from-emerald-600/30 hover:to-teal-600/30 border border-emerald-500/30 hover:border-emerald-500/50 text-left transition-all flex items-center justify-between group shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/30">
                      {waSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs group-hover:text-emerald-300 transition-colors">
                        {waSending ? "Sending Document..." : "WhatsApp Share"}
                      </div>
                      <div className="text-[10px] text-emerald-400/90 font-mono">
                        {invoice.customer_phone ? `Send PDF to ${invoice.customer_phone}` : "Send PDF to customer"}
                      </div>
                    </div>
                  </div>
                  <Send className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* WhatsApp Transaction Message */}
                <button
                  onClick={sendTransactionMessage}
                  disabled={tmSending}
                  className="w-full p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 text-left transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                      {tmSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="font-bold text-slate-200 text-xs">WhatsApp Template</div>
                      <div className="text-[10px] text-slate-400">Pre-configured message</div>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Copy Link & Quick Channels */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={copyInvoiceLink}
                    className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 text-center transition-all flex flex-col items-center gap-1 text-slate-300 hover:text-white"
                    title="Copy public link"
                  >
                    <Share2 className="w-4 h-4 text-blue-400" />
                    <span className="text-[10px] font-semibold">Copy Link</span>
                  </button>

                  <button
                    onClick={shareEmail}
                    className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 text-center transition-all flex flex-col items-center gap-1 text-slate-300 hover:text-white"
                    title="Email Bill"
                  >
                    <Mail className="w-4 h-4 text-amber-400" />
                    <span className="text-[10px] font-semibold">Email</span>
                  </button>

                  <button
                    onClick={shareSMS}
                    className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 text-center transition-all flex flex-col items-center gap-1 text-slate-300 hover:text-white"
                    title="SMS Bill"
                  >
                    <Smartphone className="w-4 h-4 text-violet-400" />
                    <span className="text-[10px] font-semibold">SMS</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Bottom Bar */}
          <div className="p-3.5 border-t border-slate-800 bg-slate-900/90 space-y-2">
            <button
              onClick={handlePrint}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print Invoice</span>
            </button>

            <button
              onClick={downloadPDF}
              className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-750 hover:text-white border border-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF File</span>
            </button>
          </div>
        </aside>

      </div>

      {/* ── 3. FLOATING TOAST NOTIFICATIONS STACK ── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md border text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200 ${
              t.type === "success"
                ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-200"
                : t.type === "error"
                ? "bg-rose-950/90 border-rose-500/40 text-rose-200"
                : "bg-slate-900/95 border-slate-700/80 text-slate-100"
            }`}
          >
            {t.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : t.type === "error" ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
            )}
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── EXPORTS FOR BACKWARD COMPATIBILITY (USED IN SALESREPORT) ─── */
export const DESIGN_COMPONENTS = {
  original: ThemeTally,
  classic: ThemeTally,
  modern: ThemeGST1,
  bold: ThemeDoubleDivine,
  minimal: ThemeGST3,
  corporate: ThemeTally,
  stripe: ThemeGST1,
  pos: ThemePOS,
  pos_classic: ThemePOSClassic,
  pos_modern: ThemePOSModern,
  pos_detailed: ThemePOSDetailed,
  pos_minimal: ThemePOSMinimal,
  pos_vintage: ThemePOSVintage,
  tally: ThemeTally,
  gst1: ThemeGST1,
  gst3: ThemeGST3,
  double_divine: ThemeDoubleDivine,
  french_elite: ThemeTally,
  vintage_classic: ThemeTally,
  vintage_bold: ThemeTally,
};

export const DESIGNS = THEMES;
export const COLORS = PALETTE_COLORS;

