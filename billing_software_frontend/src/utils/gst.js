/**
 * THE single source of truth for GST maths in the frontend.
 *
 * Every billing screen (Sale Invoice, POS, Purchase Bill, Credit/Debit Note,
 * Estimate) must calculate through this module. Do not re-derive the formulas
 * inline - that is exactly what previously made POS and Sale Invoice disagree
 * about the same transaction.
 *
 * The backend mirror lives at
 *   billing_software_backend/app/Support/GstCalculator.php
 * and implements the same contract. Keep the two in sync.
 *
 * ── The two pricing modes ────────────────────────────────────────────────
 *
 * with_gst     the entered price ALREADY CONTAINS gst
 *              taxable = price / (1 + rate/100)
 *              gst     = price - taxable
 *              total   = price                  (entered value, unchanged)
 *
 * without_gst  the entered price is the taxable/base value
 *              taxable = price
 *              gst     = price * rate/100
 *              total   = taxable + gst
 *
 * ── Discount ordering ─────────────────────────────────────────────────────
 * Discount is applied BEFORE gst in both modes, matching the backend and the
 * standard Indian retail treatment. On a with_gst line a discount therefore
 * reduces the gst-inclusive amount and the embedded tax is re-derived from the
 * reduced figure.
 */

export const WITH_GST = "with_gst";
export const WITHOUT_GST = "without_gst";

/** Standard GST slabs, used by the rate shortcut buttons. */
export const GST_RATES = [0, 5, 12, 18, 28];

/**
 * Round to 2dp, half-up (away from zero), with a relative epsilon nudge.
 *
 * The nudge matters: 8333.28 / 1.28 is exactly 6510.375 in decimal, but lands
 * on 6510.374999999999... in binary, so a naive round would return 6510.37
 * while the PHP calculator returned 6510.38 and the invoice total disagreed
 * with the amount on screen by a rupee. Nudging the *scaled* value by 1e-6 is
 * far larger than the representation error (order 1e-10 at this magnitude) yet
 * far too small to move any value that is not already a half-way tie, so exact
 * ties consistently round up in both runtimes.
 *
 * Must stay byte-for-byte equivalent to round2() in app/Support/GstCalculator.php.
 */
export function round2(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const scaled = n * 100;
  const sign = scaled < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(scaled) + 1e-6)) / 100;
}

/**
 * Normalise the pricing mode. The app historically used with_tax/without_tax
 * (purchase_items.tax_mode) and with_gst/without_gst (companies.gst_type), so
 * all of those are accepted.
 *
 * Anything unrecognised - including null/undefined for a product that predates
 * the pricing-mode columns - falls back to WITHOUT_GST, which is how every
 * existing product has always been calculated.
 */
export function normalisePriceType(mode) {
  const m = String(mode ?? "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "_");

  if (
    [
      WITH_GST,
      "with_tax",
      "inclusive",
      "incl",
      "gst_included",
      "tax_included",
    ].includes(m)
  ) {
    return WITH_GST;
  }

  return WITHOUT_GST;
}

/**
 * Core line calculation. Everything in, money out, rounded to 2dp.
 *
 * @returns {{taxable:number, gst:number, total:number, discount:number, gross:number, rate:number, mode:string}}
 */
export function calculateLine({
  price = 0,
  quantity = 1,
  gstRate = 0,
  priceType = WITHOUT_GST,
  discount = 0,
  discountPercent = 0,
} = {}) {
  const mode = normalisePriceType(priceType);

  const p = Math.max(0, Number(price) || 0);
  const q = Math.max(0, Number(quantity) || 0);
  const rate = Math.max(0, Number(gstRate) || 0);
  const discPct = Math.max(0, Number(discountPercent) || 0);

  let disc = Number(discount) || 0;
  if (discPct > 0) {
    disc = p * q * (discPct / 100);
  }
  disc = Math.min(Math.max(0, disc), p * q);

  const gross = p * q;
  const afterDiscount = Math.max(0, gross - disc);

  let taxable;
  let gst;

  if (mode === WITH_GST) {
    // afterDiscount is the gst-INCLUSIVE figure, so derive the tax from it.
    const divisor = 1 + rate / 100;
    if (divisor <= 0) {
      taxable = round2(afterDiscount);
      gst = 0;
    } else {
      // Round the tax first and derive taxable from it so that
      // taxable + gst === total exactly (no stray paisa on the bill).
      gst = round2(afterDiscount - afterDiscount / divisor);
      taxable = round2(afterDiscount - gst);
    }
  } else {
    taxable = round2(afterDiscount);
    gst = round2(taxable * (rate / 100));
  }

  return {
    gross: round2(gross),
    discount: round2(disc),
    taxable,
    gst,
    total: round2(taxable + gst),
    rate,
    mode,
  };
}

/**
 * Resolve the price, gst rate and pricing mode for a product row coming from
 * the API. This is the only place a screen decides which product field feeds a
 * line, so sale and purchase can never diverge.
 *
 * A line-level override always wins; otherwise the product's saved
 * sale_price_type / purchase_price_type is used, and if neither is present the
 * product falls back to WITHOUT_GST exactly as it always has.
 *
 * The price falls back to the legacy `price` column, so products created
 * before sale_price/purchase_price existed keep working.
 *
 * @returns {{price:number, rate:number, priceType:string, gstRate:number, mode:string}}
 *   `rate` and `gstRate` are the same value; both names are returned so call
 *   sites can read naturally.
 */
export function resolveProductPricing(
  product,
  { rate, priceType, use = "sale" } = {}
) {
  const src = product || {};
  const fallbackType =
    use === "purchase"
      ? src.purchase_price_type
      : src.sale_price_type;

  // purchase_price is left at 0 on many existing rows, so treat it as "not set"
  // and fall back to the legacy `price` column.
  const rawPrice =
    use === "purchase" ? src.purchase_price || src.price : src.sale_price ?? src.price;

  const resolvedRate =
    rate === null || rate === undefined || rate === ""
      ? src.gst_percentage ?? src.gst ?? 0
      : rate;

  const resolvedType =
    priceType === null || priceType === undefined || priceType === ""
      ? fallbackType
      : priceType;

  const normalisedType = normalisePriceType(resolvedType);
  const numericRate = Number(resolvedRate) || 0;

  return {
    price: Number(rawPrice) || 0,
    rate: numericRate,
    gstRate: numericRate,
    priceType: normalisedType,
    mode: normalisedType,
  };
}

/**
 * Split a gst amount into CGST/SGST (intra-state) or IGST (inter-state).
 *
 * When the amount has an odd paisa the extra paisa goes to SGST so the parts
 * always sum back to the original gst figure.
 */
export function splitGst(gstAmount, interState = false) {
  const amount = round2(gstAmount);

  if (interState) {
    return { cgst: 0, sgst: 0, igst: amount };
  }

  const cgst = round2(amount / 2);
  return { cgst, sgst: round2(amount - cgst), igst: 0 };
}

/**
 * Sum a list of line results into document totals.
 * Accepts the output of calculateLine() (or anything with the same shape).
 */
export function sumLines(lines = []) {
  return lines.reduce(
    (acc, line) => {
      acc.gross += line.gross || 0;
      acc.discount += line.discount || 0;
      acc.taxable += line.taxable || 0;
      acc.gst += line.gst || 0;
      acc.total += line.total || 0;
      return acc;
    },
    { gross: 0, discount: 0, taxable: 0, gst: 0, total: 0 }
  );
}
