//password change
// import { useEffect, useState, useRef } from "react";
// import { useNavigate } from "react-router-dom";
// import api from "../../services/api";
// import {
//   BarChart, Bar, XAxis, YAxis, Tooltip,
//   ResponsiveContainer, CartesianGrid, Cell
// } from "recharts";
// import {
//   TrendingUp, Package, AlertTriangle,
//   ShoppingBag, BarChart2, Wallet, Clock, IndianRupee,Bell,ChevronDown
// } from "lucide-react";

// function useStyles() {
//   useEffect(() => {
//     const id = "db-v5-styles";
//     if (document.getElementById(id)) return;
//     const s = document.createElement("style");
//     s.id = id;
//     s.innerHTML = `
//       @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
//       .db * { box-sizing: border-box; }
//       @keyframes db-up   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
//       @keyframes db-spin { to{transform:rotate(360deg)} }
//       @keyframes db-num  { from{opacity:0;transform:scale(.88)} to{opacity:1;transform:scale(1)} }
//       .db-card { transition: box-shadow .22s, transform .22s; }
//       .db-card:hover { box-shadow: 0 8px 32px rgba(99,102,241,.13) !important; transform: translateY(-2px); }
//       .db-row:hover td { background: #f8f7ff !important; }
//       .db-row td { transition: background .15s; }
//     `;
//     document.head.appendChild(s);
//     return () => document.head.removeChild(s);
//   }, []);
// }

// function CustomTooltip({ active, payload, label }) {
//   if (!active || !payload?.length) return null;
//   return (
//     <div style={{
//       background: "#1e1b4b", borderRadius: 12, padding: "10px 16px",
//       fontFamily: "'Plus Jakarta Sans',sans-serif",
//     }}>
//       <div style={{ fontSize: 11, color: "rgba(255,255,255,.55)", fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
//       <div style={{ fontSize: 18, fontWeight: 800, color: "#a5b4fc" }}>₹{Number(payload[0].value).toLocaleString()}</div>
//     </div>
//   );
// }

// const ACCENTS = {
//   green:  { bg: "#f0fdf4", icon: "#bbf7d0", iconFg: "#15803d", val: "#15803d", border: "#dcfce7" },
//   blue:   { bg: "#eff6ff", icon: "#bfdbfe", iconFg: "#1d4ed8", val: "#1d4ed8", border: "#dbeafe" },
//   red:    { bg: "#fff1f2", icon: "#fecdd3", iconFg: "#be123c", val: "#be123c", border: "#ffe4e6" },
//   indigo: { bg: "#eef2ff", icon: "#c7d2fe", iconFg: "#4338ca", val: "#4338ca", border: "#e0e7ff" },
//   orange: { bg: "#fff7ed", icon: "#fed7aa", iconFg: "#c2410c", val: "#b91c1c", border: "#fed7aa" },
// };

// function StatCard({ label, value, icon: Icon, accent, delay, prefix = "", suffix = "" }) {
//   const c = ACCENTS[accent] || ACCENTS.indigo;
//   return (
//     <div className="db-card" style={{
//       background: c.bg, border: `1.5px solid ${c.border}`,
//       borderRadius: 18, padding: "22px 20px",
//       animation: `db-up .45s ${delay}s ease both`,
//       position: "relative", overflow: "hidden",
//     }}>
//       <div style={{ position: "absolute", top: -18, right: -18, width: 70, height: 70, borderRadius: "50%", background: c.icon, opacity: .45, pointerEvents: "none" }} />
//       <div style={{ width: 40, height: 40, borderRadius: 12, background: c.icon, display: "flex", alignItems: "center", justifyContent: "center" }}>
//         <Icon size={18} color={c.iconFg} strokeWidth={2.2} />
//       </div>
//       <div style={{ marginTop: 14 }}>
//         <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
//         <div style={{ fontSize: 28, fontWeight: 900, color: c.val, fontFamily: "'Plus Jakarta Sans',sans-serif", lineHeight: 1.1, animation: "db-num .5s ease both" }}>
//           {prefix}{typeof value === "number" ? value.toLocaleString() : value}{suffix}
//         </div>
//       </div>
//     </div>
//   );
// }

// function StockBadge({ stock }) {
//   const color = stock === 0 ? "#be123c" : stock <= 2 ? "#c2410c" : "#b45309";
//   const bg    = stock === 0 ? "#fff1f2" : stock <= 2 ? "#fff7ed" : "#fefce8";
//   const border= stock === 0 ? "#fecdd3" : stock <= 2 ? "#fed7aa" : "#fef08a";
//   return (
//     <span style={{ background: bg, color, border: `1px solid ${border}`, borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
//       {stock === 0 ? "Out of stock" : `${stock} left`}
//     </span>
//   );
// }

// function SectionHeader({ icon: Icon, iconBg, iconColor, title, subtitle, badge }) {
//   const font = "'Plus Jakarta Sans', sans-serif";
//   return (
//     <div style={{ padding: "16px 22px 12px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
//       <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//         <div style={{ width: 30, height: 30, borderRadius: 10, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
//           <Icon size={15} color={iconColor} />
//         </div>
//         <div>
//           <span style={{ fontSize: 15, fontWeight: 800, color: "#1e1b4b", fontFamily: font }}>{title}</span>
//           {subtitle && <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }}>{subtitle}</div>}
//         </div>
//       </div>
//       {badge}
//     </div>
//   );
// }

// export default function Dashboard() {
//   useStyles();
//   const font = "'Plus Jakarta Sans', sans-serif";

//   const navigate = useNavigate();

// const user = JSON.parse(localStorage.getItem("user") || "{}");

// const [showProfile, setShowProfile] = useState(false);

//   /* ── Company State ── */
//   const [companies, setCompanies]         = useState([]);
//   const [selectedCompany, setSelectedCompany] = useState(
//     localStorage.getItem("selected_company_id") || ""
//   );

//   /* ── Data State ── */
//   const [stats, setStats]               = useState({ total_sales: 0, total_products: 0, monthly_sales: [] });
//   const [lowStockProducts, setLowStockProducts] = useState([]);
//   const [creditStats, setCreditStats]   = useState({ total_credit_sales: 0, total_outstanding: 0, overdue_amount: 0, today_collection: 0 });
//   const [creditList, setCreditList]     = useState([]);
//   const [loading, setLoading]           = useState(false);
//   const [activeBar, setActiveBar]       = useState(null);
//   const [unsoldProducts,setUnsoldProducts]=useState([]);


//   const [showNotif,   setShowNotif]   = useState(false);
// const [overdueList, setOverdueList] = useState([]);

// const isAdmin = user?.role === "admin";
// const bellRef = useRef(null);
// const profileRef = useRef(null);


// const [notifPos, setNotifPos] = useState({
//   top: 0,
//   left: 0,
// });


//   /* ── Load Companies on Mount ── */
//   useEffect(() => {
//     const loadCompanies = async () => {
//       try {
//         // const user = JSON.parse(localStorage.getItem("user"));
//         const adminId = user.role === "cashier" ? user.admin_id : user.id;
//         const res = await api.get(`/company/get_companies_by_admin?admin_id=${adminId}&role=${user.role}`);
//         if (res.data.status) {
//           setCompanies(res.data.data || []);
//           /* Auto-select first company if none saved */
//           if (!localStorage.getItem("selected_company_id") && res.data.data.length > 0) {
//             const firstId = String(res.data.data[0].id);
//             setSelectedCompany(firstId);
//             localStorage.setItem("selected_company_id", firstId);
//           }
//         }
//       } catch (e) { console.error(e); }
//     };
//     loadCompanies();
//   }, []);

//   /* ── Fetch All Dashboard Data when company changes ── */
//   useEffect(() => {
//     if (!selectedCompany) return;
//     fetchAllData(selectedCompany);
//   }, [selectedCompany]);

//   const fetchAllData = async (companyId) => {
//     setLoading(true);
//     await Promise.all([
//       fetchStats(companyId),
//       fetchLowStockProducts(companyId),
//       fetchCreditDashboard(companyId),
//     ]);
//     setLoading(false);
//   };

//   const fetchStats = async (companyId) => {
//     try {
//       const [basic, analytics] = await Promise.all([
//         api.get(`/dashboard/get_stats?company_id=${companyId}`),
//         api.get(`/dashboard/get_analytics?company_id=${companyId}`)
//       ]);
//       if (basic.data.status && analytics.data.status) {
//         setStats({ ...basic.data.data, monthly_sales: analytics.data.data.monthly_sales });
//       }
//     } catch (e) { console.error(e); }
//   };

//   const fetchLowStockProducts = async (companyId) => {
//     try {
//       const res = await api.get(`/product/get?company_id=${companyId}`);
//       if (res.data.status) {
//         setLowStockProducts(
//           res.data.data.filter(p => p.status === "active" && Number(p.stock) <= 5)
//         );
//       }
//     } catch (e) { console.error(e); }
//   };

//   const fetchUnsoldProducts = async () => {

//     try{

//         const res = await api.get(
//             `/dashboard/get_unsold_products_notification?company_id=${selectedCompany}`
//         );

//         if(res.data.status){

//             setUnsoldProducts(res.data.data);

//         }

//     }catch(err){

//         console.log(err);

//     }

// };

// useEffect(()=>{

//     if(selectedCompany){

//         fetchUnsoldProducts();

//     }

// },[selectedCompany]);

// const fetchCreditDashboard = async (companyId) => {
//   try {
//     const res = await api.get(`/dashboard/get_dashboard?company_id=${companyId}`);
//     if (res.data.status) {
//       setCreditStats(res.data.cards);
//       setCreditList(res.data.list);
//       // ← add this
//       const overdue = res.data.list.filter(c => c.status === "Overdue");
//       setOverdueList(overdue);
//     }
//   } catch (e) { console.error(e); }
// };

// const fetchNotifications = async () => {

//     // const user = JSON.parse(localStorage.getItem("user"));

//     const adminId =
//         user.role === "cashier"
//             ? user.admin_id
//             : user.id;

//     const res = await api.get(
//         `/dashboard/get_admin_overdue_notifications?admin_id=${adminId}`
//     );

//     if(res.data.status){

//         setOverdueList(res.data.data);

//     }

// }

// useEffect(()=>{

//     fetchNotifications();

// },[]);

//   /* ── Company Change Handler ── */
//   const handleCompanyChange = (e) => {
//     const id = e.target.value;
//     setSelectedCompany(id);
//     localStorage.setItem("selected_company_id", id);
//   };

//   const thStyle = { padding: "10px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "#9ca3af", borderBottom: "1px solid #f3f4f6" };
//   const tdStyle = (bg = "#fff") => ({ padding: "13px 20px", fontSize: 14, color: "#374151", background: bg });


//  useEffect(() => {
//   const handler = (e) => {
//     if (!e.target.closest(".notif-bell")) setShowNotif(false);
//     if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
//   };
//   document.addEventListener("mousedown", handler);
//   return () => document.removeEventListener("mousedown", handler);
// }, []);


//   return (
//     <div className="db" style={{ fontFamily: font }}>

//       {/* ── Header with Company Dropdown ── */}
//       <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, animation: "db-up .35s ease both", flexWrap: "wrap", gap: 14, overflow: "visible",  // ← ADD THIS
//   position: "relative", // ← ADD THIS
//   zIndex: 100   }}>
//         <div>
//           <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#1e1b4b" }}>Dashboard</h1>
//           <p style={{ margin: "3px 0 0", fontSize: 13, color: "#9ca3af" }}>Welcome back — here's what's happening today</p>
//         </div>

//         <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

//           {/* ── Company Selector ── */}
//           <div style={{
//             display: "flex", alignItems: "center", gap: 10,
//             background: "#fff", border: "1.5px solid #e0e7ff",
//             borderRadius: 14, padding: "10px 16px",
//             boxShadow: "0 4px 16px rgba(99,102,241,.08)",
//           }}>
//             <span style={{ fontSize: 18 }}>🏢</span>
//             <select
//               value={selectedCompany}
//               onChange={handleCompanyChange}
//               style={{
//                 border: "none", outline: "none",
//                 background: "transparent",
//                 fontSize: 14, fontWeight: 700,
//                 color: "#1e1b4b", cursor: "pointer",
//                 fontFamily: font, minWidth: 160,
//               }}
//             >
//               <option value="">Select Company</option>
//               {companies.map(c => (
//                 <option key={c.id} value={c.id}>{c.company_name}</option>
//               ))}
//             </select>
//           </div>

//           {/* ── Live Badge ── */}
//           <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#eef2ff", border: "1.5px solid #e0e7ff", borderRadius: 12, padding: "8px 16px" }}>
//             <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 0 3px rgba(34,197,94,.2)" }} />
//             <span style={{ fontSize: 12, fontWeight: 700, color: "#4338ca" }}>Live data</span>
//           </div>



//         <div
//     ref={profileRef}
//     style={{ position: "relative" }}
// >
//     <button
//         onClick={() => setShowProfile(v => !v)}
//         style={{
//             height: 42,
//             padding: "0 16px",
//             borderRadius: 12,
//             border: "1.5px solid #e0e7ff",
//             background: showProfile ? "#eef2ff" : "#fff",
//             cursor: "pointer",
//             fontWeight: 700,
//             display: "flex",
//             alignItems: "center",
//             gap: 5
//         }}
//     >
//         {user.name}
//         <ChevronDown size={16} />
//     </button>

//     {showProfile &&
//         <div
//             style={{
//                 position: "absolute",
//                 right: 0,
//                 top: 48,
//                 width: 180,
//                 background: "#fff",
//                 borderRadius: 12,
//                 boxShadow: "0 10px 25px rgba(0,0,0,.12)",
//                 overflow: "hidden",
//                 zIndex: 9999
//             }}
//         >
//             {(user.role === "admin" || user.role === "cashier") && (
//                 <div
//                     style={{ padding: 14, cursor: "pointer" }}
//                     onClick={() => {
//                         setShowProfile(false);
//                         navigate("/change-password");
//                     }}
//                 >
//                     🔒 Change Password
//                 </div>
//             )}

//             <div
//                 style={{ padding: 14, cursor: "pointer", color: "red" }}
//                 onClick={() => {
//                     localStorage.clear();
//                     navigate("/");
//                 }}
//             >
//                 🚪 Logout
//             </div>
//         </div>
//     }
// </div>
//           {/* Bell Notification — admin only */}
// {isAdmin && (
//   <div ref={bellRef} style={{ position:"relative", zIndex: 1000 }}>
//     <button
//     className="notif-bell"
//       onClick={() => setShowNotif(v => !v)}
//       style={{
//         width:42, height:42, borderRadius:12,
//         border:"1.5px solid #e0e7ff",
//         background: showNotif ? "#eef2ff" : "#fff",
//         cursor:"pointer",
//         display:"flex", alignItems:"center", justifyContent:"center",
//         boxShadow:"0 4px 16px rgba(99,102,241,.08)",
//         position:"relative",
//       }}
//     >
//       <Bell size={18} color="#4338ca"/>
//       {/* {overdueList.length > 0 && ( */}
//       {(overdueList.length + unsoldProducts.length) > 0 && (
//         <span style={{
//           position:"absolute", top:-6, right:-6,
//           background:"#dc2626", color:"#fff",
//           borderRadius:"50%", width:20, height:20,
//           display:"flex", alignItems:"center",
//           justifyContent:"center", fontSize:11, fontWeight:800,
//         }}>
//           {/* {overdueList.length} */}
//           {overdueList.length + unsoldProducts.length}
//         </span>
//       )}
//     </button>

//     {/* NOTIFICATION DROPDOWN */}
//     {showNotif && (
//       <div style={{
//         position:"absolute",
// top:"52px",
// right:0,
//         width:340, background:"#fff",
//         borderRadius:18, border:"1.5px solid #e0e7ff",
//         boxShadow:"0 16px 48px rgba(99,102,241,.18)",
//         zIndex:9999, overflow:"hidden",
//         animation:"db-up .2s ease both",
//       }}>
//         {/* Header */}
//         <div style={{
//           background:"linear-gradient(135deg,#1e1b4b,#4338ca)",
//           padding:"14px 18px",
//           display:"flex", justifyContent:"space-between", alignItems:"center",
//         }}>
//           <div style={{ display:"flex", alignItems:"center", gap:8 }}>
//             <Bell size={15} color="#fff"/>
//             <span style={{ color:"#fff", fontWeight:800, fontSize:14 }}>
//               Notifications
//             </span>
//           </div>
//           {/* <span style={{
//             background:"#dc2626", color:"#fff",
//             borderRadius:20, padding:"2px 10px",
//             fontSize:11, fontWeight:800,
//           }}>
//             {overdueList.length} overdue
//           </span> */}
//           <span
//   style={{
//     background:"#dc2626",
//     color:"#fff",
//     borderRadius:20,
//     padding:"2px 10px",
//     fontSize:11,
//     fontWeight:800
//   }}
// >
//   {overdueList.length + unsoldProducts.length} Alerts
// </span>
//         </div>
//          <div
//     style={{
//         background:"#fef2f2",
//         padding:"10px 15px",
//         fontWeight:700,
//         color:"#dc2626",
//         borderTop:"1px solid #fecaca",
//         borderBottom:"1px solid #fecaca"
//     }}
//     >
//         💰 Overdue Customers
//     </div>

//         {/* List */}
//         <div style={{ maxHeight:320, overflowY:"auto" }}>
//           {overdueList.length === 0 ? (
//             <div style={{ padding:"32px 20px", textAlign:"center", color:"#9ca3af" }}>
//               <div style={{ fontSize:32, marginBottom:8 }}>✅</div>
//               <div style={{ fontWeight:700 }}>No overdue customers</div>
//             </div>
//           ) : overdueList.map((c, i) => (
//             <div key={i} style={{
//               padding:"12px 18px",
//               borderBottom:"1px solid #f1f5f9",
//               display:"flex", justifyContent:"space-between", alignItems:"center",
//             }}>
//               <div>
//                 <div style={{ fontWeight:700, fontSize:13, color:"#1e1b4b" }}>
//                   {c.customer}
//                 </div>
//                 <div style={{ fontSize:11, color:"#dc2626", marginTop:2, fontWeight:600 }}>
//                   Due: {c.due_date}
//                 </div>
//               </div>
//               <div style={{ textAlign:"right" }}>
//                 <div style={{ fontWeight:800, fontSize:14, color:"#dc2626" }}>
//                   ₹{Number(c.outstanding).toLocaleString()}
//                 </div>
//                 <span style={{
//                   background:"#fee2e2", color:"#dc2626",
//                   borderRadius:20, padding:"2px 8px",
//                   fontSize:10, fontWeight:700,
//                 }}>
//                   Overdue
//                 </span>
//               </div>
//             </div>
//           ))}
//         </div>

//          {(overdueList.length + unsoldProducts.length) > 0 && (
//           <div style={{
//             padding:"12px 18px", borderTop:"1px solid #f1f5f9",
//             background:"#fafafa", textAlign:"center",
//           }}>
//             <span style={{ fontSize:12, color:"#6366f1", fontWeight:700, cursor:"pointer" }}
// onClick={() => {

//     if (bellRef.current) {

//         const rect = bellRef.current.getBoundingClientRect();

//         setNotifPos({
//             top: rect.bottom + 10,
//             left: rect.right - 340,
//         });

//     }

//     setShowNotif(v => !v);

// }}            >
//               Total Overdue: ₹{overdueList.reduce((s,c) => s + Number(c.outstanding), 0).toLocaleString()}
//             </span>
//           </div>
//         )}

//         {unsoldProducts.length>0 && (

// <div
// style={{
// background:"#fff7ed",
// padding:"10px 15px",
// fontWeight:700,
// color:"#c2410c",
// borderTop:"1px solid #fde68a",
// borderBottom:"1px solid #fde68a"
// }}
// >

// 📦 Unsold Products

// </div>

// )}

// {unsoldProducts.map((p,i)=>(

// <div
// key={i}
// style={{
// padding:"12px 18px",
// borderBottom:"1px solid #f3f4f6"
// }}
// >

// <div
// style={{
// fontWeight:700,
// color:"#1e1b4b"
// }}
// >

// 📦 {p.product_name}

// </div>

// <div
// style={{
// fontSize:12,
// color:"#dc2626",
// marginTop:4
// }}
// >

// {
// p.last_sale=="Never Billed"
// ?
// "Never billed"
// :
// `No billing for ${p.days} days`
// }

// </div>

// </div>

// ))}

//         {/* Footer */}
//         {/* {overdueList.length > 0 && ( */}
//         {/* {(overdueList.length + unsoldProducts.length) > 0 && (
//           <div style={{
//             padding:"12px 18px", borderTop:"1px solid #f1f5f9",
//             background:"#fafafa", textAlign:"center",
//           }}>
//             <span style={{ fontSize:12, color:"#6366f1", fontWeight:700, cursor:"pointer" }}
// onClick={() => {

//     if (bellRef.current) {

//         const rect = bellRef.current.getBoundingClientRect();

//         setNotifPos({
//             top: rect.bottom + 10,
//             left: rect.right - 340,
//         });

//     }

//     setShowNotif(v => !v);

// }}            >
//               Total Overdue: ₹{overdueList.reduce((s,c) => s + Number(c.outstanding), 0).toLocaleString()}
//             </span>
//           </div>
//         )} */}
//       </div>
//     )}
//   </div>
// )}

//         </div>
//       </div>

//       {/* ── No Company Selected ── */}
//       {!selectedCompany ? (
//         <div style={{
//           display: "flex", flexDirection: "column", alignItems: "center",
//           justifyContent: "center", padding: "80px 20px",
//           background: "#fff", borderRadius: 20, border: "1.5px solid #e0e7ff",
//         }}>
//           <div style={{ fontSize: 52, marginBottom: 16 }}>🏢</div>
//           <div style={{ fontSize: 18, fontWeight: 800, color: "#1e1b4b", marginBottom: 8 }}>Select a Company</div>
//           <div style={{ fontSize: 14, color: "#9ca3af" }}>Choose a company from the dropdown above to view dashboard data</div>
//         </div>
//       ) : loading ? (
//         <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, gap: 10, color: "#6366f1", fontFamily: font }}>
//           <span style={{ width: 20, height: 20, border: "2.5px solid #c7d2fe", borderTopColor: "#6366f1", borderRadius: "50%", display: "inline-block", animation: "db-spin .8s linear infinite" }} />
//           Loading dashboard…
//         </div>
//       ) : (
//         <>
//           {/* ── Top 3 Cards ── */}
//           <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 14 }}>
//             <StatCard label="Total Sales"    value={stats.total_sales}       icon={TrendingUp}    accent="green"  delay={0}    prefix="₹" />
//             <StatCard label="Total Products" value={stats.total_products}    icon={Package}       accent="blue"   delay={0.07} />
//             <StatCard label="Low Stock"      value={lowStockProducts.length} icon={AlertTriangle} accent="red"    delay={0.14} suffix=" items" />
//           </div>

//           {/* ── Credit Cards ── */}
//           <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
//             <StatCard label="Credit Sales"     value={creditStats.total_credit_sales} icon={ShoppingBag}   accent="indigo" delay={0.18} prefix="₹" />
//             <StatCard label="Outstanding"      value={creditStats.total_outstanding}  icon={Wallet}        accent="red"    delay={0.22} prefix="₹" />
//             <StatCard label="Overdue"          value={creditStats.overdue_amount}     icon={Clock}         accent="orange" delay={0.26} prefix="₹" />
//             <StatCard label="Today Collection" value={creditStats.today_collection}   icon={IndianRupee}   accent="green"  delay={0.30} prefix="₹" />
//           </div>

//           {/* ── Chart ── */}
//           <div style={{ background: "#fff", border: "1.5px solid #e0e7ff", borderRadius: 20, padding: "22px 24px", marginBottom: 20, animation: "db-up .45s .32s ease both" }}>
//             <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
//               <div>
//                 <div style={{ fontSize: 15, fontWeight: 800, color: "#1e1b4b" }}>Monthly Sales</div>
//                 <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>Revenue overview this year</div>
//               </div>
//               <div style={{ width: 34, height: 34, borderRadius: 10, background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
//                 <BarChart2 size={16} color="#6366f1" />
//               </div>
//             </div>
//             <ResponsiveContainer width="100%" height={260}>
//               <BarChart data={stats.monthly_sales} barSize={32}
//                 onMouseMove={s => setActiveBar(s.isTooltipActive ? s.activeTooltipIndex : null)}
//                 onMouseLeave={() => setActiveBar(null)}
//               >
//                 <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f8" vertical={false} />
//                 <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af", fontFamily: font, fontWeight: 600 }} axisLine={false} tickLine={false} />
//                 <YAxis tick={{ fontSize: 11, fill: "#9ca3af", fontFamily: font }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
//                 <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,.06)", radius: 8 }} />
//                 <defs>
//                   <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
//                     <stop offset="0%"   stopColor="#6366f1" stopOpacity={1} />
//                     <stop offset="100%" stopColor="#818cf8" stopOpacity={0.7} />
//                   </linearGradient>
//                 </defs>
//                 <Bar dataKey="total" radius={[10, 10, 0, 0]}>
//                   {stats.monthly_sales.map((_, i) => (
//                     <Cell key={i} fill={activeBar === null ? "url(#barGrad)" : activeBar === i ? "#4f46e5" : "#c7d2fe"} />
//                   ))}
//                 </Bar>
//               </BarChart>
//             </ResponsiveContainer>
//           </div>

//           {/* ── Low Stock Table ── */}
//           <div style={{ background: "#fff", border: "1.5px solid #ffe4e6", borderRadius: 20, overflow: "hidden", marginBottom: 20, animation: "db-up .45s .36s ease both" }}>
//             <SectionHeader
//               icon={AlertTriangle} iconBg="#fff1f2" iconColor="#be123c"
//               title="Low Stock Products" subtitle="Items with 5 or fewer units remaining"
//               badge={lowStockProducts.length > 0 && (
//                 <span style={{ background: "#fff1f2", color: "#be123c", border: "1.5px solid #fecdd3", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700 }}>
//                   {lowStockProducts.length} alert{lowStockProducts.length > 1 ? "s" : ""}
//                 </span>
//               )}
//             />
//             <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: font }}>
//               <thead>
//                 <tr style={{ background: "#fafafa" }}>
//                   {["#", "Product Name", "Price", "Stock"].map((h, i) => <th key={i} style={thStyle}>{h}</th>)}
//                 </tr>
//               </thead>
//               <tbody>
//                 {lowStockProducts.length > 0 ? lowStockProducts.map((item, i) => (
//                   <tr key={item.id} className="db-row" style={{ borderBottom: "1px solid #fafafa" }}>
//                     <td style={tdStyle()}><span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 600 }}>{String(i + 1).padStart(2, "0")}</span></td>
//                     <td style={tdStyle()}>
//                       <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//                         <div style={{ width: 30, height: 30, borderRadius: 9, background: "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
//                           <Package size={13} color="#7c3aed" />
//                         </div>
//                         <span style={{ fontWeight: 700, color: "#1e1b4b" }}>{item.product_name}</span>
//                       </div>
//                     </td>
//                     <td style={tdStyle()}>₹{Number(item.price).toLocaleString()}</td>
//                     <td style={tdStyle()}><StockBadge stock={Number(item.stock)} /></td>
//                   </tr>
//                 )) : (
//                   <tr><td colSpan={4} style={{ padding: "36px 20px", textAlign: "center", color: "#9ca3af", fontSize: 14, background: "#fff" }}>All products are well stocked</td></tr>
//                 )}
//               </tbody>
//             </table>
//           </div>

//           {/* ── Outstanding Table ── */}
//           <div style={{ background: "#fff", border: "1.5px solid #e0e7ff", borderRadius: 20, overflow: "hidden", animation: "db-up .45s .40s ease both" }}>
//             <SectionHeader
//               icon={Wallet} iconBg="#eef2ff" iconColor="#4338ca"
//               title="Outstanding Customers" subtitle="Pending credit payments"
//             />
//             <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: font }}>
//               <thead>
//                 <tr style={{ background: "#fafafa" }}>
//                   {["Customer", "Outstanding", "Due Date", "Status"].map((h, i) => <th key={i} style={thStyle}>{h}</th>)}
//                 </tr>
//               </thead>
//               <tbody>
//                 {creditList.length > 0 ? creditList.map((c, i) => (
//                   <tr key={i} className="db-row" style={{ borderBottom: "1px solid #fafafa" }}>
//                     <td style={tdStyle()}><span style={{ fontWeight: 700, color: "#1e1b4b" }}>{c.customer}</span></td>
//                     <td style={tdStyle()}>₹{Number(c.outstanding).toLocaleString()}</td>
//                     <td style={tdStyle()}>{c.due_date}</td>
//                     <td style={tdStyle()}>
//                       <span style={{
//                         background: c.status === "Overdue" ? "#fee2e2" : "#fef9c3",
//                         color:      c.status === "Overdue" ? "#dc2626" : "#ca8a04",
//                         border: `1px solid ${c.status === "Overdue" ? "#fca5a5" : "#fde68a"}`,
//                         borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700
//                       }}>{c.status}</span>
//                     </td>
//                   </tr>
//                 )) : (
//                   <tr><td colSpan={4} style={{ padding: "36px 20px", textAlign: "center", color: "#9ca3af", fontSize: 14, background: "#fff" }}>No outstanding records</td></tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </>
//       )}
//     </div>
//   );
// }


import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell
} from "recharts";
import {
  TrendingUp, Package, AlertTriangle,
  ShoppingBag, BarChart2, Wallet, Clock, IndianRupee,Bell,ChevronDown,
  Lock, LogOut
} from "lucide-react";

function useStyles() {
  useEffect(() => {
    const id = "db-v5-styles";
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id;
    s.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
      .db * { box-sizing: border-box; }
      @keyframes db-up   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
      @keyframes db-spin { to{transform:rotate(360deg)} }
      @keyframes db-num  { from{opacity:0;transform:scale(.88)} to{opacity:1;transform:scale(1)} }
      .db-card { transition: box-shadow .22s, transform .22s; }
      .db-card:hover { box-shadow: 0 8px 32px rgba(99,102,241,.13) !important; transform: translateY(-2px); }
      .db-row:hover td { background: #f8f7ff !important; }
      .db-row td { transition: background .15s; }
    `;
    document.head.appendChild(s);
    return () => document.head.removeChild(s);
  }, []);
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#1e1b4b", borderRadius: 12, padding: "10px 16px",
      fontFamily: "'Plus Jakarta Sans',sans-serif",
    }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,.55)", fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#a5b4fc" }}>₹{Number(payload[0].value).toLocaleString()}</div>
    </div>
  );
}

const ACCENTS = {
  green:  { bg: "#f0fdf4", icon: "#bbf7d0", iconFg: "#15803d", val: "#15803d", border: "#dcfce7" },
  blue:   { bg: "#eff6ff", icon: "#bfdbfe", iconFg: "#1d4ed8", val: "#1d4ed8", border: "#dbeafe" },
  red:    { bg: "#fff1f2", icon: "#fecdd3", iconFg: "#be123c", val: "#be123c", border: "#ffe4e6" },
  indigo: { bg: "#eef2ff", icon: "#c7d2fe", iconFg: "#4338ca", val: "#4338ca", border: "#e0e7ff" },
  orange: { bg: "#fff7ed", icon: "#fed7aa", iconFg: "#c2410c", val: "#b91c1c", border: "#fed7aa" },
};

function StatCard({ label, value, icon: Icon, accent, delay, prefix = "", suffix = "" }) {
  const c = ACCENTS[accent] || ACCENTS.indigo;
  return (
    <div className="db-card" style={{
      background: c.bg, border: `1.5px solid ${c.border}`,
      borderRadius: 18, padding: "22px 20px",
      animation: `db-up .45s ${delay}s ease both`,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: -18, right: -18, width: 70, height: 70, borderRadius: "50%", background: c.icon, opacity: .45, pointerEvents: "none" }} />
      <div style={{ width: 40, height: 40, borderRadius: 12, background: c.icon, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={18} color={c.iconFg} strokeWidth={2.2} />
      </div>
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: c.val, fontFamily: "'Plus Jakarta Sans',sans-serif", lineHeight: 1.1, animation: "db-num .5s ease both" }}>
          {prefix}{typeof value === "number" ? value.toLocaleString() : value}{suffix}
        </div>
      </div>
    </div>
  );
}

function StockBadge({ stock }) {
  const color = stock === 0 ? "#be123c" : stock <= 2 ? "#c2410c" : "#b45309";
  const bg    = stock === 0 ? "#fff1f2" : stock <= 2 ? "#fff7ed" : "#fefce8";
  const border= stock === 0 ? "#fecdd3" : stock <= 2 ? "#fed7aa" : "#fef08a";
  return (
    <span style={{ background: bg, color, border: `1px solid ${border}`, borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
      {stock === 0 ? "Out of stock" : `${stock} left`}
    </span>
  );
}

function SectionHeader({ icon: Icon, iconBg, iconColor, title, subtitle, badge }) {
  const font = "'Plus Jakarta Sans', sans-serif";
  return (
    <div style={{ padding: "16px 22px 12px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 10, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={15} color={iconColor} />
        </div>
        <div>
          <span style={{ fontSize: 15, fontWeight: 800, color: "#1e1b4b", fontFamily: font }}>{title}</span>
          {subtitle && <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }}>{subtitle}</div>}
        </div>
      </div>
      {badge}
    </div>
  );
}

export default function Dashboard() {
  useStyles();
  const font = "'Plus Jakarta Sans', sans-serif";

  const navigate = useNavigate();

const user = JSON.parse(localStorage.getItem("user") || "{}");

const [showProfile, setShowProfile] = useState(false);

  /* ── Company State ── */
  const [companies, setCompanies]         = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(
    localStorage.getItem("selected_company_id") || ""
  );

  /* ── Data State ── */
  const [stats, setStats]               = useState({ total_sales: 0, total_products: 0, monthly_sales: [] });
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [creditStats, setCreditStats]   = useState({ total_credit_sales: 0, total_outstanding: 0, overdue_amount: 0, today_collection: 0 });
  const [creditList, setCreditList]     = useState([]);
  const [loading, setLoading]           = useState(false);
  const [activeBar, setActiveBar]       = useState(null);
  const [unsoldProducts,setUnsoldProducts]=useState([]);


  const [showNotif,   setShowNotif]   = useState(false);
const [overdueList, setOverdueList] = useState([]);

const isAdmin = user?.role === "admin";
const bellRef = useRef(null);
const profileRef = useRef(null);


const [notifPos, setNotifPos] = useState({
  top: 0,
  left: 0,
});


  /* ── Load Companies on Mount ── */
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        // const user = JSON.parse(localStorage.getItem("user"));
        const adminId = user.role === "cashier" ? user.admin_id : user.id;
        const res = await api.get(`/company/get_companies_by_admin?admin_id=${adminId}&role=${user.role}`);
        if (res.data.status) {
          setCompanies(res.data.data || []);
          /* Auto-select first company if none saved */
          if (!localStorage.getItem("selected_company_id") && res.data.data.length > 0) {
            const firstId = String(res.data.data[0].id);
            setSelectedCompany(firstId);
            localStorage.setItem("selected_company_id", firstId);
          }
        }
      } catch (e) { console.error(e); }
    };
    loadCompanies();
  }, []);

  /* ── Fetch All Dashboard Data when company changes ── */
  useEffect(() => {
    if (!selectedCompany) return;
    fetchAllData(selectedCompany);
  }, [selectedCompany]);

  const fetchAllData = async (companyId) => {
    setLoading(true);
    await Promise.all([
      fetchStats(companyId),
      fetchLowStockProducts(companyId),
      fetchCreditDashboard(companyId),
    ]);
    setLoading(false);
  };

  const fetchStats = async (companyId) => {
    try {
      const [basic, analytics] = await Promise.all([
        api.get(`/dashboard/get_stats?company_id=${companyId}`),
        api.get(`/dashboard/get_analytics?company_id=${companyId}`)
      ]);
      if (basic.data.status && analytics.data.status) {
        setStats({ ...basic.data.data, monthly_sales: analytics.data.data.monthly_sales });
      }
    } catch (e) { console.error(e); }
  };

  const fetchLowStockProducts = async (companyId) => {
    try {
      const res = await api.get(`/product/get?company_id=${companyId}`);
      if (res.data.status) {
        setLowStockProducts(
          res.data.data.filter(p => p.status === "active" && Number(p.stock) <= 5)
        );
      }
    } catch (e) { console.error(e); }
  };

  const fetchUnsoldProducts = async () => {

    try{

        const res = await api.get(
            `/dashboard/get_unsold_products_notification?company_id=${selectedCompany}`
        );

        if(res.data.status){

            setUnsoldProducts(res.data.data);

        }

    }catch(err){

        console.log(err);

    }

};

useEffect(()=>{

    if(selectedCompany){

        fetchUnsoldProducts();

    }

},[selectedCompany]);

const fetchCreditDashboard = async (companyId) => {
  try {
    const res = await api.get(`/dashboard/get_dashboard?company_id=${companyId}`);
    if (res.data.status) {
      setCreditStats(res.data.cards);
      setCreditList(res.data.list);
      // ← add this
      const overdue = res.data.list.filter(c => c.status === "Overdue");
      setOverdueList(overdue);
    }
  } catch (e) { console.error(e); }
};

const fetchNotifications = async () => {

    // const user = JSON.parse(localStorage.getItem("user"));

    const adminId =
        user.role === "cashier"
            ? user.admin_id
            : user.id;

    const res = await api.get(
        `/dashboard/get_admin_overdue_notifications?admin_id=${adminId}`
    );

    if(res.data.status){

        setOverdueList(res.data.data);

    }

}

useEffect(()=>{

    fetchNotifications();

},[]);

  /* ── Company Change Handler ── */
  const handleCompanyChange = (e) => {
    const id = e.target.value;
    setSelectedCompany(id);
    localStorage.setItem("selected_company_id", id);
  };

  const thStyle = { padding: "10px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "#9ca3af", borderBottom: "1px solid #f3f4f6" };
  const tdStyle = (bg = "#fff") => ({ padding: "13px 20px", fontSize: 14, color: "#374151", background: bg });


 useEffect(() => {
  const handler = (e) => {
    if (!e.target.closest(".notif-bell")) setShowNotif(false);
    if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
  };
  document.addEventListener("mousedown", handler);
  return () => document.removeEventListener("mousedown", handler);
}, []);


  return (
    <div className="db" style={{ fontFamily: font }}>

      {/* ── Header with Company Dropdown ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, animation: "db-up .35s ease both", flexWrap: "wrap", gap: 14, overflow: "visible",  // ← ADD THIS
  position: "relative", // ← ADD THIS
  zIndex: 100   }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#1e1b4b" }}>Dashboard</h1>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: "#9ca3af" }}>Welcome back — here's what's happening today</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

          {/* ── Company Selector ── */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "#fff", border: "1.5px solid #e0e7ff",
            borderRadius: 14, padding: "10px 16px",
            boxShadow: "0 4px 16px rgba(99,102,241,.08)",
          }}>
            <span style={{ fontSize: 18 }}>🏢</span>
            <select
              value={selectedCompany}
              onChange={handleCompanyChange}
              style={{
                border: "none", outline: "none",
                background: "transparent",
                fontSize: 14, fontWeight: 700,
                color: "#1e1b4b", cursor: "pointer",
                fontFamily: font, minWidth: 160,
              }}
            >
              <option value="">Select Company</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.company_name}</option>
              ))}
            </select>
          </div>

          {/* ── Live Badge ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#eef2ff", border: "1.5px solid #e0e7ff", borderRadius: 12, padding: "8px 16px" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 0 3px rgba(34,197,94,.2)" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#4338ca" }}>Live data</span>
          </div>



        <div
    ref={profileRef}
    style={{ position: "relative" }}
>
    <button
        onClick={() => setShowProfile(v => !v)}
        style={{
            height: 42,
            padding: "0 16px",
            borderRadius: 12,
            border: "1.5px solid #e0e7ff",
            background: showProfile ? "#eef2ff" : "#fff",
            cursor: "pointer",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 5
        }}
    >
        {user.name}
        <ChevronDown size={16} />
    </button>

    {/* {showProfile &&
        <div
            style={{
                position: "absolute",
                right: 0,
                top: 48,
                width: 180,
                background: "#fff",
                borderRadius: 12,
                boxShadow: "0 10px 25px rgba(0,0,0,.12)",
                overflow: "hidden",
                zIndex: 9999
            }}
        >
            {(user.role === "admin" || user.role === "cashier") && (
                <div
                    style={{ padding: 14, cursor: "pointer" }}
                    onClick={() => {
                        setShowProfile(false);
                        navigate("/change-password");
                    }}
                >
                    🔒 Change Password
                </div>
            )}

            <div
                style={{ padding: 14, cursor: "pointer", color: "red" }}
                onClick={() => {
                    localStorage.clear();
                    navigate("/");
                }}
            >
                🚪 Logout
            </div>
        </div>
    } */}
    {showProfile &&
    <div
        style={{
            position: "absolute",
            right: 0,
            top: 50,
            width: 210,
            background: "#fff",
            borderRadius: 14,
            border: "1.5px solid #eef0ff",
            boxShadow: "0 12px 32px rgba(30,27,75,.14)",
            overflow: "hidden",
            zIndex: 9999,
            animation: "db-up .18s ease both",
        }}
    >
        {/* User info header */}
        <div style={{
            padding: "14px 16px",
            background: "#fafaff",
            borderBottom: "1px solid #f1f1f8",
        }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#1e1b4b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user.name}
            </div>
            <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "capitalize", marginTop: 2 }}>
                {user.role}
            </div>
        </div>

        {(user.role === "admin" || user.role === "cashier") && (
            <div
                className="db-row"
                style={{
                    padding: "12px 16px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    whiteSpace: "nowrap",
                }}
                onClick={() => {
                    setShowProfile(false);
                    navigate("/change-password");
                }}
            >
                <div style={{
                    width: 30, height: 30, borderRadius: 9,
                    background: "#eef2ff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                }}>
                    <Lock size={14} color="#4338ca" />
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: "#1e1b4b" }}>
                    Change Password
                </span>
            </div>
        )}

        <div
            className="db-row"
            style={{
                padding: "12px 16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
                borderTop: "1px solid #f4f4fa",
            }}
          onClick={async () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  try {
    await api.post("/auth/logout", { id: user.id, role: user.role });
  } catch (err) {
    console.error(err);
  }
  localStorage.clear();
  navigate("/");
}}
        >
            <div style={{
                width: 30, height: 30, borderRadius: 9,
                background: "#fff1f2",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
            }}>
                <LogOut size={14} color="#dc2626" />
            </div>
            <span  style={{ fontSize: 13.5, fontWeight: 700, color: "#dc2626" }}>
                Logout
            </span>
        </div>
    </div>
}
</div>
          {/* Bell Notification — admin only */}
{isAdmin && (
  <div ref={bellRef} style={{ position:"relative", zIndex: 1000 }}>
    <button
    className="notif-bell"
      onClick={() => setShowNotif(v => !v)}
      style={{
        width:42, height:42, borderRadius:12,
        border:"1.5px solid #e0e7ff",
        background: showNotif ? "#eef2ff" : "#fff",
        cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"center",
        boxShadow:"0 4px 16px rgba(99,102,241,.08)",
        position:"relative",
      }}
    >
      <Bell size={18} color="#4338ca"/>
      {/* {overdueList.length > 0 && ( */}
      {(overdueList.length + unsoldProducts.length) > 0 && (
        <span style={{
          position:"absolute", top:-6, right:-6,
          background:"#dc2626", color:"#fff",
          borderRadius:"50%", width:20, height:20,
          display:"flex", alignItems:"center",
          justifyContent:"center", fontSize:11, fontWeight:800,
        }}>
          {/* {overdueList.length} */}
          {overdueList.length + unsoldProducts.length}
        </span>
      )}
    </button>

    {/* NOTIFICATION DROPDOWN */}
    {showNotif && (
      <div style={{
        position:"absolute",
top:"52px",
right:0,
        width:340, background:"#fff",
        borderRadius:18, border:"1.5px solid #e0e7ff",
        boxShadow:"0 16px 48px rgba(99,102,241,.18)",
        zIndex:9999, overflow:"hidden",
        animation:"db-up .2s ease both",
      }}>
        {/* Header */}
        <div style={{
          background:"linear-gradient(135deg,#1e1b4b,#4338ca)",
          padding:"14px 18px",
          display:"flex", justifyContent:"space-between", alignItems:"center",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Bell size={15} color="#fff"/>
            <span style={{ color:"#fff", fontWeight:800, fontSize:14 }}>
              Notifications
            </span>
          </div>
          {/* <span style={{
            background:"#dc2626", color:"#fff",
            borderRadius:20, padding:"2px 10px",
            fontSize:11, fontWeight:800,
          }}>
            {overdueList.length} overdue
          </span> */}
          <span
  style={{
    background:"#dc2626",
    color:"#fff",
    borderRadius:20,
    padding:"2px 10px",
    fontSize:11,
    fontWeight:800
  }}
>
  {overdueList.length + unsoldProducts.length} Alerts
</span>
        </div>
         <div
    style={{
        background:"#fef2f2",
        padding:"10px 15px",
        fontWeight:700,
        color:"#dc2626",
        borderTop:"1px solid #fecaca",
        borderBottom:"1px solid #fecaca"
    }}
    >
        💰 Overdue Customers
    </div>

        {/* List */}
        <div style={{ maxHeight:320, overflowY:"auto" }}>
          {overdueList.length === 0 ? (
            <div style={{ padding:"32px 20px", textAlign:"center", color:"#9ca3af" }}>
              <div style={{ fontSize:32, marginBottom:8 }}>✅</div>
              <div style={{ fontWeight:700 }}>No overdue customers</div>
            </div>
          ) : overdueList.map((c, i) => (
            <div key={i} style={{
              padding:"12px 18px",
              borderBottom:"1px solid #f1f5f9",
              display:"flex", justifyContent:"space-between", alignItems:"center",
            }}>
              <div>
                <div style={{ fontWeight:700, fontSize:13, color:"#1e1b4b" }}>
                  {c.customer}
                </div>
                <div style={{ fontSize:11, color:"#dc2626", marginTop:2, fontWeight:600 }}>
                  Due: {c.due_date}
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontWeight:800, fontSize:14, color:"#dc2626" }}>
                  ₹{Number(c.outstanding).toLocaleString()}
                </div>
                <span style={{
                  background:"#fee2e2", color:"#dc2626",
                  borderRadius:20, padding:"2px 8px",
                  fontSize:10, fontWeight:700,
                }}>
                  Overdue
                </span>
              </div>
            </div>
          ))}
        </div>

         {(overdueList.length + unsoldProducts.length) > 0 && (
          <div style={{
            padding:"12px 18px", borderTop:"1px solid #f1f5f9",
            background:"#fafafa", textAlign:"center",
          }}>
            <span style={{ fontSize:12, color:"#6366f1", fontWeight:700, cursor:"pointer" }}
onClick={() => {

    if (bellRef.current) {

        const rect = bellRef.current.getBoundingClientRect();

        setNotifPos({
            top: rect.bottom + 10,
            left: rect.right - 340,
        });

    }

    setShowNotif(v => !v);

}}            >
              Total Overdue: ₹{overdueList.reduce((s,c) => s + Number(c.outstanding), 0).toLocaleString()}
            </span>
          </div>
        )}

        {unsoldProducts.length>0 && (

<div
style={{
background:"#fff7ed",
padding:"10px 15px",
fontWeight:700,
color:"#c2410c",
borderTop:"1px solid #fde68a",
borderBottom:"1px solid #fde68a"
}}
>

📦 Unsold Products

</div>

)}

{unsoldProducts.map((p,i)=>(

<div
key={i}
style={{
padding:"12px 18px",
borderBottom:"1px solid #f3f4f6"
}}
>

<div
style={{
fontWeight:700,
color:"#1e1b4b"
}}
>

📦 {p.product_name}

</div>

<div
style={{
fontSize:12,
color:"#dc2626",
marginTop:4
}}
>

{
p.last_sale=="Never Billed"
?
"Never billed"
:
`No billing for ${p.days} days`
}

</div>

</div>

))}

        {/* Footer */}
        {/* {overdueList.length > 0 && ( */}
        {/* {(overdueList.length + unsoldProducts.length) > 0 && (
          <div style={{
            padding:"12px 18px", borderTop:"1px solid #f1f5f9",
            background:"#fafafa", textAlign:"center",
          }}>
            <span style={{ fontSize:12, color:"#6366f1", fontWeight:700, cursor:"pointer" }}
onClick={() => {

    if (bellRef.current) {

        const rect = bellRef.current.getBoundingClientRect();

        setNotifPos({
            top: rect.bottom + 10,
            left: rect.right - 340,
        });

    }

    setShowNotif(v => !v);

}}            >
              Total Overdue: ₹{overdueList.reduce((s,c) => s + Number(c.outstanding), 0).toLocaleString()}
            </span>
          </div>
        )} */}
      </div>
    )}
  </div>
)}

        </div>
      </div>

      {/* ── No Company Selected ── */}
      {!selectedCompany ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "80px 20px",
          background: "#fff", borderRadius: 20, border: "1.5px solid #e0e7ff",
        }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🏢</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#1e1b4b", marginBottom: 8 }}>Select a Company</div>
          <div style={{ fontSize: 14, color: "#9ca3af" }}>Choose a company from the dropdown above to view dashboard data</div>
        </div>
      ) : loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, gap: 10, color: "#6366f1", fontFamily: font }}>
          <span style={{ width: 20, height: 20, border: "2.5px solid #c7d2fe", borderTopColor: "#6366f1", borderRadius: "50%", display: "inline-block", animation: "db-spin .8s linear infinite" }} />
          Loading dashboard…
        </div>
      ) : (
        <>
          {/* ── Top 3 Cards ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 14 }}>
            <StatCard label="Total Sales"    value={stats.total_sales}       icon={TrendingUp}    accent="green"  delay={0}    prefix="₹" />
            <StatCard label="Total Products" value={stats.total_products}    icon={Package}       accent="blue"   delay={0.07} />
            <StatCard label="Low Stock"      value={lowStockProducts.length} icon={AlertTriangle} accent="red"    delay={0.14} suffix=" items" />
          </div>

          {/* ── Credit Cards ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
            <StatCard label="Credit Sales"     value={creditStats.total_credit_sales} icon={ShoppingBag}   accent="indigo" delay={0.18} prefix="₹" />
            <StatCard label="Outstanding"      value={creditStats.total_outstanding}  icon={Wallet}        accent="red"    delay={0.22} prefix="₹" />
            <StatCard label="Overdue"          value={creditStats.overdue_amount}     icon={Clock}         accent="orange" delay={0.26} prefix="₹" />
            <StatCard label="Today Collection" value={creditStats.today_collection}   icon={IndianRupee}   accent="green"  delay={0.30} prefix="₹" />
          </div>

          {/* ── Chart ── */}
          <div style={{ background: "#fff", border: "1.5px solid #e0e7ff", borderRadius: 20, padding: "22px 24px", marginBottom: 20, animation: "db-up .45s .32s ease both" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#1e1b4b" }}>Monthly Sales</div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>Revenue overview this year</div>
              </div>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <BarChart2 size={16} color="#6366f1" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.monthly_sales} barSize={32}
                onMouseMove={s => setActiveBar(s.isTooltipActive ? s.activeTooltipIndex : null)}
                onMouseLeave={() => setActiveBar(null)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f8" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af", fontFamily: font, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af", fontFamily: font }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,.06)", radius: 8 }} />
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#6366f1" stopOpacity={1} />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <Bar dataKey="total" radius={[10, 10, 0, 0]}>
                  {stats.monthly_sales.map((_, i) => (
                    <Cell key={i} fill={activeBar === null ? "url(#barGrad)" : activeBar === i ? "#4f46e5" : "#c7d2fe"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── Low Stock Table ── */}
          <div style={{ background: "#fff", border: "1.5px solid #ffe4e6", borderRadius: 20, overflow: "hidden", marginBottom: 20, animation: "db-up .45s .36s ease both" }}>
            <SectionHeader
              icon={AlertTriangle} iconBg="#fff1f2" iconColor="#be123c"
              title="Low Stock Products" subtitle="Items with 5 or fewer units remaining"
              badge={lowStockProducts.length > 0 && (
                <span style={{ background: "#fff1f2", color: "#be123c", border: "1.5px solid #fecdd3", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700 }}>
                  {lowStockProducts.length} alert{lowStockProducts.length > 1 ? "s" : ""}
                </span>
              )}
            />
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: font }}>
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  {["#", "Product Name", "Price", "Stock"].map((h, i) => <th key={i} style={thStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.length > 0 ? lowStockProducts.map((item, i) => (
                  <tr key={item.id} className="db-row" style={{ borderBottom: "1px solid #fafafa" }}>
                    <td style={tdStyle()}><span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 600 }}>{String(i + 1).padStart(2, "0")}</span></td>
                    <td style={tdStyle()}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 9, background: "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Package size={13} color="#7c3aed" />
                        </div>
                        <span style={{ fontWeight: 700, color: "#1e1b4b" }}>{item.product_name}</span>
                      </div>
                    </td>
                    <td style={tdStyle()}>₹{Number(item.price).toLocaleString()}</td>
                    <td style={tdStyle()}><StockBadge stock={Number(item.stock)} /></td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} style={{ padding: "36px 20px", textAlign: "center", color: "#9ca3af", fontSize: 14, background: "#fff" }}>All products are well stocked</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Outstanding Table ── */}
          <div style={{ background: "#fff", border: "1.5px solid #e0e7ff", borderRadius: 20, overflow: "hidden", animation: "db-up .45s .40s ease both" }}>
            <SectionHeader
              icon={Wallet} iconBg="#eef2ff" iconColor="#4338ca"
              title="Outstanding Customers" subtitle="Pending credit payments"
            />
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: font }}>
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  {["Customer", "Outstanding", "Due Date", "Status"].map((h, i) => <th key={i} style={thStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {creditList.length > 0 ? creditList.map((c, i) => (
                  <tr key={i} className="db-row" style={{ borderBottom: "1px solid #fafafa" }}>
                    <td style={tdStyle()}><span style={{ fontWeight: 700, color: "#1e1b4b" }}>{c.customer}</span></td>
                    <td style={tdStyle()}>₹{Number(c.outstanding).toLocaleString()}</td>
                    <td style={tdStyle()}>{c.due_date}</td>
                    <td style={tdStyle()}>
                      <span style={{
                        background: c.status === "Overdue" ? "#fee2e2" : "#fef9c3",
                        color:      c.status === "Overdue" ? "#dc2626" : "#ca8a04",
                        border: `1px solid ${c.status === "Overdue" ? "#fca5a5" : "#fde68a"}`,
                        borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700
                      }}>{c.status}</span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} style={{ padding: "36px 20px", textAlign: "center", color: "#9ca3af", fontSize: 14, background: "#fff" }}>No outstanding records</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}