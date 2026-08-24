import html2pdf from "html2pdf.js";
import api, { API_BASE_URL } from "../services/api";

/* ── logo URL resolver (shared by Invoice view + Reports row actions) ── */
export const getInvoiceLogoUrl = (logo) => {
  if (!logo) return null;
  if (logo.startsWith("http://") || logo.startsWith("https://")) {
    return logo;
  }
  const baseUrl = API_BASE_URL.replace("/api/", "/");
  return `${baseUrl}${logo}`;
};

/* ── render an invoice DOM node to base64 PDF using the exact same
      options as the Invoice View page ── */
export function generateInvoicePdfBase64({ element, invoiceNo, isPOS }) {
  return html2pdf()
    .set({
      margin: isPOS ? 5 : 10,
      filename: `invoice-${invoiceNo}.pdf`,
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: isPOS ? [80, 200] : "a4" },
    })
    .from(element)
    .toPdf()
    .get("pdf")
    .then((pdf) => {
      const dataUri = pdf.output("datauristring");
      return dataUri.split(",")[1];
    });
}

/* ── the single WhatsApp send endpoint used by the Invoice View page
      (POST /whatsapp/send_invoice → WhatsappConnectController@sendInvoice) ── */
export function sendInvoiceViaWhatsAppApi({ company_id, invoice_no, phone, pdf_base64 }) {
  return api.post("/whatsapp/send_invoice", {
    company_id,
    invoice_no,
    phone,
    pdf_base64,
    filename: `${invoice_no}.pdf`,
  });
}
