//add unit field
// import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import Barcode from "react-barcode";
// import api from "../../services/api";

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
//         <div key={t.id} className={`pf-toast pf-toast-${t.type}`}>
//           <div className="pf-toast-icon">{t.type==="success"?"✓":t.type==="error"?"✕":"!"}</div>
//           <div className="pf-toast-body">
//             <p className="pf-toast-title">{t.title}</p>
//             {t.msg && <p className="pf-toast-msg">{t.msg}</p>}
//           </div>
//           <button className="pf-toast-x" style={{pointerEvents:"auto"}} onClick={()=>remove(t.id)}>✕</button>
//           <div className="pf-toast-bar" />
//         </div>
//       ))}
//     </div>
//   );
// }

// /* ─── Main Component ─────────────────────────────────────── */
// export default function ProductForm() {
//   const navigate = useNavigate();
//   const [categories, setCategories] = useState([]);
//   const [subCategories, setSubCategories] = useState([]);
//   const [brands, setBrands] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [barcodeKey, setBarcodeKey] = useState(0);
//   const [gstEnabled, setGstEnabled] = useState(false);
//   const [gstLoading, setGstLoading] = useState(true);
//   const { toasts, show, remove } = useToast();
//   const [existingCodes, setExistingCodes] = useState([]);
// const [companies,setCompanies] = useState([]);
// const [selectedCompany,setSelectedCompany] = useState("");

// useEffect(() => {

//   const user = JSON.parse(
//     localStorage.getItem("user")
//   );

//   if(!user?.id) return;

//   loadCompanies(user.id);

// }, []);

// const loadCompanies = async(admin_id) => {

//   try {

//     const res = await api.get(
//       `/company/get_companies_by_admin?admin_id=${admin_id}`
//     );

//     if(res.data.status){

//       setCompanies(res.data.data);

//     }

//   } catch(err){

//     console.log(err);

//   }

// };
//   const [form, setForm] = useState({
//     name: "", product_code: "", price: "", brand_id: "",
//   subcategory_id: "", stock: "", gst: "", barcode: "", category_id: "", unit: ""
//   });

//   const set = (field, val) => setForm(p => ({ ...p, [field]: val }));

// const getCompanyId = () => {

//   return Number(
//     localStorage.getItem("selected_company_id")
//   );

// };

//  const fetchCompanyGST = async (company_id) => {

//     setGstLoading(true);

//     try {

//         if(!company_id) return;

//         const res = await api.post(
//             "/company/get_company_by_id",
//             {
//                 id: company_id
//             }
//         );

//         if(res.data.status){

//             const company = res.data.data;

//             setGstEnabled(
//                 company.gst_type === "with_gst"
//             );

//         }

//     } finally {

//         setGstLoading(false);

//     }

// };

// const fetchCategories = async (company_id) => {

//   try {

//     if (!company_id) {
//       setCategories([]);
//       return;
//     }

//     const res = await api.get(
//       `/category/get_active_category?company_id=${company_id}`
//     );

//     if (res.data.status) {
//       setCategories(res.data.data);
//     } else {
//       setCategories([]);
//     }

//   } catch (err) {

//     console.log(err);
//     setCategories([]);

//   }

// };

// const fetchSubCategories = async (company_id,category_id) => {

//   if (!category_id) {
//     setSubCategories([]);
//     return;
//   }

//   try {

//     const res = await api.get(
//       `/subcategory/get_active_subcategory?company_id=${company_id}&category_id=${category_id}`
//     );

//     if (res.data.status) {
//       setSubCategories(res.data.data);
//     } else {
//       setSubCategories([]);
//     }

//   } catch (err) {
//     console.log(err);
//   }

// };

// const fetchBrands = async (company_id, category_id, subcategory_id) => {

//   if (!company_id || !category_id || !subcategory_id) {
//     setBrands([]);
//     return;
//   }

//   try {

//     const res = await api.get(
//       `/brand/get_active_brand?company_id=${company_id}&category_id=${category_id}&subcategory_id=${subcategory_id}`
//     );

//     if (res.data.status) {

//       setBrands(res.data.data);

//     } else {

//       setBrands([]);

//     }

//   } catch (err) {

//     console.log(err);
//     setBrands([]);

//   }

// };
// const fetchProducts = async(company_id) => {

//   if(!company_id){

//     setProducts([]);
//     return;

//   }

//   setLoading(true);

//   try {

//     const res = await api.get(
//       `/product/get?company_id=${company_id}`
//     );

//     if(res.data.status){

//       setProducts(res.data.data);

//     }

//   } catch(err){

//     console.log(err);

//   } finally {

//     setLoading(false);

//   }

// };

// useEffect(() => {

//     if(!selectedCompany) return;

//     fetchCategories(selectedCompany);
//     fetchCompanyGST(selectedCompany);
//     fetchProducts(selectedCompany);

// }, [selectedCompany]);


// const handleCompanyChange = (e) => {

//     const companyId = e.target.value;

//     setSelectedCompany(companyId);

//     localStorage.setItem(
//         "selected_company_id",
//         companyId
//     );

//     // Reset previous category
//     setForm(prev => ({
//         ...prev,
//         category_id: "",
//          subcategory_id: "",
//           brand: ""
//     }));
    
//     fetchCategories(companyId);
//     fetchCompanyGST(companyId);
//     fetchProducts(companyId);
//     setSubCategories([]);
//     setBrands([]);

// };

//   const generateBarcode = () => {
//     const code = "PRD" + Math.floor(100000 + Math.random() * 900000);
//     setForm(p => ({ ...p, barcode: code }));
//     setBarcodeKey(k => k + 1);
//   };

//   const handleSubmit = async () => {
//     if (!form.name.trim())    { show("warn", "Missing Field", "Product name is required."); return; }
//     if (!form.category_id)    { show("warn", "Missing Field", "Please select a category."); return; }
//     if (!form.subcategory_id) {

//     show(
//         "warn",
//         "Missing Field",
//         "Please select a sub category."
//     );

//     return;

// }
// if (!form.brand_id) {

//   show(
//     "warn",
//     "Missing Field",
//     "Please select a brand."
//   );

//   return;

// }
//     if (!form.price)          { show("warn", "Missing Field", "Price is required."); return; }
//     if (isNaN(Number(form.price)) || Number(form.price) < 0) { show("warn", "Invalid Price", "Please enter a valid price."); return; }
//     if (!form.stock)          { show("warn", "Missing Field", "Stock quantity is required."); return; }
//     if (isNaN(Number(form.stock)) || Number(form.stock) < 0) { show("warn", "Invalid Stock", "Please enter a valid stock quantity."); return; }
//     if (!form.unit.trim())    { show("warn", "Missing Field", "Unit is required (e.g. kg, litre, piece)."); return; }
//     if (gstEnabled && !form.gst) { show("warn", "Missing Field", "GST percentage is required."); return; }
//     if (gstEnabled && (isNaN(Number(form.gst)) || Number(form.gst) < 0 || Number(form.gst) > 100)) {
//       show("warn", "Invalid GST", "Please enter a valid GST percentage (0–100).");
//       return;
//     }
//     // Product Code Already Exists Validation
// if (
//   form.product_code.trim() &&
//   existingCodes.includes(form.product_code.trim().toUpperCase())
// ) {
//   show(
//     "error",
//     "Duplicate Product Code",
//     "Product code already exists."
//   );
//   return;
// }

//     setLoading(true);
//     try {
//       const res = await api.post("/product/add", {
//         product_name: form.name,
//         product_code: form.product_code,
//         category_id: form.category_id,
//         subcategory_id: form.subcategory_id,
//          brand_id: form.brand_id,
//         company_id: getCompanyId(),
//         price: form.price,
//         stock: form.stock,
//         gst_percentage: gstEnabled ? form.gst : "",
//         barcode: form.barcode,
//         unit: form.unit
//       });
//       if (res.data.status) {
//         show("success", "Product Added!", `"${form.name}" saved successfully.`);
//         setTimeout(() => navigate("/products"), 1800);
//       } else {
//         show("error", "Failed", res.data.message || "Something went wrong.");
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

//         .pf-page {
//           font-family: 'Plus Jakarta Sans', sans-serif;
//           min-height: 100vh;
//           background: #eef2ff;
//           display: flex;
//           align-items: flex-start;
//           justify-content: center;
//           padding: 2.5rem 1.5rem;
//           position: relative;
//           overflow-x: hidden;
//         }
//         .pf-deco {
//           position: fixed; pointer-events: none;
//           border-radius: 50%; filter: blur(70px); opacity: 0.28;
//         }
//         .pf-deco-1 { width:380px;height:380px;background:#3b82f6;top:-120px;right:-100px; }
//         .pf-deco-2 { width:260px;height:260px;background:#818cf8;bottom:-60px;left:-60px; }

//         .pf-card {
//           position: relative; width: 100%; max-width: 560px;
//           background: #fff; border-radius: 26px;
//           border: 1px solid #e2e8f0;
//           box-shadow: 0 8px 40px rgba(37,99,235,0.1), 0 2px 8px rgba(0,0,0,0.04);
//           overflow: hidden;
//           animation: pfUp 0.5s cubic-bezier(0.22,1,0.36,1) both;
//         }
//         @keyframes pfUp {
//           from{opacity:0;transform:translateY(28px) scale(0.97)}
//           to{opacity:1;transform:translateY(0) scale(1)}
//         }
//         .pf-stripe {
//           height: 4px;
//           background: linear-gradient(90deg,#1d4ed8,#6366f1,#3b82f6,#1d4ed8);
//           background-size: 200%;
//           animation: pfStripe 3s linear infinite;
//         }
//         @keyframes pfStripe{0%{background-position:0%}100%{background-position:200%}}

//         .pf-header {
//           background: linear-gradient(135deg,#1e40af 0%,#2563eb 55%,#3b82f6 100%);
//           padding: 1.75rem 2rem;
//           display: flex; align-items: center; gap: 1rem;
//           position: relative; overflow: hidden;
//         }
//         .pf-header::before {
//           content:''; position:absolute; top:-50px; right:-50px;
//           width:180px;height:180px; border-radius:50%;
//           background:rgba(255,255,255,0.07);
//         }
//         .pf-header-icon {
//           width:52px; height:52px; border-radius:16px;
//           background:rgba(255,255,255,0.18);
//           border:1.5px solid rgba(255,255,255,0.3);
//           display:flex; align-items:center; justify-content:center;
//           font-size:22px; flex-shrink:0; position:relative; z-index:1;
//         }
//         .pf-header-text { position:relative; z-index:1; }
//         .pf-header-text h1 { font-size:20px; font-weight:800; color:#fff; margin:0 0 3px; letter-spacing:-0.3px; }
//         .pf-header-text p  { font-size:12.5px; color:rgba(255,255,255,0.7); margin:0; }

//         .pf-body { padding: 2rem; }

//         .pf-section {
//           font-size:10.5px; font-weight:800;
//           text-transform:uppercase; letter-spacing:0.1em;
//           color:#3b82f6; margin:0 0 12px;
//           display:flex; align-items:center; gap:8px;
//         }
//         .pf-section::after { content:''; flex:1; height:1px; background:#e8f0fe; }

//         .pf-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px; }
//         .pf-field  { margin-bottom:12px; }

//         .pf-label {
//           display:block; font-size:11px; font-weight:700;
//           text-transform:uppercase; letter-spacing:0.07em;
//           color:#94a3b8; margin-bottom:6px;
//         }

//         .pf-input, .pf-select {
//           width:100%; padding:12px 14px 12px 42px;
//           border-radius:12px; border:1.5px solid #e2e8f0;
//           background:#f8faff;
//           font-family:'Plus Jakarta Sans',sans-serif;
//           font-size:14px; font-weight:500; color:#1e293b;
//           outline:none; box-sizing:border-box;
//           transition:all 0.22s; appearance:none;
//         }
//         .pf-input::placeholder { color:#c4cdd6; font-weight:400; }
//         .pf-input:hover,.pf-select:hover { border-color:#bfdbfe; background:#f0f6ff; }
//         .pf-input:focus,.pf-select:focus {
//           border-color:#3b82f6; background:#fff;
//           box-shadow:0 0 0 4px rgba(59,130,246,0.1);
//         }
//         .pf-input-wrap  { position:relative; }
//         .pf-input-icon  {
//           position:absolute; left:13px; top:50%;
//           transform:translateY(-50%); font-size:15px;
//           pointer-events:none; transition:transform 0.2s;
//         }
//         .pf-input-wrap:focus-within .pf-input-icon { transform:translateY(-50%) scale(1.15); }

//         .pf-select-wrap { position:relative; }
//         .pf-select-arrow {
//           position:absolute; right:14px; top:50%;
//           transform:translateY(-50%);
//           pointer-events:none; font-size:11px; color:#94a3b8;
//         }
//         .pf-select { padding-right:36px; }

//         .pf-prefix {
//           position:absolute; left:0; top:0; bottom:0;
//           width:42px; display:flex; align-items:center; justify-content:center;
//           border-right:1.5px solid #e2e8f0; border-radius:12px 0 0 12px;
//           background:#f1f5f9; font-size:13px; font-weight:700;
//           color:#64748b; pointer-events:none; transition:all 0.22s;
//         }
//         .pf-input-wrap:focus-within .pf-prefix { border-right-color:#bfdbfe; background:#eff6ff; color:#3b82f6; }

//         /* GST disabled notice */
//         .pf-gst-disabled {
//           display:flex; align-items:center; gap:8px;
//           padding:10px 14px; border-radius:12px;
//           background:#f8faff; border:1.5px dashed #e2e8f0;
//           font-size:12.5px; color:#94a3b8; font-weight:500;
//         }

//         /* GST loading shimmer */
//         .pf-skel {
//           height:46px; border-radius:12px;
//           background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);
//           background-size:200% 100%;
//           animation:pfSkel 1.4s ease infinite;
//         }
//         @keyframes pfSkel{0%{background-position:200%}100%{background-position:-200%}}

//         .pf-divider { height:1px; background:#f1f5f9; margin:1.5rem 0; }

//         .pf-barcode-row { display:flex; gap:10px; margin-bottom:14px; align-items:flex-end; }
//         .pf-barcode-input-wrap { flex:1; }
//         .pf-gen-btn {
//           padding:12px 18px; border-radius:12px; border:none;
//           cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif;
//           font-size:12.5px; font-weight:700; white-space:nowrap;
//           background:linear-gradient(135deg,#6366f1,#818cf8);
//           color:#fff; box-shadow:0 4px 14px rgba(99,102,241,0.35);
//           transition:all 0.2s;
//         }
//         .pf-gen-btn:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(99,102,241,0.45); }

//         .pf-barcode-preview {
//           background:#f8faff; border-radius:14px;
//           border:1.5px solid #e2e8f0;
//           padding:16px; text-align:center;
//           animation:pfBarIn 0.3s ease both;
//         }
//         @keyframes pfBarIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
//         .pf-barcode-label {
//           font-size:10.5px; font-weight:700;
//           text-transform:uppercase; letter-spacing:0.08em;
//           color:#94a3b8; margin-bottom:8px;
//         }

//         .pf-submit {
//           width:100%; padding:15px; border-radius:14px; border:none; cursor:pointer;
//           font-family:'Plus Jakarta Sans',sans-serif; font-size:15px; font-weight:800;
//           background:linear-gradient(135deg,#1e40af 0%,#2563eb 55%,#3b82f6 100%);
//           color:#fff; box-shadow:0 4px 18px rgba(37,99,235,0.38);
//           position:relative; overflow:hidden;
//           display:flex; align-items:center; justify-content:center; gap:8px;
//           transition:all 0.25s;
//         }
//         .pf-submit::after {
//           content:''; position:absolute; inset:0;
//           background:linear-gradient(180deg,rgba(255,255,255,0.12) 0%,transparent 60%);
//           pointer-events:none;
//         }
//         .pf-submit:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 10px 28px rgba(37,99,235,0.45); }
//         .pf-submit:active:not(:disabled){ transform:translateY(0); }
//         .pf-submit:disabled { opacity:0.6; cursor:not-allowed; }

//         .pf-cancel {
//           width:100%; margin-top:10px; padding:12px;
//           border-radius:12px; border:1.5px solid #e2e8f0;
//           background:transparent; font-family:'Plus Jakarta Sans',sans-serif;
//           font-size:13.5px; font-weight:600; color:#94a3b8;
//           cursor:pointer; transition:all 0.2s;
//         }
//         .pf-cancel:hover { background:#f8fafc; color:#475569; border-color:#cbd5e1; }

//         .pf-spinner {
//           width:17px;height:17px;
//           border:2.5px solid rgba(255,255,255,0.3);
//           border-top-color:#fff; border-radius:50%;
//           animation:spin 0.7s linear infinite; flex-shrink:0;
//         }
//         @keyframes spin{to{transform:rotate(360deg)}}

//         /* GST badge */
//         .pf-gst-badge {
//           display:inline-flex; align-items:center; gap:5px;
//           padding:3px 10px; border-radius:100px;
//           font-size:10.5px; font-weight:700;
//           margin-left:8px;
//         }
//         .pf-gst-badge.on  { background:#dcfce7; color:#15803d; border:1px solid #bbf7d0; }
//         .pf-gst-badge.off { background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; }

//         /* ── Toast ── */
//         .pf-toast {
//           pointer-events:auto; display:flex; align-items:center; gap:11px;
//           min-width:280px; max-width:360px; padding:12px 15px; border-radius:15px;
//           position:relative; overflow:hidden; box-shadow:0 8px 28px rgba(0,0,0,0.12);
//           animation:pfToastIn 0.4s cubic-bezier(0.22,1,0.36,1) both;
//           font-family:'Plus Jakarta Sans',sans-serif;
//         }
//         @keyframes pfToastIn{from{opacity:0;transform:translateX(60px) scale(0.9)}to{opacity:1;transform:translateX(0) scale(1)}}
//         .pf-toast-success{background:#f0fdf4;border:1px solid #bbf7d0;}
//         .pf-toast-error  {background:#fff1f2;border:1px solid #fecdd3;}
//         .pf-toast-warn   {background:#fffbeb;border:1px solid #fde68a;}
//         .pf-toast-icon{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;flex-shrink:0;}
//         .pf-toast-success .pf-toast-icon{background:#dcfce7;color:#16a34a;}
//         .pf-toast-error   .pf-toast-icon{background:#ffe4e6;color:#e11d48;}
//         .pf-toast-warn    .pf-toast-icon{background:#fef9c3;color:#b45309;}
//         .pf-toast-body{flex:1;}
//         .pf-toast-title{font-size:13px;font-weight:700;margin:0 0 2px;}
//         .pf-toast-success .pf-toast-title{color:#15803d;}
//         .pf-toast-error   .pf-toast-title{color:#be123c;}
//         .pf-toast-warn    .pf-toast-title{color:#92400e;}
//         .pf-toast-msg{font-size:12px;margin:0;}
//         .pf-toast-success .pf-toast-msg{color:#16a34a;}
//         .pf-toast-error   .pf-toast-msg{color:#e11d48;}
//         .pf-toast-warn    .pf-toast-msg{color:#b45309;}
//         .pf-toast-x{background:none;border:none;cursor:pointer;font-size:12px;opacity:0.4;transition:opacity 0.2s;flex-shrink:0;padding:2px;}
//         .pf-toast-x:hover{opacity:0.9;}
//         .pf-toast-bar{position:absolute;bottom:0;left:0;height:3px;animation:pfShrink 3.6s linear forwards;}
//         .pf-toast-success .pf-toast-bar{background:#4ade80;}
//         .pf-toast-error   .pf-toast-bar{background:#fb7185;}
//         .pf-toast-warn    .pf-toast-bar{background:#fbbf24;}
//         @keyframes pfShrink{from{width:100%}to{width:0%}}

//         /* GST slide-in animation */
//         .pf-gst-field {
//           animation: pfFadeIn 0.3s ease both;
//         }
//         @keyframes pfFadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
//       `}</style>

//       <ToastPortal toasts={toasts} remove={remove} />

//       <div className="pf-page">
//         <div className="pf-deco pf-deco-1" />
//         <div className="pf-deco pf-deco-2" />

//         <div className="pf-card">
//           <div className="pf-stripe" />

//           {/* Header */}
//           <div className="pf-header">
//             <div className="pf-header-icon">📦</div>
//             <div className="pf-header-text">
//               <h1>Add Product</h1>
//               <p>Fill in the details to create a new product</p>
//             </div>
//           </div>

          

//           <div className="pf-body">

//             {/* ── Basic Info ── */}
//             <p className="pf-section">Basic Info</p>

//             <div
//   style={{
//     display:"flex",
//     alignItems:"center",
//     width:"320px",
//     background:"#fff",
//     border:"1px solid #dbeafe",
//     borderRadius:"14px",
//     padding:"12px 15px",
//     marginBottom:"20px",
//     boxShadow:"0 4px 16px rgba(37,99,235,.08)"
//   }}
// >
//   <span
//     style={{
//       marginRight:"10px",
//       fontSize:"18px"
//     }}
//   >
//     🏢
//   </span>

//   <select
//     value={selectedCompany}
//     onChange={handleCompanyChange}
//     style={{
//       flex:1,
//       border:"none",
//       outline:"none",
//       background:"transparent",
//       fontSize:"14px",
//       fontWeight:"700",
//       cursor:"pointer"
//     }}
//   >
//     <option value="">
//       Select Company
//     </option>

//     {companies.map((c) => (

//       <option
//         key={c.id}
//         value={c.id}
//       >
//         {c.company_name}
//       </option>

//     ))}

//   </select>


// </div>

//             <div className="pf-field">
//               <label className="pf-label">Product Name <span style={{color:"#ef4444"}}>*</span></label>
//               <div className="pf-input-wrap">
//                 <span className="pf-input-icon">🏷️</span>
//                 <input className="pf-input" placeholder="e.g. Bisleri Water 1L"
//                   value={form.name}
//                   onChange={e => set("name", e.target.value)} />
//               </div>
//             </div>

            
// <div className="pf-field">
//   <label className="pf-label">
//     HSN Code
//   </label>

//   <div className="pf-input-wrap">
//     <span className="pf-input-icon">🔢</span>

//     <input
//   className="pf-input"
//   placeholder="e.g. PRD001"
//   value={form.product_code}
//   onChange={e =>
//     set(
//       "product_code",
//       e.target.value.toUpperCase().replace(/\s/g, "")
//     )
//   }
// />
//   </div>
// </div>



//             <div className="pf-field">
//               <label className="pf-label">Category <span style={{color:"#ef4444"}}>*</span></label>
//               <div className="pf-select-wrap pf-input-wrap">
//                 <span className="pf-input-icon">🗂️</span>
//                 {/* <select className="pf-select"
//                   value={form.category_id}
//                   onChange={e => set("category_id", e.target.value)}> 
//                   <option value="">Select a category…</option>
//                   {categories.map(c => (
//                     <option key={c.id} value={c.id}>{c.name}</option>
//                   ))}
//                 </select> */}
//                 <select
//   className="pf-select"
//   value={form.category_id}
//  onChange={(e) => {

//     const categoryId = e.target.value;

//     set("category_id", categoryId);
//     set("subcategory_id", "");
//     set("brand_id", "");

//     fetchSubCategories(
//         selectedCompany,
//         categoryId
//     );

//     setBrands([]);

// }}
// >
//   <option value="">Select a category...</option>

//   {categories.map((c) => (
//     <option key={c.id} value={c.id}>
//       {c.name}
//     </option>
//   ))}
// </select>
//                 <span className="pf-select-arrow">▾</span>
//               </div>
//             </div>

//             <div className="pf-field">

//   <label className="pf-label">
//     Sub Category
//   </label>

//   <div className="pf-select-wrap pf-input-wrap">

//     <span className="pf-input-icon">📂</span>

//     <select
//       className="pf-select"
//       value={form.subcategory_id}
//       // onChange={(e) => set("subcategory_id", e.target.value)}
//       onChange={(e) => {

//   set("subcategory_id", e.target.value);
//   set("brand_id", "");

//   fetchBrands(
//     selectedCompany,
//     form.category_id,
//     e.target.value
//   );

// }}
//     >

//       <option value="">
//         Select Sub Category
//       </option>

//       {subCategories.map((s) => (

//         <option
//           key={s.id}
//           value={s.id}
//         >
//           {s.name}
//         </option>

//       ))}

//     </select>

//     <span className="pf-select-arrow">▾</span>

//   </div>

// </div>
// {/* brand  */}

//             <div className="pf-field">

//   <label className="pf-label">
//     Brand
//   </label>

//   <div className="pf-input-wrap">

//     <span className="pf-input-icon">🏷️</span>

//     <select
//   className="pf-select"
//   value={form.brand_id}
//   onChange={(e) => set("brand_id", e.target.value)}
// >

//   <option value="">
//     Select Brand
//   </option>

//   {brands.map((b) => (

//     <option
//       key={b.id}
//       value={b.id}
//     >
//       {b.name}
//     </option>

//   ))}

// </select>

// <span className="pf-select-arrow">▾</span>

//   </div>

// </div>

//             {/* ── Pricing & Stock ── */}
//             <p className="pf-section" style={{marginTop:"1.25rem"}}>Pricing & Stock</p>

//             <div className="pf-grid-2">
//               <div>
//                 <label className="pf-label">Price (₹) <span style={{color:"#ef4444"}}>*</span></label>
//                 <div className="pf-input-wrap">
//                   <span className="pf-prefix">₹</span>
//                   <input type="number" className="pf-input" placeholder="0.00"
//                     value={form.price}
//                     onChange={e => set("price", e.target.value)} />
//                 </div>
//               </div>
//               <div>
//                 <label className="pf-label">Stock Qty <span style={{color:"#ef4444"}}>*</span></label>
//                 <div className="pf-input-wrap">
//                   <span className="pf-input-icon">📦</span>
//                   <input type="number" className="pf-input" placeholder="0"
//                     value={form.stock}
//                     onChange={e => set("stock", e.target.value)} />
//                 </div>
//               </div>
//             </div>

//             {/* <div className="pf-field">
//               <label className="pf-label">Unit <span style={{color:"#ef4444"}}>*</span></label>
//               <div className="pf-input-wrap">
//                 <span className="pf-input-icon">📏</span>
//                 <input
//                   className="pf-input"
//                   placeholder="e.g. kg / litre / piece"
//                   value={form.unit}
//                   onChange={e => set("unit", e.target.value)}
//                 />
//               </div>
//             </div>  */}

//             <div className="pf-field">
//   <label className="pf-label">
//     Unit <span style={{ color: "#ef4444" }}>*</span>
//   </label>

//   <div className="pf-select-wrap pf-input-wrap">
//     <span className="pf-input-icon">📏</span>

//     <select
//       className="pf-select"
//       value={form.unit}
//       onChange={(e) => set("unit", e.target.value)}
//     >
//       <option value="">Select Unit</option>
//       <option value="Piece">Piece</option>
//       <option value="Kg">Kg</option>
//       <option value="Gram">Gram</option>
//       <option value="Litre">Litre</option>
//       <option value="ML">ML</option>
//       <option value="Meter">Meter</option>
//       <option value="Feet">Feet</option>
//       <option value="Box">Box</option>
//       <option value="Pack">Pack</option>
//       <option value="Dozen">Dozen</option>
//       <option value="Pair">Pair</option>
//       <option value="Roll">Roll</option>
//       <option value="Bag">Bag</option>
//       <option value="Bottle">Bottle</option>
//       <option value="Can">Can</option>
//       <option value="Set">Set</option>
//     </select>

//     <span className="pf-select-arrow">▾</span>
//   </div>
// </div>

//             {/* ── GST (conditional) ── */}
//             <div className="pf-field">
//               <label className="pf-label">
//                 GST
//                 {!gstLoading && (
//                   <span className={`pf-gst-badge ${gstEnabled ? "on" : "off"}`}>
//                     {gstEnabled ? "✓ Enabled" : "✕ Disabled"}
//                   </span>
//                 )}
//               </label>

//               {gstLoading ? (
//                 <div className="pf-skel" />
//               ) : gstEnabled ? (
//                 <div className="pf-input-wrap pf-gst-field">
//                   <span className="pf-input-icon" style={{fontWeight:700, fontSize:13, color:"#64748b"}}>%</span>
//                   <input
//                     type="number"
//                     className="pf-input"
//                     placeholder="Enter GST % (e.g. 18)"
//                     value={form.gst}
//                     min="0"
//                     max="100"
//                     onChange={e => set("gst", e.target.value)}
//                   />
//                 </div>
//               ) : (
//                 <div className="pf-gst-disabled">
//                   <span>🚫</span>
//                   <span>GST not applicable for this company (without GST plan)</span>
//                 </div>
//               )}
//             </div>

//             {/* ── Barcode ── */}
//             <div className="pf-divider" />
//             <p className="pf-section">Barcode</p>

//             <div className="pf-barcode-row">
//               <div className="pf-barcode-input-wrap">
//                 <label className="pf-label">Barcode Number</label>
//                 <div className="pf-input-wrap">
//                   <span className="pf-input-icon">｜｜</span>
//                   <input className="pf-input" placeholder="Enter or auto-generate"
//                     value={form.barcode}
//                     onChange={e => set("barcode", e.target.value)} />
//                 </div>
//               </div>
//               <button className="pf-gen-btn" onClick={generateBarcode}>⚡ Auto</button>
//             </div>

//             {form.barcode && (
//               <div className="pf-barcode-preview" key={barcodeKey}>
//                 <p className="pf-barcode-label">Barcode Preview</p>
//                 <Barcode value={form.barcode} height={55} fontSize={13} margin={0} />
//               </div>
//             )}

//             <div className="pf-divider" />

//             <button className="pf-submit" onClick={handleSubmit} disabled={loading || gstLoading}>
//               {loading
//                 ? <><div className="pf-spinner" /> Saving product…</>
//                 : <>💾 Save Product</>
//               }
//             </button>
//             <button className="pf-cancel" onClick={() => navigate("/products")}>
//               Cancel
//             </button>

//           </div>
//         </div>
//       </div>
//     </>
//   );
// }


//supplier dropdown
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Barcode from "react-barcode";
import api from "../../services/api";

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
        <div key={t.id} className={`pf-toast pf-toast-${t.type}`}>
          <div className="pf-toast-icon">{t.type==="success"?"✓":t.type==="error"?"✕":"!"}</div>
          <div className="pf-toast-body">
            <p className="pf-toast-title">{t.title}</p>
            {t.msg && <p className="pf-toast-msg">{t.msg}</p>}
          </div>
          <button className="pf-toast-x" style={{pointerEvents:"auto"}} onClick={()=>remove(t.id)}>✕</button>
          <div className="pf-toast-bar" />
        </div>
      ))}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function ProductForm() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [barcodeKey, setBarcodeKey] = useState(0);
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstLoading, setGstLoading] = useState(true);
  const { toasts, show, remove } = useToast();
  const [existingCodes, setExistingCodes] = useState([]);
const [companies,setCompanies] = useState([]);
const [selectedCompany,setSelectedCompany] = useState("");


const [suppliers, setSuppliers] = useState([]);
// const [supplierId, setSupplierId] = useState("");

// useEffect(() => {
//   if (selectedCompany) {
//     api.get(`/supplier/get_all?company_id=${companyId}`)
//       .then(res => {
//         if (res.data.status) setSuppliers(res.data.data);
//       });
//   }
// }, [companyId]);



const fetchSuppliers = async (company_id) => {
  if (!company_id) {
    setSuppliers([]);
    return;
  }
  try {
    const res = await api.get(`/supplier/get_all?company_id=${company_id}`);
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

useEffect(() => {

  const user = JSON.parse(
    localStorage.getItem("user")
  );

  if(!user?.id) return;

  loadCompanies(user.id);

}, []);

const loadCompanies = async(admin_id) => {

  try {

    const res = await api.get(
      `/company/get_companies_by_admin?admin_id=${admin_id}`
    );

    if(res.data.status){

      setCompanies(res.data.data);

    }

  } catch(err){

    console.log(err);

  }

};
  const [form, setForm] = useState({
    name: "", product_code: "", price: "", brand_id: "",
    subcategory_id: "", stock: "", gst: "", barcode: "", category_id: "", unit: "", supplier_id: "",
    new_category_name: "", new_subcategory_name: "", new_brand_name: ""
  });

  const set = (field, val) => setForm(p => ({ ...p, [field]: val }));

  const [aiLoading, setAiLoading] = useState(false);

  const handleAiAutoFill = async () => {
    if (!form.name.trim()) {
      show("warn", "Product Name Needed", "Enter a product name first to use AI Auto-Fill.");
      return;
    }
    setAiLoading(true);
    try {
      const res = await api.post("/ai/generate_product_info", { title: form.name });
      if (res.data.status && res.data.data) {
        const info = res.data.data;
        setForm(p => ({
          ...p,
          product_code: p.product_code || info.product_code,
          barcode: p.barcode || info.barcode,
          unit: p.unit || info.suggested_unit,
          gst: p.gst || info.suggested_gst
        }));
        show("success", "AI Auto-Filled", "Product code, barcode, unit & GST suggested!");
      }
    } catch (e) {
      console.log(e);
    } finally {
      setAiLoading(false);
    }
  };

const getCompanyId = () => {

  return Number(
    localStorage.getItem("selected_company_id")
  );

};

 const fetchCompanyGST = async (company_id) => {

    setGstLoading(true);

    try {

        if(!company_id) return;

        const res = await api.post(
            "/company/get_company_by_id",
            {
                id: company_id
            }
        );

        if(res.data.status){

            const company = res.data.data;

            setGstEnabled(
                company.gst_type === "with_gst"
            );

        }

    } finally {

        setGstLoading(false);

    }

};

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

const fetchSubCategories = async (company_id,category_id) => {

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
const fetchProducts = async(company_id) => {

  if(!company_id){

    setProducts([]);
    return;

  }

  setLoading(true);

  try {

    const res = await api.get(
      `/product/get?company_id=${company_id}`
    );

    if(res.data.status){

      setProducts(res.data.data);

    }

  } catch(err){

    console.log(err);

  } finally {

    setLoading(false);

  }

};

useEffect(() => {

    if(!selectedCompany) return;

    fetchCategories(selectedCompany);
    fetchCompanyGST(selectedCompany);
    fetchProducts(selectedCompany);
    fetchSuppliers(selectedCompany); 

}, [selectedCompany]);


const handleCompanyChange = (e) => {

    const companyId = e.target.value;

    setSelectedCompany(companyId);

    localStorage.setItem(
        "selected_company_id",
        companyId
    );

    // Reset previous category
    setForm(prev => ({
        ...prev,
        supplier_id: "" ,
        category_id: "",
         subcategory_id: "",
          brand_id: ""
          
    }));
    
    fetchCategories(companyId);
    fetchCompanyGST(companyId);
    fetchProducts(companyId);
    fetchSuppliers(companyId); 
    setSubCategories([]);
    setBrands([]);

};

  const generateBarcode = () => {
    const code = "PRD" + Math.floor(100000 + Math.random() * 900000);
    setForm(p => ({ ...p, barcode: code }));
    setBarcodeKey(k => k + 1);
  };

  const handleSubmit = async () => {
    if (!form.name.trim())    { show("warn", "Missing Field", "Product name is required."); return; }

    if (!form.category_id)    { show("warn", "Missing Field", "Please select or create a category."); return; }
    if (form.category_id === "NEW_CATEGORY" && !form.new_category_name.trim()) {
      show("warn", "Missing Field", "Please enter a name for the new category."); return;
    }

    if (form.category_id !== "NEW_CATEGORY" && !form.subcategory_id) {
      show("warn", "Missing Field", "Please select or create a sub category."); return;
    }
    if (form.subcategory_id === "NEW_SUBCATEGORY" && !form.new_subcategory_name.trim()) {
      show("warn", "Missing Field", "Please enter a name for the new sub category."); return;
    }

    if (form.brand_id === "NEW_BRAND" && !form.new_brand_name.trim()) {
      show("warn", "Missing Field", "Please enter a name for the new brand."); return;
    }

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

    if (
      form.product_code.trim() &&
      existingCodes.includes(form.product_code.trim().toUpperCase())
    ) {
      show("error", "Duplicate Product Code", "Product code already exists.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/product/add", {
        product_name: form.name,
        product_code: form.product_code,
        category_id: form.category_id === "NEW_CATEGORY" ? 0 : form.category_id,
        subcategory_id: form.subcategory_id === "NEW_SUBCATEGORY" ? 0 : form.subcategory_id,
        brand_id: form.brand_id === "NEW_BRAND" ? 0 : form.brand_id,
        new_category_name: form.category_id === "NEW_CATEGORY" ? form.new_category_name : "",
        new_subcategory_name: form.subcategory_id === "NEW_SUBCATEGORY" ? form.new_subcategory_name : "",
        new_brand_name: form.brand_id === "NEW_BRAND" ? form.new_brand_name : "",
        supplier_id: form.supplier_id, 
        company_id: getCompanyId() || selectedCompany,
        price: form.price,
        stock: form.stock,
        gst_percentage: gstEnabled ? form.gst : 0,
        barcode: form.barcode,
        unit: form.unit
      });
      if (res.data.status) {
        show("success", "Product Added!", `"${form.name}" saved successfully.`);
        setTimeout(() => navigate("/products"), 1800);
      } else {
        show("error", "Failed", res.data.message || "Something went wrong.");
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

        .pf-page {
          font-family: 'Plus Jakarta Sans', sans-serif;
          min-height: 100vh;
          background: #eef2ff;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 2.5rem 1.5rem;
          position: relative;
          overflow-x: hidden;
        }
        .pf-deco {
          position: fixed; pointer-events: none;
          border-radius: 50%; filter: blur(70px); opacity: 0.28;
        }
        .pf-deco-1 { width:380px;height:380px;background:#3b82f6;top:-120px;right:-100px; }
        .pf-deco-2 { width:260px;height:260px;background:#818cf8;bottom:-60px;left:-60px; }

        .pf-card {
          position: relative; width: 100%; max-width: 560px;
          background: #fff; border-radius: 26px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 8px 40px rgba(37,99,235,0.1), 0 2px 8px rgba(0,0,0,0.04);
          overflow: hidden;
          animation: pfUp 0.5s cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes pfUp {
          from{opacity:0;transform:translateY(28px) scale(0.97)}
          to{opacity:1;transform:translateY(0) scale(1)}
        }
        .pf-stripe {
          height: 4px;
          background: linear-gradient(90deg,#1d4ed8,#6366f1,#3b82f6,#1d4ed8);
          background-size: 200%;
          animation: pfStripe 3s linear infinite;
        }
        @keyframes pfStripe{0%{background-position:0%}100%{background-position:200%}}

        .pf-header {
          background: linear-gradient(135deg,#1e40af 0%,#2563eb 55%,#3b82f6 100%);
          padding: 1.75rem 2rem;
          display: flex; align-items: center; gap: 1rem;
          position: relative; overflow: hidden;
        }
        .pf-header::before {
          content:''; position:absolute; top:-50px; right:-50px;
          width:180px;height:180px; border-radius:50%;
          background:rgba(255,255,255,0.07);
        }
        .pf-header-icon {
          width:52px; height:52px; border-radius:16px;
          background:rgba(255,255,255,0.18);
          border:1.5px solid rgba(255,255,255,0.3);
          display:flex; align-items:center; justify-content:center;
          font-size:22px; flex-shrink:0; position:relative; z-index:1;
        }
        .pf-header-text { position:relative; z-index:1; }
        .pf-header-text h1 { font-size:20px; font-weight:800; color:#fff; margin:0 0 3px; letter-spacing:-0.3px; }
        .pf-header-text p  { font-size:12.5px; color:rgba(255,255,255,0.7); margin:0; }

        .pf-body { padding: 2rem; }

        .pf-section {
          font-size:10.5px; font-weight:800;
          text-transform:uppercase; letter-spacing:0.1em;
          color:#3b82f6; margin:0 0 12px;
          display:flex; align-items:center; gap:8px;
        }
        .pf-section::after { content:''; flex:1; height:1px; background:#e8f0fe; }

        .pf-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px; }
        .pf-field  { margin-bottom:12px; }

        .pf-label {
          display:block; font-size:11px; font-weight:700;
          text-transform:uppercase; letter-spacing:0.07em;
          color:#94a3b8; margin-bottom:6px;
        }

        .pf-input, .pf-select {
          width:100%; padding:12px 14px 12px 42px;
          border-radius:12px; border:1.5px solid #e2e8f0;
          background:#f8faff;
          font-family:'Plus Jakarta Sans',sans-serif;
          font-size:14px; font-weight:500; color:#1e293b;
          outline:none; box-sizing:border-box;
          transition:all 0.22s; appearance:none;
        }
        .pf-input::placeholder { color:#c4cdd6; font-weight:400; }
        .pf-input:hover,.pf-select:hover { border-color:#bfdbfe; background:#f0f6ff; }
        .pf-input:focus,.pf-select:focus {
          border-color:#3b82f6; background:#fff;
          box-shadow:0 0 0 4px rgba(59,130,246,0.1);
        }
        .pf-input-wrap  { position:relative; }
        .pf-input-icon  {
          position:absolute; left:13px; top:50%;
          transform:translateY(-50%); font-size:15px;
          pointer-events:none; transition:transform 0.2s;
        }
        .pf-input-wrap:focus-within .pf-input-icon { transform:translateY(-50%) scale(1.15); }

        .pf-select-wrap { position:relative; }
        .pf-select-arrow {
          position:absolute; right:14px; top:50%;
          transform:translateY(-50%);
          pointer-events:none; font-size:11px; color:#94a3b8;
        }
        .pf-select { padding-right:36px; }

        .pf-prefix {
          position:absolute; left:0; top:0; bottom:0;
          width:42px; display:flex; align-items:center; justify-content:center;
          border-right:1.5px solid #e2e8f0; border-radius:12px 0 0 12px;
          background:#f1f5f9; font-size:13px; font-weight:700;
          color:#64748b; pointer-events:none; transition:all 0.22s;
        }
        .pf-input-wrap:focus-within .pf-prefix { border-right-color:#bfdbfe; background:#eff6ff; color:#3b82f6; }

        /* GST disabled notice */
        .pf-gst-disabled {
          display:flex; align-items:center; gap:8px;
          padding:10px 14px; border-radius:12px;
          background:#f8faff; border:1.5px dashed #e2e8f0;
          font-size:12.5px; color:#94a3b8; font-weight:500;
        }

        /* GST loading shimmer */
        .pf-skel {
          height:46px; border-radius:12px;
          background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);
          background-size:200% 100%;
          animation:pfSkel 1.4s ease infinite;
        }
        @keyframes pfSkel{0%{background-position:200%}100%{background-position:-200%}}

        .pf-divider { height:1px; background:#f1f5f9; margin:1.5rem 0; }

        .pf-barcode-row { display:flex; gap:10px; margin-bottom:14px; align-items:flex-end; }
        .pf-barcode-input-wrap { flex:1; }
        .pf-gen-btn {
          padding:12px 18px; border-radius:12px; border:none;
          cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif;
          font-size:12.5px; font-weight:700; white-space:nowrap;
          background:linear-gradient(135deg,#6366f1,#818cf8);
          color:#fff; box-shadow:0 4px 14px rgba(99,102,241,0.35);
          transition:all 0.2s;
        }
        .pf-gen-btn:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(99,102,241,0.45); }

        .pf-barcode-preview {
          background:#f8faff; border-radius:14px;
          border:1.5px solid #e2e8f0;
          padding:16px; text-align:center;
          animation:pfBarIn 0.3s ease both;
        }
        @keyframes pfBarIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
        .pf-barcode-label {
          font-size:10.5px; font-weight:700;
          text-transform:uppercase; letter-spacing:0.08em;
          color:#94a3b8; margin-bottom:8px;
        }

        .pf-submit {
          width:100%; padding:15px; border-radius:14px; border:none; cursor:pointer;
          font-family:'Plus Jakarta Sans',sans-serif; font-size:15px; font-weight:800;
          background:linear-gradient(135deg,#1e40af 0%,#2563eb 55%,#3b82f6 100%);
          color:#fff; box-shadow:0 4px 18px rgba(37,99,235,0.38);
          position:relative; overflow:hidden;
          display:flex; align-items:center; justify-content:center; gap:8px;
          transition:all 0.25s;
        }
        .pf-submit::after {
          content:''; position:absolute; inset:0;
          background:linear-gradient(180deg,rgba(255,255,255,0.12) 0%,transparent 60%);
          pointer-events:none;
        }
        .pf-submit:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 10px 28px rgba(37,99,235,0.45); }
        .pf-submit:active:not(:disabled){ transform:translateY(0); }
        .pf-submit:disabled { opacity:0.6; cursor:not-allowed; }

        .pf-cancel {
          width:100%; margin-top:10px; padding:12px;
          border-radius:12px; border:1.5px solid #e2e8f0;
          background:transparent; font-family:'Plus Jakarta Sans',sans-serif;
          font-size:13.5px; font-weight:600; color:#94a3b8;
          cursor:pointer; transition:all 0.2s;
        }
        .pf-cancel:hover { background:#f8fafc; color:#475569; border-color:#cbd5e1; }

        .pf-spinner {
          width:17px;height:17px;
          border:2.5px solid rgba(255,255,255,0.3);
          border-top-color:#fff; border-radius:50%;
          animation:spin 0.7s linear infinite; flex-shrink:0;
        }
        @keyframes spin{to{transform:rotate(360deg)}}

        /* GST badge */
        .pf-gst-badge {
          display:inline-flex; align-items:center; gap:5px;
          padding:3px 10px; border-radius:100px;
          font-size:10.5px; font-weight:700;
          margin-left:8px;
        }
        .pf-gst-badge.on  { background:#dcfce7; color:#15803d; border:1px solid #bbf7d0; }
        .pf-gst-badge.off { background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; }

        /* ── Toast ── */
        .pf-toast {
          pointer-events:auto; display:flex; align-items:center; gap:11px;
          min-width:280px; max-width:360px; padding:12px 15px; border-radius:15px;
          position:relative; overflow:hidden; box-shadow:0 8px 28px rgba(0,0,0,0.12);
          animation:pfToastIn 0.4s cubic-bezier(0.22,1,0.36,1) both;
          font-family:'Plus Jakarta Sans',sans-serif;
        }
        @keyframes pfToastIn{from{opacity:0;transform:translateX(60px) scale(0.9)}to{opacity:1;transform:translateX(0) scale(1)}}
        .pf-toast-success{background:#f0fdf4;border:1px solid #bbf7d0;}
        .pf-toast-error  {background:#fff1f2;border:1px solid #fecdd3;}
        .pf-toast-warn   {background:#fffbeb;border:1px solid #fde68a;}
        .pf-toast-icon{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;flex-shrink:0;}
        .pf-toast-success .pf-toast-icon{background:#dcfce7;color:#16a34a;}
        .pf-toast-error   .pf-toast-icon{background:#ffe4e6;color:#e11d48;}
        .pf-toast-warn    .pf-toast-icon{background:#fef9c3;color:#b45309;}
        .pf-toast-body{flex:1;}
        .pf-toast-title{font-size:13px;font-weight:700;margin:0 0 2px;}
        .pf-toast-success .pf-toast-title{color:#15803d;}
        .pf-toast-error   .pf-toast-title{color:#be123c;}
        .pf-toast-warn    .pf-toast-title{color:#92400e;}
        .pf-toast-msg{font-size:12px;margin:0;}
        .pf-toast-success .pf-toast-msg{color:#16a34a;}
        .pf-toast-error   .pf-toast-msg{color:#e11d48;}
        .pf-toast-warn    .pf-toast-msg{color:#b45309;}
        .pf-toast-x{background:none;border:none;cursor:pointer;font-size:12px;opacity:0.4;transition:opacity 0.2s;flex-shrink:0;padding:2px;}
        .pf-toast-x:hover{opacity:0.9;}
        .pf-toast-bar{position:absolute;bottom:0;left:0;height:3px;animation:pfShrink 3.6s linear forwards;}
        .pf-toast-success .pf-toast-bar{background:#4ade80;}
        .pf-toast-error   .pf-toast-bar{background:#fb7185;}
        .pf-toast-warn    .pf-toast-bar{background:#fbbf24;}
        @keyframes pfShrink{from{width:100%}to{width:0%}}

        /* GST slide-in animation */
        .pf-gst-field {
          animation: pfFadeIn 0.3s ease both;
        }
        @keyframes pfFadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <ToastPortal toasts={toasts} remove={remove} />

      <div className="pf-page">
        <div className="pf-deco pf-deco-1" />
        <div className="pf-deco pf-deco-2" />

        <div className="pf-card">
          <div className="pf-stripe" />

          {/* Header */}
          <div className="pf-header">
            <div className="pf-header-icon">📦</div>
            <div className="pf-header-text">
              <h1>Add Product</h1>
              <p>Fill in the details to create a new product</p>
            </div>
          </div>

          

          <div className="pf-body">

            {/* ── Basic Info ── */}
            <p className="pf-section">Basic Info</p>

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
  <span style={{marginRight:"10px",fontSize:"18px"}}>🏢</span>

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

    {companies.map((c)=>(
      <option key={c.id} value={c.id}>
        {c.company_name}
      </option>
    ))}
  </select>
</div>

<div className="pf-field">
  <label className="pf-label">
    Supplier <span style={{fontSize:"9.5px", textTransform:"none", color:"#94a3b8"}}>(Optional)</span>
  </label>

  <div className="pf-select-wrap pf-input-wrap">
    <span className="pf-input-icon">🚚</span>

    <select
      className="pf-select"
      value={form.supplier_id}
      onChange={(e)=>set("supplier_id",e.target.value)}
      disabled={!selectedCompany}
    >
      <option value="">
        {selectedCompany
          ? "Select Supplier"
          : "Select Company First"}
      </option>

      {suppliers.map((s)=>(
        <option key={s.id} value={s.id}>
          {s.supplier_name}
        </option>
      ))}
    </select>

    <span className="pf-select-arrow">▾</span>
  </div>
</div>

            <div className="pf-field">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <label className="pf-label" style={{ margin: 0 }}>Product Name <span style={{color:"#ef4444"}}>*</span></label>
                <button
                  type="button"
                  onClick={handleAiAutoFill}
                  disabled={aiLoading}
                  style={{
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "3px 9px",
                    fontSize: "11px",
                    fontWeight: "700",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(99,102,241,0.25)"
                  }}
                >
                  {aiLoading ? "✨ Thinking..." : "✨ AI Auto-Fill"}
                </button>
              </div>
              <div className="pf-input-wrap">
                <span className="pf-input-icon">🏷️</span>
                <input className="pf-input" placeholder="e.g. Bisleri Water 1L"
                  value={form.name}
                  onChange={e => set("name", e.target.value)} />
              </div>
            </div>

            <div className="pf-field">
              <label className="pf-label">HSN / Product Code</label>
              <div className="pf-input-wrap">
                <span className="pf-input-icon">🔢</span>
                <input
                  className="pf-input"
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

            {/* Category selection + Inline Creation */}
            <div className="pf-field">
              <label className="pf-label">Category <span style={{color:"#ef4444"}}>*</span></label>
              <div className="pf-select-wrap pf-input-wrap">
                <span className="pf-input-icon">🗂️</span>
                <select
                  className="pf-select"
                  value={form.category_id}
                  onChange={(e) => {
                    const categoryId = e.target.value;
                    set("category_id", categoryId);
                    set("subcategory_id", "");
                    set("brand_id", "");
                    if (categoryId !== "NEW_CATEGORY") {
                      fetchSubCategories(selectedCompany, categoryId);
                    } else {
                      setSubCategories([]);
                    }
                    setBrands([]);
                  }}
                >
                  <option value="">Select a category...</option>
                  <option value="NEW_CATEGORY" style={{ fontWeight: "700", color: "#4f46e5" }}>
                    + Create New Category...
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <span className="pf-select-arrow">▾</span>
              </div>
              {form.category_id === "NEW_CATEGORY" && (
                <div className="pf-input-wrap" style={{ marginTop: "8px", animation: "pfFadeIn 0.3s ease both" }}>
                  <span className="pf-input-icon">✨</span>
                  <input
                    className="pf-input"
                    placeholder="Enter new category name (e.g. Beverages)"
                    value={form.new_category_name}
                    onChange={e => set("new_category_name", e.target.value)}
                    style={{ borderColor: "#6366f1", background: "#f5f3ff" }}
                  />
                </div>
              )}
            </div>

            {/* Subcategory selection + Inline Creation */}
            <div className="pf-field">
              <label className="pf-label">Sub Category</label>
              <div className="pf-select-wrap pf-input-wrap">
                <span className="pf-input-icon">📂</span>
                <select
                  className="pf-select"
                  value={form.subcategory_id}
                  onChange={(e) => {
                    const subId = e.target.value;
                    set("subcategory_id", subId);
                    set("brand_id", "");
                    if (subId !== "NEW_SUBCATEGORY") {
                      fetchBrands(selectedCompany, form.category_id, subId);
                    } else {
                      setBrands([]);
                    }
                  }}
                >
                  <option value="">Select Sub Category</option>
                  <option value="NEW_SUBCATEGORY" style={{ fontWeight: "700", color: "#4f46e5" }}>
                    + Create New Subcategory...
                  </option>
                  {subCategories.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <span className="pf-select-arrow">▾</span>
              </div>
              {form.subcategory_id === "NEW_SUBCATEGORY" && (
                <div className="pf-input-wrap" style={{ marginTop: "8px", animation: "pfFadeIn 0.3s ease both" }}>
                  <span className="pf-input-icon">✨</span>
                  <input
                    className="pf-input"
                    placeholder="Enter new sub-category name (e.g. Soft Drinks)"
                    value={form.new_subcategory_name}
                    onChange={e => set("new_subcategory_name", e.target.value)}
                    style={{ borderColor: "#6366f1", background: "#f5f3ff" }}
                  />
                </div>
              )}
            </div>

            {/* Brand selection + Inline Creation */}
            <div className="pf-field">
              <label className="pf-label">Brand</label>
              <div className="pf-select-wrap pf-input-wrap">
                <span className="pf-input-icon">🏷️</span>
                <select
                  className="pf-select"
                  value={form.brand_id}
                  onChange={(e) => set("brand_id", e.target.value)}
                >
                  <option value="">Select Brand</option>
                  <option value="NEW_BRAND" style={{ fontWeight: "700", color: "#4f46e5" }}>
                    + Create New Brand...
                  </option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <span className="pf-select-arrow">▾</span>
              </div>
              {form.brand_id === "NEW_BRAND" && (
                <div className="pf-input-wrap" style={{ marginTop: "8px", animation: "pfFadeIn 0.3s ease both" }}>
                  <span className="pf-input-icon">✨</span>
                  <input
                    className="pf-input"
                    placeholder="Enter new brand name (e.g. Coca Cola)"
                    value={form.new_brand_name}
                    onChange={e => set("new_brand_name", e.target.value)}
                    style={{ borderColor: "#6366f1", background: "#f5f3ff" }}
                  />
                </div>
              )}
            </div>



            {/* ── Pricing & Stock ── */}
            <p className="pf-section" style={{marginTop:"1.25rem"}}>Pricing & Stock</p>

            <div className="pf-grid-2">
              <div>
                <label className="pf-label">Price (₹) <span style={{color:"#ef4444"}}>*</span></label>
                <div className="pf-input-wrap">
                  <span className="pf-prefix">₹</span>
                  <input type="number" className="pf-input" placeholder="0.00"
                    value={form.price}
                    onChange={e => set("price", e.target.value)} />
                </div>
              </div>
              <div>
                <label className="pf-label">Stock Qty <span style={{color:"#ef4444"}}>*</span></label>
                <div className="pf-input-wrap">
                  <span className="pf-input-icon">📦</span>
                  <input type="number" className="pf-input" placeholder="0"
                    value={form.stock}
                    onChange={e => set("stock", e.target.value)} />
                </div>
              </div>
            </div>

            {/* <div className="pf-field">
              <label className="pf-label">Unit <span style={{color:"#ef4444"}}>*</span></label>
              <div className="pf-input-wrap">
                <span className="pf-input-icon">📏</span>
                <input
                  className="pf-input"
                  placeholder="e.g. kg / litre / piece"
                  value={form.unit}
                  onChange={e => set("unit", e.target.value)}
                />
              </div>
            </div>  */}

            <div className="pf-field">
  <label className="pf-label">
    Unit <span style={{ color: "#ef4444" }}>*</span>
  </label>

  <div className="pf-select-wrap pf-input-wrap">
    <span className="pf-input-icon">📏</span>

    <select
      className="pf-select"
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

    <span className="pf-select-arrow">▾</span>
  </div>
</div>

            {/* ── GST (conditional) ── */}
            <div className="pf-field">
              <label className="pf-label">
                GST
                {!gstLoading && (
                  <span className={`pf-gst-badge ${gstEnabled ? "on" : "off"}`}>
                    {gstEnabled ? "✓ Enabled" : "✕ Disabled"}
                  </span>
                )}
              </label>

              {gstLoading ? (
                <div className="pf-skel" />
              ) : gstEnabled ? (
                <div className="pf-input-wrap pf-gst-field">
                  <span className="pf-input-icon" style={{fontWeight:700, fontSize:13, color:"#64748b"}}>%</span>
                  <input
                    type="number"
                    className="pf-input"
                    placeholder="Enter GST % (e.g. 18)"
                    value={form.gst}
                    min="0"
                    max="100"
                    onChange={e => set("gst", e.target.value)}
                  />
                </div>
              ) : (
                <div className="pf-gst-disabled">
                  <span>🚫</span>
                  <span>GST not applicable for this company (without GST plan)</span>
                </div>
              )}
            </div>

            {/* ── Barcode ── */}
            <div className="pf-divider" />
            <p className="pf-section">Barcode</p>

            <div className="pf-barcode-row">
              <div className="pf-barcode-input-wrap">
                <label className="pf-label">Barcode Number</label>
                <div className="pf-input-wrap">
                  <span className="pf-input-icon">｜｜</span>
                  <input className="pf-input" placeholder="Enter or auto-generate"
                    value={form.barcode}
                    onChange={e => set("barcode", e.target.value)} />
                </div>
              </div>
              <button className="pf-gen-btn" onClick={generateBarcode}>⚡ Auto</button>
            </div>

            {form.barcode && (
              <div className="pf-barcode-preview" key={barcodeKey}>
                <p className="pf-barcode-label">Barcode Preview</p>
                <Barcode value={form.barcode} height={55} fontSize={13} margin={0} />
              </div>
            )}

            <div className="pf-divider" />

            <button className="pf-submit" onClick={handleSubmit} disabled={loading || gstLoading}>
              {loading
                ? <><div className="pf-spinner" /> Saving product…</>
                : <>💾 Save Product</>
              }
            </button>
            <button className="pf-cancel" onClick={() => navigate("/products")}>
              Cancel
            </button>

          </div>
        </div>
      </div>
    </>
  );
}