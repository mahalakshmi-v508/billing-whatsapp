import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

/* ─── Toast Hook ─────────────────────────────────────────── */
function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = (type, title, msg) => {
    const id = Date.now();
    setToasts(p => [...p, { id, type, title, msg }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3800);
  };
  const remove = (id) => setToasts(p => p.filter(t => t.id !== id));
  return { toasts, show, remove };
}

/* ─── Toast UI ───────────────────────────────────────────── */
function ToastPortal({ toasts, remove }) {
  return (
    <div style={{
      position: "fixed", top: 24, right: 24, zIndex: 9999,
      display: "flex", flexDirection: "column", gap: 10, pointerEvents: "none"
    }}>
      {toasts.map(t => (
        <div key={t.id} className={`sf-toast sf-toast-${t.type}`}>
          <div className="sf-toast-icon">
            {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "!"}
          </div>
          <div className="sf-toast-content">
            <p className="sf-toast-title">{t.title}</p>
            {t.msg && <p className="sf-toast-msg">{t.msg}</p>}
          </div>
          <button className="sf-toast-x" style={{ pointerEvents: "auto" }} onClick={() => remove(t.id)}>✕</button>
          <div className="sf-toast-progress" />
        </div>
      ))}
    </div>
  );
}

/* ─── Field config ───────────────────────────────────────── */
const FIELDS = [
  { key: "supplier_name",  label: "Supplier Name",       required: true,  type: "text",  placeholder: "e.g. Sri Ganesh Traders" },
  { key: "mobile_number",  label: "Mobile Number",       required: true,  type: "tel",   placeholder: "10-digit mobile number" },
  { key: "alt_mobile",     label: "Alternative Mobile",  required: false, type: "tel",   placeholder: "Optional alternate number" },
  { key: "email",          label: "Email",                required: false, type: "email", placeholder: "supplier@example.com" },
  { key: "gst_number",     label: "GST Number",          required: false, type: "text",  placeholder: "22AAAAA0000A1Z5" },
  { key: "address",        label: "Address",             required: false, type: "text",  placeholder: "Door No, Street, Area" },
  { key: "city",           label: "City",                required: false, type: "text",  placeholder: "e.g. Coimbatore" },
  { key: "district",       label: "District",            required: false, type: "text",  placeholder: "e.g. Coimbatore" },
  { key: "state",          label: "State",               required: false, type: "text",  placeholder: "e.g. Tamil Nadu" },
  { key: "pincode",        label: "Pincode",             required: false, type: "text",  placeholder: "6-digit pincode" },
  { key: "country",        label: "Country",             required: false, type: "text",  placeholder: "e.g. India" },
];

const emptyForm = FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: "" }), {});

/* ─── Main Component ─────────────────────────────────────── */
export default function SupplierForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const { toasts, show, remove } = useToast();

  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(
    localStorage.getItem("selected_company_id") || ""
  );

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user?.id) return;
    loadCompanies(user.id);
  }, []);

  const loadCompanies = async (admin_id) => {
    try {
      const res = await api.get(`/company/get_companies_by_admin?admin_id=${admin_id}`);
      if (res.data.status) {
        setCompanies(res.data.data);
        if (!localStorage.getItem("selected_company_id") && res.data.data.length > 0) {
          localStorage.setItem("selected_company_id", res.data.data[0].id);
          setSelectedCompany(res.data.data[0].id);
        }
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleField = (key, value) => {
    if (key === "mobile_number" || key === "alt_mobile") {
      value = value.replace(/\D/g, "").slice(0, 10);
    } else if (key === "gst_number") {
      value = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 15);
    } else if (key === "pincode") {
      value = value.replace(/\D/g, "").slice(0, 6);
    }
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    if (!form.supplier_name.trim()) {
      show("warn", "Missing field", "Supplier name is required.");
      return false;
    }
    if (!form.mobile_number.trim()) {
      show("warn", "Missing field", "Mobile number is required.");
      return false;
    }
    if (!/^\d{10}$/.test(form.mobile_number.trim())) {
      show("warn", "Invalid mobile", "Enter a valid 10-digit mobile number.");
      return false;
    }
    if (form.alt_mobile.trim() && !/^\d{10}$/.test(form.alt_mobile.trim())) {
      show("warn", "Invalid mobile", "Alternative mobile must be 10 digits.");
      return false;
    }
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      show("warn", "Invalid email", "Enter a valid email address.");
      return false;
    }
    if (form.gst_number.trim() && form.gst_number.trim().length !== 15) {
      show("warn", "Invalid GST", "GST number must be exactly 15 characters.");
      return false;
    }
    if (form.pincode.trim() && !/^\d{6}$/.test(form.pincode.trim())) {
      show("warn", "Invalid pincode", "Pincode must be exactly 6 digits.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    const company_id = Number(selectedCompany);
    if (!company_id) {
      show("error", "Auth error", "Please select a company.");
      return;
    }
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await api.post("/supplier/create", {
        ...form,
        supplier_name: form.supplier_name.trim(),
        mobile_number: form.mobile_number.trim(),
        company_id,
      });
      if (res.data.status) {
        show("success", "Supplier added!", `"${form.supplier_name.trim()}" has been created.`);
        setTimeout(() => navigate("/supplier"), 2000);
      } else {
        show("error", "Failed", res.data.message || "Something went wrong.");
      }
    } catch (err) {
      console.error(err);
      show("error", "Server error", "Unable to reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .sf-page {
          font-family: 'Plus Jakarta Sans', sans-serif;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #eef2ff;
          padding: 2rem;
          position: relative;
          overflow: hidden;
        }

        .sf-bg-ring { position: absolute; border-radius: 50%; pointer-events: none; }
        .sf-bg-ring-1 { width: 500px; height: 500px; border: 60px solid rgba(37,99,235,0.07); top: -180px; right: -160px; }
        .sf-bg-ring-2 { width: 320px; height: 320px; border: 40px solid rgba(99,102,241,0.06); bottom: -100px; left: -80px; }
        .sf-bg-dot { position: absolute; width: 6px; height: 6px; border-radius: 50%; background: rgba(37,99,235,0.18); pointer-events: none; }

        .sf-card {
          position: relative;
          width: 100%;
          max-width: 640px;
          background: #ffffff;
          border-radius: 26px;
          border: 1px solid rgba(226,232,240,0.8);
          box-shadow: 0 0 0 1px rgba(255,255,255,0.9) inset, 0 20px 60px rgba(37,99,235,0.1), 0 4px 16px rgba(0,0,0,0.04);
          overflow: hidden;
          animation: sfSlideUp 0.5s cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes sfSlideUp {
          from { opacity:0; transform:translateY(28px) scale(0.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }

        .sf-stripe {
          height: 5px;
          background: linear-gradient(90deg, #1d4ed8, #6366f1, #3b82f6, #1d4ed8);
          background-size: 200% 100%;
          animation: sfStripe 3s linear infinite;
        }
        @keyframes sfStripe { 0% { background-position: 0% 0%; } 100% { background-position: 200% 0%; } }

        .sf-header { padding: 2rem 2rem 1.5rem; display: flex; align-items: flex-start; gap: 1rem; }
        .sf-icon-box {
          width: 52px; height: 52px; border-radius: 16px;
          background: linear-gradient(135deg, #1d4ed8, #3b82f6);
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; flex-shrink: 0;
          box-shadow: 0 6px 20px rgba(37,99,235,0.35);
        }
        .sf-header-text h1 { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 4px; letter-spacing: -0.4px; }
        .sf-header-text p { font-size: 13px; color: #94a3b8; margin: 0; font-weight: 400; }

        .sf-hr { height: 1px; background: #f1f5f9; margin: 0 2rem; }
        .sf-body { padding: 1.75rem 2rem 2rem; }

        .sf-section-label {
          font-size: 11.5px; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; color: #64748b; margin: 1.5rem 0 10px;
        }
        .sf-section-label:first-child { margin-top: 0; }

        .sf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .sf-grid .sf-full { grid-column: 1 / -1; }

        .sf-field-label {
          font-size: 11.5px; font-weight: 700; letter-spacing: 0.04em;
          color: #64748b; margin-bottom: 6px; display: block;
        }
        .sf-field-label .req { color: #ef4444; margin-left: 3px; }

        .sf-input, .sf-select {
          width: 100%;
          padding: 13px 14px;
          border-radius: 12px;
          border: 1.5px solid #e2e8f0;
          background: #f8faff;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          color: #1e293b;
          outline: none;
          box-sizing: border-box;
          transition: all 0.25s;
        }
        .sf-input::placeholder { color: #c4cdd6; font-weight: 400; }
        .sf-input:hover, .sf-select:hover { border-color: #bfdbfe; background: #f0f6ff; }
        .sf-input:focus, .sf-select:focus {
          border-color: #3b82f6; background: #fff;
          box-shadow: 0 0 0 4px rgba(59,130,246,0.1);
        }

        .sf-field { margin-bottom: 14px; }

        .sf-btn {
          width: 100%;
          padding: 15px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.01em;
          background: linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%);
          color: #fff;
          box-shadow: 0 4px 18px rgba(37,99,235,0.38), 0 1px 3px rgba(37,99,235,0.15);
          position: relative;
          overflow: hidden;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: all 0.25s;
          margin-top: 1.5rem;
        }
        .sf-btn::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 60%);
          pointer-events: none;
        }
        .sf-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(37,99,235,0.45), 0 2px 6px rgba(37,99,235,0.2); }
        .sf-btn:active:not(:disabled) { transform: translateY(0); }
        .sf-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .sf-btn-cancel {
          width: 100%; margin-top: 10px; padding: 12px;
          border-radius: 12px; border: 1.5px solid #e2e8f0;
          background: transparent;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13.5px; font-weight: 600; color: #94a3b8;
          cursor: pointer; transition: all 0.2s;
        }
        .sf-btn-cancel:hover { background: #f8fafc; color: #475569; border-color: #cbd5e1; }

        .sf-spinner {
          width: 17px; height: 17px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #fff; border-radius: 50%;
          animation: spin 0.7s linear infinite; flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 560px) {
          .sf-grid { grid-template-columns: 1fr; }
        }

        /* ── Toast styles ── */
        .sf-toast {
          pointer-events: auto; display: flex; align-items: center; gap: 12px;
          min-width: 290px; max-width: 370px; padding: 13px 16px;
          border-radius: 16px; position: relative; overflow: hidden;
          box-shadow: 0 8px 30px rgba(0,0,0,0.13), 0 2px 6px rgba(0,0,0,0.06);
          animation: sfToastIn 0.4s cubic-bezier(0.22,1,0.36,1) both;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        @keyframes sfToastIn { from { opacity:0; transform:translateX(60px) scale(0.9); } to { opacity:1; transform:translateX(0) scale(1); } }
        .sf-toast-success { background: #f0fdf4; border: 1px solid #bbf7d0; }
        .sf-toast-error { background: #fff1f2; border: 1px solid #fecdd3; }
        .sf-toast-warn { background: #fffbeb; border: 1px solid #fde68a; }
        .sf-toast-icon { width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 800; flex-shrink: 0; }
        .sf-toast-success .sf-toast-icon { background: #dcfce7; color: #16a34a; }
        .sf-toast-error   .sf-toast-icon { background: #ffe4e6; color: #e11d48; }
        .sf-toast-warn    .sf-toast-icon { background: #fef9c3; color: #b45309; }
        .sf-toast-content { flex: 1; }
        .sf-toast-title { font-size: 13px; font-weight: 700; margin: 0 0 2px; }
        .sf-toast-success .sf-toast-title { color: #15803d; }
        .sf-toast-error   .sf-toast-title { color: #be123c; }
        .sf-toast-warn    .sf-toast-title { color: #92400e; }
        .sf-toast-msg { font-size: 12px; margin: 0; font-weight: 400; }
        .sf-toast-success .sf-toast-msg { color: #16a34a; }
        .sf-toast-error   .sf-toast-msg { color: #e11d48; }
        .sf-toast-warn    .sf-toast-msg { color: #b45309; }
        .sf-toast-x { background: none; border: none; cursor: pointer; font-size: 13px; opacity: 0.4; transition: opacity 0.2s; flex-shrink: 0; padding: 2px; }
        .sf-toast-x:hover { opacity: 0.9; }
        .sf-toast-progress { position: absolute; bottom: 0; left: 0; height: 3px; border-radius: 0 0 16px 16px; animation: sfShrink 3.8s linear forwards; }
        .sf-toast-success .sf-toast-progress { background: #4ade80; }
        .sf-toast-error   .sf-toast-progress { background: #fb7185; }
        .sf-toast-warn    .sf-toast-progress { background: #fbbf24; }
        @keyframes sfShrink { from { width: 100%; } to { width: 0%; } }
      `}</style>

      <ToastPortal toasts={toasts} remove={remove} />

      <div className="sf-page">
        <div className="sf-bg-ring sf-bg-ring-1" />
        <div className="sf-bg-ring sf-bg-ring-2" />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="sf-bg-dot" style={{
            top: `${[15,25,70,80,40,60,10,90][i]}%`,
            left: `${[10,85,5,90,50,20,70,45][i]}%`,
            opacity: 0.4 + i * 0.05
          }} />
        ))}

        <div className="sf-card">
          <div className="sf-stripe" />

          <div className="sf-header">
            <div className="sf-icon-box">🚚</div>
            <div className="sf-header-text">
              <h1>Add Supplier</h1>
              <p>Add a new supplier to your company</p>
            </div>
          </div>

          <div className="sf-hr" />

          <div className="sf-body">

            <div className="sf-field">
              <label className="sf-field-label">Select Company<span className="req">*</span></label>
              <select
                className="sf-select"
                value={selectedCompany}
                onChange={(e) => {
                  setSelectedCompany(e.target.value);
                  localStorage.setItem("selected_company_id", e.target.value);
                }}
              >
                <option value="">Select Company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>{company.company_name}</option>
                ))}
              </select>
            </div>

            <div className="sf-section-label">Contact Details</div>
            <div className="sf-grid">
              {["supplier_name", "mobile_number", "alt_mobile", "email", "gst_number"].map((key) => {
                const f = FIELDS.find(x => x.key === key);
                const isMobile = key === "mobile_number" || key === "alt_mobile";
                const isGst = key === "gst_number";
                return (
                  <div className="sf-field" key={f.key}>
                    <label className="sf-field-label">
                      {f.label}{f.required && <span className="req">*</span>}
                    </label>
                    <input
                      type={f.type}
                      className="sf-input"
                      placeholder={f.placeholder}
                      value={form[f.key]}
                      maxLength={isMobile ? 10 : isGst ? 15 : undefined}
                      inputMode={isMobile ? "numeric" : undefined}
                      onChange={(e) => handleField(f.key, e.target.value)}
                    />
                  </div>
                );
              })}
            </div>

            <div className="sf-section-label">Address Details</div>
            <div className="sf-grid">
              <div className="sf-field sf-full">
                <label className="sf-field-label">Address</label>
                <input
                  type="text"
                  className="sf-input"
                  placeholder="Door No, Street, Area"
                  value={form.address}
                  onChange={(e) => handleField("address", e.target.value)}
                />
              </div>
              {["city", "district", "state", "pincode", "country"].map((key) => {
                const f = FIELDS.find(x => x.key === key);
                const isPincode = key === "pincode";
                return (
                  <div className="sf-field" key={f.key}>
                    <label className="sf-field-label">{f.label}</label>
                    <input
                      type="text"
                      className="sf-input"
                      placeholder={f.placeholder}
                      value={form[f.key]}
                      maxLength={isPincode ? 6 : undefined}
                      inputMode={isPincode ? "numeric" : undefined}
                      onChange={(e) => handleField(f.key, e.target.value)}
                    />
                  </div>
                );
              })}
            </div>

            <button className="sf-btn" onClick={handleSubmit} disabled={loading}>
              {loading ? <><div className="sf-spinner" /> Saving…</> : <>💾 Save Supplier</>}
            </button>
            <button className="sf-btn-cancel" onClick={() => navigate("/supplier")}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}