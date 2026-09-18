import { useState, useEffect } from "react";
import api from "../../services/api";
import {
  Package,
  Pencil,
  X,
  IndianRupee,
  Boxes,
  Tag,
  Hash,
  Scale,
  Percent,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
} from "lucide-react";

function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = (type, title, msg) => {
    const id = Date.now();
    setToasts((p) => [...p, { id, type, title, msg }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3600);
  };
  const remove = (id) => setToasts((p) => p.filter((t) => t.id !== id));
  return { toasts, show, remove };
}

function ToastPortal({ toasts, remove }) {
  return (
    <div className="fixed top-5 right-5 z-[99999] flex flex-col gap-2.5 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 min-w-[280px] max-w-[380px] px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-4 duration-200 border ${
            t.type === "success"
              ? "bg-slate-900/90 border-emerald-500/40 text-white"
              : t.type === "error"
              ? "bg-red-950/90 border-red-500/40 text-white"
              : "bg-amber-950/90 border-amber-500/40 text-white"
          }`}
        >
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${
              t.type === "success"
                ? "bg-emerald-500 text-white"
                : t.type === "error"
                ? "bg-red-500 text-white"
                : "bg-amber-500 text-white"
            }`}
          >
            {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "!"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold leading-tight">{t.title}</p>
            {t.msg && <p className="text-[11px] opacity-80 mt-0.5 leading-snug">{t.msg}</p>}
          </div>
          <button
            onClick={() => remove(t.id)}
            className="text-white/60 hover:text-white text-xs p-1 cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

export default function EditProductModal({ isOpen, onClose, product, onProductUpdated }) {
  const { toasts, show, remove } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [form, setForm] = useState({ stock: "", price: "" });

  const set = (field, val) => setForm((p) => ({ ...p, [field]: val }));

  useEffect(() => {
    if (isOpen && product) {
      setForm({
        stock: product.stock ?? "",
        price: product.price ?? product.sale_price ?? "",
      });
      setFetching(false);
    }
  }, [isOpen, product]);

  const handleUpdate = async () => {
    if (!form.stock && form.stock !== 0) {
      show("warn", "Missing Field", "Stock quantity is required.");
      return;
    }
    if (isNaN(Number(form.stock)) || Number(form.stock) < 0) {
      show("warn", "Invalid Stock", "Please enter a valid stock quantity.");
      return;
    }
    if (form.price && (isNaN(Number(form.price)) || Number(form.price) < 0)) {
      show("warn", "Invalid Price", "Please enter a valid price.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/product/update", {
        id: product.id,
        product_name: product.product_name,
        product_code: product.product_code || "",
        category_id: product.category_id || 0,
        subcategory_id: product.subcategory_id || 0,
        brand_id: product.brand_id || 0,
        supplier_id: product.supplier_id || 0,
        company_id: product.company_id,
        price: form.price || product.price || 0,
        stock: form.stock,
        gst_percentage: product.gst_percentage || 0,
        barcode: product.barcode || "",
        unit: product.unit || "",
        sale_price: product.sale_price || 0,
        purchase_price: product.purchase_price || 0,
      });
      if (res.data.status) {
        show("success", "Product Updated!", `"${product.product_name}" updated successfully.`);
        setTimeout(() => {
          onProductUpdated && onProductUpdated();
          onClose();
        }, 800);
      } else {
        show("error", "Update Failed", res.data.message || "Something went wrong.");
      }
    } catch (err) {
      console.error(err);
      show("error", "Server Error", "Unable to reach server. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  return (
    <>
      <ToastPortal toasts={toasts} remove={remove} />

      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-['Plus_Jakarta_Sans',sans-serif] animate-in fade-in duration-200"
      >
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-slate-50/70 to-white flex-shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                <Pencil size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">Edit Product</h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[280px]">
                  Update quantity and rate for <span className="font-semibold text-slate-700">{product.product_name}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Close"
            >
              <X size={19} />
            </button>
          </div>

          {/* Form Body */}
          <div className="p-6 space-y-5">
            {/* Product Quick Info Card */}
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/70 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Package size={15} className="text-indigo-600" />
                <span className="truncate">{product.product_name}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60">
                <div>
                  <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider block">HSN Code</span>
                  <span className="text-xs font-bold text-slate-700 font-mono">{product.product_code || "-"}</span>
                </div>
                <div>
                  <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider block">Unit</span>
                  <span className="text-xs font-bold text-slate-700">{product.unit || "PCS"}</span>
                </div>
                <div>
                  <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider block">GST Rate</span>
                  <span className="text-xs font-bold text-slate-700">{product.gst_percentage || 0}%</span>
                </div>
              </div>
            </div>

            {/* Inputs: Stock & Price */}
            <div>
              <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span>Stock & Pricing</span>
                <span className="flex-1 h-px bg-indigo-50" />
              </p>
              <div className="grid grid-cols-2 gap-4">
                {/* Quantity / Stock */}
                <div>
                  <label className="block text-[11.5px] font-semibold text-slate-700 mb-1.5">
                    Quantity (Stock) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Boxes size={15} />
                    </div>
                    <input
                      type="number"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all"
                      placeholder="0"
                      value={form.stock}
                      onChange={(e) => set("stock", e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>

                {/* Rate / Price */}
                <div>
                  <label className="block text-[11.5px] font-semibold text-slate-700 mb-1.5">
                    Rate / Price (₹)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                      <IndianRupee size={14} />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all"
                      placeholder="0.00"
                      value={form.price}
                      onChange={(e) => set("price", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50/90 border-t border-slate-200/80 flex items-center justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpdate}
              disabled={loading || fetching}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save size={14} />
                  Update Product
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
