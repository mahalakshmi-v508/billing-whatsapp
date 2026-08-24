// // import { useNavigate } from "react-router-dom";

// // export default function CompanyList() {
// //   const navigate = useNavigate();

// //   const companies = [
// //     {
// //       name: "ABC Traders",
// //       code: "CMP001",
// //       address: "Chennai",
// //     },
// //   ];

// //   return (
// //     <div>
// //       <div className="flex justify-between mb-4">
// //         <h1 className="text-xl font-bold">Companies</h1>

// //         <button
// //           onClick={() => navigate("/company/add")}
// //           className="bg-green-600 text-white px-4 py-2 rounded"
// //         >
// //           + Add Company
// //         </button>
// //       </div>

// //       <table className="w-full bg-white rounded shadow">
// //         <thead className="bg-gray-200">
// //           <tr>
// //             <th>Name</th>
// //             <th>Code</th>
// //             <th>Address</th>
// //           </tr>
// //         </thead>

// //         <tbody>
// //           {companies.map((c, i) => (
// //             <tr key={i} className="text-center">
// //               <td>{c.name}</td>
// //               <td>{c.code}</td>
// //               <td>{c.address}</td>
// //             </tr>
// //           ))}
// //         </tbody>
// //       </table>
// //     </div>
// //   );
// // }

// //api integration
// import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import api, { API_BASE_URL } from "../../services/api";
// import { Pencil, Trash2 } from "lucide-react";

// export default function CompanyList() {
//   const navigate = useNavigate();
//   const [companies, setCompanies] = useState([]);

//   const fetchCompanies = async () => {
//     try {
//       const res = await api.get("/company/get_companies");
//       if (res.data.status) {
//         setCompanies(res.data.data);
//       }
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   useEffect(() => {
//     fetchCompanies();
//   }, []);

//   // const handleDelete = async (id) => {
//   //   if (!window.confirm("Delete this company?")) return;

//   //   try {
//   //     const res = await api.post("/company/delete_company", { id });

//   //     if (res.data.status) {
//   //       fetchCompanies();
//   //     } else {
//   //       alert(res.data.message);
//   //     }
//   //   } catch (err) {
//   //     console.error(err);
//   //   }
//   // };


//  const handleDelete = async (id) => {
//   if (!window.confirm("Delete this company permanently?")) return;

//   try {
//     const res = await api.post("/company/delete_company", { id });

//     if (res.data.status === true) {
//       alert("Deleted Permanently ✅");

//       // 🔥 remove from UI instantly (no reload feel)
//       setCompanies(prev => prev.filter(c => c.id !== id));

//     } else {
//       alert(res.data.message);
//     }
//   } catch (err) {
//     console.error(err);
//     alert("Server error");
//   }
// };
//   return (
//     <div className="p-6">

//       {/* Header */}
//       <div className="flex justify-between items-center mb-6">
//         <h1 className="text-2xl font-semibold text-gray-700">
//           Company List
//         </h1>

//         <button
//           onClick={() => navigate("/company/add")}
//           className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg shadow"
//         >
//           + Add Company
//         </button>
//       </div>

//       {/* Table Card */}
//       <div className="bg-white rounded-xl shadow overflow-hidden">

//         <table className="w-full text-sm text-left">

//          <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
//   <tr>
//     <th className="px-6 py-3">Logo</th>
//     <th className="px-6 py-3">Company</th>
//     <th className="px-6 py-3">Code</th>
//     <th className="px-6 py-3">GSTIN</th>
//     <th className="px-6 py-3">Phone</th>
//     <th className="px-6 py-3">Address</th>
//     <th className="px-6 py-3 text-center">Actions</th>
//   </tr>
// </thead>

//           <tbody className="divide-y">
//   {companies.map((c) => (
//     <tr key={c.id} className="hover:bg-gray-50 transition">

//       {/* Logo */}
//       <td className="px-6 py-4">
//         {c.logo && (
//           <img
//              src={`${API_BASE_URL}${c.logo}`}
//             className="h-10 w-10 object-cover rounded"
//           />
//         )}
//       </td>

//       {/* Name */}
//       <td className="px-6 py-4 font-medium text-gray-800">
//         {c.company_name}
//       </td>

//       {/* Code */}
//       <td className="px-6 py-4">{c.company_code}</td>

//       {/* GSTIN */}
//       <td className="px-6 py-4">{c.gstin}</td>

//       {/* Phone */}
//       <td className="px-6 py-4">{c.phone}</td>

//       {/* Address */}
//       <td className="px-6 py-4">{c.company_address}</td>

//       {/* Actions */}
//       <td className="px-6 py-4 flex justify-center gap-3">

//         <button
//           onClick={() => navigate(`/company/edit/${c.id}`)}
//           className="p-2 bg-blue-50 text-blue-600 rounded"
//         >
//           <Pencil size={18} />
//         </button>

//         <button
//           onClick={() => handleDelete(c.id)}
//           className="p-2 bg-red-50 text-red-600 rounded"
//         >
//           <Trash2 size={18} />
//         </button>

//       </td>
//     </tr>
//   ))}
// </tbody>

//         </table>
//       </div>
//     </div>
//   );
// }




import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { API_BASE_URL, API_BASE_URL_IMAGE } from "../../services/api";
import { Pencil, Power, Building2, ChevronLeft, ChevronRight, Search } from "lucide-react";

const ITEMS_PER_PAGE = 5;

export default function CompanyList() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  // const [deleteId, setDeleteId] = useState(null);

  const MAX_COMPANIES = 3;

  const isLimitReached =
    companies.length >= MAX_COMPANIES;

  const fetchCompanies = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const res = await api.get(`/company/get_companies_by_admin?admin_id=${user.id}`);
      if (res.data.status) setCompanies(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

 


  // const toggleStatus = async (company) => {

  //   const newStatus =
  //     company.status === "active"
  //       ? "inactive"
  //       : "active";

  //   try {

  //     const res = await api.post(
  //       "/company/toggle_company_status",
  //       {
  //         id: company.id,
  //         company_status: newStatus,
  //       }
  //     );

  //     if (res.data.success) {

  //       setCompanies((prev) =>
  //         prev.map((c) =>
  //           c.id === company.id
  //             ? { ...c, status: newStatus }
  //             : c
  //         )
  //       );

  //     } else {

  //       alert(res.data.message);

  //     }

  //   } catch (err) {

  //     console.error(err);
  //     alert("Server error");

  //   }
  // };
  
  const toggleStatus = async (company) => {
  const newStatus = company.status === "active" ? "inactive" : "active";
  try {
    const res = await api.post(
      "/company/toggle_company_status",
      {
        id: company.id,
        status: newStatus,   // ✅ company_status -> status
      }
    );

    if (res.data.status) {   // ✅ success -> status
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === company.id ? { ...c, status: newStatus } : c
        )
      );
    } else {
      alert(res.data.message);
    }
  } catch (err) {
    console.error(err);
    alert("Server error");
  }
};
  
  const filtered = companies.filter(c =>
    c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.company_code?.toLowerCase().includes(search.toLowerCase()) ||
    c.gstin?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const handleSearch = (val) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const getInitials = (name) =>
    name ? name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() : "?";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .cl-wrap {
          font-family: 'Plus Jakarta Sans', sans-serif;
          min-height: 100vh;
          background: #f0f4ff;
          padding: 2rem 2rem;
        }

        /* ── Header ── */
        .cl-topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.75rem;
          flex-wrap: wrap;
          gap: 12px;
        }
        .cl-title-group { display: flex; align-items: center; gap: 12px; }
        .cl-icon-wrap {
          width: 44px; height: 44px; border-radius: 12px;
          background: linear-gradient(135deg, #1e40af, #3b82f6);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .cl-title { font-size: 22px; font-weight: 800; color: #1e293b; margin: 0; }
        .cl-subtitle { font-size: 13px; color: #64748b; margin: 2px 0 0; }

        .cl-add-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 10px 20px; border-radius: 12px; border: none;
          background: linear-gradient(135deg, #1d4ed8, #3b82f6);
          color: #fff; font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14px; font-weight: 700; cursor: pointer;
          box-shadow: 0 4px 14px rgba(37,99,235,0.35);
          transition: all 0.2s;
        }
        .cl-add-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(37,99,235,0.45); }

        /* ── Search ── */
        .cl-search-wrap {
          position: relative; margin-bottom: 1.25rem;
        }
        .cl-search-icon {
          position: absolute; left: 14px; top: 50%;
          transform: translateY(-50%); color: #94a3b8;
          pointer-events: none;
        }
        .cl-search {
          width: 100%; padding: 11px 14px 11px 42px;
          border-radius: 12px; border: 1.5px solid #e2e8f0;
          background: #fff; font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14px; color: #1e293b; outline: none;
          box-sizing: border-box; transition: all 0.2s;
        }
        .cl-search::placeholder { color: #c4cdd6; }
        .cl-search:focus { border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59,130,246,0.1); }

        /* ── Card ── */
        .cl-card {
          background: #fff; border-radius: 20px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 24px rgba(37,99,235,0.08);
          overflow: hidden;
        }
.cl-table-wrap {
  overflow-x: auto;
}
.cl-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 900px;
}
        /* ── Table header stripe ── */
        .cl-table-header {
          background: linear-gradient(135deg, #1e40af, #2563eb);
          padding: 0;
        }
        .cl-table { width: 100%; border-collapse: collapse; }

        .cl-th {
          padding: 14px 16px;
          font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.08em;
          color: rgba(255,255,255,0.8);
          text-align: left; white-space: nowrap;
        }
        .cl-th.center { text-align: center; }

        /* ── Rows ── */
        .cl-tr { border-bottom: 1px solid #f1f5f9; transition: background 0.15s; }
        .cl-tr:last-child { border-bottom: none; }
        .cl-tr:hover { background: #f8faff; }

        .cl-td { padding: 14px 16px; vertical-align: middle; }

        /* avatar / logo */
        .cl-avatar {
          width: 40px; height: 40px; border-radius: 10px;
          background: linear-gradient(135deg, #dbeafe, #eff6ff);
          border: 1.5px solid #bfdbfe;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; color: #1d4ed8;
          flex-shrink: 0; overflow: hidden;
        }
        .cl-avatar img { width: 100%; height: 100%; object-fit: cover; }

        .cl-company-cell { display: flex; align-items: center; gap: 10px; }
        .cl-company-name { font-size: 14px; font-weight: 700; color: #1e293b; }
        .cl-company-sub  { font-size: 12px; color: #64748b; margin-top: 2px; }

        .cl-badge {
          display: inline-block; padding: 3px 10px;
          border-radius: 100px; font-size: 11.5px; font-weight: 700;
        }
        .cl-badge-blue { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
        .cl-badge-gray { background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; }

        .cl-text-muted { font-size: 13.5px; color: #475569; }

        /* action buttons */
        .cl-actions { display: flex; align-items: center; justify-content: center; gap: 8px; }
        .cl-btn-edit, .cl-btn-del {
          width: 34px; height: 34px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          border: none; cursor: pointer; transition: all 0.18s;
        }
        .cl-btn-edit { background: #eff6ff; color: #2563eb; }
        .cl-btn-edit:hover { background: #dbeafe; transform: scale(1.08); }
        .cl-btn-del  { background: #fff1f2; color: #e11d48; }
        .cl-btn-del:hover  { background: #ffe4e6; transform: scale(1.08); }

        /* ── Empty state ── */
        .cl-empty {
          text-align: center; padding: 3rem 1rem; color: #94a3b8;
        }
        .cl-empty-icon {
          width: 56px; height: 56px; border-radius: 16px;
          background: #f1f5f9; margin: 0 auto 12px;
          display: flex; align-items: center; justify-content: center;
        }
        .cl-empty p { font-size: 14px; font-weight: 600; color: #64748b; margin: 0 0 4px; }
        .cl-empty span { font-size: 13px; }

        /* ── Pagination ── */
        .cl-pagination {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 20px; border-top: 1px solid #f1f5f9;
          background: #fafbff;
          flex-wrap: wrap; gap: 10px;
        }
        .cl-page-info { font-size: 13px; color: #64748b; }
        .cl-page-info strong { color: #1e293b; font-weight: 700; }

        .cl-page-btns { display: flex; align-items: center; gap: 5px; }
        .cl-page-btn {
          width: 34px; height: 34px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          border: 1.5px solid #e2e8f0; background: #fff;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px; font-weight: 600; color: #64748b;
          cursor: pointer; transition: all 0.18s;
        }
        .cl-page-btn:hover:not(:disabled) { border-color: #3b82f6; color: #2563eb; background: #eff6ff; }
        .cl-page-btn:disabled { opacity: 0.38; cursor: not-allowed; }
        .cl-page-btn.active {
          background: linear-gradient(135deg, #1d4ed8, #3b82f6);
          border-color: transparent; color: #fff;
          box-shadow: 0 3px 10px rgba(37,99,235,0.35);
      }
       

       
      .cl-switch {
  position: relative;
  display: inline-block;
  width: 45px;
  height: 20px;
}

.cl-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.cl-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: #d1d5db;
  transition: 0.4s;
  border-radius: 999px;
}

.cl-slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 15px;
  left: 3px;
  top: 3px;
  background: white;
  transition: 0.4s;
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(0,0,0,0.25);
}

.cl-switch input:checked + .cl-slider {
  background: linear-gradient(135deg, #1d4ed8, #3b82f6);
}

.cl-switch input:checked + .cl-slider:before {
  transform: translateX(24px);
}

.cl-add-btn.disabled{
  opacity:.6;
  cursor:not-allowed;
  box-shadow:none;
}

.cl-limit-note{
  margin-bottom:18px;
  background:#fff7ed;
  border:1px solid #fdba74;
  color:#c2410c;
  padding:14px 16px;
  border-radius:16px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:14px;
  font-size:14px;
  font-weight:500;
}

.cl-request-btn{
  border:none;
  background:linear-gradient(
    135deg,
    #ea580c,
    #f97316
  );
  color:#fff;
  padding:10px 16px;
  border-radius:12px;
  font-size:13px;
  font-weight:600;
  cursor:pointer;
}
      `}</style>

      <div className="cl-wrap">

        {/* Top bar */}
        <div className="cl-topbar">
          <div className="cl-title-group">
            <div className="cl-icon-wrap">
              <Building2 size={22} color="#fff" />
            </div>
            <div>
              <h1 className="cl-title">Companies</h1>
              <p className="cl-subtitle">Manage your registered companies</p>
            </div>
          </div>
          <button
            className={`cl-add-btn ${isLimitReached
                ? "disabled"
                : ""
              }`}
            disabled={isLimitReached}
            onClick={() => {

              if (!isLimitReached) {

                navigate("/company/add");

              }

            }}
          >
            + Add Company
          </button>
        </div>

        {isLimitReached && (

          <div className="cl-limit-note">

            <div>
              Maximum 3 companies only allowed.
              To add more companies,
              please send a request.
            </div>

            <button
              className="cl-request-btn"
              onClick={() =>
                navigate("/company/add")
              }
            >
              Request Company
            </button>

          </div>

        )}

        {/* Search */}
        <div className="cl-search-wrap">
          <Search size={16} className="cl-search-icon" />
          <input
            className="cl-search"
            placeholder="Search by name, code or GSTIN…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>

        {/* Table card */}
        <div className="cl-card">
          <div className="cl-table-wrap">
            <table className="cl-table">
              <thead className="bg-blue-600">
                <tr>
                  <th className="cl-th">#</th>
                  <th className="cl-th">Company</th>
                  <th className="cl-th">Code</th>
                  <th className="cl-th">GSTIN</th>
                  <th className="cl-th">Phone</th>
                  <th className="cl-th">Address</th>
                  <th className="cl-th center">Actions</th>
                  <th className="cl-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="cl-empty">
                        <div className="cl-empty-icon">
                          <Building2 size={26} color="#94a3b8" />
                        </div>
                        <p>{search ? "No companies match your search." : "No companies found."}</p>
                        <span>{search ? "Try a different keyword." : "Click '+ Add Company' to get started."}</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginated.map((c, idx) => (
                    <tr key={c.id} className="cl-tr">

                      {/* Serial */}
                      <td className="cl-td">
                        <span className="cl-badge cl-badge-gray">
                          {(safePage - 1) * ITEMS_PER_PAGE + idx + 1}
                        </span>
                      </td>

                      {/* Company name + logo */}
                      <td className="cl-td">
                        <div className="cl-company-cell">
                          {/* <div className="cl-avatar">
                            {c.logo
                              ? <img src={c.logo.startsWith("http") ? c.logo : `${API_BASE_URL_IMAGE}/${c.logo}`} alt={c.company_name} />
                              : getInitials(c.company_name)
                            }
                          </div> */}
                          <div>
                            <div className="cl-company-name">{c.company_name}</div>
                            {c.email && <div className="cl-company-sub">{c.email}</div>}
                          </div>
                        </div>
                      </td>

                      {/* Code */}
                      <td className="cl-td">
                        <span className="cl-badge cl-badge-blue">{c.company_code || "—"}</span>
                      </td>

                      {/* GSTIN */}
                      <td className="cl-td">
                        <span className="cl-text-muted">{c.gstin || "—"}</span>
                      </td>

                      {/* Phone */}
                      <td className="cl-td">
                        <span className="cl-text-muted">{c.phone || "—"}</span>
                      </td>

                      {/* Address */}
                      <td className="cl-td">
                        <span className="cl-text-muted" style={{ maxWidth: 180, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.company_address || "—"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="cl-td">
                        <div className="cl-actions">
                          <button className="cl-btn-edit" title="Edit" onClick={() => navigate(`/company/edit/${c.id}`)}>
                            <Pencil size={16} />
                          </button>
                          <label className="cl-switch">
                            <input
                              type="checkbox"
                              checked={c.status === "active"}
                              onChange={() => toggleStatus(c)}
                            />
                            <span className="cl-slider"></span>
                          </label>
                        </div>
                      </td>

                      <td className="cl-td">
                        <span
                          className={`cl-badge ${c.status === "active"
                              ? "cl-badge-blue"
                              : "cl-badge-gray"
                            }`}
                        >
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {filtered.length > ITEMS_PER_PAGE && (
            <div className="cl-pagination">
              <p className="cl-page-info">
                Showing <strong>{(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)}</strong> of <strong>{filtered.length}</strong> companies
              </p>
              <div className="cl-page-btns">
                <button
                  className="cl-page-btn"
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .reduce((acc, p, i, arr) => {
                    if (i > 0 && arr[i - 1] !== p - 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, i) =>
                    item === "..." ? (
                      <span key={`dots-${i}`} style={{ padding: "0 4px", color: "#94a3b8", fontSize: 13 }}>…</span>
                    ) : (
                      <button
                        key={item}
                        className={`cl-page-btn ${safePage === item ? "active" : ""}`}
                        onClick={() => setCurrentPage(item)}
                      >
                        {item}
                      </button>
                    )
                  )
                }

                <button
                  className="cl-page-btn"
                  disabled={safePage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}