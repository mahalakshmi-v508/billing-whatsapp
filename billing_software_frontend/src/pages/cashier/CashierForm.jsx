import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { User, Mail, Lock, Eye, EyeOff, UserPlus, ArrowLeft, CheckCircle2 } from "lucide-react";

const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');

  @keyframes cf-in    { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
  @keyframes cf-spin  { to{transform:rotate(360deg)} }
  @keyframes cf-shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
  @keyframes cf-toast { from{opacity:0;transform:translateY(-10px) scale(.95)} to{opacity:1;transform:none} }
  @keyframes cf-pop   { 0%{transform:scale(.8);opacity:0} 70%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }
  @keyframes cf-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  @keyframes cf-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }

  .cf-input {
    width: 100%;
    background: #f1f5fb;
    border: 1.5px solid transparent;
    border-radius: 14px;
    padding: 13px 14px 13px 46px;
    font-size: 14px;
    font-family: 'Outfit', sans-serif;
    color: #1e3a8a;
    outline: none;
    transition: border-color .2s, box-shadow .2s, background .2s;
    box-sizing: border-box;
  }
  .cf-input:focus {
    background: #fff;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3.5px rgba(59,130,246,.13);
  }
  .cf-input::placeholder { color: #94a3b8; }

  .cf-btn {
    width: 100%;
    background: linear-gradient(135deg, #1d4ed8, #3b82f6);
    border: none;
    border-radius: 14px;
    color: #fff;
    padding: 14px;
    font-size: 15px;
    font-weight: 700;
    font-family: 'Outfit', sans-serif;
    cursor: pointer;
    transition: all .22s;
    box-shadow: 0 6px 22px rgba(29,78,216,.3);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    letter-spacing: .01em;
  }
  .cf-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 30px rgba(29,78,216,.4);
  }
  .cf-btn:active:not(:disabled) { transform: scale(.97); }
  .cf-btn:disabled { opacity: .72; cursor: not-allowed; }

  .cf-back {
    background: none; border: none; cursor: pointer;
    color: #64748b; font-size: 13.5px; font-weight: 600;
    font-family: 'Outfit', sans-serif;
    display: flex; align-items: center; gap: 6px;
    padding: 9px 14px; border-radius: 10px;
    transition: all .18s;
  }
  .cf-back:hover { background: #f1f5fb; color: #1d4ed8; }
`;

export default function CashierForm() {
  const navigate = useNavigate();
  const [form,    setForm]    = useState({ name:"", email:"", password:"" });
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [toast,    setToast]    = useState(null);
  const [shake,    setShake]    = useState(false);
  const [success,  setSuccess]  = useState(false);

  useEffect(() => {
    const s = document.createElement("style");
    s.innerHTML = STYLE;
    document.head.appendChild(s);
    return () => document.head.removeChild(s);
  }, []);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3200);
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim())     { showToast("Name is required", false);     triggerShake(); return; }
    if (!form.email.trim())    { showToast("Email is required", false);    triggerShake(); return; }
    if (!/\S+@\S+\.\S+/.test(form.email)) { showToast("Enter a valid email", false); triggerShake(); return; }
    if (!form.password.trim()) { showToast("Password is required", false); triggerShake(); return; }
    if (form.password.length < 6) { showToast("Min. 6 characters", false); triggerShake(); return; }

    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const res = await api.post("/auth/register", {
        name: form.name,
        email: form.email,
        // email: form.email, 
        password: form.password,
        role: "cashier",
        admin_id: user.id,
        requested_by: user.id,
      });

//       if (res.data.status) {
//        setForm({
//   name: "",
//   email: "",
//   password: ""
// });

// setShowPass(false);

// // setSuccess(true);

// showToast(
//   res.data.message ||
//   "Cashier created successfully!"
// );
//       } else {
//         showToast(res.data.message || "Something went wrong", false);
//         triggerShake();
//       }
const msg =
  res.data.message || "";

if (
  res.data.status ||
  msg.toLowerCase().includes("limit") ||
  msg.toLowerCase().includes("request")
) {

  // CLEAR FORM
  setForm({
    name: "",
    email: "",
    password: ""
  });

  setShowPass(false);
}

if (res.data.status) {

  showToast(
    "Cashier created successfully!",
    true
  );

  setSuccess(true);

  setTimeout(() => {

    navigate("/cashier");

  }, 1500);

} else {

  showToast(
    msg || "Something went wrong",
    false
  );

}

if (!res.data.status) {
  triggerShake();
}
    } catch {
      showToast("Server error. Try again.", false);
      triggerShake();
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#eef3fb",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Outfit', sans-serif",
      padding: 20,
    }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          background: toast.ok
            ? "linear-gradient(135deg,#1d4ed8,#3b82f6)"
            : "linear-gradient(135deg,#dc2626,#ef4444)",
          color: "#fff", borderRadius: 13, padding: "12px 20px",
          fontWeight: 600, fontSize: 13.5,
          boxShadow: "0 8px 32px rgba(0,0,0,.14)",
          animation: "cf-toast .28s ease both",
          display: "flex", alignItems: "center", gap: 9,
          fontFamily: "'Outfit', sans-serif",
        }}>
          <span style={{
            width: 20, height: 20, borderRadius: 6,
            background: "rgba(255,255,255,.22)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 900, flexShrink: 0,
          }}>
            {toast.ok ? "✓" : "✕"}
          </span>
          {toast.msg}
        </div>
      )}

      {/* Card */}
      <div style={{
        background: "#fff",
        borderRadius: 28,
        boxShadow: "0 8px 48px rgba(29,78,216,.11), 0 2px 8px rgba(0,0,0,.05)",
        width: "100%",
        maxWidth: 400,
        overflow: "hidden",
        animation: shake ? "cf-shake .45s ease" : "cf-in .5s cubic-bezier(.4,0,.2,1) both",
      }}>

        {/* Header banner */}
        <div style={{
          background: "linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 50%,#3b82f6 100%)",
          padding: "28px 28px 32px",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* dot grid */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: "radial-gradient(rgba(255,255,255,.065) 1px,transparent 1px)",
            backgroundSize: "18px 18px",
          }}/>
          {/* orb */}
          <div style={{
            position: "absolute", top: -40, right: -40,
            width: 130, height: 130, borderRadius: "50%",
            background: "rgba(255,255,255,.07)", pointerEvents: "none",
          }}/>

          {/* Back btn */}
          

          {/* Icon + title */}
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 17,
              background: "rgba(255,255,255,.18)",
              border: "1.5px solid rgba(255,255,255,.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 18px rgba(0,0,0,.14)",
              flexShrink: 0,
              animation: success ? "cf-float 2s ease infinite" : "cf-pop .4s ease both",
            }}>
              {success
                ? <CheckCircle2 size={26} color="#4ade80" strokeWidth={2}/>
                : <UserPlus     size={24} color="#fff"    strokeWidth={1.9}/>
              }
            </div>
            <div>
              <h2 style={{
                fontSize: 20, fontWeight: 800, color: "#fff",
                letterSpacing: "-.02em", marginBottom: 3,
              }}>
                {success ? "Cashier Added!" : "Add Cashier"}
              </h2>
              <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.6)", fontWeight: 400 }}>
                {success ? "Redirecting…" : "Create a new cashier account"}
              </p>
            </div>
          </div>
        </div>

        {/* Form body */}
        {!success ? (
          <div style={{ padding: "24px 28px 28px" }}>

            {/* Name */}
            <div style={{ marginBottom: 13, animation: "cf-in .4s ease .05s both" }}>
              <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", color: "#64748b", textTransform: "uppercase", marginBottom: 7 }}>
                Full Name
              </p>
              <div style={{ position: "relative" }}>
                <User size={16} color="#94a3b8" style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}/>
                <input
                  className="cf-input"
                  placeholder="Enter full name"
                  value={form.name}
                  onChange={e => set("name", e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                />
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: 13, animation: "cf-in .4s ease .1s both" }}>
              <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", color: "#64748b", textTransform: "uppercase", marginBottom: 7 }}>
                Email
              </p>
              <div style={{ position: "relative" }}>
                <Mail size={16} color="#94a3b8" style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}/>
                <input
                  className="cf-input"
                  type="email"
                  placeholder="email@example.com"
                  value={form.email}
                  onChange={e => set("email", e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 22, animation: "cf-in .4s ease .15s both" }}>
              <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", color: "#64748b", textTransform: "uppercase", marginBottom: 7 }}>
                Password
              </p>
              <div style={{ position: "relative" }}>
                <Lock size={16} color="#94a3b8" style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}/>
                <input
                  className="cf-input"
                  type={showPass ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={e => set("password", e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  style={{ paddingRight: 44 }}
                />
                <button
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "#94a3b8", display: "flex", alignItems: "center", padding: 2,
                    transition: "color .18s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = "#3b82f6"}
                  onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}
                >
                  {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>

              {/* Strength bar */}
              {form.password.length > 0 && (
                <div style={{ display: "flex", gap: 5, marginTop: 8, alignItems: "center" }}>
                  {[1,2,3,4].map(i => {
                    const s = form.password.length < 4 ? 1 : form.password.length < 7 ? 2 : form.password.length < 10 ? 3 : 4;
                    const c = ["#ef4444","#f97316","#eab308","#22c55e"][s-1];
                    return <div key={i} style={{ flex:1, height:3, borderRadius:99, background: i<=s ? c : "#e2e8f0", transition:"background .3s" }}/>;
                  })}
                  <span style={{ fontSize:10, color:"#64748b", fontWeight:600, whiteSpace:"nowrap" }}>
                    {["","Weak","Fair","Good","Strong"][form.password.length < 4 ? 1 : form.password.length < 7 ? 2 : form.password.length < 10 ? 3 : 4]}
                  </span>
                </div>
              )}
            </div>

            {/* Submit */}
            <div style={{ animation: "cf-in .4s ease .2s both" }}>
              <button className="cf-btn" onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <><span style={{ width:15, height:15, border:"2.5px solid rgba(255,255,255,.35)", borderTopColor:"#fff", borderRadius:"50%", display:"inline-block", animation:"cf-spin .7s linear infinite" }}/> Creating…</>
                ) : (
                  <><UserPlus size={16} strokeWidth={2}/> Create Cashier</>
                )}
              </button>
            </div>

          </div>
        ) : (
          /* Success state */
          <div style={{ padding: "28px", textAlign: "center" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "#dcfce7", border: "2px solid #86efac",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 14px", animation: "cf-pop .4s ease both",
            }}>
              <CheckCircle2 size={26} color="#16a34a"/>
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#1e3a8a", marginBottom: 6 }}>
              Cashier created successfully!
            </p>
            <p style={{ fontSize: 13, color: "#94a3b8" }}>Redirecting to cashier list…</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 14 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: "50%", background: "#3b82f6",
                  animation: `cf-pulse 1s ease ${i*.18}s infinite`,
                }}/>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}



