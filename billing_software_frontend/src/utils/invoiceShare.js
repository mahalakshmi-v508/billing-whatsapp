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
  if (isPOS) {
    const elementHeight = element.scrollHeight || element.offsetHeight || 550;
    const heightInMm = Math.max(140, Math.ceil((elementHeight * 25.4) / 96) + 8);

    return html2pdf()
      .set({
        margin: [2, 2, 2, 2],
        filename: `invoice-${invoiceNo}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true, logging: false, width: 275, windowWidth: 275, scrollX: 0, scrollY: 0 },
        jsPDF: { unit: "mm", format: [80, heightInMm], orientation: "portrait" },
      })
      .from(element)
      .toPdf()
      .get("pdf")
      .then((pdf) => {
        const dataUri = pdf.output("datauristring");
        return dataUri.split(",")[1];
      });
  }

  return html2pdf()
    .set({
      margin: [8, 8, 8, 8],
      filename: `invoice-${invoiceNo}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
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
