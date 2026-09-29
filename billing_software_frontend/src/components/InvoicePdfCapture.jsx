import { useEffect, useRef } from "react";
import { DESIGN_COMPONENTS } from "../pages/billing/Invoice";
import { generateInvoicePdfBase64, getInvoiceLogoUrl } from "../utils/invoiceShare";

/* ───────────────────────────────────────────────────────────────────────────
   Renders a shareable invoice off-screen, waits for the browser to paint it
   (plus any logo/image assets), and converts it to a base64 PDF using the
   exact same options as the Invoice view page.

   Extracted from the Share popover so the internal /whatsapp page can resume
   a pending invoice share with identical output — one capture pipeline, no
   duplicated rendering logic.

   onCapture({ ok: true,  pdf_base64 })
   onCapture({ ok: false, error })
   ─────────────────────────────────────────────────────────────────────────── */

const areaIdFor = (key) => `wa-invoice-capture-${String(key || "doc").replace(/[^a-zA-Z0-9_-]/g, "_")}`;

export default function InvoicePdfCapture({ doc, isPOS = false, onCapture }) {
  const captureRef = useRef(onCapture);
  const areaId = areaIdFor(doc?.captureKey);

  useEffect(() => {
    captureRef.current = onCapture;
  }, [onCapture]);

  useEffect(() => {
    if (!doc) return undefined;

    let cancelled = false;

    const run = async () => {
      // give the browser a frame to settle the hidden invoice before capture
      await new Promise((resolve) => setTimeout(resolve, 300));

      // the effect runs after this document has been committed to the DOM
      const element = document.getElementById(areaId);
      if (!element || cancelled) return;

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

      try {
        const pdf_base64 = await generateInvoicePdfBase64({
          element,
          invoiceNo: doc.invoice_no,
          isPOS,
        });
        if (!cancelled) captureRef.current?.({ ok: true, pdf_base64 });
      } catch (error) {
        if (!cancelled) captureRef.current?.({ ok: false, error });
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [doc, areaId, isPOS]);

  if (!doc) return null;

  return (
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
        id={areaId}
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
          invoice={doc.invoice}
          company={doc.company}
          color="#6366f1"
          logoUrl={getInvoiceLogoUrl(doc.company?.logo)}
        />
      </div>
    </div>
  );
}
