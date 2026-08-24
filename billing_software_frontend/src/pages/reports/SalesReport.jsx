// import { useEffect, useState, useCallback } from "react";
// import { useNavigate } from "react-router-dom";
// import api from "../../services/api";

// import {
//   FileText,
//   Search,
//   ChevronLeft,
//   ChevronRight,
//   Eye,
//   Receipt,
//   Download,
//   Filter,
//   X,
//   FileDown,
//   TrendingUp,
// } from "lucide-react";

// import * as XLSX from "xlsx";
// import { saveAs } from "file-saver";
// import jsPDF from "jspdf";
// import autoTable from "jspdf-autotable";

// /* ─── Inject Styles ─────────────────────────────────────────── */
// function useStyles() {
//   useEffect(() => {
//     const id = "reports-styles-v2";
//     if (document.getElementById(id)) return;
//     const s = document.createElement("style");
//     s.id = id;
//     s.innerHTML = `
//       @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
//       .rp * { box-sizing: border-box; }
//       @keyframes rp-in {
//         from { opacity: 0; transform: translateY(14px); }
//         to   { opacity: 1; transform: none; }
//       }
//       @keyframes fadeSlide {
//         from { opacity: 0; transform: translateY(-8px); }
//         to   { opacity: 1; transform: none; }
//       }
//       .rp-row { transition: background .15s; cursor: pointer; font-size:12px; }
//       .rp-row:hover td { background: #f5f7ff !important; }
//       .rp-view-btn { transition: all .18s; }
//       .rp-pg-btn  { transition: all .18s; }
//       .rp-pg-btn:hover:not(:disabled) { background: #e0e7ff !important; color: #4338ca !important; }
//       .rp-search:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,.1) !important; }
//       .rp-card   { animation: rp-in .4s ease both; }
//       .filter-panel { animation: fadeSlide .25s ease both; }
//       .rp-filter-input:focus {
//         border-color: #6366f1 !important;
//         box-shadow: 0 0 0 3px rgba(99,102,241,.08) !important;
//         outline: none;
//       }
//       .rp-dl-btn:hover { opacity: .88; transform: translateY(-1px); }
//       .rp-dl-btn { transition: all .18s; }
//     `;
//     document.head.appendChild(s);
//     return () => document.head.removeChild(s);
//   }, []);
// }

// /* ─── Constants ──────────────────────────────────────────────── */
// const FONT  = "'Plus Jakarta Sans', sans-serif";
// const INDIGO = "#4338ca";

// const PAYMENT_METHODS = ["all", "cash", "online", "upi", "credit"];

// const METHOD_LABEL = {
//   all:    "All Methods",
//   cash:   "Cash",
//   online: "Online",
//   upi:    "UPI",
//   credit: "Credit",
// };
// const PAYMENT_STATUSES = ["all", "paid", "pending", "not_paid", "overdue"];

// const STATUS_LABEL = {
//   all:      "All Status",
//   paid:     "Paid",
//   pending:  "Pending",       // ← add this
//   not_paid: "Not Paid",
//   overdue:  "Overdue",
// };

// const statusBadge = (s) => {
//   const map = {
//     paid:     { bg: "#dcfce7", color: "#15803d" },
//     pending:  { bg: "#dbeafe", color: "#1d4ed8" }, // ← add this (blue)
//     not_paid: { bg: "#fee2e2", color: "#dc2626" },
//     overdue:  { bg: "#fef3c7", color: "#b45309" },
//   };
//   return map[s?.toLowerCase()] || { bg: "#f1f5f9", color: "#64748b" };
// };

// /* ─── Summary Card ───────────────────────────────────────────── */
// function SummaryCard({ label, value, color, icon }) {
//   return (
//     <div style={{
//       background: "#fff",
//       border: "1.5px solid #e0e7ff",
//       borderRadius: 16,
//       padding: "14px 20px",
//       display: "flex",
//       alignItems: "center",
//       gap: 14,
//       minWidth: 170,
//       flex: 1,
//     }}>
//       <div style={{
//         width: 40, height: 40, borderRadius: 12,
//         background: color + "18",
//         display: "flex", alignItems: "center", justifyContent: "center",
//       }}>
//         {icon}
//       </div>
//       <div>
//         <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>{label}</div>
//         <div style={{ fontSize: 15, fontWeight: 800, color: "#1e1b4b" }}>{value}</div>
//       </div>
//     </div>
//   );
// }

// /* ─── Main Component ─────────────────────────────────────────── */
// export default function Reports() {
//   useStyles();
//   const navigate = useNavigate();

//   /* state */
//   const [invoices,    setInvoices]    = useState([]);
//   const [summary,     setSummary]     = useState(null);
//   const [loading,     setLoading]     = useState(false);
//   const [search,      setSearch]      = useState("");
//   const [currentPage, setCurrentPage] = useState(1);
//   const [showFilter,  setShowFilter]  = useState(false);

//   /* filter fields */
//   const [fromDate,       setFromDate]       = useState("");
//   const [toDate,         setToDate]         = useState("");
//   const [paymentMethod,  setPaymentMethod]  = useState("all");
//   const [paymentStatus,  setPaymentStatus]  = useState("all");
//   const [customerFilter, setCustomerFilter] = useState("");

//   /* applied badge count */
//   const appliedCount = [
//     fromDate || toDate,
//     paymentMethod !== "all",
//     paymentStatus !== "all",
//     customerFilter,
//   ].filter(Boolean).length;

//   const recordsPerPage = 10;

//   /* ── fetch ── */
//   const fetchFiltered = useCallback(async (filters = {}) => {
//     setLoading(true);
//     try {
//       // const user = JSON.parse(localStorage.getItem("user"));
//       // if (!user?.company_id) return;
//       // const res = await api.post("/invoice/get_filtered_invoices", {
//       //   company_id:     user.company_id,
//       //   from_date:      filters.fromDate      ?? fromDate,
//       //   to_date:        filters.toDate        ?? toDate,
//       //   payment_method: filters.paymentMethod ?? paymentMethod,
//       //   payment_status: filters.paymentStatus ?? paymentStatus,
//       //   customer_name:  filters.customerFilter ?? customerFilter,
//       // });
//       const company_id =
//   localStorage.getItem("selected_company_id");

// console.log("REPORT COMPANY ID =", company_id);

// if (!company_id) return;

// const res = await api.post("/invoice/get_filtered_invoices", {
//   company_id,
//   from_date: filters.fromDate ?? fromDate,
//   to_date: filters.toDate ?? toDate,
//   payment_method: filters.paymentMethod ?? paymentMethod,
//   payment_status: filters.paymentStatus ?? paymentStatus,
//   customer_name: filters.customerFilter ?? customerFilter,
// });
//       if (res.data.status) {
//         setInvoices(res.data.data);
//         setSummary(res.data.summary);
//         setCurrentPage(1);
//       }
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   }, [fromDate, toDate, paymentMethod, paymentStatus, customerFilter]);

//   /* initial load — fetch all */
//   useEffect(() => { fetchFiltered(); }, []); // eslint-disable-line

//   /* ── search (client-side within filtered results) ── */
//   const filtered = invoices.filter(inv =>
//     inv.invoice_no?.toLowerCase().includes(search.toLowerCase()) ||
//     inv.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
//     inv.customer_phone?.includes(search)
//   );

//   /* ── pagination ── */
//   const totalPages   = Math.ceil(filtered.length / recordsPerPage);
//   const indexOfFirst = (currentPage - 1) * recordsPerPage;
//   const current      = filtered.slice(indexOfFirst, indexOfFirst + recordsPerPage);
//   const pages        = Array.from({ length: totalPages }, (_, i) => i + 1);
//   const goTo         = (p) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));

//   /* ── apply filter ── */
//   const applyFilter = () => {
//     fetchFiltered();
//   };

//   /* ── reset filter ── */
//   const resetFilter = () => {
//     setFromDate("");
//     setToDate("");
//     setPaymentMethod("all");
//     setPaymentStatus("all");
//     setCustomerFilter("");
//     fetchFiltered({
//       fromDate: "", toDate: "",
//       paymentMethod: "all", paymentStatus: "all", customerFilter: "",
//     });
   
//   };

//   /* ── Excel download ── */
//   const downloadExcel = (rows, label) => {
//     if (!rows.length) { alert("No data to export"); return; }
//     // const excelData = rows.map((inv, i) => ({
//     //   "S.No":                i + 1,
//     //   "Invoice No":          inv.invoice_no,
//     //   "Customer Name":       inv.customer_name,
//     //   "Phone":               inv.customer_phone,
//     //   "Invoice Generated By": inv.cashier_name || "-",
//     //   "Payment Method":      inv.payment_method,
//     //   "Payment Status":      inv.payment_status,
//     //   "Total Amount":        `₹${Number(inv.total_amount).toLocaleString()}`,
//     //   "Paid Amount":         `₹${Number(inv.paid_amount).toLocaleString()}`,
//     //   "Balance Amount":      `₹${Number(inv.balance_amount).toLocaleString()}`,
//     //   "Date":                inv.created_at,
//     // }));
//     const excelData = rows.map((inv, i) => ({
//   // "S.No": i + 1,
//   "GST Number": inv.gstin || "-",
//   "Invoice No": inv.invoice_no,
//   "Customer Name": inv.customer_name,
//   "Phone": inv.customer_phone,
//   "Invoice Generated By": inv.cashier_name || "-",
//   "Payment Method": inv.payment_method,
//   "Payment Status": inv.payment_status,
//   "Total Amount": `₹${Number(inv.total_amount).toLocaleString()}`,
//   "Paid Amount": `₹${Number(inv.paid_amount).toLocaleString()}`,
//   "Balance Amount": `₹${Number(inv.balance_amount).toLocaleString()}`,
//   "Date": inv.created_at,
// }));
//     const ws = XLSX.utils.json_to_sheet(excelData);
//     // ws["!cols"] = [
//     //   { wch: 6 }, { wch: 20 }, { wch: 28 }, { wch: 16 },
//     //   { wch: 22 }, { wch: 16 }, { wch: 16 },
//     //   { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 22 },
//     // ];

//     ws["!cols"] = [
//   // { wch: 6 },   // S.No
//   { wch: 22 },  // GST Number
//   { wch: 20 },  // Invoice No
//   { wch: 28 },  // Customer
//   { wch: 16 },  // Phone
//   { wch: 22 },  // Generated By
//   { wch: 16 },  // Method
//   { wch: 16 },  // Status
//   { wch: 16 },  // Total
//   { wch: 16 },  // Paid
//   { wch: 16 },  // Balance
//   { wch: 22 },  // Date
// ];
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, "Invoice Report");
//     const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
//     saveAs(
//       new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
//       `invoice_report_${label}.xlsx`
//     );
//   };

//   /* ── PDF download ── */
//  /* ── PDF download ── */
// const downloadPDF = (rows, label) => {
//   if (!rows.length) { alert("No data to export"); return; }
//   const doc = new jsPDF({ orientation: "landscape" });
//   doc.setFontSize(14);
//   doc.setTextColor(67, 56, 202);
//   doc.text("Invoice Report", 14, 16);
//   doc.setFontSize(9);
//   doc.setTextColor(120, 120, 120);
//   doc.text(`Generated: ${new Date().toLocaleString("en-IN")}   |   Filter: ${label}`, 14, 23);

//   autoTable(doc, {
//     startY: 28,
//     head: [[
//       "GST Number", "Invoice No", "Customer", "Phone",
//       "Generated By", "Method", "Status",
//       "Total", "Paid", "Balance", "Date"
//     ]],
//     body: rows.map((inv) => [
//       inv.gstin || "-",
//       inv.invoice_no,
//       inv.customer_name,
//       inv.customer_phone,
//       inv.cashier_name || "-",
//       inv.payment_method,
//       inv.payment_status,
//     `Rs.${Number(inv.total_amount).toFixed(2)}`,
// `Rs.${Number(inv.paid_amount).toFixed(2)}`,
// `Rs.${Number(inv.balance_amount).toFixed(2)}`,
//       inv.created_at?.split(" ")[0] || "",
//     ]),
//     headStyles: {
//       fillColor: [67, 56, 202],
//       textColor: 255,
//       fontStyle: "bold",
//       fontSize: 7,
//     },
//     bodyStyles: { fontSize: 7 },
//     alternateRowStyles: { fillColor: [238, 242, 255] },
//     columnStyles: {
//       0: { cellWidth: 28 }, // GST Number
//       1: { cellWidth: 22 }, // Invoice No
//       2: { cellWidth: 28 }, // Customer
//       3: { cellWidth: 20 }, // Phone
//       4: { cellWidth: 22 }, // Generated By
//       5: { cellWidth: 16 }, // Method
//       6: { cellWidth: 16 }, // Status
//       7: { cellWidth: 18 }, // Total
//       8: { cellWidth: 18 }, // Paid
//       9: { cellWidth: 18 }, // Balance
//       10:{ cellWidth: 22 }, // Date
//     },
//     styles: { cellPadding: 2.5 },
//   });

//   const finalY = doc.lastAutoTable.finalY + 8;
//   doc.setFontSize(9);
//   doc.setTextColor(67, 56, 202);
//   doc.text(
//     `Total: ${rows.length} invoices  |  ` +
//    `Amount: Rs.${rows.reduce((s, r) => s + Number(r.total_amount), 0).toFixed(2)}  |  ` +
// `Paid: Rs.${rows.reduce((s, r) => s + Number(r.paid_amount), 0).toFixed(2)}  |  ` +
// `Pending: Rs.${rows.reduce((s, r) => s + Number(r.balance_amount), 0).toFixed(2)}`,
//     14, finalY
//   );

//   doc.save(`invoice_report_${label}.pdf`);
// };

//   /* ── build filter label for filename ── */
//   const filterLabel = () => {
//     const parts = [];
//     if (fromDate) parts.push(`from_${fromDate}`);
//     if (toDate)   parts.push(`to_${toDate}`);
//     if (paymentMethod !== "all") parts.push(paymentMethod);
//     if (paymentStatus !== "all") parts.push(paymentStatus);
//     return parts.length ? parts.join("_") : "all";
//   };

//   /* ── styles ── */
//   const inputStyle = {
//     width: "100%",
//     padding: "9px 12px",
//     border: "1.5px solid #e0e7ff",
//     borderRadius: 10,
//     fontSize: 12,
//     fontFamily: FONT,
//     background: "#fff",
//     color: "#1e1b4b",
//   };

//   const selectStyle = { ...inputStyle, cursor: "pointer" };

//   const btnPrimary = {
//     background: INDIGO,
//     border: "none",
//     color: "#fff",
//     padding: "10px 18px",
//     borderRadius: 12,
//     fontSize: 12,
//     fontWeight: 700,
//     cursor: "pointer",
//     fontFamily: FONT,
//     display: "flex",
//     alignItems: "center",
//     gap: 7,
//   };

//   /* ── payment method badge color ── */
//   const methodBadge = (m) => {
//     const map = {
//       cash:   { bg: "#dcfce7", color: "#15803d" },
//       online: { bg: "#dbeafe", color: "#1d4ed8" },
//       upi:    { bg: "#f3e8ff", color: "#7e22ce" },
//       credit: { bg: "#fef3c7", color: "#b45309" },
//     };
//     return map[m?.toLowerCase()] || { bg: "#fee2e2", color: "#dc2626" };
//   };



//   /* ── render ── */
//   return (
//     <div className="rp" style={{ fontFamily: FONT, padding: "22px 26px" }}>

//       {/* ── HEADER ── */}
//       <div style={{
//         display: "flex", alignItems: "center",
//         justifyContent: "space-between",
//         marginBottom: 20, flexWrap: "wrap", gap: 14,
//       }}>

//         <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
//           <div style={{ fontSize: 22 }}>🧾</div>
//           <div>
//             <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1e1b4b" }}>
//               Invoice Reports
//             </h1>
//             <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9ca3af" }}>
//               Advanced filter — search, download PDF & Excel
//             </p>
//           </div>
//         </div>

//         {/* Download buttons */}
//         <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
//           <button
//             className="rp-dl-btn"
//             onClick={() => downloadExcel(filtered, filterLabel())}
//             style={{ ...btnPrimary, background: "#16a34a" }}
//           >
//             <Download size={14} /> Excel
//           </button>
//           <button
//             className="rp-dl-btn"
//             onClick={() => downloadPDF(filtered, filterLabel())}
//             style={{ ...btnPrimary, background: "#dc2626" }}
//           >
//             <FileDown size={14} /> PDF
//           </button>
//         </div>
//       </div>

//       {/* ── SUMMARY CARDS ── */}
//       {summary && (
//         <div style={{
//           display: "flex", gap: 12,
//           flexWrap: "wrap", marginBottom: 20,
//         }}>
//           <SummaryCard
//             label="Total Invoices"
//             value={summary.total_invoices}
//             color="#4338ca"
//             icon={<Receipt size={18} color="#4338ca" />}
//           />
//           <SummaryCard
//             label="Total Amount"
//             value={`₹${Number(summary.total_amount).toLocaleString()}`}
//             color="#0891b2"
//             icon={<TrendingUp size={18} color="#0891b2" />}
//           />
//           <SummaryCard
//             label="Total Paid"
//             value={`₹${Number(summary.total_paid).toLocaleString()}`}
//             color="#16a34a"
//             icon={<TrendingUp size={18} color="#16a34a" />}
//           />
//           <SummaryCard
//             label="Total Pending"
//             value={`₹${Number(summary.total_pending).toLocaleString()}`}
//             color="#dc2626"
//             icon={<TrendingUp size={18} color="#dc2626" />}
//           />
//         </div>
//       )}

//       {/* ── SEARCH + FILTER ROW ── */}
//       <div style={{ display: "flex", gap: 10, marginBottom: 18, alignItems: "center" }}>

//         {/* search */}
//         <div style={{ position: "relative", flex: 1 }}>
//           <Search size={15} color="#6366f1" style={{
//             position: "absolute", left: 14,
//             top: "50%", transform: "translateY(-50%)",
//           }} />
//           <input
//             className="rp-search"
//             value={search}
//             onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
//             placeholder="Search by invoice no, customer, phone…"
//             style={{
//               width: "100%", padding: "11px 14px 11px 40px",
//               background: "#fff", border: "1.5px solid #e0e7ff",
//               borderRadius: 12, fontSize: 12, outline: "none", fontFamily: FONT,
//             }}
//           />
//         </div>

//         {/* filter toggle */}
//         <button
//           onClick={() => setShowFilter(v => !v)}
//           style={{
//             ...btnPrimary,
//             background: showFilter ? INDIGO : "#eef2ff",
//             color: showFilter ? "#fff" : INDIGO,
//             position: "relative",
//           }}
//         >
//           <Filter size={14} />
//           Filter
//           {appliedCount > 0 && (
//             <span style={{
//               position: "absolute", top: -6, right: -6,
//               background: "#dc2626", color: "#fff",
//               borderRadius: "50%", width: 18, height: 18,
//               display: "flex", alignItems: "center",
//               justifyContent: "center", fontSize: 10, fontWeight: 800,
//             }}>{appliedCount}</span>
//           )}
//         </button>

//         {/* reset */}
//         {appliedCount > 0 && (
//           <button
//             onClick={resetFilter}
//             style={{
//               ...btnPrimary,
//               background: "#fee2e2",
//               color: "#dc2626",
//             }}
//           >
//             <X size={13} /> Reset
//           </button>
//         )}
//       </div>

//       {/* ── FILTER PANEL ── */}
//       {showFilter && (
//         <div className="filter-panel" style={{
//           background: "#fff",
//           border: "1.5px solid #e0e7ff",
//           borderRadius: 18,
//           padding: "20px 22px",
//           marginBottom: 18,
//           display: "grid",
//           gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
//           gap: 14,
//         }}>

//           {/* From Date */}
//           <div>
//             <label style={{ fontSize: 11, fontWeight: 700, color: "#4338ca", display: "block", marginBottom: 6 }}>
//               From Date
//             </label>
//             <input
//               type="date"
//               className="rp-filter-input"
//               value={fromDate}
//               onChange={(e) => setFromDate(e.target.value)}
//               style={inputStyle}
//             />
//           </div>

//           {/* To Date */}
//           <div>
//             <label style={{ fontSize: 11, fontWeight: 700, color: "#4338ca", display: "block", marginBottom: 6 }}>
//               To Date
//             </label>
//             <input
//               type="date"
//               className="rp-filter-input"
//               value={toDate}
//               onChange={(e) => setToDate(e.target.value)}
//               style={inputStyle}
//             />
//           </div>

//           {/* Payment Method */}
//           <div>
//             <label style={{ fontSize: 11, fontWeight: 700, color: "#4338ca", display: "block", marginBottom: 6 }}>
//               Payment Method
//             </label>
//             <select
//               className="rp-filter-input"
//               value={paymentMethod}
//               onChange={(e) => setPaymentMethod(e.target.value)}
//               style={selectStyle}
//             >
//               {PAYMENT_METHODS.map(m => (
//                 <option key={m} value={m}>{METHOD_LABEL[m]}</option>
//               ))}
//             </select>
//           </div>

//           {/* Payment Status */}
//           <div>
//             <label style={{ fontSize: 11, fontWeight: 700, color: "#4338ca", display: "block", marginBottom: 6 }}>
//               Payment Status
//             </label>
//             <select
//               className="rp-filter-input"
//               value={paymentStatus}
//               onChange={(e) => setPaymentStatus(e.target.value)}
//               style={selectStyle}
//             >
//               {PAYMENT_STATUSES.map(s => (
//                 <option key={s} value={s}>{STATUS_LABEL[s]}</option>
//               ))}
//             </select>
//           </div>

//           {/* Customer Name */}
//           <div>
//             <label style={{ fontSize: 11, fontWeight: 700, color: "#4338ca", display: "block", marginBottom: 6 }}>
//               Customer Name
//             </label>
//             <input
//               type="text"
//               className="rp-filter-input"
//               value={customerFilter}
//               onChange={(e) => setCustomerFilter(e.target.value)}
//               placeholder="Search customer…"
//               style={inputStyle}
//             />
//           </div>

//           {/* Buttons */}
//           <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 8 }}>
//             <button onClick={applyFilter} style={{ ...btnPrimary, justifyContent: "center" }}>
//               Apply Filter
//             </button>
//             <button
//               onClick={resetFilter}
//               style={{
//                 ...btnPrimary,
//                 background: "#f1f5f9", color: "#64748b",
//                 justifyContent: "center",
//               }}
//             >
//               Reset All
//             </button>
//           </div>

//         </div>
//       )}

//       {/* ── TABLE ── */}
//       <div className="rp-card" style={{
//         background: "#fff", borderRadius: 20,
//         border: "1.5px solid #e0e7ff", overflow: "hidden",
//       }}>
//         <div style={{ height: 4, background: "linear-gradient(90deg,#4338ca,#6366f1,#818cf8)" }} />

//         <div style={{ overflowX: "auto" }}>
//           <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>

//             <thead>
//               <tr style={{ background: "#eef2ff" }}>
//                 {["#", "Invoice No", "Customer", "Phone", "Amount", "Paid", "Balance", "Method", "Status", "By", "Action"].map((h, i) => (
//                   <th key={i} style={{
//                     padding: "12px 16px", textAlign: "left",
//                     fontSize: 11, fontWeight: 700, color: INDIGO,
//                     borderBottom: "1px solid #dbeafe", whiteSpace: "nowrap",
//                   }}>{h}</th>
//                 ))}
//               </tr>
//             </thead>

//             <tbody>
//               {loading ? (
//                 <tr>
//                   <td colSpan={11} style={{ padding: 50, textAlign: "center", color: "#9ca3af" }}>
//                     Loading…
//                   </td>
//                 </tr>
//               ) : current.length > 0 ? current.map((inv, i) => {
//                 const mb = methodBadge(inv.payment_method);
//                 const sb = statusBadge(inv.payment_status);
//                 return (
//                   <tr key={i} className="rp-row" onClick={() => navigate(`/invoice/${inv.invoice_no}`)}>

//                     <td style={{ padding: "13px 16px" }}>{indexOfFirst + i + 1}</td>

//                     {/* Invoice No */}
//                     <td style={{ padding: "13px 16px" }}>
//                       <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//                         <div style={{
//                           width: 30, height: 30, borderRadius: 9,
//                           background: "#eef2ff", display: "flex",
//                           alignItems: "center", justifyContent: "center",
//                         }}>
//                           <Receipt size={13} color={INDIGO} />
//                         </div>
//                         <span style={{ fontWeight: 700, color: INDIGO }}>{inv.invoice_no}</span>
//                       </div>
//                     </td>

//                     <td style={{ padding: "13px 16px" }}>{inv.customer_name}</td>
//                     <td style={{ padding: "13px 16px", color: "#6b7280" }}>{inv.customer_phone}</td>

//                     {/* Amount */}
//                     <td style={{ padding: "13px 16px", fontWeight: 700, color: "#1e1b4b" }}>
//                       ₹{Number(inv.total_amount).toLocaleString()}
//                     </td>

//                     {/* Paid */}
//                     <td style={{ padding: "13px 16px", fontWeight: 700, color: "#16a34a" }}>
//                       ₹{Number(inv.paid_amount).toLocaleString()}
//                     </td>

//                     {/* Balance */}
//                     <td style={{ padding: "13px 16px", fontWeight: 700, color: Number(inv.balance_amount) > 0 ? "#dc2626" : "#9ca3af" }}>
//                       ₹{Number(inv.balance_amount).toLocaleString()}
//                     </td>

//                     {/* Method badge */}
//                     <td style={{ padding: "13px 16px" }}>
//                       <span style={{
//                         padding: "5px 11px", borderRadius: 20, fontSize: 11,
//                         fontWeight: 700, background: mb.bg, color: mb.color,
//                       }}>
//                         {inv.payment_method || "-"}
//                       </span>
//                     </td>

//                     {/* Status badge */}
//                     <td style={{ padding: "13px 16px" }}>
//                       <span style={{
//                         padding: "5px 11px", borderRadius: 20, fontSize: 11,
//                         fontWeight: 700, background: sb.bg, color: sb.color,
//                       }}>
//                         {STATUS_LABEL[inv.payment_status] || inv.payment_status}
//                       </span>
//                     </td>

//                     <td style={{ padding: "13px 16px", color: "#6b7280" }}>
//                       {inv.cashier_name || "-"}
//                     </td>

//                     {/* Action */}
//                     <td style={{ padding: "13px 16px" }}>
//                       <button
//                         className="rp-view-btn"
//                         onClick={(e) => { e.stopPropagation(); navigate(`/invoice/${inv.invoice_no}`); }}
//                         style={{
//                           display: "flex", alignItems: "center", gap: 6,
//                           background: "#eef2ff", border: "1px solid #c7d2fe",
//                           color: INDIGO, borderRadius: 10, padding: "7px 14px",
//                           cursor: "pointer", fontWeight: 600, fontSize: 12,
//                           fontFamily: FONT,
//                         }}
//                       >
//                         <Eye size={13} /> View
//                       </button>
//                     </td>

//                   </tr>
//                 );
//               }) : (
//                 <tr>
//                   <td colSpan={11} style={{ padding: 50, textAlign: "center" }}>
//                     <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
//                       <FileText size={32} color="#c7d2fe" />
//                       <span style={{ color: "#9ca3af" }}>No invoices found</span>
//                     </div>
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* ── PAGINATION ── */}
//       {totalPages > 1 && (
//         <div style={{
//           display: "flex", alignItems: "center",
//           justifyContent: "space-between", marginTop: 18,
//         }}>
//           <button
//             className="rp-pg-btn"
//             onClick={() => goTo(currentPage - 1)}
//             disabled={currentPage === 1}
//             style={{
//               display: "flex", alignItems: "center", gap: 6,
//               padding: "8px 16px", background: "#fff",
//               border: "1px solid #dbeafe", borderRadius: 10, cursor: "pointer",
//               fontFamily: FONT,
//             }}
//           >
//             <ChevronLeft size={15} /> Prev
//           </button>

//           <div style={{ display: "flex", gap: 6 }}>
//             {pages.map((p) => (
//               <button key={p} onClick={() => goTo(p)} className="rp-pg-btn" style={{
//                 width: 36, height: 36, borderRadius: 10,
//                 border: "1px solid #dbeafe",
//                 background: currentPage === p ? INDIGO : "#fff",
//                 color: currentPage === p ? "#fff" : INDIGO,
//                 fontWeight: 700, cursor: "pointer", fontFamily: FONT,
//               }}>{p}</button>
//             ))}
//           </div>

//           <button
//             className="rp-pg-btn"
//             onClick={() => goTo(currentPage + 1)}
//             disabled={currentPage === totalPages}
//             style={{
//               display: "flex", alignItems: "center", gap: 6,
//               padding: "8px 16px", background: "#fff",
//               border: "1px solid #dbeafe", borderRadius: 10, cursor: "pointer",
//               fontFamily: FONT,
//             }}
//           >
//             Next <ChevronRight size={15} />
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }


//brand wise report
// import { useEffect, useState, useCallback } from "react";
// import { useNavigate } from "react-router-dom";
// import api from "../../services/api";

// import {
//   FileText, Search, ChevronLeft, ChevronRight,
//   Eye, Receipt, Download, Filter, X, FileDown, TrendingUp,
// } from "lucide-react";

// import * as XLSX from "xlsx";
// import { saveAs } from "file-saver";
// import jsPDF from "jspdf";
// import autoTable from "jspdf-autotable";

// /* ─── Styles ─────────────────────────────────────────── */
// function useStyles() {
//   useEffect(() => {
//     const id = "reports-styles-v3";
//     if (document.getElementById(id)) return;
//     const s = document.createElement("style");
//     s.id = id;
//     s.innerHTML = `
//       @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
//       .rp * { box-sizing: border-box; }
//       @keyframes rp-in { from { opacity:0; transform:translateY(14px);} to { opacity:1; transform:none;} }
//       @keyframes fadeSlide { from { opacity:0; transform:translateY(-8px);} to { opacity:1; transform:none;} }
//       .rp-row { transition: background .15s; cursor: pointer; font-size:12px; }
//       .rp-row:hover td { background: #f5f7ff !important; }
//       .rp-view-btn { transition: all .18s; }
//       .rp-pg-btn  { transition: all .18s; }
//       .rp-pg-btn:hover:not(:disabled) { background: #e0e7ff !important; color: #4338ca !important; }
//       .rp-search:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,.1) !important; }
//       .rp-card { animation: rp-in .4s ease both; }
//       .filter-panel { animation: fadeSlide .25s ease both; }
//       .rp-filter-input:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,.08) !important; outline: none; }
//       .rp-dl-btn:hover { opacity:.88; transform:translateY(-1px); }
//       .rp-dl-btn { transition: all .18s; }
//       .rp-cb { width:15px; height:15px; cursor:pointer; accent-color:#4338ca; }
//     `;
//     document.head.appendChild(s);
//     return () => document.head.removeChild(s);
//   }, []);
// }

// /* ─── Constants ─────────────────────────────────────── */
// const FONT   = "'Plus Jakarta Sans', sans-serif";
// const INDIGO = "#4338ca";

// const PAYMENT_METHODS  = ["all", "cash", "online", "upi", "credit"];
// const METHOD_LABEL     = { all:"All Methods", cash:"Cash", online:"Online", upi:"UPI", credit:"Credit" };
// const PAYMENT_STATUSES = ["all", "paid", "pending", "not_paid", "overdue"];
// const STATUS_LABEL     = { all:"All Status", paid:"Paid", pending:"Pending", not_paid:"Not Paid", overdue:"Overdue" };

// const statusBadge = (s) => {
//   const map = {
//     paid:     { bg:"#dcfce7", color:"#15803d" },
//     pending:  { bg:"#dbeafe", color:"#1d4ed8" },
//     not_paid: { bg:"#fee2e2", color:"#dc2626" },
//     overdue:  { bg:"#fef3c7", color:"#b45309" },
//   };
//   return map[s?.toLowerCase()] || { bg:"#f1f5f9", color:"#64748b" };
// };

// const methodBadge = (m) => {
//   const map = {
//     cash:   { bg:"#dcfce7", color:"#15803d" },
//     online: { bg:"#dbeafe", color:"#1d4ed8" },
//     upi:    { bg:"#f3e8ff", color:"#7e22ce" },
//     credit: { bg:"#fef3c7", color:"#b45309" },
//   };
//   return map[m?.toLowerCase()] || { bg:"#fee2e2", color:"#dc2626" };
// };

// // small helper to display just the date part of created_at nicely
// const formatDate = (dateStr) => {
//   if (!dateStr) return "-";
//   const datePart = dateStr.split(" ")[0]; // "YYYY-MM-DD HH:MM:SS" -> "YYYY-MM-DD"
//   const d = new Date(datePart);
//   if (isNaN(d.getTime())) return datePart;
//   return d.toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
// };

// /* ─── Summary Card ──────────────────────────────────── */
// function SummaryCard({ label, value, color, icon }) {
//   return (
//     <div style={{
//       background:"#fff", border:"1.5px solid #e0e7ff", borderRadius:16,
//       padding:"14px 20px", display:"flex", alignItems:"center", gap:14,
//       minWidth:170, flex:1,
//     }}>
//       <div style={{
//         width:40, height:40, borderRadius:12, background:color+"18",
//         display:"flex", alignItems:"center", justifyContent:"center",
//       }}>{icon}</div>
//       <div>
//         <div style={{ fontSize:11, color:"#9ca3af", fontWeight:600 }}>{label}</div>
//         <div style={{ fontSize:15, fontWeight:800, color:"#1e1b4b" }}>{value}</div>
//       </div>
//     </div>
//   );
// }

// /* ─── Main ──────────────────────────────────────────── */
// export default function Reports() {
//   useStyles();
//   const navigate = useNavigate();

//   const user = JSON.parse(localStorage.getItem("user") || "{}");
//   // Works for both admin and cashier:
//   // admin  → user.id is the admin_id
//   // cashier→ user.admin_id is the admin_id
//   const adminId = user.role === "admin" ? user.id : (user.admin_id || null);

//   /* ── state ── */
//   const [companies,     setCompanies]     = useState([]);
//   const [invoices,      setInvoices]      = useState([]);
//   const [summary,       setSummary]       = useState(null);
//   const [loading,       setLoading]       = useState(false);
//   const [search,        setSearch]        = useState("");
//   const [currentPage,   setCurrentPage]   = useState(1);
//   const [showFilter,    setShowFilter]    = useState(false);

//   /* filter fields (invoice filter — company/brand removed, see Product
//      Catalog Report card below for the company/brand selectors) */
//   const [fromDate,       setFromDate]       = useState("");
//   const [toDate,         setToDate]         = useState("");
//   const [paymentMethod,  setPaymentMethod]  = useState("all");
//   const [paymentStatus,  setPaymentStatus]  = useState("all");
//   const [customerFilter, setCustomerFilter] = useState("");

//   /* checkbox */
//   const [checkedIds, setCheckedIds] = useState(new Set());

//   const recordsPerPage = 10;

//   /* ── fetch companies by admin ── */
//   useEffect(() => {
//     if (!adminId) return;
//     api.get(`/company/get_companies_by_admin?admin_id=${adminId}`)
//       .then(res => {
//         if (res.data.status) setCompanies(res.data.data);
//       })
//       .catch(console.error);
//   }, [adminId]);

//   /* ── fetch invoices (always across all companies for this admin —
//      company/brand filter has been moved to the Product Catalog Report) ── */
//   const fetchFiltered = useCallback(async (overrides = {}) => {
//     if (!adminId) return;

//     setLoading(true);
//     setCheckedIds(new Set());

//     try {
//       let allRows = [];
//       let mergedSummary = {
//         total_invoices: 0, total_amount: 0, total_paid: 0, total_pending: 0,
//       };

//       const companyIds = companies.map(c => c.id);

//       if (companyIds.length === 0) {
//         setInvoices([]);
//         setSummary(mergedSummary);
//         setLoading(false);
//         return;
//       }

//       const requests = companyIds.map(cid =>
//         api.post("/invoice/get_filtered_invoices", {
//           company_id:     cid,
//           from_date:      overrides.fromDate       ?? fromDate,
//           to_date:        overrides.toDate         ?? toDate,
//           payment_method: overrides.paymentMethod  ?? paymentMethod,
//           payment_status: overrides.paymentStatus  ?? paymentStatus,
//           customer_name:  overrides.customerFilter ?? customerFilter,
//           brand_id: 0,
//         })
//       );

//       const responses = await Promise.all(requests);

//       responses.forEach(res => {
//         if (res.data.status) {
//           allRows = [...allRows, ...res.data.data];
//           mergedSummary.total_invoices += res.data.summary.total_invoices;
//           mergedSummary.total_amount   += res.data.summary.total_amount;
//           mergedSummary.total_paid     += res.data.summary.total_paid;
//           mergedSummary.total_pending  += res.data.summary.total_pending;
//         }
//       });

//       // Sort by id desc (latest first)
//       allRows.sort((a, b) => b.id - a.id);

//       setInvoices(allRows);
//       setSummary(mergedSummary);
//       setCurrentPage(1);
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   }, [adminId, companies, fromDate, toDate, paymentMethod, paymentStatus, customerFilter]);

//   // Initial load after companies are fetched
//   useEffect(() => {
//     if (companies.length > 0 || adminId) fetchFiltered();
//   }, [companies]); // eslint-disable-line

//   /* ── filtered (client-side search) ── */
//   const filtered = invoices.filter(inv =>
//     inv.invoice_no?.toLowerCase().includes(search.toLowerCase()) ||
//     inv.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
//     inv.customer_phone?.includes(search)
//   );

//   /* ── pagination ── */
//   const totalPages   = Math.ceil(filtered.length / recordsPerPage);
//   const indexOfFirst = (currentPage - 1) * recordsPerPage;
//   const current      = filtered.slice(indexOfFirst, indexOfFirst + recordsPerPage);
//   const goTo         = p => setCurrentPage(Math.max(1, Math.min(p, totalPages)));

//   /* ── applied filter count ── */
//   const appliedCount = [
//     fromDate || toDate,
//     paymentMethod !== "all",
//     paymentStatus !== "all",
//     customerFilter,
//   ].filter(Boolean).length;

//   /* ── apply / reset ── */
//   const applyFilter = () => fetchFiltered();

//   const resetFilter = () => {
//     setFromDate(""); setToDate("");
//     setPaymentMethod("all"); setPaymentStatus("all");
//     setCustomerFilter("");
//     fetchFiltered({
//       fromDate:"", toDate:"",
//       paymentMethod:"all", paymentStatus:"all",
//       customerFilter:"",
//     });
//   };

//   /* ── checkbox helpers ── */
//   const toggleCheck = (invoiceNo, e) => {
//     e.stopPropagation();
//     setCheckedIds(prev => {
//       const next = new Set(prev);
//       next.has(invoiceNo) ? next.delete(invoiceNo) : next.add(invoiceNo);
//       return next;
//     });
//   };

//   const allCurrentChecked =
//     current.length > 0 &&
//     current.every(inv => checkedIds.has(inv.invoice_no));

//   const toggleAll = () => {
//     if (allCurrentChecked) {
//       setCheckedIds(prev => {
//         const next = new Set(prev);
//         current.forEach(inv => next.delete(inv.invoice_no));
//         return next;
//       });
//     } else {
//       setCheckedIds(prev => {
//         const next = new Set(prev);
//         current.forEach(inv => next.add(inv.invoice_no));
//         return next;
//       });
//     }
//   };

//   const selectedRows = filtered.filter(inv => checkedIds.has(inv.invoice_no));

//   /* ── Excel (Invoice Report) ── */
//   const buildExcelData = (rows) =>
//     rows.map((inv) => ({
//       "GST Number":           inv.gstin || "-",
//       "Invoice No":           inv.invoice_no,
//       "Customer Name":        inv.customer_name,
//       "Phone":                inv.customer_phone,
//       "Invoice Generated By": inv.cashier_name || "-",
//       "Payment Method":       inv.payment_method,
//       "Payment Status":       inv.payment_status,
//       "Total Amount":         `₹${Number(inv.total_amount).toLocaleString()}`,
//       "Paid Amount":          `₹${Number(inv.paid_amount).toLocaleString()}`,
//       "Balance Amount":       `₹${Number(inv.balance_amount).toLocaleString()}`,
//       "Date":                 inv.created_at,
//     }));

//   const downloadExcel = (rows, label) => {
//     if (!rows.length) { alert("No data to export"); return; }
//     const ws = XLSX.utils.json_to_sheet(buildExcelData(rows));
//     ws["!cols"] = [
//       {wch:22},{wch:20},{wch:28},{wch:16},
//       {wch:22},{wch:16},{wch:16},{wch:16},{wch:16},{wch:16},{wch:22},
//     ];
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, "Invoice Report");
//     const buf = XLSX.write(wb, { bookType:"xlsx", type:"array" });
//     saveAs(
//       new Blob([buf], { type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
//       `invoice_report_${label}.xlsx`
//     );
//   };

//   /* ── PDF (Invoice Report) ── */
//   const downloadPDF = (rows, label) => {
//     if (!rows.length) { alert("No data to export"); return; }
//     const doc = new jsPDF({ orientation:"landscape" });
//     doc.setFontSize(14); doc.setTextColor(67,56,202);
//     doc.text("Invoice Report", 14, 16);
//     doc.setFontSize(9); doc.setTextColor(120,120,120);
//     doc.text(`Generated: ${new Date().toLocaleString("en-IN")}   |   Filter: ${label}`, 14, 23);
//     autoTable(doc, {
//       startY: 28,
//       head: [["GST Number","Invoice No","Customer","Phone","Generated By","Method","Status","Total","Paid","Balance","Date"]],
//       body: rows.map(inv => [
//         inv.gstin||"-", inv.invoice_no, inv.customer_name, inv.customer_phone,
//         inv.cashier_name||"-", inv.payment_method, inv.payment_status,
//         `Rs.${Number(inv.total_amount).toFixed(2)}`,
//         `Rs.${Number(inv.paid_amount).toFixed(2)}`,
//         `Rs.${Number(inv.balance_amount).toFixed(2)}`,
//         inv.created_at?.split(" ")[0]||"",
//       ]),
//       headStyles:{ fillColor:[67,56,202], textColor:255, fontStyle:"bold", fontSize:7 },
//       bodyStyles:{ fontSize:7 },
//       alternateRowStyles:{ fillColor:[238,242,255] },
//       columnStyles:{
//         0:{cellWidth:28},1:{cellWidth:22},2:{cellWidth:28},3:{cellWidth:20},
//         4:{cellWidth:22},5:{cellWidth:16},6:{cellWidth:16},7:{cellWidth:18},
//         8:{cellWidth:18},9:{cellWidth:18},10:{cellWidth:22},
//       },
//       styles:{ cellPadding:2.5 },
//     });
//     const finalY = doc.lastAutoTable.finalY + 8;
//     doc.setFontSize(9); doc.setTextColor(67,56,202);
//     doc.text(
//       `Total: ${rows.length} invoices  |  ` +
//       `Amount: Rs.${rows.reduce((s,r)=>s+Number(r.total_amount),0).toFixed(2)}  |  ` +
//       `Paid: Rs.${rows.reduce((s,r)=>s+Number(r.paid_amount),0).toFixed(2)}  |  ` +
//       `Pending: Rs.${rows.reduce((s,r)=>s+Number(r.balance_amount),0).toFixed(2)}`,
//       14, finalY
//     );
//     doc.save(`invoice_report_${label}.pdf`);
//   };

//   /* ═══════════════════════════════════════════════════════════════════
//      PRODUCT CATALOG REPORT — independent of invoices.
//      Pulls straight from the product master list (/product/get),
//      so it includes every product you've added — sold or not — with
//      full catalog details. Has its OWN Company / Brand selectors
//      (moved here from the invoice Filter panel).
//      "All Companies" + "All Brands" → every product for the admin.
//      A company selected → that company's products (brand list loads).
//      A brand selected → only that brand's products.
//      ═══════════════════════════════════════════════════════════════════ */
//   const [catalogLoading, setCatalogLoading] = useState(false);
//   const [catalogComp,    setCatalogComp]    = useState("all"); // "all" or company id
//   const [catalogBrands,  setCatalogBrands]  = useState([]);
//   const [catalogBrand,   setCatalogBrand]   = useState("all"); // "all" or brand id

//   const [outStockLoading, setOutStockLoading] = useState(false);  //get 0 stock report

//   /* fetch brands whenever a specific company is selected for the catalog */
//   useEffect(() => {
//     if (catalogComp === "all") {
//       setCatalogBrands([]);
//       setCatalogBrand("all");
//       return;
//     }
//     api.get(`/brand/get_active_brand?company_id=${catalogComp}`)
//       .then(res => {
//         if (res.data.status) setCatalogBrands(res.data.data);
//         else setCatalogBrands([]);
//       })
//       .catch(err => { console.error(err); setCatalogBrands([]); });
//     setCatalogBrand("all"); // reset brand whenever company changes
//   }, [catalogComp]);

//   const isBrandReport = catalogBrand !== "all";
//   const selectedBrandName = isBrandReport
//     ? (catalogBrands.find(b => String(b.id) === String(catalogBrand))?.name || "-")
//     : null;

//   const fetchProductCatalog = async () => {
//     const companyIds =
//       catalogComp === "all"
//         ? companies.map(c => c.id)
//         : [parseInt(catalogComp)];

//     if (companyIds.length === 0) return [];

//     const brandIdParam = catalogComp === "all" ? 0 : (parseInt(catalogBrand) || 0);

//     const requests = companyIds.map(cid =>
//       api.get(`/product/get?company_id=${cid}${brandIdParam ? `&brand_id=${brandIdParam}` : ""}`)
//     );

//     const responses = await Promise.all(requests);
//     let allProducts = [];
//     responses.forEach(res => {
//       if (res.data.status) allProducts = [...allProducts, ...res.data.data];
//     });
//     return allProducts;
//   };

//   const buildCatalogExcelData = (products) =>
//     products.map((p) => ({
//       "Category":     p.category_name || p.category || "-",
//       "Subcategory":  p.subcategory_name || p.subcategory || p.sub_category || "-",
//       "Product Name": p.product_name || p.name || "-",
//       "GST %":        p.gst_percentage ?? p.gst_percent ?? p.gst ?? "-",
//       "Product Code": p.product_code || p.hsn_code || "-",
//       "Unit":         p.unit || p.unit_type || "-",
//       "Brand":        p.brand_name || "-",
//       "Price":        `₹${Number(p.price || 0).toLocaleString()}`,
//       "Stock":        p.stock ?? "-",
//       "Status":       p.status || "-",
//     }));

//   const downloadProductCatalog = async () => {
//     setCatalogLoading(true);
//     try {
//       const products = await fetchProductCatalog();
//       if (!products.length) { alert("No products found"); return; }

//       const label = catalogBrand !== "all"
//         ? (catalogBrands.find(b => String(b.id) === String(catalogBrand))?.name || "brand").replace(/\s+/g,"_")
//         : "all_brands";

//       const ws = XLSX.utils.json_to_sheet(buildCatalogExcelData(products));
//       ws["!cols"] = [
//         {wch:18},{wch:18},{wch:26},{wch:8},{wch:14},{wch:10},{wch:16},{wch:12},{wch:8},{wch:10},
//       ];
//       const wb = XLSX.utils.book_new();
//       XLSX.utils.book_append_sheet(wb, ws, "Product Catalog");
//       const buf = XLSX.write(wb, { bookType:"xlsx", type:"array" });
//       saveAs(
//         new Blob([buf], { type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
//         `product_catalog_${label}.xlsx`
//       );
//     } catch (err) {
//       console.error(err);
//       alert("Failed to fetch product catalog");
//     } finally {
//       setCatalogLoading(false);
//     }
//   };

//   const buildOutOfStockExcelData = (products) =>
//   products.map((p) => ({
//     "Category":     p.category_name || "-",
//     "Subcategory":  p.subcategory_name || "-",
//     "Product Name": p.product_name || p.name || "-",
//     "Product Code": p.product_code || p.hsn_code || "-",
//     "Brand":        p.brand_name || "-",
//     "Unit":         p.unit || "-",
//     "Price":        `₹${Number(p.price || 0).toLocaleString()}`,
//     "Stock":        p.stock ?? 0,
//     "Status":       p.status || "-",   // active OR inactive — doesn't matter here
//   }));

// const downloadOutOfStockReport = async () => {
//   setOutStockLoading(true);
//   try {
//     const allProducts = await fetchProductCatalog(); // already includes active + inactive
//     const soldOut = allProducts.filter(p => Number(p.stock) <= 0);

//     if (!soldOut.length) { alert("No sold-out products found"); return; }

//     const label = catalogBrand !== "all"
//       ? (catalogBrands.find(b => String(b.id) === String(catalogBrand))?.name || "brand").replace(/\s+/g,"_")
//       : "all_brands";

//     const ws = XLSX.utils.json_to_sheet(buildOutOfStockExcelData(soldOut));
//     ws["!cols"] = [
//       {wch:18},{wch:18},{wch:26},{wch:14},{wch:16},{wch:10},{wch:12},{wch:8},{wch:10},
//     ];
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, "Sold Out Products");
//     const buf = XLSX.write(wb, { bookType:"xlsx", type:"array" });
//     saveAs(
//       new Blob([buf], { type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
//       `sold_out_products_${label}.xlsx`
//     );
//   } catch (err) {
//     console.error(err);
//     alert("Failed to fetch sold-out products");
//   } finally {
//     setOutStockLoading(false);
//   }
// };

//   /* ── filter label (invoice report — company/brand no longer part of it) ── */
//   const filterLabel = () => {
//     const parts = [];
//     if (fromDate)  parts.push(`from_${fromDate}`);
//     if (toDate)    parts.push(`to_${toDate}`);
//     if (paymentMethod !== "all") parts.push(paymentMethod);
//     if (paymentStatus !== "all") parts.push(paymentStatus);
//     return parts.length ? parts.join("_") : "all";
//   };

//   /* ── shared styles ── */
//   const inputStyle = {
//     width:"100%", padding:"9px 12px",
//     border:"1.5px solid #e0e7ff", borderRadius:10,
//     fontSize:12, fontFamily:FONT,
//     background:"#fff", color:"#1e1b4b",
//   };
//   const selectStyle = { ...inputStyle, cursor:"pointer" };
//   const btnPrimary = {
//     background:INDIGO, border:"none", color:"#fff",
//     padding:"10px 18px", borderRadius:12,
//     fontSize:12, fontWeight:700, cursor:"pointer",
//     fontFamily:FONT, display:"flex", alignItems:"center", gap:7,
//   };

//   /* ── render ── */
//   return (
//     <div className="rp" style={{ fontFamily:FONT, padding:"22px 26px" }}>

//       {/* HEADER */}
//       <div style={{
//         display:"flex", alignItems:"center",
//         justifyContent:"space-between",
//         marginBottom:20, flexWrap:"wrap", gap:14,
//       }}>
//         <div style={{ display:"flex", alignItems:"center", gap:12 }}>
//           <div style={{ fontSize:22 }}>🧾</div>
//           <div>
//             <h1 style={{ margin:0, fontSize:18, fontWeight:800, color:"#1e1b4b" }}>
//               Invoice Reports
//             </h1>
//             <p style={{ margin:"2px 0 0", fontSize:12, color:"#9ca3af" }}>
//               Filter by company · search · download PDF & Excel
//             </p>
//           </div>
//         </div>
// {/* HEADER BUTTONS */}
// <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
//   {checkedIds.size > 0 && (
//     <span style={{
//       background:"#eef2ff", color:INDIGO,
//       fontWeight:700, fontSize:12,
//       padding:"8px 14px", borderRadius:10,
//       border:`1.5px solid #c7d2fe`,
//     }}>
//       {checkedIds.size} selected
//     </span>
//   )}
//   <button
//     className="rp-dl-btn"
//     onClick={() =>
//       checkedIds.size > 0
//         ? downloadExcel(selectedRows, `selected_${filterLabel()}`)
//         : downloadExcel(filtered, filterLabel())
//     }
//     style={{ ...btnPrimary, background:"#16a34a" }}
//   >
//     <Download size={14} />
//     {checkedIds.size > 0 ? `Excel (${checkedIds.size})` : "Excel"}
//   </button>
//   <button
//     className="rp-dl-btn"
//     onClick={() => downloadPDF(filtered, filterLabel())}
//     style={{ ...btnPrimary, background:"#dc2626" }}
//   >
//     <FileDown size={14} /> PDF
//   </button>
// </div>
//       </div>

//       {/* SUMMARY */}
//       {summary && (
//         <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:20 }}>
//           <SummaryCard label="Total Invoices" value={summary.total_invoices}
//             color="#4338ca" icon={<Receipt size={18} color="#4338ca" />} />
//           <SummaryCard label="Total Amount"
//             value={`₹${Number(summary.total_amount).toLocaleString()}`}
//             color="#0891b2" icon={<TrendingUp size={18} color="#0891b2" />} />
//           <SummaryCard label="Total Paid"
//             value={`₹${Number(summary.total_paid).toLocaleString()}`}
//             color="#16a34a" icon={<TrendingUp size={18} color="#16a34a" />} />
//           <SummaryCard label="Total Pending"
//             value={`₹${Number(summary.total_pending).toLocaleString()}`}
//             color="#dc2626" icon={<TrendingUp size={18} color="#dc2626" />} />
//         </div>
//       )}

//       {/* PRODUCT CATALOG REPORT — independent of invoices/sales.
//           Has its own Company / Brand selectors (moved here from the
//           invoice Filter panel). */}
//       <div className="rp-card" style={{
//         background:"#fff", border:"1.5px solid #e0e7ff", borderRadius:16,
//         padding:"16px 20px", marginBottom:20,
//         display:"flex", alignItems:"center", justifyContent:"space-between",
//         flexWrap:"wrap", gap:14,
//       }}>
//         <div style={{ display:"flex", alignItems:"center", gap:12, flex:1, minWidth:260 }}>
//           <div style={{
//             width:40, height:40, borderRadius:12, background:"#f3e8ff",
//             display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
//           }}><FileText size={18} color="#7e22ce" /></div>
//           <div>
//             <div style={{ fontSize:13, fontWeight:800, color:"#1e1b4b" }}>
//               Product Catalog Report
//             </div>
//             <div style={{ fontSize:11, color:"#9ca3af" }}>
//               All products you've added — not just sold ones.{" "}
//               {catalogComp === "all"
//                 ? "Showing: all companies, all brands."
//                 : catalogBrand !== "all"
//                   ? `Showing: ${selectedBrandName} only.`
//                   : "Showing: all brands for the selected company."}
//             </div>
//           </div>
//         </div>

//         {/* Company / Brand selectors for the catalog report */}
//         <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"flex-end" }}>
//           <div style={{ minWidth:170 }}>
//             <label style={{ fontSize:11, fontWeight:700, color:"#4338ca", display:"block", marginBottom:6 }}>Company</label>
//             <select
//               className="rp-filter-input"
//               value={catalogComp}
//               onChange={e => setCatalogComp(e.target.value)}
//               style={selectStyle}
//             >
//               <option value="all">All Companies</option>
//               {companies.map(c => (
//                 <option key={c.id} value={c.id}>{c.company_name}</option>
//               ))}
//             </select>
//           </div>

//           <div style={{ minWidth:170 }}>
//             <label style={{ fontSize:11, fontWeight:700, color:"#4338ca", display:"block", marginBottom:6 }}>
//               Brand {catalogComp === "all" && (
//                 <span style={{ color:"#9ca3af", fontWeight:500 }}>(select company first)</span>
//               )}
//             </label>
//             <select
//               className="rp-filter-input"
//               value={catalogBrand}
//               onChange={e => setCatalogBrand(e.target.value)}
//               disabled={catalogComp === "all"}
//               style={{
//                 ...selectStyle,
//                 opacity: catalogComp === "all" ? 0.5 : 1,
//                 cursor: catalogComp === "all" ? "not-allowed" : "pointer",
//               }}
//             >
//               <option value="all">All Brands</option>
//               {catalogBrands.map(b => (
//                 <option key={b.id} value={b.id}>{b.name}</option>
//               ))}
//             </select>
//           </div>

//           <button
//             className="rp-dl-btn"
//             onClick={downloadProductCatalog}
//             disabled={catalogLoading}
//             style={{ ...btnPrimary, background:"#7e22ce", opacity: catalogLoading ? 0.7 : 1 }}
//           >
//             <Download size={14} /> {catalogLoading ? "Preparing…" : "Product List"}
//           </button>
//         </div>
//       </div>


//       {/* SOLD OUT / OUT OF STOCK REPORT — same company/brand selectors as
//     the catalog report, but only products with stock <= 0, regardless
//     of active/inactive status. */}
// <div className="rp-card" style={{
//   background:"#fff", border:"1.5px solid #fde68a", borderRadius:16,
//   padding:"16px 20px", marginBottom:20,
//   display:"flex", alignItems:"center", justifyContent:"space-between",
//   flexWrap:"wrap", gap:14,
// }}>
//   <div style={{ display:"flex", alignItems:"center", gap:12, flex:1, minWidth:260 }}>
//     <div style={{
//       width:40, height:40, borderRadius:12, background:"#fef3c7",
//       display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
//     }}><FileText size={18} color="#b45309" /></div>
//     <div>
//       <div style={{ fontSize:13, fontWeight:800, color:"#1e1b4b" }}>
//         Sold Out / Out of Stock Report
//       </div>
//       <div style={{ fontSize:11, color:"#9ca3af" }}>
//         Every product with stock = 0 — active or inactive, uses the same
//         Company / Brand filter above.
//       </div>
//     </div>
//   </div>

//   <button
//     className="rp-dl-btn"
//     onClick={downloadOutOfStockReport}
//     disabled={outStockLoading}
//     style={{ ...btnPrimary, background:"#b45309", opacity: outStockLoading ? 0.7 : 1 }}
//   >
//     <Download size={14} /> {outStockLoading ? "Preparing…" : "Sold-Out Report"}
//   </button>
// </div>


//       <div style={{ display:"flex", gap:10, marginBottom:18, alignItems:"center", flexWrap:"wrap" }}>

//         {/* Search */}
//         <div style={{ position:"relative", flex:1, minWidth:200 }}>
//           <Search size={15} color="#6366f1" style={{
//             position:"absolute", left:14,
//             top:"50%", transform:"translateY(-50%)",
//           }} />
//           <input
//             className="rp-search"
//             value={search}
//             onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
//             placeholder="Search by invoice no, customer, phone…"
//             style={{
//               width:"100%", padding:"11px 14px 11px 40px",
//               background:"#fff", border:"1.5px solid #e0e7ff",
//               borderRadius:12, fontSize:12, outline:"none", fontFamily:FONT,
//             }}
//           />
//         </div>

//         {/* Filter toggle */}
//         <button
//           onClick={() => setShowFilter(v => !v)}
//           style={{
//             ...btnPrimary,
//             background: showFilter ? INDIGO : "#eef2ff",
//             color: showFilter ? "#fff" : INDIGO,
//             position:"relative",
//           }}
//         >
//           <Filter size={14} /> Filter
//           {appliedCount > 0 && (
//             <span style={{
//               position:"absolute", top:-6, right:-6,
//               background:"#dc2626", color:"#fff",
//               borderRadius:"50%", width:18, height:18,
//               display:"flex", alignItems:"center",
//               justifyContent:"center", fontSize:10, fontWeight:800,
//             }}>{appliedCount}</span>
//           )}
//         </button>

//         {appliedCount > 0 && (
//           <button onClick={resetFilter}
//             style={{ ...btnPrimary, background:"#fee2e2", color:"#dc2626" }}>
//             <X size={13} /> Reset
//           </button>
//         )}
//       </div>

//       {/* FILTER PANEL — company/brand removed (now on the Product
//           Catalog Report card above); invoices always cover all
//           companies under this admin. */}
//       {showFilter && (
//         <div className="filter-panel" style={{
//           background:"#fff", border:"1.5px solid #e0e7ff",
//           borderRadius:18, padding:"20px 22px", marginBottom:18,
//           display:"grid",
//           gridTemplateColumns:"repeat(auto-fit, minmax(170px, 1fr))",
//           gap:14,
//         }}>
//           <div>
//             <label style={{ fontSize:11, fontWeight:700, color:"#4338ca", display:"block", marginBottom:6 }}>From Date</label>
//             <input type="date" className="rp-filter-input" value={fromDate}
//               onChange={e => setFromDate(e.target.value)} style={inputStyle} />
//           </div>

//           <div>
//             <label style={{ fontSize:11, fontWeight:700, color:"#4338ca", display:"block", marginBottom:6 }}>To Date</label>
//             <input type="date" className="rp-filter-input" value={toDate}
//               onChange={e => setToDate(e.target.value)} style={inputStyle} />
//           </div>

//           <div>
//             <label style={{ fontSize:11, fontWeight:700, color:"#4338ca", display:"block", marginBottom:6 }}>Payment Method</label>
//             <select className="rp-filter-input" value={paymentMethod}
//               onChange={e => setPaymentMethod(e.target.value)} style={selectStyle}>
//               {PAYMENT_METHODS.map(m => (
//                 <option key={m} value={m}>{METHOD_LABEL[m]}</option>
//               ))}
//             </select>
//           </div>

//           <div>
//             <label style={{ fontSize:11, fontWeight:700, color:"#4338ca", display:"block", marginBottom:6 }}>Payment Status</label>
//             <select className="rp-filter-input" value={paymentStatus}
//               onChange={e => setPaymentStatus(e.target.value)} style={selectStyle}>
//               {PAYMENT_STATUSES.map(s => (
//                 <option key={s} value={s}>{STATUS_LABEL[s]}</option>
//               ))}
//             </select>
//           </div>

//           <div>
//             <label style={{ fontSize:11, fontWeight:700, color:"#4338ca", display:"block", marginBottom:6 }}>Customer Name</label>
//             <input type="text" className="rp-filter-input" value={customerFilter}
//               onChange={e => setCustomerFilter(e.target.value)}
//               placeholder="Search customer…" style={inputStyle} />
//           </div>

//           <div style={{ display:"flex", flexDirection:"column", justifyContent:"flex-end", gap:8 }}>
//             <button onClick={applyFilter} style={{ ...btnPrimary, justifyContent:"center" }}>
//               Apply Filter
//             </button>
//             <button onClick={resetFilter} style={{
//               ...btnPrimary, background:"#f1f5f9",
//               color:"#64748b", justifyContent:"center",
//             }}>
//               Reset All
//             </button>
//           </div>
//         </div>
//       )}

//       {/* TABLE */}
//       <div className="rp-card" style={{
//         background:"#fff", borderRadius:20,
//         border:"1.5px solid #e0e7ff", overflow:"hidden",
//       }}>
//         <div style={{ height:4, background:"linear-gradient(90deg,#4338ca,#6366f1,#818cf8)" }} />

//         <div style={{ overflowX:"auto" }}>
//           <table style={{ width:"100%", borderCollapse:"collapse", minWidth:1230 }}>
//             <thead>
//               <tr style={{ background:"#eef2ff" }}>
//                 {/* Checkbox all */}
//                 <th style={{ padding:"12px 16px", width:40 }}>
//                   <input
//                     type="checkbox"
//                     className="rp-cb"
//                     checked={allCurrentChecked}
//                     onChange={toggleAll}
//                   />
//                 </th>
//                 {["#","Invoice No","Customer","Phone","Amount","Paid","Balance","Method","Status","By","Date","Action"].map((h,i) => (
//                   <th key={i} style={{
//                     padding:"12px 16px", textAlign:"left",
//                     fontSize:11, fontWeight:700, color:INDIGO,
//                     borderBottom:"1px solid #dbeafe", whiteSpace:"nowrap",
//                   }}>{h}</th>
//                 ))}
//               </tr>
//             </thead>

//             <tbody>
//               {loading ? (
//                 <tr>
//                   <td colSpan={12} style={{ padding:50, textAlign:"center", color:"#9ca3af" }}>
//                     Loading…
//                   </td>
//                 </tr>
//               ) : current.length > 0 ? current.map((inv, i) => {
//                 const mb = methodBadge(inv.payment_method);
//                 const sb = statusBadge(inv.payment_status);
//                 const isChecked = checkedIds.has(inv.invoice_no);
//                 return (
//                   <tr
//                     key={i}
//                     className="rp-row"
//                     onClick={() => navigate(`/invoice/${inv.invoice_no}`)}
//                     style={{ background: isChecked ? "#f0f4ff" : undefined }}
//                   >
//                     {/* Checkbox */}
//                     <td style={{ padding:"13px 16px" }} onClick={e => e.stopPropagation()}>
//                       <input
//                         type="checkbox"
//                         className="rp-cb"
//                         checked={isChecked}
//                         onChange={e => toggleCheck(inv.invoice_no, e)}
//                       />
//                     </td>

//                     <td style={{ padding:"13px 16px" }}>{indexOfFirst + i + 1}</td>

//                     <td style={{ padding:"13px 16px" }}>
//                       <div style={{ display:"flex", alignItems:"center", gap:8 }}>
//                         <div style={{
//                           width:30, height:30, borderRadius:9,
//                           background:"#eef2ff", display:"flex",
//                           alignItems:"center", justifyContent:"center",
//                         }}>
//                           <Receipt size={13} color={INDIGO} />
//                         </div>
//                         <span style={{ fontWeight:700, color:INDIGO }}>{inv.invoice_no}</span>
//                       </div>
//                     </td>

//                     <td style={{ padding:"13px 16px" }}>{inv.customer_name}</td>
//                     <td style={{ padding:"13px 16px", color:"#6b7280" }}>{inv.customer_phone}</td>

//                     <td style={{ padding:"13px 16px", fontWeight:700, color:"#1e1b4b" }}>
//                       ₹{Number(inv.total_amount).toLocaleString()}
//                     </td>
//                     <td style={{ padding:"13px 16px", fontWeight:700, color:"#16a34a" }}>
//                       ₹{Number(inv.paid_amount).toLocaleString()}
//                     </td>
//                     <td style={{ padding:"13px 16px", fontWeight:700,
//                       color: Number(inv.balance_amount) > 0 ? "#dc2626" : "#9ca3af" }}>
//                       ₹{Number(inv.balance_amount).toLocaleString()}
//                     </td>

//                     <td style={{ padding:"13px 16px" }}>
//                       <span style={{
//                         padding:"5px 11px", borderRadius:20, fontSize:11,
//                         fontWeight:700, background:mb.bg, color:mb.color,
//                       }}>{inv.payment_method || "-"}</span>
//                     </td>

//                     <td style={{ padding:"13px 16px" }}>
//                       <span style={{
//                         padding:"5px 11px", borderRadius:20, fontSize:11,
//                         fontWeight:700, background:sb.bg, color:sb.color,
//                       }}>{STATUS_LABEL[inv.payment_status] || inv.payment_status}</span>
//                     </td>

//                     <td style={{ padding:"13px 16px", color:"#6b7280" }}>
//                       {inv.cashier_name || "-"}
//                     </td>

//                     <td style={{ padding:"13px 16px", color:"#6b7280", whiteSpace:"nowrap" }}>
//                       {formatDate(inv.created_at)}
//                     </td>

//                     <td style={{ padding:"13px 16px" }}>
//                       <button
//                         className="rp-view-btn"
//                         onClick={e => { e.stopPropagation(); navigate(`/invoice/${inv.invoice_no}`); }}
//                         style={{
//                           display:"flex", alignItems:"center", gap:6,
//                           background:"#eef2ff", border:"1px solid #c7d2fe",
//                           color:INDIGO, borderRadius:10, padding:"7px 14px",
//                           cursor:"pointer", fontWeight:600, fontSize:12, fontFamily:FONT,
//                         }}
//                       >
//                         <Eye size={13} /> View
//                       </button>
//                     </td>
//                   </tr>
//                 );
//               }) : (
//                 <tr>
//                   <td colSpan={12} style={{ padding:50, textAlign:"center" }}>
//                     <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
//                       <FileText size={32} color="#c7d2fe" />
//                       <span style={{ color:"#9ca3af" }}>No invoices found</span>
//                     </div>
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* PAGINATION */}
//       {totalPages > 1 && (
//         <div style={{
//           display:"flex", alignItems:"center",
//           justifyContent:"space-between", marginTop:18,
//         }}>
//           <button className="rp-pg-btn" onClick={() => goTo(currentPage - 1)}
//             disabled={currentPage === 1}
//             style={{
//               display:"flex", alignItems:"center", gap:6,
//               padding:"8px 16px", background:"#fff",
//               border:"1px solid #dbeafe", borderRadius:10,
//               cursor:"pointer", fontFamily:FONT,
//             }}>
//             <ChevronLeft size={15} /> Prev
//           </button>

//           <div style={{ display:"flex", gap:6, flexWrap:"wrap", justifyContent:"center" }}>
//             {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
//               <button key={p} onClick={() => goTo(p)} className="rp-pg-btn" style={{
//                 width:36, height:36, borderRadius:10,
//                 border:"1px solid #dbeafe",
//                 background: currentPage === p ? INDIGO : "#fff",
//                 color: currentPage === p ? "#fff" : INDIGO,
//                 fontWeight:700, cursor:"pointer", fontFamily:FONT,
//               }}>{p}</button>
//             ))}
//           </div>

//           <button className="rp-pg-btn" onClick={() => goTo(currentPage + 1)}
//             disabled={currentPage === totalPages}
//             style={{
//               display:"flex", alignItems:"center", gap:6,
//               padding:"8px 16px", background:"#fff",
//               border:"1px solid #dbeafe", borderRadius:10,
//               cursor:"pointer", fontFamily:FONT,
//             }}>
//             Next <ChevronRight size={15} />
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }


//reports neat ui
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

import {
  FileText, Search, ChevronLeft, ChevronRight,
  Eye, Receipt, Download, Filter, X, FileDown, TrendingUp,
  PackageX, Boxes, MoreVertical, Printer, Loader2,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

/* reuse the EXACT invoice markup + WhatsApp send logic from the Invoice View page */
import { DESIGN_COMPONENTS } from "../billing/Invoice";
import {
  generateInvoicePdfBase64,
  sendInvoiceViaWhatsAppApi,
  getInvoiceLogoUrl,
} from "../../utils/invoiceShare";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ─── Styles ─────────────────────────────────────────── */
function useStyles() {
  useEffect(() => {
    const id = "reports-styles-v4";
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id;
    s.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
      .rp * { box-sizing: border-box; }
      @keyframes rp-in { from { opacity:0; transform:translateY(14px);} to { opacity:1; transform:none;} }
      @keyframes fadeSlide { from { opacity:0; transform:translateY(-8px);} to { opacity:1; transform:none;} }
      @keyframes rp-spin { to { transform: rotate(360deg); } }
      .rp-row { transition: background .15s; cursor: pointer; font-size:12px; }
      .rp-row:hover td { background: #f5f7ff !important; }
      .rp-view-btn { transition: all .18s; }
      .rp-pg-btn  { transition: all .18s; }
      .rp-pg-btn:hover:not(:disabled) { background: #e0e7ff !important; color: #4338ca !important; }
      .rp-search:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,.1) !important; }
      .rp-card { animation: rp-in .4s ease both; }
      .filter-panel { animation: fadeSlide .25s ease both; }
      .rp-filter-input:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,.08) !important; outline: none; }
      .rp-dl-btn:hover:not(:disabled) { opacity:.88; transform:translateY(-1px); }
      .rp-dl-btn { transition: all .18s; }
      .rp-cb { width:15px; height:15px; cursor:pointer; accent-color:#4338ca; }
      .rp-type-btn { transition: all .18s; }
    `;
    document.head.appendChild(s);
    return () => document.head.removeChild(s);
  }, []);
}

/* ─── Constants ─────────────────────────────────────── */
const FONT   = "'Plus Jakarta Sans', sans-serif";
const INDIGO = "#4338ca";

const PAYMENT_METHODS  = ["all", "cash", "online", "upi", "credit"];
const METHOD_LABEL     = { all:"All Methods", cash:"Cash", online:"Online", upi:"UPI", credit:"Credit" };
const PAYMENT_STATUSES = ["all", "paid", "pending", "not_paid", "overdue"];
const STATUS_LABEL     = { all:"All Status", paid:"Paid", pending:"Pending", not_paid:"Not Paid", overdue:"Overdue" };

const statusBadge = (s) => {
  const map = {
    paid:     { bg:"#dcfce7", color:"#15803d" },
    pending:  { bg:"#dbeafe", color:"#1d4ed8" },
    not_paid: { bg:"#fee2e2", color:"#dc2626" },
    overdue:  { bg:"#fef3c7", color:"#b45309" },
  };
  return map[s?.toLowerCase()] || { bg:"#f1f5f9", color:"#64748b" };
};

const methodBadge = (m) => {
  const map = {
    cash:   { bg:"#dcfce7", color:"#15803d" },
    online: { bg:"#dbeafe", color:"#1d4ed8" },
    upi:    { bg:"#f3e8ff", color:"#7e22ce" },
    credit: { bg:"#fef3c7", color:"#b45309" },
  };
  return map[m?.toLowerCase()] || { bg:"#fee2e2", color:"#dc2626" };
};

// small helper to display just the date part of created_at nicely
const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const datePart = dateStr.split(" ")[0]; // "YYYY-MM-DD HH:MM:SS" -> "YYYY-MM-DD"
  const d = new Date(datePart);
  if (isNaN(d.getTime())) return datePart;
  return d.toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
};

/* ─── print a DOM node directly (hidden iframe, no page navigation) ─── */
function printElement(element) {
  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, {
    position:"fixed", width:"0", height:"0",
    border:"0", visibility:"hidden", right:"0", bottom:"0",
  });
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(
    '<html><head><title>Invoice</title></head>' +
    '<body style="margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;">' +
    element.innerHTML +
    "</body></html>"
  );
  doc.close();

  const win = iframe.contentWindow;
  const fire = () => {
    try {
      win.focus();
      win.print();
    } finally {
      setTimeout(() => iframe.remove(), 1500);
    }
  };

  if (doc.readyState === "complete") {
    fire();
  } else {
    win.addEventListener("load", fire);
  }
}

/* ─── Summary Card ──────────────────────────────────── */
function SummaryCard({ label, value, color, icon }) {
  return (
    <div style={{
      background:"#fff", border:"1.5px solid #e0e7ff", borderRadius:16,
      padding:"14px 20px", display:"flex", alignItems:"center", gap:14,
      minWidth:170, flex:1,
    }}>
      <div style={{
        width:40, height:40, borderRadius:12, background:color+"18",
        display:"flex", alignItems:"center", justifyContent:"center",
      }}>{icon}</div>
      <div>
        <div style={{ fontSize:11, color:"#9ca3af", fontWeight:600 }}>{label}</div>
        <div style={{ fontSize:15, fontWeight:800, color:"#1e1b4b" }}>{value}</div>
      </div>
    </div>
  );
}

/* ─── shared field styles (used across cards / filter panel) ───── */
const inputStyleBase = {
  width:"100%", padding:"9px 12px",
  border:"1.5px solid #e0e7ff", borderRadius:10,
  fontSize:12, fontFamily:FONT,
  background:"#fff", color:"#1e1b4b",
};
const selectStyleBase = { ...inputStyleBase, cursor:"pointer" };
const fieldLabelStyle = { fontSize:11, fontWeight:700, color:"#4338ca", display:"block", marginBottom:6 };

/* ══════════════════════════════════════════════════════════════════
   REUSABLE EXPORT CARD
   Generic "pick company/brand → hit a button → get a file" card.
   Used for BOTH Product Catalog and Sold-Out reports so we don't
   duplicate the same selector UI twice on the page.
   ══════════════════════════════════════════════════════════════════ */
function ProductReportCard({
  companies,
  reportType, setReportType,          // "catalog" | "soldout"
  catalogComp, setCatalogComp,
  catalogBrand, setCatalogBrand,
  catalogBrands,
  loading,
  onDownload,
}) {
  const REPORT_TYPES = [
    {
      key: "catalog",
      label: "Full Catalog",
      icon: <Boxes size={16} color="#7e22ce" />,
      accent: "#7e22ce",
      accentBg: "#f3e8ff",
      description: "All products you've added — sold or not.",
    },
    {
      key: "soldout",
      label: "Sold Out",
      icon: <PackageX size={16} color="#b45309" />,
      accent: "#b45309",
      accentBg: "#fef3c7",
      description: "Only products with stock = 0 — active or inactive.",
    },
  ];

  const active = REPORT_TYPES.find(r => r.key === reportType) || REPORT_TYPES[0];

  const selectedBrandName = catalogBrand !== "all"
    ? (catalogBrands.find(b => String(b.id) === String(catalogBrand))?.name || "-")
    : null;

  const scopeText =
    catalogComp === "all"
      ? "Scope: all companies, all brands."
      : catalogBrand !== "all"
        ? `Scope: ${selectedBrandName} only.`
        : "Scope: all brands for the selected company.";

  return (
    <div className="rp-card" style={{
      background:"#fff", border:"1.5px solid #e0e7ff", borderRadius:16,
      padding:"18px 20px", marginBottom:20,
    }}>
      {/* Top row: title + report-type switch */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        flexWrap:"wrap", gap:14, marginBottom:16,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{
            width:40, height:40, borderRadius:12, background:active.accentBg,
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
          }}>{active.icon}</div>
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:"#1e1b4b" }}>
              Product & Stock Reports
            </div>
            <div style={{ fontSize:11, color:"#9ca3af" }}>
              {active.description} {scopeText}
            </div>
          </div>
        </div>

        {/* Segmented control to switch report type */}
        <div style={{
          display:"flex", background:"#f5f5f7", borderRadius:12, padding:4, gap:2,
        }}>
          {REPORT_TYPES.map(rt => (
            <button
              key={rt.key}
              className="rp-type-btn"
              onClick={() => setReportType(rt.key)}
              style={{
                display:"flex", alignItems:"center", gap:6,
                padding:"8px 14px", borderRadius:9, border:"none",
                fontSize:12, fontWeight:700, fontFamily:FONT, cursor:"pointer",
                background: reportType === rt.key ? "#fff" : "transparent",
                color: reportType === rt.key ? active.accent : "#6b7280",
                boxShadow: reportType === rt.key ? "0 1px 3px rgba(0,0,0,.08)" : "none",
              }}
            >
              {rt.icon} {rt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters + download row */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"flex-end" }}>
        <div style={{ minWidth:170, flex:1 }}>
          <label style={fieldLabelStyle}>Company</label>
          <select
            className="rp-filter-input"
            value={catalogComp}
            onChange={e => setCatalogComp(e.target.value)}
            style={selectStyleBase}
          >
            <option value="all">All Companies</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.company_name}</option>
            ))}
          </select>
        </div>

        <div style={{ minWidth:170, flex:1 }}>
          <label style={fieldLabelStyle}>
            Brand {catalogComp === "all" && (
              <span style={{ color:"#9ca3af", fontWeight:500 }}>(select company first)</span>
            )}
          </label>
          <select
            className="rp-filter-input"
            value={catalogBrand}
            onChange={e => setCatalogBrand(e.target.value)}
            disabled={catalogComp === "all"}
            style={{
              ...selectStyleBase,
              opacity: catalogComp === "all" ? 0.5 : 1,
              cursor: catalogComp === "all" ? "not-allowed" : "pointer",
            }}
          >
            <option value="all">All Brands</option>
            {catalogBrands.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <button
          className="rp-dl-btn"
          onClick={onDownload}
          disabled={loading}
          style={{
            background: active.accent, border:"none", color:"#fff",
            padding:"10px 18px", borderRadius:12,
            fontSize:12, fontWeight:700, cursor: loading ? "default" : "pointer",
            fontFamily:FONT, display:"flex", alignItems:"center", gap:7,
            opacity: loading ? 0.7 : 1, whiteSpace:"nowrap",
          }}
        >
          <Download size={14} />
          {loading ? "Preparing…" : `Download ${active.label}`}
        </button>
      </div>
    </div>
  );
}

/* ─── Main ──────────────────────────────────────────── */
export default function Reports() {
  useStyles();
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  // Works for both admin and cashier:
  // admin  → user.id is the admin_id
  // cashier→ user.admin_id is the admin_id
  const adminId = user.role === "admin" ? user.id : (user.admin_id || null);

  /* ── state ── */
  const [companies,     setCompanies]     = useState([]);
  const [invoices,      setInvoices]      = useState([]);
  const [summary,       setSummary]       = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [search,        setSearch]        = useState("");
  const [currentPage,   setCurrentPage]   = useState(1);
  const [showFilter,    setShowFilter]    = useState(false);

  /* filter fields (invoice filter — company/brand removed, see
     Product & Stock Reports card below for those selectors) */
  const [fromDate,       setFromDate]       = useState("");
  const [toDate,         setToDate]         = useState("");
  const [paymentMethod,  setPaymentMethod]  = useState("all");
  const [paymentStatus,  setPaymentStatus]  = useState("all");
  const [customerFilter, setCustomerFilter] = useState("");

  /* checkbox */
  const [checkedIds, setCheckedIds] = useState(new Set());

  const recordsPerPage = 10;

  /* ── fetch companies by admin ── */
  useEffect(() => {
    if (!adminId) return;
    api.get(`/company/get_companies_by_admin?admin_id=${adminId}`)
      .then(res => {
        if (res.data.status) setCompanies(res.data.data);
      })
      .catch(console.error);
  }, [adminId]);

  /* ── fetch invoices (always across all companies for this admin) ── */
  const fetchFiltered = useCallback(async (overrides = {}) => {
    if (!adminId) return;

    setLoading(true);
    setCheckedIds(new Set());

    try {
      let allRows = [];
      let mergedSummary = {
        total_invoices: 0, total_amount: 0, total_paid: 0, total_pending: 0,
      };

      const companyIds = companies.map(c => c.id);

      if (companyIds.length === 0) {
        setInvoices([]);
        setSummary(mergedSummary);
        setLoading(false);
        return;
      }

      const requests = companyIds.map(cid =>
        api.get("/invoice/get_filtered_invoices", {
          params: {
            company_id:     cid,
            from_date:      overrides.fromDate       ?? fromDate,
            to_date:        overrides.toDate         ?? toDate,
            payment_method: overrides.paymentMethod  ?? paymentMethod,
            payment_status: overrides.paymentStatus  ?? paymentStatus,
            customer_name:  overrides.customerFilter ?? customerFilter,
            brand_id: 0,
          }
        })
      );

      const responses = await Promise.all(requests);

      responses.forEach(res => {
        if (res.data.status) {
          allRows = [...allRows, ...res.data.data];
          mergedSummary.total_invoices += res.data.summary.total_invoices;
          mergedSummary.total_amount   += res.data.summary.total_amount;
          mergedSummary.total_paid     += res.data.summary.total_paid;
          mergedSummary.total_pending  += res.data.summary.total_pending;
        }
      });

      // Sort by id desc (latest first)
      // allRows.sort((a, b) => b.id - a.id);

      // Sort by created_at ascending (oldest first)
allRows.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      setInvoices(allRows);
      setSummary(mergedSummary);
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [adminId, companies, fromDate, toDate, paymentMethod, paymentStatus, customerFilter]);

  // Initial load after companies are fetched
  useEffect(() => {
    if (companies.length > 0 || adminId) fetchFiltered();
  }, [companies]); // eslint-disable-line

  /* ── filtered (client-side search) ── */
  const filtered = invoices.filter(inv =>
    inv.invoice_no?.toLowerCase().includes(search.toLowerCase()) ||
    inv.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    inv.customer_phone?.includes(search)
  );

  /* ── pagination ── */
  const totalPages   = Math.ceil(filtered.length / recordsPerPage);
  const indexOfFirst = (currentPage - 1) * recordsPerPage;
  const current      = filtered.slice(indexOfFirst, indexOfFirst + recordsPerPage);
  const goTo         = p => setCurrentPage(Math.max(1, Math.min(p, totalPages)));

  /* ── applied filter count ── */
  const appliedCount = [
    fromDate || toDate,
    paymentMethod !== "all",
    paymentStatus !== "all",
    customerFilter,
  ].filter(Boolean).length;

  /* ── apply / reset ── */
  const applyFilter = () => fetchFiltered();

  const resetFilter = () => {
    setFromDate(""); setToDate("");
    setPaymentMethod("all"); setPaymentStatus("all");
    setCustomerFilter("");
    fetchFiltered({
      fromDate:"", toDate:"",
      paymentMethod:"all", paymentStatus:"all",
      customerFilter:"",
    });
  };

  /* ── checkbox helpers ── */
  const toggleCheck = (invoiceNo, e) => {
    e.stopPropagation();
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(invoiceNo) ? next.delete(invoiceNo) : next.add(invoiceNo);
      return next;
    });
  };

  const allCurrentChecked =
    current.length > 0 &&
    current.every(inv => checkedIds.has(inv.invoice_no));

  const toggleAll = () => {
    if (allCurrentChecked) {
      setCheckedIds(prev => {
        const next = new Set(prev);
        current.forEach(inv => next.delete(inv.invoice_no));
        return next;
      });
    } else {
      setCheckedIds(prev => {
        const next = new Set(prev);
        current.forEach(inv => next.add(inv.invoice_no));
        return next;
      });
    }
  };

  const selectedRows = filtered.filter(inv => checkedIds.has(inv.invoice_no));

  /* ═══════════════════════════════════════════════════════════════════
     ROW ACTIONS — Eye icon + 3-dot menu (Send via WhatsApp / Print).
     Reuses the exact invoice markup + WhatsApp send endpoint from the
     Invoice View page (no duplicated send logic):
     Reports → 3 dots → WhatsApp → off-screen render → html2pdf →
     POST /whatsapp/send_invoice  (same as Invoice View "WhatsApp" button)
     ═══════════════════════════════════════════════════════════════════ */
  const [menuOpenFor, setMenuOpenFor] = useState(null);          // invoice_no with open menu
  const [rowAction, setRowAction]   = useState(null);            // { mode:'whatsapp'|'print', phase:'loading'|'sending'|'done'|'error', invoiceNo, message }
  const [actionDoc, setActionDoc]   = useState(null);            // fetched invoice rendered off-screen

  const actionBusy =
    rowAction && ["loading", "sending"].includes(rowAction.phase);

  /* close the 3-dot menu on any outside click */
  useEffect(() => {
    if (!menuOpenFor) return;
    const close = () => setMenuOpenFor(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpenFor]);

  /* step 1 — fetch the full invoice for the selected row */
  const startRowAction = async (inv, mode) => {
    setMenuOpenFor(null);
    if (actionBusy) return;

    setRowAction({ mode, phase:"loading", invoiceNo:inv.invoice_no, message:null });

    try {
      const res = await api.get(`/invoice/get_invoice_by_id?id=${inv.invoice_no}`);
      if (!res.data.status || !res.data.data) {
        throw new Error(res.data.message || "Invoice not found");
      }
      setActionDoc(res.data.data);
    } catch (err) {
      setRowAction({ mode, phase:"error", invoiceNo:inv.invoice_no,
        message: err.response?.data?.message || err.message || "Could not load invoice" });
      setTimeout(() => { setRowAction(null); setActionDoc(null); }, 4000);
    }
  };

  /* step 2 — once the off-screen invoice has painted:
        print  → hidden iframe print dialog
        whatsapp → html2pdf → POST /whatsapp/send_invoice (same API as View page) */
  useEffect(() => {
    if (!rowAction || !actionDoc || rowAction.phase !== "loading") return;

    let cancelled = false;

    const timer = setTimeout(async () => {
      const element = document.getElementById("row-action-invoice");
      if (!element || cancelled) return;

      /* wait for the logo/images inside the invoice before capture */
      try {
        await Promise.all(
          [...element.querySelectorAll("img")].map(im =>
            im.complete ? null : new Promise(r => { im.onload = r; im.onerror = r; })
          )
        );
      } catch { /* ignore image wait errors */ }

      if (cancelled) return;

      if (rowAction.mode === "print") {
        printElement(element);
        setActionDoc(null);
        setRowAction(null);
        return;
      }

      setRowAction(s => ({ ...s, phase:"sending" }));
      try {
        const pdf_base64 = await generateInvoicePdfBase64({
          element, invoiceNo: actionDoc.invoice_no, isPOS:true,
        });
        const res = await sendInvoiceViaWhatsAppApi({
          company_id: actionDoc.company_id,
          invoice_no: actionDoc.invoice_no,
          phone:      actionDoc.customer_phone,
          pdf_base64,
        });
        if (cancelled) return;
        setRowAction({ mode:"whatsapp", phase:"done", invoiceNo:actionDoc.invoice_no,
          message: res.data?.message || "Invoice sent via WhatsApp" });
        setTimeout(() => { setRowAction(null); setActionDoc(null); }, 4000);
      } catch (err) {
        if (cancelled) return;
        setRowAction({ mode:"whatsapp", phase:"error", invoiceNo:actionDoc.invoice_no,
          message: err.response?.data?.message || err.message || "Failed to send via WhatsApp" });
        setTimeout(() => { setRowAction(null); setActionDoc(null); }, 4500);
      }
    }, 350);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [rowAction, actionDoc]);

  /* ── Excel (Invoice Report) ── */
  // const buildExcelData = (rows) =>
  //   rows.map((inv) => ({
  //     "GST Number":           inv.gstin || "-",
  //     "Invoice No":           inv.invoice_no,
  //     "Customer Name":        inv.customer_name,
  //     "Phone":                inv.customer_phone,
  //     "Invoice Generated By": inv.cashier_name || "-",
  //     "Payment Method":       inv.payment_method,
  //     "Payment Status":       inv.payment_status,
  //     "Total Amount":         `₹${Number(inv.total_amount).toLocaleString()}`,
  //     "Paid Amount":          `₹${Number(inv.paid_amount).toLocaleString()}`,
  //     "Balance Amount":       `₹${Number(inv.balance_amount).toLocaleString()}`,
  //     "Date":                 inv.created_at,
  //   }));

  // const downloadExcel = (rows, label) => {
  //   if (!rows.length) { alert("No data to export"); return; }
  //   const ws = XLSX.utils.json_to_sheet(buildExcelData(rows));
  //   ws["!cols"] = [
  //     {wch:22},{wch:20},{wch:28},{wch:16},
  //     {wch:22},{wch:16},{wch:16},{wch:16},{wch:16},{wch:16},{wch:22},
  //   ];
  //   const wb = XLSX.utils.book_new();
  //   XLSX.utils.book_append_sheet(wb, ws, "Invoice Report");
  //   const buf = XLSX.write(wb, { bookType:"xlsx", type:"array" });
  //   saveAs(
  //     new Blob([buf], { type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
  //     `invoice_report_${label}.xlsx`
  //   );
  // };


  
const excelDateOnly = (dateStr) => {
  if (!dateStr) return "-";
  return dateStr.split(" ")[0]; // "2026-04-30 00:00:00" -> "2026-04-30"
};

const buildExcelData = (rows, skipCustomerCols = false) =>
  rows.map((inv) => {
    const row = {
      "Date": excelDateOnly(inv.created_at),
      "GST Number": inv.gstin || "-",
      "Invoice No": inv.invoice_no,
    };

    if (!skipCustomerCols) {
      row["Customer Name"] = inv.customer_name;
      row["Phone"] = inv.customer_phone;
    }

    row["Invoice Generated By"] = inv.cashier_name || "-";
    row["Payment Method"]       = inv.payment_method;
    row["Payment Status"]       = inv.payment_status;
    row["Total Amount"]         = `₹${Number(inv.total_amount).toLocaleString()}`;
    row["Paid Amount"]          = `₹${Number(inv.paid_amount).toLocaleString()}`;
    row["Balance Amount"]       = `₹${Number(inv.balance_amount).toLocaleString()}`;

    return row;
  });
  /* ── Excel (Invoice Report) — with heading + customer info + summary at top ── */
const downloadExcel = (rows, label) => {
  if (!rows.length) { alert("No data to export"); return; }

  // detect if all rows belong to a single customer
  const uniqueCustomers = [...new Set(rows.map(r => r.customer_name))];
  const uniquePhones    = [...new Set(rows.map(r => r.customer_phone))];
  const isSingleCustomer = uniqueCustomers.length === 1;

  const totalAmount  = rows.reduce((s, r) => s + Number(r.total_amount), 0);
  const totalPaid    = rows.reduce((s, r) => s + Number(r.paid_amount), 0);
  const totalPending = rows.reduce((s, r) => s + Number(r.balance_amount), 0);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([]);

  let row = 0;

  // Heading
  XLSX.utils.sheet_add_aoa(ws, [["INVOICE REPORT"]], { origin: `A${row + 1}` });
  row += 2;

  // Customer info (only when the export is scoped to one customer)
  if (isSingleCustomer) {
    XLSX.utils.sheet_add_aoa(ws, [
      ["Customer Name", uniqueCustomers[0] || "-"],
      ["Mobile Number", uniquePhones[0] || "-"],
    ], { origin: `A${row + 1}` });
    row += 3;
  }

  // Summary block
  XLSX.utils.sheet_add_aoa(ws, [
    ["Total Invoices", rows.length],
    ["Total Amount",  `₹${totalAmount.toLocaleString()}`],
    ["Total Paid",    `₹${totalPaid.toLocaleString()}`],
    ["Total Pending", `₹${totalPending.toLocaleString()}`],
  ], { origin: `A${row + 1}` });
  row += 5;

  // Blank line before the table
  row += 1;

  // Table data (existing per-row data, unchanged)
  // XLSX.utils.sheet_add_json(ws, buildExcelData(rows), { origin: `A${row + 1}` });
  XLSX.utils.sheet_add_json(ws, buildExcelData(rows, isSingleCustomer), { origin: `A${row + 1}` });

  ws["!cols"] = [
    {wch:22},{wch:20},{wch:28},{wch:16},
    {wch:22},{wch:16},{wch:16},{wch:16},{wch:16},{wch:16},{wch:22},
  ];

 ws["!cols"] = isSingleCustomer
  ? [{wch:14},{wch:22},{wch:20},{wch:22},{wch:16},{wch:16},{wch:16},{wch:16},{wch:16}]
  : [{wch:14},{wch:22},{wch:20},{wch:28},{wch:16},{wch:22},{wch:16},{wch:16},{wch:16},{wch:16},{wch:16}];
  
  XLSX.utils.book_append_sheet(wb, ws, "Invoice Report");
  const buf = XLSX.write(wb, { bookType:"xlsx", type:"array" });
  saveAs(
    new Blob([buf], { type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `invoice_report_${label}.xlsx`
  );
};
  
  /* ── PDF (Invoice Report) ── */
  const downloadPDF = (rows, label) => {
    if (!rows.length) { alert("No data to export"); return; }
    const doc = new jsPDF({ orientation:"landscape" });
    doc.setFontSize(14); doc.setTextColor(67,56,202);
    doc.text("Invoice Report", 14, 16);
    doc.setFontSize(9); doc.setTextColor(120,120,120);
    doc.text(`Generated: ${new Date().toLocaleString("en-IN")}   |   Filter: ${label}`, 14, 23);
    autoTable(doc, {
      startY: 28,
      head: [["GST Number","Invoice No","Customer","Phone","Generated By","Method","Status","Total","Paid","Balance","Date"]],
      body: rows.map(inv => [
        inv.gstin||"-", inv.invoice_no, inv.customer_name, inv.customer_phone,
        inv.cashier_name||"-", inv.payment_method, inv.payment_status,
        `Rs.${Number(inv.total_amount).toFixed(2)}`,
        `Rs.${Number(inv.paid_amount).toFixed(2)}`,
        `Rs.${Number(inv.balance_amount).toFixed(2)}`,
        inv.created_at?.split(" ")[0]||"",
      ]),
      headStyles:{ fillColor:[67,56,202], textColor:255, fontStyle:"bold", fontSize:7 },
      bodyStyles:{ fontSize:7 },
      alternateRowStyles:{ fillColor:[238,242,255] },
      columnStyles:{
        0:{cellWidth:28},1:{cellWidth:22},2:{cellWidth:28},3:{cellWidth:20},
        4:{cellWidth:22},5:{cellWidth:16},6:{cellWidth:16},7:{cellWidth:18},
        8:{cellWidth:18},9:{cellWidth:18},10:{cellWidth:22},
      },
      styles:{ cellPadding:2.5 },
    });
    const finalY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(9); doc.setTextColor(67,56,202);
    doc.text(
      `Total: ${rows.length} invoices  |  ` +
      `Amount: Rs.${rows.reduce((s,r)=>s+Number(r.total_amount),0).toFixed(2)}  |  ` +
      `Paid: Rs.${rows.reduce((s,r)=>s+Number(r.paid_amount),0).toFixed(2)}  |  ` +
      `Pending: Rs.${rows.reduce((s,r)=>s+Number(r.balance_amount),0).toFixed(2)}`,
      14, finalY
    );
    doc.save(`invoice_report_${label}.pdf`);
  };

  /* ═══════════════════════════════════════════════════════════════════
     PRODUCT & STOCK REPORTS — independent of invoices.
     ONE shared Company/Brand filter + a report-type switch
     ("Full Catalog" vs "Sold Out") powering ONE download button,
     instead of two separate cards with duplicated selectors.
     ═══════════════════════════════════════════════════════════════════ */
  const [productLoading, setProductLoading] = useState(false);
  const [reportType,     setReportType]     = useState("catalog"); // "catalog" | "soldout"
  const [catalogComp,    setCatalogComp]    = useState("all");     // "all" or company id
  const [catalogBrands,  setCatalogBrands]  = useState([]);
  const [catalogBrand,   setCatalogBrand]   = useState("all");     // "all" or brand id

  /* fetch brands whenever a specific company is selected */
  useEffect(() => {
    if (catalogComp === "all") {
      setCatalogBrands([]);
      setCatalogBrand("all");
      return;
    }
    api.get(`/brand/get_active_brand?company_id=${catalogComp}`)
      .then(res => {
        if (res.data.status) setCatalogBrands(res.data.data);
        else setCatalogBrands([]);
      })
      .catch(err => { console.error(err); setCatalogBrands([]); });
    setCatalogBrand("all"); // reset brand whenever company changes
  }, [catalogComp]);

  const fetchProductCatalog = async () => {
    const companyIds =
      catalogComp === "all"
        ? companies.map(c => c.id)
        : [parseInt(catalogComp)];

    if (companyIds.length === 0) return [];

    const brandIdParam = catalogComp === "all" ? 0 : (parseInt(catalogBrand) || 0);

    const requests = companyIds.map(cid =>
      api.get(`/product/get?company_id=${cid}${brandIdParam ? `&brand_id=${brandIdParam}` : ""}`)
    );

    const responses = await Promise.all(requests);
    let allProducts = [];
    responses.forEach(res => {
      if (res.data.status) allProducts = [...allProducts, ...res.data.data];
    });
    return allProducts;
  };

  const buildCatalogExcelData = (products) =>
    products.map((p) => ({
      "Category":     p.category_name || p.category || "-",
      "Subcategory":  p.subcategory_name || p.subcategory || p.sub_category || "-",
      "Product Name": p.product_name || p.name || "-",
      "GST %":        p.gst_percentage ?? p.gst_percent ?? p.gst ?? "-",
      "Product Code": p.product_code || p.hsn_code || "-",
      "Unit":         p.unit || p.unit_type || "-",
      "Brand":        p.brand_name || "-",
      "Price":        `₹${Number(p.price || 0).toLocaleString()}`,
      "Stock":        p.stock ?? "-",
      "Status":       p.status || "-",
    }));

  const buildOutOfStockExcelData = (products) =>
    products.map((p) => ({
      "Category":     p.category_name || "-",
      "Subcategory":  p.subcategory_name || "-",
      "Product Name": p.product_name || p.name || "-",
      "Product Code": p.product_code || p.hsn_code || "-",
      "Brand":        p.brand_name || "-",
      "Unit":         p.unit || "-",
      "Price":        `₹${Number(p.price || 0).toLocaleString()}`,
      "Stock":        p.stock ?? 0,
      "Status":       p.status || "-", // active OR inactive — doesn't matter here
    }));

  const currentLabel = () =>
    catalogBrand !== "all"
      ? (catalogBrands.find(b => String(b.id) === String(catalogBrand))?.name || "brand").replace(/\s+/g,"_")
      : "all_brands";

  /* single handler — behaviour branches on `reportType` */
  const handleProductDownload = async () => {
    setProductLoading(true);
    try {
      const products = await fetchProductCatalog();

      if (reportType === "catalog") {
        if (!products.length) { alert("No products found"); return; }
        const ws = XLSX.utils.json_to_sheet(buildCatalogExcelData(products));
        ws["!cols"] = [
          {wch:18},{wch:18},{wch:26},{wch:8},{wch:14},{wch:10},{wch:16},{wch:12},{wch:8},{wch:10},
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Product Catalog");
        const buf = XLSX.write(wb, { bookType:"xlsx", type:"array" });
        saveAs(
          new Blob([buf], { type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
          `product_catalog_${currentLabel()}.xlsx`
        );
      } else {
        const soldOut = products.filter(p => Number(p.stock) <= 0);
        if (!soldOut.length) { alert("No sold-out products found"); return; }
        const ws = XLSX.utils.json_to_sheet(buildOutOfStockExcelData(soldOut));
        ws["!cols"] = [
          {wch:18},{wch:18},{wch:26},{wch:14},{wch:16},{wch:10},{wch:12},{wch:8},{wch:10},
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sold Out Products");
        const buf = XLSX.write(wb, { bookType:"xlsx", type:"array" });
        saveAs(
          new Blob([buf], { type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
          `sold_out_products_${currentLabel()}.xlsx`
        );
      }
    } catch (err) {
      console.error(err);
      alert("Failed to fetch product data");
    } finally {
      setProductLoading(false);
    }
  };

  /* ── filter label (invoice report — company/brand no longer part of it) ── */
  const filterLabel = () => {
    const parts = [];
    if (fromDate)  parts.push(`from_${fromDate}`);
    if (toDate)    parts.push(`to_${toDate}`);
    if (paymentMethod !== "all") parts.push(paymentMethod);
    if (paymentStatus !== "all") parts.push(paymentStatus);
    return parts.length ? parts.join("_") : "all";
  };

  /* ── shared styles (invoice filter panel) ── */
  const inputStyle = inputStyleBase;
  const selectStyle = selectStyleBase;
  const btnPrimary = {
    background:INDIGO, border:"none", color:"#fff",
    padding:"10px 18px", borderRadius:12,
    fontSize:12, fontWeight:700, cursor:"pointer",
    fontFamily:FONT, display:"flex", alignItems:"center", gap:7,
  };

  /* ── render ── */
  return (
    <div className="rp" style={{ fontFamily:FONT, padding:"22px 26px" }}>

      {/* HEADER */}
      <div style={{
        display:"flex", alignItems:"center",
        justifyContent:"space-between",
        marginBottom:20, flexWrap:"wrap", gap:14,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ fontSize:22 }}>🧾</div>
          <div>
            <h1 style={{ margin:0, fontSize:18, fontWeight:800, color:"#1e1b4b" }}>
              Invoice Reports
            </h1>
            <p style={{ margin:"2px 0 0", fontSize:12, color:"#9ca3af" }}>
              Filter by company · search · download PDF & Excel
            </p>
          </div>
        </div>

        {/* HEADER BUTTONS */}
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
          {checkedIds.size > 0 && (
            <span style={{
              background:"#eef2ff", color:INDIGO,
              fontWeight:700, fontSize:12,
              padding:"8px 14px", borderRadius:10,
              border:`1.5px solid #c7d2fe`,
            }}>
              {checkedIds.size} selected
            </span>
          )}
          <button
            className="rp-dl-btn"
            onClick={() =>
              checkedIds.size > 0
                ? downloadExcel(selectedRows, `selected_${filterLabel()}`)
                : downloadExcel(filtered, filterLabel())
            }
            style={{ ...btnPrimary, background:"#16a34a" }}
          >
            <Download size={14} />
            {checkedIds.size > 0 ? `Excel (${checkedIds.size})` : "Excel"}
          </button>
          <button
            className="rp-dl-btn"
            onClick={() => downloadPDF(filtered, filterLabel())}
            style={{ ...btnPrimary, background:"#dc2626" }}
          >
            <FileDown size={14} /> PDF
          </button>
        </div>
      </div>

      {/* SUMMARY */}
      {summary && (
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:20 }}>
          <SummaryCard label="Total Invoices" value={summary.total_invoices}
            color="#4338ca" icon={<Receipt size={18} color="#4338ca" />} />
          <SummaryCard label="Total Amount"
            value={`₹${Number(summary.total_amount).toLocaleString()}`}
            color="#0891b2" icon={<TrendingUp size={18} color="#0891b2" />} />
          <SummaryCard label="Total Paid"
            value={`₹${Number(summary.total_paid).toLocaleString()}`}
            color="#16a34a" icon={<TrendingUp size={18} color="#16a34a" />} />
          <SummaryCard label="Total Pending"
            value={`₹${Number(summary.total_pending).toLocaleString()}`}
            color="#dc2626" icon={<TrendingUp size={18} color="#dc2626" />} />
        </div>
      )}

      {/* PRODUCT & STOCK REPORTS — one card, two report types,
          one shared Company/Brand filter (replaces the old two
          separate "Product Catalog" + "Sold Out" cards). */}
      <ProductReportCard
        companies={companies}
        reportType={reportType}
        setReportType={setReportType}
        catalogComp={catalogComp}
        setCatalogComp={setCatalogComp}
        catalogBrand={catalogBrand}
        setCatalogBrand={setCatalogBrand}
        catalogBrands={catalogBrands}
        loading={productLoading}
        onDownload={handleProductDownload}
      />

      <div style={{ display:"flex", gap:10, marginBottom:18, alignItems:"center", flexWrap:"wrap" }}>

        {/* Search */}
        <div style={{ position:"relative", flex:1, minWidth:200 }}>
          <Search size={15} color="#6366f1" style={{
            position:"absolute", left:14,
            top:"50%", transform:"translateY(-50%)",
          }} />
          <input
            className="rp-search"
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search by invoice no, customer, phone…"
            style={{
              width:"100%", padding:"11px 14px 11px 40px",
              background:"#fff", border:"1.5px solid #e0e7ff",
              borderRadius:12, fontSize:12, outline:"none", fontFamily:FONT,
            }}
          />
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilter(v => !v)}
          style={{
            ...btnPrimary,
            background: showFilter ? INDIGO : "#eef2ff",
            color: showFilter ? "#fff" : INDIGO,
            position:"relative",
          }}
        >
          <Filter size={14} /> Filter
          {appliedCount > 0 && (
            <span style={{
              position:"absolute", top:-6, right:-6,
              background:"#dc2626", color:"#fff",
              borderRadius:"50%", width:18, height:18,
              display:"flex", alignItems:"center",
              justifyContent:"center", fontSize:10, fontWeight:800,
            }}>{appliedCount}</span>
          )}
        </button>

        {appliedCount > 0 && (
          <button onClick={resetFilter}
            style={{ ...btnPrimary, background:"#fee2e2", color:"#dc2626" }}>
            <X size={13} /> Reset
          </button>
        )}
      </div>

      {/* FILTER PANEL — invoices always cover all companies under this admin */}
      {showFilter && (
        <div className="filter-panel" style={{
          background:"#fff", border:"1.5px solid #e0e7ff",
          borderRadius:18, padding:"20px 22px", marginBottom:18,
          display:"grid",
          gridTemplateColumns:"repeat(auto-fit, minmax(170px, 1fr))",
          gap:14,
        }}>
          <div>
            <label style={fieldLabelStyle}>From Date</label>
            <input type="date" className="rp-filter-input" value={fromDate}
              onChange={e => setFromDate(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={fieldLabelStyle}>To Date</label>
            <input type="date" className="rp-filter-input" value={toDate}
              onChange={e => setToDate(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={fieldLabelStyle}>Payment Method</label>
            <select className="rp-filter-input" value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)} style={selectStyle}>
              {PAYMENT_METHODS.map(m => (
                <option key={m} value={m}>{METHOD_LABEL[m]}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={fieldLabelStyle}>Payment Status</label>
            <select className="rp-filter-input" value={paymentStatus}
              onChange={e => setPaymentStatus(e.target.value)} style={selectStyle}>
              {PAYMENT_STATUSES.map(s => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={fieldLabelStyle}>Customer Name</label>
            <input type="text" className="rp-filter-input" value={customerFilter}
              onChange={e => setCustomerFilter(e.target.value)}
              placeholder="Search customer…" style={inputStyle} />
          </div>

          <div style={{ display:"flex", flexDirection:"column", justifyContent:"flex-end", gap:8 }}>
            <button onClick={applyFilter} style={{ ...btnPrimary, justifyContent:"center" }}>
              Apply Filter
            </button>
            <button onClick={resetFilter} style={{
              ...btnPrimary, background:"#f1f5f9",
              color:"#64748b", justifyContent:"center",
            }}>
              Reset All
            </button>
          </div>
        </div>
      )}

      {/* TABLE */}
      <div className="rp-card" style={{
        background:"#fff", borderRadius:20,
        border:"1.5px solid #e0e7ff", overflow:"hidden",
      }}>
        <div style={{ height:4, background:"linear-gradient(90deg,#4338ca,#6366f1,#818cf8)" }} />

        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:1230 }}>
            <thead>
              <tr style={{ background:"#eef2ff" }}>
                {/* Checkbox all */}
                <th style={{ padding:"12px 16px", width:40 }}>
                  <input
                    type="checkbox"
                    className="rp-cb"
                    checked={allCurrentChecked}
                    onChange={toggleAll}
                  />
                </th>
                {["#","Invoice No","Customer","Phone","Amount","Paid","Balance","Method","Status","By","Date","Action"].map((h,i) => (
                  <th key={i} style={{
                    padding:"12px 16px", textAlign:"left",
                    fontSize:11, fontWeight:700, color:INDIGO,
                    borderBottom:"1px solid #dbeafe", whiteSpace:"nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} style={{ padding:50, textAlign:"center", color:"#9ca3af" }}>
                    Loading…
                  </td>
                </tr>
              ) : current.length > 0 ? current.map((inv, i) => {
                const mb = methodBadge(inv.payment_method);
                const sb = statusBadge(inv.payment_status);
                const isChecked = checkedIds.has(inv.invoice_no);
                return (
                  <tr
                    key={i}
                    className="rp-row"
                    onClick={() => navigate(`/invoice/${inv.invoice_no}`)}
                    style={{ background: isChecked ? "#f0f4ff" : undefined }}
                  >
                    {/* Checkbox */}
                    <td style={{ padding:"13px 16px" }} onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="rp-cb"
                        checked={isChecked}
                        onChange={e => toggleCheck(inv.invoice_no, e)}
                      />
                    </td>

                    <td style={{ padding:"13px 16px" }}>{indexOfFirst + i + 1}</td>

                    <td style={{ padding:"13px 16px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{
                          width:30, height:30, borderRadius:9,
                          background:"#eef2ff", display:"flex",
                          alignItems:"center", justifyContent:"center",
                        }}>
                          <Receipt size={13} color={INDIGO} />
                        </div>
                        <span style={{ fontWeight:700, color:INDIGO }}>{inv.invoice_no}</span>
                      </div>
                    </td>

                    <td style={{ padding:"13px 16px" }}>{inv.customer_name}</td>
                    <td style={{ padding:"13px 16px", color:"#6b7280" }}>{inv.customer_phone}</td>

                    <td style={{ padding:"13px 16px", fontWeight:700, color:"#1e1b4b" }}>
                      ₹{Number(inv.total_amount).toLocaleString()}
                    </td>
                    <td style={{ padding:"13px 16px", fontWeight:700, color:"#16a34a" }}>
                      ₹{Number(inv.paid_amount).toLocaleString()}
                    </td>
                    <td style={{ padding:"13px 16px", fontWeight:700,
                      color: Number(inv.balance_amount) > 0 ? "#dc2626" : "#9ca3af" }}>
                      ₹{Number(inv.balance_amount).toLocaleString()}
                    </td>

                    <td style={{ padding:"13px 16px" }}>
                      <span style={{
                        padding:"5px 11px", borderRadius:20, fontSize:11,
                        fontWeight:700, background:mb.bg, color:mb.color,
                      }}>{inv.payment_method || "-"}</span>
                    </td>

                    <td style={{ padding:"13px 16px" }}>
                      <span style={{
                        padding:"5px 11px", borderRadius:20, fontSize:11,
                        fontWeight:700, background:sb.bg, color:sb.color,
                      }}>{STATUS_LABEL[inv.payment_status] || inv.payment_status}</span>
                    </td>

                    <td style={{ padding:"13px 16px", color:"#6b7280" }}>
                      {inv.cashier_name || "-"}
                    </td>

                    <td style={{ padding:"13px 16px", color:"#6b7280", whiteSpace:"nowrap" }}>
                      {formatDate(inv.created_at)}
                    </td>

                    <td style={{ padding:"13px 16px" }} onClick={e => e.stopPropagation()}>
                      <div style={{ display:"flex", alignItems:"center", gap:6, position:"relative" }}>

                        {/* View — eye icon only */}
                        <button
                          className="rp-view-btn"
                          title="View invoice"
                          onClick={() => navigate(`/invoice/${inv.invoice_no}`)}
                          disabled={actionBusy}
                          style={{
                            width:34, height:30,
                            display:"flex", alignItems:"center", justifyContent:"center",
                            background:"#eef2ff", border:"1px solid #c7d2fe",
                            color:INDIGO, borderRadius:10, cursor:"pointer",
                            opacity: actionBusy ? 0.5 : 1,
                          }}
                        >
                          <Eye size={14} />
                        </button>

                        {/* 3-dot menu → WhatsApp / Print */}
                        <button
                          className="rp-view-btn"
                          title="More actions"
                          onClick={e => {
                            e.stopPropagation();
                            setMenuOpenFor(menuOpenFor === inv.invoice_no ? null : inv.invoice_no);
                          }}
                          disabled={actionBusy}
                          style={{
                            width:34, height:30,
                            display:"flex", alignItems:"center", justifyContent:"center",
                            background: menuOpenFor === inv.invoice_no ? INDIGO : "#eef2ff",
                            border:"1px solid #c7d2fe",
                            color: menuOpenFor === inv.invoice_no ? "#fff" : INDIGO,
                            borderRadius:10, cursor:"pointer",
                            opacity: actionBusy ? 0.5 : 1,
                          }}
                        >
                          <MoreVertical size={14} />
                        </button>

                        {menuOpenFor === inv.invoice_no && (
                          <div onClick={e => e.stopPropagation()} style={{
                            position:"absolute", top:36, right:0, zIndex:60,
                            minWidth:195, background:"#fff",
                            border:"1px solid #e0e7ff", borderRadius:12,
                            boxShadow:"0 12px 28px rgba(30,27,75,.16)",
                            overflow:"hidden", animation:"fadeSlide .18s ease both",
                          }}>
                            <button onClick={() => startRowAction(inv, "whatsapp")}
                              style={{
                                display:"flex", alignItems:"center", gap:10,
                                width:"100%", padding:"11px 14px",
                                border:"none", background:"#fff", cursor:"pointer",
                                fontSize:12, fontWeight:600, fontFamily:FONT,
                                color:"#15803d", textAlign:"left",
                                borderBottom:"1px solid #eef2ff",
                              }}
                              onMouseOver={e => { e.currentTarget.style.background = "#f0fdf4"; }}
                              onMouseOut={e => { e.currentTarget.style.background = "#fff"; }}
                            >
                              <FaWhatsapp size={16} /> Send via WhatsApp
                            </button>
                            <button onClick={() => startRowAction(inv, "print")}
                              style={{
                                display:"flex", alignItems:"center", gap:10,
                                width:"100%", padding:"11px 14px",
                                border:"none", background:"#fff", cursor:"pointer",
                                fontSize:12, fontWeight:600, fontFamily:FONT,
                                color:"#1d4ed8", textAlign:"left",
                              }}
                              onMouseOver={e => { e.currentTarget.style.background = "#eff6ff"; }}
                              onMouseOut={e => { e.currentTarget.style.background = "#fff"; }}
                            >
                              <Printer size={15} /> Print
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={12} style={{ padding:50, textAlign:"center" }}>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
                      <FileText size={32} color="#c7d2fe" />
                      <span style={{ color:"#9ca3af" }}>No invoices found</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div style={{
          display:"flex", alignItems:"center",
          justifyContent:"space-between", marginTop:18,
        }}>
          <button className="rp-pg-btn" onClick={() => goTo(currentPage - 1)}
            disabled={currentPage === 1}
            style={{
              display:"flex", alignItems:"center", gap:6,
              padding:"8px 16px", background:"#fff",
              border:"1px solid #dbeafe", borderRadius:10,
              cursor:"pointer", fontFamily:FONT,
            }}>
            <ChevronLeft size={15} /> Prev
          </button>

          <div style={{ display:"flex", gap:6, flexWrap:"wrap", justifyContent:"center" }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => goTo(p)} className="rp-pg-btn" style={{
                width:36, height:36, borderRadius:10,
                border:"1px solid #dbeafe",
                background: currentPage === p ? INDIGO : "#fff",
                color: currentPage === p ? "#fff" : INDIGO,
                fontWeight:700, cursor:"pointer", fontFamily:FONT,
              }}>{p}</button>
            ))}
          </div>

          <button className="rp-pg-btn" onClick={() => goTo(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={{
              display:"flex", alignItems:"center", gap:6,
              padding:"8px 16px", background:"#fff",
              border:"1px solid #dbeafe", borderRadius:10,
              cursor:"pointer", fontFamily:FONT,
            }}>
            Next <ChevronRight size={15} />
          </button>
        </div>
      )}

      {/* ── OFF-SCREEN INVOICE (same markup as Invoice View page) —
             rendered only while a row WhatsApp/Print action is running ── */}
      {actionDoc && (
        <div aria-hidden style={{
          position:"fixed", top:0, left:"-10000px",
          width:360, background:"#fff", zIndex:-1,
        }}>
          <div id="row-action-invoice" style={{
            background:"#fff", width:360, padding:"20px 18px",
          }}>
            <DESIGN_COMPONENTS.pos
              invoice={actionDoc}
              company={{
                company_name:     actionDoc.company_name,
                company_address:  actionDoc.company_address,
                phone:            actionDoc.phone,
                gstin:            actionDoc.gstin,
                logo:             actionDoc.logo,
              }}
              logoUrl={getInvoiceLogoUrl(actionDoc.logo)}
            />
          </div>
        </div>
      )}

      {/* ── TOAST for row actions (WhatsApp / Print progress & result) ── */}
      {rowAction && (
        <div style={{
          position:"fixed", bottom:24, right:24, zIndex:100,
          display:"flex", alignItems:"center", gap:10,
          background:"#fff",
          border:`1.5px solid ${rowAction.phase === "error" ? "#fecaca" : "#bbf7d0"}`,
          borderRadius:14, padding:"12px 18px",
          boxShadow:"0 12px 30px rgba(15,23,42,.18)",
          fontSize:12.5, fontWeight:600, fontFamily:FONT,
          maxWidth:340,
        }}>
          {(rowAction.phase === "loading" || rowAction.phase === "sending") ? (
            <>
              <Loader2 size={17} color={INDIGO} style={{ animation:"rp-spin 1s linear infinite" }} />
              <span style={{ color:"#334155" }}>
                {rowAction.phase === "loading"
                  ? `Preparing ${rowAction.invoiceNo}…`
                  : `Sending ${rowAction.invoiceNo} via WhatsApp…`}
              </span>
            </>
          ) : rowAction.phase === "done" ? (
            <>
              <FaWhatsapp size={17} color="#16a34a" />
              <span style={{ color:"#15803d" }}>{rowAction.message}</span>
            </>
          ) : (
            <>
              <X size={17} color="#dc2626" />
              <span style={{ color:"#dc2626" }}>{rowAction.message}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}