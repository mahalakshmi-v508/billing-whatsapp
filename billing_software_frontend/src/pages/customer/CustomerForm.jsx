import { useState } from "react";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";

export default function CustomerForm() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    gst_no: "",
    type: "B2B",
    credit_enabled: 0,
    credit_limit: "",
    credit_days: ""
  });

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

  //   const handleSubmit = async () => {
  //     const user     = JSON.parse(localStorage.getItem("user"));
  //     const admin_id = user?.id;

  //     if (!form.name.trim()) {
  //       showToast("Customer name is required", false);
  //       return;
  //     }

  //     if (!/^[0-9]{10}$/.test(form.phone)) {
  //       showToast("Enter valid 10-digit mobile number", false);
  //       return;
  //     }

  //     if (!form.gst_no.trim()) {
  //       showToast("GST number is required", false);
  //       return;
  //     }

  //     if (!GST_REGEX.test(form.gst_no)) {
  //       showToast("Invalid GST format (e.g. 22ABCDE1234F1Z5)", false);
  //       return;
  //     }

  //     setLoading(true);

  //     try {
  //       const payload = {
  //         admin_id,
  //         name:           form.name.trim(),
  //         phone:          form.phone,
  //         address:        form.address,
  //         gst_no:         form.gst_no,
  //         type:           form.type,
  //         credit_enabled: form.credit_enabled,
  //         credit_limit:   form.credit_enabled ? form.credit_limit : 0,
  //         credit_days:    form.credit_enabled ? form.credit_days  : 0
  //       };

  //       const res = await api.post("/customer/create_customer.php", payload);
  // console.log("API Response:", res.data);
  //       if (res.data.status) {
  //         showToast("Customer created successfully!");
  //         setTimeout(() => navigate("/customer"), 1500);
  //       } else {
  //         showToast(res.data.message || "Failed to create", false);
  //       }
  //     } catch (err) {
  //       console.error(err);
  //       showToast("Server error", false);
  //     }

  //     setLoading(false);
  //   };


  const [isCreditAuthorized, setIsCreditAuthorized] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const handleSendCreditOtp = async () => {
    setIsSendingOtp(true);
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const res = await api.post("/auth/send_otp_for_credit", {
        user_id: user?.id,
        role: user?.role
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
        otp: enteredOtp.trim()
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

  const handleSubmit = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    const admin_id = user?.id;

    if (!form.name.trim()) {
      showToast("Customer name is required", false);
      return;
    }

    if (!/^[0-9]{10}$/.test(form.phone)) {
      showToast("Enter valid 10-digit mobile number", false);
      return;
    }

    // GST mandatory only for B2B (regular)
    if (form.type === "regular") {
      if (!form.gst_no.trim()) {
        showToast("GST number is required for B2B customers", false);
        return;
      }
      if (!GST_REGEX.test(form.gst_no)) {
        showToast("Invalid GST format (e.g. 22ABCDE1234F1Z5)", false);
        return;
      }
    } else {
      // B2C - optional, but validate format if entered
      if (form.gst_no.trim() && !GST_REGEX.test(form.gst_no)) {
        showToast("Invalid GST format (e.g. 22ABCDE1234F1Z5)", false);
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
        admin_id,
        name: form.name.trim(),
        phone: form.phone,
        address: form.address,
        gst_no: form.gst_no,
        type: form.type,
        credit_enabled: form.credit_enabled,
        credit_limit: form.credit_enabled ? form.credit_limit : 0,
        credit_days: form.credit_enabled ? form.credit_days : 0
      };

      const res = await api.post("/customer/create_customer", payload);
      console.log("API Response:", res.data);
      if (res.data.status) {
        showToast("Customer created successfully!");
        setTimeout(() => navigate("/customer"), 1500);
      } else {
        showToast(res.data.message || "Failed to create", false);
      }
    } catch (err) {
      console.error(err);
      showToast("Server error", false);
    }

    setLoading(false);
  };
  return (
    <>
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 99999,
          background: toast.ok
            ? "linear-gradient(135deg,#2563eb,#3b82f6)"
            : "linear-gradient(135deg,#dc2626,#ef4444)",
          color: "#fff", padding: "13px 18px", borderRadius: 14,
          boxShadow: "0 10px 30px rgba(0,0,0,.15)",
          display: "flex", alignItems: "center", gap: 10,
          fontWeight: 600, fontSize: 14, animation: "toastIn .25s ease"
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: 7,
            background: "rgba(255,255,255,.2)",
            display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 12, fontWeight: 700
          }}>
            {toast.ok ? "✓" : "✕"}
          </div>
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes toastIn {
          from { opacity:0; transform:translateY(-10px) scale(.95); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
      `}</style>

      <div style={{
        minHeight: "100vh", background: "#eef2f7",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "Inter, sans-serif"
      }}>
        <div style={{
          width: 400, background: "#fff", borderRadius: 24,
          overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,0.08)"
        }}>

          {/* HEADER */}
          <div style={{
            background: "linear-gradient(135deg,#1d4ed8,#3b82f6)",
            padding: 24, color: "#fff"
          }}>
            <h2 style={{ margin: 0 }}>Add Customer</h2>
            <p style={{ margin: "5px 0 0", fontSize: 13, opacity: 0.8 }}>
              Create a new customer record
            </p>
          </div>

          {/* FORM */}
          <div style={{ padding: 20 }}>

            {/* NAME */}
            <input
              placeholder="Customer Name *"
              value={form.name}
              onChange={e => set("name", e.target.value)}
              style={inputStyle}
            />

            {/* PHONE */}
            <input
              placeholder="Mobile Number *"
              value={form.phone}
              onChange={e =>
                set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              style={inputStyle}
            />



            {/* ADDRESS */}
            <textarea
              placeholder="Address"
              value={form.address}
              onChange={e => set("address", e.target.value)}
              style={{ ...inputStyle, height: 70, resize: "none" }}
            />





            {/* CUSTOMER TYPE */}
            <label style={{
              fontSize: 12, fontWeight: 600,
              color: "#475569", display: "block", marginBottom: 6
            }}>
              Customer Type
            </label>
            <select
              value={form.type}
              onChange={e => set("type", e.target.value)}
              style={inputStyle}
            >
              <option value="B2B">Regular B2B</option>
              <option value="B2C">Regular B2C</option>
            </select>

            {/* GST — label changes based on customer type */}
            <div style={{ marginBottom: 12 }}>
              <label style={{
                fontSize: 12, fontWeight: 600,
                color: "#475569", display: "flex",
                alignItems: "center", gap: 6, marginBottom: 6
              }}>
                GST Number
                {form.type === "B2B" ? (
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    color: "#dc2626", background: "#fef2f2",
                    padding: "2px 8px", borderRadius: 20,
                    border: "1px solid #fecaca"
                  }}>
                    Mandatory
                  </span>
                ) : (
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    color: "#16a34a", background: "#f0fdf4",
                    padding: "2px 8px", borderRadius: 20,
                    border: "1px solid #bbf7d0"
                  }}>
                    Optional
                  </span>
                )}
              </label>

              <input
                placeholder="e.g. 22ABCDE1234F1Z5"
                value={form.gst_no}
                maxLength={15}
                onChange={e =>
                  set("gst_no", e.target.value.toUpperCase().slice(0, 15))
                }
                style={{
                  ...inputStyle,
                  marginBottom: 4,
                  border: form.gst_no.length === 15
                    ? "1.5px solid #16a34a"
                    : form.gst_no.length > 0
                      ? "1.5px solid #f59e0b"
                      : "1.5px solid transparent"
                }}
              />

              <div style={{
                fontSize: 11, fontWeight: 600, textAlign: "right",
                color: form.gst_no.length === 15 ? "#16a34a" : "#94a3b8"
              }}>
                {form.gst_no.length} / 15
              </div>
            </div>

            {/* CREDIT ENABLED */}
            <div style={{
              display: "flex", gap: 20,
              alignItems: "center", marginBottom: 12
            }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>
                Credit Enabled
              </label>
              {[{ label: "Yes", val: 1 }, { label: "No", val: 0 }].map(opt => (
                <label key={opt.val} style={{
                  display: "flex", alignItems: "center", gap: 6, fontSize: 13
                }}>
                  <input
                    type="radio"
                    name="credit_enabled"
                    value={opt.val}
                    checked={form.credit_enabled === opt.val}
                    onChange={e => {
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

            {form.credit_enabled === 1 && (
              <div style={{
                background: "#f8fafc", padding: "12px 14px", borderRadius: 14,
                border: "1px solid #e2e8f0", marginBottom: 12
              }}>
                {!isCreditAuthorized ? (
                  <div>
                    <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 600, color: "#475569" }}>
                      Credit limit authorization is required.
                    </p>
                    {!otpSent ? (
                      <button
                        onClick={handleSendCreditOtp}
                        disabled={isSendingOtp}
                        style={{
                          width: "100%", padding: "10px", borderRadius: 10,
                          border: "none", background: "#3b82f6", color: "#fff",
                          fontWeight: 700, cursor: "pointer", fontSize: 13
                        }}
                      >
                        {isSendingOtp ? "Sending OTP..." : "Verify Admin Email OTP"}
                      </button>
                    ) : (
                      <div>
                        <p style={{ margin: "0 0 8px", fontSize: 11, color: "#64748b" }}>
                          OTP sent to admin email: <strong>{adminEmail}</strong>
                        </p>
                        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                          <input
                            placeholder="Enter OTP"
                            value={enteredOtp}
                            maxLength={6}
                            onChange={e => setEnteredOtp(e.target.value.replace(/\D/g, ""))}
                            style={{
                              flex: 1, padding: "8px 10px", borderRadius: 8,
                              border: "1px solid #cbd5e1", outline: "none", fontSize: 13
                            }}
                          />
                          <button
                            onClick={handleVerifyCreditOtp}
                            disabled={isVerifyingOtp}
                            style={{
                              padding: "8px 14px", borderRadius: 8,
                              border: "none", background: "#10b981", color: "#fff",
                              fontWeight: 700, cursor: "pointer", fontSize: 13
                            }}
                          >
                            {isVerifyingOtp ? "Verifying..." : "Verify"}
                          </button>
                        </div>
                        <button
                          onClick={handleSendCreditOtp}
                          disabled={isSendingOtp}
                          style={{
                            background: "none", border: "none", color: "#3b82f6",
                            fontSize: 11, fontWeight: 600, cursor: "pointer", padding: 0
                          }}
                        >
                          Resend OTP
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                      <span style={{ color: "#10b981", fontWeight: 700, fontSize: 12 }}>✓ Credit Limit Authorized</span>
                    </div>
                    <input
                      type="number"
                      placeholder="Credit Limit (₹)"
                      value={form.credit_limit}
                      onChange={e => set("credit_limit", e.target.value)}
                      style={{ ...inputStyle, marginBottom: 8 }}
                    />
                    <input
                      type="number"
                      placeholder="Credit Days"
                      value={form.credit_days}
                      onChange={e => set("credit_days", e.target.value)}
                      style={{ ...inputStyle, marginBottom: 0 }}
                    />
                  </>
                )}
              </div>
            )}

            {/* SUBMIT */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: "100%", marginTop: 10, padding: 14,
                border: "none", borderRadius: 14,
                background: loading
                  ? "#93c5fd"
                  : "linear-gradient(135deg,#2563eb,#3b82f6)",
                color: "#fff", fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: 14
              }}
            >
              {loading ? "Creating..." : "Create Customer"}
            </button>

          </div>
        </div>
      </div>
    </>
  );
}

const inputStyle = {
  width: "100%",
  marginBottom: 12,
  padding: "12px 14px",
  borderRadius: 14,
  border: "1.5px solid transparent",
  background: "#f1f5f9",
  outline: "none",
  fontSize: 14,
  boxSizing: "border-box"
};