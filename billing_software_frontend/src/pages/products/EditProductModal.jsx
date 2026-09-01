import { useState, useEffect } from "react";
import api from "../../services/api";

function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = (type, title, msg) => {
    const id = Date.now();
    setToasts(p => [...p, { id, type, title, msg }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3600);
  };
  const remove = id => setToasts(p => p.filter(t => t.id !== id));
  return { toasts, show, remove };
}

function ToastPortal({ toasts, remove }) {
  return (
    <div style={{ position: "fixed", top: 22, right: 22, zIndex: 99999, display: "flex", flexDirection: "column", gap: 9, pointerEvents: "none" }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          pointerEvents: "auto", display: "flex", alignItems: "center", gap: 11,
          minWidth: 280, maxWidth: 360, padding: "12px 15px", borderRadius: 15,
          position: "relative", overflow: "hidden", boxShadow: "0 8px 28px rgba(0,0,0,0.12)",
          animation: "epmToastIn 0.4s cubic-bezier(0.22,1,0.36,1) both",
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          background: t.type === "success" ? "#f0fdf4" : t.type === "error" ? "#fff1f2" : "#fffbeb",
          border: `1px solid ${t.type === "success" ? "#bbf7d0" : t.type === "error" ? "#fecdd3" : "#fde68a"}`
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 800, flexShrink: 0,
            background: t.type === "success" ? "#dcfce7" : t.type === "error" ? "#ffe4e6" : "#fef9c3",
            color: t.type === "success" ? "#16a34a" : t.type === "error" ? "#e11d48" : "#b45309"
          }}>
            {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "!"}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{
              fontSize: 13, fontWeight: 700, margin: "0 0 2px",
              color: t.type === "success" ? "#15803d" : t.type === "error" ? "#be123c" : "#92400e"
            }}>{t.title}</p>
            {t.msg && <p style={{
              fontSize: 12, margin: 0,
              color: t.type === "success" ? "#16a34a" : t.type === "error" ? "#e11d48" : "#b45309"
            }}>{t.msg}</p>}
          </div>
          <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, opacity: 0.4, flexShrink: 0, padding: 2 }} onClick={() => remove(t.id)}>✕</button>
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

  const set = (field, val) => setForm(p => ({ ...p, [field]: val }));

  useEffect(() => {
    if (isOpen && product) {
      setForm({
        stock: product.stock ?? "",
        price: product.price ?? product.sale_price ?? ""
      });
      setFetching(false);
    }
  }, [isOpen, product]);

  const handleUpdate = async () => {
    if (!form.stock && form.stock !== 0) { show("warn", "Missing Field", "Stock quantity is required."); return; }
    if (isNaN(Number(form.stock)) || Number(form.stock) < 0) { show("warn", "Invalid Stock", "Please enter a valid stock quantity."); return; }
    if (form.price && (isNaN(Number(form.price)) || Number(form.price) < 0)) { show("warn", "Invalid Price", "Please enter a valid price."); return; }

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
        purchase_price: product.purchase_price || 0
      });
      if (res.data.status) {
        show("success", "Product Updated!", `"${product.product_name}" updated successfully.`);
        setTimeout(() => {
          onProductUpdated && onProductUpdated();
          onClose();
        }, 1000);
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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes epmPopIn { from{opacity:0;transform:scale(.94) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes epmToastIn { from{opacity:0;transform:translateX(60px) scale(0.9)} to{opacity:1;transform:translateX(0) scale(1)} }
        @keyframes epmSpin { to{transform:rotate(360deg)} }
        .epm-input:focus { border-color:#3b82f6 !important; background:#fff !important; box-shadow:0 0 0 4px rgba(59,130,246,0.1) !important; }
        .epm-submit:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 10px 28px rgba(37,99,235,0.45) !important; }
        .epm-close:hover { background:#f1f5f9 !important; }
      `}</style>

      <ToastPortal toasts={toasts} remove={remove} />

      <div
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(15,23,42,.55)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20
        }}
      >
        <div style={{
          background: "#fff", borderRadius: 20, width: "100%", maxWidth: 440,
          maxHeight: "88vh", display: "flex", flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15)",
          animation: "epmPopIn .25s cubic-bezier(.34,1.56,.64,1)", overflow: "hidden"
        }}>

          {/* Header */}
          <div style={{
            padding: "18px 24px", borderBottom: "1px solid #e2e8f0",
            background: "linear-gradient(135deg, #eff6ff, #dbeafe)", flexShrink: 0,
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, background: "rgba(37,99,235,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20
              }}>✏️</div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Edit Product</h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
                  Update quantity and rate for <strong>{product.product_name}</strong>
                </p>
              </div>
            </div>
            <button className="epm-close" onClick={onClose} style={{
              border: "none", background: "#f1f5f9", color: "#475569",
              padding: "8px 14px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer"
            }}>✕ Close</button>
          </div>

          {/* Body */}
          <div style={{ padding: "20px 24px" }}>

            <p style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#3b82f6", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
              Quantity & Rate <span style={{ flex: 1, height: 1, background: "#e8f0fe" }} />
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94a3b8", marginBottom: 6 }}>
                  Quantity (Stock) <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="number"
                  className="epm-input"
                  placeholder="0"
                  value={form.stock}
                  onChange={e => set("stock", e.target.value)}
                  style={{
                    width: "100%", padding: "12px 14px", borderRadius: 10,
                    border: "1.5px solid #e2e8f0", background: "#f8faff", outline: "none",
                    fontSize: 16, fontWeight: 700, boxSizing: "border-box", transition: "all 0.22s"
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94a3b8", marginBottom: 6 }}>
                  Rate / Price (₹)
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{
                    position: "absolute", left: 0, top: 0, bottom: 0, width: 36,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    borderRight: "1.5px solid #e2e8f0", borderRadius: "10px 0 0 10px",
                    background: "#f1f5f9", fontSize: 13, fontWeight: 700, color: "#64748b"
                  }}>₹</span>
                  <input
                    type="number"
                    className="epm-input"
                    placeholder="0.00"
                    value={form.price}
                    onChange={e => set("price", e.target.value)}
                    style={{
                      width: "100%", padding: "12px 14px 12px 44px", borderRadius: 10,
                      border: "1.5px solid #e2e8f0", background: "#f8faff", outline: "none",
                      fontSize: 16, fontWeight: 700, boxSizing: "border-box", transition: "all 0.22s"
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Product summary */}
            <div style={{
              marginTop: 18, padding: "12px 16px", borderRadius: 10,
              background: "#f8fafc", border: "1px solid #f1f5f9"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>HSN Code</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>{product.product_code || "-"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>Unit</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>{product.unit || "-"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>GST</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>{product.gst_percentage || 0}%</span>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div style={{ padding: "14px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", gap: 10, flexShrink: 0 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: "12px", borderRadius: 10, border: "1.5px solid #cbd5e1",
              background: "#fff", color: "#475569", fontWeight: 600, fontSize: 14, cursor: "pointer"
            }}>Cancel</button>
            <button className="epm-submit" onClick={handleUpdate} disabled={loading || fetching} style={{
              flex: 2, padding: "12px", borderRadius: 10, border: "none",
              background: loading ? "#94a3b8" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
              color: "#fff", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(37,99,235,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 0.25s"
            }}>
              {loading ? (
                <>
                  <div style={{
                    width: 16, height: 16, border: "2.5px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff", borderRadius: "50%", animation: "epmSpin 0.7s linear infinite"
                  }} />
                  Updating...
                </>
              ) : "💾 Update Product"}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
