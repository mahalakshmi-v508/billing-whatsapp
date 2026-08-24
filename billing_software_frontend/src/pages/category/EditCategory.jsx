// import { useEffect, useState } from "react";
// import { useNavigate, useParams } from "react-router-dom";
// import api from "../../services/api";

// export default function EditCategory() {
//   const { id } = useParams();
//   const navigate = useNavigate();

//   const [name, setName] = useState("");

//   // 🔥 FETCH SINGLE
//   const fetchCategory = async () => {
//     const res = await api.get(`/category/get_by_id?id=${id}`);

//     if (res.data.status) {
//       setName(res.data.data.name);
//     }
//   };

//   useEffect(() => {
//     fetchCategory();
//   }, [id]);

//   // 🔥 UPDATE
//   const handleUpdate = async () => {
//     if (!name) {
//       alert("Enter category name");
//       return;
//     }

//     const res = await api.post("/category/update", {
//       id,
//       name,
//     });

//     if (res.data.status) {
//       alert("Updated Successfully ✅");
//       navigate("/category");
//     } else {
//       alert(res.data.message);
//     }
//   };

//   return (
//     <div className="max-w-lg bg-white p-6 rounded shadow">
//       <h2 className="text-xl font-bold mb-4">Edit Category</h2>

//       <input
//         value={name}
//         onChange={(e) => setName(e.target.value)}
//         className="w-full p-3 border mb-4"
//         placeholder="Category Name"
//       />

//       <button
//         onClick={handleUpdate}
//         className="bg-blue-600 text-white w-full p-3"
//       >
//         Update Category
//       </button>
//     </div>
//   );
// }

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
        <div key={t.id} className={`ec-toast ec-toast-${t.type}`}>
          <div className="ec-toast-icon">
            {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "!"}
          </div>
          <div className="ec-toast-content">
            <p className="ec-toast-title">{t.title}</p>
            {t.msg && <p className="ec-toast-msg">{t.msg}</p>}
          </div>
          <button className="ec-toast-x" style={{ pointerEvents: "auto" }} onClick={() => remove(t.id)}>✕</button>
          <div className="ec-toast-progress" />
        </div>
      ))}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function EditCategory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [originalName, setOriginalName] = useState("");
  const [charCount, setCharCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const { toasts, show, remove } = useToast();

  const fetchCategory = async () => {
    setFetching(true);
    try {
      const res = await api.get(`/category/get_by_id?id=${id}`);
      if (res.data.status) {
        setName(res.data.data.name);
        setOriginalName(res.data.data.name);
        setCharCount(res.data.data.name.length);
      } else {
        show("error", "Not found", "Category could not be loaded.");
      }
    } catch {
      show("error", "Server error", "Failed to fetch category.");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { fetchCategory(); }, [id]);

  const handleChange = (e) => {
    setName(e.target.value);
    setCharCount(e.target.value.length);
  };

  const handleUpdate = async () => {
    if (!name.trim()) {
      show("warn", "Missing field", "Category name cannot be empty.");
      return;
    }
    if (name.trim() === originalName) {
      show("warn", "No changes", "You haven't changed anything.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/category/update", { id, name: name.trim() });
      if (res.data.status) {
        show("success", "Category updated!", `"${name.trim()}" saved successfully.`);
        setTimeout(() => navigate("/category"), 2000);
      } else {
        show("error", "Update failed", res.data.message || "Something went wrong.");
      }
    } catch {
      show("error", "Server error", "Unable to reach the server.");
    } finally {
      setLoading(false);
    }
  };

  const isDirty = name.trim() !== originalName;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .ec-page {
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

        .ec-bg-ring {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }
        .ec-bg-ring-1 {
          width: 480px; height: 480px;
          border: 55px solid rgba(37,99,235,0.07);
          top: -170px; right: -140px;
        }
        .ec-bg-ring-2 {
          width: 300px; height: 300px;
          border: 38px solid rgba(99,102,241,0.06);
          bottom: -90px; left: -70px;
        }
        .ec-bg-dot {
          position: absolute;
          width: 6px; height: 6px;
          border-radius: 50%;
          background: rgba(37,99,235,0.15);
          pointer-events: none;
        }

        .ec-card {
          position: relative;
          width: 100%;
          max-width: 480px;
          background: #ffffff;
          border-radius: 26px;
          border: 1px solid rgba(226,232,240,0.8);
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.9) inset,
            0 20px 60px rgba(37,99,235,0.1),
            0 4px 16px rgba(0,0,0,0.04);
          overflow: hidden;
          animation: ecSlideUp 0.5s cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes ecSlideUp {
          from { opacity:0; transform:translateY(28px) scale(0.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }

        .ec-stripe {
          height: 5px;
          background: linear-gradient(90deg, #1d4ed8, #6366f1, #3b82f6, #1d4ed8);
          background-size: 200% 100%;
          animation: ecStripe 3s linear infinite;
        }
        @keyframes ecStripe {
          0%   { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }

        .ec-header {
          padding: 2rem 2rem 1.5rem;
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }
        .ec-icon-box {
          width: 52px; height: 52px;
          border-radius: 16px;
          background: linear-gradient(135deg, #1d4ed8, #3b82f6);
          display: flex; align-items: center; justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
          box-shadow: 0 6px 20px rgba(37,99,235,0.35);
        }
        .ec-header-text h1 {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 4px;
          letter-spacing: -0.4px;
        }
        .ec-header-text p {
          font-size: 13px;
          color: #94a3b8;
          margin: 0;
          font-weight: 400;
        }

        .ec-id-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 700;
          color: #2563eb;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 3px 9px;
          margin-top: 6px;
        }

        .ec-hr { height: 1px; background: #f1f5f9; margin: 0 2rem; }

        .ec-body { padding: 1.75rem 2rem 2rem; }

        .ec-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .ec-label {
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
        }
        .ec-char {
          font-size: 11px;
          color: #cbd5e1;
          font-weight: 500;
          transition: color 0.2s;
        }
        .ec-char.active { color: #3b82f6; }

        .ec-input-group { position: relative; margin-bottom: 0.75rem; }
        .ec-input-prefix {
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 48px;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
          color: #cbd5e1;
          border-right: 1.5px solid #e2e8f0;
          pointer-events: none;
          transition: all 0.25s;
          border-radius: 14px 0 0 14px;
          font-weight: 700;
        }
        .ec-input {
          width: 100%;
          padding: 14px 16px 14px 60px;
          border-radius: 14px;
          border: 1.5px solid #e2e8f0;
          background: #f8faff;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14.5px;
          font-weight: 500;
          color: #1e293b;
          outline: none;
          box-sizing: border-box;
          transition: all 0.25s;
        }
        .ec-input::placeholder { color: #c4cdd6; font-weight: 400; }
        .ec-input:hover { border-color: #bfdbfe; background: #f0f6ff; }
        .ec-input:focus {
          border-color: #3b82f6;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(59,130,246,0.1);
        }
        .ec-input-group:focus-within .ec-input-prefix {
          color: #3b82f6;
          border-right-color: #bfdbfe;
        }

        /* Skeleton loader for input */
        .ec-skeleton {
          height: 50px;
          border-radius: 14px;
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: ecShimmer 1.4s infinite;
          margin-bottom: 0.75rem;
        }
        @keyframes ecShimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* Changed indicator */
        .ec-changed {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: #f59e0b;
          margin-bottom: 1.5rem;
          padding: 8px 12px;
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 10px;
          animation: ecFadeIn 0.3s ease;
        }
        .ec-unchanged {
          height: 1.5rem;
          margin-bottom: 1.5rem;
        }
        @keyframes ecFadeIn {
          from { opacity:0; transform: translateY(-4px); }
          to   { opacity:1; transform: translateY(0); }
        }

        .ec-btn {
          width: 100%;
          padding: 15px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 15px;
          font-weight: 700;
          background: linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%);
          color: #fff;
          box-shadow: 0 4px 18px rgba(37,99,235,0.38);
          position: relative;
          overflow: hidden;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: all 0.25s;
          opacity: 1;
        }
        .ec-btn::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 60%);
          pointer-events: none;
        }
        .ec-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(37,99,235,0.45);
        }
        .ec-btn:active:not(:disabled) { transform: translateY(0); }
        .ec-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }

        .ec-btn-cancel {
          width: 100%;
          margin-top: 10px;
          padding: 12px;
          border-radius: 12px;
          border: 1.5px solid #e2e8f0;
          background: transparent;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13.5px;
          font-weight: 600;
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ec-btn-cancel:hover { background: #f8fafc; color: #475569; border-color: #cbd5e1; }

        .ec-spinner {
          width: 17px; height: 17px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Toast ── */
        .ec-toast {
          pointer-events: auto;
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 290px;
          max-width: 370px;
          padding: 13px 16px;
          border-radius: 16px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 8px 30px rgba(0,0,0,0.13);
          animation: ecToastIn 0.4s cubic-bezier(0.22,1,0.36,1) both;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        @keyframes ecToastIn {
          from { opacity:0; transform:translateX(60px) scale(0.9); }
          to   { opacity:1; transform:translateX(0) scale(1); }
        }
        .ec-toast-success { background:#f0fdf4; border:1px solid #bbf7d0; }
        .ec-toast-error   { background:#fff1f2; border:1px solid #fecdd3; }
        .ec-toast-warn    { background:#fffbeb; border:1px solid #fde68a; }
        .ec-toast-icon {
          width:32px; height:32px; border-radius:10px;
          display:flex; align-items:center; justify-content:center;
          font-size:14px; font-weight:800; flex-shrink:0;
        }
        .ec-toast-success .ec-toast-icon { background:#dcfce7; color:#16a34a; }
        .ec-toast-error   .ec-toast-icon { background:#ffe4e6; color:#e11d48; }
        .ec-toast-warn    .ec-toast-icon { background:#fef9c3; color:#b45309; }
        .ec-toast-content { flex:1; }
        .ec-toast-title { font-size:13px; font-weight:700; margin:0 0 2px; }
        .ec-toast-success .ec-toast-title { color:#15803d; }
        .ec-toast-error   .ec-toast-title { color:#be123c; }
        .ec-toast-warn    .ec-toast-title { color:#92400e; }
        .ec-toast-msg { font-size:12px; margin:0; font-weight:400; }
        .ec-toast-success .ec-toast-msg { color:#16a34a; }
        .ec-toast-error   .ec-toast-msg { color:#e11d48; }
        .ec-toast-warn    .ec-toast-msg { color:#b45309; }
        .ec-toast-x {
          background:none; border:none; cursor:pointer;
          font-size:13px; opacity:0.4; transition:opacity 0.2s;
          flex-shrink:0; padding:2px;
        }
        .ec-toast-x:hover { opacity:0.9; }
        .ec-toast-progress {
          position:absolute; bottom:0; left:0;
          height:3px; border-radius:0 0 16px 16px;
          animation:ecShrink 3.8s linear forwards;
        }
        .ec-toast-success .ec-toast-progress { background:#4ade80; }
        .ec-toast-error   .ec-toast-progress { background:#fb7185; }
        .ec-toast-warn    .ec-toast-progress { background:#fbbf24; }
        @keyframes ecShrink {
          from { width:100%; } to { width:0%; }
        }
      `}</style>

      <ToastPortal toasts={toasts} remove={remove} />

      <div className="ec-page">
        <div className="ec-bg-ring ec-bg-ring-1" />
        <div className="ec-bg-ring ec-bg-ring-2" />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="ec-bg-dot" style={{
            top:  `${[15,25,70,80,40,60,10,90][i]}%`,
            left: `${[10,85,5,90,50,20,70,45][i]}%`,
          }} />
        ))}

        <div className="ec-card">
          <div className="ec-stripe" />

          <div className="ec-header">
            <div className="ec-icon-box">✏️</div>
            <div className="ec-header-text">
              <h1>Edit Category</h1>
              <p>Update the category name below</p>
              <div className="ec-id-badge">🔖 Category ID: #{id}</div>
            </div>
          </div>

          <div className="ec-hr" />

          <div className="ec-body">

            <div className="ec-label-row">
              <span className="ec-label">Category Name</span>
              <span className={`ec-char ${charCount > 0 ? "active" : ""}`}>{charCount}/50</span>
            </div>

            {fetching ? (
              <div className="ec-skeleton" />
            ) : (
              <div className="ec-input-group">
                <input
                  type="text"
                  className="ec-input"
                  placeholder="e.g. Electronics, Beverages…"
                  value={name}
                  maxLength={50}
                  onChange={handleChange}
                  onKeyDown={e => e.key === "Enter" && handleUpdate()}
                />
                <div className="ec-input-prefix">#</div>
              </div>
            )}

            {isDirty
              ? <div className="ec-changed">⚡ Unsaved changes — original: "{originalName}"</div>
              : <div className="ec-unchanged" />
            }

            <button className="ec-btn" onClick={handleUpdate} disabled={loading || fetching}>
              {loading
                ? <><div className="ec-spinner" /> Updating…</>
                : <>💾 Update Category</>
              }
            </button>

            <button className="ec-btn-cancel" onClick={() => navigate("/category")}>
              ← Back to Categories
            </button>
          </div>
        </div>
      </div>
    </>
  );
}