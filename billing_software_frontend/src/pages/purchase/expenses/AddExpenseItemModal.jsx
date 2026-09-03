import { useState } from "react";
import { X, Search } from "lucide-react";
import api from "../../../services/api";

const gstSlabs = [
  { label: "Select", value: 0 },
  { label: "0%", value: 0 },
  { label: "5%", value: 5 },
  { label: "12%", value: 12 },
  { label: "18%", value: 18 },
  { label: "28%", value: 28 }
];

export default function AddExpenseItemModal({ isOpen, onClose, onSuccess, categoryId, initialItemName = "" }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const adminId = user?.role === "cashier" ? user?.admin_id : user?.id;
  const companyId = user?.company_id || localStorage.getItem("selected_company_id") || 0;

  const [itemName, setItemName] = useState(initialItemName);
  const [hsnSac, setHsnSac] = useState("");
  const [price, setPrice] = useState("");
  const [taxType, setTaxType] = useState("Tax Excluded");
  const [taxRate, setTaxRate] = useState(0);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!itemName.trim()) {
      alert("Item Name is required!");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        admin_id: adminId,
        company_id: companyId,
        category_id: categoryId,
        item_name: itemName.trim(),
        hsn_sac: hsnSac.trim(),
        price: parseFloat(price) || 0,
        tax_type: taxType,
        tax_rate: parseFloat(taxRate) || 0
      };

      const res = await api.post("/expense/item/create", payload);
      if (res.data.status) {
        if (onSuccess) onSuccess(res.data.data);
        onClose();
      } else {
        alert(res.data.message || "Failed to create expense item");
      }
    } catch (err) {
      console.error("Error creating expense item:", err);
      alert("Failed to save expense item");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        background: "rgba(15, 23, 42, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 12,
          width: 500,
          maxWidth: "92vw",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1e293b" }}>
            Add Expense Item
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: "20px" }}>
          
          {/* Row 1: Item Name & HSN/SAC */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
            
            {/* Item Name */}
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: "#2563eb", display: "block", marginBottom: 4 }}>
                Item Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Petrol 1 Litre"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                autoFocus
                required
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1.5px solid #2563eb",
                  fontSize: 13,
                  outline: "none",
                  color: "#1e293b"
                }}
              />
            </div>

            {/* Item HSN / SAC */}
            <div style={{ position: "relative" }}>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 4 }}>
                Item HSN/ SAC
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="HSN / SAC code"
                  value={hsnSac}
                  onChange={(e) => setHsnSac(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 30px 8px 10px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    outline: "none"
                  }}
                />
                <Search size={15} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
              </div>
            </div>

          </div>

          {/* Section Tab: Pricing */}
          <div style={{ borderBottom: "2px solid #2563eb", display: "inline-block", paddingBottom: 4, marginBottom: 16, fontSize: 13, fontWeight: 800, color: "#2563eb" }}>
            Pricing
          </div>

          {/* Row 2: Price, Tax Excluded/Included, Tax Rate */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr 1fr", gap: 12, marginBottom: 24 }}>
            
            {/* Price */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>
                Price
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                  outline: "none"
                }}
              />
            </div>

            {/* Tax Excluded / Included */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>
                Tax Type
              </label>
              <select
                value={taxType}
                onChange={(e) => setTaxType(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  fontSize: 12.5,
                  fontWeight: 600,
                  outline: "none",
                  background: "#ffffff",
                  cursor: "pointer"
                }}
              >
                <option value="Tax Excluded">Tax Excluded</option>
                <option value="Tax Included">Tax Included</option>
              </select>
            </div>

            {/* Tax Rate */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>
                Tax Rate
              </label>
              <select
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  fontSize: 12.5,
                  fontWeight: 600,
                  outline: "none",
                  background: "#ffffff",
                  cursor: "pointer"
                }}
              >
                {gstSlabs.map((s) => (
                  <option key={s.label} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Footer Action */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 18px",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                fontSize: 13,
                fontWeight: 700,
                color: "#475569",
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "8px 24px",
                borderRadius: 6,
                border: "none",
                background: "#1d72fe",
                fontSize: 13,
                fontWeight: 800,
                color: "#ffffff",
                cursor: saving ? "not-allowed" : "pointer"
              }}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
