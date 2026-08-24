

import { useEffect, useState } from "react";
import api, { API_BASE_URL } from "../../services/api";
import { Phone, MapPin, BadgeCheck, Pencil, Save, Mail, Hash, Building2, X, Camera, User, FileText } from "lucide-react";

/* ─── Inject global styles ───────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@700;800&display=swap');

  @keyframes floatUp   { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:none} }
  @keyframes spin      { to{transform:rotate(360deg)} }
  @keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:.6} }
  @keyframes toastSlide{ from{opacity:0;transform:translateX(24px)} to{opacity:1;transform:none} }
  @keyframes orb1      { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,-20px) scale(1.08)} }
  @keyframes orb2      { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-20px,25px) scale(0.95)} }
  @keyframes orb3      { 0%,100%{transform:translate(0,0)} 50%{transform:translate(15px,-30px)} }
  @keyframes scanline  { from{top:-100%} to{top:200%} }
  @keyframes badgePop  { 0%{transform:scale(.7) translateY(4px);opacity:0} 60%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .profile-field { transition: all .25s cubic-bezier(.4,0,.2,1); }
  .profile-field:hover { transform: translateY(-2px); }

  .glass-btn { transition: all .22s cubic-bezier(.4,0,.2,1) !important; }
  .glass-btn:hover { transform: translateY(-2px) !important; box-shadow: 0 8px 28px rgba(29,78,216,.28) !important; }
  .glass-btn:active { transform: scale(.97) !important; }

  input, textarea, select { font-family: 'Outfit', sans-serif !important; }
  input:focus, textarea:focus, select:focus { outline: none !important; border-color: #3b82f6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,.15) !important; }
`;

/* ─── Field ──────────────────────────────────────────────────────────────── */
function Field({ label, value, icon: Icon, editMode, onChange, multiline, colSpan, delay = 0 }) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      className="profile-field"
      style={{
        gridColumn: colSpan ? "1 / -1" : undefined,
        background: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        border: `1.5px solid ${focused ? "#3b82f6" : "rgba(147,197,253,.55)"}`,
        borderRadius: 18,
        padding: "16px 20px",
        boxShadow: focused
          ? "0 0 0 3px rgba(59,130,246,.12), 0 8px 32px rgba(29,78,216,.1)"
          : "0 2px 12px rgba(29,78,216,.05)",
        animation: `floatUp .5s ease ${delay}s both`,
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:9 }}>
        <div style={{
          width:26, height:26, borderRadius:8,
          background: "linear-gradient(135deg,#1d4ed8,#3b82f6)",
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
          boxShadow: "0 4px 12px rgba(59,130,246,.35)",
        }}>
          <Icon size={13} color="#fff" strokeWidth={2.2}/>
        </div>
        <span style={{
          fontSize:10, fontWeight:700, letterSpacing:".11em",
          color:"#3b82f6", textTransform:"uppercase", fontFamily:"'Outfit',sans-serif",
        }}>
          {label}
        </span>
      </div>

      {editMode ? (
        multiline ? (
          <textarea rows={3} value={value || ""} onChange={e => onChange(e.target.value)}
            style={{
              width:"100%", background:"rgba(239,246,255,.8)",
              border:"1.5px solid #bfdbfe", borderRadius:12,
              padding:"10px 14px", color:"#1e3a8a", fontSize:14.5,
              resize:"vertical", lineHeight:1.65,
            }}
          />
        ) : (
          <input value={value || ""} onChange={e => onChange(e.target.value)}
            style={{
              width:"100%", background:"rgba(239,246,255,.8)",
              border:"1.5px solid #bfdbfe", borderRadius:12,
              padding:"10px 14px", color:"#1e3a8a", fontSize:14.5,
            }}
          />
        )
      ) : (
        <p style={{
          fontSize:15, fontWeight:600, color:"#1e3a8a",
          fontFamily:"'Outfit',sans-serif", letterSpacing:"-.01em",
          wordBreak:"break-all",
        }}>
          {value || <span style={{ color:"#93c5fd", fontStyle:"italic", fontWeight:400, fontSize:13.5 }}>Not provided</span>}
        </p>
      )}
    </div>
  );
}

/* ─── GST Type Field ─────────────────────────────────────────────────────── */
function GstTypeField({ value, editMode, onChange, delay = 0 }) {
  const [focused, setFocused] = useState(false);
  const isWithGst = value === "with_gst" || !value;
  return (
    <div
      className="profile-field"
      style={{
        background: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        border: `1.5px solid ${focused ? "#3b82f6" : "rgba(147,197,253,.55)"}`,
        borderRadius: 18,
        padding: "16px 20px",
        boxShadow: focused
          ? "0 0 0 3px rgba(59,130,246,.12), 0 8px 32px rgba(29,78,216,.1)"
          : "0 2px 12px rgba(29,78,216,.05)",
        animation: `floatUp .5s ease ${delay}s both`,
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:9 }}>
        <div style={{
          width:26, height:26, borderRadius:8,
          background: "linear-gradient(135deg,#1d4ed8,#3b82f6)",
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
          boxShadow: "0 4px 12px rgba(59,130,246,.35)",
        }}>
          <FileText size={13} color="#fff" strokeWidth={2.2}/>
        </div>
        <span style={{
          fontSize:10, fontWeight:700, letterSpacing:".11em",
          color:"#3b82f6", textTransform:"uppercase", fontFamily:"'Outfit',sans-serif",
        }}>
          GST Type
        </span>
      </div>

      {editMode ? (
        <select
          value={value || "with_gst"}
          onChange={e => onChange(e.target.value)}
          style={{
            width:"100%", background:"rgba(239,246,255,.8)",
            border:"1.5px solid #bfdbfe", borderRadius:12,
            padding:"10px 14px", color:"#1e3a8a", fontSize:14.5,
            cursor:"pointer",
          }}
        >
          <option value="with_gst">With GST</option>
          <option value="without_gst">Without GST</option>
        </select>
      ) : (
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{
            fontSize:13, fontWeight:700, letterSpacing:".06em",
            color: isWithGst ? "#059669" : "#d97706",
            background: isWithGst ? "#d1fae5" : "#fef3c7",
            border: `1px solid ${isWithGst ? "#a7f3d0" : "#fde68a"}`,
            borderRadius:20, padding:"3px 12px",
          }}>
            {isWithGst ? "✓ With GST" : "✕ Without GST"}
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── Stat Badge ─────────────────────────────────────────────────────────── */
function StatBadge({ icon: Icon, label, value, delay }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:10,
      background:"rgba(255,255,255,.14)", backdropFilter:"blur(10px)",
      border:"1px solid rgba(255,255,255,.3)", borderRadius:14,
      padding:"10px 16px", animation:`badgePop .4s ease ${delay}s both`,
    }}>
      <div style={{
        width:32, height:32, borderRadius:9,
        background:"rgba(255,255,255,.2)",
        display:"flex", alignItems:"center", justifyContent:"center",
      }}>
        <Icon size={15} color="#fff" strokeWidth={2}/>
      </div>
      <div>
        <div style={{ fontSize:9.5, letterSpacing:".09em", color:"rgba(255,255,255,.65)", fontWeight:600, textTransform:"uppercase" }}>{label}</div>
        <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginTop:1 }}>{value}</div>
      </div>
    </div>
  );
}

/* ─── LogoUpload ─────────────────────────────────────────────────────────── */
function LogoUpload({ logoSrc, editMode, onChange }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{ position:"relative", flexShrink:0 }}
      onMouseEnter={() => editMode && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        width:96, height:96, borderRadius:24,
        border:"4px solid #fff",
        overflow:"hidden",
        background:"linear-gradient(135deg,#dbeafe,#bfdbfe)",
        display:"flex", alignItems:"center", justifyContent:"center",
        transition:"box-shadow .22s",
        boxShadow: editMode && hovered
          ? "0 8px 36px rgba(29,78,216,.5)"
          : "0 8px 32px rgba(29,78,216,.25)",
        cursor: editMode ? "pointer" : "default",
      }}>
        {logoSrc
          ? <img src={logoSrc} alt="logo" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
          : <Building2 size={36} color="#3b82f6"/>
        }
      </div>

      {editMode && (
        <label style={{
          position:"absolute", inset:0, borderRadius:20,
          background: hovered ? "rgba(29,78,216,.62)" : "rgba(0,0,0,0)",
          backdropFilter: hovered ? "blur(2px)" : "none",
          WebkitBackdropFilter: hovered ? "blur(2px)" : "none",
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
          cursor:"pointer", gap:4,
          transition:"background .2s",
          pointerEvents:"all",
        }}>
          {hovered && (
            <>
              <Camera size={22} color="#fff" strokeWidth={2}/>
              <span style={{ fontSize:8.5, color:"#fff", fontWeight:800, letterSpacing:".1em" }}>UPLOAD</span>
            </>
          )}
          <input type="file" accept="image/*" style={{ display:"none" }} onChange={onChange}/>
        </label>
      )}

      {!editMode && (
        <div style={{
          position:"absolute", bottom:4, right:4,
          width:20, height:20, borderRadius:"50%",
          background:"linear-gradient(135deg,#1d4ed8,#3b82f6)",
          border:"2.5px solid #fff",
          display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:"0 2px 8px rgba(29,78,216,.4)",
        }}>
          <BadgeCheck size={10} color="#fff" strokeWidth={2.5}/>
        </div>
      )}
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function Profile() {
  const [company, setCompany]   = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);

  useEffect(() => {
    const s = document.createElement("style");
    s.innerHTML = GLOBAL_CSS;
    document.head.appendChild(s);
    return () => document.head.removeChild(s);
  }, []);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    api.post("/company/get_company_by_id", { id: user.company_id })
       .then(r => { if (r.data.status) setCompany(r.data.data); });
  }, []);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); };
  const handleChange = (f, v) => setCompany(p => ({ ...p, [f]: v }));

  const handleLogoChange = e => {
    const file = e.target.files[0]; if (!file) return;
    setLogoFile(file);
    const r = new FileReader();
    r.onloadend = () => setCompany(p => ({ ...p, logo_preview: r.result }));
    r.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    let b64 = "";
    if (logoFile) {
      const r = new FileReader(); r.readAsDataURL(logoFile);
      await new Promise(res => { r.onloadend = () => { b64 = r.result.split(",")[1]; res(); }; });
    }
    const res = await api.post("/company/update_company", {
      id:              company.id,
      company_name:    company.company_name,
      company_address: company.company_address,
      company_code:    company.company_code,
      gstin:           company.gstin,
      gst_type:        company.gst_type,        // ✅ gst_type added
      phone:           company.phone,
      owner_name:      company.owner_name,
      owner_email:     company.owner_email,
      logo:            b64,
    });
    setSaving(false);
    if (res.data.status) { showToast("Profile updated successfully!"); setEditMode(false); }
    else showToast(res.data.message || "Something went wrong", false);
  };

  const getLogoUrl = (logo) => {
    if (!logo) return null;
    if (logo.startsWith("http://") || logo.startsWith("https://")) {
      return logo;
    }
    const baseUrl = API_BASE_URL.replace("/api/", "/");
    return `${baseUrl}${logo}`;
  };

  const logoSrc = company?.logo_preview ?? getLogoUrl(company?.logo);
  const isWithGst = company?.gst_type !== "without_gst";

  /* Loading */
  if (!company) return (
    <div style={{
      minHeight:340, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      gap:14, fontFamily:"'Outfit',sans-serif",
    }}>
      <div style={{
        width:52, height:52, borderRadius:16,
        background:"linear-gradient(135deg,#1d4ed8,#3b82f6)",
        display:"flex", alignItems:"center", justifyContent:"center",
        boxShadow:"0 8px 24px rgba(59,130,246,.4)",
        animation:"pulse 1.4s ease infinite",
      }}>
        <Building2 size={24} color="#fff"/>
      </div>
      <p style={{ fontSize:14, color:"#3b82f6", fontWeight:600, letterSpacing:".03em" }}>Loading company profile…</p>
    </div>
  );

  return (
    <div style={{
      padding:"28px 32px", fontFamily:"'Outfit',sans-serif",
      minHeight:"100vh", background:"#f0f6ff",
    }}>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position:"fixed", top:22, right:26, zIndex:9999,
          background: toast.ok
            ? "linear-gradient(135deg,#1d4ed8,#3b82f6)"
            : "linear-gradient(135deg,#dc2626,#ef4444)",
          color:"#fff", borderRadius:14, padding:"14px 22px",
          fontWeight:600, fontSize:13.5,
          boxShadow:"0 12px 40px rgba(29,78,216,.35)",
          animation:"toastSlide .35s cubic-bezier(.4,0,.2,1) both",
          display:"flex", alignItems:"center", gap:10,
          fontFamily:"'Outfit',sans-serif", letterSpacing:".01em",
          backdropFilter:"blur(12px)",
        }}>
          <span style={{
            width:20, height:20, borderRadius:6,
            background:"rgba(255,255,255,.22)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:11, fontWeight:900,
          }}>
            {toast.ok ? "✓" : "✕"}
          </span>
          {toast.msg}
        </div>
      )}

      {/* ── Page header ── */}
      <div style={{ marginBottom:26, animation:"floatUp .4s ease both" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
          <div style={{
            width:6, height:32, borderRadius:3,
            background:"linear-gradient(180deg,#1d4ed8,#60a5fa)",
          }}/>
          <h1 style={{
            fontSize:26, fontWeight:800, color:"#1e3a8a",
            fontFamily:"'Playfair Display',serif", letterSpacing:"-.02em",
          }}>
            Company Profile
          </h1>
        </div>
        <p style={{ fontSize:13.5, color:"#64748b", fontWeight:400, paddingLeft:16 }}>
          Manage your organization's identity and business information
        </p>
      </div>

      {/* ── Main Card ── */}
      <div style={{
        background:"rgba(255,255,255,.6)",
        backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)",
        borderRadius:28, border:"1.5px solid rgba(147,197,253,.4)",
        boxShadow:"0 4px 40px rgba(29,78,216,.1), 0 1px 0 rgba(255,255,255,.8) inset",
        overflow:"hidden", animation:"floatUp .5s ease .05s both",
      }}>

        {/* ── Hero Banner ── */}
        <div style={{
          position:"relative",
          background:"linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 40%,#2563eb 70%,#3b82f6 100%)",
          padding:"28px 30px 76px",
          overflow:"hidden",
        }}>
          {/* Animated orbs */}
          {[
            { size:220, top:-70,  right:-60,  op:.1,  anim:"orb1 8s ease-in-out infinite" },
            { size:140, top:10,   right:180,  op:.07, anim:"orb2 10s ease-in-out infinite" },
            { size:100, bottom:-30, left:"35%", op:.08, anim:"orb3 7s ease-in-out infinite" },
            { size:60,  top:20,  left:60,    op:.06, anim:"orb1 9s ease-in-out infinite reverse" },
          ].map((o, i) => (
            <div key={i} style={{
              position:"absolute", top:o.top, right:o.right, bottom:o.bottom, left:o.left,
              width:o.size, height:o.size, borderRadius:"50%",
              background:`rgba(255,255,255,${o.op})`,
              animation:o.anim, pointerEvents:"none",
            }}/>
          ))}

          {/* Scanline shimmer */}
          <div style={{
            position:"absolute", left:0, right:0, height:2,
            background:"linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent)",
            animation:"scanline 4s linear infinite", pointerEvents:"none",
          }}/>

          {/* Grid texture overlay */}
          <div style={{
            position:"absolute", inset:0, pointerEvents:"none",
            backgroundImage:"radial-gradient(rgba(255,255,255,.06) 1px,transparent 1px)",
            backgroundSize:"24px 24px",
          }}/>

          {/* Top row: title + action buttons */}
          <div style={{ position:"relative", display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
            <div>
              <p style={{ fontSize:10.5, letterSpacing:".12em", color:"rgba(255,255,255,.6)", fontWeight:600, textTransform:"uppercase", marginBottom:4 }}>
                Business Identity
              </p>
              <h2 style={{
                fontSize:22, fontWeight:800, color:"#fff",
                fontFamily:"'Playfair Display',serif", letterSpacing:"-.01em",
              }}>
                {company.company_name}
              </h2>
            </div>

            {/* Action buttons */}
            <div style={{ display:"flex", gap:10, flexShrink:0 }}>
              {editMode && (
                <button className="glass-btn" onClick={() => setEditMode(false)} style={{
                  display:"flex", alignItems:"center", gap:7,
                  background:"rgba(255,255,255,.12)",
                  border:"1.5px solid rgba(255,255,255,.25)",
                  color:"rgba(255,255,255,.85)", borderRadius:12,
                  padding:"10px 18px", cursor:"pointer",
                  fontWeight:600, fontSize:13.5, fontFamily:"'Outfit',sans-serif",
                }}>
                  <X size={14}/> Cancel
                </button>
              )}
              <button
                className="glass-btn"
                onClick={editMode ? handleSave : () => setEditMode(true)}
                disabled={saving}
                style={{
                  display:"flex", alignItems:"center", gap:8,
                  background: editMode ? "#fff" : "rgba(255,255,255,.15)",
                  border: editMode ? "none" : "1.5px solid rgba(255,255,255,.3)",
                  color: editMode ? "#1d4ed8" : "#fff",
                  borderRadius:12, padding:"10px 22px", cursor:"pointer",
                  fontWeight:700, fontSize:13.5, fontFamily:"'Outfit',sans-serif",
                  boxShadow: editMode ? "0 8px 28px rgba(0,0,0,.18)" : "none",
                  opacity: saving ? .7 : 1,
                  letterSpacing:".01em",
                }}
              >
                {saving ? (
                  <><span style={{ width:14, height:14, border:"2.5px solid #3b82f6", borderTopColor:"transparent", borderRadius:"50%", display:"inline-block", animation:"spin .7s linear infinite" }}/> Saving…</>
                ) : editMode ? (
                  <><Save size={15}/> Save Changes</>
                ) : (
                  <><Pencil size={15}/> Edit Profile</>
                )}
              </button>
            </div>
          </div>

          {/* Stat badges row */}
          <div style={{ position:"relative", display:"flex", gap:10, marginTop:18, flexWrap:"wrap" }}>
            <StatBadge icon={Hash}       label="Company Code" value={company.company_code || "—"} delay={.1}/>
            <StatBadge icon={Phone}      label="Contact"      value={company.phone || "—"} delay={.18}/>
            <StatBadge icon={FileText}   label="GST Type"     value={company.gst_type === "without_gst" ? "Without GST" : "With GST"} delay={.26}/>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding:"0 30px 32px" }}>

          {/* Avatar / logo row — overlaps banner */}
          <div style={{ marginTop:-52, marginBottom:24, display:"flex", alignItems:"flex-end", gap:18 }}>
            <LogoUpload logoSrc={logoSrc} editMode={editMode} onChange={handleLogoChange}/>

            {/* Name + badges */}
            <div style={{ flex:1, paddingBottom:6 }}>
              {editMode ? (
                <input value={company.company_name} onChange={e => handleChange("company_name", e.target.value)}
                  style={{
                    background:"rgba(239,246,255,.8)", border:"1.5px solid #bfdbfe",
                    borderRadius:12, padding:"9px 16px",
                    color:"#1e3a8a", fontSize:20, fontWeight:800,
                    fontFamily:"'Playfair Display',serif", width:"100%", marginBottom:10,
                  }}
                />
              ) : (
                <h2 style={{
                  fontSize:20, fontWeight:800, color:"#1e3a8a",
                  fontFamily:"'Playfair Display',serif", marginBottom:10,
                  letterSpacing:"-.02em",
                }}>
                  {company.company_name}
                </h2>
              )}

              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <span style={{
                  fontSize:10.5, fontWeight:700, letterSpacing:".08em",
                  color:"#1d4ed8", background:"#dbeafe",
                  border:"1px solid #bfdbfe", borderRadius:20,
                  padding:"4px 14px", animation:"badgePop .4s ease both",
                }}>
                  ◈ Company Profile
                </span>
                <span style={{
                  fontSize:10.5, fontWeight:700, letterSpacing:".07em",
                  color: isWithGst ? "#059669" : "#d97706",
                  background: isWithGst ? "#d1fae5" : "#fef3c7",
                  border: `1px solid ${isWithGst ? "#a7f3d0" : "#fde68a"}`,
                  borderRadius:20,
                  padding:"4px 14px", animation:"badgePop .4s ease .08s both",
                }}>
                  {isWithGst ? "✦ With GST" : "✦ Without GST"}
                </span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{
            height:1.5, marginBottom:24, borderRadius:2,
            background:"linear-gradient(to right,transparent,#bfdbfe 20%,#93c5fd 50%,#bfdbfe 80%,transparent)",
          }}/>

          {/* Section label */}
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
            <span style={{
              fontSize:10, letterSpacing:".12em", fontWeight:700,
              color:"#3b82f6", textTransform:"uppercase",
            }}>Business Details</span>
            <div style={{ flex:1, height:1, background:"linear-gradient(to right,#dbeafe,transparent)" }}/>
          </div>

          {/* Fields grid */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>

            <Field label="Owner Name"  value={company.owner_name}  icon={User}  editMode={editMode} onChange={v=>handleChange("owner_name",v)}  delay={.08}/>
            <Field label="Owner Email" value={company.owner_email} icon={Mail}  editMode={editMode} onChange={v=>handleChange("owner_email",v)} delay={.12}/>
            <Field label="Phone Number" value={company.phone}       icon={Phone} editMode={editMode} onChange={v=>handleChange("phone",v)}       delay={.16}/>

            {/* GST Type dropdown */}
            <GstTypeField
              value={company.gst_type}
              editMode={editMode}
              onChange={v => handleChange("gst_type", v)}
              delay={.20}
            />

            {/* GSTIN — only show when with_gst */}
            {isWithGst && (
              <Field label="GSTIN" value={company.gstin} icon={BadgeCheck} editMode={editMode} onChange={v=>handleChange("gstin",v)} delay={.24}/>
            )}

            <Field label="Company Code" value={company.company_code} icon={Hash} editMode={editMode} onChange={v=>handleChange("company_code",v)} delay={.28}/>

            <Field label="Registered Address" value={company.company_address} icon={MapPin} editMode={editMode} onChange={v=>handleChange("company_address",v)} multiline colSpan delay={.32}/>

          </div>

          {/* Footer strip */}
          {!editMode && (
            <div style={{
              marginTop:24, padding:"14px 18px",
              background:"linear-gradient(135deg,rgba(219,234,254,.6),rgba(224,242,254,.6))",
              borderRadius:16, border:"1px solid rgba(147,197,253,.35)",
              display:"flex", alignItems:"center", justifyContent:"space-between",
              animation:"floatUp .5s ease .3s both",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{
                  width:8, height:8, borderRadius:"50%",
                  background:"#3b82f6", animation:"pulse 2s ease infinite",
                }}/>
                <span style={{ fontSize:12.5, color:"#1d4ed8", fontWeight:500 }}>
                  Profile data is securely stored and encrypted
                </span>
              </div>
              <button className="glass-btn" onClick={() => setEditMode(true)} style={{
                display:"flex", alignItems:"center", gap:6,
                background:"linear-gradient(135deg,#1d4ed8,#3b82f6)",
                border:"none", color:"#fff", borderRadius:10,
                padding:"8px 16px", cursor:"pointer",
                fontWeight:600, fontSize:12.5, fontFamily:"'Outfit',sans-serif",
                boxShadow:"0 4px 14px rgba(29,78,216,.3)",
              }}>
                <Pencil size={12}/> Quick Edit
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}