// import { useState } from "react";
// import api from "../../services/api";

// export default function ForgotPassword() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [loading, setLoading] = useState(false);

//   const handleReset = async () => {
//     if (!email || !password) {
//       alert("All fields required");
//       return;
//     }

//     setLoading(true);

//     try {
//       const res = await api.post("/auth/forgot_password", {
//         email,
//         password
//       });

//       if (res.data.status) {
//         alert("Password updated successfully 🔥");
//       } else {
//         alert(res.data.message);
//       }

//     } catch (err) {
//       alert("Server error");
//     }

//     setLoading(false);
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-blue-50">

//       <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">

//         <h2 className="text-2xl font-bold text-center mb-6 text-indigo-600">
//           Forgot Password
//         </h2>

//         <input
//           type="email"
//           placeholder="Enter your email"
//           className="w-full border p-3 rounded-lg mb-4"
//           value={email}
//           onChange={(e) => setEmail(e.target.value)}
//         />

//         <input
//           type="password"
//           placeholder="New Password"
//           className="w-full border p-3 rounded-lg mb-4"
//           value={password}
//           onChange={(e) => setPassword(e.target.value)}
//         />

//         <button
//           onClick={handleReset}
//           className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold"
//         >
//           {loading ? "Updating..." : "Reset Password"}
//         </button>

//       </div>
//     </div>
//   );
// }

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { Mail, Lock, ShieldCheck, ArrowLeft, Eye, EyeOff, KeyRound } from "lucide-react";

const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@700;800&display=swap');

  @keyframes fp-floatUp   { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:none} }
  @keyframes fp-orb1      { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(20px,-18px) scale(1.07)} }
  @keyframes fp-orb2      { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-16px,22px)} }
  @keyframes fp-spin      { to{transform:rotate(360deg)} }
  @keyframes fp-shake     { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-7px)} 40%,80%{transform:translateX(7px)} }
  @keyframes fp-pop       { 0%{transform:scale(.85);opacity:0} 70%{transform:scale(1.04)} 100%{transform:scale(1);opacity:1} }
  @keyframes fp-toast     { from{opacity:0;transform:translateY(-12px) scale(.95)} to{opacity:1;transform:none} }
  @keyframes fp-scanline  { from{top:-100%} to{top:200%} }
  @keyframes fp-pulse     { 0%,100%{opacity:1} 50%{opacity:.5} }

  .fp-input { transition: border-color .2s, box-shadow .2s !important; font-family: 'Outfit', sans-serif !important; }
  .fp-input:focus { outline: none !important; border-color: #3b82f6 !important; box-shadow: 0 0 0 3.5px rgba(59,130,246,.15) !important; }
  .fp-btn { transition: all .2s cubic-bezier(.4,0,.2,1) !important; }
  .fp-btn:hover:not(:disabled) { transform: translateY(-2px) !important; box-shadow: 0 10px 32px rgba(29,78,216,.35) !important; }
  .fp-btn:active:not(:disabled) { transform: scale(.97) !important; }
  .fp-back { transition: all .2s !important; }
  .fp-back:hover { background: rgba(59,130,246,.08) !important; color: #1d4ed8 !important; }
  .fp-eye { transition: color .18s !important; }
  .fp-eye:hover { color: #3b82f6 !important; }
`;

export default function ForgotPassword() {
  const navigate   = useNavigate();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
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
    setTimeout(() => setToast(null), 3500);
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleReset = async () => {
    if (!email || !password) {
      showToast("All fields are required", false);
      triggerShake();
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      showToast("Enter a valid email address", false);
      triggerShake();
      return;
    }
    if (password.length < 6) {
      showToast("Password must be at least 6 characters", false);
      triggerShake();
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/forgot_password", { email, password });
      if (res.data.status) {
        setSuccess(true);
        showToast("Password updated successfully!");
        setTimeout(() => navigate("/"), 2200);
      } else {
        showToast(res.data.message || "Something went wrong", false);
        triggerShake();
      }
    } catch {
      showToast("Server error. Please try again.", false);
      triggerShake();
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:"#eef3fb", fontFamily:"'Outfit',sans-serif", padding:"20px",
      position:"relative", overflow:"hidden",
    }}>
      {/* Background blobs */}
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden" }}>
        <div style={{
          position:"absolute", top:"-8%", left:"-6%",
          width:380, height:380, borderRadius:"50%",
          background:"linear-gradient(135deg,rgba(59,130,246,.13),rgba(29,78,216,.08))",
          animation:"fp-orb1 9s ease-in-out infinite", filter:"blur(2px)",
        }}/>
        <div style={{
          position:"absolute", bottom:"-10%", right:"-8%",
          width:320, height:320, borderRadius:"50%",
          background:"linear-gradient(135deg,rgba(96,165,250,.12),rgba(59,130,246,.07))",
          animation:"fp-orb2 11s ease-in-out infinite", filter:"blur(2px)",
        }}/>
        <div style={{
          position:"absolute", top:"40%", right:"12%",
          width:120, height:120, borderRadius:"50%",
          background:"rgba(147,197,253,.1)",
          animation:"fp-orb1 7s ease-in-out infinite reverse",
        }}/>
        {/* dot grid */}
        <div style={{
          position:"absolute", inset:0,
          backgroundImage:"radial-gradient(rgba(59,130,246,.07) 1px,transparent 1px)",
          backgroundSize:"26px 26px",
        }}/>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position:"fixed", top:22, right:24, zIndex:9999,
          background: toast.ok
            ? "linear-gradient(135deg,#1d4ed8,#3b82f6)"
            : "linear-gradient(135deg,#dc2626,#ef4444)",
          color:"#fff", borderRadius:14, padding:"13px 20px",
          fontWeight:600, fontSize:13.5,
          boxShadow:"0 10px 36px rgba(29,78,216,.28)",
          animation:"fp-toast .32s ease both",
          display:"flex", alignItems:"center", gap:9,
          fontFamily:"'Outfit',sans-serif",
        }}>
          <span style={{
            width:20, height:20, borderRadius:6,
            background:"rgba(255,255,255,.22)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:11, fontWeight:900, flexShrink:0,
          }}>
            {toast.ok ? "✓" : "✕"}
          </span>
          {toast.msg}
        </div>
      )}

      {/* Card */}
      <div style={{
        width:"100%", maxWidth:440, position:"relative",
        animation: shake
          ? "fp-shake .45s ease"
          : "fp-floatUp .55s cubic-bezier(.4,0,.2,1) both",
      }}>

        {/* Glass card */}
        <div style={{
          background:"rgba(255,255,255,.75)",
          backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)",
          borderRadius:28, border:"1.5px solid rgba(147,197,253,.45)",
          boxShadow:"0 4px 48px rgba(29,78,216,.12), 0 1px 0 rgba(255,255,255,.9) inset",
          overflow:"hidden",
        }}>

          {/* Hero banner */}
          <div style={{
            position:"relative",
            background:"linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 45%,#3b82f6 100%)",
            padding:"32px 32px 36px",
            overflow:"hidden",
          }}>
            {/* dot grid */}
            <div style={{
              position:"absolute", inset:0, pointerEvents:"none",
              backgroundImage:"radial-gradient(rgba(255,255,255,.06) 1px,transparent 1px)",
              backgroundSize:"20px 20px",
            }}/>
            {/* orb */}
            <div style={{
              position:"absolute", top:-40, right:-40, width:140, height:140,
              borderRadius:"50%", background:"rgba(255,255,255,.07)",
              animation:"fp-orb1 8s ease-in-out infinite", pointerEvents:"none",
            }}/>
            {/* scanline */}
            <div style={{
              position:"absolute", left:0, right:0, height:1.5,
              background:"linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent)",
              animation:"fp-scanline 4s linear infinite", pointerEvents:"none",
            }}/>

            {/* Icon */}
            <div style={{ position:"relative", display:"flex", justifyContent:"center", marginBottom:18 }}>
              <div style={{
                width:64, height:64, borderRadius:20,
                background:"rgba(255,255,255,.15)",
                border:"1.5px solid rgba(255,255,255,.3)",
                display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow:"0 8px 28px rgba(0,0,0,.15)",
                animation:"fp-pop .45s ease both",
              }}>
                {success
                  ? <ShieldCheck size={30} color="#4ade80" strokeWidth={2}/>
                  : <KeyRound    size={30} color="#fff"    strokeWidth={1.8}/>
                }
              </div>
            </div>

            <div style={{ position:"relative", textAlign:"center" }}>
              <h1 style={{
                fontSize:24, fontWeight:800, color:"#fff",
                fontFamily:"'Playfair Display',serif", letterSpacing:"-.02em",
                marginBottom:6,
              }}>
                {success ? "All Done!" : "Reset Password"}
              </h1>
              <p style={{ fontSize:13.5, color:"rgba(255,255,255,.65)", fontWeight:400 }}>
                {success
                  ? "Redirecting you to login…"
                  : "Enter your email and set a new password"
                }
              </p>
            </div>
          </div>

          {/* Form body */}
          {!success && (
            <div style={{ padding:"28px 28px 24px" }}>

              {/* Email field */}
              <div style={{ marginBottom:16, animation:"fp-floatUp .45s ease .06s both" }}>
                <label style={{
                  fontSize:10.5, fontWeight:700, letterSpacing:".1em",
                  color:"#3b82f6", textTransform:"uppercase", display:"flex",
                  alignItems:"center", gap:6, marginBottom:8,
                }}>
                  <div style={{
                    width:22, height:22, borderRadius:7,
                    background:"linear-gradient(135deg,#1d4ed8,#3b82f6)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    boxShadow:"0 3px 10px rgba(59,130,246,.35)",
                  }}>
                    <Mail size={12} color="#fff" strokeWidth={2.2}/>
                  </div>
                  Email Address
                </label>
                <input
                  className="fp-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleReset()}
                  style={{
                    width:"100%", background:"rgba(239,246,255,.75)",
                    border:"1.5px solid #bfdbfe", borderRadius:13,
                    padding:"12px 16px", color:"#1e3a8a",
                    fontSize:14.5, letterSpacing:"-.01em",
                    boxSizing:"border-box",
                  }}
                />
              </div>

              {/* Password field */}
              <div style={{ marginBottom:24, animation:"fp-floatUp .45s ease .12s both" }}>
                <label style={{
                  fontSize:10.5, fontWeight:700, letterSpacing:".1em",
                  color:"#3b82f6", textTransform:"uppercase", display:"flex",
                  alignItems:"center", gap:6, marginBottom:8,
                }}>
                  <div style={{
                    width:22, height:22, borderRadius:7,
                    background:"linear-gradient(135deg,#1d4ed8,#3b82f6)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    boxShadow:"0 3px 10px rgba(59,130,246,.35)",
                  }}>
                    <Lock size={12} color="#fff" strokeWidth={2.2}/>
                  </div>
                  New Password
                </label>
                <div style={{ position:"relative" }}>
                  <input
                    className="fp-input"
                    type={showPass ? "text" : "password"}
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleReset()}
                    style={{
                      width:"100%", background:"rgba(239,246,255,.75)",
                      border:"1.5px solid #bfdbfe", borderRadius:13,
                      padding:"12px 46px 12px 16px", color:"#1e3a8a",
                      fontSize:14.5, letterSpacing:"-.01em",
                      boxSizing:"border-box",
                    }}
                  />
                  <button
                    className="fp-eye"
                    onClick={() => setShowPass(v => !v)}
                    style={{
                      position:"absolute", right:14, top:"50%",
                      transform:"translateY(-50%)",
                      background:"none", border:"none",
                      cursor:"pointer", color:"#93c5fd",
                      display:"flex", alignItems:"center", padding:2,
                    }}
                  >
                    {showPass ? <EyeOff size={17}/> : <Eye size={17}/>}
                  </button>
                </div>

                {/* Password strength dots */}
                {password.length > 0 && (
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:8 }}>
                    {[1,2,3,4].map(i => {
                      const strength = password.length < 4 ? 1 : password.length < 7 ? 2 : password.length < 10 ? 3 : 4;
                      const colors = ["#ef4444","#f97316","#eab308","#22c55e"];
                      return (
                        <div key={i} style={{
                          flex:1, height:3, borderRadius:99,
                          background: i <= strength ? colors[strength-1] : "#e2e8f0",
                          transition:"background .3s",
                        }}/>
                      );
                    })}
                    <span style={{ fontSize:10.5, color:"#64748b", fontWeight:500, whiteSpace:"nowrap" }}>
                      {password.length < 4 ? "Weak" : password.length < 7 ? "Fair" : password.length < 10 ? "Good" : "Strong"}
                    </span>
                  </div>
                )}
              </div>

              {/* Submit button */}
              <button
                className="fp-btn"
                onClick={handleReset}
                disabled={loading}
                style={{
                  width:"100%",
                  background:"linear-gradient(135deg,#1e3a8a,#1d4ed8 50%,#3b82f6)",
                  border:"none", borderRadius:14, color:"#fff",
                  padding:"14px", fontWeight:700, fontSize:15,
                  fontFamily:"'Outfit',sans-serif", letterSpacing:".01em",
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow:"0 6px 22px rgba(29,78,216,.32)",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:9,
                  animation:"fp-floatUp .45s ease .18s both",
                  opacity: loading ? .8 : 1,
                }}
              >
                {loading ? (
                  <>
                    <span style={{
                      width:16, height:16,
                      border:"2.5px solid rgba(255,255,255,.35)",
                      borderTopColor:"#fff", borderRadius:"50%",
                      display:"inline-block",
                      animation:"fp-spin .7s linear infinite",
                    }}/>
                    Updating…
                  </>
                ) : (
                  <><KeyRound size={16} strokeWidth={2}/> Reset Password</>
                )}
              </button>

              {/* Divider */}
              <div style={{ height:1, margin:"20px 0", background:"linear-gradient(to right,transparent,#bfdbfe,transparent)" }}/>

              {/* Back to login */}
              <button
                className="fp-back"
                onClick={() => navigate("/")}
                style={{
                  width:"100%", background:"transparent",
                  border:"1.5px solid #bfdbfe", borderRadius:13,
                  color:"#64748b", padding:"11px",
                  fontWeight:600, fontSize:13.5,
                  fontFamily:"'Outfit',sans-serif",
                  cursor:"pointer",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:7,
                  animation:"fp-floatUp .45s ease .22s both",
                }}
              >
                <ArrowLeft size={15}/> Back to Login
              </button>

            </div>
          )}

          {/* Success state */}
          {success && (
            <div style={{
              padding:"32px 28px",
              display:"flex", flexDirection:"column", alignItems:"center", gap:14,
              animation:"fp-pop .4s ease both",
            }}>
              <div style={{
                width:64, height:64, borderRadius:"50%",
                background:"linear-gradient(135deg,#dcfce7,#bbf7d0)",
                border:"2px solid #86efac",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <ShieldCheck size={28} color="#16a34a" strokeWidth={2}/>
              </div>
              <p style={{ fontSize:15, fontWeight:600, color:"#1e3a8a", textAlign:"center" }}>
                Your password has been updated!
              </p>
              <div style={{ display:"flex", gap:5 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width:7, height:7, borderRadius:"50%", background:"#3b82f6",
                    animation:`fp-pulse 1s ease ${i*.18}s infinite`,
                  }}/>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer note */}
        <p style={{
          textAlign:"center", marginTop:18, fontSize:12,
          color:"rgba(29,78,216,.45)", fontWeight:500,
          animation:"fp-floatUp .5s ease .28s both",
        }}>
          🔒 Secured with end-to-end encryption
        </p>

      </div>
    </div>
  );
}