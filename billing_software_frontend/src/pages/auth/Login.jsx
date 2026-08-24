import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, ShieldCheck } from "lucide-react";
import api from "../../services/api";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Forgot Password Flow states
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      showToast("Email and Password are required", false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.post("/auth/login", { email: email.trim(), password });
      if (res.data.status === true) {
        const role = res.data.role;
        const userData = res.data.data;
        const user = {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: role,
          company_id: userData.company_id || null,
          admin_id: userData.admin_id || null,
          active_token: res.data.active_token || null,
        };

        localStorage.setItem("user", JSON.stringify(user));
        console.log("LOGIN USER 👉", user);
        if (role === "superadmin") navigate("/admin");
        else navigate("/dashboard");
      } else {
        showToast(res.data.message || "Invalid credentials", false);
      }
    } catch (err) {
      console.error(err);
      showToast("Server error", false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!forgotEmail.trim()) {
      showToast("Please enter your email address", false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.post("/auth/send_otp", { email: forgotEmail.trim() });
      // The backend returns status string "success" or "error"
      if (res.data.status === "success") {
        showToast(res.data.message || "OTP sent to your email!");
        setForgotStep(2);
      } else {
        showToast(res.data.message || "Failed to send OTP", false);
      }
    } catch (err) {
      console.error(err);
      showToast("Error sending OTP", false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      showToast("Please enter the OTP", false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.post("/auth/verify_otp", {
        email: forgotEmail.trim(),
        otp: otp.trim()
      });
      // The backend returns status string "success" or "error"
      if (res.data.status === "success") {
        showToast("OTP verified successfully!");
        setForgotStep(3);
      } else {
        showToast(res.data.message || "Invalid OTP", false);
      }
    } catch (err) {
      console.error(err);
      showToast("Error verifying OTP", false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      showToast("Please fill in all fields", false);
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match", false);
      return;
    }
    if (newPassword.length < 6) {
      showToast("Password must be at least 6 characters", false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.post("/auth/forgot_password", {
        email: forgotEmail.trim(),
        password: newPassword
      });
      // The backend returns boolean status for forgot_password
      if (res.data.status === true) {
        showToast("Password updated successfully! Please log in.");
        // reset forgot password states and return to login
        setIsForgotMode(false);
        setForgotStep(1);
        setForgotEmail("");
        setOtp("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        showToast(res.data.message || "Password reset failed", false);
      }
    } catch (err) {
      console.error(err);
      showToast("Error resetting password", false);
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 14px 12px 40px",
    background: "#f9fafb",
    border: "1.5px solid transparent",
    borderRadius: 12,
    outline: "none",
    fontSize: 14,
    color: "#1e293b",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  const buttonStyle = {
    width: "100%",
    background: "linear-gradient(90deg, #1f8cff, #4338ca)",
    color: "#fff",
    fontWeight: 700,
    padding: "13px",
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    fontSize: 15,
    letterSpacing: 0.3,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
    boxShadow: "0 4px 18px rgba(31,140,255,0.35)",
  };

  const labelStyle = {
    display: "block",
    fontSize: 10,
    fontWeight: 700,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
    marginLeft: 4,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 9999,
            background: toast.ok
              ? "linear-gradient(135deg,#16a34a,#22c55e)"
              : "linear-gradient(135deg,#dc2626,#ef4444)",
            color: "#fff",
            padding: "14px 18px",
            borderRadius: 14,
            fontWeight: 600,
            fontSize: 14,
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            animation: "toastIn .25s ease",
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* ── Background: rice field image via CSS ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "url('https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=1600&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "brightness(0.42) saturate(1.1)",
          zIndex: 0,
        }}
      />

      {/* Subtle dark-blue overlay for readability */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(160deg, rgba(0,20,60,0.55) 0%, rgba(0,10,30,0.65) 100%)",
          zIndex: 1,
        }}
      />

      {/* Floating rice grain particles */}
      {[
        { top: "8%", left: "7%", w: 6, h: 16, delay: 0, dur: 4.2 },
        { top: "15%", left: "91%", w: 5, h: 13, delay: 0.6, dur: 5.0 },
        { top: "62%", left: "4%", w: 5, h: 14, delay: 1.1, dur: 3.8 },
        { top: "76%", left: "93%", w: 5, h: 13, delay: 0.3, dur: 4.6 },
        { top: "40%", left: "2%", w: 6, h: 16, delay: 0.9, dur: 5.1 },
        { top: "88%", left: "22%", w: 4, h: 11, delay: 0.4, dur: 4.0 },
        { top: "5%", left: "60%", w: 5, h: 14, delay: 1.2, dur: 4.8 },
        { top: "92%", left: "75%", w: 5, h: 13, delay: 0.7, dur: 5.2 },
        { top: "50%", left: "96%", w: 4, h: 12, delay: 1.5, dur: 4.3 },
        { top: "70%", left: "50%", w: 4, h: 11, delay: 0.5, dur: 3.9 },
      ].map((g, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            top: g.top,
            left: g.left,
            width: g.w,
            height: g.h,
            borderRadius: "50%",
            background: "linear-gradient(160deg, #e8f4ff, #90c4f8)",
            opacity: 0.45,
            zIndex: 2,
          }}
          animate={{ y: [0, -20, 0], rotate: [0, 14, -8, 0], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: g.dur, delay: g.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* ── Content wrapper ── */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: 420,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.5rem",
        }}
      >
        {/* Welcome heading */}
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          style={{ textAlign: "center" }}
        >
          <p
            style={{
              margin: "0 0 6px",
              fontSize: 11,
              letterSpacing: 3,
              color: "rgba(160,210,255,0.7)",
              textTransform: "uppercase",
              fontWeight: 500,
            }}
          >
            ✦ &nbsp;Welcome to&nbsp; ✦
          </p>
          <h1
            style={{
              margin: 0,
              fontSize: 32,
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: 0.5,
              lineHeight: 1.2,
              textShadow: "0 2px 20px rgba(0,100,255,0.4)",
            }}
          >
            Fathima{" "}
            <span
              style={{
                color: "#4da6ff",
                textShadow: "0 0 24px rgba(77,166,255,0.6)",
              }}
            >
              Enterprises
            </span>
          </h1>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 12,
              letterSpacing: 2,
              color: "rgba(160,210,255,0.5)",
              textTransform: "uppercase",
            }}
          >
            Premium Quality
          </p>
        </motion.div>

        {/* Login card — original design kept exactly */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            padding: "1.75rem 1.5rem",
            borderRadius: "2rem",
            boxShadow: "0 20px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.6)",
            boxSizing: "border-box",
          }}
        >
          {/* Icon and Title */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "1.5rem" }}>
            <div
              style={{
                width: 48,
                height: 48,
                background: "linear-gradient(135deg, #1f8cff, #4338ca)",
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 14px rgba(31,140,255,0.4)",
                marginBottom: 12,
              }}
            >
              <ShieldCheck size={24} color="white" />
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 900,
                color: "#1e293b",
                letterSpacing: -0.3,
                textAlign: "center",
              }}
            >
              {!isForgotMode
                ? "Sign in to your account"
                : forgotStep === 1
                ? "Reset your password"
                : forgotStep === 2
                ? "Verify OTP"
                : "Choose new password"}
            </h2>
            {isForgotMode && (
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: 13,
                  color: "#64748b",
                  textAlign: "center",
                }}
              >
                {forgotStep === 1
                  ? "Enter your email to receive a verification OTP."
                  : forgotStep === 2
                  ? `Enter the 6-digit OTP code sent to ${forgotEmail}`
                  : "Enter a strong new password for your account."}
              </p>
            )}
          </div>

          {/* Form Content */}
          {!isForgotMode ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Email */}
              <div>
                <label style={labelStyle}>Email</label>
                <div style={{ position: "relative" }}>
                  <Mail
                    size={18}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#9ca3af",
                      pointerEvents: "none",
                    }}
                  />
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                    onBlur={(e) => (e.target.style.borderColor = "transparent")}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={labelStyle}>Password</label>
                <div style={{ position: "relative" }}>
                  <Lock
                    size={18}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#9ca3af",
                      pointerEvents: "none",
                    }}
                  />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                    onBlur={(e) => (e.target.style.borderColor = "transparent")}
                  />
                </div>
                <div style={{ textAlign: "right", marginTop: 8 }}>
                  <button
                    onClick={() => {
                      setIsForgotMode(true);
                      setForgotStep(1);
                      setForgotEmail(email); // Autofill from login input if entered
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#2563eb",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleLogin}
                style={buttonStyle}
              >
                {isLoading ? (
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTop: "2px solid white",
                      animation: "spin 0.7s linear infinite",
                    }}
                  />
                ) : (
                  "Sign In"
                )}
              </motion.button>
            </div>
          ) : (
            /* Forgot Password Flow Stages */
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {forgotStep === 1 && (
                <>
                  <div>
                    <label style={labelStyle}>Email Address</label>
                    <div style={{ position: "relative" }}>
                      <Mail
                        size={18}
                        style={{
                          position: "absolute",
                          left: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#9ca3af",
                          pointerEvents: "none",
                        }}
                      />
                      <input
                        type="email"
                        placeholder="email@example.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                        style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                        onBlur={(e) => (e.target.style.borderColor = "transparent")}
                      />
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSendOtp}
                    style={buttonStyle}
                  >
                    {isLoading ? (
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          border: "2px solid rgba(255,255,255,0.3)",
                          borderTop: "2px solid white",
                          animation: "spin 0.7s linear infinite",
                        }}
                      />
                    ) : (
                      "Send OTP"
                    )}
                  </motion.button>

                  <button
                    onClick={() => setIsForgotMode(false)}
                    style={{
                      width: "100%",
                      background: "transparent",
                      color: "#475569",
                      fontWeight: 600,
                      padding: "10px",
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      cursor: "pointer",
                      fontSize: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 4,
                      transition: "all 0.2s",
                    }}
                  >
                    Back to Sign In
                  </button>
                </>
              )}

              {forgotStep === 2 && (
                <>
                  <div>
                    <label style={labelStyle}>Enter OTP Code</label>
                    <div style={{ position: "relative" }}>
                      <Lock
                        size={18}
                        style={{
                          position: "absolute",
                          left: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#9ca3af",
                          pointerEvents: "none",
                        }}
                      />
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="••••••"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                        onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                        style={{
                          ...inputStyle,
                          letterSpacing: otp ? 6 : "normal",
                          textAlign: otp ? "center" : "left",
                          paddingLeft: otp ? 14 : 40,
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                        onBlur={(e) => (e.target.style.borderColor = "transparent")}
                      />
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleVerifyOtp}
                    style={buttonStyle}
                  >
                    {isLoading ? (
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          border: "2px solid rgba(255,255,255,0.3)",
                          borderTop: "2px solid white",
                          animation: "spin 0.7s linear infinite",
                        }}
                      />
                    ) : (
                      "Verify OTP"
                    )}
                  </motion.button>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "0 4px" }}>
                    <button
                      onClick={handleSendOtp}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#2563eb",
                        fontWeight: 600,
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      Resend OTP
                    </button>
                    <button
                      onClick={() => setForgotStep(1)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#64748b",
                        fontWeight: 600,
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      Change Email
                    </button>
                  </div>
                </>
              )}

              {forgotStep === 3 && (
                <>
                  <div>
                    <label style={labelStyle}>New Password</label>
                    <div style={{ position: "relative" }}>
                      <Lock
                        size={18}
                        style={{
                          position: "absolute",
                          left: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#9ca3af",
                          pointerEvents: "none",
                        }}
                      />
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                        onBlur={(e) => (e.target.style.borderColor = "transparent")}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Confirm Password</label>
                    <div style={{ position: "relative" }}>
                      <Lock
                        size={18}
                        style={{
                          position: "absolute",
                          left: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#9ca3af",
                          pointerEvents: "none",
                        }}
                      />
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
                        style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                        onBlur={(e) => (e.target.style.borderColor = "transparent")}
                      />
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleResetPassword}
                    style={buttonStyle}
                  >
                    {isLoading ? (
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          border: "2px solid rgba(255,255,255,0.3)",
                          borderTop: "2px solid white",
                          animation: "spin 0.7s linear infinite",
                        }}
                      />
                    ) : (
                      "Reset Password"
                    )}
                  </motion.button>
                </>
              )}
            </div>
          )}
        </motion.div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}