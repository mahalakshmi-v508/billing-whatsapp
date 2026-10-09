import html2pdf from "html2pdf.js";
import { jsPDF } from "jspdf";
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

export function getA4InvoicePdfOptions({ element, invoiceNo }) {
  const sourceWidth = element?.offsetWidth || element?.scrollWidth || 794;
  const printableWidth = (210 - 16) * (96 / 25.4);
  const scale = Math.min(1, printableWidth / sourceWidth);

  return {
    margin: 8,
    filename: `invoice-${invoiceNo}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      onclone: (_clonedDocument, clonedElement) => {
        clonedElement.style.setProperty("box-sizing", "border-box", "important");
        clonedElement.style.setProperty("width", `${sourceWidth}px`, "important");
        clonedElement.style.setProperty("max-width", "none", "important");
        clonedElement.style.setProperty("margin", "0", "important");
        clonedElement.style.setProperty("transform", `scale(${scale})`, "important");
        clonedElement.style.setProperty("transform-origin", "top left", "important");
      },
    },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  };
}

export function createPosInvoicePdf({ element, paperWidthMm, isMinimalPos = false }) {
  const sourceWidth = element?.offsetWidth || element?.scrollWidth || 310;
  const captureWidth = isMinimalPos ? 460 : sourceWidth;
  const paperWidth = paperWidthMm || (sourceWidth <= 290 ? 58 : 80);
  const margin = 2;
  const printableWidth = paperWidth - margin * 2;
  let captureElement = element;

  if (isMinimalPos) {
    captureElement = element.cloneNode(true);
    captureElement.style.cssText += `
      box-sizing: border-box !important;
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: ${captureWidth}px !important;
      max-width: none !important;
      margin: 0 !important;
      opacity: 0 !important;
      pointer-events: none !important;
      background: #ffffff !important;
    `;
    const receipt = captureElement.querySelector(".pos-minimal-receipt");
    if (receipt) {
      receipt.style.setProperty("width", "420px", "important");
      receipt.style.setProperty("max-width", "420px", "important");
      receipt.style.setProperty("margin", "0 auto", "important");
    }
    document.body.appendChild(captureElement);
  }

  return html2pdf()
    .set({
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 3,
        useCORS: true,
        logging: false,
        width: captureWidth,
        windowWidth: captureWidth,
        scrollX: 0,
        scrollY: 0,
        onclone: (_clonedDocument, clonedElement) => {
          clonedElement.style.setProperty("box-sizing", "border-box", "important");
          clonedElement.style.setProperty("width", `${captureWidth}px`, "important");
          clonedElement.style.setProperty("max-width", "none", "important");
          clonedElement.style.setProperty("margin", "0", "important");
          if (isMinimalPos) {
            clonedElement.style.setProperty("position", "relative", "important");
            clonedElement.style.setProperty("top", "0", "important");
            clonedElement.style.setProperty("left", "0", "important");
            clonedElement.style.setProperty("opacity", "1", "important");
          }
        },
      },
    })
    .from(captureElement)
    .toCanvas()
    .get("canvas")
    .then((canvas) => {
      const imageHeight = (canvas.height / canvas.width) * printableWidth;
      const contentHeight = isMinimalPos
        ? (canvas.height / 3) * (25.4 / 96)
        : imageHeight;
      const pageHeight = contentHeight + margin * 2;
      const pdf = new jsPDF({
        unit: "mm",
        format: [paperWidth, pageHeight],
        orientation: "portrait",
      });
      pdf.addImage(
        canvas.toDataURL("image/jpeg", 0.98),
        "JPEG",
        margin,
        margin,
        printableWidth,
        imageHeight,
      );
      if (captureElement !== element) captureElement.remove();
      return pdf;
    })
    .catch((error) => {
      if (captureElement !== element) captureElement.remove();
      throw error;
    });
}

/* ── render an invoice DOM node to base64 PDF using the exact same
      options as the Invoice View page ── */
export function generateInvoicePdfBase64({ element, invoiceNo, isPOS, paperWidthMm, isMinimalPos }) {
  if (isPOS) {
    return createPosInvoicePdf({ element, paperWidthMm, isMinimalPos }).then((pdf) => {
      const dataUri = pdf.output("datauristring");
      return dataUri.split(",")[1];
    });
  }

  return html2pdf()
    .set(getA4InvoicePdfOptions({ element, invoiceNo }))
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
