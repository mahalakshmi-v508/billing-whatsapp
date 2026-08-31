// import { useEffect, useState } from "react";
// import { useNavigate, useParams } from "react-router-dom";
// import api from "../../services/api";

// export default function EditCustomer() {

//   const { id } = useParams();
//   const navigate = useNavigate();

//   const [form, setForm] = useState({
//     name: "",
//     phone: "",
//     address: "",
//     type: "regular",
//     credit_enabled: 0,
//     credit_limit: "",
//     credit_days: ""
//   });

//   const [loading, setLoading] = useState(false);

//   const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

//   /* FETCH */
//  useEffect(() => {
//   (async () => {
//     try {
//       const res = await api.post("/customer/get_customer_by_id.php", { id });

//       if (res.data.status) {
//         setForm(res.data.data);
//       } else {
//         alert("Customer not found");
//       }
//     } catch {
//       alert("Error loading");
//     }
//   })();
// }, [id]);

//   /* UPDATE */
//  const handleUpdate = async () => {

//   const user = JSON.parse(localStorage.getItem("user"));
//   const company_id = Number(user?.company_id);

//   if (!form.name.trim()) {
//     alert("Name required");
//     return;
//   }

//   if (!/^[0-9]{10}$/.test(form.phone)) {
//     alert("Invalid phone");
//     return;
//   }

//   setLoading(true);

//   try {
//     const res = await api.post("/customer/update.php", {
//       id,
//       company_id, // 🔥 IMPORTANT
//       name: form.name,
//       phone: form.phone,
//       address: form.address,
//       type: form.type,
//       credit_enabled: form.credit_enabled,
//       credit_limit: form.credit_enabled ? form.credit_limit : 0,
//       credit_days: form.credit_enabled ? form.credit_days : 0
//     });

//     if (res.data.status) {
//       alert("Updated successfully!");
//       navigate("/customer");
//     } else {
//       alert(res.data.message || "Update failed");
//     }

//   } catch {
//     alert("Server error");
//   }

//   setLoading(false);
// };

//   return (
//     <div style={{
//       minHeight: "100vh",
//       background: "#eef2f7",
//       display: "flex",
//       alignItems: "center",
//       justifyContent: "center",
//       fontFamily: "Inter, sans-serif"
//     }}>

//       <div style={{
//         width: 420,
//         background: "#fff",
//         borderRadius: 24,
//         padding: 28,
//         boxShadow: "0 20px 50px rgba(0,0,0,0.08)"
//       }}>

//         {/* HEADER */}
//         <div style={{ marginBottom: 20 }}>
//           <h2 style={{ margin: 0 }}>Edit Customer</h2>
//           <p style={{ color: "#64748b", fontSize: 13 }}>
//             Update customer details
//           </p>

//           <div style={{
//             marginTop: 8,
//             background: "#e0e7ff",
//             color: "#1d4ed8",
//             display: "inline-block",
//             padding: "4px 10px",
//             borderRadius: 10,
//             fontSize: 12,
//             fontWeight: 600
//           }}>
//             Customer ID: #{id}
//           </div>
//         </div>

//         <hr style={{ margin: "16px 0" }} />

//         {/* NAME */}
//         <label style={label}>Customer Name</label>
//         <input
//           value={form.name}
//           onChange={e => set("name", e.target.value)}
//           style={input}
//         />

//         {/* PHONE */}
//         <label style={label}>Mobile</label>
//         <input
//           value={form.phone}
//           onChange={e => set("phone", e.target.value)}
//           style={input}
//         />

//         {/* ADDRESS */}
//         <label style={label}>Address</label>
//         <textarea
//           value={form.address}
//           onChange={e => set("address", e.target.value)}
//           style={{ ...input, height: 70 }}
//         />

//         {/* TYPE */}
//         <label style={label}>Customer Type</label>
//         <select
//           value={form.type}
//           onChange={e => set("type", e.target.value)}
//           style={input}
//         >
//           <option value="regular">Regular</option>
//           <option value="wholesale">Wholesale</option>
//           <option value="retail">Retail</option>
//         </select>

//         {/* CREDIT */}
//         <label style={label}>Credit Enabled</label>
//         <select
//           value={form.credit_enabled}
//           onChange={e => set("credit_enabled", Number(e.target.value))}
//           style={input}
//         >
//           <option value={0}>No</option>
//           <option value={1}>Yes</option>
//         </select>

//         {/* CREDIT LIMIT */}
//         {form.credit_enabled === 1 && (
//           <>
//             <label style={label}>Credit Limit</label>
//             <input
//               type="number"
//               value={form.credit_limit}
//               onChange={e => set("credit_limit", e.target.value)}
//               style={input}
//             />
//           </>
//         )}

//         {/* CREDIT DAYS */}

// {Number(form.credit_enabled) === 1 && (
//   <>
//     <label style={label}>
//       Credit Days
//     </label>

//     <input
//       type="number"
//       placeholder="Enter credit days"
//       value={form.credit_days || ""}
//       onChange={e =>
//         set("credit_days", e.target.value)
//       }
//       style={input}
//     />
//   </>
// )}

//         {/* BUTTON */}
//         <button
//           onClick={handleUpdate}
//           style={{
//             width: "100%",
//             marginTop: 20,
//             padding: 14,
//             borderRadius: 14,
//             border: "none",
//             background: "linear-gradient(135deg,#2563eb,#3b82f6)",
//             color: "#fff",
//             fontWeight: 700,
//             cursor: "pointer"
//           }}
//         >
//           {loading ? "Updating..." : "💾 Update Customer"}
//         </button>

//         {/* BACK */}
//         <button
//           onClick={() => navigate("/customer")}
//           style={{
//             width: "100%",
//             marginTop: 10,
//             padding: 12,
//             borderRadius: 12,
//             border: "1px solid #e2e8f0",
//             background: "#f8fafc",
//             cursor: "pointer",
//             color: "#475569",
//             fontWeight: 600
//           }}
//         >
//           ← Back to Customers
//         </button>

//       </div>
//     </div>
//   );
// }

// /* STYLES */
// const input = {
//   width: "100%",
//   padding: "12px 14px",
//   marginBottom: 12,
//   borderRadius: 12,
//   border: "1px solid #e2e8f0",
//   outline: "none"
// };

// const label = {
//   fontSize: 12,
//   fontWeight: 600,
//   marginBottom: 4,
//   display: "block"
// };



import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";

export default function EditCustomer() {
  const { id } = useParams();
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

  const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

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

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(
          `/customer/get_customer_by_id?id=${id}`
        );
        if (res.data.status) {
          const isEnabled = Number(res.data.data.credit_enabled) === 1;
          setIsCreditAuthorized(isEnabled);
          setForm({
            ...res.data.data,
            credit_enabled: isEnabled ? 1 : 0
          });
        } else {
          showToast("Customer not found", false);
        }
      } catch {
        showToast("Error loading customer", false);
      }
    })();
  }, [id]);

  const handleUpdate = async () => {

    if (!form.name.trim()) {
      showToast("Customer name required", false);
      return;
    }

    if (!/^[0-9]{10}$/.test(form.phone)) {
      showToast("Invalid mobile number", false);
      return;
    }

    // GST validation based on type
    if (form.type === "B2B") {
      if (!form.gst_no?.trim()) {
        showToast("GST number is required for B2B customers", false);
        return;
      }
      if (!GST_REGEX.test(form.gst_no)) {
        showToast("Invalid GST format (e.g. 22ABCDE1234F1Z5)", false);
        return;
      }
    } else {
      if (form.gst_no?.trim() && !GST_REGEX.test(form.gst_no)) {
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
      const res = await api.post("/customer/update", {
        id,
        name: form.name,
        phone: form.phone,
        gst_no: form.type === "B2B" ? form.gst_no : (form.gst_no || ""),
        address: form.address,
        type: form.type,
        credit_enabled: form.credit_enabled,
        credit_limit: Number(form.credit_enabled) === 1 ? form.credit_limit : 0,
        credit_days: Number(form.credit_enabled) === 1 ? form.credit_days : 0
      });

      if (res.data.status) {
        showToast("Customer updated successfully!");
        setTimeout(() => navigate("/customer"), 1200);
      } else {
        showToast(res.data.message || "Update failed", false);
      }
    } catch {
      showToast("Server error", false);
    }

    setLoading(false);
  };

  return (
    <>
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          background: toast.ok ? "linear-gradient(135deg,#16a34a,#22c55e)" : "linear-gradient(135deg,#dc2626,#ef4444)",
          color: "#fff", padding: "14px 18px", borderRadius: 14, fontWeight: 600, fontSize: 14,
          boxShadow: "0 10px 25px rgba(0,0,0,0.15)", animation: "toastIn .25s ease"
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ minHeight: "100vh", background: "#eef2f7", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
        <div style={{ width: 420, background: "#fff", borderRadius: 24, padding: 28, boxShadow: "0 20px 50px rgba(0,0,0,0.08)" }}>

          <div style={{ marginBottom: 20 }}>
            <h2 style={{ margin: 0 }}>Edit Customer</h2>
            <p style={{ color: "#64748b", fontSize: 13 }}>Update customer details</p>
            <div style={{
              marginTop: 8, background: "#e0e7ff", color: "#1d4ed8", display: "inline-block",
              padding: "4px 10px", borderRadius: 10, fontSize: 12, fontWeight: 600
            }}>
              Customer ID: #{id}
            </div>
          </div>

          <hr style={{ margin: "16px 0" }} />

          <label style={label}>Customer Name</label>
          <input value={form.name} onChange={e => set("name", e.target.value)} style={input} />

          <label style={label}>Mobile</label>
          <input
            value={form.phone}
            onChange={e => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
            style={input}
          />

          <label style={label}>Address</label>
          <textarea
            value={form.address}
            onChange={e => set("address", e.target.value)}
            style={{ ...input, height: 70 }}
          />

          {/* TYPE — matches CustomerForm.jsx now */}
          <label style={label}>Customer Type</label>
          <select value={form.type} onChange={e => set("type", e.target.value)} style={input}>
            <option value="B2B">Regular B2B</option>
            <option value="B2C">Regular B2C</option>
          </select>

          {/* GST — mandatory/optional badge based on type */}
          <label style={{ ...label, display: "flex", alignItems: "center", gap: 6 }}>
            GST Number
            {form.type === "B2B" ? (
              <span style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", background: "#fef2f2", padding: "2px 8px", borderRadius: 20, border: "1px solid #fecaca" }}>
                Mandatory
              </span>
            ) : (
              <span style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", background: "#f0fdf4", padding: "2px 8px", borderRadius: 20, border: "1px solid #bbf7d0" }}>
                Optional
              </span>
            )}
          </label>
          <input
            placeholder="e.g. 22ABCDE1234F1Z5"
            value={form.gst_no || ""}
            maxLength={15}
            onChange={e => set("gst_no", e.target.value.toUpperCase().slice(0, 15))}
            style={input}
          />

          <label style={label}>Credit Enabled</label>
          <select
            value={form.credit_enabled}
            onChange={e => {
              const val = Number(e.target.value);
              set("credit_enabled", val);
              if (val === 0) {
                setIsCreditAuthorized(false);
                setOtpSent(false);
                setEnteredOtp("");
              }
            }}
            style={input}
          >
            <option value={0}>No</option>
            <option value={1}>Yes</option>
          </select>

          {Number(form.credit_enabled) === 1 && (
            <div style={{
              background: "#f8fafc", padding: "12px 14px", borderRadius: 12,
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
                  
                  <label style={label}>Credit Limit</label>
                  <input
                    type="number"
                    value={form.credit_limit || ""}
                    onChange={e => set("credit_limit", e.target.value)}
                    style={input}
                  />

                  <label style={label}>Credit Days</label>
                  <input
                    type="number"
                    placeholder="Enter credit days"
                    value={form.credit_days || ""}
                    onChange={e => set("credit_days", e.target.value)}
                    style={input}
                  />
                </>
              )}
            </div>
          )}

          <button
            onClick={handleUpdate}
            disabled={loading}
            style={{
              width: "100%", marginTop: 20, padding: 14, borderRadius: 14, border: "none",
              background: "linear-gradient(135deg,#2563eb,#3b82f6)", color: "#fff",
              fontWeight: 700, cursor: "pointer", opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? "Updating..." : "💾 Update Customer"}
          </button>

          <button
            onClick={() => navigate("/customer")}
            style={{
              width: "100%", marginTop: 10, padding: 12, borderRadius: 12,
              border: "1px solid #e2e8f0", background: "#f8fafc",
              cursor: "pointer", color: "#475569", fontWeight: 600
            }}
          >
            ← Back to Customers
          </button>

        </div>
      </div>
    </>
  );
}

const input = {
  width: "100%", padding: "12px 14px", marginBottom: 12,
  borderRadius: 12, border: "1px solid #e2e8f0", outline: "none", boxSizing: "border-box"
};

const label = { fontSize: 12, fontWeight: 600, marginBottom: 4, display: "block" };

const style = document.createElement("style");
style.innerHTML = `
@keyframes toastIn {
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;
document.head.appendChild(style);