// import { useEffect, useState } from "react";
// import { useNavigate, useParams } from "react-router-dom";
// import api from "../../services/api";
// import Barcode from "react-barcode";

// /* ─── Toast Hook ─────────────────────────────────────────── */
// function useToast() {
//   const [toasts, setToasts] = useState([]);
//   const show = (type, title, msg) => {
//     const id = Date.now();
//     setToasts(p => [...p, { id, type, title, msg }]);
//     setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3600);
//   };
//   const remove = id => setToasts(p => p.filter(t => t.id !== id));
//   return { toasts, show, remove };
// }

// function ToastPortal({ toasts, remove }) {
//   return (
//     <div style={{ position:"fixed", top:22, right:22, zIndex:9999, display:"flex", flexDirection:"column", gap:9, pointerEvents:"none" }}>
//       {toasts.map(t => (
//         <div key={t.id} className={`ep-toast ep-toast-${t.type}`}>
//           <div className="ep-toast-icon">{t.type==="success"?"✓":t.type==="error"?"✕":"!"}</div>
//           <div className="ep-toast-body">
//             <p className="ep-toast-title">{t.title}</p>
//             {t.msg && <p className="ep-toast-msg">{t.msg}</p>}
//           </div>
//           <button className="ep-toast-x" style={{pointerEvents:"auto"}} onClick={()=>remove(t.id)}>✕</button>
//           <div className="ep-toast-bar" />
//         </div>
//       ))}
//     </div>
//   );
// }

// /* ─── Main Component ─────────────────────────────────────── */
// export default function EditProduct() {
//   const { id } = useParams();
//   const navigate = useNavigate();
//   const [categories, setCategories] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [fetching, setFetching] = useState(true);
//   const [gstEnabled, setGstEnabled] = useState(false);
//   const [gstLoading, setGstLoading] = useState(true);
//   const [barcodeKey, setBarcodeKey] = useState(0);
//   const { toasts, show, remove } = useToast();
// const [productCompanyId, setProductCompanyId] = useState("");


//   const [form, setForm] = useState({
//     name: "",  product_code: "", price: "", stock: "", gst: "", barcode: "", category_id: "", unit: ""
//   });

//   const set = (field, val) => setForm(p => ({ ...p, [field]: val }));

// const getCompanyId = () => {
//   const user = JSON.parse(localStorage.getItem("user"));
//   return Number(user?.company_id);
// };


//   const fetchCompanyGST = async () => {
//     setGstLoading(true);
//     try {
//       const company_id = getCompanyId();
//       if (!company_id) return;
//       const res = await api.post("/company/get_company_by_id", { id: company_id });
//       if (res.data.status) {
//         const company = res.data.data;
//         if (company.gst_type === "with_gst") {
//           setGstEnabled(true);
//         } else {
//           setGstEnabled(false);
//           set("gst", "");
//         }
//       }
//     } catch (err) {
//       console.error("GST fetch error:", err);
//       setGstEnabled(false);
//     } finally {
//       setGstLoading(false);
//     }
//   };

//   const fetchCompanyGSTByCompanyId = async(company_id) => {

//   try {

//     const res = await api.post(
//       "/company/get_company_by_id",
//       {
//         id: company_id
//       }
//     );

//     if(res.data.status){

//       const company = res.data.data;

//       setGstEnabled(
//         company.gst_type === "with_gst"
//       );

//     }

//   } catch(err){

//     console.log(err);

//   } finally {

//     setGstLoading(false);

//   }

// };

// const fetchProduct = async () => {

//   setFetching(true);

//   try {

//     const res = await api.get(
//       `/product/get_by_id?id=${id}`
//     );


//     if(res.data.status){


//    const p = res.data.data;

//    setProductCompanyId(p.company_id);

//    await fetchCategoriesByCompany(p.company_id);

//    await fetchCompanyGSTByCompanyId(p.company_id);

//       setForm({

//         name: p.product_name,
//         product_code: p.product_code || "",
//         price: p.price,
//         stock: p.stock,
//         gst: p.gst_percentage || "",
//         barcode: p.barcode || "",
//         category_id: String(p.category_id), // IMPORTANT
//         unit: p.unit || ""

//       });

//     }

//   } catch(err){

//     console.log(err);

//   } finally {

//     setFetching(false);

//   }

// };

// useEffect(() => {

//   fetchProduct();

// }, [id]);

// const fetchCategoriesByCompany = async(company_id) => {

//   try {

//     const res = await api.get(
//       `/category/get_all?company_id=${company_id}`
//     );

//     if(res.data.status){

//       setCategories(res.data.data);

//     }

//   } catch(err){

//     console.log(err);

//   }

// };

//   const generateBarcode = () => {
//     const code = "PRD" + Math.floor(100000 + Math.random() * 900000);
//     setForm(p => ({ ...p, barcode: code }));
//     setBarcodeKey(k => k + 1);
//   };

//   const handleUpdate = async () => {
//     if (!form.name.trim())    { show("warn", "Missing Field", "Product name is required."); return; }
//     if (!form.category_id)    { show("warn", "Missing Field", "Please select a category."); return; }
//     if (!form.price)          { show("warn", "Missing Field", "Price is required."); return; }
//     if (isNaN(Number(form.price)) || Number(form.price) < 0) { show("warn", "Invalid Price", "Please enter a valid price."); return; }
//     if (!form.stock)          { show("warn", "Missing Field", "Stock quantity is required."); return; }
//     if (isNaN(Number(form.stock)) || Number(form.stock) < 0) { show("warn", "Invalid Stock", "Please enter a valid stock quantity."); return; }
//     // if (!form.unit.trim())    { show("warn", "Missing Field", "Unit is required (e.g. kg, litre, piece)."); return; }
//     if (gstEnabled && !form.gst) { show("warn", "Missing Field", "GST percentage is required."); return; }
//     if (gstEnabled && (isNaN(Number(form.gst)) || Number(form.gst) < 0 || Number(form.gst) > 100)) {
//       show("warn", "Invalid GST", "Please enter a valid GST percentage (0–100).");
//       return;
//     }

//     setLoading(true);
//     try {
//       const res = await api.post("/product/update", {
//         id,
//         product_name: form.name,
//         product_code: form.product_code,
//         category_id: form.category_id,
// company_id: productCompanyId,
//         price: form.price,
//         stock: form.stock,
//         gst_percentage: gstEnabled ? form.gst : "",
//         barcode: form.barcode,
//         unit: form.unit
//       });
//       if (res.data.status) {
//         show("success", "Product Updated!", `"${form.name}" saved successfully.`);
//         setTimeout(() => navigate("/products"), 1800);
//       } else {
//         show("error", "Update Failed", res.data.message || "Something went wrong.");
//       }
//     } catch (err) {
//       console.error(err);
//       show("error", "Server Error", "Unable to reach server. Try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <>
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

//         .ep-page {
//           font-family: 'Plus Jakarta Sans', sans-serif;
//           min-height: 100vh; background: #eef2ff;
//           display: flex; align-items: flex-start; justify-content: center;
//           padding: 2.5rem 1.5rem; position: relative; overflow-x: hidden;
//         }
//         .ep-deco { position:fixed; pointer-events:none; border-radius:50%; filter:blur(70px); opacity:0.25; }
//         .ep-deco-1 { width:380px;height:380px;background:#3b82f6;top:-120px;right:-100px; }
//         .ep-deco-2 { width:260px;height:260px;background:#6366f1;bottom:-60px;left:-60px; }

//         .ep-card {
//           position:relative; width:100%; max-width:560px;
//           background:#fff; border-radius:26px; border:1px solid #e2e8f0;
//           box-shadow:0 8px 40px rgba(37,99,235,0.1), 0 2px 8px rgba(0,0,0,0.04);
//           overflow:hidden; animation:epUp 0.5s cubic-bezier(0.22,1,0.36,1) both;
//         }
//         @keyframes epUp{from{opacity:0;transform:translateY(28px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}

//         .ep-stripe {
//           height:4px;
//           background:linear-gradient(90deg,#1d4ed8,#6366f1,#3b82f6,#1d4ed8);
//           background-size:200%; animation:epStripe 3s linear infinite;
//         }
//         @keyframes epStripe{0%{background-position:0%}100%{background-position:200%}}

//         .ep-header {
//           background:linear-gradient(135deg,#1e40af 0%,#2563eb 55%,#3b82f6 100%);
//           padding:1.75rem 2rem; display:flex; align-items:center; gap:1rem;
//           position:relative; overflow:hidden;
//         }
//         .ep-header::before {
//           content:''; position:absolute; top:-50px; right:-50px;
//           width:180px; height:180px; border-radius:50%; background:rgba(255,255,255,0.07);
//         }
//         .ep-header::after {
//           content:''; position:absolute; bottom:-30px; left:25%;
//           width:220px; height:80px; border-radius:50%; background:rgba(255,255,255,0.05);
//         }
//         .ep-header-icon {
//           width:52px; height:52px; border-radius:16px;
//           background:rgba(255,255,255,0.18); border:1.5px solid rgba(255,255,255,0.3);
//           display:flex; align-items:center; justify-content:center;
//           font-size:22px; flex-shrink:0; position:relative; z-index:1;
//         }
//         .ep-header-text { position:relative; z-index:1; }
//         .ep-header-text h1 { font-size:20px; font-weight:800; color:#fff; margin:0 0 3px; letter-spacing:-0.3px; }
//         .ep-header-text p  { font-size:12.5px; color:rgba(255,255,255,0.7); margin:0; }

//         .ep-id-chip {
//           position:relative; z-index:1; margin-top:1rem;
//           display:inline-flex; align-items:center; gap:5px;
//           background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.25);
//           border-radius:100px; padding:4px 12px 4px 8px;
//           font-size:11.5px; font-weight:600; color:rgba(255,255,255,0.9);
//         }
//         .ep-id-dot { width:6px;height:6px;border-radius:50%;background:#4ade80;box-shadow:0 0 6px #4ade80; }

//         .ep-body { padding:2rem; }

//         .ep-section {
//           font-size:10.5px; font-weight:800;
//           text-transform:uppercase; letter-spacing:0.1em;
//           color:#3b82f6; margin:0 0 12px;
//           display:flex; align-items:center; gap:8px;
//         }
//         .ep-section::after { content:''; flex:1; height:1px; background:#e8f0fe; }

//         .ep-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px; }
//         .ep-field  { margin-bottom:12px; }

//         .ep-label {
//           display:block; font-size:11px; font-weight:700;
//           text-transform:uppercase; letter-spacing:0.07em;
//           color:#94a3b8; margin-bottom:6px;
//         }

//         /* Skeleton */
//         .ep-skel {
//           height:46px; border-radius:12px;
//           background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);
//           background-size:200% 100%; animation:epSkel 1.4s ease infinite;
//         }
//         @keyframes epSkel{0%{background-position:200%}100%{background-position:-200%}}

//         .ep-input, .ep-select {
//           width:100%; padding:12px 14px 12px 42px;
//           border-radius:12px; border:1.5px solid #e2e8f0;
//           background:#f8faff; font-family:'Plus Jakarta Sans',sans-serif;
//           font-size:14px; font-weight:500; color:#1e293b;
//           outline:none; box-sizing:border-box; transition:all 0.22s; appearance:none;
//         }
//         .ep-input::placeholder { color:#c4cdd6; font-weight:400; }
//         .ep-input:hover,.ep-select:hover { border-color:#bfdbfe; background:#f0f6ff; }
//         .ep-input:focus,.ep-select:focus {
//           border-color:#3b82f6; background:#fff;
//           box-shadow:0 0 0 4px rgba(59,130,246,0.1);
//         }
//         .ep-input-wrap  { position:relative; }
//         .ep-input-icon  {
//           position:absolute; left:13px; top:50%;
//           transform:translateY(-50%); font-size:15px;
//           pointer-events:none; transition:transform 0.2s;
//         }
//         .ep-input-wrap:focus-within .ep-input-icon { transform:translateY(-50%) scale(1.15); }

//         .ep-select-wrap { position:relative; }
//         .ep-select-arrow {
//           position:absolute; right:14px; top:50%;
//           transform:translateY(-50%); pointer-events:none; font-size:11px; color:#94a3b8;
//         }
//         .ep-select { padding-right:36px; }

//         .ep-prefix {
//           position:absolute; left:0; top:0; bottom:0;
//           width:42px; display:flex; align-items:center; justify-content:center;
//           border-right:1.5px solid #e2e8f0; border-radius:12px 0 0 12px;
//           background:#f1f5f9; font-size:13px; font-weight:700;
//           color:#64748b; pointer-events:none; transition:all 0.22s;
//         }
//         .ep-input-wrap:focus-within .ep-prefix { border-right-color:#bfdbfe; background:#eff6ff; color:#3b82f6; }

//         /* GST disabled notice */
//         .ep-gst-disabled {
//           display:flex; align-items:center; gap:8px;
//           padding:10px 14px; border-radius:12px;
//           background:#f8faff; border:1.5px dashed #e2e8f0;
//           font-size:12.5px; color:#94a3b8; font-weight:500;
//         }

//         /* GST badge */
//         .ep-gst-badge {
//           display:inline-flex; align-items:center; gap:5px;
//           padding:3px 10px; border-radius:100px;
//           font-size:10.5px; font-weight:700; margin-left:8px;
//         }
//         .ep-gst-badge.on  { background:#dcfce7; color:#15803d; border:1px solid #bbf7d0; }
//         .ep-gst-badge.off { background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; }

//         .ep-divider { height:1px; background:#f1f5f9; margin:1.5rem 0; }

//         .ep-barcode-row { display:flex; gap:10px; margin-bottom:14px; align-items:flex-end; }
//         .ep-barcode-iw  { flex:1; }
//         .ep-gen-btn {
//           padding:12px 18px; border-radius:12px; border:none;
//           cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif;
//           font-size:12.5px; font-weight:700; white-space:nowrap;
//           background:linear-gradient(135deg,#6366f1,#818cf8);
//           color:#fff; box-shadow:0 4px 14px rgba(99,102,241,0.35);
//           transition:all 0.2s;
//         }
//         .ep-gen-btn:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(99,102,241,0.45); }

//         .ep-barcode-preview {
//           background:#f8faff; border-radius:14px; border:1.5px solid #e2e8f0;
//           padding:16px; text-align:center; animation:epBarIn 0.3s ease both;
//         }
//         @keyframes epBarIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
//         .ep-barcode-label {
//           font-size:10.5px; font-weight:700;
//           text-transform:uppercase; letter-spacing:0.08em;
//           color:#94a3b8; margin-bottom:8px;
//         }

//         .ep-submit {
//           width:100%; padding:15px; border-radius:14px; border:none; cursor:pointer;
//           font-family:'Plus Jakarta Sans',sans-serif; font-size:15px; font-weight:800;
//           background:linear-gradient(135deg,#1e40af 0%,#2563eb 55%,#3b82f6 100%);
//           color:#fff; box-shadow:0 4px 18px rgba(37,99,235,0.38);
//           position:relative; overflow:hidden;
//           display:flex; align-items:center; justify-content:center; gap:8px;
//           transition:all 0.25s;
//         }
//         .ep-submit::after {
//           content:''; position:absolute; inset:0;
//           background:linear-gradient(180deg,rgba(255,255,255,0.12) 0%,transparent 60%);
//           pointer-events:none;
//         }
//         .ep-submit:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 10px 28px rgba(37,99,235,0.45); }
//         .ep-submit:active:not(:disabled){ transform:translateY(0); }
//         .ep-submit:disabled { opacity:0.6; cursor:not-allowed; }

//         .ep-cancel {
//           width:100%; margin-top:10px; padding:12px;
//           border-radius:12px; border:1.5px solid #e2e8f0;
//           background:transparent; font-family:'Plus Jakarta Sans',sans-serif;
//           font-size:13.5px; font-weight:600; color:#94a3b8;
//           cursor:pointer; transition:all 0.2s;
//         }
//         .ep-cancel:hover { background:#f8fafc; color:#475569; border-color:#cbd5e1; }

//         .ep-spinner {
//           width:17px;height:17px;
//           border:2.5px solid rgba(255,255,255,0.3);
//           border-top-color:#fff; border-radius:50%;
//           animation:spin 0.7s linear infinite; flex-shrink:0;
//         }
//         @keyframes spin{to{transform:rotate(360deg)}}

//         /* GST field animation */
//         .ep-gst-field { animation:epFadeIn 0.3s ease both; }
//         @keyframes epFadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}

//         /* ── Toast ── */
//         .ep-toast {
//           pointer-events:auto; display:flex; align-items:center; gap:11px;
//           min-width:280px; max-width:360px; padding:12px 15px; border-radius:15px;
//           position:relative; overflow:hidden; box-shadow:0 8px 28px rgba(0,0,0,0.12);
//           animation:epToastIn 0.4s cubic-bezier(0.22,1,0.36,1) both;
//           font-family:'Plus Jakarta Sans',sans-serif;
//         }
//         @keyframes epToastIn{from{opacity:0;transform:translateX(60px) scale(0.9)}to{opacity:1;transform:translateX(0) scale(1)}}
//         .ep-toast-success{background:#f0fdf4;border:1px solid #bbf7d0;}
//         .ep-toast-error  {background:#fff1f2;border:1px solid #fecdd3;}
//         .ep-toast-warn   {background:#fffbeb;border:1px solid #fde68a;}
//         .ep-toast-icon{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;flex-shrink:0;}
//         .ep-toast-success .ep-toast-icon{background:#dcfce7;color:#16a34a;}
//         .ep-toast-error   .ep-toast-icon{background:#ffe4e6;color:#e11d48;}
//         .ep-toast-warn    .ep-toast-icon{background:#fef9c3;color:#b45309;}
//         .ep-toast-body{flex:1;}
//         .ep-toast-title{font-size:13px;font-weight:700;margin:0 0 2px;}
//         .ep-toast-success .ep-toast-title{color:#15803d;}
//         .ep-toast-error   .ep-toast-title{color:#be123c;}
//         .ep-toast-warn    .ep-toast-title{color:#92400e;}
//         .ep-toast-msg{font-size:12px;margin:0;}
//         .ep-toast-success .ep-toast-msg{color:#16a34a;}
//         .ep-toast-error   .ep-toast-msg{color:#e11d48;}
//         .ep-toast-warn    .ep-toast-msg{color:#b45309;}
//         .ep-toast-x{background:none;border:none;cursor:pointer;font-size:12px;opacity:0.4;transition:opacity 0.2s;flex-shrink:0;padding:2px;}
//         .ep-toast-x:hover{opacity:0.9;}
//         .ep-toast-bar{position:absolute;bottom:0;left:0;height:3px;animation:epShrink 3.6s linear forwards;}
//         .ep-toast-success .ep-toast-bar{background:#4ade80;}
//         .ep-toast-error   .ep-toast-bar{background:#fb7185;}
//         .ep-toast-warn    .ep-toast-bar{background:#fbbf24;}
//         @keyframes epShrink{from{width:100%}to{width:0%}}
//       `}</style>

//       <ToastPortal toasts={toasts} remove={remove} />

//       <div className="ep-page">
//         <div className="ep-deco ep-deco-1" />
//         <div className="ep-deco ep-deco-2" />

//         <div className="ep-card">
//           <div className="ep-stripe" />

//           {/* Header */}
//           <div className="ep-header">
//             <div className="ep-header-icon">✏️</div>
//             <div className="ep-header-text">
//               <h1>Edit Product</h1>
//               <p>Update product details below</p>
//               <div className="ep-id-chip">
//                 <span className="ep-id-dot" />
//                 Product ID: #{id}
//               </div>
//             </div>
//           </div>

//           <div className="ep-body">

//             {/* ── Basic Info ── */}
//             <p className="ep-section">Basic Info</p>

            

//             <div className="ep-field">
//               <label className="ep-label">Product Name <span style={{color:"#ef4444"}}>*</span></label>
//               {fetching
//                 ? <div className="ep-skel" />
//                 : <div className="ep-input-wrap">
//                     <span className="ep-input-icon">🏷️</span>
//                     <input className="ep-input" placeholder="Product name"
//                       value={form.name}
//                       onChange={e => set("name", e.target.value)} />
//                   </div>
//               }
//             </div>

//             <div className="ep-field">
//   <label className="ep-label">
//     Product Code
//   </label>

//   <div className="ep-input-wrap">
//     <span className="ep-input-icon">🔢</span>

//     <input
//       className="ep-input"
//       placeholder="e.g. PRD001"
//       value={form.product_code}
//       onChange={e =>
//         set("product_code", e.target.value)
//       }
//     />
//   </div>
// </div>


//             <div className="ep-field">
//               <label className="ep-label">Category <span style={{color:"#ef4444"}}>*</span></label>
//               {fetching
//                 ? <div className="ep-skel" />
//                 : <div className="ep-select-wrap ep-input-wrap">
//                     <span className="ep-input-icon">🗂️</span>
//                     <select className="ep-select"
//                       value={form.category_id}
//                       onChange={e => set("category_id", e.target.value)}>
//                       <option value="">Select a category…</option>
//                       {categories.map(c => (
//                         <option key={c.id} value={c.id}>{c.name}</option>
//                       ))}
//                     </select>
//                     <span className="ep-select-arrow">▾</span>
//                   </div>
//               }
//             </div>

//             {/* ── Pricing & Stock ── */}
//             <p className="ep-section" style={{marginTop:"1.25rem"}}>Pricing & Stock</p>

//             <div className="ep-grid-2">
//               <div>
//                 <label className="ep-label">Price (₹) <span style={{color:"#ef4444"}}>*</span></label>
//                 {fetching
//                   ? <div className="ep-skel" />
//                   : <div className="ep-input-wrap">
//                       <span className="ep-prefix">₹</span>
//                       <input type="number" className="ep-input" placeholder="0.00"
//                         value={form.price}
//                         onChange={e => set("price", e.target.value)} />
//                     </div>
//                 }
//               </div>
//               <div>
//                 <label className="ep-label">Stock Qty <span style={{color:"#ef4444"}}>*</span></label>
//                 {fetching
//                   ? <div className="ep-skel" />
//                   : <div className="ep-input-wrap">
//                       <span className="ep-input-icon">📦</span>
//                       <input type="number" className="ep-input" placeholder="0"
//                         value={form.stock}
//                         onChange={e => set("stock", e.target.value)} />
//                     </div>
//                 }
//               </div>
//             </div>

//             {/* <div className="ep-field">
//               <label className="ep-label">Unit <span style={{color:"#ef4444"}}>*</span></label>
//               {fetching
//                 ? <div className="ep-skel" />
//                 : <div className="ep-input-wrap">
//                     <span className="ep-input-icon">📏</span>
//                     <input
//                       className="ep-input"
//                       placeholder="e.g. kg / litre / piece"
//                       value={form.unit}
//                       onChange={e => set("unit", e.target.value)}
//                     />
//                   </div>
//               }
//             </div> */}

//             {/* ── GST (conditional) ── */}
//             <div className="ep-field">
//               <label className="ep-label">
//                 GST
//                 {!gstLoading && (
//                   <span className={`ep-gst-badge ${gstEnabled ? "on" : "off"}`}>
//                     {gstEnabled ? "✓ Enabled" : "✕ Disabled"}
//                   </span>
//                 )}
//               </label>

//               {(gstLoading || fetching) ? (
//                 <div className="ep-skel" />
//               ) : gstEnabled ? (
//                 <div className="ep-input-wrap ep-gst-field">
//                   <span className="ep-input-icon" style={{fontWeight:700, fontSize:13, color:"#64748b"}}>%</span>
//                   <input
//                     type="number"
//                     className="ep-input"
//                     placeholder="Enter GST % (e.g. 18)"
//                     value={form.gst}
//                     min="0"
//                     max="100"
//                     onChange={e => set("gst", e.target.value)}
//                   />
//                 </div>
//               ) : (
//                 <div className="ep-gst-disabled">
//                   <span>🚫</span>
//                   <span>GST not applicable for this company (without GST plan)</span>
//                 </div>
//               )}
//             </div>

//             {/* ── Barcode ── */}
//             <div className="ep-divider" />
//             <p className="ep-section">Barcode</p>

//             <div className="ep-barcode-row">
//               <div className="ep-barcode-iw">
//                 <label className="ep-label">Barcode Number</label>
//                 <div className="ep-input-wrap">
//                   <span className="ep-input-icon">｜｜</span>
//                   <input className="ep-input" placeholder="Enter or auto-generate"
//                     value={form.barcode}
//                     onChange={e => { set("barcode", e.target.value); setBarcodeKey(k=>k+1); }} />
//                 </div>
//               </div>
//               <button className="ep-gen-btn" onClick={generateBarcode}>⚡ Auto</button>
//             </div>

//             {form.barcode && (
//               <div className="ep-barcode-preview" key={barcodeKey}>
//                 <p className="ep-barcode-label">Barcode Preview</p>
//                 <Barcode value={form.barcode} height={55} fontSize={13} margin={0} />
//               </div>
//             )}

//             <div className="ep-divider" />

//             <button className="ep-submit" onClick={handleUpdate} disabled={loading || fetching || gstLoading}>
//               {loading
//                 ? <><div className="ep-spinner" /> Updating…</>
//                 : <>💾 Update Product</>
//               }
//             </button>
//             <button className="ep-cancel" onClick={() => navigate("/products")}>
//               Cancel
//             </button>

//           </div>
//         </div>
//       </div>
//     </>
//   );
// }



import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import Barcode from "react-barcode";

/* ─── Toast Hook ─────────────────────────────────────────── */
function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = (type, title, msg) => {
    const id = Date.now();
    setToasts(p => [...p, { id, type, title, msg }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3600);
  };
  const remove = id => setToasts(p => p.filter(t => t.id !== id));
  return { toasts, show, remove };
}

function ToastPortal({ toasts, remove }) {
  return (
    <div style={{ position:"fixed", top:22, right:22, zIndex:9999, display:"flex", flexDirection:"column", gap:9, pointerEvents:"none" }}>
      {toasts.map(t => (
        <div key={t.id} className={`ep-toast ep-toast-${t.type}`}>
          <div className="ep-toast-icon">{t.type==="success"?"✓":t.type==="error"?"✕":"!"}</div>
          <div className="ep-toast-body">
            <p className="ep-toast-title">{t.title}</p>
            {t.msg && <p className="ep-toast-msg">{t.msg}</p>}
          </div>
          <button className="ep-toast-x" style={{pointerEvents:"auto"}} onClick={()=>remove(t.id)}>✕</button>
          <div className="ep-toast-bar" />
        </div>
      ))}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");

  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstLoading, setGstLoading] = useState(true);
  const [barcodeKey, setBarcodeKey] = useState(0);
  const { toasts, show, remove } = useToast();

  const [form, setForm] = useState({
    name: "",
    product_code: "",
    price: "",
    stock: "",
    gst: "",
    barcode: "",
    category_id: "",
    subcategory_id: "",
    brand_id: "",
    supplier_id: "",
    unit: ""
  });

  const set = (field, val) => setForm(p => ({ ...p, [field]: val }));

  /* ── Load companies (for the dropdown, same as ProductForm) ── */
  useEffect(() => {

    const user = JSON.parse(localStorage.getItem("user"));
    if (!user?.id) return;

    loadCompanies(user.id);

  }, []);

  const loadCompanies = async (admin_id) => {

    try {

      const res = await api.get(
        `/company/get_companies_by_admin?admin_id=${admin_id}`
      );

      if (res.data.status) {
        setCompanies(res.data.data);
      }

    } catch (err) {
      console.log(err);
    }

  };

  /* ── GST ── */
  const fetchCompanyGSTByCompanyId = async (company_id) => {

    setGstLoading(true);

    try {

      const res = await api.post(
        "/company/get_company_by_id",
        { id: company_id }
      );

      if (res.data.status) {
        const company = res.data.data;
        setGstEnabled(company.gst_type === "with_gst");
      }

    } catch (err) {
      console.log(err);
    } finally {
      setGstLoading(false);
    }

  };

  /* ── Category / Subcategory / Brand (same pattern as ProductForm) ── */
  const fetchCategories = async (company_id) => {

    try {

      if (!company_id) {
        setCategories([]);
        return;
      }

      const res = await api.get(
        `/category/get_active_category?company_id=${company_id}`
      );

      if (res.data.status) {
        setCategories(res.data.data);
      } else {
        setCategories([]);
      }

    } catch (err) {
      console.log(err);
      setCategories([]);
    }

  };

  const fetchSubCategories = async (company_id, category_id) => {

    if (!category_id) {
      setSubCategories([]);
      return;
    }

    try {

      const res = await api.get(
        `/subcategory/get_active_subcategory?company_id=${company_id}&category_id=${category_id}`
      );

      if (res.data.status) {
        setSubCategories(res.data.data);
      } else {
        setSubCategories([]);
      }

    } catch (err) {
      console.log(err);
    }

  };


  const fetchSuppliers = async (company_id) => {

  if (!company_id) {
    setSuppliers([]);
    return;
  }

  try {

    const res = await api.get(
      `/supplier/get_all?company_id=${company_id}`
    );

    if (res.data.status) {
      setSuppliers(res.data.data);
    } else {
      setSuppliers([]);
    }

  } catch (err) {
    console.log(err);
    setSuppliers([]);
  }

};
  
  const fetchBrands = async (company_id, category_id, subcategory_id) => {

    if (!company_id || !category_id || !subcategory_id) {
      setBrands([]);
      return;
    }

    try {

      const res = await api.get(
        `/brand/get_active_brand?company_id=${company_id}&category_id=${category_id}&subcategory_id=${subcategory_id}`
      );

      if (res.data.status) {
        setBrands(res.data.data);
      } else {
        setBrands([]);
      }

    } catch (err) {
      console.log(err);
      setBrands([]);
    }

  };

  /* ── Load existing product & prefill everything ── */
  const fetchProduct = async () => {

    setFetching(true);

    try {

      const res = await api.get(
        `/product/get_by_id?id=${id}`
      );

      if (res.data.status) {

        const p = res.data.data;

        setSelectedCompany(p.company_id);
        localStorage.setItem("selected_company_id", p.company_id);

        // load dropdown source data for this product's company
        await fetchCategories(p.company_id);
        await fetchCompanyGSTByCompanyId(p.company_id);
        await fetchSuppliers(p.company_id);

        if (p.category_id) {
          await fetchSubCategories(p.company_id, p.category_id);
        }

        if (p.category_id && p.subcategory_id) {
          await fetchBrands(p.company_id, p.category_id, p.subcategory_id);
        }

        setForm({
          name: p.product_name,
          product_code: p.product_code || "",
          price: p.price,
          stock: p.stock,
          gst: p.gst_percentage || "",
          barcode: p.barcode || "",
          category_id: p.category_id ? String(p.category_id) : "",
          subcategory_id: p.subcategory_id ? String(p.subcategory_id) : "",
          brand_id: p.brand_id ? String(p.brand_id) : "",
          supplier_id: p.supplier_id ? String(p.supplier_id) : "",
          unit: p.unit || ""
        });

      }

    } catch (err) {
      console.log(err);
    } finally {
      setFetching(false);
    }

  };

  useEffect(() => {
    fetchProduct();
  }, [id]);

  /* ── Company change (same behaviour as ProductForm) ── */
 const handleCompanyChange = (e) => {

  const companyId = e.target.value;

  setSelectedCompany(companyId);
  localStorage.setItem("selected_company_id", companyId);

  setForm(prev => ({
    ...prev,
    category_id: "",
    subcategory_id: "",
    brand_id: "",
    supplier_id: ""
  }));

  fetchCategories(companyId);
  fetchCompanyGSTByCompanyId(companyId);
  fetchSuppliers(companyId);
  setSubCategories([]);
  setBrands([]);

};
  const generateBarcode = () => {
    const code = "PRD" + Math.floor(100000 + Math.random() * 900000);
    setForm(p => ({ ...p, barcode: code }));
    setBarcodeKey(k => k + 1);
  };

  const handleUpdate = async () => {
    if (!form.name.trim())    { show("warn", "Missing Field", "Product name is required."); return; }
    if (!form.category_id)    { show("warn", "Missing Field", "Please select a category."); return; }
    if (!form.subcategory_id) { show("warn", "Missing Field", "Please select a sub category."); return; }
    if (!form.brand_id)          { show("warn", "Missing Field", "Please select a brand."); return; }

    if (!form.price)          { show("warn", "Missing Field", "Price is required."); return; }
    if (isNaN(Number(form.price)) || Number(form.price) < 0) { show("warn", "Invalid Price", "Please enter a valid price."); return; }
    if (!form.stock)          { show("warn", "Missing Field", "Stock quantity is required."); return; }
    if (isNaN(Number(form.stock)) || Number(form.stock) < 0) { show("warn", "Invalid Stock", "Please enter a valid stock quantity."); return; }
    if (!form.unit.trim())    { show("warn", "Missing Field", "Unit is required (e.g. kg, litre, piece)."); return; }
    if (gstEnabled && !form.gst) { show("warn", "Missing Field", "GST percentage is required."); return; }
    if (gstEnabled && (isNaN(Number(form.gst)) || Number(form.gst) < 0 || Number(form.gst) > 100)) {
      show("warn", "Invalid GST", "Please enter a valid GST percentage (0–100).");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/product/update", {
        id,
        product_name: form.name,
        product_code: form.product_code,
        category_id: form.category_id,
        subcategory_id: form.subcategory_id,
        brand_id: form.brand_id,
         supplier_id: form.supplier_id,
        company_id: selectedCompany,
        price: form.price,
        stock: form.stock,
        gst_percentage: gstEnabled ? form.gst : "",
        barcode: form.barcode,
        unit: form.unit
      });
      if (res.data.status) {
        show("success", "Product Updated!", `"${form.name}" saved successfully.`);
        setTimeout(() => navigate("/products"), 1800);
      } else {
        show("error", "Update Failed", res.data.message || "Something went wrong.");
      }
    } catch (err) {
      console.error(err);
      show("error", "Server Error", "Unable to reach server. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .ep-page {
          font-family: 'Plus Jakarta Sans', sans-serif;
          min-height: 100vh; background: #eef2ff;
          display: flex; align-items: flex-start; justify-content: center;
          padding: 2.5rem 1.5rem; position: relative; overflow-x: hidden;
        }
        .ep-deco { position:fixed; pointer-events:none; border-radius:50%; filter:blur(70px); opacity:0.25; }
        .ep-deco-1 { width:380px;height:380px;background:#3b82f6;top:-120px;right:-100px; }
        .ep-deco-2 { width:260px;height:260px;background:#6366f1;bottom:-60px;left:-60px; }

        .ep-card {
          position:relative; width:100%; max-width:560px;
          background:#fff; border-radius:26px; border:1px solid #e2e8f0;
          box-shadow:0 8px 40px rgba(37,99,235,0.1), 0 2px 8px rgba(0,0,0,0.04);
          overflow:hidden; animation:epUp 0.5s cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes epUp{from{opacity:0;transform:translateY(28px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}

        .ep-stripe {
          height:4px;
          background:linear-gradient(90deg,#1d4ed8,#6366f1,#3b82f6,#1d4ed8);
          background-size:200%; animation:epStripe 3s linear infinite;
        }
        @keyframes epStripe{0%{background-position:0%}100%{background-position:200%}}

        .ep-header {
          background:linear-gradient(135deg,#1e40af 0%,#2563eb 55%,#3b82f6 100%);
          padding:1.75rem 2rem; display:flex; align-items:center; gap:1rem;
          position:relative; overflow:hidden;
        }
        .ep-header::before {
          content:''; position:absolute; top:-50px; right:-50px;
          width:180px; height:180px; border-radius:50%; background:rgba(255,255,255,0.07);
        }
        .ep-header::after {
          content:''; position:absolute; bottom:-30px; left:25%;
          width:220px; height:80px; border-radius:50%; background:rgba(255,255,255,0.05);
        }
        .ep-header-icon {
          width:52px; height:52px; border-radius:16px;
          background:rgba(255,255,255,0.18); border:1.5px solid rgba(255,255,255,0.3);
          display:flex; align-items:center; justify-content:center;
          font-size:22px; flex-shrink:0; position:relative; z-index:1;
        }
        .ep-header-text { position:relative; z-index:1; }
        .ep-header-text h1 { font-size:20px; font-weight:800; color:#fff; margin:0 0 3px; letter-spacing:-0.3px; }
        .ep-header-text p  { font-size:12.5px; color:rgba(255,255,255,0.7); margin:0; }

        .ep-id-chip {
          position:relative; z-index:1; margin-top:1rem;
          display:inline-flex; align-items:center; gap:5px;
          background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.25);
          border-radius:100px; padding:4px 12px 4px 8px;
          font-size:11.5px; font-weight:600; color:rgba(255,255,255,0.9);
        }
        .ep-id-dot { width:6px;height:6px;border-radius:50%;background:#4ade80;box-shadow:0 0 6px #4ade80; }

        .ep-body { padding:2rem; }

        .ep-section {
          font-size:10.5px; font-weight:800;
          text-transform:uppercase; letter-spacing:0.1em;
          color:#3b82f6; margin:0 0 12px;
          display:flex; align-items:center; gap:8px;
        }
        .ep-section::after { content:''; flex:1; height:1px; background:#e8f0fe; }

        .ep-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px; }
        .ep-field  { margin-bottom:12px; }

        .ep-label {
          display:block; font-size:11px; font-weight:700;
          text-transform:uppercase; letter-spacing:0.07em;
          color:#94a3b8; margin-bottom:6px;
        }

        /* Skeleton */
        .ep-skel {
          height:46px; border-radius:12px;
          background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);
          background-size:200% 100%; animation:epSkel 1.4s ease infinite;
        }
        @keyframes epSkel{0%{background-position:200%}100%{background-position:-200%}}

        .ep-input, .ep-select {
          width:100%; padding:12px 14px 12px 42px;
          border-radius:12px; border:1.5px solid #e2e8f0;
          background:#f8faff; font-family:'Plus Jakarta Sans',sans-serif;
          font-size:14px; font-weight:500; color:#1e293b;
          outline:none; box-sizing:border-box; transition:all 0.22s; appearance:none;
        }
        .ep-input::placeholder { color:#c4cdd6; font-weight:400; }
        .ep-input:hover,.ep-select:hover { border-color:#bfdbfe; background:#f0f6ff; }
        .ep-input:focus,.ep-select:focus {
          border-color:#3b82f6; background:#fff;
          box-shadow:0 0 0 4px rgba(59,130,246,0.1);
        }
        .ep-input-wrap  { position:relative; }
        .ep-input-icon  {
          position:absolute; left:13px; top:50%;
          transform:translateY(-50%); font-size:15px;
          pointer-events:none; transition:transform 0.2s;
        }
        .ep-input-wrap:focus-within .ep-input-icon { transform:translateY(-50%) scale(1.15); }

        .ep-select-wrap { position:relative; }
        .ep-select-arrow {
          position:absolute; right:14px; top:50%;
          transform:translateY(-50%); pointer-events:none; font-size:11px; color:#94a3b8;
        }
        .ep-select { padding-right:36px; }

        .ep-prefix {
          position:absolute; left:0; top:0; bottom:0;
          width:42px; display:flex; align-items:center; justify-content:center;
          border-right:1.5px solid #e2e8f0; border-radius:12px 0 0 12px;
          background:#f1f5f9; font-size:13px; font-weight:700;
          color:#64748b; pointer-events:none; transition:all 0.22s;
        }
        .ep-input-wrap:focus-within .ep-prefix { border-right-color:#bfdbfe; background:#eff6ff; color:#3b82f6; }

        /* GST disabled notice */
        .ep-gst-disabled {
          display:flex; align-items:center; gap:8px;
          padding:10px 14px; border-radius:12px;
          background:#f8faff; border:1.5px dashed #e2e8f0;
          font-size:12.5px; color:#94a3b8; font-weight:500;
        }

        /* GST badge */
        .ep-gst-badge {
          display:inline-flex; align-items:center; gap:5px;
          padding:3px 10px; border-radius:100px;
          font-size:10.5px; font-weight:700; margin-left:8px;
        }
        .ep-gst-badge.on  { background:#dcfce7; color:#15803d; border:1px solid #bbf7d0; }
        .ep-gst-badge.off { background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; }

        .ep-divider { height:1px; background:#f1f5f9; margin:1.5rem 0; }

        .ep-barcode-row { display:flex; gap:10px; margin-bottom:14px; align-items:flex-end; }
        .ep-barcode-iw  { flex:1; }
        .ep-gen-btn {
          padding:12px 18px; border-radius:12px; border:none;
          cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif;
          font-size:12.5px; font-weight:700; white-space:nowrap;
          background:linear-gradient(135deg,#6366f1,#818cf8);
          color:#fff; box-shadow:0 4px 14px rgba(99,102,241,0.35);
          transition:all 0.2s;
        }
        .ep-gen-btn:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(99,102,241,0.45); }

        .ep-barcode-preview {
          background:#f8faff; border-radius:14px; border:1.5px solid #e2e8f0;
          padding:16px; text-align:center; animation:epBarIn 0.3s ease both;
        }
        @keyframes epBarIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
        .ep-barcode-label {
          font-size:10.5px; font-weight:700;
          text-transform:uppercase; letter-spacing:0.08em;
          color:#94a3b8; margin-bottom:8px;
        }

        .ep-submit {
          width:100%; padding:15px; border-radius:14px; border:none; cursor:pointer;
          font-family:'Plus Jakarta Sans',sans-serif; font-size:15px; font-weight:800;
          background:linear-gradient(135deg,#1e40af 0%,#2563eb 55%,#3b82f6 100%);
          color:#fff; box-shadow:0 4px 18px rgba(37,99,235,0.38);
          position:relative; overflow:hidden;
          display:flex; align-items:center; justify-content:center; gap:8px;
          transition:all 0.25s;
        }
        .ep-submit::after {
          content:''; position:absolute; inset:0;
          background:linear-gradient(180deg,rgba(255,255,255,0.12) 0%,transparent 60%);
          pointer-events:none;
        }
        .ep-submit:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 10px 28px rgba(37,99,235,0.45); }
        .ep-submit:active:not(:disabled){ transform:translateY(0); }
        .ep-submit:disabled { opacity:0.6; cursor:not-allowed; }

        .ep-cancel {
          width:100%; margin-top:10px; padding:12px;
          border-radius:12px; border:1.5px solid #e2e8f0;
          background:transparent; font-family:'Plus Jakarta Sans',sans-serif;
          font-size:13.5px; font-weight:600; color:#94a3b8;
          cursor:pointer; transition:all 0.2s;
        }
        .ep-cancel:hover { background:#f8fafc; color:#475569; border-color:#cbd5e1; }

        .ep-spinner {
          width:17px;height:17px;
          border:2.5px solid rgba(255,255,255,0.3);
          border-top-color:#fff; border-radius:50%;
          animation:spin 0.7s linear infinite; flex-shrink:0;
        }
        @keyframes spin{to{transform:rotate(360deg)}}

        /* GST field animation */
        .ep-gst-field { animation:epFadeIn 0.3s ease both; }
        @keyframes epFadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}

        /* ── Toast ── */
        .ep-toast {
          pointer-events:auto; display:flex; align-items:center; gap:11px;
          min-width:280px; max-width:360px; padding:12px 15px; border-radius:15px;
          position:relative; overflow:hidden; box-shadow:0 8px 28px rgba(0,0,0,0.12);
          animation:epToastIn 0.4s cubic-bezier(0.22,1,0.36,1) both;
          font-family:'Plus Jakarta Sans',sans-serif;
        }
        @keyframes epToastIn{from{opacity:0;transform:translateX(60px) scale(0.9)}to{opacity:1;transform:translateX(0) scale(1)}}
        .ep-toast-success{background:#f0fdf4;border:1px solid #bbf7d0;}
        .ep-toast-error  {background:#fff1f2;border:1px solid #fecdd3;}
        .ep-toast-warn   {background:#fffbeb;border:1px solid #fde68a;}
        .ep-toast-icon{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;flex-shrink:0;}
        .ep-toast-success .ep-toast-icon{background:#dcfce7;color:#16a34a;}
        .ep-toast-error   .ep-toast-icon{background:#ffe4e6;color:#e11d48;}
        .ep-toast-warn    .ep-toast-icon{background:#fef9c3;color:#b45309;}
        .ep-toast-body{flex:1;}
        .ep-toast-title{font-size:13px;font-weight:700;margin:0 0 2px;}
        .ep-toast-success .ep-toast-title{color:#15803d;}
        .ep-toast-error   .ep-toast-title{color:#be123c;}
        .ep-toast-warn    .ep-toast-title{color:#92400e;}
        .ep-toast-msg{font-size:12px;margin:0;}
        .ep-toast-success .ep-toast-msg{color:#16a34a;}
        .ep-toast-error   .ep-toast-msg{color:#e11d48;}
        .ep-toast-warn    .ep-toast-msg{color:#b45309;}
        .ep-toast-x{background:none;border:none;cursor:pointer;font-size:12px;opacity:0.4;transition:opacity 0.2s;flex-shrink:0;padding:2px;}
        .ep-toast-x:hover{opacity:0.9;}
        .ep-toast-bar{position:absolute;bottom:0;left:0;height:3px;animation:epShrink 3.6s linear forwards;}
        .ep-toast-success .ep-toast-bar{background:#4ade80;}
        .ep-toast-error   .ep-toast-bar{background:#fb7185;}
        .ep-toast-warn    .ep-toast-bar{background:#fbbf24;}
        @keyframes epShrink{from{width:100%}to{width:0%}}
      `}</style>

      <ToastPortal toasts={toasts} remove={remove} />

      <div className="ep-page">
        <div className="ep-deco ep-deco-1" />
        <div className="ep-deco ep-deco-2" />

        <div className="ep-card">
          <div className="ep-stripe" />

          {/* Header */}
          <div className="ep-header">
            <div className="ep-header-icon">✏️</div>
            <div className="ep-header-text">
              <h1>Edit Product</h1>
              <p>Update product details below</p>
              <div className="ep-id-chip">
                <span className="ep-id-dot" />
                Product ID: #{id}
              </div>
            </div>
          </div>

          <div className="ep-body">

            {/* ── Basic Info ── */}
            <p className="ep-section">Basic Info</p>

            {/* Company */}
            <div
              style={{
                display:"flex",
                alignItems:"center",
                width:"320px",
                background:"#fff",
                border:"1px solid #dbeafe",
                borderRadius:"14px",
                padding:"12px 15px",
                marginBottom:"20px",
                boxShadow:"0 4px 16px rgba(37,99,235,.08)"
              }}
            >
              <span style={{ marginRight:"10px", fontSize:"18px" }}>🏢</span>

              <select
                value={selectedCompany}
                onChange={handleCompanyChange}
                style={{
                  flex:1,
                  border:"none",
                  outline:"none",
                  background:"transparent",
                  fontSize:"14px",
                  fontWeight:"700",
                  cursor:"pointer"
                }}
              >
                <option value="">Select Company</option>

                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            </div>

<div className="ep-field">
  <label className="ep-label">
    Supplier <span style={{fontSize:"9.5px", textTransform:"none", color:"#94a3b8"}}>(Optional)</span>
  </label>

  {fetching
    ? <div className="ep-skel" />
    : <div className="ep-select-wrap ep-input-wrap">
        <span className="ep-input-icon">🚚</span>

        <select
          className="ep-select"
          value={form.supplier_id}
          onChange={(e) => set("supplier_id", e.target.value)}
          disabled={!selectedCompany}
        >
          <option value="">
            {selectedCompany ? "Select Supplier" : "Select Company First"}
          </option>

          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.supplier_name}
            </option>
          ))}
        </select>

        <span className="ep-select-arrow">▾</span>
      </div>
  }
</div>



            <div className="ep-field">
              <label className="ep-label">Product Name <span style={{color:"#ef4444"}}>*</span></label>
              {fetching
                ? <div className="ep-skel" />
                : <div className="ep-input-wrap">
                    <span className="ep-input-icon">🏷️</span>
                    <input className="ep-input" placeholder="Product name"
                      value={form.name}
                      onChange={e => set("name", e.target.value)} />
                  </div>
              }
            </div>

            <div className="ep-field">
              <label className="ep-label">HSN Code</label>

              <div className="ep-input-wrap">
                <span className="ep-input-icon">🔢</span>

                <input
                  className="ep-input"
                  placeholder="e.g. PRD001"
                  value={form.product_code}
                  onChange={e =>
                    set(
                      "product_code",
                      e.target.value.toUpperCase().replace(/\s/g, "")
                    )
                  }
                />
              </div>
            </div>

            <div className="ep-field">
              <label className="ep-label">Category <span style={{color:"#ef4444"}}>*</span></label>
              {fetching
                ? <div className="ep-skel" />
                : <div className="ep-select-wrap ep-input-wrap">
                    <span className="ep-input-icon">🗂️</span>
                    <select
                      className="ep-select"
                      value={form.category_id}
                      onChange={(e) => {

                        const categoryId = e.target.value;

                        set("category_id", categoryId);
                        set("subcategory_id", "");
                        set("brand_id", "");

                        fetchSubCategories(selectedCompany, categoryId);
                        setBrands([]);

                      }}
                    >
                      <option value="">Select a category…</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <span className="ep-select-arrow">▾</span>
                  </div>
              }
            </div>

            <div className="ep-field">
              <label className="ep-label">Sub Category <span style={{color:"#ef4444"}}>*</span></label>
              {fetching
                ? <div className="ep-skel" />
                : <div className="ep-select-wrap ep-input-wrap">
                    <span className="ep-input-icon">📂</span>
                    <select
                      className="ep-select"
                      value={form.subcategory_id}
                      onChange={(e) => {

                        set("subcategory_id", e.target.value);
                        set("brand_id", "");

                        fetchBrands(selectedCompany, form.category_id, e.target.value);

                      }}
                    >
                      <option value="">Select Sub Category</option>
                      {subCategories.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <span className="ep-select-arrow">▾</span>
                  </div>
              }
            </div>

            <div className="ep-field">
              <label className="ep-label">Brand <span style={{color:"#ef4444"}}>*</span></label>
              {fetching
                ? <div className="ep-skel" />
                : <div className="ep-select-wrap ep-input-wrap">
                    <span className="ep-input-icon">🏷️</span>
                    <select
                      className="ep-select"
                      value={form.brand_id}
                      onChange={(e) => set("brand_id", e.target.value)}
                    >
                      <option value="">Select Brand</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                    <span className="ep-select-arrow">▾</span>
                  </div>
              }
            </div>

            {/* ── Pricing & Stock ── */}
            <p className="ep-section" style={{marginTop:"1.25rem"}}>Pricing & Stock</p>

            <div className="ep-grid-2">
              <div>
                <label className="ep-label">Price (₹) <span style={{color:"#ef4444"}}>*</span></label>
                {fetching
                  ? <div className="ep-skel" />
                  : <div className="ep-input-wrap">
                      <span className="ep-prefix">₹</span>
                      <input type="number" className="ep-input" placeholder="0.00"
                        value={form.price}
                        onChange={e => set("price", e.target.value)} />
                    </div>
                }
              </div>
              <div>
                <label className="ep-label">Stock Qty <span style={{color:"#ef4444"}}>*</span></label>
                {fetching
                  ? <div className="ep-skel" />
                  : <div className="ep-input-wrap">
                      <span className="ep-input-icon">📦</span>
                      <input type="number" className="ep-input" placeholder="0"
                        value={form.stock}
                        onChange={e => set("stock", e.target.value)} />
                    </div>
                }
              </div>
            </div>

            <div className="ep-field">
              <label className="ep-label">Unit <span style={{color:"#ef4444"}}>*</span></label>
              {fetching
                ? <div className="ep-skel" />
                : <div className="ep-select-wrap ep-input-wrap">
                    <span className="ep-input-icon">📏</span>
                    <select
                      className="ep-select"
                      value={form.unit}
                      onChange={(e) => set("unit", e.target.value)}
                    >
                      <option value="">Select Unit</option>
                      <option value="Piece">Piece</option>
                      <option value="Kg">Kg</option>
                      <option value="Gram">Gram</option>
                      <option value="Litre">Litre</option>
                      <option value="ML">ML</option>
                      <option value="Meter">Meter</option>
                      <option value="Feet">Feet</option>
                      <option value="Box">Box</option>
                      <option value="Pack">Pack</option>
                      <option value="Dozen">Dozen</option>
                      <option value="Pair">Pair</option>
                      <option value="Roll">Roll</option>
                      <option value="Bag">Bag</option>
                      <option value="Bottle">Bottle</option>
                      <option value="Can">Can</option>
                      <option value="Set">Set</option>
                    </select>
                    <span className="ep-select-arrow">▾</span>
                  </div>
              }
            </div>

            {/* ── GST (conditional) ── */}
            <div className="ep-field">
              <label className="ep-label">
                GST
                {!gstLoading && (
                  <span className={`ep-gst-badge ${gstEnabled ? "on" : "off"}`}>
                    {gstEnabled ? "✓ Enabled" : "✕ Disabled"}
                  </span>
                )}
              </label>

              {(gstLoading || fetching) ? (
                <div className="ep-skel" />
              ) : gstEnabled ? (
                <div className="ep-input-wrap ep-gst-field">
                  <span className="ep-input-icon" style={{fontWeight:700, fontSize:13, color:"#64748b"}}>%</span>
                  <input
                    type="number"
                    className="ep-input"
                    placeholder="Enter GST % (e.g. 18)"
                    value={form.gst}
                    min="0"
                    max="100"
                    onChange={e => set("gst", e.target.value)}
                  />
                </div>
              ) : (
                <div className="ep-gst-disabled">
                  <span>🚫</span>
                  <span>GST not applicable for this company (without GST plan)</span>
                </div>
              )}
            </div>

            {/* ── Barcode ── */}
            <div className="ep-divider" />
            <p className="ep-section">Barcode</p>

            <div className="ep-barcode-row">
              <div className="ep-barcode-iw">
                <label className="ep-label">Barcode Number</label>
                <div className="ep-input-wrap">
                  <span className="ep-input-icon">｜｜</span>
                  <input className="ep-input" placeholder="Enter or auto-generate"
                    value={form.barcode}
                    onChange={e => { set("barcode", e.target.value); setBarcodeKey(k=>k+1); }} />
                </div>
              </div>
              <button className="ep-gen-btn" onClick={generateBarcode}>⚡ Auto</button>
            </div>

            {form.barcode && (
              <div className="ep-barcode-preview" key={barcodeKey}>
                <p className="ep-barcode-label">Barcode Preview</p>
                <Barcode value={form.barcode} height={55} fontSize={13} margin={0} />
              </div>
            )}

            <div className="ep-divider" />

            <button className="ep-submit" onClick={handleUpdate} disabled={loading || fetching || gstLoading}>
              {loading
                ? <><div className="ep-spinner" /> Updating…</>
                : <>💾 Update Product</>
              }
            </button>
            <button className="ep-cancel" onClick={() => navigate("/products")}>
              Cancel
            </button>

          </div>
        </div>
      </div>
    </>
  );
}