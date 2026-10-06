import { useEffect, useState } from "react";
import api from "../../services/api";
import PriceWithGstInput from "./components/PriceWithGstInput";
import { normalisePriceType } from "../../utils/gst";
import { PackagePlus, Package, Scale, Percent, ChevronDown, X, AlertCircle, RefreshCw, Plus } from "lucide-react";

/**
 * POS "Quick Add" popup - the reduced Add Product form the cashier sees when a
 * searched product does not exist in the catalog.
 *
 * It is a PRESENTATION-ONLY subset of AddProductModal: same modal shell, same
 * shared controls (PriceWithGstInput), same GST rate / unit options and the
 * exact same POST /product/add payload, so a product created here is
 * indistinguishable from one created on the full Add Product page.
 *
 * The full Add Product page is untouched - this file adds no fields to it and
 * changes nothing about how it validates or saves.
 */

/* Same option lists the full Add Product form uses, so a product configured
   here is configured exactly like one configured there. */
const COMMON_GST_RATES = ["0", "5", "12", "18", "28"];

const UNITS = [
  "Piece",
  "Kg",
  "Gram",
  "Litre",
  "ML",
  "Meter",
  "Feet",
  "Box",
  "Pack",
  "Dozen",
  "Pair",
  "Roll",
  "Bag",
  "Bottle",
  "Can",
  "Set",
  "Quintal",
  "Ton",
];

const EMPTY_FORM = {
  name: "",
  sale_price: "",
  sale_price_type: "without_gst",
  purchase_price: "",
  purchase_price_type: "without_gst",
  gst: "",
  unit: "",
};

export default function QuickAddProductModal({
  isOpen,
  onClose,
  initialProductName = "",
  companyId,
  onProductAdded,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (field, val) => {
    setForm((p) => ({ ...p, [field]: val }));
    setError("");
  };

  /* The searched text the cashier typed is carried straight into Product Name so
     they never have to retype it. Mirrors AddProductModal's reset-on-open. */
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const initialize = async () => {
      if (cancelled) return;
      setForm({ ...EMPTY_FORM, name: initialProductName || "" });
      setSaving(false);
      setError("");
    };

    initialize();

    return () => {
      cancelled = true;
    };
  }, [isOpen, initialProductName]);

  const resolvedCompanyId = Number(companyId || localStorage.getItem("selected_company_id")) || 0;
  const gstRate = form.gst === "" ? 0 : Number(form.gst) || 0;
  const gstEnabled = gstRate > 0;

  const handleSubmit = async () => {
    if (saving) return;

    if (!form.name.trim()) {
      setError("Product name is required.");
      return;
    }
    if (form.sale_price === "" || String(form.sale_price).trim() === "") {
      setError("Sale price is required.");
      return;
    }
    if (isNaN(Number(form.sale_price)) || Number(form.sale_price) < 0) {
      setError("Please enter a valid sale price.");
      return;
    }
    if (String(form.purchase_price).trim() !== "" && (isNaN(Number(form.purchase_price)) || Number(form.purchase_price) < 0)) {
      setError("Please enter a valid purchase price.");
      return;
    }
    if (!form.unit.trim()) {
      setError("Unit is required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      // Same payload shape the full Add Product form posts to /product/add.
      const payload = {
        product_name: form.name.trim(),
        product_code: "",
        category_id: 0,
        subcategory_id: 0,
        brand_id: 0,
        company_id: resolvedCompanyId,
        price: Number(form.sale_price || 0),
        sale_price: Number(form.sale_price || 0),
        sale_price_type: normalisePriceType(form.sale_price_type),
        purchase_price: form.purchase_price || 0,
        purchase_price_type: normalisePriceType(form.purchase_price_type),
        stock: 0,
        gst_percentage: gstEnabled ? gstRate : 0,
        gst_enabled: gstEnabled,
        barcode: "",
        unit: form.unit.trim(),
        supplier_id: 0,
      };

      const res = await api.post("/product/add", payload);

      if (!res.data?.status) {
        // Keep the popup open so the cashier can correct and retry.
        setError(res.data?.message || "Unable to save the product. Please try again.");
        return;
      }

      onProductAdded?.(res.data.data);
      onClose?.();
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Unable to connect to server. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose?.();
      }}
      className="fixed inset-0 z-[10000] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col font-['Plus_Jakarta_Sans',sans-serif] max-h-[90vh] transition-all animate-in zoom-in-95 duration-200">
        {/* ── HEADER ── */}
        <div className="px-6 sm:px-7 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-slate-50/70 to-white flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
              <PackagePlus size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Add Product to Inventory
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Save the searched item so it is available on every future bill
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── BODY ── */}
        <div className="px-6 sm:px-7 py-6 overflow-y-auto flex-1 space-y-5">
          {/* Product Name */}
          <div>
            <label className="block text-[11.5px] font-semibold text-slate-700 mb-1.5">
              Product Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Package size={15} />
              </div>
              <input
                type="text"
                className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all"
                placeholder="e.g. Bisleri Mineral Water 1L"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {/* Sale / Purchase Price - same shared control the Add Product form uses,
              so the With/Without GST mode and its live preview behave identically. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PriceWithGstInput
              label="Sale Price (₹)"
              required
              value={form.sale_price}
              onChange={(v) => set("sale_price", v)}
              priceType={form.sale_price_type}
              onPriceTypeChange={(v) => set("sale_price_type", v)}
              gstRate={gstRate}
            />

            <PriceWithGstInput
              label="Purchase Price (₹)"
              value={form.purchase_price}
              onChange={(v) => set("purchase_price", v)}
              priceType={form.purchase_price_type}
              onPriceTypeChange={(v) => set("purchase_price_type", v)}
              gstRate={gstRate}
            />
          </div>

          {/* GST Tax Rate / Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1.5">
                GST Tax Rate
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Percent size={14} />
                </div>
                <select
                  className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all appearance-none cursor-pointer"
                  value={form.gst}
                  onChange={(e) => set("gst", e.target.value)}
                >
                  <option value="">None</option>
                  {COMMON_GST_RATES.filter((r) => r !== "0").map((rate) => (
                    <option key={rate} value={rate}>
                      {rate}%
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1.5">
                Unit <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Scale size={14} />
                </div>
                <select
                  className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all appearance-none cursor-pointer"
                  value={form.unit}
                  onChange={(e) => set("unit", e.target.value)}
                >
                  <option value="">Select Unit</option>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
              <AlertCircle size={14} className="mt-px flex-shrink-0" />
              <span className="leading-snug">{error}</span>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="px-6 sm:px-7 py-4 bg-slate-50/90 border-t border-slate-200/80 flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-200 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Plus size={15} strokeWidth={2.5} /> Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
