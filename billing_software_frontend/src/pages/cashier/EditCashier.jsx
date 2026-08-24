import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { Eye, EyeOff } from "lucide-react";

export default function EditCashier() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState("");
  const [toast, setToast] = useState(null);

  const fetchCashier = async () => {
    const res = await api.get(`/cashier/get_cashier_by_id?id=${id}`);
    if (res.data.status) {
      setForm({ name: res.data.data.name, email: res.data.data.email, password: "" });
    }
  };
const showToast = (msg, ok = true) => {

  setToast({ msg, ok });

  setTimeout(() => {
    setToast(null);
  }, 3000);

};
  useEffect(() => { fetchCashier(); }, []);

 const handleUpdate = async () => {

  if (!form.name.trim()) {
    showToast("Name is required", false);
    return;
  }

  if (!form.email.trim()) {
    showToast("Email is required", false);
    return;
  }


  if (form.password && form.password.trim().length < 6) {
  showToast("Password must be at least 6 characters", false);
  return;
}

  if (!/\S+@\S+\.\S+/.test(form.email)) {
    showToast("Enter valid email", false);
    return;
  }

  setLoading(true);

  try {

    const res = await api.post(
      "/cashier/update_cashier",
      {
        id,
        name: form.name,
        email: form.email,
        password: form.password
      }
    );

    if (res.data.status) {

      showToast(
        res.data.message || "Cashier updated successfully!",
        true
      );

      setTimeout(() => {
        navigate("/cashier");
      }, 1500);

    } else {

      showToast(
        res.data.message || "Failed to update cashier",
        false
      );

    }

  } catch (err) {

    console.error(err);

    showToast(
      "Server error. Try again.",
      false
    );

  }

  setLoading(false);

};

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Sans:wght@300;400;500&display=swap');

        .ec-wrapper {
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0f4ff;
          padding: 2rem;
          position: relative;
          overflow: hidden;
        }

        .ec-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.35;
          pointer-events: none;
        }
        .ec-blob-1 {
          width: 420px; height: 420px;
          background: #2563eb;
          top: -120px; right: -80px;
        }
        .ec-blob-2 {
          width: 300px; height: 300px;
          background: #60a5fa;
          bottom: -80px; left: -60px;
        }
        .ec-blob-3 {
          width: 180px; height: 180px;
          background: #93c5fd;
          top: 50%; left: 40%;
        }

        .ec-card {
          position: relative;
          width: 100%;
          max-width: 520px;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-radius: 28px;
          border: 1px solid rgba(255,255,255,0.9);
          box-shadow:
            0 4px 24px rgba(37, 99, 235, 0.12),
            0 1px 3px rgba(37, 99, 235, 0.08),
            inset 0 1px 0 rgba(255,255,255,1);
          overflow: hidden;
          animation: slideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(32px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .ec-header {
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%);
          padding: 2rem 2rem 2.5rem;
          position: relative;
          overflow: hidden;
        }

        .ec-header::before {
          content: '';
          position: absolute;
          top: -40px; right: -40px;
          width: 160px; height: 160px;
          border-radius: 50%;
          background: rgba(255,255,255,0.08);
        }
        .ec-header::after {
          content: '';
          position: absolute;
          bottom: -20px; left: 30%;
          width: 200px; height: 80px;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
        }

        .ec-header-top {
          display: flex;
          align-items: center;
          gap: 1rem;
          position: relative;
          z-index: 1;
        }

        .ec-avatar-ring {
          width: 56px; height: 56px;
          border-radius: 18px;
          background: rgba(255,255,255,0.18);
          border: 1.5px solid rgba(255,255,255,0.35);
          display: flex; align-items: center; justify-content: center;
          font-size: 22px;
          backdrop-filter: blur(8px);
        }

        .ec-title {
          font-family: 'Sora', sans-serif;
          font-size: 22px;
          font-weight: 700;
          color: #fff;
          margin: 0;
          letter-spacing: -0.3px;
        }
        .ec-subtitle {
          font-size: 13px;
          color: rgba(255,255,255,0.72);
          margin: 3px 0 0;
          font-weight: 400;
        }

        .ec-badge {
          position: relative; z-index: 1;
          margin-top: 1.2rem;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.25);
          border-radius: 100px;
          padding: 4px 12px 4px 6px;
          font-size: 12px;
          color: rgba(255,255,255,0.9);
          font-weight: 500;
        }
        .ec-badge-dot {
          width: 7px; height: 7px;
          background: #4ade80;
          border-radius: 50%;
          box-shadow: 0 0 6px #4ade80;
        }

        .ec-body {
          padding: 2rem;
        }

        .ec-field {
          margin-bottom: 1.25rem;
          animation: fadeIn 0.4s ease both;
        }
        .ec-field:nth-child(1) { animation-delay: 0.08s; }
        .ec-field:nth-child(2) { animation-delay: 0.14s; }
        .ec-field:nth-child(3) { animation-delay: 0.20s; }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .ec-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 8px;
        }

        .ec-input-wrap {
          position: relative;
        }

        .ec-input-icon {
          position: absolute;
          left: 14px; top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          font-size: 16px;
          transition: color 0.2s;
          pointer-events: none;
        }

        .ec-input {
          width: 100%;
          padding: 13px 14px 13px 42px;
          border-radius: 14px;
          border: 1.5px solid #e2e8f0;
          background: #f8faff;
          font-family: 'DM Sans', sans-serif;
          font-size: 14.5px;
          color: #1e293b;
          outline: none;
          box-sizing: border-box;
          transition: all 0.25s;
        }
        .ec-input::placeholder { color: #b0bec5; }
        .ec-input:hover { border-color: #93c5fd; background: #f0f6ff; }
        .ec-input:focus {
          border-color: #2563eb;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
        }
        .ec-input:focus + .ec-input-icon,
        .ec-input-wrap:focus-within .ec-input-icon {
          color: #2563eb;
        }

        .ec-pw-toggle {
          position: absolute;
          right: 14px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          cursor: pointer; padding: 4px;
          color: #94a3b8;
          font-size: 17px;
          transition: color 0.2s;
          line-height: 1;
        }
        .ec-pw-toggle:hover { color: #2563eb; }

        .ec-hint {
          margin-top: 6px;
          font-size: 11.5px;
          color: #94a3b8;
          display: flex; align-items: center; gap: 4px;
        }

        .ec-divider {
          height: 1px;
          background: linear-gradient(to right, transparent, #e2e8f0, transparent);
          margin: 1.5rem 0;
        }

        .ec-btn {
          width: 100%;
          padding: 15px;
          border-radius: 16px;
          border: none;
          cursor: pointer;
          font-family: 'Sora', sans-serif;
          font-size: 15px;
          font-weight: 600;
          letter-spacing: 0.01em;
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 60%, #3b82f6 100%);
          color: #fff;
          box-shadow: 0 4px 16px rgba(37, 99, 235, 0.4), 0 1px 3px rgba(37,99,235,0.2);
          transition: all 0.25s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .ec-btn::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          transition: left 0.4s;
        }
        .ec-btn:hover::before { left: 100%; }
        .ec-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(37, 99, 235, 0.5), 0 2px 6px rgba(37,99,235,0.25);
        }
        .ec-btn:active { transform: translateY(0); }
        .ec-btn:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }

        .ec-back-btn {
          width: 100%;
          padding: 12px;
          border-radius: 14px;
          border: 1.5px solid #e2e8f0;
          background: transparent;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          color: #64748b;
          cursor: pointer;
          margin-top: 10px;
          transition: all 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        .ec-back-btn:hover { background: #f1f5f9; color: #1e293b; border-color: #cbd5e1; }

        .ec-spinner {
          width: 18px; height: 18px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .ec-id-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 600;
          color: #2563eb;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 3px 9px;
          margin-bottom: 1.25rem;
        }

        @keyframes ec-toast {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
      `}</style>

{/* TOAST */}

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
      padding: "13px 18px",
      borderRadius: 14,
      boxShadow: "0 10px 30px rgba(0,0,0,.15)",
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontWeight: 600,
      fontSize: 14,
      animation: "ec-toast .25s ease"
    }}
  >

    <div
      style={{
        width: 22,
        height: 22,
        borderRadius: 7,
        background: "rgba(255,255,255,.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 700
      }}
    >
      {toast.ok ? "✓" : "✕"}
    </div>

    {toast.msg}

  </div>

)}
      <div className="ec-wrapper">
        <div className="ec-blob ec-blob-1" />
        <div className="ec-blob ec-blob-2" />
        <div className="ec-blob ec-blob-3" />

        <div className="ec-card">
          {/* Header */}
          <div className="ec-header">
            <div className="ec-header-top">
              <div className="ec-avatar-ring">✏️</div>
              <div>
                <h1 className="ec-title">Edit Cashier</h1>
                <p className="ec-subtitle">Update account details below</p>
              </div>
            </div>
            <div className="ec-badge">
              <span className="ec-badge-dot" />
              Active Account
            </div>
          </div>

          {/* Body */}
          <div className="ec-body">
            <div className="ec-id-chip">
              🔖 Cashier ID: #{id}
            </div>

            {/* Full Name */}
            <div className="ec-field">
              <label className="ec-label">Full Name</label>
              <div className="ec-input-wrap">
                <input
                  type="text"
                  className="ec-input"
                  placeholder="Enter full name"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
                <span className="ec-input-icon">👤</span>
              </div>
            </div>

            {/* Email */}
            <div className="ec-field">
              <label className="ec-label">Email Address</label>
              <div className="ec-input-wrap">
                <input
                  type="email"
                  className="ec-input"
                  placeholder="email@example.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
                <span className="ec-input-icon">✉️</span>
              </div>
            </div>

          

            {/* Password */}
<div className="ec-field">
  <label className="ec-label">New Password</label>
  <div className="ec-input-wrap">
    <input
      type={showPassword ? "text" : "password"}
      className="ec-input"
      placeholder="Leave blank to keep current"
      value={form.password}
      onChange={e => setForm({ ...form, password: e.target.value })}
    />
    <span className="ec-input-icon">🔒</span>
    <button
      type="button"
      className="ec-pw-toggle"
      onClick={() => setShowPassword(p => !p)}
    >
      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
    </button>
  </div>
  <p className="ec-hint">⚡ Min. 6 characters. Leave empty to keep unchanged.</p>
</div>

            <div className="ec-divider" />

            {/* Submit */}
            <button className="ec-btn" onClick={handleUpdate} disabled={loading}>
              {loading ? (
                <><div className="ec-spinner" /> Updating...</>
              ) : (
                <> ✨ Update Cashier</>
              )}
            </button>

            {/* <button className="ec-back-btn" onClick={() => navigate("/cashier")}>
              ← Back to Cashiers
            </button> */}
          </div>
        </div>
      </div>
    </>
  );
}

