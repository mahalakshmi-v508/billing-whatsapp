import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import html2pdf from "html2pdf.js";
import {
  Download, Printer, FileText, ChevronDown, ChevronUp,
  X, Maximize2, Minimize2, Check, Share2, MessageCircle, Mail,
  Smartphone, Copy, ExternalLink, QrCode, Building2
} from "lucide-react";
import {
  generateInvoicePdfBase64,
  sendInvoiceViaWhatsAppApi,
  getInvoiceLogoUrl,
} from "../../utils/invoiceShare";

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

/* ─── NUMBER TO WORDS HELPER (INDIAN NUMBERING SYSTEM) ─────────────────────── */
function numberToWordsINR(amount) {
  if (!amount || isNaN(amount) || amount === 0) return "Zero Rupees only";
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n) => {
    let str = "";
    if (n > 99) {
      str += a[Math.floor(n / 100)] + "Hundred ";
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : " ");
    } else if (n > 0) {
      str += a[n];
    }
    return str;
  };

  let num = Math.floor(Math.abs(amount));
  let crore = Math.floor(num / 10000000);
  num %= 10000000;
  let lakh = Math.floor(num / 100000);
  num %= 100000;
  let thousand = Math.floor(num / 1000);
  num %= 1000;
  let hundred = num;

  let res = "";
  if (crore > 0) res += inWords(crore) + "Crore ";
  if (lakh > 0) res += inWords(lakh) + "Lakh ";
  if (thousand > 0) res += inWords(thousand) + "Thousand ";
  if (hundred > 0) res += inWords(hundred);

  return (res.trim() || "Zero") + " Rupees only";
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. THEME: TALLY THEME (MATCHING SCREENSHOT 1 & 2)
═══════════════════════════════════════════════════════════════════════════ */
function ThemeTally({ invoice, company, color, logoUrl }) {
  const products = Array.isArray(invoice.products) ? invoice.products : [];
  const totalQty = products.reduce((s, p) => s + (parseFloat(p.qty) || 0), 0);
  const totalGst = parseFloat(invoice.gst_total) || 0;
  const totalAmount = parseFloat(invoice.total_amount) || 0;
  const subTotal = parseFloat(invoice.sub_total) || (totalAmount - totalGst);
  const paidAmount = parseFloat(invoice.paid_amount) || 0;
  const balanceAmount = Math.max(0, totalAmount - paidAmount);
  const paymentType = (invoice.payment_type || invoice.payment_method || "Cash").toUpperCase();

  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", color: "#111827", fontSize: 12, lineHeight: 1.4 }}>
      {/* Title */}
      <h2 style={{ textAlign: "center", fontSize: 16, fontWeight: 800, margin: "0 0 10px 0", letterSpacing: 0.5, color: "#111827" }}>
        Tax Invoice
      </h2>

      {/* Top Box: Company Header */}
      <div style={{ border: "1px solid #94a3b8", display: "flex", alignItems: "center", padding: "14px 16px", gap: 16, background: "#ffffff" }}>
        <div style={{
          width: 76, height: 76, background: "#64748b", display: "flex", alignItems: "center",
          justifyContent: "center", color: "#ffffff", fontWeight: 800, fontSize: 14, borderRadius: 2
        }}>
          {logoUrl ? <img src={logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : "LOGO"}
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#1e293b" }}>{company?.company_name || "My Company"}</h1>
          {company?.company_address && <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{company.company_address}</div>}
          <div style={{ display: "flex", gap: 16, fontSize: 11.5, color: "#475569", marginTop: 4 }}>
            {company?.phone && <span>Contact: {company.phone}</span>}
            {company?.gstin && <span>GSTIN: {company.gstin}</span>}
          </div>
        </div>
      </div>

      {/* Bill To & Invoice Details Box */}
      <div style={{ border: "1px solid #94a3b8", borderTop: "none", display: "grid", gridTemplateColumns: "1fr 1fr", background: "#ffffff" }}>
        <div style={{ padding: "10px 14px", borderRight: "1px solid #94a3b8" }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: "#334155" }}>Bill To:</div>
          <div style={{ fontWeight: 800, fontSize: 13, color: "#0f172a", marginTop: 2 }}>{invoice.customer_name || "Cash Customer"}</div>
          {invoice.customer_phone && <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>Contact No: {invoice.customer_phone}</div>}
          {invoice.billing_address && <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>{invoice.billing_address}</div>}
        </div>
        <div style={{ padding: "10px 14px" }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: "#334155" }}>Invoice Details:</div>
          <div style={{ fontSize: 12, color: "#0f172a", marginTop: 2 }}><strong>Invoice No.:</strong> {invoice.invoice_no}</div>
          <div style={{ fontSize: 12, color: "#0f172a", marginTop: 2 }}><strong>Date:</strong> {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN")}</div>
          <div style={{ fontSize: 12, color: "#0f172a", marginTop: 2 }}><strong>Payment Type:</strong> <span style={{ fontWeight: 700, color: color }}>{paymentType}</span></div>
        </div>
      </div>

      {/* Products Table with Vertical Border Lines */}
      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #94a3b8", borderTop: "none", fontSize: 11.5 }}>
        <thead>
          <tr style={{ background: "#ffffff", borderBottom: "1px solid #94a3b8", height: 32 }}>
            <th style={{ width: 32, padding: "6px 4px", borderRight: "1px solid #94a3b8", textAlign: "center" }}>#</th>
            <th style={{ padding: "6px 10px", borderRight: "1px solid #94a3b8", textAlign: "left" }}>Item name</th>
            <th style={{ width: 80, padding: "6px 4px", borderRight: "1px solid #94a3b8", textAlign: "center" }}>HSN/ SAC</th>
            <th style={{ width: 68, padding: "6px 4px", borderRight: "1px solid #94a3b8", textAlign: "center" }}>Quantity</th>
            <th style={{ width: 90, padding: "6px 6px", borderRight: "1px solid #94a3b8", textAlign: "right" }}>Price/ Unit(₹)</th>
            <th style={{ width: 95, padding: "6px 6px", borderRight: "1px solid #94a3b8", textAlign: "right" }}>GST(₹)</th>
            <th style={{ width: 95, padding: "6px 10px", textAlign: "right" }}>Amount(₹)</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, idx) => {
            const qty = parseFloat(p.qty) || 1;
            const price = parseFloat(p.price) || 0;
            const gstPct = parseFloat(p.gst || p.tax_percent) || 0;
            const lineAmt = parseFloat(p.amount) || (qty * price);
            const gstAmt = parseFloat(p.tax_amount) || ((lineAmt * gstPct) / 100);

            return (
              <tr key={idx} style={{ height: 28, borderBottom: idx === products.length - 1 ? "1px solid #94a3b8" : "none" }}>
                <td style={{ textAlign: "center", borderRight: "1px solid #94a3b8", padding: "4px" }}>{idx + 1}</td>
                <td style={{ padding: "4px 10px", borderRight: "1px solid #94a3b8", fontWeight: 600 }}>{p.product_name || p.name}</td>
                <td style={{ textAlign: "center", borderRight: "1px solid #94a3b8", padding: "4px", color: "#64748b" }}>{p.product_code || p.hsn_code || "-"}</td>
                <td style={{ textAlign: "center", borderRight: "1px solid #94a3b8", padding: "4px", fontWeight: 600 }}>{qty}</td>
                <td style={{ textAlign: "right", borderRight: "1px solid #94a3b8", padding: "4px 6px" }}>₹ {price.toFixed(2)}</td>
                <td style={{ textAlign: "right", borderRight: "1px solid #94a3b8", padding: "4px 6px" }}>
                  ₹ {gstAmt.toFixed(2)} {gstPct > 0 ? `(${gstPct}%)` : ""}
                </td>
                <td style={{ textAlign: "right", padding: "4px 10px", fontWeight: 700 }}>₹ {lineAmt.toFixed(2)}</td>
              </tr>
            );
          })}

          {/* Spacer row to give professional document height */}
          <tr style={{ height: 60, borderBottom: "1px solid #94a3b8" }}>
            <td style={{ borderRight: "1px solid #94a3b8" }}></td>
            <td style={{ borderRight: "1px solid #94a3b8" }}></td>
            <td style={{ borderRight: "1px solid #94a3b8" }}></td>
            <td style={{ borderRight: "1px solid #94a3b8" }}></td>
            <td style={{ borderRight: "1px solid #94a3b8" }}></td>
            <td style={{ borderRight: "1px solid #94a3b8" }}></td>
            <td></td>
          </tr>

          {/* Table Total Row */}
          <tr style={{ background: "#ffffff", fontWeight: 700, height: 30, borderBottom: "1px solid #94a3b8" }}>
            <td colSpan={3} style={{ padding: "6px 10px", borderRight: "1px solid #94a3b8", fontWeight: 800 }}>Total</td>
            <td style={{ textAlign: "center", borderRight: "1px solid #94a3b8", padding: "6px 4px", fontWeight: 800 }}>{totalQty}</td>
            <td style={{ borderRight: "1px solid #94a3b8" }}></td>
            <td style={{ textAlign: "right", borderRight: "1px solid #94a3b8", padding: "6px 6px", fontWeight: 800 }}>₹ {totalGst.toFixed(2)}</td>
            <td style={{ textAlign: "right", padding: "6px 10px", fontWeight: 800 }}>₹ {totalAmount.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      {/* Tax Summary Table (Left) + Final Totals Breakdown (Right) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", border: "1px solid #94a3b8", borderTop: "none", background: "#ffffff" }}>
        {/* Left: Tax Summary Breakdown */}
        <div style={{ borderRight: "1px solid #94a3b8", padding: "8px 10px" }}>
          <div style={{ fontWeight: 700, fontSize: 11.5, marginBottom: 4, color: "#334155" }}>Tax Summary:</div>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #cbd5e1", fontSize: 10.5 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #cbd5e1" }}>
                <th style={{ padding: "4px", borderRight: "1px solid #cbd5e1", textAlign: "left" }}>HSN/ SAC</th>
                <th style={{ padding: "4px", borderRight: "1px solid #cbd5e1", textAlign: "right" }}>Taxable amount (₹)</th>
                <th style={{ padding: "4px", borderRight: "1px solid #cbd5e1", textAlign: "center" }}>CGST (Rate / Amt)</th>
                <th style={{ padding: "4px", borderRight: "1px solid #cbd5e1", textAlign: "center" }}>SGST (Rate / Amt)</th>
                <th style={{ padding: "4px", textAlign: "right" }}>Total Tax (₹)</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => {
                const gstPct = parseFloat(p.gst || p.tax_percent) || 0;
                const halfRate = gstPct / 2;
                const lineAmt = parseFloat(p.amount) || 0;
                const lineTax = parseFloat(p.tax_amount) || ((lineAmt * gstPct) / 100);
                const halfTax = lineTax / 2;

                return (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "3px 4px", borderRight: "1px solid #cbd5e1" }}>{p.product_code || "-"}</td>
                    <td style={{ padding: "3px 4px", borderRight: "1px solid #cbd5e1", textAlign: "right" }}>{lineAmt.toFixed(2)}</td>
                    <td style={{ padding: "3px 4px", borderRight: "1px solid #cbd5e1", textAlign: "center" }}>{halfRate}% / {halfTax.toFixed(2)}</td>
                    <td style={{ padding: "3px 4px", borderRight: "1px solid #cbd5e1", textAlign: "center" }}>{halfRate}% / {halfTax.toFixed(2)}</td>
                    <td style={{ padding: "3px 4px", textAlign: "right", fontWeight: 600 }}>{lineTax.toFixed(2)}</td>
                  </tr>
                );
              })}
              <tr style={{ background: "#f8fafc", fontWeight: 700, borderTop: "1px solid #cbd5e1" }}>
                <td style={{ padding: "4px", borderRight: "1px solid #cbd5e1" }}>TOTAL</td>
                <td style={{ padding: "4px", borderRight: "1px solid #cbd5e1", textAlign: "right" }}>{subTotal.toFixed(2)}</td>
                <td style={{ padding: "4px", borderRight: "1px solid #cbd5e1", textAlign: "center" }}>{(totalGst / 2).toFixed(2)}</td>
                <td style={{ padding: "4px", borderRight: "1px solid #cbd5e1", textAlign: "center" }}>{(totalGst / 2).toFixed(2)}</td>
                <td style={{ padding: "4px", textAlign: "right" }}>{totalGst.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Right: Sub Total, Total, Amount in Words, Received, Balance */}
        <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
            <span style={{ color: "#475569" }}>Sub Total :</span>
            <span style={{ fontWeight: 700 }}>₹ {subTotal.toFixed(2)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, borderTop: "1px solid #e2e8f0", paddingTop: 3 }}>
            <span style={{ fontWeight: 800 }}>Total :</span>
            <span style={{ fontWeight: 800 }}>₹ {totalAmount.toFixed(2)}</span>
          </div>
          <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 4, lineHeight: 1.3 }}>
            <strong>Invoice Amount in Words:</strong><br />
            {numberToWordsINR(totalAmount)}
          </div>
          <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 4, paddingTop: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
              <span style={{ color: "#475569" }}>Received :</span>
              <span>₹ {paidAmount.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, fontWeight: 700, color: balanceAmount > 0 ? "#dc2626" : "#16a34a" }}>
              <span>Balance :</span>
              <span>₹ {balanceAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Box: Bank Details (Left) + Authorized Signatory (Right) */}
      <div style={{ border: "1px solid #94a3b8", borderTop: "none", display: "grid", gridTemplateColumns: "1fr 1fr", background: "#ffffff" }}>
        {/* Left: Bank Details + QR Code */}
        <div style={{ padding: "10px 14px", borderRight: "1px solid #94a3b8", display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 62, height: 62, border: "1px solid #cbd5e1", padding: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <QrCode size={54} color="#1e293b" />
            </div>
            <div style={{ fontSize: 8.5, fontWeight: 700, color: "#059669", marginTop: 2, textTransform: "uppercase" }}>UPI Scan to Pay</div>
          </div>
          <div style={{ fontSize: 11, color: "#334155", lineHeight: 1.4 }}>
            <div style={{ fontWeight: 700 }}>Bank Details:</div>
            <div>Name : {company?.bank_name || "HDFC BANK"}</div>
            <div>Account No. : {company?.account_no || "25445415145"}</div>
            <div>IFSC code : {company?.ifsc_code || "HDFC0003542"}</div>
          </div>
        </div>

        {/* Right: Authorized Signatory */}
        <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", justifyContent: "space-between", textAlign: "right" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>For {company?.company_name || "My Company"}:</div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "#334155", marginTop: 36, textAlign: "center" }}>Authorized Signatory</div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. THEME: GST THEME 1 (MATCHING SCREENSHOT 3)
═══════════════════════════════════════════════════════════════════════════ */
function ThemeGST1({ invoice, company, color, logoUrl }) {
  const products = Array.isArray(invoice.products) ? invoice.products : [];
  const totalQty = products.reduce((s, p) => s + (parseFloat(p.qty) || 0), 0);
  const totalAmount = parseFloat(invoice.total_amount) || 0;
  const totalGst = parseFloat(invoice.gst_total) || 0;
  const subTotal = parseFloat(invoice.sub_total) || (totalAmount - totalGst);
  const paidAmount = parseFloat(invoice.paid_amount) || 0;
  const balanceAmount = Math.max(0, totalAmount - paidAmount);

  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", color: "#1e293b", fontSize: 12 }}>
      {/* Top: Company Name on Left, Logo on Right */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#0f172a" }}>{company?.company_name || "My Company"}</h1>
          {company?.company_address && <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{company.company_address}</div>}
          {company?.phone && <div style={{ fontSize: 11.5, color: "#64748b" }}>Phone: {company.phone}</div>}
        </div>
        <div style={{
          width: 72, height: 72, background: "#64748b", display: "flex", alignItems: "center",
          justifyContent: "center", color: "#ffffff", fontWeight: 800, fontSize: 13, borderRadius: 2
        }}>
          {logoUrl ? <img src={logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : "LOGO"}
        </div>
      </div>

      {/* Colored Top Divider */}
      <div style={{ height: 2, background: color, margin: "6px 0 10px 0" }} />

      {/* Centered Colored Title */}
      <h2 style={{ textAlign: "center", fontSize: 18, fontWeight: 900, color: color, margin: "0 0 14px 0" }}>
        Tax Invoice
      </h2>

      {/* Bill To & Invoice Details */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, fontSize: 12.5 }}>
        <div>
          <div style={{ fontWeight: 700, color: "#475569" }}>Bill To</div>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a", marginTop: 2 }}>{invoice.customer_name || "Cash Customer"}</div>
          {invoice.customer_phone && <div style={{ color: "#475569", marginTop: 2 }}>Contact No. : {invoice.customer_phone}</div>}
          {invoice.billing_address && <div style={{ color: "#64748b", marginTop: 2 }}>{invoice.billing_address}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700, color: "#475569" }}>Invoice Details</div>
          <div style={{ marginTop: 2 }}>Invoice No. : <strong>{invoice.invoice_no}</strong></div>
          <div style={{ marginTop: 2 }}>Date : {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN")}</div>
          <div style={{ marginTop: 2 }}>Payment : <strong style={{ color: color }}>{(invoice.payment_type || "Cash").toUpperCase()}</strong></div>
        </div>
      </div>

      {/* Table with Colored Header */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: color, color: "#ffffff", height: 34 }}>
            <th style={{ width: 34, padding: "6px 4px", textAlign: "center" }}>#</th>
            <th style={{ padding: "6px 10px", textAlign: "left" }}>Item name</th>
            <th style={{ width: 80, padding: "6px 4px", textAlign: "center" }}>HSN/ SAC</th>
            <th style={{ width: 68, padding: "6px 4px", textAlign: "center" }}>Quantity</th>
            <th style={{ width: 90, padding: "6px 6px", textAlign: "right" }}>Price/ Unit</th>
            <th style={{ width: 95, padding: "6px 6px", textAlign: "right" }}>GST</th>
            <th style={{ width: 95, padding: "6px 10px", textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, idx) => {
            const qty = parseFloat(p.qty) || 1;
            const price = parseFloat(p.price) || 0;
            const gstPct = parseFloat(p.gst || p.tax_percent) || 0;
            const lineAmt = parseFloat(p.amount) || (qty * price);
            const gstAmt = parseFloat(p.tax_amount) || ((lineAmt * gstPct) / 100);

            return (
              <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0", height: 32, background: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                <td style={{ textAlign: "center", padding: "4px" }}>{idx + 1}</td>
                <td style={{ padding: "4px 10px", fontWeight: 600 }}>{p.product_name || p.name}</td>
                <td style={{ textAlign: "center", color: "#64748b" }}>{p.product_code || "-"}</td>
                <td style={{ textAlign: "center", fontWeight: 600 }}>{qty}</td>
                <td style={{ textAlign: "right", padding: "4px 6px" }}>₹ {price.toFixed(2)}</td>
                <td style={{ textAlign: "right", padding: "4px 6px" }}>₹ {gstAmt.toFixed(2)} ({gstPct}%)</td>
                <td style={{ textAlign: "right", padding: "4px 10px", fontWeight: 700 }}>₹ {lineAmt.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Summary Row */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <div style={{ width: 260, display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Sub Total :</span><span style={{ fontWeight: 700 }}>₹ {subTotal.toFixed(2)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>GST Total :</span><span>₹ {totalGst.toFixed(2)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", background: color, color: "#fff", padding: "6px 10px", borderRadius: 4, fontWeight: 800, fontSize: 14 }}>
            <span>Total Amount :</span>
            <span>₹ {totalAmount.toFixed(2)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span>Received :</span><span>₹ {paidAmount.toFixed(2)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 700, color: balanceAmount > 0 ? "#dc2626" : "#16a34a" }}>
            <span>Balance Due :</span>
            <span>₹ {balanceAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. THEME: GST THEME 3 (MATCHING SCREENSHOT 4)
═══════════════════════════════════════════════════════════════════════════ */
function ThemeGST3({ invoice, company, color, logoUrl }) {
  const products = Array.isArray(invoice.products) ? invoice.products : [];
  const totalAmount = parseFloat(invoice.total_amount) || 0;
  const totalGst = parseFloat(invoice.gst_total) || 0;
  const subTotal = parseFloat(invoice.sub_total) || (totalAmount - totalGst);

  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", color: "#1e293b", fontSize: 12 }}>
      <h2 style={{ textAlign: "center", fontSize: 16, fontWeight: 800, margin: "0 0 10px 0" }}>Tax Invoice</h2>

      {/* Box Header */}
      <div style={{ border: "1px solid #cbd5e1", display: "flex", justifyContent: "space-between", padding: "12px 14px", background: "#ffffff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 60, height: 60, background: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 12 }}>
            {logoUrl ? <img src={logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : "LOGO"}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{company?.company_name || "My Company"}</h1>
            <div style={{ fontSize: 11.5, color: "#64748b" }}>{company?.company_address}</div>
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 12 }}>
          <div>Invoice No. : <strong>{invoice.invoice_no}</strong></div>
          <div>Date : {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN")}</div>
        </div>
      </div>

      <div style={{ border: "1px solid #cbd5e1", borderTop: "none", padding: "10px 14px", background: "#ffffff" }}>
        <div style={{ fontWeight: 700 }}>Bill To:</div>
        <div style={{ fontWeight: 800, fontSize: 13, marginTop: 2 }}>{invoice.customer_name || "Cash Customer"}</div>
        {invoice.customer_phone && <div style={{ fontSize: 11.5, color: "#64748b" }}>Contact No.: {invoice.customer_phone}</div>}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #cbd5e1", borderTop: "none" }}>
        <thead>
          <tr style={{ background: "#f8fafc", borderBottom: "1px solid #cbd5e1", height: 32, fontSize: 11.5 }}>
            <th style={{ width: 32, padding: "6px 4px", borderRight: "1px solid #cbd5e1" }}>#</th>
            <th style={{ padding: "6px 10px", borderRight: "1px solid #cbd5e1", textAlign: "left" }}>Item name</th>
            <th style={{ width: 80, padding: "6px 4px", borderRight: "1px solid #cbd5e1", textAlign: "center" }}>HSN/ SAC</th>
            <th style={{ width: 68, padding: "6px 4px", borderRight: "1px solid #cbd5e1", textAlign: "center" }}>Quantity</th>
            <th style={{ width: 90, padding: "6px 6px", borderRight: "1px solid #cbd5e1", textAlign: "right" }}>Price/ Unit</th>
            <th style={{ width: 95, padding: "6px 6px", borderRight: "1px solid #cbd5e1", textAlign: "right" }}>GST</th>
            <th style={{ width: 95, padding: "6px 10px", textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, idx) => (
            <tr key={idx} style={{ height: 28, borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ textAlign: "center", borderRight: "1px solid #cbd5e1" }}>{idx + 1}</td>
              <td style={{ padding: "4px 10px", borderRight: "1px solid #cbd5e1", fontWeight: 600 }}>{p.product_name || p.name}</td>
              <td style={{ textAlign: "center", borderRight: "1px solid #cbd5e1", color: "#64748b" }}>{p.product_code || "-"}</td>
              <td style={{ textAlign: "center", borderRight: "1px solid #cbd5e1", fontWeight: 600 }}>{p.qty}</td>
              <td style={{ textAlign: "right", borderRight: "1px solid #cbd5e1", padding: "4px 6px" }}>₹ {parseFloat(p.price || 0).toFixed(2)}</td>
              <td style={{ textAlign: "right", borderRight: "1px solid #cbd5e1", padding: "4px 6px" }}>₹ {parseFloat(p.tax_amount || 0).toFixed(2)}</td>
              <td style={{ textAlign: "right", padding: "4px 10px", fontWeight: 700 }}>₹ {parseFloat(p.amount || 0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
        <div style={{ width: 240, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Sub Total:</span><span>₹ {subTotal.toFixed(2)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Total Tax:</span><span>₹ {totalGst.toFixed(2)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #cbd5e1", paddingTop: 4, fontWeight: 800, fontSize: 13.5 }}>
            <span>Grand Total:</span>
            <span style={{ color: color }}>₹ {totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. THEME: DOUBLE DIVINE (MATCHING SCREENSHOT 5)
═══════════════════════════════════════════════════════════════════════════ */
function ThemeDoubleDivine({ invoice, company, color, logoUrl }) {
  const products = Array.isArray(invoice.products) ? invoice.products : [];
  const totalAmount = parseFloat(invoice.total_amount) || 0;
  const totalGst = parseFloat(invoice.gst_total) || 0;
  const subTotal = parseFloat(invoice.sub_total) || (totalAmount - totalGst);

  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", color: "#1e293b", fontSize: 12 }}>
      {/* Curved Dark Header with Accent Red/Color Pill */}
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
          <div style={{ width: 50, height: 50, background: "#475569", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 11 }}>
            {logoUrl ? <img src={logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : "LOGO"}
          </div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>{company?.company_name || "My Company"}</h1>
        </div>

        <div style={{ zIndex: 2, textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.5 }}>Tax Invoice</div>
        </div>
      </div>

      {/* Bill To & Invoice Info */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", border: "1px solid #e2e8f0", borderTop: "none", background: "#ffffff" }}>
        <div>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>Bill To:</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>{invoice.customer_name || "Cash Customer"}</div>
          {invoice.customer_phone && <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>Contact No: {invoice.customer_phone}</div>}
        </div>
        <div style={{ textAlign: "right", fontSize: 12 }}>
          <div>Invoice No.: <strong>{invoice.invoice_no}</strong></div>
          <div>Date: {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN")}</div>
        </div>
      </div>

      {/* Table with Colored Header matching screenshot */}
      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #e2e8f0", borderTop: "none" }}>
        <thead>
          <tr style={{ background: color, color: "#ffffff", height: 32, fontSize: 11.5 }}>
            <th style={{ width: 32, padding: "6px 4px", textAlign: "center" }}>#</th>
            <th style={{ padding: "6px 10px", textAlign: "left" }}>Item name</th>
            <th style={{ width: 80, padding: "6px 4px", textAlign: "center" }}>HSN/ SAC</th>
            <th style={{ width: 68, padding: "6px 4px", textAlign: "center" }}>Quantity</th>
            <th style={{ width: 90, padding: "6px 6px", textAlign: "right" }}>Price/ Unit</th>
            <th style={{ width: 95, padding: "6px 6px", textAlign: "right" }}>GST</th>
            <th style={{ width: 95, padding: "6px 10px", textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, idx) => (
            <tr key={idx} style={{ height: 28, borderBottom: "1px solid #e2e8f0" }}>
              <td style={{ textAlign: "center", borderRight: "1px solid #e2e8f0" }}>{idx + 1}</td>
              <td style={{ padding: "4px 10px", borderRight: "1px solid #e2e8f0", fontWeight: 600 }}>{p.product_name || p.name}</td>
              <td style={{ textAlign: "center", borderRight: "1px solid #e2e8f0", color: "#64748b" }}>{p.product_code || "-"}</td>
              <td style={{ textAlign: "center", borderRight: "1px solid #e2e8f0", fontWeight: 600 }}>{p.qty}</td>
              <td style={{ textAlign: "right", borderRight: "1px solid #e2e8f0", padding: "4px 6px" }}>₹ {parseFloat(p.price || 0).toFixed(2)}</td>
              <td style={{ textAlign: "right", borderRight: "1px solid #e2e8f0", padding: "4px 6px" }}>₹ {parseFloat(p.tax_amount || 0).toFixed(2)}</td>
              <td style={{ textAlign: "right", padding: "4px 10px", fontWeight: 700 }}>₹ {parseFloat(p.amount || 0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
        <div style={{ width: 240, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Sub Total:</span><span>₹ {subTotal.toFixed(2)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>GST:</span><span>₹ {totalGst.toFixed(2)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 14, color: color, borderTop: `2px solid ${color}`, paddingTop: 4 }}>
            <span>Grand Total:</span>
            <span>₹ {totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. THEME: POS RECEIPT (THERMAL 80MM) (MATCHING media_1787728708633.jpg)
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

function ThemePOS({ invoice, company, color, logoUrl }) {
  const products = Array.isArray(invoice.products) ? invoice.products : [];
  const totalAmount = parseFloat(invoice.total_amount) || 0;
  const totalGst = parseFloat(invoice.gst_total) || 0;
  const subTotal = parseFloat(invoice.sub_total) || (totalAmount - totalGst);
  const paidAmount = parseFloat(invoice.paid_amount) || 0;
  const balanceAmount = parseFloat(invoice.balance_amount) ?? Math.max(0, totalAmount - paidAmount);
  const previousBalance = parseFloat(invoice.previous_balance) || 0;
  const currentBalance = parseFloat(invoice.current_balance) || (previousBalance + balanceAmount);
  const paymentMethod = (invoice.payment_method || invoice.payment_type || "CASH").toUpperCase();

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
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" style={{ width: 40, height: 40, objectFit: "contain", margin: "0 auto" }} />
        ) : (
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #ec4899, #eab308)", margin: "0 auto" }} />
        )}
      </div>

      {/* Company Info */}
      <div style={{ textAlign: "center", marginBottom: 4 }}>
        <div style={{ fontSize: 13.5, fontWeight: "bold", letterSpacing: 0.2 }}>
          {company?.company_name || "Apex Digital Solutions"}
        </div>
        <div style={{ fontSize: 10.5, margin: "2px 0", lineHeight: 1.25 }}>
          {company?.company_address || "12/4, 2nd Cross Street, Tech Park Phase 1, Electronic City, Bengaluru, Karnataka"}
        </div>
        <div style={{ fontSize: 11 }}>
          Ph: {company?.phone || "9876543210"}
        </div>
        <div style={{ fontSize: 11 }}>
          GSTIN: {company?.gstin || "-"}
        </div>
      </div>

      <div style={S.divider} />

      {/* Bill & Customer Details */}
      <div style={{ fontSize: 11 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
          <span>Bill {invoice.invoice_no || "INV-1787654896"}</span>
          <span>{formatPOSDateTime(invoice.created_at)}</span>
        </div>
        <div style={{ marginBottom: 2 }}>
          Customer: {invoice.customer_name || "Customer"}
        </div>
        <div>
          Phone: {invoice.customer_phone || "-"}
        </div>
      </div>

      <div style={S.divider} />

      {/* Item Table (Table layout is 100% compatible with html2canvas and print) */}
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 11 }}>
        <thead>
          <tr style={{ borderBottom: "1px dashed #000000" }}>
            <th style={{ textAlign: "left", width: "42%", paddingBottom: 3, fontWeight: "bold" }}>Item</th>
            <th style={{ textAlign: "right", width: "20%", paddingBottom: 3, fontWeight: "bold" }}>Rate</th>
            <th style={{ textAlign: "center", width: "15%", paddingBottom: 3, fontWeight: "bold" }}>Qty</th>
            <th style={{ textAlign: "right", width: "23%", paddingBottom: 3, fontWeight: "bold" }}>Amt</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => {
            const qty = parseFloat(p.qty) || 1;
            const price = parseFloat(p.price) || 0;
            const amt = parseFloat(p.amount) || (qty * price);
            const gstPct = parseFloat(p.gst || p.tax_percent) || 0;
            const gstAmt = parseFloat(p.tax_amount) || ((amt * gstPct) / 100);

            return (
              <tr key={i} style={{ verticalAlign: "top" }}>
                <td style={{ textAlign: "left", padding: "3px 2px 3px 0", wordBreak: "break-word" }}>
                  <div>{p.product_name || p.name}</div>
                  {p.product_code && (
                    <div style={{ fontSize: 9.5, color: "#222", marginTop: 1 }}>{p.product_code}</div>
                  )}
                  {gstPct > 0 && (
                    <div style={{ fontSize: 9.5, color: "#222", marginTop: 1 }}>
                      GST @{gstPct}% : ₹{gstAmt.toFixed(2)}
                    </div>
                  )}
                </td>
                <td style={{ textAlign: "right", padding: "3px 2px" }}>{price.toFixed(0)}</td>
                <td style={{ textAlign: "center", padding: "3px 2px" }}>{qty}</td>
                <td style={{ textAlign: "right", padding: "3px 0" }}>{amt.toFixed(0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={S.divider} />

      {/* Summary Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 11 }}>
        <tbody>
          <tr>
            <td style={{ textAlign: "left", width: "55%", padding: "2px 0" }}>Total Items</td>
            <td style={{ textAlign: "right", width: "45%", padding: "2px 0" }}>{products.length}</td>
          </tr>
          <tr>
            <td style={{ textAlign: "left", padding: "2px 0" }}>Subtotal</td>
            <td style={{ textAlign: "right", padding: "2px 0" }}>₹{subTotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td style={{ textAlign: "left", padding: "2px 0" }}>Tax</td>
            <td style={{ textAlign: "right", padding: "2px 0" }}>₹{totalGst.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div style={S.divider} />

      {/* Total Amount (Prominent Bold) */}
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 13.5, fontWeight: "bold" }}>
        <tbody>
          <tr>
            <td style={{ textAlign: "left", width: "55%", padding: "2px 0" }}>Total Amount</td>
            <td style={{ textAlign: "right", width: "45%", padding: "2px 0" }}>₹{totalAmount.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div style={S.divider} />

      {/* Payment & Balance Breakdown */}
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 11 }}>
        <tbody>
          <tr>
            <td style={{ textAlign: "left", width: "55%", padding: "2px 0" }}>Payment Method</td>
            <td style={{ textAlign: "right", width: "45%", padding: "2px 0", fontWeight: "bold" }}>{paymentMethod}</td>
          </tr>
          <tr>
            <td style={{ textAlign: "left", padding: "2px 0" }}>Total</td>
            <td style={{ textAlign: "right", padding: "2px 0" }}>₹{totalAmount.toFixed(2)}</td>
          </tr>
          <tr>
            <td style={{ textAlign: "left", padding: "2px 0" }}>Paid</td>
            <td style={{ textAlign: "right", padding: "2px 0" }}>₹{paidAmount.toFixed(2)}</td>
          </tr>
          <tr>
            <td style={{ textAlign: "left", padding: "2px 0" }}>Balance</td>
            <td style={{ textAlign: "right", padding: "2px 0" }}>₹{balanceAmount.toFixed(2)}</td>
          </tr>
          <tr>
            <td style={{ textAlign: "left", padding: "2px 0" }}>Previous Balance</td>
            <td style={{ textAlign: "right", padding: "2px 0" }}>₹{previousBalance.toFixed(2)}</td>
          </tr>
          <tr>
            <td style={{ textAlign: "left", padding: "2px 0" }}>Current Balance</td>
            <td style={{ textAlign: "right", padding: "2px 0" }}>₹{currentBalance.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div style={S.divider} />

      {/* Footer Note */}
      <div style={{ textAlign: "center", fontSize: 9, letterSpacing: 0.2, marginTop: 4, paddingBottom: 2 }}>
        PLEASE NOTE - EXCHANGES ALLOWED ONLY WITHIN 3 DAYS
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN INVOICE PREVIEW COMPONENT (MATCHING ALL SCREENSHOTS)
═══════════════════════════════════════════════════════════════════════════ */
export default function InvoicePreview() {
  const { invoiceNo } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [company, setCompany] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState("tally");
  const [selectedColor, setSelectedColor] = useState("#6366f1");
  const [classicOpen, setClassicOpen] = useState(true);
  const [vintageOpen, setVintageOpen] = useState(false);
  const [doNotShowAgain, setDoNotShowAgain] = useState(false);
  const [waSending, setWaSending] = useState(false);
  const [copyToast, setCopyToast] = useState(false);

  /* Insert Print CSS */
  useEffect(() => {
    const s = document.createElement("style");
    s.innerHTML = PRINT_CSS;
    document.head.appendChild(s);
    return () => document.head.removeChild(s);
  }, []);

  /* Load Invoice Data */
  useEffect(() => {
    if (!invoiceNo) return;
    api.get(`/invoice/get_invoice_by_id?id=${invoiceNo}`).then(res => {
      if (res.data.status) {
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
      }
    }).catch(err => console.error(err));
  }, [invoiceNo]);

  if (!invoice) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8fafc", color: "#64748b", fontSize: 14 }}>
        Loading invoice preview...
      </div>
    );
  }

  const logoUrl = getInvoiceLogoUrl(company?.logo);
  const isPOS = selectedTheme === "pos";

  /* PDF Download */
  const downloadPDF = () => {
    const element = document.getElementById("invoice-print-area");
    if (!element) return;

    if (isPOS) {
      const elementHeight = element.scrollHeight || element.offsetHeight || 550;
      const heightInMm = Math.max(140, Math.ceil((elementHeight * 25.4) / 96) + 8);

      const opt = {
        margin: [2, 2, 2, 2],
        filename: `invoice-${invoice.invoice_no}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
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
          orientation: "portrait"
        },
      };
      html2pdf().set(opt).from(element).save();
    } else {
      const opt = {
        margin: [8, 8, 8, 8],
        filename: `invoice-${invoice.invoice_no}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };
      html2pdf().set(opt).from(element).save();
    }
  };

  /* Print */
  const handlePrint = () => {
    window.print();
  };

  /* WhatsApp Share */
  const shareWhatsApp = () => {
    const element = document.getElementById("invoice-print-area");
    if (!element || waSending) return;

    setWaSending(true);
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
        alert(res.data.message || "Invoice sent via WhatsApp!");
      })
      .catch((err) => {
        alert(err.response?.data?.message || "Failed to send invoice via WhatsApp.");
      })
      .finally(() => setWaSending(false));
  };

  /* Gmail / Mail Share */
  const shareEmail = () => {
    const subject = encodeURIComponent(`Invoice #${invoice.invoice_no} from ${company?.company_name || 'My Company'}`);
    const body = encodeURIComponent(`Dear ${invoice.customer_name || 'Customer'},\n\nPlease find your invoice #${invoice.invoice_no} details:\nTotal Amount: ₹${invoice.total_amount}\nPayment Type: ${invoice.payment_type || 'Cash'}\n\nThank you for your business!`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  /* SMS / Message Share */
  const shareSMS = () => {
    const body = encodeURIComponent(`Invoice #${invoice.invoice_no} Total: ₹${invoice.total_amount}. Thank you!`);
    window.open(`sms:${invoice.customer_phone || ''}?body=${body}`, '_blank');
  };

  /* Copy Link */
  const copyInvoiceLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2000);
  };

  /* Save & Close Navigation */
  const handleSaveAndClose = () => {
    if (doNotShowAgain) {
      localStorage.setItem("skip_invoice_preview", "true");
    }
    navigate("/sales/invoices");
  };

  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      minHeight: "100vh",
      width: "100vw",
      background: "#f1f5f9",
      display: "flex",
      flexDirection: "column",
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      overflow: "hidden"
    }}>

      {/* ── 1. TOP BAR (MATCHING SCREENSHOT 1: Preview | Do not show again | Save & Close) ── */}
      <header className="no-print" style={{
        background: "#ffffff",
        borderBottom: "1px solid #e2e8f0",
        padding: "10px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 48,
        boxSizing: "border-box"
      }}>
        <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1e293b" }}>Preview</h1>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12.5, color: "#475569" }}>
            <input
              type="checkbox"
              checked={doNotShowAgain}
              onChange={e => setDoNotShowAgain(e.target.checked)}
              style={{ width: 14, height: 14, cursor: "pointer", accentColor: "#1f8cff" }}
            />
            <span>Do not show invoice preview again</span>
          </label>

          <button
            onClick={handleSaveAndClose}
            style={{
              border: "none",
              background: "transparent",
              color: "#1f8cff",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              padding: "4px 8px"
            }}
          >
            Save &amp; Close
          </button>
        </div>
      </header>

      {/* ── 2. THREE-COLUMN BODY LAYOUT ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── LEFT SIDEBAR: THEME SELECTOR & COLOR PALETTE ── */}
        <aside className="no-print" style={{
          width: 230,
          background: "#ffffff",
          borderRight: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
          padding: "16px 14px",
          overflowY: "auto",
          boxSizing: "border-box",
          flexShrink: 0
        }}>
          <h2 style={{ fontSize: 13, fontWeight: 800, color: "#334155", margin: "0 0 12px 0" }}>Select Theme</h2>

          {/* Classic Themes Accordion */}
          <div style={{ marginBottom: 12 }}>
            <div
              onClick={() => setClassicOpen(!classicOpen)}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                fontSize: 12.5, fontWeight: 700, color: "#475569", cursor: "pointer",
                padding: "6px 4px"
              }}
            >
              <span>Classic Themes</span>
              {classicOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </div>

            {classicOpen && (
              <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
                {THEMES.filter(t => t.category === "classic").map(t => {
                  const isSelected = selectedTheme === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTheme(t.id)}
                      style={{
                        padding: "8px 12px",
                        textAlign: "left",
                        borderRadius: 4,
                        border: isSelected ? "1px solid #bfdbfe" : "1px solid transparent",
                        background: isSelected ? "#e0f2fe" : "transparent",
                        color: isSelected ? "#0369a1" : "#475569",
                        fontWeight: isSelected ? 700 : 500,
                        fontSize: 12.5,
                        cursor: "pointer",
                        transition: "all .12s"
                      }}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Vintage Themes Accordion */}
          <div style={{ marginBottom: 16 }}>
            <div
              onClick={() => setVintageOpen(!vintageOpen)}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                fontSize: 12.5, fontWeight: 700, color: "#475569", cursor: "pointer",
                padding: "6px 4px"
              }}
            >
              <span>Vintage Themes</span>
              {vintageOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </div>

            {vintageOpen && (
              <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
                {THEMES.filter(t => t.category === "vintage").map(t => {
                  const isSelected = selectedTheme === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTheme(t.id)}
                      style={{
                        padding: "8px 12px",
                        textAlign: "left",
                        borderRadius: 4,
                        border: isSelected ? "1px solid #bfdbfe" : "1px solid transparent",
                        background: isSelected ? "#e0f2fe" : "transparent",
                        color: isSelected ? "#0369a1" : "#475569",
                        fontWeight: isSelected ? 700 : 500,
                        fontSize: 12.5,
                        cursor: "pointer",
                        transition: "all .12s"
                      }}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Color Palette (Matching Screenshot 3) */}
          <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>Select Color</div>
            
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: 3, background: selectedColor }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>Selected</span>
            </div>

            {/* 18 Color Swatches */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
              {PALETTE_COLORS.map(c => (
                <div
                  key={c}
                  onClick={() => setSelectedColor(c)}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 3,
                    background: c,
                    cursor: "pointer",
                    border: selectedColor === c ? "2px solid #0f172a" : "1px solid rgba(0,0,0,0.1)",
                    transform: selectedColor === c ? "scale(1.15)" : "scale(1)",
                    transition: "transform .1s"
                  }}
                />
              ))}
            </div>
          </div>

          {/* Tip Card (Matching Screenshot) */}
          <div style={{
            marginTop: "auto",
            padding: "10px 12px",
            background: "#fffbeb",
            border: "1px solid #fef3c7",
            borderRadius: 6,
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
            fontSize: 11.5,
            color: "#92400e",
            lineHeight: 1.35
          }}>
            <span>💡</span>
            <span>Use this theme for a clean and professional look</span>
          </div>
        </aside>

        {/* ── CENTER AREA: INVOICE PAPER CANVAS ── */}
        <main style={{
          flex: 1,
          background: "#eef2f6",
          overflowY: "auto",
          padding: "24px 20px 40px 20px",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          position: "relative"
        }}>
          <div
            id="invoice-print-area"
            style={{
              background: "#ffffff",
              width: isPOS ? 280 : 794,
              minHeight: isPOS ? "auto" : 1050,
              padding: isPOS ? "12px 6px" : "28px 32px",
              boxShadow: "0 6px 24px rgba(15, 23, 42, 0.09)",
              borderRadius: 2,
              boxSizing: "border-box",
              position: "relative",
              margin: "0 auto"
            }}
          >
            {/* Top Right Zoom / Expand Icon (Matching Screenshot) */}
            <div className="no-print" style={{ position: "absolute", top: 12, right: 12, color: "#94a3b8", cursor: "pointer" }}>
              <Maximize2 size={15} />
            </div>

            {/* Dynamic Active Theme Component */}
            {selectedTheme === "tally" && (
              <ThemeTally invoice={invoice} company={company} color={selectedColor} logoUrl={logoUrl} />
            )}
            {selectedTheme === "gst1" && (
              <ThemeGST1 invoice={invoice} company={company} color={selectedColor} logoUrl={logoUrl} />
            )}
            {selectedTheme === "gst3" && (
              <ThemeGST3 invoice={invoice} company={company} color={selectedColor} logoUrl={logoUrl} />
            )}
            {selectedTheme === "double_divine" && (
              <ThemeDoubleDivine invoice={invoice} company={company} color={selectedColor} logoUrl={logoUrl} />
            )}
            {(selectedTheme === "french_elite" || selectedTheme === "vintage_classic" || selectedTheme === "vintage_bold") && (
              <ThemeTally invoice={invoice} company={company} color={selectedColor} logoUrl={logoUrl} />
            )}
            {selectedTheme === "pos" && (
              <ThemePOS invoice={invoice} company={company} color={selectedColor} logoUrl={logoUrl} />
            )}
          </div>
        </main>

        {/* ── RIGHT SIDEBAR: PROMO BANNER, SHARE & PRINT ACTIONS ── */}
        <aside className="no-print" style={{
          width: 250,
          background: "#ffffff",
          borderLeft: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
          padding: "16px 16px",
          overflowY: "auto",
          boxSizing: "border-box",
          flexShrink: 0,
          justifyContent: "space-between"
        }}>
          {/* Top: Promo Card (Matching Screenshot 1-5) */}
          <div>
            <div style={{
              background: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
              borderRadius: 8,
              padding: "14px 12px",
              textAlign: "center",
              marginBottom: 20,
              border: "1px solid #7dd3fc"
            }}>
              <div style={{ display: "flex", justifyContent: "center", gap: 6, fontSize: 10, fontWeight: 700, color: "#0369a1", marginBottom: 6 }}>
                <span>✦ BHIM UPI</span>
                <span>✦ Cards</span>
                <span>✦ Netbanking</span>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: "#0c4a6e", lineHeight: 1.3, marginBottom: 10 }}>
                Accept Online Payments &amp; Reconcile with Vyapar
              </div>
              <button style={{
                background: "#1f8cff",
                color: "#ffffff",
                border: "none",
                borderRadius: 20,
                padding: "6px 16px",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(31, 140, 255, 0.3)"
              }}>
                Start Now
              </button>
            </div>

            {/* Share Invoice Section (Matching Screenshot) */}
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 12 }}>Share Invoice</div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {/* WhatsApp */}
                <button
                  onClick={shareWhatsApp}
                  disabled={waSending}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    gap: 6, padding: "10px 8px", background: "#f8fafc", border: "1px solid #e2e8f0",
                    borderRadius: 8, cursor: "pointer", color: "#334155"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
                  onMouseLeave={e => e.currentTarget.style.background = "#f8fafc"}
                >
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#22c55e", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <MessageCircle size={16} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{waSending ? "Sending..." : "Whatsapp"}</span>
                </button>

                {/* Gmail */}
                <button
                  onClick={shareEmail}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    gap: 6, padding: "10px 8px", background: "#f8fafc", border: "1px solid #e2e8f0",
                    borderRadius: 8, cursor: "pointer", color: "#334155"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
                  onMouseLeave={e => e.currentTarget.style.background = "#f8fafc"}
                >
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#ef4444", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Mail size={16} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>Gmail</span>
                </button>

                {/* Message (SMS) */}
                <button
                  onClick={shareSMS}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    gap: 6, padding: "10px 8px", background: "#f8fafc", border: "1px solid #e2e8f0",
                    borderRadius: 8, cursor: "pointer", color: "#334155"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
                  onMouseLeave={e => e.currentTarget.style.background = "#f8fafc"}
                >
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#10b981", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Smartphone size={16} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>Message</span>
                </button>

                {/* Copy Link */}
                <button
                  onClick={copyInvoiceLink}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    gap: 6, padding: "10px 8px", background: "#f8fafc", border: "1px solid #e2e8f0",
                    borderRadius: 8, cursor: "pointer", color: "#334155"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
                  onMouseLeave={e => e.currentTarget.style.background = "#f8fafc"}
                >
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#e11d48", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Share2 size={15} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{copyToast ? "Copied!" : "Share Link"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Action Buttons (Download, Secondary Print, Primary Print) */}
          <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
            {/* Download */}
            <button
              onClick={downloadPDF}
              title="Download PDF"
              style={{
                flex: 1,
                height: 42,
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#1e293b",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
              }}
            >
              <Download size={18} color="#1f8cff" />
            </button>

            {/* Print Outline */}
            <button
              onClick={handlePrint}
              title="Print Document"
              style={{
                flex: 1,
                height: 42,
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#1e293b",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
              }}
            >
              <FileText size={18} color="#1f8cff" />
            </button>

            {/* Print Filled Primary */}
            <button
              onClick={handlePrint}
              title="Print Invoice"
              style={{
                flex: 1,
                height: 42,
                borderRadius: 6,
                border: "none",
                background: "#1f8cff",
                color: "#ffffff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 6px rgba(31, 140, 255, 0.35)"
              }}
            >
              <Printer size={18} />
            </button>
          </div>
        </aside>

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
  tally: ThemeTally,
  gst1: ThemeGST1,
  gst3: ThemeGST3,
  double_divine: ThemeDoubleDivine,
  french_elite: ThemeTally,
};

export const DESIGNS = THEMES;
export const COLORS = PALETTE_COLORS;

