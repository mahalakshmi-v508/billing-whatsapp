import { useState, useEffect } from "react";
import api from "../../services/api";
import Barcode from "react-barcode";

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
          animation: "apmToastIn 0.4s cubic-bezier(0.22,1,0.36,1) both",
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

export default function AddProductModal({ isOpen, onClose, onProductAdded }) {
  const { toasts, show, remove } = useToast();
  const [loading, setLoading] = useState(false);
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstLoading, setGstLoading] = useState(true);
  const [barcodeKey, setBarcodeKey] = useState(0);

  const getCompanyId = () => Number(localStorage.getItem("selected_company_id"));

  const [form, setForm] = useState({
    name: "", product_code: "", price: "", stock: "",
    gst: "", barcode: "", unit: "",
    sale_price: "", purchase_price: ""
  });

  const set = (field, val) => setForm(p => ({ ...p, [field]: val }));

  useEffect(() => {
    if (isOpen) {
      setForm({ name: "", product_code: "", price: "", stock: "", gst: "", barcode: "", unit: "", sale_price: "", purchase_price: "" });
      fetchCompanyGST();
    }
  }, [isOpen]);

  const fetchCompanyGST = async () => {
    setGstLoading(true);
    try {
      const company_id = getCompanyId();
      if (!company_id) return;
      const res = await api.post("/company/get_company_by_id", { id: company_id });
      if (res.data.status) {
        setGstEnabled(res.data.data.gst_type === "with_gst");
      }
    } catch (err) {
      console.log(err);
    } finally {
      setGstLoading(false);
    }
  };

  const generateBarcode = () => {
    const code = "PRD" + Math.floor(100000 + Math.random() * 900000);
    setForm(p => ({ ...p, barcode: code }));
    setBarcodeKey(k => k + 1);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { show("warn", "Missing Field", "Product name is required."); return; }
    if (!form.stock) { show("warn", "Missing Field", "Stock quantity is required."); return; }
    if (isNaN(Number(form.stock)) || Number(form.stock) < 0) { show("warn", "Invalid Stock", "Please enter a valid stock quantity."); return; }
    if (!form.unit.trim()) { show("warn", "Missing Field", "Unit is required."); return; }
    if (gstEnabled && !form.gst) { show("warn", "Missing Field", "GST percentage is required."); return; }
    if (gstEnabled && (isNaN(Number(form.gst)) || Number(form.gst) < 0 || Number(form.gst) > 100)) {
      show("warn", "Invalid GST", "Please enter a valid GST percentage (0–100)."); return;
    }

    setLoading(true);
    try {
      const res = await api.post("/product/add", {
        product_name: form.name,
        product_code: form.product_code,
        category_id: 0,
        subcategory_id: 0,
        brand_id: 0,
        company_id: getCompanyId(),
        price: form.price || 0,
        sale_price: form.sale_price || 0,
        purchase_price: form.purchase_price || 0,
        stock: form.stock,
        gst_percentage: gstEnabled ? form.gst : 0,
        barcode: form.barcode,
        unit: form.unit,
        supplier_id: 0
      });
      if (res.data.status) {
        show("success", "Product Added!", `"${form.name}" saved successfully.`);
        setTimeout(() => {
          onProductAdded && onProductAdded();
          onClose();
        }, 1000);
      } else {
        show("error", "Failed", res.data.message || "Something went wrong.");
      }
    } catch (err) {
      console.error(err);
      show("error", "Server Error", "Unable to reach server. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes apmPopIn { from{opacity:0;transform:scale(.94) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes apmToastIn { from{opacity:0;transform:translateX(60px) scale(0.9)} to{opacity:1;transform:translateX(0) scale(1)} }
        @keyframes apmSpin { to{transform:rotate(360deg)} }
        @keyframes apmFadeIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        .apm-input:focus { border-color:#3b82f6 !important; background:#fff !important; box-shadow:0 0 0 4px rgba(59,130,246,0.1) !important; }
        .apm-select:focus { border-color:#3b82f6 !important; background:#fff !important; box-shadow:0 0 0 4px rgba(59,130,246,0.1) !important; }
        .apm-submit:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 10px 28px rgba(37,99,235,0.45) !important; }
        .apm-close:hover { background:#f1f5f9 !important; }
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
          background: "#fff", borderRadius: 20, width: "100%", maxWidth: 620,
          maxHeight: "88vh", display: "flex", flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15)",
          animation: "apmPopIn .25s cubic-bezier(.34,1.56,.64,1)", overflow: "hidden"
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
              }}>📦</div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Add Product</h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>Fill in the details to create a new product</p>
              </div>
            </div>
            <button className="apm-close" onClick={onClose} style={{
              border: "none", background: "#f1f5f9", color: "#475569",
              padding: "8px 14px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer"
            }}>✕ Close</button>
          </div>

          {/* Scrollable Body */}
          <div style={{ overflowY: "auto", flex: 1, padding: "18px 24px" }}>

            {/* Basic Info */}
            <p style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#3b82f6", margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8 }}>
              Basic Info <span style={{ flex: 1, height: 1, background: "#e8f0fe" }} />
            </p>

            {/* Product Name */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94a3b8", marginBottom: 6 }}>
                Product Name <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                className="apm-input"
                placeholder="e.g. Bisleri Water 1L"
                value={form.name}
                onChange={e => set("name", e.target.value)}
                style={{
                  width: "100%", padding: "11px 14px", borderRadius: 10,
                  border: "1.5px solid #e2e8f0", background: "#f8faff", outline: "none",
                  fontSize: 14, fontWeight: 500, boxSizing: "border-box", transition: "all 0.22s"
                }}
              />
            </div>

            {/* HSN Code + Unit */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94a3b8", marginBottom: 6 }}>
                  HSN / Product Code
                </label>
                <input
                  className="apm-input"
                  placeholder="e.g. PRD001"
                  value={form.product_code}
                  onChange={e => set("product_code", e.target.value.toUpperCase().replace(/\s/g, ""))}
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: 10,
                    border: "1.5px solid #e2e8f0", background: "#f8faff", outline: "none",
                    fontSize: 14, fontWeight: 500, boxSizing: "border-box", transition: "all 0.22s"
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94a3b8", marginBottom: 6 }}>
                  Unit <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  className="apm-select"
                  value={form.unit}
                  onChange={e => set("unit", e.target.value)}
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: 10,
                    border: "1.5px solid #e2e8f0", background: "#f8faff", outline: "none",
                    fontSize: 14, fontWeight: 500, boxSizing: "border-box", transition: "all 0.22s",
                    appearance: "none"
                  }}
                >
                  <option value="">Select Unit</option>
                  <option value="Piece">Piece</option>
                  <option value="Kg">Kg</option>
                  <option value="Gram">Gram</option>
                  <option value="Litre">Litre</option>
                  <option value="ML">ML</option>
                  <option value="Meter">Meter</option>
                  <option value="Feet">Feet</option>
                  <option value="Box">Box</option>
                  <option value="Pack">Pack</option>
                  <option value="Dozen">Dozen</option>
                  <option value="Pair">Pair</option>
                  <option value="Roll">Roll</option>
                  <option value="Bag">Bag</option>
                  <option value="Bottle">Bottle</option>
                  <option value="Can">Can</option>
                  <option value="Set">Set</option>
                </select>
              </div>
            </div>

            {/* Pricing */}
            <p style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#3b82f6", margin: "16px 0 12px", display: "flex", alignItems: "center", gap: 8 }}>
              Pricing & Stock <span style={{ flex: 1, height: 1, background: "#e8f0fe" }} />
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94a3b8", marginBottom: 6 }}>
                  Sale Price (₹)
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{
                    position: "absolute", left: 0, top: 0, bottom: 0, width: 36,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    borderRight: "1.5px solid #e2e8f0", borderRadius: "10px 0 0 10px",
                    background: "#f1f5f9", fontSize: 13, fontWeight: 700, color: "#64748b"
                  }}>₹</span>
                  <input type="number" className="apm-input" placeholder="0.00"
                    value={form.sale_price}
                    onChange={e => set("sale_price", e.target.value)}
                    style={{
                      width: "100%", padding: "11px 14px 11px 44px", borderRadius: 10,
                      border: "1.5px solid #e2e8f0", background: "#f8faff", outline: "none",
                      fontSize: 14, fontWeight: 500, boxSizing: "border-box", transition: "all 0.22s"
                    }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94a3b8", marginBottom: 6 }}>
                  Purchase Price (₹)
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{
                    position: "absolute", left: 0, top: 0, bottom: 0, width: 36,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    borderRight: "1.5px solid #e2e8f0", borderRadius: "10px 0 0 10px",
                    background: "#f1f5f9", fontSize: 13, fontWeight: 700, color: "#64748b"
                  }}>₹</span>
                  <input type="number" className="apm-input" placeholder="0.00"
                    value={form.purchase_price}
                    onChange={e => set("purchase_price", e.target.value)}
                    style={{
                      width: "100%", padding: "11px 14px 11px 44px", borderRadius: 10,
                      border: "1.5px solid #e2e8f0", background: "#f8faff", outline: "none",
                      fontSize: 14, fontWeight: 500, boxSizing: "border-box", transition: "all 0.22s"
                    }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94a3b8", marginBottom: 6 }}>
                  Stock Qty <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input type="number" className="apm-input" placeholder="0"
                  value={form.stock}
                  onChange={e => set("stock", e.target.value)}
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: 10,
                    border: "1.5px solid #e2e8f0", background: "#f8faff", outline: "none",
                    fontSize: 14, fontWeight: 500, boxSizing: "border-box", transition: "all 0.22s"
                  }}
                />
              </div>
            </div>

            {/* GST */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94a3b8", marginBottom: 6 }}>
                GST
                {!gstLoading && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "3px 10px", borderRadius: 100, fontSize: 10.5, fontWeight: 700, marginLeft: 8,
                    background: gstEnabled ? "#dcfce7" : "#fee2e2", color: gstEnabled ? "#15803d" : "#b91c1c",
                    border: `1px solid ${gstEnabled ? "#bbf7d0" : "#fecaca"}`
                  }}>
                    {gstEnabled ? "✓ Enabled" : "✕ Disabled"}
                  </span>
                )}
              </label>
              {gstLoading ? (
                <div style={{
                  height: 42, borderRadius: 10,
                  background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)",
                  backgroundSize: "200% 100%", animation: "apmSkel 1.4s ease infinite"
                }} />
              ) : gstEnabled ? (
                <div style={{ position: "relative", animation: "apmFadeIn 0.3s ease both" }}>
                  <span style={{
                    position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)",
                    fontSize: 13, fontWeight: 700, color: "#64748b", pointerEvents: "none"
                  }}>%</span>
                  <input
                    type="number" className="apm-input"
                    placeholder="Enter GST % (e.g. 18)"
                    value={form.gst} min="0" max="100"
                    onChange={e => set("gst", e.target.value)}
                    style={{
                      width: "100%", padding: "11px 14px 11px 34px", borderRadius: 10,
                      border: "1.5px solid #e2e8f0", background: "#f8faff", outline: "none",
                      fontSize: 14, fontWeight: 500, boxSizing: "border-box", transition: "all 0.22s"
                    }}
                  />
                </div>
              ) : (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 14px", borderRadius: 10,
                  background: "#f8faff", border: "1.5px dashed #e2e8f0",
                  fontSize: 12.5, color: "#94a3b8", fontWeight: 500
                }}>
                  <span>🚫</span>
                  <span>GST not applicable for this company (without GST plan)</span>
                </div>
              )}
            </div>

            {/* Barcode */}
            <p style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#3b82f6", margin: "16px 0 12px", display: "flex", alignItems: "center", gap: 8 }}>
              Barcode <span style={{ flex: 1, height: 1, background: "#e8f0fe" }} />
            </p>

            <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94a3b8", marginBottom: 6 }}>
                  Barcode Number
                </label>
                <input className="apm-input" placeholder="Enter or auto-generate"
                  value={form.barcode}
                  onChange={e => set("barcode", e.target.value)}
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: 10,
                    border: "1.5px solid #e2e8f0", background: "#f8faff", outline: "none",
                    fontSize: 14, fontWeight: 500, boxSizing: "border-box", transition: "all 0.22s"
                  }}
                />
              </div>
              <button onClick={generateBarcode} style={{
                padding: "11px 18px", borderRadius: 10, border: "none",
                cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap",
                background: "linear-gradient(135deg,#6366f1,#818cf8)",
                color: "#fff", boxShadow: "0 4px 14px rgba(99,102,241,0.35)"
              }}>⚡ Auto</button>
            </div>

            {form.barcode && (
              <div key={barcodeKey} style={{
                background: "#f8faff", borderRadius: 12, border: "1.5px solid #e2e8f0",
                padding: 14, textAlign: "center", marginBottom: 12
              }}>
                <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", margin: "0 0 8px" }}>Barcode Preview</p>
                <Barcode value={form.barcode} height={50} fontSize={12} margin={0} />
              </div>
            )}

          </div>

          {/* Sticky Footer */}
          <div style={{ padding: "14px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", gap: 10, flexShrink: 0 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: "12px", borderRadius: 10, border: "1.5px solid #cbd5e1",
              background: "#fff", color: "#475569", fontWeight: 600, fontSize: 14, cursor: "pointer"
            }}>Cancel</button>
            <button className="apm-submit" onClick={handleSubmit} disabled={loading || gstLoading} style={{
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
                    borderTopColor: "#fff", borderRadius: "50%", animation: "apmSpin 0.7s linear infinite"
                  }} />
                  Saving...
                </>
              ) : "💾 Save Product"}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
