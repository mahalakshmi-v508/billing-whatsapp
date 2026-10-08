import html2pdf from "html2pdf.js";
import jsPDF from "jspdf";
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
export function generateInvoicePdf({
  element,
  invoiceNo,
  isPOS,
  pageSize,
  lowerPosDetailsDivider = false,
  centerModernPosSummary = false,
  fixMinimalPosPdf = false,
}) {
  if (isPOS) {
    const minimalReceipt = fixMinimalPosPdf
      ? element.querySelector(".thermal-pos-minimal-receipt")
      : null;
    const captureElement = minimalReceipt || element;
    const captureWidth = Math.max(captureElement.offsetWidth, captureElement.scrollWidth);
    const captureHeight = Math.max(captureElement.offsetHeight, captureElement.scrollHeight);
    if (!captureWidth || !captureHeight) {
      return Promise.reject(new Error("Thermal receipt preview is empty."));
    }
    return html2pdf()
      .set({
        html2canvas: {
          scale: 3,
          useCORS: true,
          logging: false,
          width: captureWidth,
          height: captureHeight,
          windowWidth: Math.max(document.documentElement.clientWidth, captureWidth),
          scrollX: 0,
          scrollY: 0,
          onclone: lowerPosDetailsDivider || centerModernPosSummary
            ? (clonedDocument) => {
              if (lowerPosDetailsDivider) {
                const divider = clonedDocument.querySelector(".thermal-pos-details-divider");
                if (divider) divider.style.marginTop = "16px";

                const itemHeaderCells = clonedDocument.querySelectorAll(".thermal-pos-items-table thead th");
                itemHeaderCells.forEach((cell) => {
                  cell.style.paddingBottom = "8px";
                });
              }

              if (centerModernPosSummary) {
                const totalBanner = clonedDocument.querySelector(".thermal-pos-modern-total-banner");
                if (totalBanner) {
                  totalBanner.style.setProperty("background", "#000000", "important");
                  totalBanner.style.setProperty("color", "#ffffff", "important");
                  totalBanner.style.setProperty("justify-content", "center", "important");
                  totalBanner.style.setProperty("flex-direction", "column", "important");
                  totalBanner.style.setProperty("text-align", "center", "important");
                }

                const statusBar = clonedDocument.querySelector(".thermal-pos-modern-status-bar");
                if (statusBar) {
                  statusBar.style.setProperty("justify-content", "center", "important");
                  statusBar.style.setProperty("gap", "12px", "important");
                  statusBar.style.setProperty("text-align", "center", "important");
                  statusBar.querySelectorAll("span").forEach((item) => {
                    item.style.setProperty("text-align", "center", "important");
                  });
                }
              }
            }
            : undefined,
        },
      })
      .from(captureElement)
      .toCanvas()
      .get("canvas")
      .then((canvas) => {
        if (!canvas.width || !canvas.height) {
          throw new Error("Thermal receipt preview rendered an empty page.");
        }

        const rollWidth = pageSize?.includes("58mm") ? 58 : 80;
        const receiptHeight = canvas.height * rollWidth / canvas.width;
        const pdf = new jsPDF({
          unit: "mm",
          format: [rollWidth, receiptHeight],
          orientation: "portrait",
        });
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, rollWidth, receiptHeight);
        return pdf;
      });
  }

  const captureWidth = Math.max(element.offsetWidth, element.scrollWidth);
  return html2pdf()
    .set({
      margin: 0,
      filename: `invoice-${invoiceNo}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        width: captureWidth,
        windowWidth: Math.max(document.documentElement.clientWidth, captureWidth),
        scrollX: 0,
        scrollY: 0,
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    })
    .from(element)
    .toCanvas()
    .get("canvas")
    .then((canvas) => {
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const margin = 8;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2;
      const scale = contentWidth / canvas.width;
      const sourcePageHeight = Math.max(1, Math.floor(contentHeight / scale));
      let sourceTop = 0;
      let page = 0;

      while (sourceTop < canvas.height) {
        const sliceHeight = Math.min(sourcePageHeight, canvas.height - sourceTop);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        const context = pageCanvas.getContext("2d");
        if (!context) {
          throw new Error("Unable to prepare the invoice PDF page.");
        }

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        context.drawImage(
          canvas,
          0,
          sourceTop,
          canvas.width,
          sliceHeight,
          0,
          0,
          canvas.width,
          sliceHeight
        );

        if (page > 0) pdf.addPage();
        const renderedHeight = sliceHeight * scale;
        pdf.addImage(
          pageCanvas.toDataURL("image/jpeg", 0.98),
          "JPEG",
          margin,
          margin,
          contentWidth,
          renderedHeight
        );

        sourceTop += sliceHeight;
        page += 1;
      }

      return pdf;
    });
}

export function generateInvoicePdfBase64({ element, invoiceNo, isPOS, pageSize }) {
  return generateInvoicePdf({ element, invoiceNo, isPOS, pageSize }).then((pdf) => {
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
