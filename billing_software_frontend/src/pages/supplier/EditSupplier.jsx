import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

/* ─── Toast Portal ───────────────────────────────────────── */
function ToastPortal({ toasts, remove }) {
  return (
    <div style={{
      position: "fixed", top: 24, right: 24, zIndex: 9999,
      display: "flex", flexDirection: "column", gap: 10, pointerEvents: "none"
    }}>
      {toasts.map(t => (
        <div key={t.id} className={`es-toast es-toast-${t.type}`}>
          <div className="es-toast-icon">
            {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "!"}
          </div>
          <div className="es-toast-content">
            <p className="es-toast-title">{t.title}</p>
            {t.msg && <p className="es-toast-msg">{t.msg}</p>}
          </div>
          <button className="es-toast-x" style={{ pointerEvents: "auto" }} onClick={() => remove(t.id)}>✕</button>
          <div className="es-toast-progress" />
        </div>
      ))}
    </div>
  );
}

const FIELDS = [
  { key: "supplier_name",  label: "Supplier Name",       required: true,  type: "text",  placeholder: "e.g. Sri Ganesh Traders" },
  { key: "mobile_number",  label: "Mobile Number",       required: true,  type: "tel",   placeholder: "10-digit mobile number" },
  { key: "alt_mobile",     label: "Alternative Mobile",  required: false, type: "tel",   placeholder: "Optional alternate number" },
  { key: "email",          label: "Email",                required: false, type: "email", placeholder: "supplier@example.com" },
  { key: "gst_number",     label: "GST Number",          required: false, type: "text",  placeholder: "22AAAAA0000A1Z5" },
  { key: "city",           label: "City",                required: false, type: "text",  placeholder: "e.g. Coimbatore" },
  { key: "district",       label: "District",            required: false, type: "text",  placeholder: "e.g. Coimbatore" },
  { key: "state",          label: "State",               required: false, type: "text",  placeholder: "e.g. Tamil Nadu" },
  { key: "pincode",        label: "Pincode",             required: false, type: "text",  placeholder: "6-digit pincode" },
  { key: "country",        label: "Country",             required: false, type: "text",  placeholder: "e.g. India" },
];

const emptyForm = FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: "" }), { address: "" });

/* ─── Main Component ─────────────────────────────────────── */
export default function EditSupplier() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [original, setOriginal] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const { toasts, show, remove } = useToast();

  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [originalCompany, setOriginalCompany] = useState("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user?.id) return;

    api.get(`/company/get_companies_by_admin?admin_id=${user.id}`)
      .then(res => {
        if (res.data.status) {
          setCompanies(res.data.data);
        }
      });
  }, []);

  const fetchSupplier = async () => {
    setFetching(true);
    try {
      const res = await api.get(`/supplier/get_by_id?id=${id}`);
      if (res.data.status && res.data.data) {
        const d = res.data.data;
        const loaded = { ...emptyForm };
        Object.keys(loaded).forEach((k) => { loaded[k] = d[k] || ""; });
        setForm(loaded);
        setOriginal(loaded);
        setSelectedCompany(String(d.company_id || ""));
        setOriginalCompany(String(d.company_id || ""));
      } else {
        show("error", "Not found", "Supplier could not be loaded.");
      }
    } catch {
      show("error", "Server error", "Failed to fetch supplier.");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { fetchSupplier(); }, [id]);

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

  const isDirty = JSON.stringify(form) !== JSON.stringify(original) || selectedCompany !== originalCompany;

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

  const handleUpdate = async () => {
    if (!selectedCompany) {
      show("error", "Auth error", "Please select a company.");
      return;
    }
    if (!isDirty) {
      show("warn", "No changes", "You haven't changed anything.");
      return;
    }
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await api.post("/supplier/update", {
        id,
        ...form,
        supplier_name: form.supplier_name.trim(),
        mobile_number: form.mobile_number.trim(),
        company_id: Number(selectedCompany),
      });
      if (res.data.status) {
        show("success", "Supplier updated!", `"${form.supplier_name.trim()}" saved successfully.`);
        setTimeout(() => navigate("/supplier"), 2000);
      } else {
        show("error", "Update failed", res.data.message || "Something went wrong.");
      }
    } catch {
      show("error", "Server error", "Unable to reach the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .es-page {
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

        .es-bg-ring { position: absolute; border-radius: 50%; pointer-events: none; }
        .es-bg-ring-1 { width: 480px; height: 480px; border: 55px solid rgba(37,99,235,0.07); top: -170px; right: -140px; }
        .es-bg-ring-2 { width: 300px; height: 300px; border: 38px solid rgba(99,102,241,0.06); bottom: -90px; left: -70px; }
        .es-bg-dot { position: absolute; width: 6px; height: 6px; border-radius: 50%; background: rgba(37,99,235,0.15); pointer-events: none; }

        .es-card {
          position: relative;
          width: 100%;
          max-width: 640px;
          background: #ffffff;
          border-radius: 26px;
          border: 1px solid rgba(226,232,240,0.8);
          box-shadow: 0 0 0 1px rgba(255,255,255,0.9) inset, 0 20px 60px rgba(37,99,235,0.1), 0 4px 16px rgba(0,0,0,0.04);
          overflow: hidden;
          animation: esSlideUp 0.5s cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes esSlideUp { from { opacity:0; transform:translateY(28px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }

        .es-stripe {
          height: 5px;
          background: linear-gradient(90deg, #1d4ed8, #6366f1, #3b82f6, #1d4ed8);
          background-size: 200% 100%;
          animation: esStripe 3s linear infinite;
        }
        @keyframes esStripe { 0% { background-position: 0% 0%; } 100% { background-position: 200% 0%; } }

        .es-header { padding: 2rem 2rem 1.5rem; display: flex; align-items: flex-start; gap: 1rem; }
        .es-icon-box {
          width: 52px; height: 52px; border-radius: 16px;
          background: linear-gradient(135deg, #1d4ed8, #3b82f6);
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; flex-shrink: 0;
          box-shadow: 0 6px 20px rgba(37,99,235,0.35);
        }
        .es-header-text h1 { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 4px; letter-spacing: -0.4px; }
        .es-header-text p { font-size: 13px; color: #94a3b8; margin: 0; font-weight: 400; }
        .es-id-badge {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 700; color: #2563eb;
          background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;
          padding: 3px 9px; margin-top: 6px;
        }

        .es-hr { height: 1px; background: #f1f5f9; margin: 0 2rem; }
        .es-body { padding: 1.75rem 2rem 2rem; }

        .es-section-label {
          font-size: 11.5px; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; color: #64748b; margin: 1.5rem 0 10px;
        }
        .es-section-label:first-child { margin-top: 0; }

        .es-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .es-grid .es-full { grid-column: 1 / -1; }

        .es-field-label { font-size: 11.5px; font-weight: 700; letter-spacing: 0.04em; color: #64748b; margin-bottom: 6px; display: block; }
        .es-field-label .req { color: #ef4444; margin-left: 3px; }

        .es-input, .es-select {
          width: 100%; padding: 13px 14px; border-radius: 12px;
          border: 1.5px solid #e2e8f0; background: #f8faff;
          font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; font-weight: 500;
          color: #1e293b; outline: none; box-sizing: border-box; transition: all 0.25s;
        }
        .es-input::placeholder { color: #c4cdd6; font-weight: 400; }
        .es-input:hover { border-color: #bfdbfe; background: #f0f6ff; }
        .es-input:focus { border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 4px rgba(59,130,246,0.1); }

        .es-field { margin-bottom: 14px; }

        .es-skeleton {
          height: 46px; border-radius: 12px;
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%; animation: esShimmer 1.4s infinite;
        }
        @keyframes esShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        .es-changed {
          display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600;
          color: #f59e0b; margin: 1rem 0; padding: 8px 12px; background: #fffbeb;
          border: 1px solid #fde68a; border-radius: 10px; animation: esFadeIn 0.3s ease;
        }
        @keyframes esFadeIn { from { opacity:0; transform: translateY(-4px); } to { opacity:1; transform: translateY(0); } }

        .es-btn {
          width: 100%; padding: 15px; border-radius: 14px; border: none; cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif; font-size: 15px; font-weight: 700;
          background: linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%);
          color: #fff; box-shadow: 0 4px 18px rgba(37,99,235,0.38);
          position: relative; overflow: hidden;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: all 0.25s; margin-top: 1.5rem;
        }
        .es-btn::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 60%); pointer-events: none; }
        .es-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(37,99,235,0.45); }
        .es-btn:active:not(:disabled) { transform: translateY(0); }
        .es-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }

        .es-btn-cancel {
          width: 100%; margin-top: 10px; padding: 12px; border-radius: 12px;
          border: 1.5px solid #e2e8f0; background: transparent;
          font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13.5px; font-weight: 600;
          color: #94a3b8; cursor: pointer; transition: all 0.2s;
        }
        .es-btn-cancel:hover { background: #f8fafc; color: #475569; border-color: #cbd5e1; }

        .es-spinner {
          width: 17px; height: 17px; border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 560px) { .es-grid { grid-template-columns: 1fr; } }

        /* ── Toast ── */
        .es-toast {
          pointer-events: auto; display: flex; align-items: center; gap: 12px;
          min-width: 290px; max-width: 370px; padding: 13px 16px; border-radius: 16px;
          position: relative; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.13);
          animation: esToastIn 0.4s cubic-bezier(0.22,1,0.36,1) both;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        @keyframes esToastIn { from { opacity:0; transform:translateX(60px) scale(0.9); } to { opacity:1; transform:translateX(0) scale(1); } }
        .es-toast-success { background:#f0fdf4; border:1px solid #bbf7d0; }
        .es-toast-error   { background:#fff1f2; border:1px solid #fecdd3; }
        .es-toast-warn    { background:#fffbeb; border:1px solid #fde68a; }
        .es-toast-icon { width:32px; height:32px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:800; flex-shrink:0; }
        .es-toast-success .es-toast-icon { background:#dcfce7; color:#16a34a; }
        .es-toast-error   .es-toast-icon { background:#ffe4e6; color:#e11d48; }
        .es-toast-warn    .es-toast-icon { background:#fef9c3; color:#b45309; }
        .es-toast-content { flex:1; }
        .es-toast-title { font-size:13px; font-weight:700; margin:0 0 2px; }
        .es-toast-success .es-toast-title { color:#15803d; }
        .es-toast-error   .es-toast-title { color:#be123c; }
        .es-toast-warn    .es-toast-title { color:#92400e; }
        .es-toast-msg { font-size:12px; margin:0; font-weight:400; }
        .es-toast-success .es-toast-msg { color:#16a34a; }
        .es-toast-error   .es-toast-msg { color:#e11d48; }
        .es-toast-warn    .es-toast-msg { color:#b45309; }
        .es-toast-x { background:none; border:none; cursor:pointer; font-size:13px; opacity:0.4; transition:opacity 0.2s; flex-shrink:0; padding:2px; }
        .es-toast-x:hover { opacity:0.9; }
        .es-toast-progress { position:absolute; bottom:0; left:0; height:3px; border-radius:0 0 16px 16px; animation:esShrink 3.8s linear forwards; }
        .es-toast-success .es-toast-progress { background:#4ade80; }
        .es-toast-error   .es-toast-progress { background:#fb7185; }
        .es-toast-warn    .es-toast-progress { background:#fbbf24; }
        @keyframes esShrink { from { width:100%; } to { width:0%; } }
      `}</style>

      <ToastPortal toasts={toasts} remove={remove} />

      <div className="es-page">
        <div className="es-bg-ring es-bg-ring-1" />
        <div className="es-bg-ring es-bg-ring-2" />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="es-bg-dot" style={{
            top:  `${[15,25,70,80,40,60,10,90][i]}%`,
            left: `${[10,85,5,90,50,20,70,45][i]}%`,
          }} />
        ))}

        <div className="es-card">
          <div className="es-stripe" />

          <div className="es-header">
            <div className="es-icon-box">✏️</div>
            <div className="es-header-text">
              <h1>Edit Supplier</h1>
              <p>Update the supplier details below</p>
              <div className="es-id-badge">🔖 Supplier ID: #{id}</div>
            </div>
          </div>

          <div className="es-hr" />

          <div className="es-body">

            {fetching ? (
              <>
                <div className="es-skeleton" style={{ marginBottom: 14 }} />
                <div className="es-skeleton" style={{ marginBottom: 14 }} />
                <div className="es-skeleton" style={{ marginBottom: 14 }} />
              </>
            ) : (
              <>
                <div className="es-field">
                  <label className="es-field-label">Select Company<span className="req">*</span></label>
                  <select
                    className="es-select"
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                  >
                    <option value="">Select Company</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>{company.company_name}</option>
                    ))}
                  </select>
                </div>

                <div className="es-section-label">Contact Details</div>
                <div className="es-grid">
                  {["supplier_name", "mobile_number", "alt_mobile", "email", "gst_number"].map((key) => {
                    const f = FIELDS.find(x => x.key === key);
                    const isMobile = key === "mobile_number" || key === "alt_mobile";
                    const isGst = key === "gst_number";
                    return (
                      <div className="es-field" key={f.key}>
                        <label className="es-field-label">
                          {f.label}{f.required && <span className="req">*</span>}
                        </label>
                        <input
                          type={f.type}
                          className="es-input"
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

                <div className="es-section-label">Address Details</div>
                <div className="es-grid">
                  <div className="es-field es-full">
                    <label className="es-field-label">Address</label>
                    <input
                      type="text"
                      className="es-input"
                      placeholder="Door No, Street, Area"
                      value={form.address}
                      onChange={(e) => handleField("address", e.target.value)}
                    />
                  </div>
                  {["city", "district", "state", "pincode", "country"].map((key) => {
                    const f = FIELDS.find(x => x.key === key);
                    const isPincode = key === "pincode";
                    return (
                      <div className="es-field" key={f.key}>
                        <label className="es-field-label">{f.label}</label>
                        <input
                          type="text"
                          className="es-input"
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

                {isDirty && (
                  <div className="es-changed">⚡ You have unsaved changes</div>
                )}
              </>
            )}

            <button className="es-btn" onClick={handleUpdate} disabled={loading || fetching}>
              {loading ? <><div className="es-spinner" /> Updating…</> : <>💾 Update Supplier</>}
            </button>

            <button className="es-btn-cancel" onClick={() => navigate("/supplier")}>
              ← Back to Suppliers
            </button>
          </div>
        </div>
      </div>
    </>
  );
}