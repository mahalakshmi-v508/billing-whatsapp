// import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import api from "../../services/api";
// import * as XLSX from "xlsx";
// import { saveAs } from "file-saver";
// import {
//   Pencil, Search, Phone, MapPin, Download, Wallet,
//   CheckCircle, ChevronRight, IndianRupee, X,  MessageCircle
// } from "lucide-react";

// /* ─────────────────── helpers ─────────────────── */
// const fmt = (n) => Number(n || 0).toLocaleString("en-IN");

// const formatDate = (date) => {
//   if (!date) return "-";
//   return new Date(date.replace(" ", "T")).toLocaleDateString("en-IN", {
//     day: "2-digit", month: "short", year: "numeric",
//   });
// };

// /* Smart FIFO distribution */
// const distributePayment = (pendingInvoices, totalAmount) => {
//   let remaining = Number(totalAmount);
//   return pendingInvoices.map((inv) => {
//     const bal = Number(inv.balance_amount);
//     if (remaining <= 0) return { ...inv, _applying: 0, _newBalance: bal };
//     const applying = Math.min(remaining, bal);
//     remaining -= applying;
//     return { ...inv, _applying: applying, _newBalance: bal - applying };
//   });
// };

// /* ─────────────────── component ─────────────────── */
// export default function CustomerList() {
//   const navigate = useNavigate();

//   const [customers, setCustomers]             = useState([]);
//   const [search, setSearch]                   = useState("");
//   const [selectedCustomer, setSelectedCustomer] = useState(null);
//   const [invoiceHistory, setInvoiceHistory]   = useState([]);
//   const [allHistory, setAllHistory]           = useState([]);
//   const [toast, setToast]                     = useState(null);

//   /* collect popup */
//   const [showCollect, setShowCollect]         = useState(false);
//   const [collectAmount, setCollectAmount]     = useState("");
//   const [collectMethod, setCollectMethod]     = useState("cash");
//   const [collecting, setCollecting]           = useState(false);
//   const [preview, setPreview]                 = useState([]);
//   const [sendingReminder, setSendingReminder] = useState({});
// const WHATSAPP_TEMPLATE = "hello_world";

// const [companies, setCompanies] = useState([]);
// const [selectedCompany, setSelectedCompany] = useState("");
// const user = JSON.parse(localStorage.getItem("user"));
// const admin_id = user?.id;



// const loadCompanies = async () => {

//   try {

//     const user = JSON.parse(
//       localStorage.getItem("user")
//     );

//     const res = await api.get(
//       `/company/get_companies_by_admin?admin_id=${user.id}`
//     );

//     if (res.data.status) {

//       setCompanies(res.data.data);

//     }

//   } catch (err) {

//     console.log(err);

//   }

// };


//   /* ── toast ── */
//   const showToast = (msg, ok = true) => {
//     setToast({ msg, ok });
//     setTimeout(() => setToast(null), 3000);
//   };

// const fetchCustomers = async () => {
//   try {
//     const res = await api.get(
//       `/customer/get_all_customer?admin_id=${admin_id}`
//     );
//     if (res.data.status) {
//       setCustomers(res.data.data);
//       if (res.data.data.length > 0) {
//         setSelectedCustomer(res.data.data[0]);
//         fetchCustomerHistory(res.data.data[0].id);
//       }
//     }
//   } catch (err) { console.log(err); }
// };


// // fetchAllHistory — use admin_id
// const fetchAllHistory = async () => {
//   try {
//     const res = await api.post("/invoice/get_pending_invoice_history", {
//       admin_id  // ← changed from company_id
//     });
//     if (res.data.status) setAllHistory(res.data.data);
//   } catch (err) { console.log(err); }
// };

// // fetchCustomerHistory — use admin_id
// const fetchCustomerHistory = async (customerId) => {
//   try {
//     const res = await api.post("/invoice/get_pending_invoice_history", {
//       admin_id
//     });
//     if (res.data.status) {
//       setInvoiceHistory(
//         res.data.data.filter(
//           (item) => Number(item.customer_id) === Number(customerId)
//         )
//       );
//     }
//   } catch (err) { console.log(err); }
// };



// const handleCompanyChange = async (e) => {

//   const companyId = e.target.value;

//   setSelectedCompany(companyId);

//   localStorage.setItem(
//     "selected_company_id",
//     companyId
//   );

//   fetchCustomers(companyId);

//   fetchAllHistory(companyId);

// };

// useEffect(() => {
//   fetchCustomers();
//   fetchAllHistory();
// }, []);


//   /* ── preview recalc ── */
//   useEffect(() => {
//     const pending = invoiceHistory.filter((i) => Number(i.balance_amount) > 0);
//     if (!collectAmount || Number(collectAmount) <= 0) { setPreview([]); return; }
//     setPreview(distributePayment(pending, collectAmount));
//   }, [collectAmount, invoiceHistory]);

//   /* ── derived ── */
//   const getCustomerPendingTotal = (customerId) =>
//     allHistory
//       .filter((i) => Number(i.customer_id) === Number(customerId))
//       .reduce((s, i) => s + Number(i.balance_amount || 0), 0);

//   const pendingInvoices = invoiceHistory.filter((i) => Number(i.balance_amount) > 0);
//   const totalPending    = pendingInvoices.reduce((s, i) => s + Number(i.balance_amount), 0);

//   /* ── open popup ── */
//   const openCollect = () => {
//     setCollectAmount("");
//     setCollectMethod("cash");
//     setPreview([]);
//     setShowCollect(true);
//   };

//   /* ── bulk collect ── */
//   const handleBulkCollect = async () => {
//     if (!collectAmount || Number(collectAmount) <= 0) { showToast("Enter a valid amount", false); return; }
//     if (Number(collectAmount) > totalPending)          { showToast("Amount exceeds total pending", false); return; }

//     setCollecting(true);
//     const toUpdate = distributePayment(pendingInvoices, collectAmount).filter((i) => i._applying > 0);

//     try {
//       for (const inv of toUpdate) {
//         await api.post("/invoice/update_credit_payment", {
//           invoice_id:     inv.id,
//           amount:         inv._applying,
//           payment_method: collectMethod,
//         });
//       }
//       showToast("Payment collected successfully", true);
//       setShowCollect(false);
//       setCollectAmount("");
//       setPreview([]);
//       fetchCustomerHistory(selectedCustomer.id);
//       fetchAllHistory();
//     } catch {
//       showToast("Server error, please retry", false);
//     } finally {
//       setCollecting(false);
//     }
//   };

//   /* ── excel ── */
//   const downloadExcel = () => {
//     const rows = invoiceHistory.map((item) => ({
//       "Payment Method": item.payment_method || "-",
//       Total: item.total_amount, Paid: item.paid_amount_total,
//       Pending: item.balance_amount,
//       "Due Date": item.due_date ? formatDate(item.due_date) : "-",
//       Status: Number(item.balance_amount) <= 0 ? "Paid" : "Not Paid",
//     }));
//     const ws = XLSX.utils.json_to_sheet(rows);
//     ws["!cols"] = [18,15,15,15,18,18].map((w) => ({ wch: w }));
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, "Customer Report");
//     const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
//     saveAs(
//       new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
//       `${selectedCustomer?.name || "customer"}_report.xlsx`
//     );
//   };

//   const sendReminder = async (
//   invoiceNo,
//   phone,
//   name,
//   amount,
//   dueDate
// ) => {

//   setSendingReminder(prev => ({
//     ...prev,
//     [invoiceNo]: true
//   }));

//   try {

//     const res = await api.post(
//       "/whatsapp/send_reminder",
//       {
//         invoice_no: invoiceNo,
//         phone,
//         name,
//         amount,
//         due_date: dueDate,
//         template_name: WHATSAPP_TEMPLATE
//       }
//     );

//     if (
//       res.data &&
//       !res.data.error &&
//       (res.data.messages || res.data.status === true)
//     ) {

//       showToast("WhatsApp reminder sent successfully.");

//     } else if (res.data.error) {

//       showToast(
//         res.data.error.message,
//         false
//       );

//     } else {

//       showToast(
//         "Failed to send reminder.",
//         false
//       );

//     }

//   } catch (err) {

//     showToast(
//       err.response?.data?.message ||
//       "Unable to send WhatsApp reminder.",
//       false
//     );

//   } finally {

//     setSendingReminder(prev => ({
//       ...prev,
//       [invoiceNo]: false
//     }));

//   }

// };

//   const filtered = customers.filter(
//     (c) => c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)
//   );

//   /* ════════════════════════════════════════════ */
//   return (
//     <>
//       <style>{`
//         @keyframes toastIn  { from{opacity:0;transform:translateY(-10px) scale(.95)} to{opacity:1;transform:translateY(0) scale(1)} }
//         @keyframes fadeUp   { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
//         @keyframes popIn    { from{opacity:0;transform:scale(.94) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
//         .cust-row:hover     { background:#f8fafc !important; }
//         .collect-btn:hover  { background:#1d4ed8 !important; transform:translateY(-1px); }
//         .method-btn:hover   { border-color:#2563eb !important; color:#2563eb !important; }
//         .quick-btn:hover    { background:#dbeafe !important; }
//         .close-btn:hover    { background:#f1f5f9 !important; }
//       `}</style>

//       {/* ── TOAST ── */}
//       {toast && (
//         <div style={{
//           position:"fixed", top:20, right:20, zIndex:99999,
//           background: toast.ok ? "linear-gradient(135deg,#2563eb,#3b82f6)" : "linear-gradient(135deg,#dc2626,#ef4444)",
//           color:"#fff", padding:"13px 20px", borderRadius:14,
//           boxShadow:"0 10px 30px rgba(0,0,0,.2)",
//           display:"flex", alignItems:"center", gap:10,
//           fontWeight:600, fontSize:14, animation:"toastIn .25s ease"
//         }}>
//           <div style={{
//             width:22, height:22, borderRadius:7, background:"rgba(255,255,255,.22)",
//             display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700
//           }}>
//             {toast.ok ? "✓" : "✕"}
//           </div>
//           {toast.msg}
//         </div>
//       )}

// {/* ── COLLECT PAYMENT POPUP ── */}
//       {showCollect && (
//         <div
//           onClick={(e) => { if (e.target === e.currentTarget) setShowCollect(false); }}
//           style={{
//             position:"fixed", inset:0, zIndex:9999,
//             background:"rgba(15,23,42,.55)",
//             backdropFilter:"blur(4px)",
//             display:"flex", alignItems:"center", justifyContent:"center",
//             padding:20
//           }}
//         >
//           <div style={{
//             background:"#fff", borderRadius:20,
//             width:"100%", maxWidth:480,
//             maxHeight:"90vh",
//             display:"flex", flexDirection:"column",
//             boxShadow:"0 24px 64px rgba(0,0,0,.22)",
//             animation:"popIn .25s cubic-bezier(.34,1.56,.64,1)",
//             overflow:"hidden"
//           }}>

//             {/* STICKY HEADER - never scrolls */}
//             <div style={{
//               background:"linear-gradient(135deg,#1e3a8a,#2563eb)",
//               padding:"20px 24px",
//               display:"flex", justifyContent:"space-between", alignItems:"center",
//               flexShrink:0
//             }}>
//               <div>
//                 <div style={{ display:"flex", alignItems:"center", gap:10, color:"#fff", fontWeight:800, fontSize:17 }}>
//                   <Wallet size={20}/> Collect Payment
//                 </div>
//                 <div style={{ color:"rgba(255,255,255,.7)", fontSize:13, marginTop:3 }}>
//                   {selectedCustomer?.name}
//                 </div>
//               </div>
//               <button
//                 onClick={() => setShowCollect(false)}
//                 style={{
//                   width:36, height:36, borderRadius:10, border:"none",
//                   background:"rgba(255,255,255,.15)", color:"#fff",
//                   cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center"
//                 }}
//               >
//                 <X size={18}/>
//               </button>
//             </div>

//             {/* SCROLLABLE BODY */}
//             <div style={{ overflowY:"auto", flex:1, padding:"22px 24px" }}>

//               {/* total pending banner */}
//               <div style={{
//                 background:"linear-gradient(135deg,#fef2f2,#fff5f5)",
//                 border:"1px solid #fecaca", borderRadius:14,
//                 padding:"16px 20px", marginBottom:20,
//                 display:"flex", justifyContent:"space-between", alignItems:"center"
//               }}>
//                 <div>
//                   <div style={{ fontSize:11, fontWeight:700, color:"#dc2626", textTransform:"uppercase", letterSpacing:".6px" }}>
//                     Total Pending
//                   </div>
//                   <div style={{ fontSize:30, fontWeight:900, color:"#dc2626", marginTop:2 }}>
//                     ₹{fmt(totalPending)}
//                   </div>
//                 </div>
//                 <div style={{ textAlign:"right" }}>
//                   <div style={{ fontSize:11, color:"#ef4444", fontWeight:600 }}>
//                     {pendingInvoices.length} invoice{pendingInvoices.length !== 1 ? "s" : ""}
//                   </div>
//                   <div style={{ marginTop:6 }}>
//                     {pendingInvoices.map((inv, i) => {
//                       const prev     = preview.find((p) => p.id === inv.id);
//                       const applying = prev ? prev._applying : 0;
//                       return (
//                         <div key={i} style={{
//                           fontSize:11, color: applying > 0 ? "#16a34a" : "#94a3b8",
//                           fontWeight:600, textAlign:"right"
//                         }}>
//                           {applying > 0
//                             ? `✓ ₹${fmt(inv.balance_amount)} → ₹${fmt(Number(inv.balance_amount) - applying)}`
//                             : `₹${fmt(inv.balance_amount)} pending`}
//                         </div>
//                       );
//                     })}
//                   </div>
//                 </div>
//               </div>

//               {pendingInvoices.length === 0 ? (
//                 <div style={{ textAlign:"center", padding:"28px 0", color:"#64748b" }}>
//                   <CheckCircle size={44} style={{ color:"#86efac", marginBottom:10 }}/>
//                   <div style={{ fontWeight:700, fontSize:16, color:"#16a34a" }}>All Cleared!</div>
//                   <div style={{ fontSize:13, marginTop:4 }}>No pending payments</div>
//                 </div>
//               ) : (
//                 <>
//                   {/* pending breakdown list */}
//                   <div style={{ marginBottom:18 }}>
//                     <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".5px", marginBottom:8 }}>
//                       Pending Breakdown
//                     </div>
//                     <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
//                       {pendingInvoices.map((inv, i) => {
//                         const prev     = preview.find((p) => p.id === inv.id);
//                         const applying = prev ? prev._applying : 0;
//                         return (
//                           <div key={i} style={{
//                             display:"flex", justifyContent:"space-between", alignItems:"center",
//                             padding:"10px 14px", borderRadius:10,
//                             background: applying > 0 ? "#f0fdf4" : "#f8fafc",
//                             border: applying > 0 ? "1.5px solid #86efac" : "1.5px solid #f1f5f9",
//                             transition:"all .2s"
//                           }}>
//                             <div style={{ display:"flex", alignItems:"center", gap:10 }}>
//                               <div style={{
//                                 width:32, height:32, borderRadius:8,
//                                 background: applying > 0 ? "#dcfce7" : "#f1f5f9",
//                                 display:"flex", alignItems:"center", justifyContent:"center",
//                                 fontSize:12, fontWeight:800,
//                                 color: applying > 0 ? "#16a34a" : "#94a3b8"
//                               }}>
//                                 #{i + 1}
//                               </div>
//                               <div>
//                                 <div style={{ fontSize:13, fontWeight:700, color:"#0f172a", textTransform:"capitalize" }}>
//                                   {inv.payment_method || "Invoice"}
//                                 </div>
//                                 {inv.due_date && (
//                                   <div style={{ fontSize:11, color:"#94a3b8" }}>
//                                     Due: {formatDate(inv.due_date)}
//                                   </div>
//                                 )}
//                               </div>
//                             </div>
//                             <div style={{ textAlign:"right" }}>
//                               <div style={{ fontSize:14, fontWeight:800, color:"#dc2626" }}>
//                                 ₹{fmt(inv.balance_amount)}
//                               </div>
//                               {applying > 0 && (
//                                 <div style={{ fontSize:11, color:"#16a34a", fontWeight:700 }}>
//                                   −₹{fmt(applying)} → ₹{fmt(Number(inv.balance_amount) - applying)}
//                                 </div>
//                               )}
//                             </div>
//                           </div>
//                         );
//                       })}
//                     </div>
//                   </div>

//                   <div style={{ height:1, background:"#f1f5f9", marginBottom:18 }}/>

//                   {/* amount input */}
//                   <div style={{ marginBottom:14 }}>
//                     <label style={{ fontSize:12, fontWeight:700, color:"#374151", display:"block", marginBottom:7 }}>
//                       Amount to Collect
//                     </label>
//                     <div style={{ position:"relative" }}>
//                       <IndianRupee size={16} style={{
//                         position:"absolute", left:13, top:"50%",
//                         transform:"translateY(-50%)", color:"#94a3b8"
//                       }}/>
//                       <input
//                         type="number"
//                         placeholder="0"
//                         value={collectAmount}
//                         onChange={(e) => setCollectAmount(e.target.value)}
//                         autoFocus
//                         style={{
//                           width:"100%", padding:"13px 14px 13px 38px",
//                           borderRadius:12, border:"2px solid #dbeafe",
//                           outline:"none", fontSize:18, fontWeight:800,
//                           boxSizing:"border-box", color:"#0f172a",
//                           transition:"border-color .15s"
//                         }}
//                         onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
//                         onBlur={(e)  => (e.target.style.borderColor = "#dbeafe")}
//                       />
//                     </div>
//                     <div style={{ display:"flex", gap:8, marginTop:10 }}>
//                       {[25, 50, 100].map((pct) => {
//                         const val = Math.round(totalPending * pct / 100);
//                         return (
//                           <button key={pct} className="quick-btn"
//                             onClick={() => setCollectAmount(String(val))}
//                             style={{
//                               flex:1, padding:"8px 0", fontSize:12, fontWeight:700,
//                               background:"#eff6ff", color:"#2563eb",
//                               border:"1.5px solid #bfdbfe", borderRadius:9, cursor:"pointer",
//                               transition:"background .15s"
//                             }}
//                           >
//                             {pct}%<br/>
//                             <span style={{ fontWeight:600, fontSize:11 }}>₹{fmt(val)}</span>
//                           </button>
//                         );
//                       })}
//                       <button className="quick-btn"
//                         onClick={() => setCollectAmount(String(totalPending))}
//                         style={{
//                           flex:1, padding:"8px 0", fontSize:12, fontWeight:700,
//                           background:"#eff6ff", color:"#2563eb",
//                           border:"1.5px solid #bfdbfe", borderRadius:9, cursor:"pointer",
//                           transition:"background .15s"
//                         }}
//                       >
//                         Full<br/>
//                         <span style={{ fontWeight:600, fontSize:11 }}>₹{fmt(totalPending)}</span>
//                       </button>
//                     </div>
//                   </div>

//                   {/* payment method */}
//                   <div style={{ marginBottom:20 }}>
//                     <label style={{ fontSize:12, fontWeight:700, color:"#374151", display:"block", marginBottom:7 }}>
//                       Payment Method
//                     </label>
//                     <div style={{ display:"flex", gap:10 }}>
//                       {["cash", "online", "upi"].map((m) => (
//                         <button key={m} className="method-btn"
//                           onClick={() => setCollectMethod(m)}
//                           style={{
//                             flex:1, padding:"11px 0", fontSize:13, fontWeight:700,
//                             textTransform:"capitalize", borderRadius:11, cursor:"pointer",
//                             background: collectMethod === m ? "#2563eb" : "#fff",
//                             color:      collectMethod === m ? "#fff"    : "#64748b",
//                             border:     collectMethod === m ? "2px solid #2563eb" : "2px solid #e5e7eb",
//                             transition:"all .15s"
//                           }}
//                         >
//                           {m === "cash" ? "💵" : m === "online" ? "🏦" : "📱"} {m}
//                         </button>
//                       ))}
//                     </div>
//                   </div>

//                   {/* distribution preview */}
//                   {preview.filter((p) => p._applying > 0).length > 0 && (
//                     <div style={{
//                       background:"#f0fdf4", border:"1.5px solid #bbf7d0",
//                       borderRadius:12, padding:"14px 16px", marginBottom:20,
//                       animation:"fadeUp .2s ease"
//                     }}>
//                       <div style={{ fontSize:11, fontWeight:700, color:"#16a34a", marginBottom:10, textTransform:"uppercase", letterSpacing:".5px" }}>
//                         ✓ Payment Distribution
//                       </div>
//                       {preview.filter((p) => p._applying > 0).map((p, i) => (
//                         <div key={i} style={{
//                           display:"flex", justifyContent:"space-between",
//                           fontSize:13, color:"#166534", marginBottom:5, fontWeight:600
//                         }}>
//                           <span style={{ display:"flex", alignItems:"center", gap:6 }}>
//                             <ChevronRight size={13}/>
//                             <span style={{ textTransform:"capitalize" }}>{p.payment_method || "Invoice"}</span>
//                             <span style={{ color:"#86efac" }}>#{i + 1}</span>
//                           </span>
//                           <span>−₹{fmt(p._applying)}</span>
//                         </div>
//                       ))}
//                       <div style={{
//                         borderTop:"1.5px solid #86efac", marginTop:10, paddingTop:10,
//                         display:"flex", justifyContent:"space-between",
//                         fontWeight:800, fontSize:14, color:"#15803d"
//                       }}>
//                         <span>Remaining balance</span>
//                         <span>₹{fmt(Math.max(0, totalPending - Number(collectAmount)))}</span>
//                       </div>
//                     </div>
//                   )}
//                 </>
//               )}
//             </div>

//             {/* STICKY FOOTER - action buttons, never scrolls */}
//             {pendingInvoices.length > 0 && (
//               <div style={{
//                 padding:"16px 24px",
//                 borderTop:"1px solid #f1f5f9",
//                 display:"flex", gap:10,
//                 flexShrink:0,
//                 background:"#fff"
//               }}>
//                 <button
//                   onClick={() => setShowCollect(false)}
//                   style={{
//                     flex:1, padding:"13px 0", borderRadius:12,
//                     border:"2px solid #e5e7eb", background:"#fff",
//                     fontWeight:700, fontSize:14, cursor:"pointer", color:"#64748b"
//                   }}
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   className="collect-btn"
//                   onClick={handleBulkCollect}
//                   disabled={collecting}
//                   style={{
//                     flex:2, padding:"13px 0",
//                     background: collecting ? "#93c5fd" : "#2563eb",
//                     color:"#fff", border:"none", borderRadius:12,
//                     fontWeight:800, fontSize:14,
//                     cursor: collecting ? "not-allowed" : "pointer",
//                     display:"flex", alignItems:"center", justifyContent:"center", gap:8,
//                     boxShadow:"0 4px 16px rgba(37,99,235,.35)",
//                     transition:"all .15s"
//                   }}
//                 >
//                   <Wallet size={17}/>
//                   {collecting ? "Processing..." : "Collect Payment"}
//                 </button>
//               </div>
//             )}

//           </div>
//         </div>
//       )}

//       {/* ── MAIN ── */}
//       <div style={{ minHeight:"100vh", background:"#f1f5f9", padding:20, fontFamily:"Inter, sans-serif" }}>

//         {/* HEADER */}
//         <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
//           <div>
//             <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"#0f172a" }}>Customers</h2>
//             <p style={{ margin:"3px 0 0", color:"#64748b", fontSize:13 }}>Manage your customers & payments</p>
//           </div>





//           <div style={{ display:"flex", gap:10, alignItems:"center" }}>
//             <button onClick={downloadExcel} style={btnGreen}>
//               <Download size={15}/> Excel Download
//             </button>
//             <button onClick={() => navigate("/customer/add")} style={btnRed}>
//               + Add Customer
//             </button>
//           </div>
//         </div>

//         {/* 2-COLUMN LAYOUT */}
//         <div style={{
//           display:"grid",
//           gridTemplateColumns:"300px 1fr",
//           gap:16,
//           height:"calc(100vh - 120px)"
//         }}>

//           {/* ── LEFT ── */}
//           <div style={card}>
//             <div style={{ padding:"12px 14px", borderBottom:"1px solid #f1f5f9", position:"relative" }}>
//               <Search size={15} style={{ position:"absolute", top:"50%", left:26, transform:"translateY(-50%)", color:"#94a3b8" }}/>
//               <input
//                 placeholder="Search customer..."
//                 value={search}
//                 onChange={(e) => setSearch(e.target.value)}
//                 style={{
//                   width:"100%", padding:"9px 12px 9px 34px",
//                   borderRadius:10, border:"1px solid #e2e8f0",
//                   outline:"none", fontSize:13, boxSizing:"border-box"
//                 }}
//               />
//             </div>
//             <div style={{ overflowY:"auto", flex:1 }}>
//               {filtered.map((c) => {
//                 const pt         = getCustomerPendingTotal(c.id);
//                 const isSelected = selectedCustomer?.id === c.id;
//                 return (
//                   <div key={c.id} className="cust-row"
//                  onClick={() => {
//   setSelectedCustomer(c);
//   fetchCustomerHistory(c.id);  // ← selectedCompany remove pannitu
//   setCollectAmount("");
//   setPreview([]);
// }}
//                     style={{
//                       padding:"12px 14px", borderBottom:"1px solid #f1f5f9",
//                       cursor:"pointer",
//                       background:  isSelected ? "#eff6ff" : "#fff",
//                       borderLeft:  isSelected ? "3px solid #2563eb" : "3px solid transparent",
//                       transition:"all .15s"
//                     }}
//                   >
//                     <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
//                       <div>
//                         <div style={{ fontWeight:700, fontSize:14, color:"#0f172a" }}>{c.name}</div>
//                         <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>{c.phone}</div>
//                       </div>
//                       <div style={{ fontWeight:700, fontSize:13, color: pt > 0 ? "#ef4444" : "#94a3b8" }}>
//                         ₹{fmt(pt)}
//                       </div>
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//           </div>

//           {/* ── RIGHT: invoice table ── */}
//           <div style={{ ...card, overflow:"hidden" }}>

//             {/* customer info + collect button */}
//             {selectedCustomer && (
//               <div style={{ padding:"16px 20px", borderBottom:"1px solid #f1f5f9" }}>
//                 <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
//                   <div>
//                     <div style={{ fontSize:20, fontWeight:800, color:"#0f172a", marginBottom:8 }}>
//                       {selectedCustomer.name}
//                     </div>
//                     <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:"#64748b", marginBottom:4 }}>
//                       <Phone size={13}/> {selectedCustomer.phone}
//                     </div>
//                     <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:"#64748b" }}>
//                       <MapPin size={13}/> {selectedCustomer.address}
//                     </div>
//                   </div>

//                   {/* RIGHT side: pending badge + collect button + edit */}
//                   <div style={{ display:"flex", alignItems:"center", gap:10 }}>

//                     {/* pending badge */}
//                     {totalPending > 0 && (
//                       <div style={{
//                         background:"#fef2f2", border:"1px solid #fecaca",
//                         borderRadius:12, padding:"8px 16px", textAlign:"center"
//                       }}>
//                         <div style={{ fontSize:10, fontWeight:700, color:"#dc2626", textTransform:"uppercase", letterSpacing:".5px" }}>
//                           Pending
//                         </div>
//                         <div style={{ fontSize:18, fontWeight:900, color:"#dc2626" }}>
//                           ₹{fmt(totalPending)}
//                         </div>
//                       </div>
//                     )}

//                     {/* collect button */}
//                     {totalPending > 0 && (
//                       <button
//                         onClick={openCollect}
//                         style={{
//                           background:"linear-gradient(135deg,#2563eb,#1d4ed8)",
//                           color:"#fff", border:"none", borderRadius:12,
//                           padding:"10px 18px", fontWeight:700, fontSize:13,
//                           cursor:"pointer", display:"flex", alignItems:"center", gap:7,
//                           boxShadow:"0 4px 14px rgba(37,99,235,.3)",
//                           transition:"all .15s"
//                         }}
//                         onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
//                         onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
//                       >
//                         <Wallet size={15}/> Collect Payment
//                       </button>
//                     )}

//                     <button onClick={() => navigate(`/customer/edit/${selectedCustomer.id}`)} style={btnEdit}>
//                       <Pencil size={15}/>
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             )}

//             {/* table header */}
//             <div style={{
//               display:"grid",
//               gridTemplateColumns:"1.2fr .8fr .8fr .8fr 1fr 1fr .9fr",
//               padding:"11px 20px",
//               background:"#f8fafc",
//               borderBottom:"1px solid #e5e7eb",
//               fontWeight:700, fontSize:12, color:"#64748b",
//               textTransform:"uppercase", letterSpacing:".5px",
//               textAlign:"center"
//             }}>
//               <span style={{ textAlign:"left" }}>Payment Method</span>
//               <span>Total</span>
//               <span>Paid</span>
//               <span>Pending</span>
//               <span>Due Date</span>
//               <span>Status</span>
//               <span>WhatsApp</span>
//             </div>

//             {/* rows */}
//             <div style={{ overflowY:"auto", flex:1 }}>
//               {invoiceHistory.length === 0 ? (
//                 <div style={{
//                   display:"flex", flexDirection:"column",
//                   alignItems:"center", justifyContent:"center",
//                   padding:48, color:"#94a3b8", textAlign:"center"
//                 }}>
//                   <div style={{ fontSize:52, marginBottom:14 }}>📄</div>
//                   <div style={{ fontWeight:700, fontSize:16, color:"#0f172a" }}>No Billing Records</div>
//                   <p style={{ fontSize:13, marginTop:6, maxWidth:300, lineHeight:1.6 }}>
//                     This customer has no billing or payment history yet.
//                   </p>
//                 </div>
//               ) : (
//                 invoiceHistory.map((item, index) => {
//                   const isPaid = Number(item.balance_amount) <= 0;
//                   return (
//                     <div key={index} style={{
//                       display:"grid",
//                       gridTemplateColumns:"1.2fr .8fr .8fr .8fr 1fr 1fr",
//                       padding:"14px 20px",
//                       alignItems:"center", textAlign:"center",
//                       borderBottom:"1px solid #f8fafc",
//                       background:"#fff"
//                     }}>
//                       <div style={{ textAlign:"left", fontWeight:600, fontSize:13, textTransform:"capitalize" }}>
//                         {item.payment_method || "-"}
//                       </div>
//                       <div style={{ fontSize:13 }}>₹{fmt(item.total_amount)}</div>
//                       <div style={{ fontWeight:700, color:"#16a34a", fontSize:13 }}>
//                         ₹{fmt(item.paid_amount_total)}
//                       </div>
//                       <div>
//                         <span style={{
//                           background: isPaid ? "#f0fdf4" : "#fee2e2",
//                           color:      isPaid ? "#16a34a" : "#dc2626",
//                           padding:"4px 10px", borderRadius:8, fontSize:12, fontWeight:700
//                         }}>
//                           ₹{fmt(item.balance_amount)}
//                         </span>
//                       </div>
//                       <div style={{ fontSize:13, color:"#64748b" }}>
//                         {item.due_date ? formatDate(item.due_date) : "-"}
//                       </div>
//                       <div>
//                         <span style={{
//                           padding:"5px 14px", borderRadius:20, fontSize:11, fontWeight:700,
//                           background: isPaid ? "#dcfce7" : "#fee2e2",
//                           color:      isPaid ? "#15803d" : "#dc2626",
//                           display:"inline-block", minWidth:72, textAlign:"center"
//                         }}>
//                           {isPaid ? "Paid" : "Not Paid"}
//                         </span>
//                       </div>
//                       <div>

// {Number(item.balance_amount) > 0 ? (

// <button
// onClick={() =>
// sendReminder(
// item.invoice_no,
// selectedCustomer.phone,
// selectedCustomer.name,
// item.balance_amount,
// item.due_date
// )
// }
// disabled={sendingReminder[item.invoice_no]}
// style={{
// background:
// sendingReminder[item.invoice_no]
// ? "#86efac"
// : "#22c55e",
// color:"#fff",
// border:"none",
// borderRadius:10,
// padding:"8px 14px",
// cursor:
// sendingReminder[item.invoice_no]
// ? "not-allowed"
// : "pointer",
// display:"flex",
// alignItems:"center",
// justifyContent:"center",
// gap:6,
// fontWeight:700
// }}
// >

// <MessageCircle size={16}/>

// {sendingReminder[item.invoice_no]
// ? "Sending..."
// : "Send"}

// </button>

// ) : (

// <span
// style={{
// color:"#9ca3af"
// }}
// >
// —
// </span>

// )}

// </div>
//                     </div>
//                   );
//                 })
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }

// const card = {
//   background:"#fff", borderRadius:14,
//   border:"1px solid #e5e7eb",
//   display:"flex", flexDirection:"column",
// };
// const btnGreen = {
//   background:"#16a34a", color:"#fff", border:"none",
//   borderRadius:10, padding:"10px 16px",
//   fontWeight:700, cursor:"pointer",
//   display:"flex", alignItems:"center", gap:7, fontSize:13
// };
// const btnRed = {
//   background:"#ef4444", color:"#fff", border:"none",
//   borderRadius:10, padding:"10px 16px",
//   fontWeight:700, cursor:"pointer", fontSize:13
// };
// const btnEdit = {
//   background:"#eff6ff", border:"1px solid #dbeafe",
//   width:44, height:44, borderRadius:12,
//   cursor:"pointer", color:"#2563eb",
//   display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0
// };




//whatsapp
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  Pencil, Search, Phone, MapPin, Download, Wallet,
  CheckCircle, ChevronRight, IndianRupee, X, MessageCircle, History
} from "lucide-react";

/* ─────────────────── helpers ─────────────────── */
const fmt = (n) => Number(n || 0).toLocaleString("en-IN");

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date.replace(" ", "T")).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

/* Smart FIFO distribution */
const distributePayment = (pendingInvoices, totalAmount) => {
  let remaining = Number(totalAmount);
  return pendingInvoices.map((inv) => {
    const bal = Number(inv.balance_amount);
    if (remaining <= 0) return { ...inv, _applying: 0, _newBalance: bal };
    const applying = Math.min(remaining, bal);
    remaining -= applying;
    return { ...inv, _applying: applying, _newBalance: bal - applying };
  });
};

/* ─────────────────── component ─────────────────── */
export default function CustomerList() {
  const navigate = useNavigate();

  const [customers, setCustomers]             = useState([]);
  const [search, setSearch]                   = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [invoiceHistory, setInvoiceHistory]   = useState([]);
  const [allHistory, setAllHistory]           = useState([]);
  const [toast, setToast]                     = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [paymentHistory, setPaymentHistory]     = useState([]);
  const [loadingHistory, setLoadingHistory]     = useState(false);

  /* collect popup */
  const [showCollect, setShowCollect]         = useState(false);
  const [collectAmount, setCollectAmount]     = useState("");
  const [collectMethod, setCollectMethod]     = useState("cash");
  const [collectDate, setCollectDate]         = useState(new Date().toISOString().split("T")[0]);
  const [collectNotes, setCollectNotes]       = useState("");
  const [collecting, setCollecting]           = useState(false);
  const [preview, setPreview]                 = useState([]);

  const [sendingReminder, setSendingReminder] = useState(false);

const [companies, setCompanies] = useState([]);
const [selectedCompany, setSelectedCompany] = useState("");
const user = JSON.parse(localStorage.getItem("user"));
const admin_id = user?.id;

const [selectedRows, setSelectedRows] = useState([]);


const loadCompanies = async () => {

  try {

    const user = JSON.parse(
      localStorage.getItem("user")
    );

    const res = await api.get(
      `/company/get_companies_by_admin?admin_id=${user.id}`
    );

    if (res.data.status) {

      setCompanies(res.data.data);

    }

  } catch (err) {

    console.log(err);

  }

};


  /* ── toast ── */
  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

const fetchCustomers = async () => {
  try {
    const res = await api.get(
      `/customer/get_all_customer?admin_id=${admin_id}`
    );
    if (res.data.status) {
      setCustomers(res.data.data);
      if (res.data.data.length > 0) {
        setSelectedCustomer(res.data.data[0]);
        fetchCustomerHistory(res.data.data[0].id);
      }
    }
  } catch (err) { console.log(err); }
};


// fetchAllHistory — use admin_id
const fetchAllHistory = async () => {
  try {
    const res = await api.get(`/invoice/get_pending_invoice_history?admin_id=${admin_id}`);
    if (res.data.status) setAllHistory(res.data.data);
  } catch (err) { console.log(err); }
};

// fetchCustomerHistory — use admin_id
const fetchCustomerHistory = async (customerId) => {
  try {
    const res = await api.get(`/invoice/get_pending_invoice_history?admin_id=${admin_id}`);
    if (res.data.status) {
      setInvoiceHistory(
        res.data.data.filter(
          (item) => Number(item.customer_id) === Number(customerId)
        )
      );
    }
  } catch (err) { console.log(err); }
};



const handleCompanyChange = async (e) => {

  const companyId = e.target.value;

  setSelectedCompany(companyId);

  localStorage.setItem(
    "selected_company_id",
    companyId
  );

  fetchCustomers(companyId);

  fetchAllHistory(companyId);

};

useEffect(() => {
  fetchCustomers();
  fetchAllHistory();
}, []);


  /* ── preview recalc ── */
  useEffect(() => {
    const pending = invoiceHistory.filter((i) => Number(i.balance_amount) > 0);
    // Sort oldest first (FIFO) for payment distribution preview
    const sortedPending = [...pending].sort((a, b) => {
      const da = new Date(a.created_at || a.invoice_date || 0);
      const db = new Date(b.created_at || b.invoice_date || 0);
      return da - db || a.id - b.id;
    });
    if (!collectAmount || Number(collectAmount) <= 0) { setPreview([]); return; }
    setPreview(distributePayment(sortedPending, collectAmount));
  }, [collectAmount, invoiceHistory]);

  /* ── derived ── */
  const getCustomerPendingTotal = (customerId) =>
    allHistory
      .filter((i) => Number(i.customer_id) === Number(customerId))
      .reduce((s, i) => s + Number(i.balance_amount || 0), 0);

  const pendingInvoices = invoiceHistory.filter((i) => Number(i.balance_amount) > 0);
  const totalPending    = pendingInvoices.reduce((s, i) => s + Number(i.balance_amount), 0);

  /* ── open popup ── */
  const openCollect = () => {
    setCollectAmount("");
    setCollectMethod("cash");
    setCollectDate(new Date().toISOString().split("T")[0]);
    setCollectNotes("");
    setPreview([]);
    setShowCollect(true);
  };

  /* ── bulk collect ── */
  const handleBulkCollect = async () => {
    if (!collectAmount || Number(collectAmount) <= 0) { showToast("Enter a valid amount", false); return; }

    setCollecting(true);
    try {
      const res = await api.post("/invoice/pay_customer_bulk", {
        company_id:     selectedCompany,
        customer_id:    selectedCustomer.id,
        amount:         Number(collectAmount),
        payment_method: collectMethod,
        payment_date:   collectDate,
        notes:          collectNotes,
      });

      if (res.data.status) {
        showToast("Payment collected successfully", true);
        setShowCollect(false);
        setCollectAmount("");
        setPreview([]);
        fetchCustomerHistory(selectedCustomer.id);
        fetchAllHistory();
      } else {
        showToast(res.data.message || "Failed to collect payment", false);
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Server error, please retry", false);
    } finally {
      setCollecting(false);
    }
  };

  // Open customer payment history modal
  const openCustomerHistoryModal = async (cust) => {
    setPaymentHistory([]);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/invoice/get_customer_payments?customer_id=${cust.id}`);
      if (res.data.status) {
        setPaymentHistory(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  /* ── excel ── */
const downloadExcel = () => {
  const source = selectedRows.length > 0
    ? invoiceHistory.filter((_, i) => selectedRows.includes(i))
    : invoiceHistory;

  const rows = source.map((item) => ({
    "Payment Method": item.payment_method || "-",
    Total: item.total_amount,
    Paid: item.paid_amount_total,
    Pending: item.balance_amount,
    "Due Date": item.due_date ? formatDate(item.due_date) : "-",
    Status: Number(item.balance_amount) <= 0 ? "Paid" : "Not Paid",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [18, 15, 15, 15, 18, 18].map((w) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Customer Report");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${selectedCustomer?.name || "customer"}_report.xlsx`
  );
};

  const filtered = customers.filter(
    (c) => c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)
  );



  const sendCustomerReminder = async () => {

  if (!selectedCustomer) return;

  const pendingInvoices = invoiceHistory.filter(
    item =>
      Number(item.balance_amount) > 0 &&
      item.payment_method === "credit"
  );

  if (pendingInvoices.length === 0) {
    showToast("No pending invoices found.", false);
    return;
  }

  setSendingReminder(true);

  try {

    for (const item of pendingInvoices) {

      await api.post("/whatsapp/send_reminder", {
        invoice_no: item.invoice_no,
        phone: selectedCustomer.phone,
        name: selectedCustomer.name,
        amount: item.balance_amount,
        due_date: item.due_date,
        template_name: "hello_world"
      });

    }

    showToast(
      `Reminder sent for ${pendingInvoices.length} pending invoice(s).`
    );

  } catch (err) {

    console.log(err);

    showToast(
      "Unable to send reminder.",
      false
    );

  } finally {

    setSendingReminder(false);

  }

};
  /* ════════════════════════════════════════════ */
  return (
    <>
      <style>{`
        @keyframes toastIn  { from{opacity:0;transform:translateY(-10px) scale(.95)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes popIn    { from{opacity:0;transform:scale(.94) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .cust-row:hover     { background:#f8fafc !important; }
        .collect-btn:hover  { background:#1d4ed8 !important; transform:translateY(-1px); }
        .method-btn:hover   { border-color:#2563eb !important; color:#2563eb !important; }
        .quick-btn:hover    { background:#dbeafe !important; }
        .close-btn:hover    { background:#f1f5f9 !important; }
      `}</style>

      {/* ── TOAST ── */}
      {toast && (
        <div style={{
          position:"fixed", top:20, right:20, zIndex:99999,
          background: toast.ok ? "linear-gradient(135deg,#2563eb,#3b82f6)" : "linear-gradient(135deg,#dc2626,#ef4444)",
          color:"#fff", padding:"13px 20px", borderRadius:14,
          boxShadow:"0 10px 30px rgba(0,0,0,.2)",
          display:"flex", alignItems:"center", gap:10,
          fontWeight:600, fontSize:14, animation:"toastIn .25s ease"
        }}>
          <div style={{
            width:22, height:22, borderRadius:7, background:"rgba(255,255,255,.22)",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700
          }}>
            {toast.ok ? "✓" : "✕"}
          </div>
          {toast.msg}
        </div>
      )}

{/* ── COLLECT PAYMENT POPUP ── */}
      {showCollect && selectedCustomer && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowCollect(false); }}
          style={{
            position:"fixed", inset:0, zIndex:9999,
            background:"rgba(15,23,42,.55)",
            backdropFilter:"blur(4px)",
            display:"flex", alignItems:"center", justifyContent:"center",
            padding:20
          }}
        >
          <div style={{
            background:"#fff", borderRadius:20,
            width:"100%", maxWidth:620,
            maxHeight:"88vh",
            display:"flex", flexDirection:"column",
            boxShadow:"0 25px 50px -12px rgba(0,0,0,0.15)",
            overflow:"hidden"
          }}>

            {/* Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", background: "linear-gradient(135deg, #eff6ff, #dbeafe)", flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                    <Wallet size={20} color="#2563eb" /> Collect Customer Payment
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#475569" }}>
                    Payment will be split across pending invoices oldest-first (FIFO) for <strong>{selectedCustomer.name}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setShowCollect(false)}
                  style={{ border: "none", background: "#f1f5f9", color: "#475569", padding: "8px 14px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                >
                  ✕ Cancel
                </button>
              </div>

              {/* Summary row */}
              <div style={{ marginTop: 14, display: "flex", gap: 16 }}>
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "8px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", textTransform: "uppercase" }}>Total Pending</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#dc2626" }}>₹{fmt(totalPending)}</div>
                </div>
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "8px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#15803d", textTransform: "uppercase" }}>Pending Invoices</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#15803d" }}>
                    {pendingInvoices.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable Form + Preview */}
            <div style={{ overflowY:"auto", flex:1 }}>
              <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: 14 }}>

                {/* Amount Input */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Amount to Collect (₹) *</label>
                  <div style={{ position: "relative" }}>
                    <IndianRupee size={16} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={collectAmount}
                      onChange={(e) => setCollectAmount(e.target.value)}
                      placeholder={`Total Pending: ₹${fmt(totalPending)}`}
                      style={{
                        width: "100%", padding: "11px 14px 11px 36px", borderRadius: "10px",
                        border: "1.5px solid #e2e8f0", outline: "none", fontSize: "16px",
                        fontWeight: "700", boxSizing: "border-box"
                      }}
                    />
                  </div>
                  {/* Excess balance notice banner */}
                  {Number(collectAmount) > totalPending && (
                    <div style={{
                      background: "#eff6ff", border: "1.5px solid #bfdbfe",
                      borderRadius: 10, padding: "10px 12px", color: "#1e40af",
                      fontSize: "12px", fontWeight: "600", marginTop: 4, display: "flex", gap: 6, alignItems: "center"
                    }}>
                      ℹ️ Excess of <strong>₹{fmt(Number(collectAmount) - totalPending)}</strong> will be saved as advance balance.
                    </div>
                  )}
                  {/* Quick percentage helper buttons */}
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    {[25, 50, 100].map((pct) => {
                      const val = Math.round(totalPending * pct / 100);
                      return (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setCollectAmount(String(val))}
                          style={{
                            flex: 1, padding: "6px 0", fontSize: "12px", fontWeight: 700,
                            background: "#eff6ff", color: "#2563eb",
                            border: "1.5px solid #bfdbfe", borderRadius: 8, cursor: "pointer",
                            transition: "background .15s"
                          }}
                        >
                          {pct}% (₹{fmt(val)})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Method + Date row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Payment Method</label>
                    <select
                      value={collectMethod}
                      onChange={(e) => setCollectMethod(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1.5px solid #e2e8f0", outline: "none", fontSize: "13px", background: "#fff", boxSizing: "border-box" }}
                    >
                      <option value="cash">Cash</option>
                      <option value="online">Online Transfer</option>
                      <option value="upi">UPI</option>
                      <option value="card">Card</option>
                      <option value="loyalty">Loyalty</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Payment Date</label>
                    <input
                      type="date"
                      value={collectDate}
                      onChange={(e) => setCollectDate(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1.5px solid #e2e8f0", outline: "none", fontSize: "13px", boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Notes / Reference</label>
                  <input
                    type="text"
                    value={collectNotes}
                    onChange={(e) => setCollectNotes(e.target.value)}
                    placeholder="e.g. Transaction ID, Cheque No or bank remarks."
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1.5px solid #e2e8f0", outline: "none", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>

                {/* Live Split Preview */}
                {preview.length > 0 && (
                  <div style={{ borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden", marginTop: 4 }}>
                    <div style={{ padding: "10px 14px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: "12px", fontWeight: "700", color: "#334155", textTransform: "uppercase", letterSpacing: ".5px" }}>
                      📊 Distribution Preview (FIFO – Oldest Invoices First)
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                          <th style={{ padding: "9px 12px", fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Invoice No</th>
                          <th style={{ padding: "9px 12px", fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Due Date</th>
                          <th style={{ padding: "9px 12px", fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Pending</th>
                          <th style={{ padding: "9px 12px", fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Applying</th>
                          <th style={{ padding: "9px 12px", fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>New Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((p, idx) => {
                          const willPay = Number(p._applying) > 0;
                          const fullyClear = Number(p._newBalance) <= 0;
                          return (
                            <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9", background: willPay ? (fullyClear ? "#f0fdf4" : "#fffbeb") : "#fff" }}>
                              <td style={{ padding: "9px 12px", fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>
                                {p.invoice_no || "N/A"}
                              </td>
                              <td style={{ padding: "9px 12px", fontSize: "12px", color: "#64748b" }}>
                                {p.due_date ? formatDate(p.due_date) : "-"}
                              </td>
                              <td style={{ padding: "9px 12px", fontSize: "13px", color: "#dc2626", fontWeight: "600" }}>
                                ₹{fmt(p.balance_amount)}
                              </td>
                              <td style={{ padding: "9px 12px", fontSize: "13px", fontWeight: "700", color: willPay ? "#16a34a" : "#94a3b8" }}>
                                {willPay ? `₹${fmt(p._applying)}` : "—"}
                              </td>
                              <td style={{ padding: "9px 12px", fontSize: "13px", fontWeight: "700" }}>
                                <span style={{
                                  padding: "3px 8px", borderRadius: 20, fontSize: 12,
                                  background: fullyClear ? "#dcfce7" : (willPay ? "#fef9c3" : "#f1f5f9"),
                                  color: fullyClear ? "#15803d" : (willPay ? "#92400e" : "#94a3b8")
                                }}>
                                  {fullyClear ? "✓ Cleared" : `₹${fmt(p._newBalance)}`}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", gap: 10, flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setShowCollect(false)}
                style={{
                  flex: 1, padding: "12px", borderRadius: "10px", border: "1.5px solid #cbd5e1",
                  background: "#ffffff", color: "#475569", fontWeight: "600", fontSize: "14px", cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkCollect}
                disabled={collecting || !collectAmount || Number(collectAmount) <= 0}
                style={{
                  flex: 2, padding: "12px", borderRadius: "10px", border: "none",
                  background: collecting ? "#94a3b8" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  color: "#ffffff", fontWeight: "700", fontSize: "14px", cursor: collecting ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 12px rgba(37,99,235,0.2)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                }}
              >
                <Wallet size={16} />
                {collecting ? "Processing..." : `Collect ₹${collectAmount ? fmt(Math.min(Number(collectAmount), totalPending)) : "0"}`}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── MAIN ── */}
      <div style={{ minHeight:"100vh", background:"#f1f5f9", padding:20, fontFamily:"Inter, sans-serif" }}>

        {/* HEADER */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <div>
            <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"#0f172a" }}>Customers</h2>
            <p style={{ margin:"3px 0 0", color:"#64748b", fontSize:13 }}>Manage your customers & payments</p>
          </div>





          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
           <button onClick={downloadExcel} style={btnGreen}>
  <Download size={15}/>
  {selectedRows.length > 0 ? `Download (${selectedRows.length})` : "Excel Download"}
</button>
            <button onClick={() => navigate("/customer/add")} style={btnRed}>
              + Add Customer
            </button>
          </div>
        </div>

        {/* 2-COLUMN LAYOUT */}
        <div style={{
          display:"grid",
          gridTemplateColumns:"300px 1fr",
          gap:16,
          height:"calc(100vh - 120px)"
        }}>

          {/* ── LEFT ── */}
          <div style={card}>
            <div style={{ padding:"12px 14px", borderBottom:"1px solid #f1f5f9", position:"relative" }}>
              <Search size={15} style={{ position:"absolute", top:"50%", left:26, transform:"translateY(-50%)", color:"#94a3b8" }}/>
              <input
                placeholder="Search customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width:"100%", padding:"9px 12px 9px 34px",
                  borderRadius:10, border:"1px solid #e2e8f0",
                  outline:"none", fontSize:13, boxSizing:"border-box"
                }}
              />
            </div>
            <div style={{ overflowY:"auto", flex:1 }}>
              {filtered.map((c) => {
                const pt         = getCustomerPendingTotal(c.id);
                const isSelected = selectedCustomer?.id === c.id;
                return (
                  <div key={c.id} className="cust-row"
onClick={() => {
  setSelectedCustomer(c);
  fetchCustomerHistory(c.id);
  setCollectAmount("");
  setPreview([]);
  setSelectedRows([]); // ← add this line
}}
                    style={{
                      padding:"12px 14px", borderBottom:"1px solid #f1f5f9",
                      cursor:"pointer",
                      background:  isSelected ? "#eff6ff" : "#fff",
                      borderLeft:  isSelected ? "3px solid #2563eb" : "3px solid transparent",
                      transition:"all .15s"
                    }}
                  >
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:14, color:"#0f172a" }}>{c.name}</div>
                        <div style={{ fontSize:12, color:"#94a3b8", marginTop:2, display:"flex", gap:6, alignItems:"center" }}>
                          <span>{c.phone}</span>
                          {Number(c.advance_balance || 0) > 0 && (
                            <span style={{
                              background:"#dcfce7", color:"#15803d",
                              padding:"1px 6px", borderRadius:10, fontSize:10, fontWeight:700
                            }}>
                              Adv: ₹{fmt(c.advance_balance)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ fontWeight:700, fontSize:13, color: pt > 0 ? "#ef4444" : "#94a3b8" }}>
                        ₹{fmt(pt)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── RIGHT: invoice table ── */}
          <div style={{ ...card, overflow:"hidden" }}>

            {/* customer info + collect button */}
            {selectedCustomer && (
              <div style={{ padding:"16px 20px", borderBottom:"1px solid #f1f5f9" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontSize:20, fontWeight:800, color:"#0f172a", marginBottom:8 }}>
                      {selectedCustomer.name}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:"#64748b", marginBottom:4 }}>
                      <Phone size={13}/> {selectedCustomer.phone}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:"#64748b" }}>
                      <MapPin size={13}/> {selectedCustomer.address}
                    </div>
                  </div>

                  {/* RIGHT side: pending badge + collect button + edit */}
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>

                    {/* pending badge */}
                    {totalPending > 0 && (
                      <div style={{
                        background:"#fef2f2", border:"1px solid #fecaca",
                        borderRadius:12, padding:"8px 16px", textAlign:"center"
                      }}>
                        <div style={{ fontSize:10, fontWeight:700, color:"#dc2626", textTransform:"uppercase", letterSpacing:".5px" }}>
                          Pending
                        </div>
                        <div style={{ fontSize:18, fontWeight:900, color:"#dc2626" }}>
                          ₹{fmt(totalPending)}
                        </div>
                      </div>
                    )}

                    {/* advance badge */}
                    {Number(selectedCustomer.advance_balance || 0) > 0 && (
                      <div style={{
                        background:"#f0fdf4", border:"1px solid #bbf7d0",
                        borderRadius:12, padding:"8px 16px", textAlign:"center"
                      }}>
                        <div style={{ fontSize:10, fontWeight:700, color:"#15803d", textTransform:"uppercase", letterSpacing:".5px" }}>
                          Advance Balance
                        </div>
                        <div style={{ fontSize:18, fontWeight:900, color:"#15803d" }}>
                          ₹{fmt(selectedCustomer.advance_balance)}
                        </div>
                      </div>
                    )}

                    {/* Send Reminder Button */}

{totalPending > 0 && (
  <button
    onClick={sendCustomerReminder}
    disabled={sendingReminder}
    style={{
      background:"#22c55e",
      color:"#fff",
      border:"none",
      borderRadius:12,
      padding:"10px 18px",
      fontWeight:700,
      fontSize:13,
      cursor:sendingReminder ? "not-allowed":"pointer",
      display:"flex",
      alignItems:"center",
      gap:7,
      boxShadow:"0 4px 14px rgba(34,197,94,.3)"
    }}
  >
    <MessageCircle size={16}/>
    {sendingReminder ? "Sending..." : "Send Reminder"}
  </button>
)}

                    {/* Payment History Button */}
                    <button
                      onClick={() => openCustomerHistoryModal(selectedCustomer)}
                      style={{
                        background:"#f1f5f9", border:"1.5px solid #e2e8f0",
                        borderRadius:12, padding:"10px 18px", fontWeight:700, fontSize:13,
                        cursor:"pointer", display:"flex", alignItems:"center", gap:7,
                        color:"#475569", transition:"all .15s"
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#e2e8f0")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                    >
                      <History size={15}/> Payment History
                    </button>

                    {/* collect button */}
                    {totalPending > 0 && (
                      <button
                        onClick={openCollect}
                        style={{
                          background:"linear-gradient(135deg,#2563eb,#1d4ed8)",
                          color:"#fff", border:"none", borderRadius:12,
                          padding:"10px 18px", fontWeight:700, fontSize:13,
                          cursor:"pointer", display:"flex", alignItems:"center", gap:7,
                          boxShadow:"0 4px 14px rgba(37,99,235,.3)",
                          transition:"all .15s"
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                      >
                        <Wallet size={15}/> Collect Payment
                      </button>
                    )}

                    <button onClick={() => navigate(`/customer/edit/${selectedCustomer.id}`)} style={btnEdit}>
                      <Pencil size={15}/>
                    </button>
                  </div>
                </div>
              </div>
            )}

         {/* table header */}
<div style={{
  display:"grid",
  gridTemplateColumns:"40px 1.2fr .8fr .8fr .8fr 1fr 1fr",
  padding:"11px 20px",
  background:"#f8fafc",
  borderBottom:"1px solid #e5e7eb",
  fontWeight:700, fontSize:12, color:"#64748b",
  textTransform:"uppercase", letterSpacing:".5px",
  textAlign:"center"
}}>
  <span style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
    <input
      type="checkbox"
      style={{ width:15, height:15, cursor:"pointer", accentColor:"#2563eb" }}
      checked={invoiceHistory.length > 0 && selectedRows.length === invoiceHistory.length}
      onChange={(e) => {
        if (e.target.checked) {
          setSelectedRows(invoiceHistory.map((_, i) => i));
        } else {
          setSelectedRows([]);
        }
      }}
    />
  </span>
  <span style={{ textAlign:"left" }}>Payment Method</span>
  <span>Total</span>
  <span>Paid</span>
  <span>Pending</span>
  <span>Due Date</span>
  <span>Status</span>
</div>

            {/* rows */}
            <div style={{ overflowY:"auto", flex:1 }}>
              {invoiceHistory.length === 0 ? (
                <div style={{
                  display:"flex", flexDirection:"column",
                  alignItems:"center", justifyContent:"center",
                  padding:48, color:"#94a3b8", textAlign:"center"
                }}>
                  <div style={{ fontSize:52, marginBottom:14 }}>📄</div>
                  <div style={{ fontWeight:700, fontSize:16, color:"#0f172a" }}>No Billing Records</div>
                  <p style={{ fontSize:13, marginTop:6, maxWidth:300, lineHeight:1.6 }}>
                    This customer has no billing or payment history yet.
                  </p>
                </div>
              ) : (
              invoiceHistory.map((item, index) => {
  const isPaid = Number(item.balance_amount) <= 0;
  const isChecked = selectedRows.includes(index);
  return (
    <div key={index} style={{
      display:"grid",
      gridTemplateColumns:"40px 1.2fr .8fr .8fr .8fr 1fr 1fr",
      padding:"14px 20px",
      alignItems:"center", textAlign:"center",
      borderBottom:"1px solid #f8fafc",
      background: isChecked ? "#eff6ff" : "#fff",
      cursor:"pointer",
      transition:"background .15s"
    }}
      onClick={() => {
        setSelectedRows(prev =>
          prev.includes(index)
            ? prev.filter(i => i !== index)
            : [...prev, index]
        );
      }}
    >
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center" }}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          style={{ width:15, height:15, cursor:"pointer", accentColor:"#2563eb" }}
          checked={isChecked}
          onChange={() => {
            setSelectedRows(prev =>
              prev.includes(index)
                ? prev.filter(i => i !== index)
                : [...prev, index]
            );
          }}
        />
      </div>
      <div style={{ textAlign:"left", fontWeight:600, fontSize:13, textTransform:"capitalize" }}>
        {item.payment_method || "-"}
      </div>
      <div style={{ fontSize:13 }}>₹{fmt(item.total_amount)}</div>
      <div style={{ fontWeight:700, color:"#16a34a", fontSize:13 }}>
        ₹{fmt(item.paid_amount_total)}
      </div>
      <div>
        <span style={{
          background: isPaid ? "#f0fdf4" : "#fee2e2",
          color:      isPaid ? "#16a34a" : "#dc2626",
          padding:"4px 10px", borderRadius:8, fontSize:12, fontWeight:700
        }}>
          ₹{fmt(item.balance_amount)}
        </span>
      </div>
      <div style={{ fontSize:13, color:"#64748b" }}>
        {item.due_date ? formatDate(item.due_date) : "-"}
      </div>
      <div>
        <span style={{
          padding:"5px 14px", borderRadius:20, fontSize:11, fontWeight:700,
          background: isPaid ? "#dcfce7" : "#fee2e2",
          color:      isPaid ? "#15803d" : "#dc2626",
          display:"inline-block", minWidth:72, textAlign:"center"
        }}>
          {isPaid ? "Paid" : "Not Paid"}
        </span>
      </div>
    </div>
  );
})
              )}
            </div>
          </div>
        </div>
      </div>
      {/* ── CUSTOMER PAYMENT HISTORY MODAL ── */}
      {showHistoryModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(15, 23, 42, 0.45)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000
        }}>
          <div style={{
            background: "#ffffff", width: "100%", maxWidth: "750px",
            borderRadius: "20px", border: "1px solid #e2e8f0", overflow: "hidden",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            maxHeight: "80vh", display: "flex", flexDirection: "column"
          }}>
            {/* Modal Header */}
            <div style={{ padding: "18px 22px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#0f172a" }}>
                    Payment History
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
                    All payments recorded for <strong>{selectedCustomer?.name}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  style={{
                    border: "none", background: "#f1f5f9", color: "#475569",
                    padding: "8px 14px", borderRadius: 10, fontWeight: 700,
                    fontSize: 13, cursor: "pointer"
                  }}
                >
                  ✕ Close
                </button>
              </div>

              {/* Summary bar */}
              {!loadingHistory && paymentHistory.length > 0 && (
                <div style={{
                  marginTop: 12, background: "#f0fdf4", border: "1px solid #bbf7d0",
                  borderRadius: 10, padding: "10px 14px",
                  display: "flex", gap: 24, alignItems: "center"
                }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#15803d", textTransform: "uppercase" }}>Total Paid</span>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#15803d" }}>
                      ₹{fmt(paymentHistory.reduce((s, h) => s + Number(h.amount || 0), 0))}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>Transactions</span>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#334155" }}>{paymentHistory.length}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Body */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              {loadingHistory ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Loading payment records...</div>
              ) : paymentHistory.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>🧾</div>
                  No payment records found for this customer yet.
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead style={{ position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 }}>
                    <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                      <th style={{ padding: "11px 16px", fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Bill No</th>
                      <th style={{ padding: "11px 16px", fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Bill Date</th>
                      <th style={{ padding: "11px 16px", fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Pay Date</th>
                      <th style={{ padding: "11px 16px", fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Amount Paid</th>
                      <th style={{ padding: "11px 16px", fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Method</th>
                      <th style={{ padding: "11px 16px", fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((h, idx) => (
                      <tr key={h.id} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ padding: "11px 16px", fontSize: "13px", color: "#0f172a", fontWeight: "700" }}>
                          {h.invoice_no || "N/A"}
                        </td>
                        <td style={{ padding: "11px 16px", fontSize: "13px", color: "#64748b" }}>
                          {h.invoice_date ? formatDate(h.invoice_date) : "-"}
                        </td>
                        <td style={{ padding: "11px 16px", fontSize: "13px", color: "#334155", fontWeight: "500" }}>
                          {h.payment_date ? formatDate(h.payment_date) : "-"}
                        </td>
                        <td style={{ padding: "11px 16px", fontSize: "13px", color: "#16a34a", fontWeight: "700" }}>
                          ₹{fmt(h.amount)}
                        </td>
                        <td style={{ padding: "11px 16px", fontSize: "13px", color: "#475569", textTransform: "capitalize" }}>
                          <span style={{
                            padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                            background: h.payment_method === "cash" ? "#f0fdf4" : "#eff6ff",
                            color: h.payment_method === "cash" ? "#15803d" : "#2563eb"
                          }}>
                            {h.payment_method}
                          </span>
                        </td>
                        <td style={{ padding: "11px 16px", fontSize: "13px", color: "#64748b" }}>
                          {h.notes || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const card = {
  background:"#fff", borderRadius:14,
  border:"1px solid #e5e7eb",
  display:"flex", flexDirection:"column",
};
const btnGreen = {
  background:"#16a34a", color:"#fff", border:"none",
  borderRadius:10, padding:"10px 16px",
  fontWeight:700, cursor:"pointer",
  display:"flex", alignItems:"center", gap:7, fontSize:13
};
const btnRed = {
  background:"#ef4444", color:"#fff", border:"none",
  borderRadius:10, padding:"10px 16px",
  fontWeight:700, cursor:"pointer", fontSize:13
};
const btnEdit = {
  background:"#eff6ff", border:"1px solid #dbeafe",
  width:44, height:44, borderRadius:12,
  cursor:"pointer", color:"#2563eb",
  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0
};