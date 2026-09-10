import { useState, useEffect } from "react";
import api from "../../services/api";
import { X, User, Phone, Mail, Building, MapPin, CheckCircle2, AlertCircle } from "lucide-react";

export default function AddSupplierModal({ isOpen, onClose, companyId, onSupplierAdded }) {
  const [form, setForm] = useState({
    supplier_name: "",
    mobile_number: "",
    alt_mobile: "",
    email: "",
    gst_number: "",
    address: "",
    city: "",
    district: "",
    state: "Tamil Nadu",
    pincode: "",
    country: "India",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (isOpen) {
      setForm({
        supplier_name: "",
        mobile_number: "",
        alt_mobile: "",
        email: "",
        gst_number: "",
        address: "",
        city: "",
        district: "",
        state: "Tamil Nadu",
        pincode: "",
        country: "India",
      });
      setError("");
      setSuccess("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleField = (key, value) => {
    if (key === "mobile_number" || key === "alt_mobile") {
      value = value.replace(/\D/g, "").slice(0, 10);
    } else if (key === "gst_number") {
      value = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 15);
    } else if (key === "pincode") {
      value = value.replace(/\D/g, "").slice(0, 6);
    }
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    if (!form.supplier_name.trim()) {
      setError("Supplier name is required.");
      return false;
    }
    if (!form.mobile_number.trim()) {
      setError("Mobile number is required.");
      return false;
    }
    if (!/^\d{10}$/.test(form.mobile_number.trim())) {
      setError("Enter a valid 10-digit mobile number.");
      return false;
    }
    if (form.alt_mobile.trim() && !/^\d{10}$/.test(form.alt_mobile.trim())) {
      setError("Alternative mobile must be exactly 10 digits.");
      return false;
    }
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setError("Enter a valid email address.");
      return false;
    }
    if (form.gst_number.trim() && form.gst_number.trim().length !== 15) {
      setError("GST number must be exactly 15 characters.");
      return false;
    }
    if (form.pincode.trim() && !/^\d{6}$/.test(form.pincode.trim())) {
      setError("Pincode must be exactly 6 digits.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const cId = Number(companyId || localStorage.getItem("selected_company_id"));
    if (!cId) {
      setError("Please select a company first.");
      return;
    }

    if (!validate()) return;

    setLoading(true);
    try {
      const res = await api.post("/supplier/create", {
        ...form,
        supplier_name: form.supplier_name.trim(),
        mobile_number: form.mobile_number.trim(),
        company_id: cId,
      });

      if (res.data.status) {
        setSuccess("Supplier created successfully!");
        if (onSupplierAdded) {
          onSupplierAdded(res.data.data || { ...form, company_id: cId });
        }
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        setError(res.data.message || "Failed to create supplier");
      }
    } catch (err) {
      console.error(err);
      setError("Server error while saving supplier.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .asm-scroll { scrollbar-width: thin; scrollbar-color: #94a3b8 #e2e8f0; }
        .asm-scroll::-webkit-scrollbar { width: 8px; }
        .asm-scroll::-webkit-scrollbar-track { background: #e2e8f0; border-radius: 10px; }
        .asm-scroll::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 10px; border: 2px solid #e2e8f0; }
        .asm-scroll::-webkit-scrollbar-thumb:hover { background: #64748b; }
      `}</style>
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "580px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          animation: "modalFadeIn 0.2s ease-out",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "10px",
                background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <User size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                Add New Supplier
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                Enter supplier contact and billing information
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "8px",
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="asm-scroll" style={{ overflowY: "scroll", padding: "20px 24px", flex: 1, minHeight: 0 }}>
          {error && (
            <div
              style={{
                padding: "10px 14px",
                marginBottom: "16px",
                borderRadius: "8px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              style={{
                padding: "10px 14px",
                marginBottom: "16px",
                borderRadius: "8px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#15803d",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <CheckCircle2 size={16} />
              <span>{success}</span>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            {/* Supplier Name */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "5px" }}>
                Supplier Name <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sri Ganesh Traders"
                value={form.supplier_name}
                onChange={(e) => handleField("supplier_name", e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "5px" }}>
                Mobile Number <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="10-digit mobile number"
                value={form.mobile_number}
                onChange={(e) => handleField("mobile_number", e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Alternative Mobile */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "5px" }}>
                Alternative Mobile
              </label>
              <input
                type="tel"
                placeholder="Optional 10-digit number"
                value={form.alt_mobile}
                onChange={(e) => handleField("alt_mobile", e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Email */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "5px" }}>
                Email
              </label>
              <input
                type="email"
                placeholder="supplier@example.com"
                value={form.email}
                onChange={(e) => handleField("email", e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* GST Number */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "5px" }}>
                GST Number
              </label>
              <input
                type="text"
                placeholder="15-digit GSTIN"
                value={form.gst_number}
                onChange={(e) => handleField("gst_number", e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Address */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "5px" }}>
                Address
              </label>
              <input
                type="text"
                placeholder="Door No, Street, Area"
                value={form.address}
                onChange={(e) => handleField("address", e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* City */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "5px" }}>
                City
              </label>
              <input
                type="text"
                placeholder="e.g. Coimbatore"
                value={form.city}
                onChange={(e) => handleField("city", e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* District */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "5px" }}>
                District
              </label>
              <input
                type="text"
                placeholder="e.g. Coimbatore"
                value={form.district}
                onChange={(e) => handleField("district", e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* State */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "5px" }}>
                State
              </label>
              <input
                type="text"
                placeholder="e.g. Tamil Nadu"
                value={form.state}
                onChange={(e) => handleField("state", e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Pincode */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "5px" }}>
                Pincode
              </label>
              <input
                type="text"
                placeholder="6-digit pincode"
                value={form.pincode}
                onChange={(e) => handleField("pincode", e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div
            style={{
              marginTop: "24px",
              paddingTop: "16px",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "9px 16px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#475569",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "9px 20px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {loading ? "Saving..." : "Save Supplier"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}
