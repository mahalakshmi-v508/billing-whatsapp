/* Repeatedly-used document/PDF helpers for the Expense Report.
   Single source of truth shared by:
     - Open PDF (new tab)
     - Preview (in-app modal)
     - Print (document only)
     - Save PDF (download)
     - Email/Share PDF (WhatsApp file send)
   All of them render the SAME A4 expense document so the data stays consistent. */
import api from "../services/api";
import html2pdf from "html2pdf.js";
import { numberToWordsINR } from "./numberToWords";

/* ═══════════════════════════╗  NORMALISATION HELPERS  ═══════════════════════════╗ */
export const parseRowItems = (value) => {
  if (Array.isArray(value)) return value;
  try {
    const parsed = typeof value === "string" ? JSON.parse(value || "[]") : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const toFixed2 = (value) => {
  const n = Number(value);
  return isNaN(n) ? "0.00" : n.toFixed(2);
};

export const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/* ═══════════════════════════╗  COMPANY + CURRENCY RESOLUTION  ═══════════════════════════╗ */
let companyCache = {};

export async function fetchCompanyById(id) {
  const key = String(id);
  if (companyCache[key]) return companyCache[key];
  try {
    const res = await api.post("/company/get_company_by_id", { id: Number(id) });
    const data = res?.data?.data || res?.data;
    if (data && typeof data === "object") companyCache[key] = data;
    return data || null;
  } catch {
    return null;
  }
}

/* Currency symbol comes from the application settings
   (General > Currency, e.g. "₹ Indian Rupee (INR)" → symbol "₹").
   Falls back to the cached local settings, then to ₹. */
export async function getCurrencySymbol(companyId) {
  if (companyId) {
    try {
      const res = await api.get("/settings/get", { params: { company_id: companyId } });
      const settings = res?.data?.data || {};
      const symbol = symbolFromSettings(settings);
      if (symbol) return symbol;
    } catch {
      /* fall through to cached settings */
    }
  }
  try {
    const raw = localStorage.getItem("general_settings");
    if (raw) {
      const general = JSON.parse(raw);
      const cached = symbolFromSettings({ general });
      if (cached) return cached;
    }
  } catch {
    /* ignore */
  }
  return "₹";
}

function symbolFromSettings(settings) {
  const raw = settings?.general?.currency || "₹ Indian Rupee (INR)";
  const symbol = String(raw).trim().split(/\s+/)[0];
  return symbol || "₹";
}

/* ═══════════════════════════╗  A4 EXPENSE DOCUMENT  ═══════════════════════════╗ */
export function expensePdfFilename(expense) {
  const no = expense?.expense_no || expense?.id || "expense";
  const parsed = new Date(expense?.expense_date || Date.now());
  const dd = String(parsed.getDate()).padStart(2, "0");
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const yyyy = parsed.getFullYear();
  return `Expense_${no}_${dd}_${mm}_${yyyy}.pdf`;
}

export function buildExpenseDocumentHTML({ expense, company, currency = "₹" }) {
  const items = parseRowItems(expense?.items);
  const itemRows = items
    .map((it, i) => {
      const name = esc(it.item_name || it.name || "-");
      const qty = Number(it.quantity ?? it.qty ?? 0);
      const price = Number(it.unit_price ?? it.price ?? 0);
      const amount = Number(it.amount ?? it.total_amount ?? "") || qty * price;
      return `
        <tr>
          <td style="padding:7px 10px;text-align:center;border:1px solid #d1d5db;">${i + 1}</td>
          <td style="padding:7px 10px;border:1px solid #d1d5db;">${name}</td>
          <td style="padding:7px 10px;text-align:center;border:1px solid #d1d5db;">${qty || 0}</td>
          <td style="padding:7px 10px;text-align:right;border:1px solid #d1d5db;">${currency} ${toFixed2(price)}</td>
          <td style="padding:7px 10px;text-align:right;border:1px solid #d1d5db;">${currency} ${toFixed2(amount)}</td>
        </tr>`;
    })
    .join("");

  const subTotal = Number(expense?.sub_total);
  const total = Number(expense?.total_amount);
  const paid = Number(expense?.paid_amount);
  const balance = Number(expense?.balance_amount);

  const fmt = (v) => `${currency} ${toFixed2(v)}`;

  const companyName = esc(company?.company_name || vehicleName(company));
  const companyPhone = company?.phone || (company?.mobile ? `${company.mobile}` : "");

  const dateLabel = expense?.expense_date
    ? new Date(expense.expense_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "-";

  return `
  <div style="width:100%;max-width:760px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#111827;font-size:13px;line-height:1.45;">
    <!-- Title (Vyapar style: centred, spaced) -->
    <div style="text-align:center;letter-spacing:4px;font-size:24px;font-weight:800;color:#111827;margin-bottom:2px;">EXPENSE</div>
    <div style="text-align:center;font-size:16px;font-weight:700;color:#374151;">${companyName || "&nbsp;"}</div>
    ${companyPhone ? `<div style="text-align:center;font-size:12px;color:#4b5563;">Phone: ${esc(companyPhone)}</div>` : ""}
    <div style="border-top:1px solid #374151;margin:9px 0;"></div>

    <!-- Expense info -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
      <tr>
        <td style="vertical-align:top;width:50%;padding:2px 0;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;">Expense For</div>
          <div style="font-weight:700;font-size:14px;">${esc(expense?.party_name || expense?.category_name || "-")}</div>
          ${expense?.party_phone ? `<div style="font-size:12px;color:#4b5563;">${esc(expense.party_phone)}</div>` : ""}
        </td>
        <td style="vertical-align:top;width:50%;padding:2px 0;text-align:right;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;">Expense Details</div>
          <div style="font-weight:700;font-size:13px;">${dateLabel}</div>
          ${expense?.expense_no ? `<div style="font-size:12px;color:#4b5563;">Exp. No: ${esc(expense.expense_no)}</div>` : ""}
          ${expense?.category_name ? `<div style="font-size:12px;color:#4b5563;">Category: ${esc(expense.category_name)}</div>` : ""}
        </td>
      </tr>
    </table>

    <!-- Items table -->
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:8px 10px;text-align:center;border:1px solid #d1d5db;font-weight:700;">#</th>
          <th style="padding:8px 10px;text-align:left;border:1px solid #d1d5db;font-weight:700;">Item name</th>
          <th style="padding:8px 10px;text-align:center;border:1px solid #d1d5db;font-weight:700;">Quantity</th>
          <th style="padding:8px 10px;text-align:right;border:1px solid #d1d5db;font-weight:700;">Price / Unit (${currency})</th>
          <th style="padding:8px 10px;text-align:right;border:1px solid #d1d5db;font-weight:700;">Amount (${currency})</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows || `<tr><td colspan="5" style="padding:12px 10px;text-align:center;border:1px solid #d1d5db;color:#6b7280;">No items recorded</td></tr>`}
      </tbody>
    </table>

    <!-- Totals -->
    <table style="width:300px;float:right;margin-top:10px;border-collapse:collapse;font-size:12px;">
      <tr><td style="padding:4px 8px;color:#4b5563;">Sub Total</td><td style="padding:4px 8px;text-align:right;">${fmt(subTotal)}</td></tr>
      <tr>
        <td style="padding:6px 8px;font-weight:800;border-top:1px solid #d1d5db;">Total</td>
        <td style="padding:6px 8px;text-align:right;font-weight:800;border-top:1px solid #d1d5db;">${fmt(total)}</td>
      </tr>
      <tr><td style="padding:4px 8px;color:#4b5563;">Paid</td><td style="padding:4px 8px;text-align:right;">${fmt(paid)}</td></tr>
      <tr><td style="padding:4px 8px;color:#4b5563;">Balance</td><td style="padding:4px 8px;text-align:right;">${fmt(balance)}</td></tr>
    </table>
    <div style="clear:both;"></div>

    <div style="margin-top:14px;padding:9px 11px;background:#f9fafb;border:1px dashed #d1d5db;font-size:12px;color:#374151;">
      <span style="font-weight:700;">Amount in Words :&nbsp;</span>${esc(numberToWordsINR(total))}
    </div>
  </div>`;
}

function vehicleName(company) {
  return (company && (company.name || company.business_name || "")) || "";
}

/* ═══════════════════════════╗  PDF RENDERING  ═══════════════════════════╗ */
/* Allow the browser to compute layout/paint (fonts + frames) so the document
   is fully rendered before html2canvas rasterises it. */
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

/* Render the expense document to a jsPDF doc (A4 portrait) for save / blob / base64.

   ROOT-CAUSE FIX: html2canvas (bundled inside html2pdf) crops content that lies
   outside the current viewport — an element parked at left:-10000px captured as a
   blank/white canvas, producing a blank A4 PDF. The document is therefore rendered
   in a fixed sheet anchored to the viewport origin (hidden behind the app with a
   negative z-index, pointer-events:none so it can never intercept clicks), sized to
   the real A4 pixel width, and only captured AFTER fonts/layout are ready. */
export async function renderExpensePdf(context) {
  const holder = document.createElement("div");
  holder.style.cssText =
    "position:fixed;top:0;left:0;right:auto;bottom:auto;width:794px;background:#ffffff;z-index:-999999;pointer-events:none;";
  holder.innerHTML = buildExpenseDocumentHTML(context);
  document.body.appendChild(holder);

  try {
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch {
        /* fonts readiness is best-effort */
      }
    }
    await nextFrame();
    await nextFrame();

    const rect = holder.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      throw new Error("Expense document did not render (zero size).");
    }

    const doc = await html2pdf()
      .set({
        margin: 8,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: Math.max(document.documentElement.clientWidth, rect.width),
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(holder)
      .toPdf()
      .get("pdf");

    const pageCount = doc.internal && typeof doc.internal.getNumberOfPages === "function"
      ? doc.internal.getNumberOfPages()
      : 0;
    if (pageCount < 1) {
      throw new Error("Expense PDF has no pages.");
    }
    return doc;
  } finally {
    holder.remove();
  }
}

/* Validated PDF blob for opening in a new tab. Never hands back an empty/invalid file. */
export function expensePdfBlob(doc) {
  const blob = doc.output("blob");
  if (!blob) throw new Error("Unable to create the expense PDF blob.");
  if (blob.type !== "application/pdf") throw new Error("Generated file is not a valid PDF.");
  if (blob.size < 1000) throw new Error("Generated Expense PDF appears empty.");
  return blob;
}

export async function expensePdfBase64(context) {
  const doc = await renderExpensePdf(context);
  const dataUri = doc.output("datauristring");
  if (!dataUri || dataUri.indexOf("data:application/pdf;base64,") !== 0) {
    throw new Error("Generated file is not a valid PDF.");
  }
  const payload = dataUri.split(",")[1];
  if (!payload || payload.length < 1200) {
    throw new Error("Generated Expense PDF appears empty.");
  }
  return payload;
}

/* ═══════════════════════════╗  PRINT (DOCUMENT ONLY)  ═══════════════════════════╗ */
export function printExpenseHTML(title, html) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  win.document.open();
  win.document.write(
    `<!DOCTYPE html>
    <html>
      <head>
        <title>${esc(title)}</title>
        <style>
          @media print {
            body { margin: 0; }
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          body { font-family: Arial, Helvetica, sans-serif; }
        </style>
      </head>
      <body>${html}
        <script>
          (function () {
            window.focus();
            setTimeout(function () { window.print(); }, 350);
          })();
        </script>
      </body>
    </html>`
  );
  win.document.close();
  setTimeout(() => iframe.remove(), 60000);
}