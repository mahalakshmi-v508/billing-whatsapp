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
        <div key={t.id} className={`ebr-toast ebr-toast-${t.type}`}>
          <div className="ebr-toast-icon">
            {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "!"}
          </div>
          <div className="ebr-toast-content">
            <p className="ebr-toast-title">{t.title}</p>
            {t.msg && <p className="ebr-toast-msg">{t.msg}</p>}
          </div>
          <button className="ebr-toast-x" style={{ pointerEvents: "auto" }} onClick={() => remove(t.id)}>✕</button>
          <div className="ebr-toast-progress" />
        </div>
      ))}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function EditBrand() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [originalName, setOriginalName] = useState("");
  const [charCount, setCharCount] = useState(0);

  const [companyId, setCompanyId] = useState(null);

  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [originalCategory, setOriginalCategory] = useState("");

  const [subcategories, setSubcategories] = useState([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [originalSubcategory, setOriginalSubcategory] = useState("");

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [subLoading, setSubLoading] = useState(false);
  const { toasts, show, remove } = useToast();

  const fetchBrand = async () => {
    setFetching(true);
    try {
      const res = await api.get(`/brand/get_by_id?id=${id}`);
      if (res.data.status) {
        const b = res.data.data;
        setName(b.name);
        setOriginalName(b.name);
        setCharCount(b.name.length);
        setSelectedCategory(String(b.category_id));
        setOriginalCategory(String(b.category_id));
        setSelectedSubcategory(String(b.subcategory_id));
        setOriginalSubcategory(String(b.subcategory_id));
        setCompanyId(b.company_id);

        // load categories, then subcategories for this brand's category
        loadCategories(b.company_id);
        loadSubcategories(b.company_id, b.category_id);
      } else {
        show("error", "Not found", "Brand could not be loaded.");
      }
    } catch {
      show("error", "Server error", "Failed to fetch brand.");
    } finally {
      setFetching(false);
    }
  };

  const loadCategories = async (company_id) => {
    try {
      const res = await api.get(
        `/category/get_active_category?company_id=${company_id}`
      );
      if (res.data.status) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const loadSubcategories = async (company_id, category_id) => {
    setSubLoading(true);
    try {
      const res = await api.get(
        `/subcategory/get_active_subcategory?company_id=${company_id}&category_id=${category_id}`
      );
      if (res.data.status) {
        setSubcategories(res.data.data);
      } else {
        setSubcategories([]);
      }
    } catch (err) {
      console.log(err);
      setSubcategories([]);
    } finally {
      setSubLoading(false);
    }
  };

  useEffect(() => { fetchBrand(); }, [id]);

  // when the user changes the category (after initial load), refresh subcategory list
  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    setSelectedCategory(newCategory);

    if (!companyId) return;

    if (newCategory) {
      loadSubcategories(companyId, newCategory);
    } else {
      setSubcategories([]);
    }

    // if the category actually changed from what's loaded, reset subcategory
    // unless it matches the original brand's category (keep original subcategory selected)
    if (newCategory === originalCategory) {
      setSelectedSubcategory(originalSubcategory);
    } else {
      setSelectedSubcategory("");
    }
  };

  const handleChange = (e) => {
    setName(e.target.value);
    setCharCount(e.target.value.length);
  };

  const handleUpdate = async () => {
    if (!name.trim()) {
      show("warn", "Missing field", "Brand name cannot be empty.");
      return;
    }
    if (!selectedCategory) {
      show("warn", "Missing field", "Please select a category.");
      return;
    }
    if (!selectedSubcategory) {
      show("warn", "Missing field", "Please select a subcategory.");
      return;
    }
    if (
      name.trim() === originalName &&
      selectedCategory === originalCategory &&
      selectedSubcategory === originalSubcategory
    ) {
      show("warn", "No changes", "You haven't changed anything.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/brand/update", {
        id,
        name: name.trim(),
        category_id: Number(selectedCategory),
        subcategory_id: Number(selectedSubcategory),
      });
      if (res.data.status) {
        show("success", "Brand updated!", `"${name.trim()}" saved successfully.`);
        setTimeout(() => navigate("/brand"), 2000);
      } else {
        show("error", "Update failed", res.data.message || "Something went wrong.");
      }
    } catch {
      show("error", "Server error", "Unable to reach the server.");
    } finally {
      setLoading(false);
    }
  };

  const isDirty =
    name.trim() !== originalName ||
    selectedCategory !== originalCategory ||
    selectedSubcategory !== originalSubcategory;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .ebr-page {
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

        .ebr-bg-ring {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }
        .ebr-bg-ring-1 {
          width: 480px; height: 480px;
          border: 55px solid rgba(37,99,235,0.07);
          top: -170px; right: -140px;
        }
        .ebr-bg-ring-2 {
          width: 300px; height: 300px;
          border: 38px solid rgba(99,102,241,0.06);
          bottom: -90px; left: -70px;
        }
        .ebr-bg-dot {
          position: absolute;
          width: 6px; height: 6px;
          border-radius: 50%;
          background: rgba(37,99,235,0.15);
          pointer-events: none;
        }

        .ebr-card {
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
          animation: ebrSlideUp 0.5s cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes ebrSlideUp {
          from { opacity:0; transform:translateY(28px) scale(0.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }

        .ebr-stripe {
          height: 5px;
          background: linear-gradient(90deg, #1d4ed8, #6366f1, #3b82f6, #1d4ed8);
          background-size: 200% 100%;
          animation: ebrStripe 3s linear infinite;
        }
        @keyframes ebrStripe {
          0%   { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }

        .ebr-header {
          padding: 2rem 2rem 1.5rem;
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }
        .ebr-icon-box {
          width: 52px; height: 52px;
          border-radius: 16px;
          background: linear-gradient(135deg, #1d4ed8, #3b82f6);
          display: flex; align-items: center; justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
          box-shadow: 0 6px 20px rgba(37,99,235,0.35);
        }
        .ebr-header-text h1 {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 4px;
          letter-spacing: -0.4px;
        }
        .ebr-header-text p {
          font-size: 13px;
          color: #94a3b8;
          margin: 0;
          font-weight: 400;
        }

        .ebr-id-badge {
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

        .ebr-hr { height: 1px; background: #f1f5f9; margin: 0 2rem; }

        .ebr-body { padding: 1.75rem 2rem 2rem; }

        .ebr-field { margin-bottom: 20px; }

        .ebr-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .ebr-label {
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
        }
        .ebr-char {
          font-size: 11px;
          color: #cbd5e1;
          font-weight: 500;
          transition: color 0.2s;
        }
        .ebr-char.active { color: #3b82f6; }

        .ebr-select, .ebr-input {
          width: 100%;
          padding: 14px 16px;
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
        .ebr-select { cursor: pointer; }
        .ebr-select:disabled { cursor: not-allowed; opacity: 0.6; }
        .ebr-input::placeholder { color: #c4cdd6; font-weight: 400; }
        .ebr-select:hover, .ebr-input:hover { border-color: #bfdbfe; background: #f0f6ff; }
        .ebr-select:focus, .ebr-input:focus {
          border-color: #3b82f6;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(59,130,246,0.1);
        }

        /* Skeleton loader */
        .ebr-skeleton {
          height: 50px;
          border-radius: 14px;
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: ebrShimmer 1.4s infinite;
        }
        @keyframes ebrShimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* Changed indicator */
        .ebr-changed {
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
          animation: ebrFadeIn 0.3s ease;
        }
        .ebr-unchanged {
          height: 1.5rem;
          margin-bottom: 1.5rem;
        }
        @keyframes ebrFadeIn {
          from { opacity:0; transform: translateY(-4px); }
          to   { opacity:1; transform: translateY(0); }
        }

        .ebr-btn {
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
        .ebr-btn::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 60%);
          pointer-events: none;
        }
        .ebr-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(37,99,235,0.45);
        }
        .ebr-btn:active:not(:disabled) { transform: translateY(0); }
        .ebr-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }

        .ebr-btn-cancel {
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
        .ebr-btn-cancel:hover { background: #f8fafc; color: #475569; border-color: #cbd5e1; }

        .ebr-spinner {
          width: 17px; height: 17px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Toast ── */
        .ebr-toast {
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
          animation: ebrToastIn 0.4s cubic-bezier(0.22,1,0.36,1) both;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        @keyframes ebrToastIn {
          from { opacity:0; transform:translateX(60px) scale(0.9); }
          to   { opacity:1; transform:translateX(0) scale(1); }
        }
        .ebr-toast-success { background:#f0fdf4; border:1px solid #bbf7d0; }
        .ebr-toast-error   { background:#fff1f2; border:1px solid #fecdd3; }
        .ebr-toast-warn    { background:#fffbeb; border:1px solid #fde68a; }
        .ebr-toast-icon {
          width:32px; height:32px; border-radius:10px;
          display:flex; align-items:center; justify-content:center;
          font-size:14px; font-weight:800; flex-shrink:0;
        }
        .ebr-toast-success .ebr-toast-icon { background:#dcfce7; color:#16a34a; }
        .ebr-toast-error   .ebr-toast-icon { background:#ffe4e6; color:#e11d48; }
        .ebr-toast-warn    .ebr-toast-icon { background:#fef9c3; color:#b45309; }
        .ebr-toast-content { flex:1; }
        .ebr-toast-title { font-size:13px; font-weight:700; margin:0 0 2px; }
        .ebr-toast-success .ebr-toast-title { color:#15803d; }
        .ebr-toast-error   .ebr-toast-title { color:#be123c; }
        .ebr-toast-warn    .ebr-toast-title { color:#92400e; }
        .ebr-toast-msg { font-size:12px; margin:0; font-weight:400; }
        .ebr-toast-success .ebr-toast-msg { color:#16a34a; }
        .ebr-toast-error   .ebr-toast-msg { color:#e11d48; }
        .ebr-toast-warn    .ebr-toast-msg { color:#b45309; }
        .ebr-toast-x {
          background:none; border:none; cursor:pointer;
          font-size:13px; opacity:0.4; transition:opacity 0.2s;
          flex-shrink:0; padding:2px;
        }
        .ebr-toast-x:hover { opacity:0.9; }
        .ebr-toast-progress {
          position:absolute; bottom:0; left:0;
          height:3px; border-radius:0 0 16px 16px;
          animation:ebrShrink 3.8s linear forwards;
        }
        .ebr-toast-success .ebr-toast-progress { background:#4ade80; }
        .ebr-toast-error   .ebr-toast-progress { background:#fb7185; }
        .ebr-toast-warn    .ebr-toast-progress { background:#fbbf24; }
        @keyframes ebrShrink {
          from { width:100%; } to { width:0%; }
        }
      `}</style>

      <ToastPortal toasts={toasts} remove={remove} />

      <div className="ebr-page">
        <div className="ebr-bg-ring ebr-bg-ring-1" />
        <div className="ebr-bg-ring ebr-bg-ring-2" />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="ebr-bg-dot" style={{
            top:  `${[15,25,70,80,40,60,10,90][i]}%`,
            left: `${[10,85,5,90,50,20,70,45][i]}%`,
          }} />
        ))}

        <div className="ebr-card">
          <div className="ebr-stripe" />

          <div className="ebr-header">
            <div className="ebr-icon-box">✏️</div>
            <div className="ebr-header-text">
              <h1>Edit Brand</h1>
              <p>Update the brand details below</p>
              <div className="ebr-id-badge">🔖 Brand ID: #{id}</div>
            </div>
          </div>

          <div className="ebr-hr" />

          <div className="ebr-body">

            {/* Category */}
            <div className="ebr-field">
              <div className="ebr-label-row">
                <span className="ebr-label">Category</span>
              </div>

              {fetching ? (
                <div className="ebr-skeleton" />
              ) : (
                <select
                  className="ebr-select"
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Subcategory */}
            <div className="ebr-field">
              <div className="ebr-label-row">
                <span className="ebr-label">Subcategory</span>
              </div>

              {fetching ? (
                <div className="ebr-skeleton" />
              ) : (
                <select
                  className="ebr-select"
                  value={selectedSubcategory}
                  onChange={(e) => setSelectedSubcategory(e.target.value)}
                  disabled={!selectedCategory || subLoading}
                >
                  <option value="">
                    {subLoading ? "Loading…" : "Select Subcategory"}
                  </option>
                  {subcategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Name */}
            <div className="ebr-field">
              <div className="ebr-label-row">
                <span className="ebr-label">Brand Name</span>
                <span className={`ebr-char ${charCount > 0 ? "active" : ""}`}>{charCount}/50</span>
              </div>

              {fetching ? (
                <div className="ebr-skeleton" />
              ) : (
                <input
                  type="text"
                  className="ebr-input"
                  placeholder="e.g. Samsung, Coca-Cola…"
                  value={name}
                  maxLength={50}
                  onChange={handleChange}
                  onKeyDown={e => e.key === "Enter" && handleUpdate()}
                />
              )}
            </div>

            {isDirty
              ? <div className="ebr-changed">⚡ You have unsaved changes</div>
              : <div className="ebr-unchanged" />
            }

            <button className="ebr-btn" onClick={handleUpdate} disabled={loading || fetching}>
              {loading
                ? <><div className="ebr-spinner" /> Updating…</>
                : <>💾 Update Brand</>
              }
            </button>

            <button className="ebr-btn-cancel" onClick={() => navigate("/brand")}>
              ← Back to Brands
            </button>
          </div>
        </div>
      </div>
    </>
  );
}