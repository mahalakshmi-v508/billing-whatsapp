import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

import {
  Pencil,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const ITEMS_PER_PAGE = 5;

export default function SubcategoryList() {

  const navigate = useNavigate();

  const [subcategories, setSubcategories] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(
    localStorage.getItem("selected_company_id") || ""
  );

  useEffect(() => {

    const user = JSON.parse(localStorage.getItem("user"));

    api.get(
      `/company/get_companies_by_admin?admin_id=${user.id}`
    )
    .then(res => {

      if (res.data.status) {

        setCompanies(res.data.data);

        // Auto-fetch subcategories for saved company on mount
        const savedId = localStorage.getItem("selected_company_id");
        if (savedId) {
          fetchSubcategories(savedId);
        }

      }

    });

  }, []);


  useEffect(() => {

    if (selectedCompany) {

      fetchSubcategories(selectedCompany);

    } else {

      setSubcategories([]);
      setLoading(false);

    }

  }, [selectedCompany]);

  const fetchSubcategories = async (companyId) => {

    setLoading(true);

    try {

      const res = await api.get(
        `/subcategory/get_all?company_id=${companyId}`
      );

      if (res.data.status) {
        setSubcategories(res.data.data);
      }

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }
  };

  const handleCompanyChange = (e) => {

    const companyId = e.target.value;

    setSelectedCompany(companyId);
    setCurrentPage(1);

    localStorage.setItem(
      "selected_company_id",
      companyId
    );

  };

  const toggleStatus = async (subcategory) => {

    const newStatus =
      subcategory.status === "active"
        ? "inactive"
        : "active";

    try {

      const res = await api.post(
        "/subcategory/statustoggle",
        {
          id: subcategory.id,
          status: newStatus,
        }
      );

      if (res.data.success) {

        setSubcategories((prev) =>
          prev.map((s) =>
            s.id === subcategory.id
              ? { ...s, status: newStatus }
              : s
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

  const filtered = subcategories.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / ITEMS_PER_PAGE)
  );

  const safePage = Math.min(
    currentPage,
    totalPages
  );

  const paginated = filtered.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  return (
    <>
      <style>{`

        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .sl-page{
          font-family:'Plus Jakarta Sans',sans-serif;
          min-height:100vh;
          background:#f0f4ff;
          padding:2rem;
        }

        .sl-header{
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-bottom:1.5rem;
          flex-wrap:wrap;
          gap:12px;
        }

        .sl-header h1{
          margin:0;
          font-size:24px;
          font-weight:800;
          color:#0f172a;
        }

        .sl-header p{
          margin-top:4px;
          color:#64748b;
          font-size:13px;
        }

        .sl-add-btn{
          padding:11px 20px;
          border:none;
          border-radius:12px;
          background:linear-gradient(135deg,#1d4ed8,#3b82f6);
          color:#fff;
          font-size:14px;
          font-weight:700;
          cursor:pointer;
          box-shadow:0 4px 16px rgba(37,99,235,0.35);
        }

        .sl-search-wrap{
          position:relative;
          margin-bottom:1.5rem;
        }

        .sl-search{
          width:100%;
          padding:12px 16px;
          border-radius:12px;
          border:1.5px solid #e2e8f0;
          font-size:14px;
          outline:none;
          box-sizing:border-box;
        }

        .sl-card{
          background:#fff;
          border-radius:20px;
          overflow:hidden;
          border:1px solid #e2e8f0;
          box-shadow:0 4px 24px rgba(37,99,235,0.08);
        }

        .sl-table{
          width:100%;
          border-collapse:collapse;
        }

        .sl-table thead{
          background:linear-gradient(135deg,#1d4ed8,#3b82f6);
        }

        .sl-table th{
          padding:15px;
          font-size:11px;
          font-weight:700;
          color:#fff;
          text-transform:uppercase;
          letter-spacing:0.08em;
          text-align:left;
        }

        .sl-table th.center{
          text-align:center;
        }

        .sl-table td{
          padding:15px;
          border-bottom:1px solid #f1f5f9;
          font-size:14px;
        }

        .sl-index{
          width:28px;
          height:28px;
          border-radius:999px;
          background:#f1f5f9;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:12px;
          font-weight:700;
          color:#64748b;
        }

        .sl-name{
          font-weight:700;
          color:#0f172a;
        }

        .sl-category-badge{
          display:inline-block;
          padding:4px 10px;
          border-radius:999px;
          background:#eff6ff;
          color:#2563eb;
          font-size:11.5px;
          font-weight:700;
          border:1px solid #bfdbfe;
        }

        .sl-actions{
          display:flex;
          align-items:center;
          justify-content:center;
          gap:10px;
        }

        .sl-btn-edit{
          width:34px;
          height:34px;
          border:none;
          border-radius:10px;
          background:#eff6ff;
          color:#2563eb;
          display:flex;
          align-items:center;
          justify-content:center;
          cursor:pointer;
        }

        .sl-btn-edit:hover{
          background:#dbeafe;
        }

        .sl-switch {
          position: relative;
          display: inline-block;
          width: 45px;
          height: 20px;
        }

        .sl-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .sl-slider {
          position: absolute;
          cursor: pointer;
          inset: 0;
          background: #d1d5db;
          transition: 0.4s;
          border-radius: 999px;
        }

        .sl-slider:before {
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

        .sl-switch input:checked + .sl-slider {
          background: linear-gradient(135deg, #1d4ed8, #3b82f6);
        }

        .sl-switch input:checked + .sl-slider:before {
          transform: translateX(24px);
        }

        .sl-status{
          display:inline-block;
          padding:5px 12px;
          border-radius:999px;
          font-size:12px;
          font-weight:700;
        }

        .sl-status.active{
          background:#eff6ff;
          color:#2563eb;
          border:1px solid #bfdbfe;
        }

        .sl-status.inactive{
          background:#f8fafc;
          color:#64748b;
          border:1px solid #e2e8f0;
        }

        .sl-empty{
          padding:3rem;
          text-align:center;
          color:#94a3b8;
        }

        .sl-page-btn{
          width:34px;
          height:34px;
          border-radius:9px;
          display:flex;
          align-items:center;
          justify-content:center;
          border:1.5px solid #e2e8f0;
          background:#fff;
          color:#64748b;
          cursor:pointer;
          font-weight:600;
          transition:.2s;
        }

        .sl-page-btn:hover:not(:disabled){
          background:#eff6ff;
          color:#2563eb;
          border-color:#3b82f6;
        }

        .sl-page-btn:disabled{
          opacity:.4;
          cursor:not-allowed;
        }

        .sl-page-btn.active{
          background:linear-gradient(135deg,#1d4ed8,#3b82f6);
          color:#fff;
          border:none;
        }

      `}</style>

      <div className="sl-page">

        {/* Header */}
        <div className="sl-header">

          <div>
            <h1>🗂️ Subcategories</h1>
            <p>Manage your product subcategories</p>
          </div>

          <button
            className="sl-add-btn"
            onClick={() => navigate("/subcategory/add")}
          >
            + Add Subcategory
          </button>

        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          {companies.map((c) => {
            const isActive = Number(selectedCompany) === Number(c.id);
            return (
              <button
                key={c.id}
                onClick={() => handleCompanyChange({ target: { value: String(c.id) } })}
                style={{
                  padding: "10px 20px",
                  borderRadius: "12px",
                  fontSize: "13.5px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  border: isActive ? "2px solid #2563eb" : "1.5px solid #e2e8f0",
                  backgroundColor: isActive ? "#2563eb" : "#ffffff",
                  color: isActive ? "#ffffff" : "#475569",
                  boxShadow: isActive ? "0 4px 12px rgba(37,99,235,0.25)" : "0 1px 4px rgba(0,0,0,0.06)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>🏢</span> {c.company_name}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="sl-search-wrap">

          <input
            type="text"
            className="sl-search"
            placeholder="Search subcategories or category..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />

        </div>

        {/* Table */}
        <div className="sl-card">

          <table className="sl-table">

            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Category</th>
                <th className="center">Actions</th>
                <th className="center">Status</th>
              </tr>
            </thead>

            <tbody>

              {!selectedCompany ? (

                <tr>
                  <td colSpan="5" className="sl-empty">
                    Select a company to view subcategories
                  </td>
                </tr>

              ) : loading ? (

                <tr>
                  <td colSpan="5" className="sl-empty">
                    Loading...
                  </td>
                </tr>

              ) : filtered.length === 0 ? (

                <tr>
                  <td colSpan="5" className="sl-empty">
                    No subcategories found
                  </td>
                </tr>

              ) : (

                paginated.map((s, i) => (

                  <tr key={s.id}>

                    <td>
                      <div className="sl-index">
                        {(safePage - 1) * ITEMS_PER_PAGE + i + 1}
                      </div>
                    </td>

                    <td>
                      <div className="sl-name">
                        {s.name}
                      </div>
                    </td>

                    <td>
                      <span className="sl-category-badge">
                        {s.category_name}
                      </span>
                    </td>

                    <td>

                      <div className="sl-actions">

                        <button
                          className="sl-btn-edit"
                          onClick={() =>
                            navigate(`/subcategory/edit/${s.id}`)
                          }
                        >
                          <Pencil size={15} />
                        </button>

                        <label className="sl-switch">

                          <input
                            type="checkbox"
                            checked={s.status === "active"}
                            onChange={() => toggleStatus(s)}
                          />

                          <span className="sl-slider"></span>

                        </label>

                      </div>

                    </td>

                    <td className="center">

                      <span className={`sl-status ${s.status}`}>
                        {s.status}
                      </span>

                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

          {filtered.length > ITEMS_PER_PAGE && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                borderTop: "1px solid #e2e8f0",
                background: "#fafbff",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div style={{ fontSize: 13, color: "#64748b" }}>
                Showing{" "}
                <strong>
                  {(safePage - 1) * ITEMS_PER_PAGE + 1}–
                  {Math.min(safePage * ITEMS_PER_PAGE, filtered.length)}
                </strong>{" "}
                of <strong>{filtered.length}</strong> subcategories
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="sl-page-btn"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === totalPages ||
                      Math.abs(p - safePage) <= 1
                  )
                  .reduce((acc, p, i, arr) => {
                    if (i > 0 && arr[i - 1] !== p - 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, i) =>
                    item === "..." ? (
                      <span key={i} style={{ padding: "0 5px", color: "#94a3b8" }}>
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setCurrentPage(item)}
                        className={`sl-page-btn ${safePage === item ? "active" : ""}`}
                      >
                        {item}
                      </button>
                    )
                  )}

                <button
                  disabled={safePage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="sl-page-btn"
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