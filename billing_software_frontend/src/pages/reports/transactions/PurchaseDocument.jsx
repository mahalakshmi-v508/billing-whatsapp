import { getInvoiceLogoUrl } from "../../../utils/invoiceShare";

/*
 * Renders a real Purchase invoice document from the purchase record returned by
 * /purchase/get_purchase_by_id (purchase + items + supplier relations).
 *
 * All styles are inline so the exact same node can be printed through a hidden
 * iframe (printElement) or captured to PDF with html2pdf without any
 * stylesheet dependency.
 */

const fmtMoney = (v) =>
  "₹" +
  Number(v || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const displayDate = (val) => {
  if (!val) return "-";
  const [y, m, d] = String(val).split("-");
  return y && m && d ? `${d}/${m}/${y}` : String(val);
};

const LIGHT = {
  color: "#64748b",
  fontSize: "11.5px",
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const VAL = {
  color: "#17243a",
  fontSize: "13px",
  fontWeight: "700",
};

export default function PurchaseDocument({ purchase, company }) {
  if (!purchase) return null;

  const items = Array.isArray(purchase.items) ? purchase.items : [];
  const sup = purchase.supplier || {};

  const companyName = company?.company_name || "Company";
  const companyAddress = company?.company_address || "";
  const companyPhone = company?.phone || "";
  const companyGstin = company?.gstin || "";

  const logo = company?.logo ? getInvoiceLogoUrl(company.logo) : null;

  const subTotal = Number(purchase.sub_total || 0);
  const discountTotal = Number(purchase.discount_total || 0);
  const gstTotal = Number(purchase.gst_total || 0);
  const roundOff = Number(purchase.round_off || 0);
  const totalAmount = Number(purchase.total_amount || 0);
  const paidAmount = Number(purchase.paid_amount || 0);
  const balanceAmount = Number(purchase.balance_amount || 0);

  const isDraft = purchase.status === "draft";

  const statusStyle = {
    padding: "5px 14px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "700",
    display: "inline-block",
    background: isDraft ? "#fff1cc" : "#d8f7e5",
    color: isDraft ? "#9a6700" : "#087443",
  };

  return (
    <div
      id="purchase-document"
      style={{
        background: "#ffffff",
        color: "#17243a",
        fontFamily:
          "Inter, -apple-system, 'Segoe UI', Roboto, sans-serif",
        minWidth: "640px",
        width: "100%",
      }}
    >
      {/* ── COMPANY HEADER ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "16px",
          padding: "22px 26px 18px",
          borderBottom: "2px solid #17243a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {logo && (
            <img
              src={logo}
              alt="logo"
              style={{
                width: "62px",
                height: "62px",
                objectFit: "contain",
                borderRadius: "8px",
              }}
            />
          )}
          <div>
            <div
              style={{
                fontSize: "19px",
                fontWeight: "800",
                letterSpacing: "-0.3px",
              }}
            >
              {companyName}
            </div>
            {companyAddress && (
              <div
                style={{
                  fontSize: "12px",
                  color: "#475569",
                  marginTop: "3px",
                  maxWidth: "360px",
                }}
              >
                {companyAddress}
              </div>
            )}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                marginTop: "5px",
              }}
            >
              {companyGstin && (
                <span style={{ fontSize: "12px", color: "#334155" }}>
                  GSTIN: <strong>{companyGstin}</strong>
                </span>
              )}
              {companyPhone && (
                <span style={{ fontSize: "12px", color: "#334155" }}>
                  Ph: <strong>{companyPhone}</strong>
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: "18px",
              fontWeight: "900",
              color: "#ef233c",
              letterSpacing: "0.02em",
            }}
          >
            {isDraft ? "PURCHASE DRAFT" : "PURCHASE INVOICE"}
          </div>
          <div style={{ marginTop: "8px", display: "inline-block", ...statusStyle }}>
            {purchase.status === "draft" ? "DRAFT" : "SUBMITTED"}
          </div>
        </div>
      </div>

      {/* ── BILL + PARTY INFO ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "18px",
          padding: "16px 26px",
          background: "#f8fafc",
        }}
      >
        <div>
          <div style={{ ...LIGHT, marginBottom: "5px" }}>Bill To (Supplier)</div>
          <div style={{ fontSize: "14px", fontWeight: "800" }}>
            {purchase.supplier_name || sup.supplier_name || "-"}
          </div>
          {sup.address && (
            <div style={{ fontSize: "12px", color: "#475569", marginTop: "3px" }}>
              {sup.address}
            </div>
          )}
          {(sup.mobile_number || sup.phone) && (
            <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
              Ph: {sup.mobile_number || sup.phone}
            </div>
          )}
          {(purchase.supplier_gstin || sup.gst_number) && (
            <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
              GSTIN: {purchase.supplier_gstin || sup.gst_number}
            </div>
          )}
        </div>

        <div style={{ minWidth: "210px" }}>
          {[
            ["Purchase #", purchase.purchase_no || "-"],
            ["Date", displayDate(purchase.purchase_date)],
            ["Payment Type", purchase.payment_type || "-"],
            ["State of Supply", purchase.state_of_supply || "-"],
          ].map(([k, v]) => (
            <div
              key={k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "20px",
                padding: "2.5px 0",
              }}
            >
              <span style={{ ...LIGHT, textTransform: "none" }}>{k}</span>
              <span style={{ ...VAL, textAlign: "right" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── ITEMS TABLE ── */}
      <div style={{ padding: "18px 26px 8px" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "12.5px",
          }}
        >
          <thead>
            <tr>
              {["#", "ITEM", "HSN / CODE", "QTY", "RATE", "GST %", "DISCOUNT", "AMOUNT"].map(
                (h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: "9px 10px",
                      background: "#17243a",
                      color: "#ffffff",
                      fontSize: "10.5px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                      textAlign: i === 0 ? "center" : i === 7 ? "right" : "left",
                    }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  style={{ padding: "14px", textAlign: "center", color: "#94a3b8" }}
                >
                  No items
                </td>
              </tr>
            )}
            {items.map((it, i) => (
              <tr
                key={it.id || i}
                style={{
                  borderBottom: "1px solid #eef2f6",
                  background: i % 2 === 0 ? "#ffffff" : "#f8fafc",
                }}
              >
                <td style={{ padding: "9px 10px", textAlign: "center", color: "#64748b" }}>
                  {i + 1}
                </td>
                <td style={{ padding: "9px 10px", fontWeight: "600" }}>
                  {it.product_name || it.item || "-"}
                </td>
                <td style={{ padding: "9px 10px", color: "#64748b" }}>
                  {it.product_code || it.hsn || "-"}
                </td>
                <td style={{ padding: "9px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                  {Number(it.quantity || 0)} {it.unit === "NONE" ? "" : it.unit || ""}
                </td>
                <td style={{ padding: "9px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                  {fmtMoney(it.price)}
                </td>
                <td style={{ padding: "9px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                  {Number(it.gst_percentage || 0) > 0
                    ? Number(it.gst_percentage).toFixed(0) + "%"
                    : "-"}
                </td>
                <td style={{ padding: "9px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                  {Number(it.discount_amount || 0) > 0
                    ? fmtMoney(it.discount_amount)
                    : "-"}
                </td>
                <td
                  style={{
                    padding: "9px 10px",
                    textAlign: "right",
                    fontWeight: "700",
                    whiteSpace: "nowrap",
                  }}
                >
                  {fmtMoney(it.total_amount ?? it.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── TOTALS ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          padding: "10px 26px 20px",
        }}
      >
        <div style={{ width: "300px" }}>
          {[
            ["Sub Total", subTotal],
            ["Discount", discountTotal],
            ["GST Total", gstTotal],
            ["Round Off", roundOff],
          ].map(([k, v]) => (
            <div
              key={k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "5px 0",
                fontSize: "12.5px",
                color: "#334155",
              }}
            >
              <span>{k}</span>
              <span style={{ fontWeight: "600" }}>{fmtMoney(v)}</span>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 12px",
              marginTop: "6px",
              background: "#fef3c7",
              border: "1px solid #fcd34d",
              borderRadius: "8px",
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: "700", color: "#725331" }}>
              TOTAL
            </span>
            <span style={{ fontSize: "16px", fontWeight: "900", color: "#5f462d" }}>
              {fmtMoney(totalAmount)}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              marginTop: "10px",
            }}
          >
            <div
              style={{
                flex: 1,
                padding: "8px 12px",
                background: "#b8eee7",
                borderRadius: "8px",
              }}
            >
              <div style={{ fontSize: "10.5px", color: "#335c60", fontWeight: "600" }}>
                PAID
              </div>
              <div style={{ fontSize: "14px", fontWeight: "800", color: "#24515a" }}>
                {fmtMoney(paidAmount)}
              </div>
            </div>
            <div
              style={{
                flex: 1,
                padding: "8px 12px",
                background: "#fde8e8",
                borderRadius: "8px",
              }}
            >
              <div style={{ fontSize: "10.5px", color: "#9f1239", fontWeight: "600" }}>
                BALANCE
              </div>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: "800",
                  color: balanceAmount > 0 ? "#be123c" : "#047857",
                }}
              >
                {fmtMoney(balanceAmount)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── NOTES ── */}
      {(purchase.description || purchase.terms_conditions) && (
        <div
          style={{
            padding: "4px 26px 14px",
            borderTop: "1px dashed #e2e8f0",
            margin: "0 26px",
          }}
        >
          {purchase.description && (
            <div style={{ fontSize: "12px", color: "#475569", padding: "6px 0" }}>
              <span style={{ fontWeight: "700" }}>Description:</span>{" "}
              {purchase.description}
            </div>
          )}
          {purchase.terms_conditions && (
            <div style={{ fontSize: "12px", color: "#475569", padding: "6px 0" }}>
              <span style={{ fontWeight: "700" }}>Terms & Conditions:</span>{" "}
              {purchase.terms_conditions}
            </div>
          )}
        </div>
      )}

      {/* ── FOOTER ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "14px 26px 18px",
          borderTop: "2px solid #17243a",
          margin: "0 0 0",
          fontSize: "10.5px",
          color: "#94a3b8",
        }}
      >
        <span>
          {companyName} · Purchase #{purchase.purchase_no || "-"}
        </span>
        <span>Generated on {new Date().toLocaleDateString("en-IN")}</span>
      </div>
    </div>
  );
}