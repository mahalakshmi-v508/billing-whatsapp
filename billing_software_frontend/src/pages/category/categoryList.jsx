import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { Pencil, ChevronLeft, ChevronRight, Search, Plus } from "lucide-react";

const ITEMS_PER_PAGE = 8;

export default function CategoryList() {
  const navigate = useNavigate();

  // Common State
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(
    localStorage.getItem("selected_company_id") || ""
  );
  const [loading, setLoading] = useState(true);

  // Category States
  const [categories, setCategories] = useState([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryPage, setCategoryPage] = useState(1);

  // Subcategory States
  const [subcategories, setSubcategories] = useState([]);
  const [subcategorySearch, setSubcategorySearch] = useState("");
  const [subcategoryPage, setSubcategoryPage] = useState(1);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;

    api.get(`/company/get_companies_by_admin?admin_id=${user.id}`)
      .then(res => {
        if (res.data.status) {
          setCompanies(res.data.data);
          const savedId = localStorage.getItem("selected_company_id");
          if (savedId) {
            fetchData(savedId);
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const fetchData = async (companyId) => {
    setLoading(true);
    try {
      // Fetch Categories
      const catRes = await api.get(`/category/get_all?company_id=${companyId}`);
      if (catRes.data.status) {
        setCategories(catRes.data.data);
      }

      // Fetch Subcategories
      const subRes = await api.get(`/subcategory/get_all?company_id=${companyId}`);
      if (subRes.data.status) {
        setSubcategories(subRes.data.data);
      }
    } catch (err) {
      console.error("Error loading categories or subcategories", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyChange = (companyId) => {
    setSelectedCompany(companyId);
    localStorage.setItem("selected_company_id", companyId);
    setCategoryPage(1);
    setSubcategoryPage(1);
    fetchData(companyId);
  };

  // Category Toggle Status
  const toggleCategoryStatus = async (category) => {
    const newStatus = category.status === "active" ? "inactive" : "active";
    try {
      const res = await api.post("/category/toggle_category_status", {
        id: category.id,
        status: newStatus,
      });
      if (res.data.status) {
        setCategories((prev) =>
          prev.map((c) => (c.id === category.id ? { ...c, status: newStatus } : c))
        );
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  // Subcategory Toggle Status
  const toggleSubcategoryStatus = async (subcategory) => {
    const newStatus = subcategory.status === "active" ? "inactive" : "active";
    try {
      const res = await api.post("/subcategory/statustoggle", {
        id: subcategory.id,
        status: newStatus,
      });
      if (res.data.status) {
        setSubcategories((prev) =>
          prev.map((s) => (s.id === subcategory.id ? { ...s, status: newStatus } : s))
        );
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  // Filtering Categories
  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  // Filtering Subcategories
  const filteredSubcategories = subcategories.filter((s) =>
    s.name.toLowerCase().includes(subcategorySearch.toLowerCase()) ||
    (s.category_name && s.category_name.toLowerCase().includes(subcategorySearch.toLowerCase()))
  );

  // Pagination calculations for Categories
  const totalCategoryPages = Math.max(1, Math.ceil(filteredCategories.length / ITEMS_PER_PAGE));
  const safeCategoryPage = Math.min(categoryPage, totalCategoryPages);
  const paginatedCategories = filteredCategories.slice(
    (safeCategoryPage - 1) * ITEMS_PER_PAGE,
    safeCategoryPage * ITEMS_PER_PAGE
  );

  // Pagination calculations for Subcategories
  const totalSubcategoryPages = Math.max(1, Math.ceil(filteredSubcategories.length / ITEMS_PER_PAGE));
  const safeSubcategoryPage = Math.min(subcategoryPage, totalSubcategoryPages);
  const paginatedSubcategories = filteredSubcategories.slice(
    (safeSubcategoryPage - 1) * ITEMS_PER_PAGE,
    safeSubcategoryPage * ITEMS_PER_PAGE
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "30px", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        .cl-layout-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 25px;
          align-items: start;
        }
        @media (max-width: 1024px) {
          .cl-layout-grid {
            grid-template-columns: 1fr;
          }
        }
        .cl-search-input {
          width: 100%;
          padding: 10px 14px 10px 36px;
          border-radius: 10px;
          border: 1.5px solid #e2e8f0;
          outline: none;
          font-size: 13.5px;
          font-weight: 500;
          background: #ffffff;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }
        .cl-search-input:focus {
          border-color: #3b82f6;
        }
        .cl-card {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.01);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .cl-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .cl-table th {
          padding: 14px 16px;
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          border-bottom: 2px solid #e2e8f0;
          background: #f8fafc;
        }
        .cl-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 13.5px;
          color: #334155;
        }
        .cl-status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .cl-status-badge.active {
          background: #dcfce7;
          color: #15803d;
        }
        .cl-status-badge.inactive {
          background: #f1f5f9;
          color: #64748b;
        }
        .cl-switch-lbl {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 20px;
        }
        .cl-switch-lbl input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .cl-slider {
          position: absolute;
          cursor: pointer;
          inset: 0;
          background: #cbd5e1;
          transition: 0.3s;
          border-radius: 20px;
        }
        .cl-slider:before {
          position: absolute;
          content: "";
          height: 14px;
          width: 14px;
          left: 3px;
          top: 3px;
          background: white;
          transition: 0.3s;
          border-radius: 50%;
        }
        .cl-switch-lbl input:checked + .cl-slider {
          background: #2563eb;
        }
        .cl-switch-lbl input:checked + .cl-slider:before {
          transform: translateX(24px);
        }
        .cl-action-btn {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 8px;
          background: #eff6ff;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
        }
        .cl-action-btn:hover {
          background: #dbeafe;
        }
        .cl-page-btn {
          padding: 6px 12px;
          border-radius: 8px;
          border: 1.5px solid #e2e8f0;
          background: #ffffff;
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }
        .cl-page-btn:hover:not(:disabled) {
          background: #eff6ff;
          color: #2563eb;
          border-color: #bfdbfe;
        }
        .cl-page-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "800", color: "#0f172a", margin: 0 }}>Category & Subcategory</h1>
          <p style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>Manage product categories and subcategories in a single screen</p>
        </div>
      </div>

      {/* Company Selector Buttons */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {companies
          .filter((c) => c.status === "active") 
          .map((c) => {
            const isActive = Number(selectedCompany) === Number(c.id);
            return (
              <button
                key={c.id}
                onClick={() => handleCompanyChange(c.id)}
                style={{
                  padding: "9px 18px",
                  borderRadius: "10px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  border: isActive ? "2px solid #2563eb" : "1.5px solid #e2e8f0",
                  backgroundColor: isActive ? "#2563eb" : "#ffffff",
                  color: isActive ? "#ffffff" : "#475569",
                  boxShadow: isActive ? "0 4px 12px rgba(37,99,235,0.15)" : "0 1px 4px rgba(0,0,0,0.05)",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px"
                }}
              >
                <span>🏢</span> {c.company_name}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "#64748b" }}>Loading categories and subcategories data...</div>
      ) : (
        <div className="cl-layout-grid">
          
          {/* 🏷️ CATEGORY COLUMN */}
          <div className="cl-card">
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b", margin: 0 }}>Categories</h3>
              <button
                onClick={() => navigate("/category/add")}
                disabled={!selectedCompany}
                style={{
                  padding: "6px 12px", borderRadius: "8px",
                  background: selectedCompany ? "#2563eb" : "#94a3b8", color: "#ffffff",
                  border: "none", fontSize: "12.5px", fontWeight: "600",
                  cursor: selectedCompany ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", gap: "5px"
                }}
              >
                <Plus size={14} /> Add Category
              </button>
            </div>

            {/* Search Categories */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", position: "relative" }}>
              <Search size={15} style={{ position: "absolute", top: "50%", left: 26, transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                type="text"
                placeholder="Search categories..."
                value={categorySearch}
                onChange={(e) => { setCategorySearch(e.target.value); setCategoryPage(1); }}
                className="cl-search-input"
              />
            </div>

            {/* Categories Table */}
            <div style={{ overflowX: "auto" }}>
              <table className="cl-table">
                <thead>
                  <tr>
                    <th>Category Name</th>
                    <th>Status</th>
                    <th style={{ textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCategories.length === 0 ? (
                    <tr>
                      <td colSpan="3" style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>
                        No categories found.
                      </td>
                    </tr>
                  ) : (
                    paginatedCategories.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: "700", color: "#0f172a" }}>{c.name}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span className={`cl-status-badge ${c.status}`}>
                              {c.status}
                            </span>
                            <label className="cl-switch-lbl">
                              <input
                                type="checkbox"
                                checked={c.status === "active"}
                                onChange={() => toggleCategoryStatus(c)}
                              />
                              <span className="cl-slider"></span>
                            </label>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", justifyContent: "center" }}>
                            <button
                              onClick={() => navigate(`/category/edit/${c.id}`)}
                              className="cl-action-btn"
                            >
                              <Pencil size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Categories Pagination */}
            {filteredCategories.length > ITEMS_PER_PAGE && (
              <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "12.5px", color: "#64748b" }}>
                  Page {safeCategoryPage} of {totalCategoryPages}
                </span>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    disabled={safeCategoryPage === 1}
                    onClick={() => setCategoryPage(safeCategoryPage - 1)}
                    className="cl-page-btn"
                  >
                    Prev
                  </button>
                  <button
                    disabled={safeCategoryPage === totalCategoryPages}
                    onClick={() => setCategoryPage(safeCategoryPage + 1)}
                    className="cl-page-btn"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Boxes SUB-CATEGORY COLUMN */}
          <div className="cl-card">
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b", margin: 0 }}>Subcategories</h3>
              <button
                onClick={() => navigate("/subcategory/add")}
                disabled={!selectedCompany}
                style={{
                  padding: "6px 12px", borderRadius: "8px",
                  background: selectedCompany ? "#2563eb" : "#94a3b8", color: "#ffffff",
                  border: "none", fontSize: "12.5px", fontWeight: "600",
                  cursor: selectedCompany ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", gap: "5px"
                }}
              >
                <Plus size={14} /> Add Subcategory
              </button>
            </div>

            {/* Search Subcategories */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", position: "relative" }}>
              <Search size={15} style={{ position: "absolute", top: "50%", left: 26, transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                type="text"
                placeholder="Search subcategories..."
                value={subcategorySearch}
                onChange={(e) => { setSubcategorySearch(e.target.value); setSubcategoryPage(1); }}
                className="cl-search-input"
              />
            </div>

            {/* Subcategories Table */}
            <div style={{ overflowX: "auto" }}>
              <table className="cl-table">
                <thead>
                  <tr>
                    <th>Subcategory Name</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th style={{ textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSubcategories.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>
                        No subcategories found.
                      </td>
                    </tr>
                  ) : (
                    paginatedSubcategories.map((s) => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: "700", color: "#0f172a" }}>{s.name}</td>
                        <td style={{ color: "#64748b", fontSize: "13px" }}>{s.category_name || "N/A"}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span className={`cl-status-badge ${s.status}`}>
                              {s.status}
                            </span>
                            <label className="cl-switch-lbl">
                              <input
                                type="checkbox"
                                checked={s.status === "active"}
                                onChange={() => toggleSubcategoryStatus(s)}
                              />
                              <span className="cl-slider"></span>
                            </label>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", justifyContent: "center" }}>
                            <button
                              onClick={() => navigate(`/subcategory/edit/${s.id}`)}
                              className="cl-action-btn"
                            >
                              <Pencil size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Subcategories Pagination */}
            {filteredSubcategories.length > ITEMS_PER_PAGE && (
              <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "12.5px", color: "#64748b" }}>
                  Page {safeSubcategoryPage} of {totalSubcategoryPages}
                </span>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    disabled={safeSubcategoryPage === 1}
                    onClick={() => setSubcategoryPage(safeSubcategoryPage - 1)}
                    className="cl-page-btn"
                  >
                    Prev
                  </button>
                  <button
                    disabled={safeSubcategoryPage === totalSubcategoryPages}
                    onClick={() => setSubcategoryPage(safeSubcategoryPage + 1)}
                    className="cl-page-btn"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}