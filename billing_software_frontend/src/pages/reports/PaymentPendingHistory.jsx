// import { useEffect, useState } from "react";
// import api from "../../services/api";

// export default function PaymentPendingHistory() {

//   const [data, setData] = useState([]);

//   // ✅ FETCH DATA

//   const fetchData = async () => {

//     const user = JSON.parse(localStorage.getItem("user"));

//     const res = await api.post(
//       "/invoice/get_pending_invoice_history",
//       {
//         company_id: user.company_id
//       }
//     );

//     if (res.data.status) {
//       setData(res.data.data);
//     }
//   };

//   useEffect(() => {
//     fetchData();
//   }, []);

//   // ✅ DATE FORMAT

//   const formatDate = (date) => {

//     if (!date) return "-";

//     const d = new Date(date.replace(" ", "T"));

//     return d.toLocaleDateString("en-IN", {
//       day: "2-digit",
//       month: "short",
//       year: "numeric"
//     });
//   };

//   return (

//     <div
//       style={{
//         padding: 24,
//         fontFamily: "sans-serif",
//         background: "#f8fafc",
//         minHeight: "100vh"
//       }}
//     >

//       {/* HEADER */}

//       <div
//         style={{
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "space-between",
//           marginBottom: 22
//         }}
//       >

//         <h2
//           style={{
//             margin: 0,
//             color: "#1e293b"
//           }}
//         >
//           📜 Payment Pending History
//         </h2>

//         <div
//           style={{
//             background: "#fff",
//             padding: "10px 16px",
//             borderRadius: 12,
//             border: "1px solid #e2e8f0",
//             fontWeight: 700,
//             color: "#4338ca"
//           }}
//         >
//           Total Pending : ₹
//           {data
//             .reduce(
//               (sum, item) =>
//                 sum + Number(item.balance_amount),
//               0
//             )
//             .toLocaleString()}
//         </div>

//       </div>

//       {/* TABLE */}

//       <div
//         style={{
//           background: "#fff",
//           borderRadius: 18,
//           overflow: "hidden",
//           border: "1px solid #e5e7eb",
//           boxShadow: "0 4px 14px rgba(0,0,0,.04)"
//         }}
//       >

//         <div style={{ overflowX: "auto" }}>

//           <table
//             style={{
//               width: "100%",
//               borderCollapse: "collapse",
//               minWidth: 1100
//             }}
//           >

//             {/* HEADER */}

//             <thead>

//               <tr
//                 style={{
//                   background: "#eef2ff"
//                 }}
//               >

//                 <th style={th}>Invoice</th>

//                 <th style={th}>Customer</th>

//                 <th style={th}>Phone</th>

//                 <th style={th}>Total</th>

//                 <th style={th}>Paid</th>

//                 <th style={th}>Pending</th>

//                 <th style={th}>Limit</th>

//                 <th style={th}>Due Date</th>

//                 <th style={th}>Payment Status</th>

//               </tr>

//             </thead>

//             {/* BODY */}

//             <tbody>

//               {data.length === 0 ? (

//                 <tr>

//                   <td
//                     colSpan={9}
//                     style={{
//                       padding: 40,
//                       textAlign: "center",
//                       color: "#64748b",
//                       fontWeight: 600
//                     }}
//                   >
//                     No Payment History
//                   </td>

//                 </tr>

//               ) : data.map((item, i) => {

//                 const isPaid =
//                   Number(item.balance_amount) <= 0;

//                 return (

//                   <tr
//                     key={i}
//                     style={{
//                       borderBottom:
//                         "1px solid #f1f5f9"
//                     }}
//                   >

//                     {/* INVOICE */}

//                     <td style={tdBlue}>
//                       {item.invoice_no}
//                     </td>

//                     {/* CUSTOMER */}

//                     <td style={td}>
//                       {item.customer_name}
//                     </td>

//                     {/* PHONE */}

//                     <td style={tdLight}>
//                       {item.customer_phone}
//                     </td>

//                     {/* TOTAL */}

//                     <td style={td}>
//                       ₹
//                       {Number(
//                         item.total_amount
//                       ).toLocaleString()}
//                     </td>

//                     {/* PAID */}

//                     <td
//                       style={{
//                         padding: "14px",
//                         color: "#16a34a",
//                         fontWeight: 700
//                       }}
//                     >
//                       ₹
//                       {Number(
//                         item.paid_amount_total
//                       ).toLocaleString()}
//                     </td>

//                     {/* PENDING */}

//                     <td
//                       style={{
//                         padding: "14px",
//                         color:
//                           Number(item.balance_amount) > 0
//                             ? "#dc2626"
//                             : "#16a34a",
//                         fontWeight: 700
//                       }}
//                     >
//                       ₹
//                       {Number(
//                         item.balance_amount
//                       ).toLocaleString()}
//                     </td>

//                     {/* LIMIT */}

//                     <td
//                       style={{
//                         padding: "14px",
//                         color: "#7c3aed",
//                         fontWeight: 700
//                       }}
//                     >
//                       ₹
//                       {Number(
//                         item.credit_limit
//                       ).toLocaleString()}
//                     </td>

//                     {/* DUE DATE */}

//                     <td style={td}>
//                       {item.due_date
//                         ? formatDate(item.due_date)
//                         : "-"}
//                     </td>

//                     {/* STATUS */}

//                     <td style={td}>

//                       <span
//                         style={{
//                           padding: "6px 14px",
//                           borderRadius: 20,
//                           fontSize: 12,
//                           fontWeight: 700,
//                           background:
//                             isPaid
//                               ? "#dcfce7"
//                               : "#fee2e2",
//                           color:
//                             isPaid
//                               ? "#15803d"
//                               : "#dc2626"
//                         }}
//                       >
//                         {isPaid
//                           ? "Paid"
//                           : "Not Paid"}
//                       </span>

//                     </td>

//                   </tr>

//                 );
//               })}

//             </tbody>

//           </table>

//         </div>

//       </div>

//     </div>
//   );
// }

// // 🎨 STYLES

// const th = {
//   padding: "14px",
//   textAlign: "left",
//   fontSize: 12,
//   color: "#4338ca",
//   fontWeight: 700,
//   whiteSpace: "nowrap"
// };

// const td = {
//   padding: "14px",
//   whiteSpace: "nowrap"
// };

// const tdLight = {
//   padding: "14px",
//   color: "#6b7280",
//   whiteSpace: "nowrap"
// };

// const tdBlue = {
//   padding: "14px",
//   color: "#4338ca",
//   fontWeight: 700,
//   whiteSpace: "nowrap"
// };


import { useEffect, useState } from "react";
import api from "../../services/api";
import ReportPagination from "../../components/reports/ReportPagination";

export default function PaymentPendingHistory() {

  const [data, setData] = useState([]);

  // ✅ PAGINATION

  const [currentPage, setCurrentPage] = useState(1);

  const recordsPerPage = 10;

  // ✅ FETCH DATA

  const fetchData = async () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const admin_id = user?.role === "cashier" ? user?.admin_id : user?.id;

    const res = await api.get(`/invoice/get_pending_invoice_history?admin_id=${admin_id}`);

    if (res.data.status) {
      setData(res.data.data);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ✅ DATE FORMAT

  const formatDate = (date) => {

    if (!date) return "-";

    const d = new Date(date.replace(" ", "T"));

    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  // ✅ PAGINATION LOGIC

  const totalPages = Math.ceil(
    data.length / recordsPerPage
  );

  const indexOfFirst =
    (currentPage - 1) * recordsPerPage;

  const currentData = data.slice(
    indexOfFirst,
    indexOfFirst + recordsPerPage
  );



  return (

    <div
      style={{
        padding: 24,
        fontFamily: "sans-serif",
        background: "#f8fafc",
        minHeight: "100vh"
      }}
    >

      {/* HEADER */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 22
        }}
      >

        <h2
          style={{
            margin: 0,
            color: "#1e293b"
          }}
        >
          📜 Payment Pending History
        </h2>

        <div
          style={{
            background: "#fff",
            padding: "10px 16px",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            fontWeight: 700,
            color: "#4338ca"
          }}
        >
          Total Pending : ₹
          {data
            .reduce(
              (sum, item) =>
                sum + Number(item.balance_amount),
              0
            )
            .toLocaleString()}
        </div>

      </div>

      {/* TABLE */}

      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid #e5e7eb",
          boxShadow: "0 4px 14px rgba(0,0,0,.04)"
        }}
      >

        <div style={{ overflowX: "auto" }}>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 1100
            }}
          >

            {/* HEADER */}

            <thead>

              <tr
                style={{
                  background: "#eef2ff"
                }}
              >

                <th style={th}>#</th>

                <th style={th}>Invoice</th>

                <th style={th}>Customer</th>

                <th style={th}>Phone</th>

                <th style={th}>Total</th>

                <th style={th}>Paid</th>

                <th style={th}>Pending</th>

                <th style={th}>Limit</th>

                <th style={th}>Due Date</th>

                <th style={th}>Payment Status</th>

              </tr>

            </thead>

            {/* BODY */}

            <tbody>

              {currentData.length === 0 ? (

                <tr>

                  <td
                    colSpan={10}
                    style={{
                      padding: 40,
                      textAlign: "center",
                      color: "#64748b",
                      fontWeight: 600
                    }}
                  >
                    No Payment History
                  </td>

                </tr>

              ) : currentData.map((item, i) => {

                const isPaid =
                  Number(item.balance_amount) <= 0;

                return (

                  <tr
                    key={i}
                    style={{
                      borderBottom:
                        "1px solid #f1f5f9"
                    }}
                  >

                    {/* SERIAL */}

                    <td style={td}>
                      {indexOfFirst + i + 1}
                    </td>

                    {/* INVOICE */}

                    <td style={tdBlue}>
                      {item.invoice_no}
                    </td>

                    {/* CUSTOMER */}

                    <td style={td}>
                      {item.customer_name}
                    </td>

                    {/* PHONE */}

                    <td style={tdLight}>
                      {item.customer_phone}
                    </td>

                    {/* TOTAL */}

                    <td style={td}>
                      ₹
                      {Number(
                        item.total_amount
                      ).toLocaleString()}
                    </td>

                    {/* PAID */}

                    <td
                      style={{
                        padding: "14px",
                        color: "#16a34a",
                        fontWeight: 700
                      }}
                    >
                      ₹
                      {Number(
                        item.paid_amount_total
                      ).toLocaleString()}
                    </td>

                    {/* PENDING */}

                    <td
                      style={{
                        padding: "14px",
                        color:
                          Number(item.balance_amount) > 0
                            ? "#dc2626"
                            : "#16a34a",
                        fontWeight: 700
                      }}
                    >
                      ₹
                      {Number(
                        item.balance_amount
                      ).toLocaleString()}
                    </td>

                    {/* LIMIT */}

                    <td
                      style={{
                        padding: "14px",
                        color: "#7c3aed",
                        fontWeight: 700
                      }}
                    >
                      ₹
                      {Number(
                        item.credit_limit
                      ).toLocaleString()}
                    </td>

                    {/* DUE DATE */}

                    <td style={td}>
                      {item.due_date
                        ? formatDate(item.due_date)
                        : "-"}
                    </td>

                    {/* STATUS */}

                    <td style={td}>

                      <span
                        style={{
                          padding: "6px 14px",
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 700,
                          background:
                            isPaid
                              ? "#dcfce7"
                              : "#fee2e2",
                          color:
                            isPaid
                              ? "#15803d"
                              : "#dc2626"
                        }}
                      >
                        {isPaid
                          ? "Paid"
                          : "Not Paid"}
                      </span>

                    </td>

                  </tr>

                );
              })}

            </tbody>

          </table>

        </div>

      </div>

      {/* PAGINATION */}
      <ReportPagination
        total={data.length}
        page={currentPage}
        rowsPerPage={recordsPerPage}
        pageSizeOptions={[recordsPerPage]}
        onPageChange={(p) => {
          setCurrentPage(Math.max(1, Math.min(p, totalPages)));
        }}
      />

    </div>
  );
}

// 🎨 STYLES

const th = {
  padding: "14px",
  textAlign: "left",
  fontSize: 12,
  color: "#4338ca",
  fontWeight: 700,
  whiteSpace: "nowrap"
};

const td = {
  padding: "14px",
  whiteSpace: "nowrap"
};

const tdLight = {
  padding: "14px",
  color: "#6b7280",
  whiteSpace: "nowrap"
};

const tdBlue = {
  padding: "14px",
  color: "#4338ca",
  fontWeight: 700,
  whiteSpace: "nowrap"
};


