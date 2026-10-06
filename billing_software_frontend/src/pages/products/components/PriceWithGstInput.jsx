import { useMemo } from "react";
import { calculateLine, round2, normalisePriceType } from "../../../utils/gst";

/**
 * A price field with a "With GST / Without GST" mode selector.
 *
 * The entered number is always the SOURCE price - it is never rewritten when
 * the GST rate or the mode changes. It is interpreted as either an
 * inclusive (with_gst) or exclusive (without_gst) figure, and the live preview
 * below shows what the billing screens will actually do with it.
 *
 * Shared by AddProductModal, ProductForm and EditProduct so the control looks
 * and behaves identically everywhere.
 */
const INPUT_CLS =
  "w-full pl-8 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all";

const SELECT_CLS =
  "w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[11.5px] font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all cursor-pointer";

export default function PriceWithGstInput({
  label,
  value,
  onChange,
  priceType,
  onPriceTypeChange,
  gstRate = 0,
  required = false,
  hint,
  // Lets a form that uses its own CSS convention (e.g. EditProduct's "ep-*"
  // classes) reuse this control without forking the markup.
  labelClassName = "block text-[11.5px] font-semibold text-slate-700 mb-1.5",
  inputClassName = INPUT_CLS,
  selectClassName = SELECT_CLS,
  wrapClassName = "relative",
  prefixClassName = "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs",
  prefix = "₹",
}) {
  const mode = normalisePriceType(priceType);

  // Derived purely from the current inputs, so it always reflects the
  // selected mode and rate without touching the entered price.
  const preview = useMemo(() => {
    const amount = Number(value);
    if (!amount || amount <= 0 || !gstRate || Number(gstRate) <= 0) return null;
    return calculateLine({
      price: amount,
      quantity: 1,
      gstRate: Number(gstRate),
      priceType: mode,
    });
  }, [value, gstRate, mode]);

  const isWithGst = mode === "with_gst";

  return (
    <div>
      <label className={labelClassName}>
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>

      {/* Mode selector - independent per price, so sale and purchase can
          legitimately be configured differently. */}
      <select
        className={`${selectClassName} mb-1.5`}
        value={mode}
        onChange={(e) => onPriceTypeChange?.(e.target.value)}
        aria-label={`${label} GST mode`}
      >
        <option value="with_gst">With GST</option>
        <option value="without_gst">Without GST</option>
      </select>

      <div className={wrapClassName}>
        <div className={prefixClassName}>{prefix}</div>
        <input
          type="number"
          step="any"
          min="0"
          className={inputClassName}
          placeholder="0.00"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
        />
      </div>

      {/* Live read-out of what the billing screens will produce. */}
      {preview ? (
        <div className="mt-1.5 text-[10.5px] leading-snug text-slate-500">
          {isWithGst ? (
            <>
              Inclusive of {gstRate}% GST → base{" "}
              <span className="font-bold text-slate-700">
                ₹{preview.taxable.toFixed(2)}
              </span>{" "}
              + GST{" "}
              <span className="font-bold text-slate-700">
                ₹{preview.gst.toFixed(2)}
              </span>
            </>
          ) : (
            <>
              Base ₹{preview.taxable.toFixed(2)} + GST{" "}
              <span className="font-bold text-slate-700">
                ₹{preview.gst.toFixed(2)}
              </span>{" "}
              ={" "}
              <span className="font-bold text-slate-700">
                ₹{preview.total.toFixed(2)}
              </span>
            </>
          )}
        </div>
      ) : hint ? (
        <div className="mt-1.5 text-[10.5px] leading-snug text-slate-400">
          {hint}
        </div>
      ) : null}
    </div>
  );
}
