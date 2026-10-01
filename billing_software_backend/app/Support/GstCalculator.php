<?php

namespace App\Support;

use InvalidArgumentException;

/**
 * THE single source of truth for GST maths in the backend.
 *
 * Every place that needs to split a price into taxable value + GST must call
 * this class. Do not re-derive the formulas inline - that is what previously
 * made the Purchase / POS / Profit-Loss screens disagree with each other.
 *
 * The frontend mirror lives at
 *   billing_software_frontend/src/utils/gst.js
 * and implements the exact same contract. Keep the two in sync.
 *
 * ── The two pricing modes ────────────────────────────────────────────────
 *
 * "with_gst"    the entered price ALREADY CONTAINS gst.
 *               taxable = price / (1 + rate/100)
 *               gst     = price - taxable
 *               total   = price                       (the entered value, unchanged)
 *
 * "without_gst" the entered price is the taxable/base value.
 *               taxable = price
 *               gst     = price * rate/100
 *               total   = taxable + gst
 *
 * ── Discount ordering ─────────────────────────────────────────────────────
 * Discount is applied BEFORE GST in both modes, which is the standard Indian
 * retail treatment and matches the existing purchase behaviour. When a line is
 * "with_gst", a discount therefore reduces the GST-INCLUSIVE amount, and the
 * embedded tax is re-derived from the reduced inclusive figure.
 */
class GstCalculator
{
    public const WITH_GST = 'with_gst';
    public const WITHOUT_GST = 'without_gst';

    /**
     * Round to 2dp, half-up (away from zero), with a relative epsilon nudge.
     *
     * The nudge matters: 8333.28 / 1.28 is exactly 6510.375 in decimal, but
     * lands on 6510.374999999999... in binary, so a naive round() would return
     * 6510.37 while the JS calculator returned 6510.38 and the invoice total
     * disagreed with the amount on screen by a rupee. Nudging the *scaled*
     * value by 1e-6 is far larger than the representation error (order 1e-10 at
     * this magnitude) yet far too small to move any value that is not already
     * a half-way tie, so exact ties consistently round up in both runtimes.
     *
     * Must stay byte-for-byte equivalent to round2() in src/utils/gst.js.
     */
    public static function round2($value): float
    {
        $scaled = (float) $value * 100;
        if (!is_finite($scaled)) {
            return 0.0;
        }
        $sign = $scaled < 0 ? -1 : 1;

        return $sign * round(abs($scaled) + 1e-6, 0, PHP_ROUND_HALF_UP) / 100;
    }

    /**
     * Normalise the many spellings already present in this codebase.
     *
     * Historically the app used with_tax/without_tax (purchase_items.tax_mode)
     * and with_gst/without_gst (companies.gst_type). Anything unrecognised
     * falls back to WITHOUT_GST, which is the historical default and therefore
     * the behaviour every existing record was saved with.
     */
    public static function normaliseMode($mode): string
    {
        $m = strtolower(trim((string) $mode));
        $m = str_replace(['-', ' '], '_', $m);

        if (in_array($m, [self::WITH_GST, 'with_tax', 'inclusive', 'incl', 'gst_included', 'tax_included'], true)) {
            return self::WITH_GST;
        }

        return self::WITHOUT_GST;
    }

    /**
     * Core line calculation. All money in, money out, rounded to 2dp.
     *
     * @param  float  $price    entered unit price
     * @param  float  $quantity quantity
     * @param  float  $gstRate  gst percentage, e.g. 18 for 18%
     * @param  string $mode     with_gst | without_gst
     * @param  float  $discount flat discount amount for the whole line
     * @param  float  $discountPercent discount percentage for the whole line
     * @return array{taxable: float, gst: float, total: float, discount: float, gross: float}
     */
    public static function calculateLine(
        $price,
        $quantity = 1,
        $gstRate = 0,
        $mode = self::WITHOUT_GST,
        $discount = 0,
        $discountPercent = 0
    ): array {
        $price       = (float) $price;
        $quantity    = (float) $quantity;
        $gstRate     = (float) $gstRate;
        $discount    = (float) $discount;
        $mode        = self::normaliseMode($mode);
        $discountPct = (float) $discountPercent;

        if ($quantity < 0) {
            $quantity = 0;
        }
        if ($gstRate < 0) {
            $gstRate = 0;
        }

        $gross = $price * $quantity;

        // A percentage discount wins over a flat amount, matching the existing
        // purchase behaviour (a supplied percent overrides the flat amount
        // rather than being added to it).
        if ($discountPct > 0) {
            $discount = $gross * ($discountPct / 100);
        }
        if ($discount < 0) {
            $discount = 0;
        }

        // Never let a discount exceed the line value.
        if ($discount > $gross) {
            $discount = $gross;
        }

        $afterDiscount = max(0.0, $gross - $discount);

        if ($mode === self::WITH_GST) {
            // $afterDiscount is the GST-INCLUSIVE figure, so derive the tax.
            $divisor = 1 + ($gstRate / 100);

            if ($divisor <= 0) {
                // Defensive: a 100%+ negative rate would divide by zero.
                $taxable = $afterDiscount;
                $gst     = 0.0;
            } else {
                // Round the tax first, then derive taxable from it so that
                // taxable + gst === total exactly (no stray paisa on the bill).
                $gst     = self::round2($afterDiscount - ($afterDiscount / $divisor));
                $taxable = self::round2($afterDiscount - $gst);
            }

            $total = self::round2($taxable + $gst);
        } else {
            $taxable = self::round2($afterDiscount);
            $gst     = self::round2($taxable * ($gstRate / 100));
            $total   = self::round2($taxable + $gst);
        }

        return [
            'gross'    => self::round2($gross),
            'discount' => self::round2($discount),
            'taxable'  => $taxable,
            'gst'      => $gst,
            'total'    => $total,
            'mode'     => $mode,
            'rate'     => $gstRate,
        ];
    }

    /**
     * Resolve the price, GST rate and pricing mode for a product.
     *
     * Line-level overrides always win; otherwise the product's saved
     * configuration is used. A product with no saved mode (i.e. every product
     * created before this feature) falls back to WITHOUT_GST, which is exactly
     * how it was always calculated.
     *
     * $use must be 'sale' or 'purchase'. It is required rather than defaulted
     * because a product can legitimately be saved with different modes for each
     * (e.g. sale_price_type=with_gst, purchase_price_type=without_gst), so
     * guessing here would silently bill the wrong side.
     *
     * @param  \Illuminate\Database\Eloquent\Model|array|null $product
     * @param  float|string|null                                $overrideRate
     * @param  string|null                                      $overrideMode
     * @param  string                                           $use 'sale'|'purchase'
     * @return array{price: float, rate: float, mode: string, priceType: string}
     */
    public static function resolveFromProduct($product, $overrideRate = null, $overrideMode = null, string $use = 'sale'): array
    {
        $get = static function ($key) use ($product) {
            if (is_array($product)) {
                return $product[$key] ?? null;
            }

            return $product->{$key} ?? null;
        };

        $rate = $overrideRate;
        if ($rate === null || $rate === '') {
            $rate = $get('gst_percentage') ?? $get('gst') ?? 0;
        }

        $mode = $overrideMode;
        if ($mode === null || $mode === '') {
            $mode = $use === 'purchase'
                ? ($get('purchase_price_type') ?? self::WITHOUT_GST)
                : ($get('sale_price_type') ?? self::WITHOUT_GST);
        }

        // purchase_price is left at 0 on many existing rows, so treat that as
        // "not set" and fall back to the legacy `price` column.
        $rawPrice = $use === 'purchase'
            ? ($get('purchase_price') ?: $get('price'))
            : ($get('sale_price') ?? $get('price'));

        $normalisedMode = self::normaliseMode($mode);
        $numericRate = (float) $rate;

        return [
            'price'     => (float) ($rawPrice ?: 0),
            'rate'      => $numericRate,
            'gstRate'   => $numericRate,
            'mode'      => $normalisedMode,
            'priceType' => $normalisedMode,
        ];
    }

    /**
     * Split a GST amount into CGST/SGST (intra-state) or IGST (inter-state).
     *
     * @param  float  $gstAmount total gst for the line/document
     * @param  bool   $interState true when buyer and seller are in different states
     */
    public static function splitGst($gstAmount, bool $interState = false): array
    {
        $gstAmount = self::round2($gstAmount);

        if ($interState) {
            return [
                'cgst' => 0.0,
                'sgst' => 0.0,
                'igst' => $gstAmount,
            ];
        }

        // Round each half, then give the odd paisa to SGST so the three always
        // sum back to the original GST amount.
        $cgst = self::round2($gstAmount / 2);
        $sgst = self::round2($gstAmount - $cgst);

        return [
            'cgst' => $cgst,
            'sgst' => $sgst,
            'igst' => 0.0,
        ];
    }
}
