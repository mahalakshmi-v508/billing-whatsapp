
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

/* ─── INVOICE TYPE HELPER ─────────────────────────────────────────────────── */
function getInvoiceType(invoice) {
  if (invoice?.invoice_type) return invoice.invoice_type;
  if (invoice?.gst_type === "without_gst") return "Bill of Supply";
  return "Tax Invoice";
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
  const invoiceType = getInvoiceType(invoice);

  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", color: "#111827", fontSize: 12, lineHeight: 1.4 }}>
      {/* Title */}
      <h2 style={{ textAlign: "center", fontSize: 16, fontWeight: 800, margin: "0 0 10px 0", letterSpacing: 0.5, color: "#111827" }}>
        {invoiceType}
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
          <div style={{ fontSize: 12, color: "#0f172a", marginTop: 2 }}><strong>Invoice Type:</strong> <span style={{ fontWeight: 700, color: "#1e293b" }}>{invoiceType}</span></div>
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
  const invoiceType = getInvoiceType(invoice);

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
        {invoiceType}
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
          <div style={{ marginTop: 2 }}>Invoice Type : <strong>{invoiceType}</strong></div>
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
  const invoiceType = getInvoiceType(invoice);

  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", color: "#1e293b", fontSize: 12 }}>
      <h2 style={{ textAlign: "center", fontSize: 16, fontWeight: 800, margin: "0 0 10px 0" }}>{invoiceType}</h2>

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
          <div>Payment : <strong style={{ color: color }}>{(invoice.payment_type || "Cash").toUpperCase()}</strong></div>
          <div>Invoice Type : <strong>{invoiceType}</strong></div>
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
  const invoiceType = getInvoiceType(invoice);

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
          <div style={{ fontSize: 18, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.5 }}>{invoiceType}</div>
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
          <div>Payment: <strong style={{ color: color }}>{(invoice.payment_type || "Cash").toUpperCase()}</strong></div>
          <div>Invoice Type: <strong>{invoiceType}</strong></div>
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

/* ─── 5.1 POS LAYOUT: CLASSIC MONOSPACE (STANDARD THERMAL) ─── */
export function ThemePOSClassic({ invoice, company, color, logoUrl }) {
  const products = Array.isArray(invoice.products) ? invoice.products : [];
  const totalAmount = parseFloat(invoice.total_amount) || 0;
  const totalGst = parseFloat(invoice.gst_total) || 0;
  const subTotal = parseFloat(invoice.sub_total) || (totalAmount - totalGst);
  const paidAmount = parseFloat(invoice.paid_amount) || 0;
  const balanceAmount = parseFloat(invoice.balance_amount) ?? Math.max(0, totalAmount - paidAmount);
  const previousBalance = parseFloat(invoice.previous_balance) || 0;
  const currentBalance = parseFloat(invoice.current_balance) || (previousBalance + balanceAmount);
  const paymentMethod = (invoice.payment_method || invoice.payment_type || "CASH").toUpperCase();
  const invoiceType = getInvoiceType(invoice);

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
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
          <span>Phone: {invoice.customer_phone || "-"}</span>
          <span style={{ fontWeight: "bold" }}>{invoiceType}</span>
        </div>
      </div>

      <div style={S.divider} />

      {/* Item Table */}
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

      {/* Total Amount */}
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

/* ─── 5.2 POS LAYOUT: MODERN RETAIL (CLEAN SANS-SERIF & HIGH CONTRAST) ─── */
export function ThemePOSModern({ invoice, company, color, logoUrl }) {
  const products = Array.isArray(invoice.products) ? invoice.products : [];
  const totalAmount = parseFloat(invoice.total_amount) || 0;
  const totalGst = parseFloat(invoice.gst_total) || 0;
  const subTotal = parseFloat(invoice.sub_total) || (totalAmount - totalGst);
  const paidAmount = parseFloat(invoice.paid_amount) || 0;
  const balanceAmount = parseFloat(invoice.balance_amount) ?? Math.max(0, totalAmount - paidAmount);
  const paymentMethod = (invoice.payment_method || invoice.payment_type || "CASH").toUpperCase();
  const invoiceType = getInvoiceType(invoice);

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
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" style={{ width: 38, height: 38, objectFit: "contain", margin: "0 auto 4px auto" }} />
        ) : (
          <div style={{ display: "inline-block", background: "#0f172a", color: "#ffffff", fontWeight: 800, fontSize: 10, padding: "2px 8px", borderRadius: 4, marginBottom: 4, letterSpacing: 0.5 }}>
            RETAIL RECEIPT
          </div>
        )}
        <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", letterSpacing: -0.2 }}>
          {company?.company_name || "Apex Digital Solutions"}
        </div>
        <div style={{ fontSize: 10, color: "#475569", margin: "2px 0", lineHeight: 1.3 }}>
          {company?.company_address || "12/4, 2nd Cross Street, Tech Park Phase 1, Bengaluru"}
        </div>
        <div style={{ fontSize: 10.5, color: "#334155", fontWeight: 500 }}>
          Ph: {company?.phone || "9876543210"} {company?.gstin ? `• GST: ${company.gstin}` : ""}
        </div>
      </div>

      <div style={{ borderBottom: "1.5px solid #0f172a", margin: "6px 0" }} />

      {/* Bill Meta Pill Card */}
      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "5px 7px", fontSize: 10.5, marginBottom: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>
          <span>#{invoice.invoice_no || "INV-001"}</span>
          <span>{formatPOSDateTime(invoice.created_at)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
          <span>Customer: <strong style={{ color: "#0f172a" }}>{invoice.customer_name || "Walk-in Guest"}</strong></span>
          <span style={{ fontWeight: 600, color: "#2563eb" }}>{invoiceType}</span>
        </div>
        {invoice.customer_phone && (
          <div style={{ color: "#64748b", marginTop: 1 }}>Phone: {invoice.customer_phone}</div>
        )}
      </div>

      {/* Modern Items List */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5, marginBottom: 4 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #cbd5e1", background: "#f1f5f9" }}>
            <th style={{ textAlign: "left", padding: "4px 3px", fontWeight: 700, color: "#334155" }}>ITEM</th>
            <th style={{ textAlign: "center", padding: "4px 2px", fontWeight: 700, color: "#334155" }}>QTY</th>
            <th style={{ textAlign: "right", padding: "4px 2px", fontWeight: 700, color: "#334155" }}>PRICE</th>
            <th style={{ textAlign: "right", padding: "4px 3px", fontWeight: 700, color: "#334155" }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => {
            const qty = parseFloat(p.qty) || 1;
            const price = parseFloat(p.price) || 0;
            const amt = parseFloat(p.amount) || (qty * price);
            const gstPct = parseFloat(p.gst || p.tax_percent) || 0;

            return (
              <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ textAlign: "left", padding: "4px 2px", wordBreak: "break-word" }}>
                  <div style={{ fontWeight: 600, color: "#0f172a" }}>{p.product_name || p.name}</div>
                  {p.product_code && (
                    <div style={{ fontSize: 9, color: "#64748b" }}>Code: {p.product_code} {gstPct > 0 ? `• GST ${gstPct}%` : ""}</div>
                  )}
                </td>
                <td style={{ textAlign: "center", padding: "4px 2px", color: "#334155" }}>{qty}</td>
                <td style={{ textAlign: "right", padding: "4px 2px", color: "#334155" }}>{price.toFixed(0)}</td>
                <td style={{ textAlign: "right", padding: "4px 2px", fontWeight: 700, color: "#0f172a" }}>{amt.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Summary Box */}
      <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: 4, fontSize: 10.5 }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "1.5px 0", color: "#475569" }}>
          <span>Items / Qty: {products.length} items</span>
          <span>Subtotal: ₹{subTotal.toFixed(2)}</span>
        </div>
        {totalGst > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", padding: "1.5px 0", color: "#475569" }}>
            <span>GST Tax (Included)</span>
            <span>₹{totalGst.toFixed(2)}</span>
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
        <span style={{ fontSize: 14, fontWeight: 900 }}>₹{totalAmount.toFixed(2)}</span>
      </div>

      {/* Payment Status Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#334155", background: "#f8fafc", padding: "4px 6px", borderRadius: 4, border: "1px solid #e2e8f0" }}>
        <span>Payment: <strong>{paymentMethod}</strong></span>
        <span>Status: <strong style={{ color: balanceAmount > 0 ? "#dc2626" : "#16a34a" }}>{balanceAmount > 0 ? `Due ₹${balanceAmount.toFixed(2)}` : "PAID FULL"}</strong></span>
      </div>

      {/* Modern Footer Note */}
      <div style={{ textAlign: "center", fontSize: 9.5, color: "#64748b", marginTop: 8, lineHeight: 1.3 }}>
        <div>★ ★ ★ THANK YOU FOR YOUR VISIT ★ ★ ★</div>
        <div style={{ fontSize: 8.5, marginTop: 2 }}>Goods once sold cannot be returned without original bill.</div>
      </div>
    </div>
  );
}

/* ─── 5.3 POS LAYOUT: DETAILED GST TAX INVOICE (FULL GST TAX SPLIT) ─── */
export function ThemePOSDetailed({ invoice, company, color, logoUrl }) {
  const products = Array.isArray(invoice.products) ? invoice.products : [];
  const totalAmount = parseFloat(invoice.total_amount) || 0;
  const totalGst = parseFloat(invoice.gst_total) || 0;
  const subTotal = parseFloat(invoice.sub_total) || (totalAmount - totalGst);
  const paidAmount = parseFloat(invoice.paid_amount) || 0;
  const balanceAmount = parseFloat(invoice.balance_amount) ?? Math.max(0, totalAmount - paidAmount);
  const paymentMethod = (invoice.payment_method || invoice.payment_type || "CASH").toUpperCase();

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
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.5 }}>TAX INVOICE (RETAIL)</div>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#111827", marginTop: 1 }}>
          {company?.company_name || "Apex Digital Solutions"}
        </div>
        <div style={{ fontSize: 9.5, color: "#374151" }}>
          {company?.company_address || "12/4, Tech Park, Bengaluru, KA - 560034"}
        </div>
        <div style={{ fontSize: 10, fontWeight: 600 }}>
          GSTIN: {company?.gstin || "33AAAAA0000A1Z5"} | State: 33 (KA)
        </div>
        <div style={{ fontSize: 9.5 }}>Phone: {company?.phone || "9876543210"}</div>
      </div>

      {/* Bill & Party Details */}
      <table style={{ width: "100%", fontSize: 9.5, borderCollapse: "collapse", marginBottom: 4 }}>
        <tbody>
          <tr>
            <td style={{ width: "50%", padding: "1px 0" }}><strong>Inv No:</strong> {invoice.invoice_no || "INV-001"}</td>
            <td style={{ width: "50%", textAlign: "right", padding: "1px 0" }}><strong>Date:</strong> {formatPOSDateTime(invoice.created_at)}</td>
          </tr>
          <tr>
            <td style={{ padding: "1px 0" }} colSpan={2}><strong>Billed To:</strong> {invoice.customer_name || "Cash Customer"}</td>
          </tr>
          {invoice.customer_gstin && (
            <tr>
              <td style={{ padding: "1px 0" }} colSpan={2}><strong>Party GSTIN:</strong> {invoice.customer_gstin}</td>
            </tr>
          )}
          <tr>
            <td style={{ padding: "1px 0" }}><strong>Place of Supply:</strong> Karnataka (33)</td>
            <td style={{ textAlign: "right", padding: "1px 0" }}><strong>Pay Mode:</strong> {paymentMethod}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ borderBottom: "1px dashed #000", margin: "3px 0" }} />

      {/* Item Table with HSN & GST % */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9.5 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #000000" }}>
            <th style={{ textAlign: "left", padding: "2px 0", fontWeight: "bold" }}>Item</th>
            <th style={{ textAlign: "center", padding: "2px 0", fontWeight: "bold" }}>HSN</th>
            <th style={{ textAlign: "center", padding: "2px 0", fontWeight: "bold" }}>Qty</th>
            <th style={{ textAlign: "right", padding: "2px 0", fontWeight: "bold" }}>Rate</th>
            <th style={{ textAlign: "right", padding: "2px 0", fontWeight: "bold" }}>Amt</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => {
            const qty = parseFloat(p.qty) || 1;
            const price = parseFloat(p.price) || 0;
            const amt = parseFloat(p.amount) || (qty * price);
            const gstPct = parseFloat(p.gst || p.tax_percent) || 0;

            return (
              <tr key={i} style={{ borderBottom: "1px dotted #e5e7eb" }}>
                <td style={{ textAlign: "left", padding: "2px 0", wordBreak: "break-word" }}>
                  <div>{p.product_name || p.name}</div>
                  {gstPct > 0 && <div style={{ fontSize: 8.5, color: "#4b5563" }}>GST @{gstPct}%</div>}
                </td>
                <td style={{ textAlign: "center", padding: "2px 0", fontSize: 9 }}>{p.product_code || "-"}</td>
                <td style={{ textAlign: "center", padding: "2px 0" }}>{qty}</td>
                <td style={{ textAlign: "right", padding: "2px 0" }}>{price.toFixed(0)}</td>
                <td style={{ textAlign: "right", padding: "2px 0", fontWeight: "bold" }}>{amt.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ borderBottom: "1px dashed #000", margin: "4px 0" }} />

      {/* GST Split Breakdown Table */}
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
            <td style={{ textAlign: "right", padding: "2px" }}>₹{halfGst.toFixed(2)}</td>
            <td style={{ textAlign: "right", padding: "2px" }}>₹{halfGst.toFixed(2)}</td>
            <td style={{ textAlign: "right", padding: "2px", fontWeight: "bold" }}>₹{totalGst.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      {/* Summary Totals */}
      <table style={{ width: "100%", fontSize: 10, borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td style={{ padding: "1px 0" }}>Sub Total (Taxable)</td>
            <td style={{ textAlign: "right", padding: "1px 0" }}>₹{subTotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td style={{ padding: "1px 0" }}>Total Tax (CGST+SGST)</td>
            <td style={{ textAlign: "right", padding: "1px 0" }}>₹{totalGst.toFixed(2)}</td>
          </tr>
          <tr style={{ borderTop: "1.5px solid #000", borderBottom: "1.5px solid #000", fontWeight: "bold", fontSize: 12 }}>
            <td style={{ padding: "3px 0" }}>NET AMOUNT</td>
            <td style={{ textAlign: "right", padding: "3px 0" }}>₹{totalAmount.toFixed(2)}</td>
          </tr>
          <tr>
            <td style={{ padding: "1px 0", fontSize: 9.5 }}>Paid: ₹{paidAmount.toFixed(2)}</td>
            <td style={{ textAlign: "right", padding: "1px 0", fontSize: 9.5, color: balanceAmount > 0 ? "#dc2626" : "#059669", fontWeight: "bold" }}>
              Balance: ₹{balanceAmount.toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ fontSize: 8.5, marginTop: 4, color: "#374151" }}>
        <strong>In Words:</strong> {numberToWordsINR(totalAmount)}
      </div>

      {/* Signatory */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 8, paddingTop: 4, borderTop: "1px dotted #9ca3af", fontSize: 8.5 }}>
        <div>
          <div>1. Goods sold not returnable.</div>
          <div>2. Subject to local jurisdiction.</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: "bold" }}>Authorized Signatory</div>
        </div>
      </div>
    </div>
  );
}

/* ─── 5.4 POS LAYOUT: QUICK MINIMAL / FAST BILLING TOKEN ─── */
export function ThemePOSMinimal({ invoice, company, color, logoUrl }) {
  const products = Array.isArray(invoice.products) ? invoice.products : [];
  const totalAmount = parseFloat(invoice.total_amount) || 0;
  const totalQty = products.reduce((s, p) => s + (parseFloat(p.qty) || 0), 0);
  const paymentMethod = (invoice.payment_method || invoice.payment_type || "CASH").toUpperCase();

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
        <div style={{ fontSize: 10, fontWeight: "bold", letterSpacing: 0.5 }}>EXPRESS TOKEN / ORDER</div>
        <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 1, margin: "2px 0" }}>
          #{invoice.invoice_no ? invoice.invoice_no.replace(/^[^\d]*/, "") || invoice.invoice_no : "001"}
        </div>
        <div style={{ fontSize: 9.5 }}>{company?.company_name || "Express Billing"} • {company?.phone || "9876543210"}</div>
      </div>

      {/* Time & Counter */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, borderBottom: "1px dashed #000", paddingBottom: 3, marginBottom: 4 }}>
        <span>Date: {formatPOSDateTime(invoice.created_at)}</span>
        <span>Type: {paymentMethod}</span>
      </div>

      {/* Streamlined Fast Item List */}
      <div style={{ fontSize: 11, marginBottom: 4 }}>
        {products.map((p, i) => {
          const qty = parseFloat(p.qty) || 1;
          const price = parseFloat(p.price) || 0;
          const amt = parseFloat(p.amount) || (qty * price);

          return (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
              <span style={{ fontWeight: "bold", flex: 1, paddingRight: 4, wordBreak: "break-word" }}>
                {qty} x {p.product_name || p.name}
              </span>
              <span style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>
                ₹{amt.toFixed(0)}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />

      {/* Large Bold Total */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "4px 0" }}>
        <span style={{ fontSize: 11, fontWeight: "bold" }}>ITEMS: {products.length} (QTY {totalQty})</span>
        <span style={{ fontSize: 16, fontWeight: 900 }}>TOTAL: ₹{totalAmount.toFixed(0)}</span>
      </div>

      <div style={{ borderTop: "2px solid #000", borderBottom: "2px solid #000", padding: "3px 0", textAlign: "center", fontWeight: "bold", fontSize: 10, margin: "4px 0" }}>
        PAID BY {paymentMethod} • THANK YOU!
      </div>

      {/* Counter Collection Notice */}
      <div style={{ textAlign: "center", fontSize: 9, marginTop: 4 }}>
        *** PLEASE COLLECT ITEMS AT THE COUNTER ***
      </div>
    </div>
  );
}

/* ─── 5.5 POS LAYOUT: VINTAGE BOUTIQUE (DECORATIVE BORDERS & STORE STORY) ─── */
export function ThemePOSVintage({ invoice, company, color, logoUrl }) {
  const products = Array.isArray(invoice.products) ? invoice.products : [];
  const totalAmount = parseFloat(invoice.total_amount) || 0;
  const totalGst = parseFloat(invoice.gst_total) || 0;
  const subTotal = parseFloat(invoice.sub_total) || (totalAmount - totalGst);
  const paidAmount = parseFloat(invoice.paid_amount) || 0;
  const balanceAmount = parseFloat(invoice.balance_amount) ?? Math.max(0, totalAmount - paidAmount);
  const paymentMethod = (invoice.payment_method || invoice.payment_type || "CASH").toUpperCase();

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
        <div style={{ fontSize: 11, fontWeight: "bold", letterSpacing: 1 }}>═════════════════════════════</div>
        <div style={{ fontSize: 13.5, fontWeight: 900, letterSpacing: 0.5, margin: "2px 0" }}>
          * {company?.company_name || "Apex Heritage & Boutique"} *
        </div>
        <div style={{ fontSize: 9.5, fontStyle: "italic", color: "#52525b" }}>
          ~ Fine Quality & Trusted Since 2012 ~
        </div>
        <div style={{ fontSize: 11, fontWeight: "bold", letterSpacing: 1 }}>═════════════════════════════</div>
        <div style={{ fontSize: 10, marginTop: 2 }}>{company?.company_address || "12/4, Main Road, Bengaluru"}</div>
        <div style={{ fontSize: 10 }}>Ph: {company?.phone || "9876543210"} {company?.gstin ? `| GST: ${company.gstin}` : ""}</div>
      </div>

      <div style={{ borderBottom: "1px dashed #000", margin: "4px 0" }} />

      {/* Bill Info */}
      <div style={{ fontSize: 10, marginBottom: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>MEMO #{invoice.invoice_no || "INV-1001"}</span>
          <span>{formatPOSDateTime(invoice.created_at)}</span>
        </div>
        <div>CUSTOMER: {invoice.customer_name || "Valued Patron"}</div>
      </div>

      <div style={{ borderBottom: "1px solid #000", margin: "4px 0" }} />

      {/* Items List */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
        <thead>
          <tr style={{ borderBottom: "1px dashed #71717a" }}>
            <th style={{ textAlign: "left", paddingBottom: 2, fontWeight: "bold" }}>ITEM DESCRIPTION</th>
            <th style={{ textAlign: "center", paddingBottom: 2, fontWeight: "bold" }}>QTY</th>
            <th style={{ textAlign: "right", paddingBottom: 2, fontWeight: "bold" }}>PRICE</th>
            <th style={{ textAlign: "right", paddingBottom: 2, fontWeight: "bold" }}>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => {
            const qty = parseFloat(p.qty) || 1;
            const price = parseFloat(p.price) || 0;
            const amt = parseFloat(p.amount) || (qty * price);

            return (
              <tr key={i} style={{ verticalAlign: "top" }}>
                <td style={{ textAlign: "left", padding: "2.5px 0", wordBreak: "break-word" }}>
                  * {p.product_name || p.name}
                </td>
                <td style={{ textAlign: "center", padding: "2.5px 2px" }}>{qty}</td>
                <td style={{ textAlign: "right", padding: "2.5px 2px" }}>{price.toFixed(0)}</td>
                <td style={{ textAlign: "right", padding: "2.5px 0", fontWeight: "bold" }}>{amt.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ borderBottom: "1px solid #000", margin: "4px 0" }} />

      {/* Savings Highlight Badge */}
      <div style={{ border: "1px dashed #000", padding: "3px 4px", textAlign: "center", fontSize: 9.5, fontWeight: "bold", margin: "4px 0" }}>
        ★ YOU SAVED ₹150.00 ON THIS PURCHASE ★
      </div>

      {/* Summary */}
      <table style={{ width: "100%", fontSize: 10.5, borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td style={{ padding: "1px 0" }}>SUB TOTAL</td>
            <td style={{ textAlign: "right", padding: "1px 0" }}>₹{subTotal.toFixed(2)}</td>
          </tr>
          {totalGst > 0 && (
            <tr>
              <td style={{ padding: "1px 0" }}>ESTIMATED GST</td>
              <td style={{ textAlign: "right", padding: "1px 0" }}>₹{totalGst.toFixed(2)}</td>
            </tr>
          )}
          <tr style={{ fontWeight: 900, fontSize: 12.5 }}>
            <td style={{ padding: "3px 0" }}>GRAND TOTAL</td>
            <td style={{ textAlign: "right", padding: "3px 0" }}>₹{totalAmount.toFixed(2)}</td>
          </tr>
          <tr>
            <td style={{ padding: "1px 0", fontSize: 10 }}>PAYMENT ({paymentMethod})</td>
            <td style={{ textAlign: "right", padding: "1px 0", fontSize: 10 }}>₹{paidAmount.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ borderBottom: "1px dashed #000", margin: "5px 0" }} />

      {/* Vintage Footer */}
      <div style={{ textAlign: "center", fontSize: 9.5, lineHeight: 1.35, paddingBottom: 2 }}>
        <div>~ Thank you for your continued patronage! ~</div>
        <div style={{ fontSize: 8.5, marginTop: 2, color: "#52525b" }}>Exchanges allowed within 7 days with bill tag.</div>
        <div style={{ fontSize: 10, fontWeight: "bold", letterSpacing: 1, marginTop: 2 }}>═════════════════════════════</div>
      </div>
    </div>
  );
}

/* ─── MAIN POS RECEIPT THEME DISPATCHER ─── */
function ThemePOS({ invoice, company, color, logoUrl, layout }) {
  const activeLayout = layout || invoice?.pos_layout || (() => {
    try {
      return localStorage.getItem("thermal_pos_layout") || "pos_classic";
    } catch {
      return "pos_classic";
    }
  })();

  if (activeLayout === "pos_modern") {
    return <ThemePOSModern invoice={invoice} company={company} color={color} logoUrl={logoUrl} />;
  }
  if (activeLayout === "pos_detailed") {
    return <ThemePOSDetailed invoice={invoice} company={company} color={color} logoUrl={logoUrl} />;
  }
  if (activeLayout === "pos_minimal") {
    return <ThemePOSMinimal invoice={invoice} company={company} color={color} logoUrl={logoUrl} />;
  }
  if (activeLayout === "pos_vintage") {
    return <ThemePOSVintage invoice={invoice} company={company} color={color} logoUrl={logoUrl} />;
  }
  return <ThemePOSClassic invoice={invoice} company={company} color={color} logoUrl={logoUrl} />;
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
  const [doNotShowAgain, setDoNotShowAgain] = useState(false);
  const [waSending, setWaSending] = useState(false);
  const [tmSending, setTmSending] = useState(false);
  const [copyToast, setCopyToast] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const tmAttachDone = useRef(false);

  const isPOS = printerType === "thermal" || selectedTheme === "pos";
  const logoUrl = getInvoiceLogoUrl(company?.logo);

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
    api.get(`/invoice/get_invoice_by_id?id=${invoiceNo}`).then(res => {
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
    }).catch(err => {
      console.error(err);
      setLoadError(err.response?.data?.message || "Failed to load invoice details.");
    }).finally(() => {
      setLoading(false);
    });
  }, [invoiceNo]);

/* ── AUTO-SEND: attach the invoice PDF after the transaction message was
     auto-sent on creation. Reuses the SAME PDF generator (html2pdf) and the
     SAME server document endpoint as the manual WhatsApp Share button. ── */
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
            [...element.querySelectorAll("img")].map(im =>
              im.complete ? null : new Promise(r => { im.onload = r; im.onerror = r; })
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

  /* Load print & invoice design settings from DB so the bill matches the company's saved default design */
  useEffect(() => {
    if (!invoice) return;
    const companyId = invoice.company_id;
    api
      .get("/settings/get", { params: { company_id: companyId } })
      .then((res) => {
        const data = (res.data && res.data.data) || {};
        const printSettings = data.print || {};
        const designSettings = data.invoiceDesign || {};

        // 1. Printer Type: 'regular' | 'thermal'
        const activePrinter = printSettings.printer || (designSettings.theme === "pos" ? "thermal" : "regular");
        if (activePrinter) setPrinterType(activePrinter);

        // 2. Regular Theme
        const themeCandidate = printSettings.template || printSettings.theme || designSettings.template || designSettings.theme;
        if (themeCandidate) {
          const map = {
            "Tally Theme": "tally",
            "GST Theme 1": "gst1",
            "GST Theme 2": "gst3",
            "GST Theme 3": "gst3",
            "Double Divine": "double_divine",
            "Minimal Theme": "gst3",
            "french_elite": "french_elite",
            "pos": "pos",
            "vintage_classic": "vintage_classic",
            "vintage_bold": "vintage_bold"
          };
          const resolved = map[themeCandidate] || themeCandidate.toLowerCase().replace(/\s+/g, "_");
          if (resolved) setSelectedTheme(resolved);
        }

        // 3. Theme Accent Color
        const colorCandidate = printSettings.themeColor || designSettings.themeColor;
        if (colorCandidate) {
          setSelectedColor(colorCandidate);
        }

        // 4. POS Layout (Thermal)
        const posLayoutCandidate = printSettings.posLayout || designSettings.posLayout;
        if (posLayoutCandidate) {
          setSelectedPosLayout(posLayoutCandidate);
        }

        // 5. Page Size (Thermal)
        if (printSettings.pageSize) {
          setPageSize(printSettings.pageSize);
        }
      })
      .catch(() => {});
  }, [invoice]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8fafc", color: "#475569", fontSize: 14, gap: 10 }}>
        <div style={{ width: 28, height: 28, border: "3px solid #cbd5e1", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span>Loading invoice #{invoiceNo}...</span>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (loadError || !invoice) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8fafc", color: "#1e293b", padding: 20 }}>
        <div style={{ background: "#ffffff", padding: "32px 40px", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", textAlign: "center", maxWidth: 420 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px auto", fontSize: 24, fontWeight: "bold" }}>
            !
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px 0" }}>Invoice Not Found</h2>
          <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 20px 0" }}>
            {loadError || `Could not find invoice #${invoiceNo}. It may have been deleted or the number is invalid.`}
          </p>
          <button
            onClick={() => navigate("/sales/invoices")}
            style={{ padding: "10px 20px", background: "#2563eb", color: "#ffffff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
          >
            Go Back to Invoices
          </button>
        </div>
      </div>
    );
  }

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

  /* Transaction Message (configured template) via WhatsApp */
  const sendTransactionMessage = () => {
    if (!invoice?.invoice_no || tmSending) return;
    setTmSending(true);
    api
      .post("/transaction-messages/send", {
        company_id: invoice.company_id,
        transaction_type: "sales",
        reference: { invoice_no: invoice.invoice_no },
        phone: invoice.customer_phone || "",
      })
      .then((res) => {
        alert(res.data?.message || "Transaction message sent via WhatsApp!");
      })
      .catch((err) => {
        alert(err.response?.data?.message || "Failed to send transaction message.");
      })
      .finally(() => setTmSending(false));
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

  const totalAmountNum = parseFloat(invoice?.total_amount) || 0;
  const paidAmountNum = parseFloat(invoice?.paid_amount) || 0;
  const balanceAmountNum = Math.max(0, totalAmountNum - paidAmountNum);
  const isPaid = balanceAmountNum <= 0 && totalAmountNum > 0;
  const isPartial = paidAmountNum > 0 && balanceAmountNum > 0;
  const statusInfo = isPaid
    ? { label: "PAID", bg: "#dcfce7", text: "#15803d", border: "#86efac" }
    : isPartial
    ? { label: "PARTIAL", bg: "#fef3c7", text: "#b45309", border: "#fde68a" }
    : { label: "UNPAID", bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5" };
  const invoiceType = getInvoiceType(invoice);

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

      {/* ── 2. TWO-COLUMN BODY LAYOUT: CENTER CANVAS & RIGHT ACTIONS ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

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
              width: isPOS ? (pageSize && pageSize.includes("58mm") ? 270 : 310) : 794,
              maxWidth: "100%",
              minHeight: isPOS ? "auto" : 1050,
              padding: isPOS ? "16px 12px" : "28px 32px",
              boxShadow: "0 6px 24px rgba(15, 23, 42, 0.09)",
              borderRadius: 2,
              boxSizing: "border-box",
              position: "relative",
              margin: "0 auto"
            }}
          >
            {/* Top Right Zoom / Expand Icon (Matching Screenshot) */}
            {!isPOS && (
              <div className="no-print" style={{ position: "absolute", top: 12, right: 12, color: "#94a3b8", cursor: "pointer" }}>
                <Maximize2 size={15} />
              </div>
            )}

            {/* Dynamic Active Theme / Layout Component */}
            {isPOS ? (
              <ThemePOS
                invoice={invoice}
                company={company}
                color={selectedColor}
                logoUrl={logoUrl}
                layout={selectedPosLayout}
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
                  />
                );
              })()
            )}
          </div>
        </main>

        {/* ── RIGHT SIDEBAR: INVOICE SUMMARY & ACTIONS ── */}
        <aside className="no-print" style={{
          width: 260,
          background: "#ffffff",
          borderLeft: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
          padding: "16px 14px",
          overflowY: "auto",
          boxSizing: "border-box",
          flexShrink: 0,
          gap: 14
        }}>
          {/* 1. Quick Invoice Summary Card */}
          <div style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            padding: "12px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
          }}>
            {/* Header: Invoice No + Status Badge */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <FileText size={15} color="#2563eb" />
                <span style={{ fontSize: 13, fontWeight: 800, color: "#1e293b" }}>
                  #{invoice.invoice_no}
                </span>
              </div>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 7px",
                borderRadius: 10,
                background: statusInfo.bg,
                color: statusInfo.text,
                border: `1px solid ${statusInfo.border}`,
                textTransform: "uppercase"
              }}>
                {statusInfo.label}
              </span>
            </div>

            {/* Grand Total Amount Box */}
            <div style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: "8px 10px",
              marginBottom: 10
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                Grand Total
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>
                ₹ {totalAmountNum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              {balanceAmountNum > 0 && (
                <div style={{ fontSize: 10.5, color: "#dc2626", fontWeight: 600, marginTop: 2 }}>
                  Due: ₹ {balanceAmountNum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
            </div>

            {/* Customer & Bill Details */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11, color: "#475569" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Customer:</span>
                <span style={{ fontWeight: 700, color: "#1e293b", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={invoice.customer_name}>
                  {invoice.customer_name || "Cash Customer"}
                </span>
              </div>

              {invoice.customer_phone && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Phone:</span>
                  <span style={{ fontWeight: 600, color: "#334155" }}>{invoice.customer_phone}</span>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Date:</span>
                <span style={{ fontWeight: 600, color: "#334155" }}>
                  {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Payment:</span>
                <span style={{ fontWeight: 700, color: "#059669" }}>
                  {(invoice.payment_type || invoice.payment_method || "Cash").toUpperCase()}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Invoice Type:</span>
                <span style={{ fontWeight: 700, color: "#2563eb" }}>
                  {invoiceType}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4, paddingTop: 4, borderTop: "1px dashed #e2e8f0" }}>
                <span style={{ color: "#64748b" }}>Format:</span>
                <span style={{ fontWeight: 700, color: isPOS ? "#d97706" : "#2563eb", fontSize: 10.5 }}>
                  {isPOS ? `Thermal POS (${(selectedPosLayout || "pos_classic").replace("pos_", "").toUpperCase()})` : `Regular (${(selectedTheme || "tally").toUpperCase()})`}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Share Invoice Section */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#334155", marginBottom: 8, display: "flex", alignItems: "center", gap: 6, textTransform: "uppercase", letterSpacing: "0.3px" }}>
              <Share2 size={13} color="#64748b" />
              <span>Share Invoice</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {/* WhatsApp Action */}
              <button
                onClick={shareWhatsApp}
                disabled={waSending}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 10px",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: 8,
                  cursor: "pointer",
                  color: "#15803d",
                  transition: "all 0.15s ease",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                  width: "100%",
                  textAlign: "left"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "#dcfce7";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "#f0fdf4";
                  e.currentTarget.style.transform = "none";
                }}
              >
                <div style={{
                  width: 30,
                  height: 30,
                  borderRadius: 6,
                  background: "#22c55e",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <MessageCircle size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700 }}>
                    {waSending ? "Sending PDF..." : "WhatsApp Share"}
                  </div>
                  <div style={{ fontSize: 10, color: "#16a34a", marginTop: 1 }}>
                    {invoice.customer_phone ? `Send to ${invoice.customer_phone}` : "Send PDF to customer"}
                  </div>
                </div>
              </button>

              {/* Share Link Action */}
              <button
                onClick={copyInvoiceLink}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 10px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  cursor: "pointer",
                  color: "#334155",
                  transition: "all 0.15s ease",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                  width: "100%",
                  textAlign: "left"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "#eff6ff";
                  e.currentTarget.style.borderColor = "#bfdbfe";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "#f8fafc";
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.transform = "none";
                }}
              >
                <div style={{
                  width: 30,
                  height: 30,
                  borderRadius: 6,
                  background: copyToast ? "#16a34a" : "#3b82f6",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "background 0.2s ease"
                }}>
                  {copyToast ? <Check size={15} /> : <Share2 size={15} />}
                </div>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: copyToast ? "#16a34a" : "#1e293b" }}>
                    {copyToast ? "Link Copied!" : "Copy Invoice Link"}
                  </div>
                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>
                    Share online bill link
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 3. Primary Actions: Print & Download */}
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 7, paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
            {/* Print Invoice Primary Button */}
            <button
              onClick={handlePrint}
              style={{
                width: "100%",
                height: 40,
                borderRadius: 8,
                border: "none",
                background: "#2563eb",
                color: "#ffffff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                fontSize: 12.5,
                fontWeight: 700,
                transition: "all 0.15s ease",
                boxShadow: "0 2px 6px rgba(37, 99, 235, 0.35)"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "#1d4ed8";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "#2563eb";
                e.currentTarget.style.transform = "none";
              }}
            >
              <Printer size={16} strokeWidth={2.2} />
              <span>Print Invoice</span>
            </button>

            {/* Download PDF Button */}
            <button
              onClick={downloadPDF}
              style={{
                width: "100%",
                height: 36,
                borderRadius: 8,
                border: "1.5px solid #cbd5e1",
                background: "#ffffff",
                color: "#334155",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 700,
                transition: "all 0.15s ease"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "#f1f5f9";
                e.currentTarget.style.borderColor = "#94a3b8";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "#ffffff";
                e.currentTarget.style.borderColor = "#cbd5e1";
              }}
            >
              <Download size={14} strokeWidth={2.2} />
              <span>Download PDF</span>
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

