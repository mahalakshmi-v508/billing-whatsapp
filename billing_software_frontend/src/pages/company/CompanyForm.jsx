

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

/* ── Global CSS ─────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Syne:wght@700;800;900&display=swap');

  @keyframes slideDown  { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:none} }
  @keyframes slideUp    { from{opacity:0;transform:translateY(12px)}  to{opacity:1;transform:none} }
  @keyframes toastIn    { from{opacity:0;transform:translateX(110px)} to{opacity:1;transform:none} }
  @keyframes toastOut   { from{opacity:1;transform:none} to{opacity:0;transform:translateX(110px)} }
  @keyframes spin       { to{transform:rotate(360deg)} }
  @keyframes fadeScale  { from{opacity:0;transform:scale(.93)} to{opacity:1;transform:scale(1)} }
  @keyframes pulse      { 0%,100%{opacity:1} 50%{opacity:.5} }

  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Outfit',sans-serif; }

  .rc-input {
    width:100%;
    background:#f8faff;
    border:1.5px solid #dde4f0;
    border-radius:11px;
    padding:11px 14px;
    color:#1e2a45;
    font-size:14px;
    font-family:'Outfit',sans-serif;
    outline:none;
    transition:all .2s;
  }
  .rc-input:focus {
    border-color:#3b82f6;
    background:#fff;
    box-shadow:0 0 0 3px rgba(59,130,246,.13);
  }
  .rc-input::placeholder { color:#a0aec0; }

  .rc-select {
    width:100%;
    background:#f8faff;
    border:1.5px solid #dde4f0;
    border-radius:11px;
    padding:11px 14px;
    color:#1e2a45;
    font-size:14px;
    font-family:'Outfit',sans-serif;
    outline:none;
    appearance:none;
    cursor:pointer;
    transition:all .2s;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat:no-repeat;
    background-position:right 14px center;
  }
  .rc-select:focus {
    border-color:#3b82f6;
    background-color:#fff;
    box-shadow:0 0 0 3px rgba(59,130,246,.13);
  }

  .rc-label {
    display:block;
    font-size:11px;
    font-weight:700;
    color:#3b82f6;
    letter-spacing:.08em;
    text-transform:uppercase;
    margin-bottom:6px;
  }

  .rc-submit {
    width:100%; padding:14px; border:none; border-radius:12px;
    background:linear-gradient(135deg,#1d4ed8,#3b82f6,#60a5fa);
    color:#fff; font-size:15px; font-weight:700;
    font-family:'Outfit',sans-serif; cursor:pointer;
    letter-spacing:.02em;
    transition:all .22s;
  }
  .rc-submit:hover { transform:translateY(-2px); box-shadow:0 10px 28px rgba(59,130,246,.38); }
  .rc-submit:active { transform:translateY(0); }
  .rc-submit:disabled { opacity:.6; cursor:not-allowed; transform:none; box-shadow:none; }

  .rc-file-area {
    width:100%; border:2px dashed #bfdbfe;
    border-radius:12px; padding:20px 16px;
    text-align:center; cursor:pointer;
    background:#f0f7ff;
    transition:all .2s;
    position:relative;
  }
  .rc-file-area:hover { border-color:#3b82f6; background:#e0f0ff; }

  .section-divider {
    display:flex; align-items:center; gap:12px;
    margin:6px 0 18px;
  }
  .section-divider::before,
  .section-divider::after {
    content:''; flex:1; height:1px; background:#e2e8f0;
  }
`;

/* ── SVG Icons ───────────────────────────────────────────────────────────── */
const IcoBuilding = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="18" rx="2"/><path d="M9 22V12h6v10"/><path d="M9 7h1"/><path d="M14 7h1"/><path d="M9 12h1"/><path d="M14 12h1"/>
  </svg>
);
const IcoUser = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const IcoImage = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
  </svg>
);
const IcoCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IcoX = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IcoWarn = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

/* ── Toast ──────────────────────────────────────────────────────────────── */
function Toast({ toasts }) {
  return (
    <div style={{ position:"fixed", top:20, right:20, zIndex:99999, display:"flex", flexDirection:"column", gap:10, pointerEvents:"none" }}>
      {toasts.map(t => {
        const cfg = {
          success: { bg:"linear-gradient(135deg,#0369a1,#0ea5e9)", icon:<IcoCheck /> },
          error:   { bg:"linear-gradient(135deg,#b91c1c,#ef4444)", icon:<IcoX /> },
          warning: { bg:"linear-gradient(135deg,#b45309,#f59e0b)", icon:<IcoWarn /> },
        }[t.type] || { bg:"linear-gradient(135deg,#1d4ed8,#3b82f6)", icon:<IcoCheck /> };
        return (
          <div key={t.id} style={{
            display:"flex", alignItems:"center", gap:10,
            background: cfg.bg,
            color:"#fff", borderRadius:13, padding:"12px 18px",
            fontWeight:600, fontSize:13.5,
            animation:"toastIn .32s cubic-bezier(.4,0,.2,1) both",
            fontFamily:"'Outfit',sans-serif",
            minWidth:270, maxWidth:340,
            pointerEvents:"auto",
          }}>
            <span style={{
              width:24, height:24, borderRadius:7,
              background:"rgba(255,255,255,.2)",
              display:"flex", alignItems:"center", justifyContent:"center",
              flexShrink:0,
            }}>
              {cfg.icon}
            </span>
            <span style={{ flex:1, lineHeight:1.4 }}>{t.msg}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Field wrapper ───────────────────────────────────────────────────────── */
function Field({ label, children, error }) {
  return (
    <div style={{ marginBottom:16 }}>
      {label && <label className="rc-label">{label}</label>}
      {children}
      {error && (
        <div style={{ fontSize:11.5, color:"#ef4444", marginTop:5, fontWeight:500, display:"flex", alignItems:"center", gap:4 }}>
          <IcoX /> {error}
        </div>
      )}
    </div>
  );
}

/* ── Section header ─────────────────────────────────────────────────────── */
function SectionHead({ icon, title, sub }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
      <div style={{
        width:32, height:32, borderRadius:9,
        background:"linear-gradient(135deg,#1d4ed8,#3b82f6)",
        display:"flex", alignItems:"center", justifyContent:"center",
        color:"#fff", flexShrink:0,
      }}>{icon}</div>
      <div>
        <div style={{ fontWeight:700, fontSize:14, color:"#1e3a5f", letterSpacing:".03em" }}>{title}</div>
        {sub && <div style={{ fontSize:11.5, color:"#94a3b8", marginTop:1 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════ */
export default function CompanyForm() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name:"", code:"", address:"", gstin:"",
    gst_type:"with_gst", phone:"", logo:null,
   
  });

  const [errors, setErrors]   = useState({});
  const [toasts, setToasts]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    const s = document.createElement("style");
    s.innerHTML = GLOBAL_CSS;
    document.head.appendChild(s);
    return () => document.head.removeChild(s);
  }, []);

  /* ── Toast helper ── */
  const toast = (msg, type = "error") => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  };

  /* ── Validation ── */
  const validate = () => {
    const e = {};
    if (!form.name.trim())           e.name         = "Company name is required";
    if (!form.code.trim())           e.code         = "Company code is required";
    if (!form.address.trim())        e.address      = "Address is required";
    // if (form.gst_type === "with_gst" && !form.gstin.trim())
    //                                  e.gstin        = "GSTIN is required for GST registered company";
     if (form.gst_type === "with_gst" && form.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(form.gstin))
    //                                  e.gstin        = "Enter a valid GSTIN (e.g. 33ABCDE1234F1Z5)";
    // GSTIN is optional now — only validate format if the user actually typed something
if (form.gstin.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(form.gstin))
                                 e.gstin        = "Enter a valid GSTIN (e.g. 33ABCDE1234F1Z5)";
    if (!form.phone)                 e.phone        = "Phone number is required";
    else if (form.phone.length !== 10) e.phone      = "Phone must be exactly 10 digits";
   
    return e;
  };

  const convertToBase64 = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.readAsDataURL(file);
    r.onload  = () => res(r.result.split(",")[1]);
    r.onerror = rej;
  });

  const handleSubmit = async () => {

    
    const e = validate();
    setErrors(e);

    if (Object.keys(e).length > 0) {
      return;
    }

    setLoading(true);
     const user = JSON.parse(
    localStorage.getItem("user")
  );
    try {
      let base64Logo = "";
      if (form.logo) base64Logo = await convertToBase64(form.logo);

      

      const payload = {
        admin_id: user?.id || 0,
        company_name: form.name,
        company_code: form.code,
        company_address: form.address,
        gstin: form.gstin,
        gst_type: form.gst_type,
        phone: form.phone,
        logo: base64Logo,
      };

      const res = await api.post("/company/add_company", payload);
     



      console.log("API Response:", res.data); // debug log

      const isSuccess = res.data.status === true || res.data.status === 1 || res.data.status === "true" || res.data.status === "1" || res.data.status === "success";

      if (isSuccess) {
        toast("Company created successfully!", "success");
        setTimeout(() => navigate("/company"), 1200);
      } else {
        toast(res.data.message || res.data.msg || res.data.error || "Something went wrong", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Server error. Please try again.", "error");
    }
    setLoading(false);
  };

  const set = (key, val) => {
    setForm(p => ({ ...p, [key]: val }));
    if (errors[key]) setErrors(p => ({ ...p, [key]: undefined }));
  };

  /* ─────────────────────────────── RENDER ─────────────────────────────── */
  return (
    <div style={{ minHeight:"100vh", background:"#eef4ff", fontFamily:"'Outfit',sans-serif" }}>
      <Toast toasts={toasts} />

      {/* ── Hero Header ── */}
      <div style={{
        background:"linear-gradient(135deg,#0f2456 0%,#1d4ed8 55%,#3b82f6 100%)",
        padding:"28px 36px 68px",
        position:"relative", overflow:"hidden",
      }}>
        {/* Decorative circles */}
        {[
          { size:220, top:-70, right:-60, op:.07 },
          { size:130, top:20,  right:180, op:.05 },
          { size:80,  bottom:-30, left:60, op:.06 },
        ].map((c,i) => (
          <div key={i} style={{
            position:"absolute", top:c.top, right:c.right, bottom:c.bottom, left:c.left,
            width:c.size, height:c.size, borderRadius:"50%",
            background:`rgba(255,255,255,${c.op})`, pointerEvents:"none",
          }} />
        ))}
        <div style={{ position:"relative" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,.15)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff" }}>
              <IcoBuilding />
            </div>
            <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:900, color:"#fff", letterSpacing:"-.02em" }}>
              Register Company
            </h1>
          </div>
          <p style={{ fontSize:13, color:"rgba(255,255,255,.6)", fontWeight:400, marginLeft:46 }}>
            Set up your company profile and admin account
          </p>
        </div>
      </div>

      {/* ── Form Card ── */}
      <div style={{ padding:"0 24px 48px", marginTop:-44 }}>
        <div style={{
          background:"#fff",
          borderRadius:20,
          border:"1.5px solid #dde8f8",
          padding:"28px 28px 24px",
          animation:"fadeScale .4s ease both",
        }}>

          {/* ═══ SECTION 1: Company Info ═══ */}
          <SectionHead
            icon={<IcoBuilding />}
            title="Company Information"
            sub="Basic details about your business"
          />

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 20px" }}>
            <Field label="Company Name *" error={errors.name}>
              <input className="rc-input" placeholder="e.g. Acme Pvt Ltd"
                value={form.name}
                onChange={e => set("name", e.target.value)}
                style={errors.name ? { borderColor:"#fca5a5", background:"#fff5f5" } : {}}
              />
            </Field>
            <Field label="Company Code *" error={errors.code}>
              <input className="rc-input" placeholder="e.g. ACME001"
                value={form.code}
                onChange={e => set("code", e.target.value.toUpperCase())}
                style={errors.code ? { borderColor:"#fca5a5", background:"#fff5f5" } : {}}
              />
            </Field>
          </div>

          <Field label="Address *" error={errors.address}>
            <textarea className="rc-input" placeholder="Full business address" rows={3}
              value={form.address}
              onChange={e => set("address", e.target.value)}
              style={{ resize:"none", ...(errors.address ? { borderColor:"#fca5a5", background:"#fff5f5" } : {}) }}
            />
          </Field>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 20px" }}>
            {/* <Field label="GST Type *">
              <select className="rc-select"
                value={form.gst_type}
                onChange={e => set("gst_type", e.target.value)}>
                <option value="with_gst">With GST</option>
                <option value="without_gst">Without GST</option>
              </select>
            </Field> */}

            <Field label="Phone Number *" error={errors.phone}>
              <input className="rc-input" placeholder="10-digit phone"
                value={form.phone}
                maxLength={10}
                onChange={e => set("phone", e.target.value.replace(/\D/g,"").slice(0,10))}
                style={errors.phone ? { borderColor:"#fca5a5", background:"#fff5f5" } : {}}
              />
            </Field>
          </div>

          {form.gst_type === "with_gst" && (
            <Field label="GSTIN (Optional)" error={errors.gstin}>
              <input className="rc-input" placeholder="e.g. 33ABCDE1234F1Z5"
                value={form.gstin}
                 maxLength={15}
                onChange={e => set("gstin", e.target.value.toUpperCase())}
                style={errors.gstin ? { borderColor:"#fca5a5", background:"#fff5f5" } : {}}
              />
            </Field>
          )}

          {/* Logo upload */}
          <Field label="Company Logo">
            <div className="rc-file-area" onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }}
                onChange={e => set("logo", e.target.files[0])} />
              {form.logo ? (
                <div style={{ display:"flex", alignItems:"center", gap:14, justifyContent:"center" }}>
                  <img src={URL.createObjectURL(form.logo)} alt="preview"
                    style={{ height:60, width:60, objectFit:"contain", borderRadius:8, border:"1.5px solid #bfdbfe" }} />
                  <div style={{ textAlign:"left" }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#1d4ed8" }}>{form.logo.name}</div>
                    <div style={{ fontSize:11.5, color:"#64748b", marginTop:2 }}>Click to change</div>
                  </div>
                </div>
              ) : (
                <div>
                  <IcoImage />
                  <div style={{ fontSize:13, fontWeight:600, color:"#3b82f6", marginTop:6 }}>Click to upload logo</div>
                  <div style={{ fontSize:11.5, color:"#94a3b8", marginTop:2 }}>PNG, JPG, SVG — max 2MB</div>
                </div>
              )}
            </div>
          </Field>

          {/* ═══ SECTION 2: Owner Details ═══ */}
          {/* <div className="section-divider" style={{ margin:"8px 0 20px" }}>
            <span style={{ fontSize:11, fontWeight:700, color:"#94a3b8", letterSpacing:".08em", textTransform:"uppercase", whiteSpace:"nowrap" }}>
              Owner / Admin Account
            </span>
          </div>

          <SectionHead
            icon={<IcoUser />}
            title="Owner Details"
            sub="This will be the primary admin account"
          />

          <Field label="Owner Name *" error={errors.owner_name}>
            <input className="rc-input" placeholder="Full name"
              value={form.owner_name}
              onChange={e => set("owner_name", e.target.value)}
              style={errors.owner_name ? { borderColor:"#fca5a5", background:"#fff5f5" } : {}}
            />
          </Field>

          <Field label="Owner Email *" error={errors.owner_email}>
            <input className="rc-input" placeholder="admin@company.com" type="email"
              value={form.owner_email}
              onChange={e => set("owner_email", e.target.value)}
              style={errors.owner_email ? { borderColor:"#fca5a5", background:"#fff5f5" } : {}}
            />
          </Field>

          <Field label="Password *" error={errors.owner_password}>
            <div style={{ position:"relative" }}>
              <input
                className="rc-input"
                placeholder="Min 6 characters"
                type={showPass ? "text" : "password"}
                value={form.owner_password}
                onChange={e => set("owner_password", e.target.value)}
                style={{ paddingRight:42, ...(errors.owner_password ? { borderColor:"#fca5a5", background:"#fff5f5" } : {}) }}
              />
              <button type="button" onClick={() => setShowPass(p => !p)} style={{
                position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                background:"none", border:"none", cursor:"pointer", color:"#94a3b8", fontSize:13,
                fontFamily:"'Outfit',sans-serif", fontWeight:600,
              }}>
                {showPass ? "Hide" : "Show"}
              </button>
            </div>
          </Field> */}

          {/* ── Submit ── */}
          <div style={{ marginTop:8 }}>
            <button className="rc-submit" onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <span style={{ display:"flex", alignItems:"center", gap:10, justifyContent:"center" }}>
                  <span style={{ width:17, height:17, border:"2.5px solid rgba(255,255,255,.35)", borderTopColor:"#fff", borderRadius:"50%", display:"inline-block", animation:"spin .7s linear infinite" }} />
                  Creating Company…
                </span>
              ) : (
                <span style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"center" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  Save Company
                </span>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}