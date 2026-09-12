import { getInvoiceLogoUrl } from "../../../utils/invoiceShare";
import { numberToWordsINR } from "../../../utils/numberToWords";

/*
 * Renders a real Expense voucher document from the expense record returned by
 * /expense/get_by_id (expense + items saved as JSON/array + company details).
 *
 * This is the expense counterpart of PurchaseDocument.jsx. All styles are
 * inline so the exact same node can be printed through a hidden iframe
 * (printElement) or captured to PDF with html2pdf without any stylesheet
 * dependency.
 */

const fmtMoney = (v) =>
  "₹" +
  Number(v || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const displayDate = (val) => {
  if (!val) return "-";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

/* items is stored as a JSON string by the backend — always normalise to array */
const parseItems = (value) => {
  if (Array.isArray(value)) return value;
  try {
    const parsed =
      typeof value === "string" ? JSON.parse(value || "[]") : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const LIGHT = {
  color: "#6b7280",
  fontSize: "11px",
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const VAL = {
  color: "#111827",
  fontSize: "13px",
  fontWeight: "700",
};

export default function ExpenseDocument({ expense, company }) {
  if (!expense) return null;

  const items = parseItems(expense.items);

  const companyName =
    company?.company_name || company?.business_name || company?.name || "Company";
  const companyAddress = company?.company_address || company?.address || "";
  const companyPhone = company?.phone || company?.mobile || "";
  const companyGstin = company?.gstin || company?.gst_number || "";

  const logo = company?.logo ? getInvoiceLogoUrl(company.logo) : null;

  const subTotal = Number(expense.sub_total || 0);
  const taxTotal = Number(expense.tax_total || 0);
  const discountTotal = Number(expense.discount_total || 0);
  const roundOff = Number(expense.round_off || 0);
  const totalAmount = Number(expense.total_amount || 0);
  const paidAmount = Number(expense.paid_amount || 0);
  const balanceAmount = Number(expense.balance_amount || 0);

  return (
    <div
      id="expense-document"
      style={{
        background: "#ffffff",
        color: "#111827",
        fontFamily: "Arial, Helvetica, sans-serif",
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
          borderBottom: "2px solid #111827",
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
                  color: "#4b5563",
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
                <span style={{ fontSize: "12px", color: "#374151" }}>
                  GSTIN: <strong>{companyGstin}</strong>
                </span>
              )}
              {companyPhone && (
                <span style={{ fontSize: "12px", color: "#374151" }}>
                  Ph: <strong>{companyPhone}</strong>
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: "19px",
              fontWeight: "900",
              color: "#111827",
              letterSpacing: "0.02em",
            }}
          >
            EXPENSE VOUCHER
          </div>
        </div>
      </div>
{/* ── PARTY + EXPENSE INFO ── */}
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
          <div style={{ ...LIGHT, marginBottom: "5px" }}>Expense For</div>
          <div style={{ fontSize: "14px", fontWeight: "800" }}>
            {expense.party_name || expense.category_name || "-"}
          </div>
          {expense.party_phone && (
            <div style={{ fontSize: "12px", color: "#4b5563", marginTop: "2px" }}>
              Ph: {expense.party_phone}
            </div>
          )}
        </div>

        <div style={{ minWidth: "210px" }}>
          {[
            ["Expense #", expense.expense_no || `#${expense.id}`],
            ["Date", displayDate(expense.expense_date)],
            ["Category", expense.category_name || "-"],
            ["Payment Type", expense.payment_type || "Cash"],
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
              {["#", "ITEM", "QTY", "RATE", "AMOUNT"].map((h, i) => (
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
                    textAlign:
                      i === 0 ? "center" : i === 4 ? "right" : "left",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: "14px",
                    textAlign: "center",
                    color: "#94a3b8",
                  }}
                >
                  No items recorded
                </td>
              </tr>
            )}
            {items.map((it, i) => {
              const name = it.item_name || it.name || "-";
              const qty = Number(it.quantity ?? it.qty ?? 0);
              const price = Number(it.unit_price ?? it.price ?? 0);
              const amount =
                Number(it.amount ?? it.total_amount ?? "") || qty * price;
              return (
                <tr
                  key={it.id || i}
                  style={{
                    borderBottom: "1px solid #eef2f6",
                    background: i % 2 === 0 ? "#ffffff" : "#f8fafc",
                  }}
                >
                  <td
                    style={{
                      padding: "9px 10px",
                      textAlign: "center",
                      color: "#64748b",
                    }}
                  >
                    {i + 1}
                  </td>
                  <td style={{ padding: "9px 10px", fontWeight: "600" }}>
                    {name}
                  </td>
                  <td
                    style={{
                      padding: "9px 10px",
                      textAlign: "right",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {Number.isNaN(qty) ? 0 : qty}
                  </td>
                  <td
                    style={{
                      padding: "9px 10px",
                      textAlign: "right",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fmtMoney(price)}
                  </td>
                  <td
                    style={{
                      padding: "9px 10px",
                      textAlign: "right",
                      fontWeight: "700",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fmtMoney(amount)}
                  </td>
                </tr>
              );
            })}
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
            ["Sub Total", fmtMoney(subTotal)],
            ["Tax", taxTotal ? fmtMoney(taxTotal) : "-"],
            ["Discount", discountTotal ? fmtMoney(discountTotal) : "-"],
            ["Round Off", roundOff ? fmtMoney(roundOff) : "-"],
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
              <span style={{ fontWeight: "600" }}>{v}</span>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 0",
              background: "#fef3c7",
              border: "1px solid #fcd34d",
              borderRadius: "8px",
              marginTop: "4px",
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: "700", color: "#725331" }}>
              TOTAL
            </span>
            <span style={{ fontSize: "16px", fontWeight: "900", color: "#5f462d" }}>
              {fmtMoney(totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {[
        { label: "PAID", value: paidAmount, bg: "#d1fae5", color: "#136a3a" },
        {
          label: "BALANCE",
          value: balanceAmount,
          bg: "#fee2e2",
          color: balanceAmount > 0 ? "#b91c1c" : "#047857",
        },
      ].map((box) => (
        <div
          key={box.label}
          style={{
            display: "inline-block",
            padding: "6px 14px",
            margin: "6px",
            borderRadius: "8px",
            background: box.bg,
          }}
        >
          <div style={{ fontSize: "10.5px", fontWeight: "600", color: box.color }}>
            {box.label}
          </div>
          <div style={{ fontSize: "14px", fontWeight: "800", color: box.color }}>
            {fmtMoney(box.value)}
          </div>
        </div>
      ))}

      {/* ── AMOUNT IN WORDS ── */}
      <div
        style={{
          padding: "9px 26px",
          background: "#f9fafb",
          border: "1px dashed #d1d5db",
          borderRadius: "8px",
          fontSize: "12px",
          color: "#374151",
        }}
      >
        <span style={{ fontWeight: "700" }}>
          Amount in Words :&nbsp;
        </span>
        {numberToWordsINR(totalAmount)}
      </div>

      {/* ── DESCRIPTION ── */}
      {expense.description && (
        <div
          style={{
            padding: "6px 26px 10px",
            marginTop: "6px",
            fontSize: "12px",
            color: "#475569",
            borderTop: "1px dashed #e2e8f0",
          }}
        >
          <span style={{ fontWeight: "700" }}>Description:</span>{" "}
          {expense.description}
        </div>
      )}

      {/* ── FOOTER ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "14px 26px 18px",
          borderTop: "2px solid #111827",
          margin: "0 0 0",
          fontSize: "10.5px",
          color: "#94a3b8",
        }}
      >
        <span>
          {companyName} · Expense #{expense.expense_no || expense.id || "-"}
        </span>
        <span>Generated on {new Date().toLocaleDateString("en-IN")}</span>
      </div>
    </div>
  );
}