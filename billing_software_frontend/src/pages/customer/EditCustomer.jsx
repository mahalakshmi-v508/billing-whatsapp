import { useEffect, useState } from "react";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";
import { Settings, X, Info, Eye, EyeOff, Plus } from "lucide-react";

export default function EditCustomer({ customerId, onSuccess, onCancel }) {
  const navigate = useNavigate();

  // ─── form state ──────────────────────────────────────────────
  const [form, setForm] = useState({
    name: "",
    phone: "",
    gst_no: "",
    gst_type: "Unregistered",
    billing_address: "",
    address_line1: "",
    address_line2: "",
    city: "",
    billing_state: "",
    pincode: "",
    country: "India",
    shipping_address: "",
    enable_shipping: false,
    shipping_address_line1: "",
    shipping_address_line2: "",
    shipping_city: "",
    shipping_state: "",
    shipping_pincode: "",
    shipping_country: "India",
    show_detailed_shipping_address: false,
    state: "",
    email: "",
    show_detailed_address: false,
    credit_enabled: 0,
    credit_limit: "",
    credit_days: "",
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [toast, setToast] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  // ─── tab state ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("gst");

  // ─── OTP state ──────────────────────────────────────────────
  const [isCreditAuthorized, setIsCreditAuthorized] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // ─── confirm-popup state ────────────────────────────────────
  // null | "close" | "clearBilling" | "clearShipping"
  const [confirmAction, setConfirmAction] = useState(null);

  // ─── helpers ────────────────────────────────────────────────
  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setIsDirty(true);
  };
  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

  const isBillingFilled = () =>
    form.billing_address.trim() ||
    form.address_line1.trim() ||
    form.address_line2.trim() ||
    form.city.trim() ||
    form.billing_state.trim() ||
    form.pincode.trim();

  const isShippingFilled = () =>
    form.shipping_address.trim() ||
    form.shipping_address_line1.trim() ||
    form.shipping_address_line2.trim() ||
    form.shipping_city.trim() ||
    form.shipping_state.trim() ||
    form.shipping_pincode.trim();

  // ─── fetch existing customer ─────────────────────────────────
  useEffect(() => {
    if (!customerId) {
      setFetching(false);
      return;
    }
    (async () => {
      setFetching(true);
      try {
        const res = await api.get(`/customer/get_customer_by_id?id=${customerId}`);
        if (res.data.status) {
          const c = res.data.data;
          const isEnabled = Number(c.credit_enabled) === 1;
          setIsCreditAuthorized(isEnabled);
          setForm((p) => ({
            ...p,
            name: c.name || "",
            phone: c.phone || "",
            gst_no: c.gst_no || "",
            gst_type: c.type === "B2B" ? "Registered" : "Unregistered",
            billing_address: c.address || "",
            state: c.state || "",
            email: c.email || "",
            credit_enabled: isEnabled ? 1 : 0,
            credit_limit: c.credit_limit || "",
            credit_days: c.credit_days || "",
          }));
        } else {
          showToast("Customer not found", false);
        }
      } catch (err) {
        console.error(err);
        showToast("Error loading customer", false);
      } finally {
        setFetching(false);
        setIsDirty(false);
      }
    })();
  }, [customerId]);

  // ─── whole-form cancel: confirm only if the form is dirty ──
  const handleCancelClick = () => {
    if (isDirty) {
      setConfirmAction("close");
    } else if (onCancel) {
      onCancel();
    }
  };

  // ─── billing address cancel: confirm only if it has data ───
  const handleBillingCancelClick = () => {
    if (isBillingFilled()) {
      setConfirmAction("clearBilling");
    }
  };

  // ─── shipping address cancel: confirm only if it has data ──
  const handleShippingCancelClick = () => {
    if (isShippingFilled()) {
      setConfirmAction("clearShipping");
    }
  };

  const clearBillingFields = () => {
    setForm((p) => ({
      ...p,
      billing_address: "",
      address_line1: "",
      address_line2: "",
      city: "",
      billing_state: "",
      pincode: "",
      country: "India",
      show_detailed_address: false,
    }));
  };

  const clearShippingFields = () => {
    setForm((p) => ({
      ...p,
      shipping_address: "",
      shipping_address_line1: "",
      shipping_address_line2: "",
      shipping_city: "",
      shipping_state: "",
      shipping_pincode: "",
      shipping_country: "India",
      show_detailed_shipping_address: false,
    }));
  };

  const handleConfirm = () => {
    if (confirmAction === "close") {
      setConfirmAction(null);
      if (onCancel) onCancel();
    } else if (confirmAction === "clearBilling") {
      clearBillingFields();
      setConfirmAction(null);
    } else if (confirmAction === "clearShipping") {
      clearShippingFields();
      setConfirmAction(null);
    }
  };

  const keepEditing = () => {
    setConfirmAction(null);
  };

  const CONFIRM_COPY = {
    close: {
      title: "Discard changes?",
      message: "You have unsaved changes. Are you sure you want to close without saving?",
      confirmLabel: "Discard",
    },
    clearBilling: {
      title: "Clear billing address?",
      message: "This will empty the billing address fields you've entered.",
      confirmLabel: "Clear",
    },
    clearShipping: {
      title: "Clear shipping address?",
      message: "This will empty the shipping address fields you've entered.",
      confirmLabel: "Clear",
    },
  };

  // ─── section-only "Save" handlers ───────────────────────────
  const handleSaveBillingSection = () => {
    showToast("Billing address saved");
  };

  const handleSaveShippingSection = () => {
    showToast("Shipping address saved");
  };

  // ─── OTP handlers (unchanged) ──────────────────────────────
  const handleSendCreditOtp = async () => {
    setIsSendingOtp(true);
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const res = await api.post("/auth/send_otp_for_credit", {
        user_id: user?.id,
        role: user?.role,
      });
      if (res.data.status === "success") {
        setAdminEmail(res.data.email);
        setOtpSent(true);
        showToast(res.data.message || "OTP sent successfully!");
      } else {
        showToast(res.data.message || "Failed to send OTP", false);
      }
    } catch (err) {
      console.error(err);
      showToast("Error sending OTP", false);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyCreditOtp = async () => {
    if (!enteredOtp.trim()) {
      showToast("Please enter the OTP code", false);
      return;
    }
    setIsVerifyingOtp(true);
    try {
      const res = await api.post("/auth/verify_otp", {
        email: adminEmail,
        otp: enteredOtp.trim(),
      });
      if (res.data.status === "success") {
        setIsCreditAuthorized(true);
        showToast("Credit limit authorized successfully!");
      } else {
        showToast(res.data.message || "Invalid OTP code", false);
      }
    } catch (err) {
      console.error(err);
      showToast("Error verifying OTP", false);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // ─── update ──────────────────────────────────────────────────
  const handleUpdate = async () => {
    if (!form.name.trim()) {
      showToast("Party Name is required", false);
      return;
    }
    if (!/^[0-9]{10}$/.test(form.phone)) {
      showToast("Enter a valid 10‑digit mobile number", false);
      return;
    }

    const isB2B = form.gst_type === "Registered";
    if (isB2B) {
      if (!form.gst_no.trim()) {
        showToast("GSTIN is required for registered customers", false);
        return;
      }
      if (!GST_REGEX.test(form.gst_no)) {
        showToast("Invalid GSTIN format (e.g. 22ABCDE1234F1Z5)", false);
        return;
      }
    } else {
      if (form.gst_no.trim() && !GST_REGEX.test(form.gst_no)) {
        showToast("Invalid GSTIN format", false);
        return;
      }
    }

    if (form.credit_enabled === 1 && !isCreditAuthorized) {
      showToast("Please verify admin OTP to authorize credit limit", false);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        id: customerId,
        name: form.name.trim(),
        phone: form.phone,
        address: form.billing_address,
        gst_no: form.gst_no,
        type: isB2B ? "B2B" : "B2C",
        credit_enabled: form.credit_enabled,
        credit_limit: form.credit_enabled ? form.credit_limit : 0,
        credit_days: form.credit_enabled ? form.credit_days : 0,
      };

      const res = await api.post("/customer/update", payload);
      if (res.data.status) {
        showToast("Customer updated successfully!");
        if (onSuccess) {
          setTimeout(() => onSuccess(), 800);
        } else {
          setTimeout(() => navigate("/customer"), 1200);
        }
      } else {
        showToast(res.data.message || "Failed to update", false);
      }
    } catch (err) {
      console.error(err);
      showToast("Server error", false);
    }
    setLoading(false);
  };

  const TABS = [
    { key: "gst", label: "GST & Address" },
    { key: "credit", label: "Credit & Balance", badge: "New" },
    { key: "additional", label: "Additional Fields" },
  ];

  // ─── render ──────────────────────────────────────────────────
  return (
    <>
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 99999,
            background: toast.ok
              ? "linear-gradient(135deg,#2563eb,#3b82f6)"
              : "linear-gradient(135deg,#dc2626,#ef4444)",
            color: "#fff",
            padding: "11px 18px",
            borderRadius: 14,
            boxShadow: "0 10px 30px rgba(0,0,0,.15)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontWeight: 600,
            fontSize: 12,
            animation: "toastIn .25s ease",
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 7,
              background: "rgba(255,255,255,.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {toast.ok ? "✓" : "✕"}
          </div>
          {toast.msg}
        </div>
      )}

      {/* ─── Confirmation popup (close / clear billing / clear shipping) ─── */}
      {confirmAction && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100000,
          }}
          onClick={keepEditing}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: 22,
              width: 320,
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
              fontFamily: "Inter, sans-serif",
            }}
          >
            <h3 style={{ margin: "0 0 8px 0", fontSize: 15, color: "#0f172a" }}>
              {CONFIRM_COPY[confirmAction].title}
            </h3>
            <p style={{ margin: "0 0 18px 0", fontSize: 12.5, color: "#64748b" }}>
              {CONFIRM_COPY[confirmAction].message}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" className="cf-btn cf-btn-ghost" onClick={keepEditing}>
                Keep Editing
              </button>
              <button
                type="button"
                className="cf-btn cf-btn-primary"
                style={{ background: "#dc2626" }}
                onClick={handleConfirm}
              >
                {CONFIRM_COPY[confirmAction].confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes toastIn {
          from { opacity:0; transform:translateY(-10px) scale(.95); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        .cf-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          outline: none;
          font-size: 12.5px;
          transition: all 0.15s;
          background: #fff;
          box-sizing: border-box;
          color: #1e293b;
        }
        .cf-input::placeholder { color: #9ca3af; }
        .cf-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
        }
        .cf-label {
          font-size: 11.5px;
          font-weight: 500;
          color: #64748b;
          margin-bottom: 5px;
          display: block;
        }
        .cf-tab {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          padding: 9px 2px;
          color: #94a3b8;
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }
        .cf-tab.active { color: #2563eb; }
        .cf-link {
          background: none;
          border: none;
          color: #2563eb;
          font-weight: 600;
          font-size: 12.5px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0;
        }
        .cf-btn {
          padding: 8px 20px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 12.5px;
          border: none;
          cursor: pointer;
          transition: all 0.15s;
        }
        .cf-btn-primary { background: #2563eb; color: #fff; }
        .cf-btn-primary:hover { background: #1d4ed8; }
        .cf-btn-primary:disabled { background: #93c5fd; cursor: not-allowed; }
        .cf-btn-outline {
          background: #fff;
          border: 1.5px solid #2563eb;
          color: #2563eb;
        }
        .cf-btn-outline:hover { background: #eff6ff; }
        .cf-btn-ghost {
          background: #eef2f7;
          border: none;
          color: #64748b;
        }
        .cf-btn-ghost:hover { background: #e2e8f0; }
        .cf-btn-success { background: #16a34a; color: #fff; }
        .cf-btn-success:hover { background: #15803d; }
        .cf-icon-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          border-radius: 6px;
        }
        .cf-icon-btn:hover { background: #f1f5f9; color: #475569; }
      `}</style>

      {/* ─── MAIN CONTAINER – FIXED WIDTH ─── */}
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          width: 900,                   /* ← fixed width */
          margin: "0 auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          fontFamily: "Inter, sans-serif",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",           /* prevent outer overflow */
        }}
      >
        {/* ── Header ─────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "24px 28px 20px 28px",
            borderBottom: "1px solid #eef1f5",
            flexShrink: 0,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>
            Edit Party
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button type="button" className="cf-icon-btn" title="Settings">
              <Settings size={18} />
            </button>
            <button type="button" className="cf-icon-btn" onClick={handleCancelClick} title="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        {fetching ? (
          <div
            style={{
              padding: "60px 28px",
              textAlign: "center",
              color: "#64748b",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Loading customer details...
          </div>
        ) : (
          <>
            {/* ── SCROLLABLE CONTENT – FIXED HEIGHT ── */}
            <div
              style={{
                padding: "20px 28px 0 28px",
                overflowY: "auto",
                flex: "1 1 auto",
                height: 420,                /* ← fixed height */
                minHeight: 420,
              }}
            >
              {/* Party Name / GSTIN / Phone row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 16,
                  marginBottom: 24,
                }}
              >
                <div>
                  <label className="cf-label">
                    Party Name <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    className="cf-input"
                    placeholder=""
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="cf-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    GSTIN
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      className="cf-input"
                      placeholder="22ABCDE1234F1Z5"
                      value={form.gst_no}
                      maxLength={15}
                      onChange={(e) => set("gst_no", e.target.value.toUpperCase().slice(0, 15))}
                      style={{ paddingRight: 34 }}
                    />
                    <Info
                      size={14}
                      color="#94a3b8"
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}
                    />
                  </div>
                </div>
                <div>
                  <label className="cf-label">Phone Number</label>
                  <input
                    className="cf-input"
                    placeholder=""
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                  />
                </div>
              </div>

              {/* ── Tabs ─────────────────────────────────── */}
              <div
                style={{
                  display: "flex",
                  gap: 32,
                  borderBottom: "1px solid #eef1f5",
                  marginBottom: 24,
                }}
              >
                {TABS.map((t) => (
                  <button
                    type="button"
                    key={t.key}
                    className={`cf-tab ${activeTab === t.key ? "active" : ""}`}
                    onClick={() => setActiveTab(t.key)}
                    style={{
                      position: "relative",
                      borderBottom: activeTab === t.key ? "2px solid #2563eb" : "2px solid transparent",
                    }}
                  >
                    {t.label}
                    {t.badge && (
                      <span
                        style={{
                          background: "#ef4444",
                          color: "#fff",
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 5,
                        }}
                      >
                        {t.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* ── Tab content ──────────────────────────── */}
              <div>
                {activeTab === "gst" && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1px 1fr 1px 1fr",
                      gap: 24,
                    }}
                  >
                    <div>
                      <div style={{ marginBottom: 16 }}>
                        <label className="cf-label">GST Type</label>
                        <select
                          className="cf-input"
                          value={form.gst_type}
                          onChange={(e) => set("gst_type", e.target.value)}
                        >
                          <option value="Unregistered">Unregistered/Consumer</option>
                          <option value="Registered">Registered Business - Regular</option>
                          <option value="Registered">Registered Business - Composition</option>
                        </select>
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <label className="cf-label">State</label>
                        <input
                          className="cf-input"
                          placeholder=""
                          value={form.state}
                          onChange={(e) => set("state", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="cf-label">Email ID</label>
                        <input
                          className="cf-input"
                          placeholder=""
                          value={form.email}
                          onChange={(e) => set("email", e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ background: "#eef1f5" }} />

                    <div>
                      <label className="cf-label" style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>
                        Billing Address
                      </label>
                      <textarea
                        className="cf-input"
                        placeholder="Billing Address"
                        value={form.billing_address}
                        onChange={(e) => set("billing_address", e.target.value)}
                        rows={5}
                        style={{ resize: "vertical" }}
                      />
                      <button
                        type="button"
                        className="cf-link"
                        style={{ marginTop: 10 }}
                        onClick={() => set("show_detailed_address", !form.show_detailed_address)}
                      >
                        {form.show_detailed_address ? <EyeOff size={13} /> : <Eye size={13} />}
                        {form.show_detailed_address ? "Hide Detailed Address" : "Show Detailed Address"}
                      </button>

                      {form.show_detailed_address && (
                        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                          <input
                            className="cf-input"
                            placeholder="Address Line 1"
                            value={form.address_line1}
                            onChange={(e) => set("address_line1", e.target.value)}
                          />
                          <input
                            className="cf-input"
                            placeholder="Address Line 2"
                            value={form.address_line2}
                            onChange={(e) => set("address_line2", e.target.value)}
                          />
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            <input
                              className="cf-input"
                              placeholder="City"
                              value={form.city}
                              onChange={(e) => set("city", e.target.value)}
                            />
                            <select
                              className="cf-input"
                              value={form.billing_state}
                              onChange={(e) => set("billing_state", e.target.value)}
                            >
                              <option value="">Select State</option>
                              <option value="Andhra Pradesh">Andhra Pradesh</option>
                              <option value="Karnataka">Karnataka</option>
                              <option value="Kerala">Kerala</option>
                              <option value="Tamil Nadu">Tamil Nadu</option>
                              <option value="Telangana">Telangana</option>
                              <option value="Maharashtra">Maharashtra</option>
                              <option value="Delhi">Delhi</option>
                            </select>
                          </div>
                          <input
                            className="cf-input"
                            placeholder="Pincode"
                            value={form.pincode}
                            maxLength={6}
                            onChange={(e) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                          />
                          <select
                            className="cf-input"
                            value={form.country}
                            onChange={(e) => set("country", e.target.value)}
                          >
                            <option value="India">India</option>
                          </select>
                        </div>
                      )}

                      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                        <button type="button" className="cf-btn cf-btn-ghost" onClick={handleBillingCancelClick}>
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="cf-btn cf-btn-primary"
                          onClick={handleSaveBillingSection}
                          disabled={loading || !isBillingFilled()}
                        >
                          Save
                        </button>
                      </div>
                    </div>

                    <div style={{ background: "#eef1f5" }} />

                    <div>
                      <label className="cf-label" style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>
                        Shipping Address
                      </label>
                      {!form.enable_shipping ? (
                        <button
                          type="button"
                          className="cf-link"
                          onClick={() => set("enable_shipping", true)}
                        >
                          <Plus size={14} />
                          Enable Shipping Address
                        </button>
                      ) : (
                        <>
                          <textarea
                            className="cf-input"
                            placeholder="Shipping Address"
                            value={form.shipping_address}
                            onChange={(e) => set("shipping_address", e.target.value)}
                            rows={5}
                            style={{ resize: "vertical" }}
                          />

                          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                            <button
                              type="button"
                              className="cf-link"
                              onClick={() =>
                                set("show_detailed_shipping_address", !form.show_detailed_shipping_address)
                              }
                            >
                              {form.show_detailed_shipping_address ? (
                                <EyeOff size={13} />
                              ) : (
                                <Eye size={13} />
                              )}
                              {form.show_detailed_shipping_address
                                ? "Hide Detailed Address"
                                : "Show Detailed Address"}
                            </button>
                          </div>

                          {form.show_detailed_shipping_address && (
                            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                              <input
                                className="cf-input"
                                placeholder="Address Line 1"
                                value={form.shipping_address_line1}
                                onChange={(e) => set("shipping_address_line1", e.target.value)}
                              />
                              <input
                                className="cf-input"
                                placeholder="Address Line 2"
                                value={form.shipping_address_line2}
                                onChange={(e) => set("shipping_address_line2", e.target.value)}
                              />
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                <input
                                  className="cf-input"
                                  placeholder="City"
                                  value={form.shipping_city}
                                  onChange={(e) => set("shipping_city", e.target.value)}
                                />
                                <select
                                  className="cf-input"
                                  value={form.shipping_state}
                                  onChange={(e) => set("shipping_state", e.target.value)}
                                >
                                  <option value="">Select State</option>
                                  <option value="Andhra Pradesh">Andhra Pradesh</option>
                                  <option value="Karnataka">Karnataka</option>
                                  <option value="Kerala">Kerala</option>
                                  <option value="Tamil Nadu">Tamil Nadu</option>
                                  <option value="Telangana">Telangana</option>
                                  <option value="Maharashtra">Maharashtra</option>
                                  <option value="Delhi">Delhi</option>
                                </select>
                              </div>
                              <input
                                className="cf-input"
                                placeholder="Pincode"
                                value={form.shipping_pincode}
                                maxLength={6}
                                onChange={(e) =>
                                  set("shipping_pincode", e.target.value.replace(/\D/g, "").slice(0, 6))
                                }
                              />
                              <select
                                className="cf-input"
                                value={form.shipping_country}
                                onChange={(e) => set("shipping_country", e.target.value)}
                              >
                                <option value="India">India</option>
                              </select>
                            </div>
                          )}

                          <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
                            <button type="button" className="cf-btn cf-btn-ghost" onClick={handleShippingCancelClick}>
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="cf-btn cf-btn-primary"
                              onClick={handleSaveShippingSection}
                              disabled={loading || !isShippingFilled()}
                            >
                              Save
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "credit" && (
                  <div style={{ maxWidth: 480 }}>
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                        <label style={{ fontWeight: 600, color: "#1e293b", fontSize: 12 }}>
                          Credit Enabled
                        </label>
                        {[
                          { label: "Yes", val: 1 },
                          { label: "No", val: 0 },
                        ].map((opt) => (
                          <label
                            key={opt.val}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              fontSize: 12,
                              fontWeight: 500,
                              color: "#475569",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="radio"
                              name="credit_enabled"
                              value={opt.val}
                              checked={form.credit_enabled === opt.val}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                set("credit_enabled", val);
                                if (val === 0) {
                                  setIsCreditAuthorized(false);
                                  setOtpSent(false);
                                  setEnteredOtp("");
                                }
                              }}
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    </div>

                    {form.credit_enabled === 1 && (
                      <div
                        style={{
                          background: "#f8fafc",
                          padding: 16,
                          borderRadius: 10,
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        {!isCreditAuthorized ? (
                          <div>
                            <p style={{ margin: "0 0 10px 0", fontSize: 12, fontWeight: 500, color: "#475569" }}>
                              Admin OTP verification required to enable credit.
                            </p>
                            {!otpSent ? (
                              <button
                                type="button"
                                onClick={handleSendCreditOtp}
                                disabled={isSendingOtp}
                                className="cf-btn cf-btn-primary"
                                style={{ width: "100%" }}
                              >
                                {isSendingOtp ? "Sending OTP..." : "Verify Admin Email OTP"}
                              </button>
                            ) : (
                              <div>
                                <p style={{ margin: "0 0 8px 0", fontSize: 11, color: "#64748b" }}>
                                  OTP sent to <strong>{adminEmail}</strong>
                                </p>
                                <div style={{ display: "flex", gap: 8 }}>
                                  <input
                                    className="cf-input"
                                    placeholder="Enter OTP"
                                    value={enteredOtp}
                                    maxLength={6}
                                    onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ""))}
                                    style={{ flex: 1 }}
                                  />
                                  <button
                                    type="button"
                                    onClick={handleVerifyCreditOtp}
                                    disabled={isVerifyingOtp}
                                    className="cf-btn cf-btn-success"
                                  >
                                    {isVerifyingOtp ? "Verifying..." : "Verify"}
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={handleSendCreditOtp}
                                  disabled={isSendingOtp}
                                  className="cf-link"
                                  style={{ fontSize: 11, marginTop: 8 }}
                                >
                                  Resend OTP
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                              <span style={{ color: "#10b981", fontWeight: 700, fontSize: 12.5 }}>✓ Credit Authorized</span>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                              <div>
                                <label className="cf-label" style={{ fontSize: 11 }}>Credit Limit (₹)</label>
                                <input
                                  type="number"
                                  className="cf-input"
                                  placeholder="Limit"
                                  value={form.credit_limit}
                                  onChange={(e) => set("credit_limit", e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="cf-label" style={{ fontSize: 11 }}>Credit Days</label>
                                <input
                                  type="number"
                                  className="cf-input"
                                  placeholder="Days"
                                  value={form.credit_days}
                                  onChange={(e) => set("credit_days", e.target.value)}
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "additional" && (
                  <div style={{ maxWidth: 420 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input
                        type="checkbox"
                        checked={form.show_detailed_address}
                        onChange={(e) => set("show_detailed_address", e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: "#2563eb" }}
                      />
                      <label style={{ fontWeight: 500, color: "#1e293b", cursor: "pointer", fontSize: 13 }}>
                        Show Detailed Address
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Footer action bar ───────────────────────── */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 12,
                padding: "8px 28px",
                borderTop: "1px solid #eef1f5",
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                className="cf-btn cf-btn-ghost"
                onClick={handleCancelClick}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cf-btn cf-btn-primary"
                onClick={handleUpdate}
                disabled={loading}
              >
                {loading ? "Updating..." : "Update"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}